"""
Adzuna API Adapter.
Fetches job and internship listings from https://api.adzuna.com/v1/api/jobs/{country}/search/{page}
Follows Adzuna attribution and developer terms.
"""
import urllib.request
import urllib.parse
import json
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.services.jobs.base import (
    BaseJobAdapter, validate_api_host, validate_https_url,
    clean_html, detect_work_mode, detect_job_type, extract_skills
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class AdzunaAdapter(BaseJobAdapter):
    source_name = "adzuna"

    def __init__(
        self,
        app_id: Optional[str] = None,
        app_key: Optional[str] = None,
        country: Optional[str] = None,
        query: str = "software engineer developer intern"
    ):
        self.app_id = app_id or settings.ADZUNA_APP_ID
        self.app_key = app_key or settings.ADZUNA_APP_KEY
        self.country = country or settings.ADZUNA_COUNTRY or "in"
        self.query = query

    def fetch_jobs(self, page: int = 1, timeout: int = 15) -> List[Dict[str, Any]]:
        if not self.app_id or not self.app_key:
            logger.info("Adzuna API credentials not configured; skipping Adzuna fetch.")
            return []

        encoded_what = urllib.parse.quote(self.query)
        endpoint = (
            f"https://api.adzuna.com/v1/api/jobs/{self.country}/search/{page}?"
            f"app_id={self.app_id}&app_key={self.app_key}&results_per_page=50&what={encoded_what}"
        )

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
                    raise RuntimeError(f"Adzuna API returned HTTP {resp.status}")
                raw_data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.warning(f"Failed to fetch Adzuna jobs: {e}")
            raise e

        results = raw_data.get("results", [])
        normalized = []
        for item in results:
            raw_id = item.get("id")
            if not raw_id:
                continue

            title = item.get("title", "").strip()
            raw_desc = item.get("description", "")
            description = clean_html(raw_desc)

            apply_url = validate_https_url(item.get("redirect_url"))
            if not apply_url:
                continue

            company_info = item.get("company", {})
            company_name = company_info.get("display_name", "Unknown Company").strip() if isinstance(company_info, dict) else "Unknown Company"

            loc_info = item.get("location", {})
            location_name = loc_info.get("display_name", "India").strip() if isinstance(loc_info, dict) else "India"

            combined_text = f"{title} {location_name} {description[:300]}"
            work_mode = detect_work_mode(combined_text)
            job_type = detect_job_type(combined_text)
            skills = extract_skills(f"{title} {description}")

            posted_at = None
            raw_created = item.get("created")
            if raw_created:
                try:
                    posted_at = datetime.fromisoformat(raw_created.replace("Z", "+00:00"))
                except Exception:
                    pass

            # Salary parsing
            salary_min = item.get("salary_min")
            salary_max = item.get("salary_max")
            try:
                salary_min = float(salary_min) if salary_min is not None else None
            except (ValueError, TypeError):
                salary_min = None
            try:
                salary_max = float(salary_max) if salary_max is not None else None
            except (ValueError, TypeError):
                salary_max = None

            currency = "INR" if self.country.lower() == "in" else "USD"

            normalized.append({
                "source": self.source_name,
                "external_id": str(raw_id),
                "title": title,
                "company": company_name,
                "location": location_name,
                "work_mode": work_mode,
                "job_type": job_type,
                "experience_level": "entry" if job_type == "internship" else None,
                "salary_min": salary_min,
                "salary_max": salary_max,
                "salary_currency": currency,
                "description_text": description,
                "skills": skills,
                "apply_url": apply_url,
                "posted_at": posted_at,
            })

        return normalized

