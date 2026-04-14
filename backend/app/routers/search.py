from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.academic import Subject
from app.models.content import Note, QARepository, Video, PreviousQuestion
from typing import List

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/")
def global_search(q: str, subject_id: int = None, db: Session = Depends(get_db)):
    if not q:
        return []

    results = []
    
    # helper for filtering
    def apply_filters(query_obj, model):
        if subject_id:
            return query_obj.filter(model.subject_id == subject_id)
        return query_obj
        
    s_query = f"%{q}%"

    # Search Subjects
    subjects = db.query(Subject).filter(
        or_(Subject.name.ilike(s_query), Subject.code.ilike(s_query))
    ).all()
    for s in subjects:
        if not subject_id or s.id == subject_id:
            results.append({"type": "subject", "id": s.id, "title": s.name, "description": s.description})

    # Search Notes
    notes = apply_filters(db.query(Note).filter(
        or_(Note.title.ilike(s_query), Note.description.ilike(s_query))
    ), Note).all()
    for n in notes:
        results.append({"type": "note", "id": n.id, "title": n.title, "description": n.description, "subject_id": n.subject_id})
        
    # Search QA
    qas = apply_filters(db.query(QARepository).filter(
        or_(QARepository.question.ilike(s_query), QARepository.topic.ilike(s_query))
    ), QARepository).all()
    for qa in qas:
        results.append({"type": "qa", "id": qa.id, "title": qa.question, "description": qa.answer, "subject_id": qa.subject_id})
        
    # Search Videos
    videos = apply_filters(db.query(Video).filter(
        or_(Video.title.ilike(s_query), Video.description.ilike(s_query))
    ), Video).all()
    for v in videos:
        results.append({"type": "video", "id": v.id, "title": v.title, "description": v.description, "subject_id": v.subject_id})
        
    # Search PYQs
    pyqs = apply_filters(db.query(PreviousQuestion).filter(
        or_(PreviousQuestion.title.ilike(s_query), PreviousQuestion.exam_type.ilike(s_query))
    ), PreviousQuestion).all()
    for p in pyqs:
        results.append({"type": "pyq", "id": p.id, "title": f"{p.title} ({p.year})", "description": p.exam_type, "subject_id": p.subject_id})
        
    # Limit total size
    return results[:50]
