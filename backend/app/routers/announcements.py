from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.content import Announcement
from app.core.deps import require_role
from app.models.user import User

class AnnouncementBase(BaseModel):
    title: str
    content: str
    
class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementResponse(AnnouncementBase):
    id: int
    created_by: int
    created_at: datetime
    class Config: from_attributes = True

router = APIRouter(prefix="/announcements", tags=["announcements"])

@router.get("/", response_model=List[AnnouncementResponse])
def get_announcements(db: Session = Depends(get_db)):
    return db.query(Announcement).order_by(Announcement.created_at.desc()).limit(10).all()

@router.post("/", response_model=AnnouncementResponse)
def create_announcement(
    item: AnnouncementCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    a = Announcement(title=item.title, content=item.content, created_by=current_user.id)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a

@router.delete("/{a_id}")
def delete_announcement(a_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    a = db.query(Announcement).filter(Announcement.id == a_id).first()
    if not a: raise HTTPException(status_code=404)
    db.delete(a)
    db.commit()
    return {"msg": "Deleted"}
