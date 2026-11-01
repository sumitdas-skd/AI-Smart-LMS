from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Result(Base):
    __tablename__ = "results"
    __table_args__ = (
        UniqueConstraint("user_id", "subject_id", "semester", name="uq_user_subject_semester"),
        CheckConstraint("midsem_marks >= 0 AND midsem_marks <= 100", name="chk_result_midsem"),
        CheckConstraint("endsem_marks >= 0 AND endsem_marks <= 100", name="chk_result_endsem"),
        CheckConstraint("assignment_marks >= 0 AND assignment_marks <= 100", name="chk_result_assignment"),
        CheckConstraint("total >= 0 AND total <= 100", name="chk_result_total"),
        CheckConstraint("grade_point >= 0 AND grade_point <= 10", name="chk_result_grade_point"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), index=True, nullable=False)
    semester = Column(Integer, index=True, nullable=False)

    midsem_marks = Column(Float, default=0.0, nullable=False)
    endsem_marks = Column(Float, default=0.0, nullable=False)
    assignment_marks = Column(Float, default=0.0, nullable=False)
    total = Column(Float, default=0.0, nullable=False)
    grade = Column(String(5), nullable=False) # O, E, A, B, C, D, F
    grade_point = Column(Float, default=0.0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="results")
    subject = relationship("Subject")


class SemesterResult(Base):
    __tablename__ = "semester_results"
    __table_args__ = (
        UniqueConstraint("user_id", "semester", name="uq_user_semester_result"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    semester = Column(Integer, index=True, nullable=False)
    sgpa = Column(Float, default=0.0, nullable=False)
    credits_earned = Column(Integer, default=0, nullable=False)
    total_credits = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", backref="semester_results")

