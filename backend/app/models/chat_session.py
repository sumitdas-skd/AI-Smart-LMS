from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AIChatSession(Base):
    __tablename__ = "ai_chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_archived = Column(Boolean, default=False, nullable=False, index=True)
    pinned = Column(Boolean, default=False, nullable=False, index=True)

    messages = relationship(
        "AIChatMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="AIChatMessage.created_at.asc()"
    )
    user = relationship("User", backref="ai_chat_sessions")


class AIChatMessage(Base):
    __tablename__ = "ai_chat_messages"
    __table_args__ = (
        Index("ix_ai_chat_messages_session_created", "session_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("ai_chat_sessions.id", ondelete="CASCADE"), index=True, nullable=False)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    provider_model = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("AIChatSession", back_populates="messages")

# Backward-compat aliases
ChatSession = AIChatSession
ChatMessage_AI = AIChatMessage
