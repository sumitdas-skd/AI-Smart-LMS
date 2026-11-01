from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.content import PreviousQuestion
from app.schemas.content import PYQCreate, PYQResponse
from app.core.deps import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/pyq", tags=["pyq"])

@router.get("/", response_model=List[PYQResponse])
def get_pyqs(subject_id: int = None, semester_id: int = None, db: Session = Depends(get_db)):
    q = db.query(PreviousQuestion)
    if subject_id: q = q.filter(PreviousQuestion.subject_id == subject_id)
    if semester_id: q = q.filter(PreviousQuestion.semester_id == semester_id)
    return q.all()

@router.post("/", response_model=PYQResponse)
def create_pyq(
    item: PYQCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    new_pyq = PreviousQuestion(**item.dict())
    db.add(new_pyq)
    db.commit()
    db.refresh(new_pyq)
    return new_pyq

@router.delete("/{pyq_id}")
def delete_pyq(
    pyq_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    pyq = db.query(PreviousQuestion).filter(PreviousQuestion.id == pyq_id).first()
    if not pyq: raise HTTPException(status_code=404, detail="PYQ not found")
    db.delete(pyq)
    db.commit()
    return {"msg": "Deleted successfully"}
