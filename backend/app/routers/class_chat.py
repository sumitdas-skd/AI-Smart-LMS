from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
import asyncio
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List, Optional

from app.database import get_db
from app.models.class_chat import DoubtThread, DoubtMessage
from app.schemas.class_chat import DoubtThreadResponse, DoubtThreadStart, DoubtMessageResponse, DoubtMessageCreate
from app.core.deps import get_current_user, require_role
from app.models.user import User

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, List[WebSocket]] = {}

    async def connect(self, ws: WebSocket, thread_id: int):
        await ws.accept()
        if thread_id not in self.active_connections:
            self.active_connections[thread_id] = []
        self.active_connections[thread_id].append(ws)

    def disconnect(self, ws: WebSocket, thread_id: int):
        if thread_id in self.active_connections:
            self.active_connections[thread_id].remove(ws)

    async def broadcast_to_thread(self, thread_id: int, message: dict):
        if thread_id in self.active_connections:
            for connection in self.active_connections[thread_id][:]:
                try:
                    await connection.send_json(message)
                except Exception:
                    try:
                        self.active_connections[thread_id].remove(connection)
                    except ValueError:
                        pass

manager = ConnectionManager()

router = APIRouter(prefix="/class-chat", tags=["class_chat"])

@router.get("/subjects/{subject_id}/doubts", response_model=List[DoubtThreadResponse])
def get_doubts(
    subject_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    query = db.query(DoubtThread).options(joinedload(DoubtThread.student)).filter(DoubtThread.subject_id == subject_id)
    if current_user.role == "student":
        query = query.filter(DoubtThread.student_id == current_user.id)
    return query.order_by(desc(DoubtThread.created_at)).all()

@router.post("/subjects/{subject_id}/doubts")
def create_doubt(
    subject_id: int, 
    payload: DoubtThreadStart,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    # Only students should conceptually start doubt threads, but we allow anyone for flexibility or test
    new_thread = DoubtThread(
        subject_id=subject_id,
        student_id=current_user.id
    )
    db.add(new_thread)
    db.commit()
    db.refresh(new_thread)
    
    # Create the initial message
    msg = DoubtMessage(
        thread_id=new_thread.id,
        sender_id=current_user.id,
        message_type=payload.initial_message.message_type,
        content=payload.initial_message.content,
        file_url=payload.initial_message.file_url,
        file_name=payload.initial_message.file_name
    )
    db.add(msg)
    db.commit()
    db.refresh(new_thread)
    
    return jsonable_encoder(DoubtThreadResponse.model_validate(new_thread))

@router.get("/doubts/{thread_id}/messages", response_model=List[DoubtMessageResponse])
def get_doubt_messages(thread_id: int, db: Session = Depends(get_db)):
    messages = db.query(DoubtMessage).options(joinedload(DoubtMessage.sender)).filter(DoubtMessage.thread_id == thread_id).order_by(DoubtMessage.created_at.asc()).all()
    return messages

@router.post("/doubts/{thread_id}/messages")
async def post_message(
    thread_id: int,
    payload: DoubtMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    thread = db.query(DoubtThread).filter(DoubtThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
        
    msg = DoubtMessage(
        thread_id=thread_id,
        sender_id=current_user.id,
        message_type=payload.message_type,
        content=payload.content,
        file_url=payload.file_url,
        file_name=payload.file_name
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    
    # Needs to eagerly load sender to include in broadcast
    msg.sender = current_user
    
    # Broadcast as background task to avoid blocking API response or causing issues
    asyncio.create_task(manager.broadcast_to_thread(thread_id, {"type": "new_message", "message": jsonable_encoder(DoubtMessageResponse.model_validate(msg))}))
    
    return jsonable_encoder(DoubtMessageResponse.model_validate(msg))

@router.websocket("/ws/{thread_id}")
async def websocket_endpoint(websocket: WebSocket, thread_id: int):
    await manager.connect(websocket, thread_id)
    try:
        while True:
            data = await websocket.receive_text()
            # We dont handle incoming ws text since replies go through POST
    except WebSocketDisconnect:
        manager.disconnect(websocket, thread_id)

@router.patch("/doubts/{thread_id}/resolve")
def resolve_doubt(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    thread = db.query(DoubtThread).filter(DoubtThread.id == thread_id).first()
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    thread.is_resolved = True
    db.commit()
    return {"status": "resolved"}

@router.patch("/messages/{message_id}/pin")
def pin_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    msg = db.query(DoubtMessage).filter(DoubtMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.is_pinned = not msg.is_pinned
    db.commit()
    return {"status": "success", "is_pinned": msg.is_pinned}

@router.patch("/messages/{message_id}/helpful")
def mark_helpful(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    msg = db.query(DoubtMessage).filter(DoubtMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    # Only allow students to mark helpful? We will let anyone for now.
    msg.is_helpful = not msg.is_helpful
    db.commit()
    return {"status": "success", "is_helpful": msg.is_helpful}
