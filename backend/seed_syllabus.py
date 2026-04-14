import os
import sys

# Add the parent directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.database import SessionLocal, engine
from app.models.academic import Subject, SyllabusEntry
from app.models.user import User

import app.models.content
import app.models.chat
import app.models.import_
import app.models.class_chat

def seed_modules():
    db = SessionLocal()
    
    # Get a default user to attribute creation to (or None if not strictly required)
    default_user = db.query(User).first()
    user_id = default_user.id if default_user else None
    
    subjects = db.query(Subject).all()
    print(f"Found {len(subjects)} subjects. Generating syllabus modules...")
    
    modules_added = 0
    
    for subject in subjects:
        # Check if subject already has syllabus entries
        existing = db.query(SyllabusEntry).filter_by(subject_id=subject.id).count()
        if existing > 0:
            continue
            
        units_data = [
            {
                "unit": 1,
                "title": f"Introduction to {subject.name}",
                "desc": f"Basic concepts, context, history, and fundamental overview of {subject.name}."
            },
            {
                "unit": 2,
                "title": f"Core Principles and Theories",
                "desc": f"In-depth analysis, key theorems, terminology, and foundational principles required to master {subject.name}."
            },
            {
                "unit": 3,
                "title": f"Advanced Concepts",
                "desc": f"Complex problem solving, advanced architectures, methodologies, and deeper technical insights."
            },
            {
                "unit": 4,
                "title": f"Practical Implementations",
                "desc": f"Real-world applications, case studies, hands-on practice, and integration in standard workflows."
            },
            {
                "unit": 5,
                "title": f"Trends and Conclusions",
                "desc": f"Modern advancements, recent research, industry standards, and concluding context for {subject.name}."
            }
        ]
        
        for data in units_data:
            entry = SyllabusEntry(
                subject_id=subject.id,
                title=data["title"],
                description=data["desc"],
                unit_number=data["unit"],
                created_by=user_id
            )
            db.add(entry)
            modules_added += 1
            
        # Commit per subject to ensure atomic saves
        db.commit()
        
    print(f"Successfully added {modules_added} syllabus modules/units across {len(subjects)} subjects.")
    db.close()

if __name__ == "__main__":
    seed_modules()
