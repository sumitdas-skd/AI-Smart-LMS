from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any

from app.database import get_db
from app.models.user import User
from app.models.content import Video, Note, QARepository, PreviousQuestion
from app.schemas.user import UserResponse
from app.core.deps import require_role
from pydantic import BaseModel

class UserRoleUpdate(BaseModel):
    role: str
    is_active: bool

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    total_users = db.query(User).count()
    teachers = db.query(User).filter(User.role == "teacher").count()
    students = db.query(User).filter(User.role == "student").count()
    
    total_videos = db.query(Video).count()
    total_notes = db.query(Note).count()
    total_qa = db.query(QARepository).count()
    total_pyq = db.query(PreviousQuestion).count()
    
    return {
        "users": {
            "total": total_users,
            "teachers": teachers,
            "students": students,
        },
        "content": {
            "videos": total_videos,
            "notes": total_notes,
            "qa": total_qa,
            "pyqs": total_pyq
        }
    }

@router.get("/users", response_model=List[UserResponse])
def get_users(db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    return db.query(User).all()

@router.put("/users/{target_id}")
def update_user(
    target_id: int, 
    update_data: UserRoleUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["admin"]))
):
    tgt = db.query(User).filter(User.id == target_id).first()
    if not tgt: raise HTTPException(status_code=404, detail="User not found")
    tgt.role = update_data.role
    tgt.is_active = update_data.is_active
    db.commit()
    return {"msg": "Updated successfully"}

@router.delete("/users/{target_id}")
def delete_user(
    target_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["admin"]))
):
    if target_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
    tgt = db.query(User).filter(User.id == target_id).first()
    if not tgt: raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(tgt)
    db.commit()
    return {"msg": "User deleted successfully"}

@router.get("/content/{content_type}")
def list_content(
    content_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    if content_type == "videos":
        return db.query(Video).all()
    elif content_type == "notes":
        return db.query(Note).all()
    elif content_type == "qa":
        return db.query(QARepository).all()
    elif content_type == "pyqs":
        return db.query(PreviousQuestion).all()
    else:
        raise HTTPException(status_code=400, detail="Invalid content type")

@router.delete("/content/{content_type}/{content_id}")
def delete_content(
    content_type: str,
    content_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin"]))
):
    model = None
    if content_type == "videos": model = Video
    elif content_type == "notes": model = Note
    elif content_type == "qa": model = QARepository
    elif content_type == "pyqs": model = PreviousQuestion
    
    if not model:
        raise HTTPException(status_code=400, detail="Invalid content type")
        
    item = db.query(model).filter(model.id == content_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Content not found")
        
    db.delete(item)
    db.commit()
    return {"msg": f"{content_type} deleted successfully"}
