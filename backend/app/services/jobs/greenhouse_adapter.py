"""
Greenhouse ATS Adapter.
Fetches public jobs from https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
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


class GreenhouseAdapter(BaseJobAdapter):
    source_name = "greenhouse"

    def __init__(self, slug: str, company_name: Optional[str] = None):
        self.slug = slug.strip().lower()
        self.company_name = company_name or self.slug.capitalize()

    def fetch_jobs(self, timeout: int = 15) -> List[Dict[str, Any]]:
        endpoint = f"https://boards-api.greenhouse.io/v1/boards/{self.slug}/jobs?content=true"
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
                    raise RuntimeError(f"Greenhouse API returned HTTP {resp.status}")
                raw_data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.warning(f"Failed to fetch Greenhouse jobs for '{self.slug}': {e}")
            raise e

        jobs_list = raw_data.get("jobs", [])
        normalized = []
        for item in jobs_list:
            raw_id = item.get("id")
            if not raw_id:
                continue

            title = item.get("title", "").strip()
            raw_content = item.get("content", "")
            description = clean_html(raw_content)

            # Filter for engineering/IT relevance
            if not is_relevant_job(title, description):
                continue

            apply_url = validate_https_url(item.get("absolute_url"))
            if not apply_url:
                continue

            location_obj = item.get("location", {})
            location_name = location_obj.get("name", "Remote").strip() if isinstance(location_obj, dict) else str(location_obj)

            combined_text = f"{title} {location_name} {description[:300]}"
            work_mode = detect_work_mode(combined_text)
            job_type = detect_job_type(combined_text)
            skills = extract_skills(f"{title} {description}")

            # Parse posted date if present
            posted_at = None
            raw_updated = item.get("updated_at")
            if raw_updated:
                try:
                    # ISO 8601 string parsing
                    posted_at = datetime.fromisoformat(raw_updated.replace("Z", "+00:00"))
                except Exception:
                    pass

            normalized.append({
                "source": self.source_name,
                "external_id": f"{self.slug}:{raw_id}",
                "title": title,
                "company": self.company_name,
                "location": location_name or "Remote",
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

