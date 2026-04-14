from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class ChatMessageBase(BaseModel):
    message_type: str = "text"
    content: str

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessageResponse(ChatMessageBase):
    id: int
    room_id: int
    sender_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRoomBase(BaseModel):
    subject_id: int

class ChatRoomResponse(ChatRoomBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
