from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

class SubjectResultItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject_id: int
    subject_name: str
    subject_code: str
    credits: int
    semester: int
    midsem_marks: float
    endsem_marks: float
    assignment_marks: float
    total: float
    grade: str
    grade_point: float

class SemesterResultSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    semester: int
    sgpa: float
    credits_earned: int
    total_credits: int
    subjects: List[SubjectResultItem]

class SGPATrendItem(BaseModel):
    semester: int
    sgpa: float
    credits_earned: int

class StudentResultsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    student_name: str
    roll_number: Optional[str] = None
    cgpa: float
    total_credits_earned: int
    sgpa_trend: List[SGPATrendItem]
    semesters: List[SemesterResultSummary]

class RowValidationError(BaseModel):
    row_number: int
    identifier: str # roll_number or email
    error: str

class UploadPreviewRow(BaseModel):
    row_number: int
    student_name: str
    identifier: str
    subject_code: str
    semester: int
    midsem_marks: float
    endsem_marks: float
    assignment_marks: float
    total: float
    grade: str
    grade_point: float

class UploadDryRunResponse(BaseModel):
    dry_run: bool
    total_rows: int
    valid_rows_count: int
    error_count: int
    errors: List[RowValidationError]
    preview: List[UploadPreviewRow]
    message: str

class UploadCommitResponse(BaseModel):
    success: bool
    inserted_or_updated: int
    semesters_recomputed: int
    message: str

