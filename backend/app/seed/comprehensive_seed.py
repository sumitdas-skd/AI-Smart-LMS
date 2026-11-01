import os
import sys
import json
import random

# Ensure backend root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.academic import Semester, Subject, SyllabusEntry
from app.models.content import Note, QARepository, Video, PreviousQuestion
from app.core.security import get_password_hash

def generate_paper_content(subject_name, year):
    # Section A: 10 Questions @ 2 Marks Each
    section_a = {
        "questions": [
            {"question": f"Define the fundamental principle of {subject_name} in relation to modern engineering.", "marks": 2},
            {"question": f"What is the significance of the first law applied to {subject_name}?", "marks": 2},
            {"question": f"List any two applications of {subject_name} in industry.", "marks": 2},
            {"question": f"Differentiate between theoretical and practical models in {subject_name}.", "marks": 2},
            {"question": f"What are the standard units used for measuring impact in {subject_name}?", "marks": 2},
            {"question": f"State the core theorem discussed in Unit 2 of {subject_name}.", "marks": 2},
            {"question": f"Briefly explain the convergence criteria for {subject_name} algorithms.", "marks": 2},
            {"question": f"What is the role of sensors in monitoring {subject_name} parameters?", "marks": 2},
            {"question": f"Name the primary scientist who contributed to {subject_name} evolution.", "marks": 2},
            {"question": f"Define the boundary conditions for a standard {subject_name} problem.", "marks": 2}
        ]
    }

    # Section B: 5 Questions @ 10 Marks Each (Attempt 3)
    section_b = {
        "questions": [
            {"question": f"Explicate the detailed architecture of {subject_name} systems with a neat diagram and flow chart.", "marks": 10},
            {"question": f"Discuss the socio-economic impacts of implementing {subject_name} at a global scale.", "marks": 10},
            {"question": f"Compare and contrast the three major methodologies used in {subject_name} during the last decade.", "marks": 10},
            {"question": f"Provide a comprehensive derivation for the fundamental equation of {subject_name}.", "marks": 10},
            {"question": f"Evaluate the performance bottlenecks and optimization strategies for {subject_name} infrastructures.", "marks": 10}
        ]
    }

    # Section C: 3 Questions @ 25 Marks Each (Attempt 2)
    section_c = {
        "questions": [
            {
                "partA": {"question": f"Investigate the role of AI and ML in revolutionizing {subject_name} datasets.", "marks": 15},
                "partB": {"question": f"Predict the future trends for {subject_name} for the next 50 years.", "marks": 10}
            },
            {
                "partA": {"question": f"Design a hypothetical project that utilizes all core concepts of {subject_name}.", "marks": 15},
                "partB": {"question": f"Critically analyze the ethical dilemmas associated with {subject_name}.", "marks": 10}
            },
            {
                "partA": {"question": f"Perform a cost-benefit analysis of 5 different {subject_name} technologies.", "marks": 15},
                "partB": {"question": f"Suggest a roadmap for researchers starting in the field of {subject_name}.", "marks": 10}
            }
        ]
    }

    return json.dumps({
        "university": "BIJU PATNAIK UNIVERSITY OF TECHNOLOGY (BPUT), ODISHA",
        "course": "Bachelor of Technology (B.Tech) Examination",
        "sectionA": section_a,
        "sectionB": section_b,
        "sectionC": section_c
    })

def seed():
    db = SessionLocal()
    try:
        # Get Admin and Teacher users
        admin = db.query(User).filter(User.role == "admin").first()
        if not admin:
            admin = User(full_name="Admin", email="admin@abit.edu", hashed_password=get_password_hash("admin123"), role="admin")
            db.add(admin)
            db.commit()

        teacher = db.query(User).filter(User.role == "teacher").first()
        if not teacher:
            teacher = User(full_name="Teacher", email="teacher@abit.edu", hashed_password=get_password_hash("teacher123"), role="teacher")
            db.add(teacher)
            db.commit()

        subjects = db.query(Subject).all()
        print(f"Backfilling {len(subjects)} subjects with deep content...")

        # Base upload dir
        upload_dir = "uploads/notes"
        if not os.path.exists(upload_dir): os.makedirs(upload_dir)

        # Create a dummy pdf file for all notes to use (physically separate files per unit)
        dummy_content = b"%PDF-1.4\n%EOF"

        for s in subjects:
            print(f" Processing: {s.name}")
            
            # 1. Clear existing QAs if they are few
            if db.query(QARepository).filter(QARepository.subject_id == s.id).count() < 10:
                # Add 25+ questions
                for i in range(1, 26):
                    unit_num = (i // 5) + 1
                    difficulty = random.choice(["easy", "medium", "hard"])
                    tag = "important" if i % 4 == 0 else "regular"
                    db.add(QARepository(
                        subject_id=s.id,
                        semester_id=s.semester_id,
                        topic=f"Topic {i} in Unit {unit_num}",
                        question=f"Important Question #{i}: Discuss the core significance of {s.name} concepts in context of modern engineering standards?",
                        answer=f"The answer to question {i} involves a multi-layered understanding of {s.name}. Firstly, one must consider the theoretical framework, followed by the practical application in real-world scenarios. This ensures that the system is both robust and scalable for future needs.",
                        difficulty=difficulty,
                        tags=tag,
                        created_by=teacher.id,
                        source="AI-Generated",
                        marks=random.choice([2, 5, 10]),
                        unit_number=unit_num
                    ))

            # 2. Add Section A/B/C Papers
            if db.query(PreviousQuestion).filter(PreviousQuestion.subject_id == s.id).count() < 2:
                for year in [2023, 2024]:
                    db.add(PreviousQuestion(
                        subject_id=s.id,
                        semester_id=s.semester_id,
                        title=f"{year} BPUT End Semester - Full Paper",
                        year=year,
                        exam_type="endsem",
                        content=generate_paper_content(s.name, year)
                    ))

            # 3. Add separate Unit Notes
            if db.query(Note).filter(Note.subject_id == s.id).count() < 5:
                subj_folder = os.path.join(upload_dir, s.code.lower())
                if not os.path.exists(subj_folder): os.makedirs(subj_folder)
                
                for unit in range(1, 6):
                    file_name = f"unit-{unit}-notes.pdf"
                    file_path = f"/uploads/notes/{s.code.lower()}/{file_name}"
                    
                    # Create the actual file
                    abs_path = os.path.join(subj_folder, file_name)
                    with open(abs_path, "wb") as f:
                        f.write(dummy_content)
                    
                    db.add(Note(
                        subject_id=s.id,
                        semester_id=s.semester_id,
                        title=f"Unit {unit} - Comprehensive Study Notes",
                        description=f"Detailed theoretical and numerical explanation of Unit {unit} topics for {s.name}.",
                        file_path=file_path,
                        uploaded_by=teacher.id,
                        source_type="manual"
                    ))

            db.commit()

        print("SUCCESS: Database power-seeded with deep content for all subjects.")

    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
