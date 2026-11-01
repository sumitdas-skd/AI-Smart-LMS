"""
Router for Job Query & Opportunities Module.
Supports search, filtering, pagination, saving/bookmarking, manual placement postings,
ATS source management, failure-isolated synchronization, and AI Fit Match.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, and_, or_, func
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import uuid

from app.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User
from app.models.jobs import Job, SavedJob, JobSource, JobSyncLog
from app.schemas.jobs import (
    JobResponse,
    JobsPaginatedResponse,
    JobFilterOptions,
    JobCreateManual,
    JobUpdateManual,
    JobSourceCreate,
    JobSourceResponse,
    JobSyncLogResponse,
    JobAIMatchResponse,
)
from app.services.jobs.sync_service import JobSyncService
from app.services.jobs.ai_match_service import JobAIMatchService
from app.core.config import settings

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _build_job_response(job: Job, saved_job_ids: set) -> JobResponse:
    now = datetime.now(timezone.utc)
    # Check if first seen within the last 24 hours
    is_new = False
    if job.first_seen_at:
        # Normalize timezone if naive
        f_seen = job.first_seen_at if job.first_seen_at.tzinfo else job.first_seen_at.replace(tzinfo=timezone.utc)
        is_new = (now - f_seen).total_seconds() <= 86400

    return JobResponse(
        id=job.id,
        source=job.source,
        external_id=job.external_id,
        title=job.title,
        company=job.company,
        location=job.location,
        work_mode=job.work_mode,
        job_type=job.job_type,
        experience_level=job.experience_level,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        salary_currency=job.salary_currency or "INR",
        description_text=job.description_text,
        skills=job.skills or [],
        apply_url=job.apply_url,
        posted_at=job.posted_at,
        first_seen_at=job.first_seen_at,
        last_seen_at=job.last_seen_at,
        is_active=job.is_active,
        is_new=is_new,
        is_saved=job.id in saved_job_ids,
        created_by=job.created_by,
    )


# ─── Public / Student Job Exploration Endpoints ───────────────────────────────

@router.get("", response_model=JobsPaginatedResponse)
def list_jobs(
    q: Optional[str] = Query(None, description="Search keyword in title, company, or skills"),
    location: Optional[str] = Query(None),
    job_type: Optional[str] = Query(None, description="internship|fulltime|parttime|contract"),
    work_mode: Optional[str] = Query(None, description="onsite|hybrid|remote"),
    source: Optional[str] = Query(None, description="adzuna|greenhouse|lever|ashby|manual"),
    company: Optional[str] = Query(None),
    posted_within: Optional[str] = Query(None, description="24h|7d|30d"),
    only_new: bool = Query(False, description="Only jobs first seen in the last 24h"),
    saved_only: bool = Query(False, description="Only jobs saved by current user"),
    sort: str = Query("newest", description="newest|relevance"),
    limit: Optional[int] = Query(None, ge=1, le=50),
    offset: Optional[int] = Query(None, ge=0),
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Search and filter active job opportunities with pagination.
    Includes is_new and is_saved status flags.
    Supports both limit/offset and page/page_size pagination conventions.
    """
    eff_limit = page_size if page_size is not None else (limit if limit is not None else 20)
    if page is not None:
        eff_offset = (page - 1) * eff_limit
    else:
        eff_offset = offset if offset is not None else 0

    query = db.query(Job).filter(Job.is_active == True)

    now = datetime.now(timezone.utc)

    # 1. Saved filter
    user_saved_ids = {
        sj.job_id for sj in db.query(SavedJob.job_id).filter(SavedJob.user_id == current_user.id).all()
    }
    if saved_only:
        query = query.filter(Job.id.in_(user_saved_ids))

    # 2. Keyword query
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Job.title.ilike(term),
                Job.company.ilike(term),
                Job.description_text.ilike(term)
            )
        )

    # 3. Categorical filters
    if location and location.strip():
        query = query.filter(Job.location.ilike(f"%{location.strip()}%"))
    if job_type and job_type != "all":
        query = query.filter(Job.job_type == job_type)
    if work_mode and work_mode != "all":
        query = query.filter(Job.work_mode == work_mode)
    if source and source != "all":
        query = query.filter(Job.source == source)
    if company and company != "all":
        query = query.filter(Job.company.ilike(f"%{company.strip()}%"))

    # 4. Time filters
    if posted_within == "24h":
        cutoff = now - timedelta(hours=24)
        query = query.filter(Job.posted_at >= cutoff)
    elif posted_within == "7d":
        cutoff = now - timedelta(days=7)
        query = query.filter(Job.posted_at >= cutoff)
    elif posted_within == "30d":
        cutoff = now - timedelta(days=30)
        query = query.filter(Job.posted_at >= cutoff)

    if only_new:
        cutoff = now - timedelta(hours=24)
        query = query.filter(Job.first_seen_at >= cutoff)

    total = query.count()

    # 5. Sorting
    if sort == "newest":
        query = query.order_by(desc(Job.posted_at), desc(Job.id))
    else:
        query = query.order_by(desc(Job.first_seen_at), desc(Job.id))

    jobs = query.offset(eff_offset).limit(eff_limit).all()

    # Calculate unread count since user's last visit
    unread_count = 0
    if current_user.last_jobs_viewed_at:
        lv = current_user.last_jobs_viewed_at if current_user.last_jobs_viewed_at.tzinfo else current_user.last_jobs_viewed_at.replace(tzinfo=timezone.utc)
        unread_count = db.query(Job).filter(
            and_(Job.is_active == True, Job.first_seen_at > lv)
        ).count()
    else:
        unread_count = db.query(Job).filter(Job.is_active == True).count()

    items = [_build_job_response(j, user_saved_ids) for j in jobs]
    has_more = (eff_offset + eff_limit) < total

    return JobsPaginatedResponse(
        total=total,
        items=items,
        limit=eff_limit,
        offset=eff_offset,
        has_more=has_more,
        unread_count=unread_count
    )


