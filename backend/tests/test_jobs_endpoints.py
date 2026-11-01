"""
Unit and integration tests for the Jobs router endpoints.
Tests:
- RBAC permissions (students cannot post manual jobs or trigger sync).
- Teacher/Admin can create, edit, delete manual jobs.
- Students can search, filter, and save/unsave jobs.
- Serverless cron trigger with X-Cron-Key.
"""
import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
import app.models.user
from app.models.user import User
from app.models.jobs import Job, SavedJob, JobSource
from app.core.security import create_access_token, get_password_hash
from app.main import app


# In-memory test database fixture
@pytest.fixture
def client_and_db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSessionLocal()
    # Create test users: 1 student, 1 teacher, 1 admin with distinct IDs
    student = User(
        id=101,
        full_name="Alice Student",
        email="alice@college.edu",
        hashed_password=get_password_hash("pass123"),
        role="student"
    )
    teacher = User(
        id=102,
        full_name="Bob Teacher",
        email="bob@college.edu",
        hashed_password=get_password_hash("pass123"),
        role="teacher"
    )
    admin = User(
        id=103,
        full_name="Carol Admin",
        email="carol@college.edu",
        hashed_password=get_password_hash("pass123"),
        role="admin"
    )
    db.add_all([student, teacher, admin])

    # Add a sample active job
    test_job = Job(
        id=1,
        source="greenhouse",
        external_id="stripe:101",
        title="Software Engineer Intern",
        company="Stripe",
        location="Bengaluru, India",
        work_mode="remote",
        job_type="internship",
        description_text="Exciting summer internship for CS students.",
        skills=["Python", "React"],
        apply_url="https://stripe.com/jobs/101",
        posted_at=datetime.now(timezone.utc),
        first_seen_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc),
        is_active=True
    )
    db.add(test_job)
    db.commit()

    student_token = create_access_token(subject="101")
    teacher_token = create_access_token(subject="102")
    admin_token = create_access_token(subject="103")

    client = TestClient(app)

    yield {
        "client": client,
        "db": db,
        "student_headers": {"Authorization": f"Bearer {student_token}"},
        "teacher_headers": {"Authorization": f"Bearer {teacher_token}"},
        "admin_headers": {"Authorization": f"Bearer {admin_token}"},
    }

    db.close()
    app.dependency_overrides.clear()


def test_list_jobs_and_filter(client_and_db):
    client = client_and_db["client"]
    headers = client_and_db["student_headers"]

    # 1. Search for Stripe
    res = client.get("/jobs?q=stripe", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 1
    item = data["items"][0]
    assert item["company"] == "Stripe"
    assert item["is_saved"] is False
    assert item["is_new"] is True

    # 2. Filter by nonexistent keyword
    res_empty = client.get("/jobs?q=nonexistentkeyword", headers=headers)
    assert res_empty.status_code == 200
    assert res_empty.json()["total"] == 0


def test_save_and_unsave_job(client_and_db):
    client = client_and_db["client"]
    headers = client_and_db["student_headers"]

    # Save job #1
    res_save = client.post("/jobs/1/save", headers=headers)
    assert res_save.status_code == 200
    assert res_save.json()["saved"] is True

    # Check that job is now marked saved
    res_list = client.get("/jobs?saved_only=true", headers=headers)
    assert res_list.status_code == 200
    data = res_list.json()
    assert data["total"] == 1
    assert data["items"][0]["is_saved"] is True

    # Unsave
    res_unsave = client.delete("/jobs/1/save", headers=headers)
    assert res_unsave.status_code == 200
    assert res_unsave.json()["saved"] is False

    res_list2 = client.get("/jobs?saved_only=true", headers=headers)
    assert res_list2.json()["total"] == 0


def test_student_rbac_restrictions(client_and_db):
    client = client_and_db["client"]
    student_headers = client_and_db["student_headers"]
    db = client_and_db["db"]
    for u in db.query(User).all():
        print("USER IN DB:", u.id, u.email, u.role)

    # Students CANNOT post manual jobs
    post_res = client.post("/jobs", json={
        "title": "Unauthorized Job",
        "company": "Fake Corp",
        "location": "Remote",
        "description_text": "Trying to bypass role check.",
        "apply_url": "https://example.com/apply"
    }, headers=student_headers)
    assert post_res.status_code == 403

    # Students CANNOT trigger admin sync
    sync_res = client.post("/jobs/sync", headers=student_headers)
    assert sync_res.status_code == 403

    # Students CANNOT manage sources
    src_res = client.get("/jobs/sources", headers=student_headers)
    assert src_res.status_code == 403


def test_teacher_manual_job_lifecycle(client_and_db):
    client = client_and_db["client"]
    teacher_headers = client_and_db["teacher_headers"]

    # Teacher creates manual placement opening
    res = client.post("/jobs", json={
        "title": "On-Campus Software Developer",
        "company": "TCS Placement Cell",
        "location": "Bhubaneswar",
        "work_mode": "onsite",
        "job_type": "fulltime",
        "description_text": "Exclusive placement drive for ABIT engineering batch.",
        "skills": ["Java", "SQL"],
        "apply_url": "https://careers.tcs.com/apply"
    }, headers=teacher_headers)
    assert res.status_code == 201
    job_id = res.json()["id"]
    assert res.json()["source"] == "manual"

    # Teacher updates their manual posting
    update_res = client.put(f"/jobs/{job_id}", json={
        "title": "On-Campus Graduate Trainee 2026",
    }, headers=teacher_headers)
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "On-Campus Graduate Trainee 2026"

    # Teacher deletes manual posting
    del_res = client.delete(f"/jobs/{job_id}", headers=teacher_headers)
    assert del_res.status_code == 200


def test_cron_sync_endpoint(client_and_db):
    client = client_and_db["client"]

    # Unauthenticated / invalid secret fails
    res_fail = client.post("/jobs/cron-sync", headers={"X-Cron-Key": "wrong_key"})
    assert res_fail.status_code == 401

    # Valid secret succeeds
    from app.core.config import settings
    res_ok = client.post("/jobs/cron-sync", headers={"X-Cron-Key": settings.CRON_SECRET})
    assert res_ok.status_code == 200
    assert res_ok.json()["ok"] is True
