from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Semester(Base):
    __tablename__ = "semesters"
    id = Column(Integer, primary_key=True, index=True)
    number = Column(Integer, unique=True, index=True) # 1-8
    name = Column(String) # e.g., "Semester 1"
    
    subjects = relationship("Subject", back_populates="semester")

class Subject(Base):
    __tablename__ = "subjects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    code = Column(String, unique=True, index=True)
    description = Column(Text, nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    semester = relationship("Semester", back_populates="subjects")
    syllabus = relationship("SyllabusEntry", back_populates="subject")
    notes = relationship("Note", back_populates="subject")
    qa = relationship("QARepository", back_populates="subject")
    videos = relationship("Video", back_populates="subject")
    pyqs = relationship("PreviousQuestion", back_populates="subject")

class SyllabusEntry(Base):
    __tablename__ = "syllabus_entries"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    title = Column(String)
    description = Column(Text)
    unit_number = Column(Integer)
    source_url = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    subject = relationship("Subject", back_populates="syllabus")
