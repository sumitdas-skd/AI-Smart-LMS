from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.content import Bookmark
from app.core.deps import get_current_user
from app.models.user import User

class BookmarkCreate(BaseModel):
    resource_type: str
    resource_id: int
    subject_id: int = None
    title: str = None

class BookmarkResponse(BookmarkCreate):
    id: int
    user_id: int
    created_at: datetime
    class Config: from_attributes = True

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])

@router.get("/", response_model=List[BookmarkResponse])
def get_bookmarks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Bookmark).filter(Bookmark.user_id == current_user.id).all()

@router.post("/", response_model=dict)
def toggle_bookmark(req: BookmarkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Bookmark).filter(
        Bookmark.user_id == current_user.id,
        Bookmark.resource_type == req.resource_type,
        Bookmark.resource_id == req.resource_id
    ).first()
    
    if existing:
        db.delete(existing)
        db.commit()
        return {"msg": "Bookmark removed", "status": "removed"}
        
    b = Bookmark(
        user_id=current_user.id, 
        resource_type=req.resource_type, 
        resource_id=req.resource_id,
        subject_id=req.subject_id,
        title=req.title
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return {"msg": "Bookmark added", "status": "added", "id": b.id}

@router.delete("/{id}")
def delete_bookmark(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    b = db.query(Bookmark).filter(Bookmark.id == id, Bookmark.user_id == current_user.id).first()
    if not b: raise HTTPException(status_code=404)
    db.delete(b)
    db.commit()
    return {"msg": "Deleted"}
