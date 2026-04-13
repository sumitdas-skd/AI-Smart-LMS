from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.content import Note
from app.schemas.content import NoteCreate, NoteResponse
from app.core.deps import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/notes", tags=["notes"])

@router.get("/", response_model=List[NoteResponse])
def get_notes(subject_id: int = None, semester_id: int = None, db: Session = Depends(get_db)):
    q = db.query(Note)
    if subject_id: q = q.filter(Note.subject_id == subject_id)
    if semester_id: q = q.filter(Note.semester_id == semester_id)
    return q.all()

@router.get("/{note_id}", response_model=NoteResponse)
def get_note(note_id: int, db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note: raise HTTPException(status_code=404, detail="Note not found")
    return note

@router.post("/", response_model=NoteResponse)
def create_note(
    item: NoteCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    new_note = Note(**item.dict(), uploaded_by=current_user.id)
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.delete("/{note_id}")
def delete_note(
    note_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["teacher", "admin"]))
):
    note = db.query(Note).filter(Note.id == note_id).first()
    if not note: raise HTTPException(status_code=404, detail="Note not found")
    # Simplistic auth check: teachers can only delete their own unless admin
    if current_user.role != "admin" and note.uploaded_by != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this note")
    
    db.delete(note)
    db.commit()
    return {"msg": "Deleted successfully"}
