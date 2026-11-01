from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.academic import SyllabusEntry
from app.schemas.academic import SyllabusEntryCreate, SyllabusEntryResponse
from app.core.deps import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/syllabus", tags=["syllabus"])

@router.get("/", response_model=List[SyllabusEntryResponse])
def get_syllabus(subject_id: int = None, db: Session = Depends(get_db)):
    q = db.query(SyllabusEntry)
    if subject_id: q = q.filter(SyllabusEntry.subject_id == subject_id)
    # Order by unit number
    return q.order_by(SyllabusEntry.unit_number.asc()).all()

@router.post("/", response_model=SyllabusEntryResponse)
def create_syllabus(
    item: SyllabusEntryCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["admin"]))
):
    new_syl = SyllabusEntry(**item.dict(), created_by=current_user.id)
    db.add(new_syl)
    db.commit()
    db.refresh(new_syl)
    return new_syl
