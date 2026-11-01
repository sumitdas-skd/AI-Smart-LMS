"""
Service for scraping, caching, and serving official BPUT notices and notifications.
Scrapes both Examination Info and News & Circulars from official bput.ac.in portals.
"""
import urllib.request
import re
import time
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

BPUT_EXAM_URL = "https://www.bput.ac.in/exam-info.php"
BPUT_NEWS_URL = "https://www.bput.ac.in/news.php"

# In-memory cache
_CACHE: Dict[str, Any] = {
    "data": [],
    "last_fetched": 0,
    "ttl_seconds": 900  # 15 minutes cache
}

class BPUTService:

    @staticmethod
    def _fetch_html(url: str, timeout: int = 8) -> str:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            }
        )
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return response.read().decode("utf-8", errors="ignore")

    @classmethod
    def _parse_rows(cls, html: str, default_category: str = "Examination") -> List[Dict[str, Any]]:
        results = []
        tr_matches = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL | re.IGNORECASE)
        for tr in tr_matches[1:]:  # skip header row
            tds = re.findall(r'<td[^>]*>(.*?)</td>', tr, re.DOTALL | re.IGNORECASE)
            if len(tds) < 2:
                continue

            clean_tds = [re.sub(r'<[^>]+>', ' ', td).strip() for td in tds]
            # Extract links
            links = re.findall(r'href=[\"\']([^\"\']+)[\"\']', tr, re.IGNORECASE)
            doc_link = ""
            for l in links:
                if "drive.google.com" in l or "pdf" in l.lower() or "document" in l.lower():
                    doc_link = l
                    break
            if not doc_link and links:
                doc_link = links[0]
                if doc_link.startswith("/"):
                    doc_link = "https://www.bput.ac.in" + doc_link
                elif not doc_link.startswith("http"):
                    doc_link = f"https://www.bput.ac.in/{doc_link}"

            date_str = clean_tds[1] if len(clean_tds) > 1 else ""
            raw_title = clean_tds[2] if len(clean_tds) > 2 else clean_tds[0]
            
            is_new = bool(re.search(r'\bNew\b', raw_title, re.IGNORECASE))
            clean_title = re.sub(r'\s*\bNew\b\s*', '', raw_title, flags=re.IGNORECASE).strip()

            if not clean_title or len(clean_title) < 5:
                continue

            results.append({
                "id": f"bput-{abs(hash(clean_title + date_str)) % 10000000}",
                "title": clean_title,
                "date": date_str,
                "link": doc_link,
                "is_new": is_new,
                "category": default_category,
                "source": "BPUT Official"
            })
        return results

    @classmethod
    def get_bput_notifications(cls, force_refresh: bool = False) -> List[Dict[str, Any]]:
        now = time.time()
        if not force_refresh and _CACHE["data"] and (now - _CACHE["last_fetched"] < _CACHE["ttl_seconds"]):
            return _CACHE["data"]

        all_notices = []
        try:
            # 1. Fetch Exam Notices
            exam_html = cls._fetch_html(BPUT_EXAM_URL)
            exam_notices = cls._parse_rows(exam_html, default_category="Examination")
            all_notices.extend(exam_notices)
        except Exception as e:
            logger.warning(f"Failed to fetch BPUT exam notices: {e}")

        try:
            # 2. Fetch News and Circulars
            news_html = cls._fetch_html(BPUT_NEWS_URL)
            news_notices = cls._parse_rows(news_html, default_category="News & Circular")
            # De-duplicate by title
            existing_titles = {n["title"] for n in all_notices}
            for n in news_notices:
                if n["title"] not in existing_titles:
                    all_notices.append(n)
        except Exception as e:
            logger.warning(f"Failed to fetch BPUT news: {e}")

        # If live scrape returned data, update cache
        if all_notices:
            _CACHE["data"] = all_notices
            _CACHE["last_fetched"] = now
            return all_notices

        # If live fetch failed but we have stale cache, return stale cache
        if _CACHE["data"]:
            return _CACHE["data"]

        # Fallback offline notices if network is completely down
        return [
            {
                "id": "bput-fb-1",
                "title": "Tentative Schedule for Odd Semester (Regular / Back) Examinations 2026-27 (1st Phase)",
                "date": "28/10/2026",
                "link": "https://www.bput.ac.in/exam-info.php",
                "is_new": True,
                "category": "Examination",
                "source": "BPUT Official"
            },
            {
                "id": "bput-fb-2",
                "title": "Appointment of Supervisor for the upcoming University Examinations",
                "date": "29/10/2026",
                "link": "https://www.bput.ac.in/exam-info.php",
                "is_new": True,
                "category": "Examination",
                "source": "BPUT Official"
            },
            {
                "id": "bput-fb-3",
                "title": "BPUT Tech Carnival 2026 (Sports Event - Change of Schedule)",
                "date": "29/10/2026",
                "link": "https://www.bput.ac.in/news.php",
                "is_new": True,
                "category": "News & Circular",
                "source": "BPUT Official"
            }
        ]

