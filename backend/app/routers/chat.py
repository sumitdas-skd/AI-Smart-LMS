from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.chat import ChatRoom, ChatMessage
from app.schemas.chat import ChatRoomResponse, ChatMessageResponse, ChatMessageCreate
from app.core.deps import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/rooms/{subject_id}", response_model=ChatRoomResponse)
def get_or_create_room(subject_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    room = db.query(ChatRoom).filter(ChatRoom.subject_id == subject_id).first()
    if not room:
        room = ChatRoom(subject_id=subject_id)
        db.add(room)
        db.commit()
        db.refresh(room)
    return room

@router.get("/rooms/{room_id}/messages", response_model=List[ChatMessageResponse])
def get_room_messages(room_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.created_at.asc()).all()

@router.post("/rooms/{room_id}/messages", response_model=ChatMessageResponse)
def send_chat_message(
    room_id: int, 
    msg: ChatMessageCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    room = db.query(ChatRoom).filter(ChatRoom.id == room_id).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
        
    new_msg = ChatMessage(
        room_id=room_id,
        sender_id=current_user.id,
        message_type=msg.message_type,
        content=msg.content
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg
