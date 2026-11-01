from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime

class AnnouncementAuthor(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    full_name: Optional[str] = "Faculty"
    role: str

class AnnouncementSubject(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str

class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    content: str = Field(..., min_length=5)
    priority: str = Field("general", pattern="^(urgent|general|exam)$")
    subject_id: Optional[int] = None
    pinned: bool = False
    expires_at: Optional[datetime] = None

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    content: Optional[str] = Field(None, min_length=5)
    priority: Optional[str] = Field(None, pattern="^(urgent|general|exam)$")
    subject_id: Optional[int] = None
    pinned: Optional[bool] = None
    expires_at: Optional[datetime] = None

class AnnouncementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    priority: str
    subject_id: Optional[int] = None
    pinned: bool
    expires_at: Optional[datetime] = None
    created_by: int
    created_at: datetime
    author: Optional[AnnouncementAuthor] = None
    subject: Optional[AnnouncementSubject] = None

class AnnouncementsPaginatedResponse(BaseModel):
    total: int
    items: List[AnnouncementResponse]
    unread_count: int = 0

class BPUTNoticeItem(BaseModel):
    id: str
    title: str
    date: str
    link: str
    is_new: bool = False
    category: str = "Examination"
    source: str = "BPUT Official"

class BPUTSyncRequest(BaseModel):
    title: str
    content: Optional[str] = None
    link: Optional[str] = None
    priority: str = "exam" # exam, urgent, general


