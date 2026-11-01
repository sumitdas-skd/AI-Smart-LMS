"""
Comprehensive unit tests for the Job Query Sync Engine.
Tests:
- Normalization per adapter using recorded sample payloads (no live network).
- SSRF prevention & API host allowlist.
- HTTPS apply URL validation & rejection of dangerous schemes.
- HTML stripping to plain text.
- Tech skill extraction & work mode / job type detection.
- Database idempotent upsert and vanish-deactivation logic.
- Total failure isolation across multiple adapters.
"""
import json
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
import app.models.user
from app.models.jobs import Job, JobSource, JobSyncLog
from app.services.jobs.base import (
    clean_html, validate_https_url, validate_api_host,
    detect_work_mode, detect_job_type, extract_skills, is_relevant_job
)
from app.services.jobs.greenhouse_adapter import GreenhouseAdapter
from app.services.jobs.lever_adapter import LeverAdapter
from app.services.jobs.ashby_adapter import AshbyAdapter
from app.services.jobs.adzuna_adapter import AdzunaAdapter
from app.services.jobs.sync_service import JobSyncService


# ─── 1. Security & Sanitization Tests ─────────────────────────────────────────

def test_clean_html():
    raw_html = "<div><h3>Software Engineer &amp; Intern</h3><p>We are hiring!<br>Requirements:<ul><li>Python &amp; SQL</li><li>React</li></ul></p></div>"
    cleaned = clean_html(raw_html)
    assert "<" not in cleaned
    assert ">" not in cleaned
    assert "Software Engineer & Intern" in cleaned
    assert "Python & SQL" in cleaned
    assert "React" in cleaned


def test_validate_https_url():
    assert validate_https_url("https://boards.greenhouse.io/stripe/jobs/123") == "https://boards.greenhouse.io/stripe/jobs/123"
    assert validate_https_url("http://insecure.com/job") is None
    assert validate_https_url("javascript:alert(1)") is None
    assert validate_https_url("file:///etc/passwd") is None
    assert validate_https_url("") is None
    assert validate_https_url(None) is None


def test_validate_api_host_ssrf_prevention():
    assert validate_api_host("https://boards-api.greenhouse.io/v1/boards/stripe/jobs") is True
    assert validate_api_host("https://api.lever.co/v0/postings/figma") is True
    assert validate_api_host("https://api.ashbyhq.com/posting-api/job-board/linear") is True
    assert validate_api_host("https://api.adzuna.com/v1/api/jobs/in/search/1") is True
    
    # Block internal metadata, localhost, and non-whitelisted domains
    assert validate_api_host("http://169.254.169.254/latest/meta-data") is False
    assert validate_api_host("https://169.254.169.254/latest/meta-data") is False
    assert validate_api_host("http://localhost:8000/internal") is False
    assert validate_api_host("https://malicious-site.com/jobs") is False


def test_detectors_and_skill_extraction():
    text = "Remote Full-Time Software Engineering Intern skilled in Python, React, and PostgreSQL"
    assert detect_work_mode(text) == "remote"
    assert detect_job_type(text) == "internship"
    skills = extract_skills(text)
    assert "Python" in skills
    assert "React" in skills
    assert "PostgreSQL" in skills
    assert is_relevant_job("Frontend Engineer") is True
    assert is_relevant_job("Office Janitor") is False


# ─── 2. Adapter Normalization Tests (Recorded Payloads) ───────────────────────

SAMPLE_GREENHOUSE_PAYLOAD = {
    "jobs": [
        {
            "id": 998877,
            "title": "Backend Engineering Intern",
            "content": "&lt;p&gt;Work with &lt;strong&gt;FastAPI&lt;/strong&gt; and &lt;strong&gt;Docker&lt;/strong&gt;. Remote friendly.&lt;/p&gt;",
            "absolute_url": "https://boards.greenhouse.io/stripe/jobs/998877",
            "location": {"name": "Bengaluru, India (Remote)"},
            "updated_at": "2026-10-30T10:00:00Z"
        }
    ]
}