@router.get("/filters", response_model=JobFilterOptions)
def get_filter_options(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Provides unique filter options populated from active jobs."""
    companies = [
        r[0] for r in db.query(Job.company).filter(Job.is_active == True).distinct().order_by(Job.company).limit(40).all()
        if r[0]
    ]
    locations = [
        r[0] for r in db.query(Job.location).filter(Job.is_active == True).distinct().order_by(Job.location).limit(30).all()
        if r[0]
    ]
    job_types = ["internship", "fulltime", "parttime", "contract"]
    work_modes = ["onsite", "hybrid", "remote"]
    sources = ["greenhouse", "lever", "ashby", "adzuna", "manual"]

    return JobFilterOptions(
        locations=locations,
        companies=companies,
        job_types=job_types,
        work_modes=work_modes,
        sources=sources
    )


@router.get("/unread-count")
def get_unread_jobs_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns number of new jobs added since user's last jobs visit."""
    if current_user.last_jobs_viewed_at:
        lv = current_user.last_jobs_viewed_at if current_user.last_jobs_viewed_at.tzinfo else current_user.last_jobs_viewed_at.replace(tzinfo=timezone.utc)
        count = db.query(Job).filter(
            and_(Job.is_active == True, Job.first_seen_at > lv)
        ).count()
    else:
        count = db.query(Job).filter(Job.is_active == True).count()
    return {"unread_count": count, "count": count}


@router.post("/mark-viewed")
def mark_jobs_viewed(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates user's last_jobs_viewed_at timestamp."""
    current_user.last_jobs_viewed_at = datetime.now(timezone.utc)
    db.commit()
    return {"ok": True, "viewed_at": current_user.last_jobs_viewed_at}


@router.get("/saved", response_model=List[JobResponse])
def get_saved_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all jobs saved by the current user."""
    saved_entries = db.query(SavedJob).filter(SavedJob.user_id == current_user.id).order_by(desc(SavedJob.created_at)).all()
    saved_ids = {s.job_id for s in saved_entries}
    jobs = [s.job for s in saved_entries if s.job and s.job.is_active]
    return [_build_job_response(j, saved_ids) for j in jobs]


@router.post("/{job_id}/save")
def save_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Bookmarks/saves a job for the current student."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.query(SavedJob).filter(
        and_(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
    ).first()
    if not existing:
        db.add(SavedJob(user_id=current_user.id, job_id=job_id))
        db.commit()
    return {"ok": True, "saved": True, "job_id": job_id}


@router.delete("/{job_id}/save")
def unsave_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Removes a job from current student's saved list."""
    existing = db.query(SavedJob).filter(
        and_(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
    ).first()
    if existing:
        db.delete(existing)
        db.commit()
    return {"ok": True, "saved": False, "job_id": job_id}


@router.post("/{job_id}/ai-match", response_model=JobAIMatchResponse)
@router.get("/{job_id}/ai-match", response_model=JobAIMatchResponse)
def get_ai_match(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns an AI-powered 3-bullet fit explanation tailored to the student."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobAIMatchService.analyze_fit(current_user, job)


# ─── Admin Source & Sync Management ──────────────────────────────────────────

@router.get("/sources", response_model=List[JobSourceResponse])
def list_company_sources(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Admin: List all configured company ATS job board sources."""
    JobSyncService.ensure_default_sources(db)
    return db.query(JobSource).order_by(JobSource.company_name).all()


@router.post("/sources", response_model=JobSourceResponse, status_code=status.HTTP_201_CREATED)
def add_company_source(
    src_in: JobSourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Admin: Register a new Greenhouse, Lever, or Ashby company board slug."""
    existing = db.query(JobSource).filter(
        and_(JobSource.type == src_in.type, JobSource.slug == src_in.slug.lower().strip())
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Source '{src_in.type}:{src_in.slug}' already exists")

    new_source = JobSource(
        type=src_in.type,
        slug=src_in.slug.lower().strip(),
        company_name=src_in.company_name.strip(),
        enabled=src_in.enabled,
        last_status="Configured"
    )
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    return new_source


@router.delete("/sources/{source_id}")
def delete_company_source(
    source_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Admin: Remove a company board source."""
    src = db.query(JobSource).filter(JobSource.id == source_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Source not found")
    db.delete(src)
    db.commit()
    return {"ok": True, "msg": f"Source {source_id} removed"}


@router.post("/sync")
def trigger_sync_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Admin: Trigger immediate synchronization across all company sources and Adzuna."""
    summary = JobSyncService.sync_all_sources(db)
    return {"ok": True, "summary": summary}


@router.get("/sync-status", response_model=List[JobSyncLogResponse])
def get_sync_status(
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    """Admin: View recent synchronization audit logs and error reports."""
    return db.query(JobSyncLog).order_by(desc(JobSyncLog.started_at)).limit(limit).all()


@router.post("/cron-sync")
def trigger_cron_sync(
    x_cron_key: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Secured cron trigger for serverless or external scheduler deployments.
    Accepts X-Cron-Key matching CRON_SECRET or SECRET_KEY.
    """
    expected_secret = settings.CRON_SECRET or settings.SECRET_KEY
    if not x_cron_key or x_cron_key != expected_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron key")

    summary = JobSyncService.sync_all_sources(db)
    return {"ok": True, "summary": summary}


@router.get("/{job_id}", response_model=JobResponse)
def get_job_by_id(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches full job description and details."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    user_saved_ids = {
        sj.job_id for sj in db.query(SavedJob.job_id).filter(
            and_(SavedJob.user_id == current_user.id, SavedJob.job_id == job_id)
        ).all()
    }
    return _build_job_response(job, user_saved_ids)


# ─── Teacher & Admin Manual Postings ──────────────────────────────────────────

@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
def create_manual_job(
    job_in: JobCreateManual,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    """Teachers & Admins: Create a manual college placement posting."""
    ext_id = f"manual_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    new_job = Job(
        source="manual",
        external_id=ext_id,
        title=job_in.title.strip(),
        company=job_in.company.strip(),
        location=job_in.location.strip(),
        work_mode=job_in.work_mode,
        job_type=job_in.job_type,
        experience_level=job_in.experience_level,
        salary_min=job_in.salary_min,
        salary_max=job_in.salary_max,
        salary_currency=job_in.salary_currency or "INR",
        description_text=job_in.description_text.strip(),
        skills=job_in.skills or [],
        apply_url=job_in.apply_url.strip(),
        posted_at=now,
        first_seen_at=now,
        last_seen_at=now,
        is_active=True,
        created_by=current_user.id
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    return _build_job_response(new_job, set())


@router.put("/{job_id}", response_model=JobResponse)
def update_manual_job(
    job_id: int,
    job_in: JobUpdateManual,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    """Edit a manual job posting (author or admin only)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.source != "manual":
        raise HTTPException(status_code=400, detail="Only manually created postings can be edited")

    if job.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this posting")

    if job_in.title is not None:
        job.title = job_in.title.strip()
    if job_in.company is not None:
        job.company = job_in.company.strip()
    if job_in.location is not None:
        job.location = job_in.location.strip()
    if job_in.work_mode is not None:
        job.work_mode = job_in.work_mode
    if job_in.job_type is not None:
        job.job_type = job_in.job_type
    if job_in.experience_level is not None:
        job.experience_level = job_in.experience_level
    if job_in.salary_min is not None:
        job.salary_min = job_in.salary_min
    if job_in.salary_max is not None:
        job.salary_max = job_in.salary_max
    if job_in.salary_currency is not None:
        job.salary_currency = job_in.salary_currency
    if job_in.description_text is not None:
        job.description_text = job_in.description_text.strip()
    if job_in.skills is not None:
        job.skills = job_in.skills
    if job_in.apply_url is not None:
        job.apply_url = job_in.apply_url.strip()

    db.commit()
    db.refresh(job)
    return _build_job_response(job, set())


@router.delete("/{job_id}")
def delete_manual_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    """Delete a manual job posting (author or admin only)."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.source != "manual":
        raise HTTPException(status_code=400, detail="Only manually created postings can be deleted")

    if job.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this posting")

    db.delete(job)
    db.commit()
    return {"ok": True, "msg": f"Job {job_id} deleted successfully"}
