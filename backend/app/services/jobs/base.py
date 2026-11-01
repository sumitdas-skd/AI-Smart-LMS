"""
Base classes and sanitization utilities for Job Adapters.
Enforces:
- SSRF prevention through strict API host allowlisting.
- HTTPS-only apply URLs.
- HTML stripping to clean plain text.
- Work mode & job type detection.
- Tech skill keyword extraction.
"""
import re
import html
import urllib.parse
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Set
import logging

logger = logging.getLogger(__name__)

# Strict allowlist of permitted external API hosts (SSRF Protection)
ALLOWED_API_HOSTS: Set[str] = {
    "api.adzuna.com",
    "boards-api.greenhouse.io",
    "api.lever.co",
    "api.ashbyhq.com",
}

# Relevant engineering/tech keywords to filter general company boards
TECH_KEYWORDS = [
    "software", "engineer", "developer", "intern", "internship", "frontend",
    "backend", "full stack", "fullstack", "data", "machine learning", "ai",
    "python", "java", "react", "cloud", "devops", "qa", "test", "security",
    "analyst", "systems", "network", "web", "android", "ios", "trainee"
]

COMMON_TECH_SKILLS = [
    "Python", "Java", "C++", "C#", "JavaScript", "TypeScript", "React", "Vue",
    "Node.js", "FastAPI", "Django", "Flask", "Spring Boot", "SQL", "PostgreSQL",
    "MySQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP",
    "Git", "REST API", "GraphQL", "Machine Learning", "NLP", "Pandas", "PyTorch",
    "TensorFlow", "HTML5", "CSS3", "Tailwind CSS", "Linux", "DevOps", "CI/CD"
]


def clean_html(raw_html: Optional[str]) -> str:
    """Strips HTML tags, decodes HTML entities, and formats whitespace into plain text."""
    if not raw_html:
        return ""
    # Unescape HTML entities first
    text = html.unescape(raw_html)
    # Replace common break tags with newlines
    text = re.sub(r'<(?:br|br\s*/|/p|/div|/li|/h[1-6])>', '\n', text, flags=re.IGNORECASE)
    # Remove all remaining HTML tags
    text = re.sub(r'<[^>]+>', ' ', text)
    # Replace multiple spaces with a single space
    text = re.sub(r'[ \t]+', ' ', text)
    # Collapse multiple consecutive newlines (more than 2) to 2
    text = re.sub(r'\n\s*\n+', '\n\n', text)
    return text.strip()


def validate_https_url(url: Optional[str]) -> Optional[str]:
    """Validates that a URL is strictly HTTPS. Disallows javascript:, data:, file:, etc."""
    if not url:
        return None
    cleaned = url.strip()
    try:
        parsed = urllib.parse.urlparse(cleaned)
        if parsed.scheme.lower() == "https" and parsed.netloc:
            return cleaned
    except Exception:
        pass
    return None


def validate_api_host(url: str, allowed_hosts: Set[str] = ALLOWED_API_HOSTS) -> bool:
    """SSRF guard: Ensures an API endpoint URL strictly points to an allowed host."""
    try:
        parsed = urllib.parse.urlparse(url)
        return parsed.scheme.lower() == "https" and parsed.netloc.lower() in allowed_hosts
    except Exception:
        return False


def detect_work_mode(text: str) -> str:
    """Detects onsite, hybrid, remote, or unknown from text."""
    lowered = text.lower()
    if "remote" in lowered or "work from home" in lowered or "wfh" in lowered:
        return "remote"
    if "hybrid" in lowered:
        return "hybrid"
    if "onsite" in lowered or "on-site" in lowered or "in-office" in lowered or "in office" in lowered:
        return "onsite"
    return "unknown"


def detect_job_type(text: str) -> str:
    """Detects internship, fulltime, parttime, contract, or unknown from text."""
    lowered = text.lower()
    if "intern" in lowered or "internship" in lowered or "trainee" in lowered:
        return "internship"
    if "contract" in lowered or "contractor" in lowered or "freelance" in lowered:
        return "contract"
    if "part-time" in lowered or "part time" in lowered:
        return "parttime"
    if "full-time" in lowered or "full time" in lowered or "permanent" in lowered:
        return "fulltime"
    return "unknown"


def extract_skills(text: str) -> List[str]:
    """Extracts common software/tech skills mentioned in text."""
    found = []
    text_lower = f" {text.lower()} "
    for skill in COMMON_TECH_SKILLS:
        skill_clean = skill.lower()
        # Handle special characters like C++, C#, Node.js
        if skill_clean in ("c++", "c#"):
            pattern = r'(?i)(?:\s|^|[^\w#+])' + re.escape(skill_clean) + r'(?:\s|$|[^\w#+])'
        else:
            pattern = r'(?i)\b' + re.escape(skill_clean) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return sorted(list(set(found)))


def is_relevant_job(title: str, description: str = "", keywords: Optional[List[str]] = None) -> bool:
    """Checks if a job title or description matches tech/student engineering keywords."""
    keys = keywords or TECH_KEYWORDS
    target = f"{title} {description[:400]}".lower()
    return any(k.lower() in target for k in keys)


class BaseJobAdapter:
    """Abstract base class for all job board adapters."""
    source_name: str = "unknown"

    def fetch_jobs(self) -> List[Dict[str, Any]]:
        """Fetches and returns normalized job dictionaries."""
        raise NotImplementedError
