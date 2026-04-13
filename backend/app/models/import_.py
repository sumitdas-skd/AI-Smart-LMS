from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class ExternalResource(Base):
    __tablename__ = "external_resources"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    source_url = Column(String, unique=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    category = Column(String) # note/qa/pyq
    status = Column(String, default="pending") # pending/approved/rejected
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    file_url = Column(String, nullable=True)

class ImportJob(Base):
    __tablename__ = "import_jobs"
    id = Column(Integer, primary_key=True, index=True)
    triggered_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="running") # running/completed/failed
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    resource_count = Column(Integer, default=0)

class ImportLog(Base):
    __tablename__ = "import_logs"
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("import_jobs.id"))
    url = Column(String)
    status = Column(String) # success/skip/fail
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
