from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, Text, Float,
    ForeignKey, UniqueConstraint, Index, JSON
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        UniqueConstraint("source", "external_id", name="uq_jobs_source_external_id"),
        Index("ix_jobs_posted_at", "posted_at"),
        Index("ix_jobs_is_active", "is_active"),
        Index("ix_jobs_company", "company"),
        Index("ix_jobs_job_type", "job_type"),
        Index("ix_jobs_work_mode", "work_mode"),
    )

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(30), nullable=False, index=True)  # adzuna|greenhouse|lever|ashby|manual
    external_id = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False, index=True)
    company = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False, default="Remote")
    work_mode = Column(String(20), nullable=False, default="unknown")  # onsite|hybrid|remote|unknown
    job_type = Column(String(20), nullable=False, default="unknown")  # internship|fulltime|parttime|contract|unknown
    experience_level = Column(String(50), nullable=True)  # entry|mid|senior|fresher|intern
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_currency = Column(String(10), nullable=True, default="INR")
    description_text = Column(Text, nullable=False)
    skills = Column(JSON, nullable=True)  # list of string keywords/skills
    apply_url = Column(String(1024), nullable=False)
    posted_at = Column(DateTime(timezone=True), nullable=True)
    first_seen_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    creator = relationship("User", foreign_keys=[created_by])
    saved_entries = relationship("SavedJob", back_populates="job", cascade="all, delete-orphan")


class SavedJob(Base):
    __tablename__ = "saved_jobs"
    __table_args__ = (
        UniqueConstraint("user_id", "job_id", name="uq_saved_jobs_user_job"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
    job = relationship("Job", back_populates="saved_entries")


class JobSource(Base):
    __tablename__ = "job_sources"
    __table_args__ = (
        UniqueConstraint("type", "slug", name="uq_job_sources_type_slug"),
    )

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(30), nullable=False, index=True)  # greenhouse|lever|ashby
    slug = Column(String(100), nullable=False, index=True)  # company board slug
    company_name = Column(String(255), nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    last_status = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class JobSyncLog(Base):
    __tablename__ = "job_sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(50), nullable=False, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    fetched = Column(Integer, default=0, nullable=False)
    created = Column(Integer, default=0, nullable=False)
    updated = Column(Integer, default=0, nullable=False)
    deactivated = Column(Integer, default=0, nullable=False)
    error = Column(Text, nullable=True)

