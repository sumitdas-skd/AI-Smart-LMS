"""
Core Job Synchronization Engine.
Coordinates all job board adapters (Adzuna, Greenhouse, Lever, Ashby).
Features:
- Total failure isolation: one broken source never halts the others.
- Idempotent upserts on (source, external_id).
- Safe deactivation of vanished postings without deletion.
- Comprehensive sync audit logs (JobSyncLog).
- Automatic periodic background scheduler with configurable interval.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import SessionLocal
from app.models.jobs import Job, JobSource, JobSyncLog
from app.core.config import settings
from app.services.jobs.greenhouse_adapter import GreenhouseAdapter
from app.services.jobs.lever_adapter import LeverAdapter
from app.services.jobs.ashby_adapter import AshbyAdapter
from app.services.jobs.adzuna_adapter import AdzunaAdapter

logger = logging.getLogger(__name__)

# Default prominent company sources to seed on initial run
DEFAULT_COMPANY_SOURCES = [
    {"type": "greenhouse", "slug": "stripe", "company_name": "Stripe"},
    {"type": "greenhouse", "slug": "github", "company_name": "GitHub"},
    {"type": "lever", "slug": "figma", "company_name": "Figma"},
    {"type": "ashby", "slug": "linear", "company_name": "Linear"},
    {"type": "ashby", "slug": "notion", "company_name": "Notion"},
]


class JobSyncService:

    @staticmethod
    def ensure_default_sources(db: Session):
        """Ensures a baseline set of tech company sources exists in DB."""
        for src in DEFAULT_COMPANY_SOURCES:
            existing = db.query(JobSource).filter(
                and_(JobSource.type == src["type"], JobSource.slug == src["slug"])
            ).first()
            if not existing:
                db.add(JobSource(
                    type=src["type"],
                    slug=src["slug"],
                    company_name=src["company_name"],
                    enabled=True,
                    last_status="Initialized"
                ))
        db.commit()

    @classmethod
    def sync_single_source(
        cls,
        db: Session,
        source_key: str,
        adapter_instance,
        company_source_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes sync for a single adapter with full failure isolation.
        Returns a dict of metrics: fetched, created, updated, deactivated, error.
        """
        started_at = datetime.now(timezone.utc)
        sync_log = JobSyncLog(
            source=source_key,
            started_at=started_at,
            fetched=0,
            created=0,
            updated=0,
            deactivated=0
        )
        db.add(sync_log)
        db.commit()

        try:
            # 1. Fetch normalized jobs
            fetched_jobs = adapter_instance.fetch_jobs()
            sync_log.fetched = len(fetched_jobs)

            seen_external_ids = set()
            created_count = 0
            updated_count = 0

            # 2. Upsert fetched jobs
            now = datetime.now(timezone.utc)
            for item in fetched_jobs:
                ext_id = item["external_id"]
                seen_external_ids.add(ext_id)

                existing = db.query(Job).filter(
                    and_(Job.source == item["source"], Job.external_id == ext_id)
                ).first()

                if existing:
                    existing.title = item["title"]
                    existing.company = item["company"]
                    existing.location = item["location"]
                    existing.work_mode = item["work_mode"]
                    existing.job_type = item["job_type"]
                    existing.experience_level = item.get("experience_level")
                    existing.salary_min = item.get("salary_min")
                    existing.salary_max = item.get("salary_max")
                    existing.salary_currency = item.get("salary_currency", "INR")
                    existing.description_text = item["description_text"]
                    existing.skills = item.get("skills", [])
                    existing.apply_url = item["apply_url"]
                    if item.get("posted_at"):
                        existing.posted_at = item["posted_at"]
                    existing.last_seen_at = now
                    existing.is_active = True
                    updated_count += 1
                else:
                    new_job = Job(
                        source=item["source"],
                        external_id=ext_id,
                        title=item["title"],
                        company=item["company"],
                        location=item["location"],
                        work_mode=item["work_mode"],
                        job_type=item["job_type"],
                        experience_level=item.get("experience_level"),
                        salary_min=item.get("salary_min"),
                        salary_max=item.get("salary_max"),
                        salary_currency=item.get("salary_currency", "INR"),
                        description_text=item["description_text"],
                        skills=item.get("skills", []),
                        apply_url=item["apply_url"],
                        posted_at=item.get("posted_at") or now,
                        first_seen_at=now,
                        last_seen_at=now,
                        is_active=True
                    )
                    db.add(new_job)
                    created_count += 1

            # 3. Mark vanished jobs from this specific source as inactive (do NOT delete)
            deactivated_count = 0
            if seen_external_ids:
                # Target jobs belonging to this adapter source
                adapter_source_name = adapter_instance.source_name
                vanished_query = db.query(Job).filter(
                    and_(
                        Job.source == adapter_source_name,
                        Job.is_active == True,
                        ~Job.external_id.in_(seen_external_ids)
                    )
                )
                # If it's a company-scoped source (e.g. greenhouse:stripe), only deactivate that slug's jobs
                if hasattr(adapter_instance, "slug"):
                    slug_prefix = f"{adapter_instance.slug}:"
                    vanished_query = vanished_query.filter(Job.external_id.startswith(slug_prefix))

                for vanished in vanished_query.all():
                    vanished.is_active = False
                    deactivated_count += 1

            sync_log.created = created_count
            sync_log.updated = updated_count
            sync_log.deactivated = deactivated_count
            sync_log.finished_at = datetime.now(timezone.utc)
            sync_log.error = None

            # Update JobSource status if applicable
            if company_source_id:
                js = db.query(JobSource).filter(JobSource.id == company_source_id).first()
                if js:
                    js.last_synced_at = sync_log.finished_at
                    js.last_status = f"Success: {created_count} added, {updated_count} refreshed"

            db.commit()
            return {
                "source": source_key,
                "success": True,
                "fetched": sync_log.fetched,
                "created": created_count,
                "updated": updated_count,
                "deactivated": deactivated_count,
                "error": None
            }

        except Exception as e:
            db.rollback()
            err_msg = str(e)
            logger.error(f"Sync error for source '{source_key}': {err_msg}")

            sync_log.finished_at = datetime.now(timezone.utc)
            sync_log.error = err_msg[:1000]

            if company_source_id:
                js = db.query(JobSource).filter(JobSource.id == company_source_id).first()
                if js:
                    js.last_synced_at = sync_log.finished_at
                    js.last_status = f"Failed: {err_msg[:200]}"

            try:
                db.add(sync_log)
                db.commit()
            except Exception:
                db.rollback()

            return {
                "source": source_key,
                "success": False,
                "fetched": 0,
                "created": 0,
                "updated": 0,
                "deactivated": 0,
                "error": err_msg
            }

    @classmethod
    def sync_all_sources(cls, db: Session) -> Dict[str, Any]:
        """
        Executes synchronization across all enabled company sources & Adzuna.
        Guarantees failure isolation: one failing source will NOT stop others.
        """
        cls.ensure_default_sources(db)
        results = []

        # 1. Sync Adzuna (if configured)
        if settings.ADZUNA_APP_ID and settings.ADZUNA_APP_KEY:
            adz_adapter = AdzunaAdapter()
            res = cls.sync_single_source(db, "adzuna:in", adz_adapter)
            results.append(res)
        else:
            logger.info("Adzuna credentials not present in environment; skipping Adzuna source.")

        # 2. Sync enabled company ATS sources
        company_sources = db.query(JobSource).filter(JobSource.enabled == True).all()
        for src in company_sources:
            source_key = f"{src.type}:{src.slug}"
            adapter = None
            if src.type == "greenhouse":
                adapter = GreenhouseAdapter(slug=src.slug, company_name=src.company_name)
            elif src.type == "lever":
                adapter = LeverAdapter(slug=src.slug, company_name=src.company_name)
            elif src.type == "ashby":
                adapter = AshbyAdapter(slug=src.slug, company_name=src.company_name)

            if adapter:
                res = cls.sync_single_source(db, source_key, adapter, company_source_id=src.id)
                results.append(res)

        total_created = sum(r["created"] for r in results)
        total_updated = sum(r["updated"] for r in results)
        total_deactivated = sum(r["deactivated"] for r in results)
        total_fetched = sum(r["fetched"] for r in results)
        failures = [r for r in results if not r["success"]]

        return {
            "sources_attempted": len(results),
            "total_fetched": total_fetched,
            "total_created": total_created,
            "total_updated": total_updated,
            "total_deactivated": total_deactivated,
            "failed_sources_count": len(failures),
            "details": results
        }


# ─── Periodic Background Worker ──────────────────────────────────────────────
_scheduler_started = False

async def _job_sync_loop():
    """Background coroutine running in the Uvicorn process."""
    interval_seconds = max(1, settings.JOBS_SYNC_INTERVAL_HOURS) * 3600
    logger.info(f"Jobs background scheduler initialized (interval: {settings.JOBS_SYNC_INTERVAL_HOURS}h).")
    # Initial sleep so server startup finishes immediately without blocking
    await asyncio.sleep(5)

    def _run_sync():
        db = SessionLocal()
        try:
            return JobSyncService.sync_all_sources(db)
        finally:
            db.close()

    while True:
        try:
            logger.info("Starting scheduled periodic job synchronization...")
            summary = await asyncio.to_thread(_run_sync)
            logger.info(f"Scheduled job sync complete: {summary['total_created']} created, {summary['total_updated']} updated.")
        except Exception as e:
            logger.warning(f"Error during scheduled job sync: {e}")

        await asyncio.sleep(interval_seconds)


def start_background_scheduler():
    """Starts the asyncio background task once during application startup."""
    global _scheduler_started
    if not _scheduler_started:
        _scheduler_started = True
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(_job_sync_loop())
        except RuntimeError:
            pass

