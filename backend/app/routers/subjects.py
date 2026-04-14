from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.academic import Subject, Semester, SyllabusEntry
from app.schemas.academic import SubjectResponse, SemesterResponse, SubjectCreate

from app.core.deps import require_role
from app.models.user import User

router = APIRouter(prefix="/subjects", tags=["subjects"])

@router.get("/semesters", response_model=List[SemesterResponse])
def get_semesters(db: Session = Depends(get_db)):
    return db.query(Semester).all()

@router.get("/", response_model=List[SubjectResponse])
def get_subjects(semester_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Subject)
    if semester_id:
        q = q.filter(Subject.semester_id == semester_id)
    return q.all()

@router.get("/{subject_id}", response_model=SubjectResponse)
def get_subject(subject_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")
    return sub
    
@router.post("/", response_model=SubjectResponse)
def create_subject(subj_in: SubjectCreate, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    new_subj = Subject(**subj_in.dict())
    db.add(new_subj)
    db.commit()
    db.refresh(new_subj)
    return new_subj

@router.delete("/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_role(["admin"]))):
    sub = db.query(Subject).filter(Subject.id == subject_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subject not found")
    db.delete(sub)
    db.commit()
    return {"msg": "Subject deleted successfully"}