def test_greenhouse_adapter_normalization():
    adapter = GreenhouseAdapter(slug="stripe", company_name="Stripe")
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(SAMPLE_GREENHOUSE_PAYLOAD).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        jobs = adapter.fetch_jobs()
        assert len(jobs) == 1
        job = jobs[0]
        assert job["source"] == "greenhouse"
        assert job["external_id"] == "stripe:998877"
        assert job["title"] == "Backend Engineering Intern"
        assert job["company"] == "Stripe"
        assert job["work_mode"] == "remote"
        assert job["job_type"] == "internship"
        assert "FastAPI" in job["skills"]
        assert "Docker" in job["skills"]
        assert job["apply_url"].startswith("https://")


SAMPLE_LEVER_PAYLOAD = [
    {
        "id": "lever-12345",
        "text": "Full Stack Developer",
        "descriptionPlain": "We are seeking a React and Node.js developer. Hybrid model.",
        "hostedUrl": "https://jobs.lever.co/figma/lever-12345",
        "workplaceType": "hybrid",
        "categories": {
            "location": "Mumbai, India",
            "commitment": "Full-time"
        },
        "createdAt": 1730000000000
    }
]

def test_lever_adapter_normalization():
    adapter = LeverAdapter(slug="figma", company_name="Figma")
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(SAMPLE_LEVER_PAYLOAD).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        jobs = adapter.fetch_jobs()
        assert len(jobs) == 1
        job = jobs[0]
        assert job["source"] == "lever"
        assert job["external_id"] == "figma:lever-12345"
        assert job["title"] == "Full Stack Developer"
        assert job["company"] == "Figma"
        assert job["work_mode"] == "hybrid"
        assert job["job_type"] == "fulltime"
        assert "React" in job["skills"]
        assert "Node.js" in job["skills"]


SAMPLE_ASHBY_PAYLOAD = {
    "jobs": [
        {
            "id": "ashby-987",
            "title": "Systems Engineer",
            "descriptionHtml": "<p>Deep knowledge of Linux, C++, and Python.</p>",
            "jobUrl": "https://jobs.ashbyhq.com/linear/ashby-987",
            "location": "Remote",
            "isRemote": True,
            "employmentType": "FullTime",
            "publishedAt": "2026-10-29T14:30:00Z"
        }
    ]
}

def test_ashby_adapter_normalization():
    adapter = AshbyAdapter(slug="linear", company_name="Linear")
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(SAMPLE_ASHBY_PAYLOAD).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        jobs = adapter.fetch_jobs()
        assert len(jobs) == 1
        job = jobs[0]
        assert job["source"] == "ashby"
        assert job["external_id"] == "linear:ashby-987"
        assert job["work_mode"] == "remote"
        assert "Linux" in job["skills"]
        assert "C++" in job["skills"]


SAMPLE_ADZUNA_PAYLOAD = {
    "results": [
        {
            "id": 554433,
            "title": "Junior Python Developer",
            "description": "Looking for freshers with strong Python and SQL background.",
            "redirect_url": "https://www.adzuna.in/land/ad/554433",
            "company": {"display_name": "Tech Corp"},
            "location": {"display_name": "Hyderabad, India"},
            "salary_min": 500000,
            "salary_max": 800000,
            "created": "2026-10-28T09:00:00Z"
        }
    ]
}

def test_adzuna_adapter_normalization():
    adapter = AdzunaAdapter(app_id="dummy_id", app_key="dummy_key", country="in")
    with patch("urllib.request.urlopen") as mock_urlopen:
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.read.return_value = json.dumps(SAMPLE_ADZUNA_PAYLOAD).encode("utf-8")
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        jobs = adapter.fetch_jobs()
        assert len(jobs) == 1
        job = jobs[0]
        assert job["source"] == "adzuna"
        assert job["external_id"] == "554433"
        assert job["company"] == "Tech Corp"
        assert job["salary_min"] == 500000
        assert job["salary_max"] == 800000
        assert job["salary_currency"] == "INR"


# ─── 3. Upsert, Deactivation, & Failure Isolation Tests ────────────────────────

@pytest.fixture
def memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


