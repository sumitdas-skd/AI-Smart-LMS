from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ExternalResourceBase(BaseModel):
    title: str
    description: Optional[str] = None
    source_url: str
    subject_id: Optional[int] = None
    category: str
    status: str = "pending"
    file_url: Optional[str] = None

class ExternalResourceResponse(ExternalResourceBase):
    id: int
    fetched_at: datetime

    class Config:
        from_attributes = True

class ImportJobBase(BaseModel):
    status: str
    resource_count: int

class ImportJobResponse(ImportJobBase):
    id: int
    triggered_by: int
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ImportLogResponse(BaseModel):
    id: int
    job_id: int
    url: str
    status: str
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
