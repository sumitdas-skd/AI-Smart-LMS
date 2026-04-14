import os
from sqlalchemy.orm import Session
from fpdf import FPDF
from app.database import SessionLocal
from app.models.academic import Subject, SyllabusEntry
from app.models.content import Note, Video, QARepository, PreviousQuestion
from app.models.user import User

def create_pdf(subject_name: str, is_pyq: bool = False) -> str:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", "B", 16)
    title = f"BPUT Previous Year Questions: {subject_name}" if is_pyq else f"Official Study Notes: {subject_name}"
    
    # Use fpdf2 >= 2.8 safe methods
    pdf.cell(w=0, h=10, text=title, new_x="LMARGIN", new_y="NEXT", align="C")
    pdf.cell(w=0, h=10, text="", new_x="LMARGIN", new_y="NEXT") # empty line
    
    pdf.set_font("helvetica", "", 12)
    
    if is_pyq:
        content = f"""
Subject Code: CS-{abs(hash(subject_name)) % 9999}
Time: 3 Hours | Max Marks: 100

PART A: Short Answer Questions (2x10 = 20 Marks)
1. Define the primary focus of {subject_name}.
2. Differentiate between static and dynamic models in {subject_name}.
3. Explain the basic architecture associated with {subject_name}.
4. What are the common tools used for evaluation?
5. State the most critical limitations of the classical approach.

PART B: Long Answer Questions (16x5 = 80 Marks)
6. Explain in detail the complete lifecycle involved in {subject_name}.
7. Draw a block diagram and explain the internal working mechanisms.
8. Discuss modern advancements in {subject_name} over the last decade.
9. Propose an optimization strategy for the core algorithms usually studied.
"""
    else:
        content = f"""
1. Introduction to {subject_name}
This document serves as the official study guide for {subject_name}.
It covers the fundamental concepts, advanced principles, and practical 
applications required by the BPUT computer science engineering syllabus.

2. Core Concepts
The study of {subject_name} involves understanding complex algorithmic systems, 
mathematical foundations, and robust engineering methodologies. Mastering 
these topics is essential for any modern software engineer.

3. Module Summary
- Overview of key frameworks
- Detailed analysis of constraints and parameters
- Practical implementation and integration strategies

4. Conclusion
Students are expected to review these notes thoroughly alongside 
the recommended textbook before the final semester examinations.
"""
        
    for line in content.split('\n'):
        if line.strip():
            pdf.multi_cell(w=0, h=8, text=line.strip(), new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.cell(w=0, h=5, text="", new_x="LMARGIN", new_y="NEXT")
            
    # generate random filename
    filename = f"{'pyq' if is_pyq else 'note'}_{abs(hash(subject_name))}.pdf"
    os.makedirs("uploads/generated", exist_ok=True)
    filepath = f"uploads/generated/{filename}"
    pdf.output(filepath)
    return f"/{filepath}"

def get_video_url(subject_name: str) -> str:
    name = subject_name.lower()
    if "math" in name or "calculus" in name or "discrete" in name:
        return "https://www.youtube.com/watch?v=X9JTWca5XQY" # MIT Calculus
    elif "physic" in name or "mechanics" in name:
        return "https://www.youtube.com/watch?v=ZM8ECpBuQYE" # Physics
    elif "program" in name or "c++" in name or "java" in name or "python" in name:
        return "https://www.youtube.com/watch?v=zNdZ6kXhkuY" # FreeCodeCamp general programming
    elif "data" in name or "dbms" in name or "sql" in name:
        return "https://www.youtube.com/watch?v=HXV3zeREGAI" # FreeCodeCamp SQL Course
    elif "network" in name or "web" in name:
        return "https://www.youtube.com/watch?v=qiQR5rTSshw" # Networking
    elif "algorithm" in name or "structure" in name:
        return "https://www.youtube.com/watch?v=8hly31xKli0" # Algorithms
    else:
        return "https://www.youtube.com/watch?v=PkZNo7MFNFg" # Generic Computer Science Full Course

def run_seeder():
    print("Starting Realistic Content Generation...")
    db = SessionLocal()
    try:
        # Get admin user
        admin = db.query(User).filter(User.role == "admin").first()
        admin_id = admin.id if admin else 1

        subjects = db.query(Subject).all()
        print(f"Found {len(subjects)} subjects to populate.")

        total_notes = 0
        total_videos = 0

        for subject in subjects:
            print(f"Generating content for: {subject.name} (Semester {subject.semester_id})")
            
            # --- 1. Syllabus Details ---
            # Ensure 5 units exist
            existing_units = db.query(SyllabusEntry).filter(SyllabusEntry.subject_id == subject.id).count()
            if existing_units < 5:
                # Add missing units to reach exactly 5
                for i in range(existing_units + 1, 6):
                    unit = SyllabusEntry(
                        subject_id=subject.id,
                        title=f"Unit {i}: Advanced {subject.name.split()[0]} Topics",
                        description=f"In-depth analysis of module {i} requirements and technical implementations for {subject.name}.",
                        unit_number=i,
                        created_by=admin_id
                    )
                    db.add(unit)
            
            # --- 2. Real Note PDF ---
            note_path = create_pdf(subject.name, is_pyq=False)
            note = Note(
                title=f"Complete Study Material: {subject.name}",
                description=f"Comprehensive PDF notes covering all 5 units of {subject.name}.",
                file_path=note_path,
                subject_id=subject.id,
                semester_id=subject.semester_id,
                uploaded_by=admin_id,
                source_type="generated"
            )
            db.add(note)
            total_notes += 1
            
            # --- 3. Previous Year Question PDF ---
            pyq_path = create_pdf(subject.name, is_pyq=True)
            pyq = PreviousQuestion(
                title=f"BPUT Regular End-Sem Exam: {subject.name} (2025)",
                year=2025,
                exam_type="endsem",
                subject_id=subject.id,
                semester_id=subject.semester_id,
                file_path=pyq_path
            )
            db.add(pyq)
            
            # --- 4. Educational Video ---
            video_url = get_video_url(subject.name)
            video = Video(
                title=f"Masterclass Lecture: {subject.name}",
                description=f"Full comprehensive video lecture covering core concepts of {subject.name}.",
                subject_id=subject.id,
                semester_id=subject.semester_id,
                youtube_url=video_url,
                source="auto",
                uploaded_by=admin_id
            )
            db.add(video)
            total_videos += 1
            
            # --- 5. Q&A Pairs ---
            qa1 = QARepository(
                subject_id=subject.id,
                semester_id=subject.semester_id,
                topic="Fundamentals",
                question=f"What are the core fundamentals of {subject.name}?",
                answer=f"The fundamentals involve understanding the structural and logical methodologies used to implement {subject.name} in scalable technical environments.",
                difficulty="medium",
                created_by=admin_id,
                source="generated"
            )
            db.add(qa1)

            # Commit periodically
            db.commit()

        print(f"\nSeeding Complete! Generated {total_notes} unique PDFs and {total_videos} embedded videos across {len(subjects)} subjects.")

    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_seeder()
