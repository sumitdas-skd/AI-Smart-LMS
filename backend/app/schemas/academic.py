from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class SyllabusEntryBase(BaseModel):
    title: str
    description: str
    unit_number: int
    source_url: Optional[str] = None

class SyllabusEntryCreate(SyllabusEntryBase):
    subject_id: int

class SyllabusEntryResponse(SyllabusEntryBase):
    id: int
    subject_id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class SubjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    semester_id: int

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    created_at: datetime
    # We optionally include syllabus in subject response depending on route
    syllabus: List[SyllabusEntryResponse] = []

    class Config:
        from_attributes = True

class SemesterBase(BaseModel):
    number: int
    name: str

class SemesterCreate(SemesterBase):
    pass

class SemesterResponse(SemesterBase):
    id: int
    subjects: List[SubjectResponse] = []

    class Config:
        from_attributes = True
