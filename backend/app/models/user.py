from sqlalchemy import Column, Integer, String, Boolean, DateTime, Date
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    roll_number = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="student", nullable=False) # admin, teacher, student
    is_active = Column(Boolean, default=True)
    
    # Gamification & Streaks (Module 4)
    study_streak_count = Column(Integer, default=0, nullable=False)
    last_active_date = Column(Date, nullable=True)
    xp_points = Column(Integer, default=0, nullable=False)
    badge_level = Column(String, default="Bronze", nullable=False) # Bronze, Silver, Gold, Platinum, Diamond
    
    # Tracking for Unread Notices (Module 2)
    last_notices_viewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Tracking for Unread Jobs (Job Query Module)
    last_jobs_viewed_at = Column(DateTime(timezone=True), nullable=True)
    
    reset_token = Column(String, nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