def test_sync_upsert_and_deactivate(memory_db):
    mock_adapter = MagicMock()
    mock_adapter.source_name = "greenhouse"
    mock_adapter.slug = "acme"

    # Batch 1: returns two jobs: acme:1 and acme:2
    mock_adapter.fetch_jobs.return_value = [
        {
            "source": "greenhouse",
            "external_id": "acme:1",
            "title": "Software Engineer v1",
            "company": "Acme",
            "location": "Remote",
            "work_mode": "remote",
            "job_type": "fulltime",
            "description_text": "Python engineer",
            "skills": ["Python"],
            "apply_url": "https://acme.com/job1",
            "posted_at": datetime.now(timezone.utc)
        },
        {
            "source": "greenhouse",
            "external_id": "acme:2",
            "title": "QA Engineer",
            "company": "Acme",
            "location": "Remote",
            "work_mode": "remote",
            "job_type": "fulltime",
            "description_text": "QA role",
            "skills": ["Git"],
            "apply_url": "https://acme.com/job2",
            "posted_at": datetime.now(timezone.utc)
        }
    ]

    res1 = JobSyncService.sync_single_source(memory_db, "greenhouse:acme", mock_adapter)
    assert res1["success"] is True
    assert res1["created"] == 2
    assert res1["updated"] == 0

    assert memory_db.query(Job).filter(Job.is_active == True).count() == 2

    # Batch 2: acme:1 is updated with new title, and acme:2 has vanished from the feed
    mock_adapter.fetch_jobs.return_value = [
        {
            "source": "greenhouse",
            "external_id": "acme:1",
            "title": "Senior Software Engineer v2",
            "company": "Acme",
            "location": "Remote",
            "work_mode": "remote",
            "job_type": "fulltime",
            "description_text": "Senior Python role",
            "skills": ["Python", "FastAPI"],
            "apply_url": "https://acme.com/job1",
            "posted_at": datetime.now(timezone.utc)
        }
    ]

    res2 = JobSyncService.sync_single_source(memory_db, "greenhouse:acme", mock_adapter)
    assert res2["success"] is True
    assert res2["created"] == 0
    assert res2["updated"] == 1
    assert res2["deactivated"] == 1

    # Verify acme:1 title was updated in-place and is active
    job1 = memory_db.query(Job).filter(Job.external_id == "acme:1").first()
    assert job1.title == "Senior Software Engineer v2"
    assert job1.is_active is True

    # Verify vanished acme:2 was NOT deleted, but marked is_active = False
    job2 = memory_db.query(Job).filter(Job.external_id == "acme:2").first()
    assert job2 is not None
    assert job2.is_active is False


def test_failure_isolation_between_sources(memory_db):
    """Verifies that an error in one source does NOT halt other sources."""
    broken_adapter = MagicMock()
    broken_adapter.source_name = "greenhouse"
    broken_adapter.slug = "broken_company"
    broken_adapter.fetch_jobs.side_effect = RuntimeError("500 Server Error from upstream ATS")

    healthy_adapter = MagicMock()
    healthy_adapter.source_name = "lever"
    healthy_adapter.slug = "healthy_company"
    healthy_adapter.fetch_jobs.return_value = [
        {
            "source": "lever",
            "external_id": "healthy_company:1",
            "title": "Data Analyst Intern",
            "company": "Healthy Inc",
            "location": "Pune, India",
            "work_mode": "onsite",
            "job_type": "internship",
            "description_text": "Data analytics",
            "skills": ["SQL", "Python"],
            "apply_url": "https://healthy.com/job1",
            "posted_at": datetime.now(timezone.utc)
        }
    ]

    # Run broken source
    res_broken = JobSyncService.sync_single_source(memory_db, "greenhouse:broken", broken_adapter)
    assert res_broken["success"] is False
    assert "500 Server Error" in res_broken["error"]

    # Run healthy source - it should succeed completely regardless of the prior failure!
    res_healthy = JobSyncService.sync_single_source(memory_db, "lever:healthy", healthy_adapter)
    assert res_healthy["success"] is True
    assert res_healthy["created"] == 1

    # Verify healthy job was safely committed
    saved = memory_db.query(Job).filter(Job.external_id == "healthy_company:1").first()
    assert saved is not None
    assert saved.title == "Data Analyst Intern"
