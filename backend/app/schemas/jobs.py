from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


class JobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    external_id: str
    title: str
    company: str
    location: str
    work_mode: str
    job_type: str
    experience_level: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = "INR"
    description_text: str
    skills: Optional[List[str]] = []
    apply_url: str
    posted_at: Optional[datetime] = None
    first_seen_at: datetime
    last_seen_at: datetime
    is_active: bool
    is_new: bool = False
    is_saved: bool = False
    created_by: Optional[int] = None


class JobsPaginatedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    items: List[JobResponse]
    limit: int
    offset: int
    has_more: bool
    unread_count: int = 0


class JobFilterOptions(BaseModel):
    locations: List[str]
    companies: List[str]
    job_types: List[str]
    work_modes: List[str]
    sources: List[str]


class JobCreateManual(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    location: str = Field("Remote", max_length=255)
    work_mode: str = Field("unknown", pattern="^(onsite|hybrid|remote|unknown)$")
    job_type: str = Field("unknown", pattern="^(internship|fulltime|parttime|contract|unknown)$")
    experience_level: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = "INR"
    description_text: str = Field(..., min_length=10)
    skills: Optional[List[str]] = []
    apply_url: str = Field(..., pattern="^https://.+")


class JobUpdateManual(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=255)
    company: Optional[str] = Field(None, min_length=1, max_length=255)
    location: Optional[str] = None
    work_mode: Optional[str] = Field(None, pattern="^(onsite|hybrid|remote|unknown)$")
    job_type: Optional[str] = Field(None, pattern="^(internship|fulltime|parttime|contract|unknown)$")
    experience_level: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    description_text: Optional[str] = Field(None, min_length=10)
    skills: Optional[List[str]] = None
    apply_url: Optional[str] = Field(None, pattern="^https://.+")


class JobSourceCreate(BaseModel):
    type: str = Field(..., pattern="^(greenhouse|lever|ashby)$")
    slug: str = Field(..., min_length=1, max_length=100)
    company_name: str = Field(..., min_length=1, max_length=255)
    enabled: bool = True


class JobSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    slug: str
    company_name: str
    enabled: bool
    last_synced_at: Optional[datetime] = None
    last_status: Optional[str] = None
    created_at: datetime


class JobSyncLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    fetched: int
    created: int
    updated: int
    deactivated: int
    error: Optional[str] = None


class JobAIMatchResponse(BaseModel):
    job_id: int
    fit_score: int  # 0 to 100
    bullets: List[str]
    cached: bool = False

