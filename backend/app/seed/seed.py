import os
import sys

# Ensure backend root is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.academic import Semester, Subject, SyllabusEntry
from app.models.content import Note, QARepository, Video, PreviousQuestion, Announcement
from app.models.chat import ChatRoom, ChatMessage

def seed_db():
    print("Generating tables if not exists...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if db.query(User).filter(User.email == "admin@abit.edu").first():
            print("Database already seeded. Exiting.")
            return

        print("Seeding Users...")
        admin = User(full_name="Admin User", email="admin@abit.edu", hashed_password=get_password_hash("admin123"), role="admin")
        teacher = User(full_name="Dr. Smith", email="teacher@abit.edu", hashed_password=get_password_hash("teacher123"), role="teacher")
        student = User(full_name="John Doe", email="student@abit.edu", hashed_password=get_password_hash("student123"), role="student")
        
        db.add_all([admin, teacher, student])
        db.commit()

        print("Seeding Semesters...")
        semesters = [Semester(number=i, name=f"Semester {i}") for i in range(1, 9)]
        db.add_all(semesters)
        db.commit()

        print("Seeding Subjects by Semester...")
        subject_data = {
            1: [("Engineering Mathematics I", "MA101"), ("Physics", "PH101"), ("Basic Electrical Engineering", "EE101")],
            2: [("Engineering Mathematics II", "MA102"), ("C Programming", "CS101"), ("Engineering Drawing", "ME101")],
            3: [("Data Structures", "CS301"), ("Digital Electronics", "EC301"), ("Discrete Mathematics", "MA301")],
            4: [("DBMS", "CS401"), ("Computer Organization", "CS402"), ("Design & Analysis of Algorithms", "CS403"), ("OOP with Java", "CS404")],
            5: [("Operating Systems", "CS501"), ("Computer Networks", "CS502"), ("Theory of Computation", "CS503")],
            6: [("Compiler Design", "CS601"), ("Software Engineering", "CS602"), ("Web Technologies", "CS603")],
            7: [("Artificial Intelligence", "CS701"), ("Machine Learning", "CS702"), ("Cloud Computing", "CS703")],
            8: [("Project", "CS801"), ("Electives", "CS802")]
        }

        all_subjects = []
        for sem_idx, subjects in subject_data.items():
            sem_id = semesters[sem_idx-1].id
            for name, code in subjects:
                s = Subject(name=name, code=code, description=f"{name} overview.", semester_id=sem_id)
                db.add(s)
                all_subjects.append(s)
        db.commit()

        print("Seeding Study Materials & Rooms (Subset)...")
        # Just populate the first 5 subjects for seed speed
        for s in all_subjects[:5]:
            # Syllabus
            db.add(SyllabusEntry(subject_id=s.id, title="Unit 1 Basics", description="Intro unit", unit_number=1, created_by=admin.id))
            
            # Notes
            db.add(Note(subject_id=s.id, semester_id=s.semester_id, title=f"Intro to {s.name}", description="Chapter 1 notes.", uploaded_by=teacher.id, source_type="manual"))
            db.add(Note(subject_id=s.id, semester_id=s.semester_id, title=f"Advanced {s.name}", description="Chapter 2 notes.", uploaded_by=teacher.id, source_type="manual"))
            
            # QA
            db.add(QARepository(subject_id=s.id, semester_id=s.semester_id, topic="Basics", question="What is the core concept?", answer="It's abstract.", difficulty="easy", created_by=teacher.id, source="manual"))
            db.add(QARepository(subject_id=s.id, semester_id=s.semester_id, topic="Intermediate", question="How does it scale?", answer="Using clusters.", difficulty="medium", created_by=teacher.id, source="manual"))

            # PYQ
            db.add(PreviousQuestion(subject_id=s.id, semester_id=s.semester_id, title=f"2023 Endsem {s.name}", year=2023, exam_type="endsem"))

            # Video
            db.add(Video(subject_id=s.id, semester_id=s.semester_id, title=f"Lecture 1: {s.name}", youtube_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ", thumbnail_url="https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg", source="manual", uploaded_by=teacher.id))

            # Chat Room
            room = ChatRoom(subject_id=s.id)
            db.add(room)
            db.commit() # commit room to get ID

            # Chat Message
            db.add(ChatMessage(room_id=room.id, sender_id=teacher.id, message_type="text", content=f"Welcome to the {s.name} discussion room!"))

        print("Seeding Announcements...")
        db.add(Announcement(title="Welcome to AI Smart LMS", content="Platform is officially live for ABIT CS students.", created_by=admin.id))
        
        db.commit()
        print("Done Core Seeding!")

    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
