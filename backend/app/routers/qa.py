from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.content import QARepository
from app.schemas.content import QACreate, QAResponse
from app.core.deps import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/qa", tags=["qa"])

@router.get("/", response_model=List[QAResponse])
def get_qas(subject_id: int = None, semester_id: int = None, db: Session = Depends(get_db)):
    q = db.query(QARepository)
    if subject_id: q = q.filter(QARepository.subject_id == subject_id)
    if semester_id: q = q.filter(QARepository.semester_id == semester_id)
    return q.all()

@router.get("/{qa_id}", response_model=QAResponse)
def get_qa(qa_id: int, db: Session = Depends(get_db)):
    qa = db.query(QARepository).filter(QARepository.id == qa_id).first()
    if not qa: raise HTTPException(status_code=404, detail="QA not found")
    return qa

@router.post("/", response_model=QAResponse)
def create_qa(
    item: QACreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    new_qa = QARepository(**item.dict(), created_by=current_user.id)
    db.add(new_qa)
    db.commit()
    db.refresh(new_qa)
    return new_qa

@router.delete("/{qa_id}")
def delete_qa(
    qa_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    qa = db.query(QARepository).filter(QARepository.id == qa_id).first()
    if not qa: raise HTTPException(status_code=404, detail="QA not found")
    if current_user.role != "admin" and qa.created_by != current_user.id:
        raise HTTPException(status_code=403)
    db.delete(qa)
    db.commit()
    return {"msg": "Deleted successfully"}
