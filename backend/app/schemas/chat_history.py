from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

class ChatMessageItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    role: str # "user" | "assistant"
    content: str
    provider_model: Optional[str] = None
    created_at: datetime

class ChatSessionSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    is_archived: bool
    pinned: bool
    message_count: int = 0
    last_message_preview: Optional[str] = None

class ChatSessionDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    created_at: datetime
    updated_at: datetime
    is_archived: bool
    pinned: bool
    messages: List[ChatMessageItem]

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=150)
    pinned: Optional[bool] = None
    is_archived: Optional[bool] = None

class ChatHistoryRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: Optional[int] = None
    subject_id: Optional[int] = None # For optional context injection

class ChatHistoryResponse(BaseModel):
    reply: str
    session_id: int
    session_title: str
    ok: bool
    provider: str
    xp_earned: int = 0

