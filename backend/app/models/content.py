from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Note(Base):
    __tablename__ = "notes"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, nullable=True)
    file_path = Column(String, nullable=True)
    external_link = Column(String, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    tags = Column(String, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    source_type = Column(String) # manual/imported/external
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    subject = relationship("Subject", back_populates="notes")

class QARepository(Base):
    __tablename__ = "qa_repository"
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    topic = Column(String)
    question = Column(Text)
    answer = Column(Text)
    difficulty = Column(String) # easy/medium/hard
    tags = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"))
    source = Column(String) # manual/imported/AI
    marks = Column(Integer, nullable=True)
    unit_number = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    subject = relationship("Subject", back_populates="qa")

class PreviousQuestion(Base):
    __tablename__ = "previous_questions"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    year = Column(Integer)
    exam_type = Column(String) # midsem/endsem
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    file_path = Column(String, nullable=True)
    external_link = Column(String, nullable=True)
    source_url = Column(String, nullable=True)
    fetched_date = Column(DateTime(timezone=True), nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    subject = relationship("Subject", back_populates="pyqs")

class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text, nullable=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    semester_id = Column(Integer, ForeignKey("semesters.id"))
    topic = Column(String, nullable=True)
    youtube_url = Column(String, nullable=True)        # YouTube embed URL (optional)
    video_file_path = Column(String, nullable=True)    # Direct uploaded video path (optional)
    thumbnail_url = Column(String, nullable=True)
    source = Column(String) # manual/auto
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    subject = relationship("Subject", back_populates="videos")

class Announcement(Base):
    __tablename__ = "announcements"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    created_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Bookmark(Base):
    __tablename__ = "bookmarks"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    resource_type = Column(String) # note/qa/video/pyq
    resource_id = Column(Integer)
    subject_id = Column(Integer, nullable=True) # Context for direct link
    title = Column(String, nullable=True) # For UI optimization
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
class UploadedMaterial(Base):
    __tablename__ = "uploaded_materials"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    file_path = Column(String)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
