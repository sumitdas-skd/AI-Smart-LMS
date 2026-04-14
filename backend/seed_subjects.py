import os
import sys

# Add the parent directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.database import SessionLocal, engine
from app.models.academic import Semester, Subject
from app.database import Base

import app.models.user
import app.models.content
import app.models.chat
import app.models.import_
import app.models.class_chat

def generate_code(name, sem_num):
    # Generates a pseudo course code like CS301
    parts = name.replace("-", " ").replace("&", " ").replace("/", " ").replace("(", "").replace(")", "").split()
    abbr = "".join([p[0].upper() for p in parts if p.isalpha() and len(p) > 2])
    if not abbr:
        abbr = name[:3].upper()
    # just hash it with sem_num to keep it somewhat unique
    return f"SUB{sem_num}{abs(hash(name)) % 1000:03d}"

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    data = [
        {
            "num": 1,
            "name": "Semester 1",
            "subjects": [
                "Mathematics-I", "Physics", "Basic Electrical Engineering", "Mechanics", "Communicative English",
                "Engineering Drawing", "Physics Laboratory", "Business Communication Lab"
            ]
        },
        {
            "num": 2,
            "name": "Semester 2",
            "subjects": [
                "Mathematics-II", "Chemistry", "Basic Electronics", "Thermodynamics",
                "Workshop Practice", "Chemistry Laboratory", "'C' Programming Laboratory"
            ]
        },
        {
            "num": 3,
            "name": "Semester 3",
            "subjects": [
                "Mathematics - III (Probability & Statistics)", "Object Oriented Programming Using Java", "Data Structures", 
                "Digital Logic Design", "Environmental Science", "Organization Behaviour", "Engineering Economics",
                "Digital Logic Design Lab", "Data Structure Lab", "OOP Using JAVA Lab", "Internship - I"
            ]
        },
        {
            "num": 4,
            "name": "Semester 4",
            "subjects": [
                "Mathematics - IV (Discrete Mathematics)", "Operating Systems", "Computer Organization & Architecture", 
                "Design & Analysis of Algorithms", "Theory of Computation", "Formal Language and Automata Theory",
                "Operating System Lab", "Algorithms Lab", "Digital Systems Design Lab"
            ]
        },
        {
            "num": 5,
            "name": "Semester 5",
            "subjects": [
                "Database Management Systems", "Computer Networks", "Software Engineering", 
                "Artificial Intelligence", "Machine Learning", "Program Elective-I",
                "DBMS Lab", "Computer Network Lab", "Software Engineering Lab", "Skill Project"
            ]
        },
        {
            "num": 6,
            "name": "Semester 6",
            "subjects": [
                "Compiler Design", "Internet of Things (IoT)", "Data Mining & Data Warehousing", 
                "Professional Elective-II", "Open Elective-I",
                "Compiler Design Lab", "IoT Lab", "Industrial Training / Mini Project"
            ]
        },
        {
            "num": 7,
            "name": "Semester 7",
            "subjects": [
                "Computer Security / Cyber Security", "Big Data Analytics", "Professional Elective-III", "Professional Elective-IV", "Open Elective-II",
                "Project / Thesis", "Summer Internship Assessment"
            ]
        },
        {
            "num": 8,
            "name": "Semester 8",
            "subjects": [
                "Professional Elective-V", "Professional Elective-VI", "Open Elective-III",
                "Major Project", "Seminar", "Comprehensive Viva-Voce"
            ]
        }
    ]

    for sem_data in data:
        semester = db.query(Semester).filter_by(number=sem_data["num"]).first()
        if not semester:
            semester = Semester(number=sem_data["num"], name=sem_data["name"])
            db.add(semester)
            db.commit()
            db.refresh(semester)
        
        for sub_name in sem_data["subjects"]:
            code = generate_code(sub_name, sem_data["num"])
            # check if exists
            existing_sub = db.query(Subject).filter_by(name=sub_name, semester_id=semester.id).first()
            if not existing_sub:
                sub = Subject(
                    name=sub_name,
                    code=code,
                    description=f"Course content for {sub_name}",
                    semester_id=semester.id
                )
                db.add(sub)
    
    db.commit()
    print("Seeding completed successfully!")
    db.close()

if __name__ == "__main__":
    seed()
