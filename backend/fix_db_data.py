import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.database import SessionLocal
from app.models.academic import Subject, SyllabusEntry
from app.models.content import Note, QARepository, PreviousQuestion, Video
from app.models.user import User

def fix_db_data():
    db = SessionLocal()
    
    # 1. Delete all existing records to ensure a perfectly clean slate for units and materials
    print("Clearing old Syllabus and Material entries...")
    db.query(Note).delete()
    db.query(Video).delete()
    db.query(QARepository).delete()
    db.query(PreviousQuestion).delete()
    db.query(SyllabusEntry).delete()
    db.commit()

    # Get standard user id
    default_user = db.query(User).first()
    user_id = default_user.id if default_user else None

    subjects = db.query(Subject).all()
    print(f"Starting seed for {len(subjects)} subjects...")

    counts = {"units": 0, "notes": 0, "videos": 0, "qa": 0, "pyqs": 0}

    # Dummy PDF link that actually works in browser instead of returning 404
    DUMMY_PDF = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"

    for subject in subjects:
        # Generate exactly 5 units per subject
        units_data = [
            {"num": 1, "t": "Introduction", "d": "Basic concepts and foundational overview."},
            {"num": 2, "t": "Core Principles", "d": "Key theorems and theoretical concepts."},
            {"num": 3, "t": "Advanced Topics", "d": "Complex mechanisms and deeper insights."},
            {"num": 4, "t": "Practical Implementations", "d": "Real-world cases and workflows."},
            {"num": 5, "t": "Trends and Conclusions", "d": "Modern research and final summary."}
        ]

        # PYQs per subject
        for year in [2022, 2023, 2024]:
            for exam in ["midsem", "endsem"]:
                pyq = PreviousQuestion(
                    title=f"{year} {exam.capitalize()} Paper - {subject.name}",
                    year=year,
                    exam_type=exam,
                    subject_id=subject.id,
                    semester_id=subject.semester_id,
                    file_path=None,
                    external_link=DUMMY_PDF,
                    source_url="https://www.bput.ac.in/exam-papers"
                )
                db.add(pyq)
                counts["pyqs"] += 1

        for u in units_data:
            unit_title = f"{u['t']} to {subject.name}"
            # Add Syllabus Entry
            entry = SyllabusEntry(
                subject_id=subject.id,
                title=unit_title,
                description=u['d'],
                unit_number=u['num'],
                created_by=user_id
            )
            db.add(entry)
            counts["units"] += 1
            
            topic_str = f"Unit {u['num']}: {unit_title}"
            
            # Notes per unit using DUMMY_PDF
            note = Note(
                title=f"Comprehensive Notes: {topic_str}",
                description=f"Detailed study material for {unit_title}.",
                file_path=None,
                external_link=DUMMY_PDF,
                subject_id=subject.id,
                semester_id=subject.semester_id,
                tags=topic_str,
                uploaded_by=user_id,
                source_type="imported"
            )
            db.add(note)
            counts["notes"] += 1

            # Videos per unit
            video = Video(
                title=f"Lecture: {topic_str}",
                description=f"In-depth video lecture explaining {unit_title}.",
                subject_id=subject.id,
                semester_id=subject.semester_id,
                topic=topic_str,
                youtube_url="https://www.youtube.com/embed/dQw4w9WgXcQ", 
                thumbnail_url="https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
                source="auto",
                uploaded_by=user_id
            )
            db.add(video)
            counts["videos"] += 1

            # Q&A pairs per unit (2 pairs)
            qa1 = QARepository(
                subject_id=subject.id,
                semester_id=subject.semester_id,
                topic=topic_str,
                question=f"What are the fundamental concepts defined in {unit_title}?",
                answer=f"The fundamental concepts involve standard theories and practical applications that bridge {subject.name} principles to real-world architectures.",
                difficulty="easy",
                tags=topic_str,
                created_by=user_id,
                source="AI"
            )
            qa2 = QARepository(
                subject_id=subject.id,
                semester_id=subject.semester_id,
                topic=topic_str,
                question=f"Explain a complex scenario involving {unit_title} in a practical system.",
                answer=f"Typically, a complex scenario integrates robust design metrics alongside scalable principles optimized for memory efficiency.",
                difficulty="hard",
                tags=topic_str,
                created_by=user_id,
                source="AI"
            )
            db.add_all([qa1, qa2])
            counts["qa"] += 2
        
        # Commit per subject
        db.commit()

    print("Re-Seeding completed successfully!")
    print(f"Total Added -> Units: {counts['units']}, Notes: {counts['notes']}, Videos: {counts['videos']}, Q&A: {counts['qa']}, PYQs: {counts['pyqs']}")
    db.close()

if __name__ == "__main__":
    fix_db_data()
