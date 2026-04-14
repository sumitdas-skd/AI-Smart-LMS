from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class UserBasic(BaseModel):
    id: int
    full_name: str
    role: str
    
    class Config:
        from_attributes = True

class DoubtMessageBase(BaseModel):
    message_type: str
    content: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None

class DoubtMessageCreate(DoubtMessageBase):
    pass

class DoubtMessageResponse(DoubtMessageBase):
    id: int
    thread_id: int
    sender_id: int
    is_pinned: bool
    is_helpful: bool
    created_at: datetime
    sender: Optional[UserBasic] = None
    
    class Config:
        from_attributes = True

class DoubtThreadBase(BaseModel):
    subject_id: int

class DoubtThreadCreate(DoubtThreadBase):
    pass
    # The first message comes along with the thread creation, but we will handle it via a combined payload if needed
    # Or frontend can create thread, then post message. We will provide a simple creation that takes first message.

class DoubtThreadStart(DoubtThreadBase):
    initial_message: DoubtMessageCreate

class DoubtThreadResponse(DoubtThreadBase):
    id: int
    student_id: int
    is_resolved: bool
    created_at: datetime
    updated_at: Optional[datetime]
    student: Optional[UserBasic] = None
    
    # Optional field to return the latest message or all messages
    messages: Optional[List[DoubtMessageResponse]] = None

    class Config:
        from_attributes = True
