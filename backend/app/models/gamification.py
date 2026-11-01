from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class XPEvent(Base):
    __tablename__ = "xp_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    event_type = Column(String(50), index=True, nullable=False) # login, note_view, doubt_ask, doubt_reply, ai_summarize, quiz_complete
    xp = Column(Integer, nullable=False)
    ref_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", backref="xp_events")

