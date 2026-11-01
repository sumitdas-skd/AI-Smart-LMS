from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class DoubtThread(Base):
    __tablename__ = "doubt_threads"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"))
    student_id = Column(Integer, ForeignKey("users.id"))
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    subject = relationship("Subject")
    student = relationship("User")
    messages = relationship("DoubtMessage", back_populates="thread", cascade="all, delete-orphan")


class DoubtMessage(Base):
    __tablename__ = "doubt_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("doubt_threads.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    message_type = Column(String) # 'text', 'voice', 'image', 'document'
    content = Column(Text, nullable=True) # Text content or caption
    file_url = Column(String, nullable=True) # URL for voice, image, or document
    file_name = Column(String, nullable=True) # Original file name if document
    is_pinned = Column(Boolean, default=False)
    is_helpful = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    thread = relationship("DoubtThread", back_populates="messages")
    sender = relationship("User")
