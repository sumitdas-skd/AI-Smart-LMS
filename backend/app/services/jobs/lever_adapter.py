"""
Lever ATS Adapter.
Fetches public jobs from https://api.lever.co/v0/postings/{slug}?mode=json
"""
import urllib.request
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.services.jobs.base import (
    BaseJobAdapter, validate_api_host, validate_https_url,
    clean_html, detect_work_mode, detect_job_type, extract_skills,
    is_relevant_job
)

logger = logging.getLogger(__name__)


class LeverAdapter(BaseJobAdapter):
    source_name = "lever"

    def __init__(self, slug: str, company_name: Optional[str] = None):
        self.slug = slug.strip().lower()
        self.company_name = company_name or self.slug.capitalize()

    def fetch_jobs(self, timeout: int = 15) -> List[Dict[str, Any]]:
        endpoint = f"https://api.lever.co/v0/postings/{self.slug}?mode=json"
        if not validate_api_host(endpoint):
            raise ValueError(f"Endpoint '{endpoint}' violates API host allowlist.")

        req = urllib.request.Request(
            endpoint,
            headers={
                "User-Agent": "AI-Smart-LMS-JobCrawler/1.0 (+http://localhost:5173/jobs; polite educational crawler)",
                "Accept": "application/json"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status != 200:
                    raise RuntimeError(f"Lever API returned HTTP {resp.status}")
                raw_data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.warning(f"Failed to fetch Lever jobs for '{self.slug}': {e}")
            raise e

        if not isinstance(raw_data, list):
            return []

        normalized = []
        for item in raw_data:
            raw_id = item.get("id")
            if not raw_id:
                continue

            title = item.get("text", "").strip()
            # Description may be in descriptionPlain or description HTML
            raw_desc = item.get("descriptionPlain") or item.get("description") or ""
            description = clean_html(raw_desc)

            if not is_relevant_job(title, description):
                continue

            apply_url = validate_https_url(item.get("hostedUrl") or item.get("applyUrl"))
            if not apply_url:
                continue

            categories = item.get("categories", {})
            location_name = categories.get("location", "Remote") or "Remote"
            commitment = categories.get("commitment", "")
            workplace_type = item.get("workplaceType", "")

            combined_text = f"{title} {location_name} {workplace_type} {commitment} {description[:300]}"
            work_mode = detect_work_mode(combined_text)
            job_type = detect_job_type(combined_text)
            skills = extract_skills(f"{title} {description}")

            # Lever createdAt is in epoch milliseconds
            posted_at = None
            raw_created = item.get("createdAt")
            if raw_created and isinstance(raw_created, (int, float)):
                try:
                    posted_at = datetime.fromtimestamp(raw_created / 1000.0, tz=timezone.utc)
                except Exception:
                    pass

            normalized.append({
                "source": self.source_name,
                "external_id": f"{self.slug}:{raw_id}",
                "title": title,
                "company": self.company_name,
                "location": location_name,
                "work_mode": work_mode,
                "job_type": job_type,
                "experience_level": "entry" if job_type == "internship" else None,
                "salary_min": None,
                "salary_max": None,
                "salary_currency": "INR",
                "description_text": description,
                "skills": skills,
                "apply_url": apply_url,
                "posted_at": posted_at,
            })

        return normalized

