from pydantic import BaseModel, constr
from typing import Optional
from datetime import datetime

class NoteBase(BaseModel):
    title: str
    description: Optional[str] = None
    file_path: Optional[str] = None
    external_link: Optional[str] = None
    subject_id: int
    semester_id: Optional[int] = None
    tags: Optional[str] = None

class NoteCreate(NoteBase):
    source_type: Optional[str] = "manual"

class NoteResponse(NoteBase):
    id: int
    uploaded_by: Optional[int] = None
    source_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class QABase(BaseModel):
    topic: Optional[str] = None
    question: str
    answer: str
    difficulty: str
    tags: Optional[str] = None
    subject_id: int
    semester_id: Optional[int] = None
    marks: Optional[int] = None
    unit_number: Optional[int] = None

class QACreate(QABase):
    source: Optional[str] = "manual"

class QAResponse(QABase):
    id: int
    created_by: Optional[int] = None
    source: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    topic: Optional[str] = None
    youtube_url: Optional[str] = None        # Either YouTube URL ...
    video_file_path: Optional[str] = None    # ... or uploaded file path
    thumbnail_url: Optional[str] = None
    subject_id: int
    semester_id: Optional[int] = None

class VideoCreate(VideoBase):
    source: Optional[str] = "manual"

class VideoResponse(VideoBase):
    id: int
    source: Optional[str] = None
    uploaded_by: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PYQBase(BaseModel):
    title: str
    year: int
    exam_type: str
    subject_id: int
    semester_id: Optional[int] = None
    file_path: Optional[str] = None
    external_link: Optional[str] = None
    content: Optional[str] = None

class PYQCreate(PYQBase):
    pass

class PYQResponse(PYQBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
