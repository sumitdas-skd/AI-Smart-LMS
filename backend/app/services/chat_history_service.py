import re
from datetime import datetime, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import desc, and_, or_, func
from fastapi import HTTPException, status

from app.models.chat_session import AIChatSession as ChatSession, AIChatMessage as ChatMessage
from app.models.user import User
from app.models.academic import Subject
from app.core.config import settings
from app.schemas.chat_history import (
    ChatSessionSummary,
    ChatSessionDetail,
    ChatMessageItem,
    ChatSessionUpdate
)

def generate_session_title(message_text: str) -> str:
    """Derives a clean session title from the first ~6 words of the initial prompt."""
    cleaned = re.sub(r"\s+", " ", message_text.strip())
    words = cleaned.split(" ")
    title = " ".join(words[:6])
    if len(words) > 6:
        title += "..."
    # Cap at 60 chars
    return title[:60] if title else "New AI Study Chat"

class ChatHistoryService:

    @staticmethod
    def get_or_create_session(
        db: Session,
        user_id: int,
        session_id: Optional[int] = None,
        initial_message: str = ""
    ) -> ChatSession:
        """Finds existing session for user or creates a new one with auto-generated title."""
        if session_id:
            session = db.query(ChatSession).filter(
                and_(ChatSession.id == session_id, ChatSession.user_id == user_id)
            ).first()
            if not session:
                # Privacy rule: Return 404, never 403, and never leak other users' sessions
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Chat session not found."
                )
            return session

        title = generate_session_title(initial_message)
        new_session = ChatSession(
            user_id=user_id,
            title=title,
            is_archived=False,
            pinned=False
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        return new_session

    @staticmethod
    def save_message(
        db: Session,
        session_id: int,
        role: str,
        content: str,
        provider_model: Optional[str] = None
    ) -> ChatMessage:
        """Appends a message to the session and updates the session's updated_at timestamp."""
        msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            provider_model=provider_model
        )
        db.add(msg)
        
        # Touch parent session updated_at
        session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
        if session:
            session.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(msg)
        return msg

    @staticmethod
    def get_session_context(
        db: Session,
        session_id: int,
        limit: int = 10
    ) -> List[Dict[str, str]]:
        """Returns the last N messages of a session formatted for the AI model."""
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(desc(ChatMessage.created_at)).limit(limit).all()

        # Reverse so they are in chronological order
        messages.reverse()
        return [{"role": m.role, "content": m.content} for m in messages]

    @staticmethod
    def list_sessions(
        db: Session,
        user_id: int,
        q: Optional[str] = None,
        include_archived: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> List[ChatSessionSummary]:
        """Lists user's sessions with search, pinned first, then updated_at desc."""
        limit = min(max(1, limit), 100)
        query = db.query(ChatSession).filter(ChatSession.user_id == user_id)

        if not include_archived:
            query = query.filter(ChatSession.is_archived == False)

        if q:
            search_pattern = f"%{q.strip()}%"
            query = query.filter(ChatSession.title.ilike(search_pattern))

        sessions = query.order_by(
            desc(ChatSession.pinned),
            desc(ChatSession.updated_at)
        ).offset(offset).limit(limit).all()

        summaries = []
        for s in sessions:
            # Count messages
            count = db.query(func.count(ChatMessage.id)).filter(ChatMessage.session_id == s.id).scalar() or 0
            # Fetch last message
            last_msg = db.query(ChatMessage).filter(
                ChatMessage.session_id == s.id
            ).order_by(desc(ChatMessage.created_at)).first()
            
            preview = None
            if last_msg:
                preview = (last_msg.content[:80] + "...") if len(last_msg.content) > 80 else last_msg.content

            summaries.append(ChatSessionSummary(
                id=s.id,
                user_id=s.user_id,
                title=s.title,
                created_at=s.created_at,
                updated_at=s.updated_at,
                is_archived=s.is_archived,
                pinned=s.pinned,
                message_count=count,
                last_message_preview=preview
            ))
        return summaries

    @staticmethod
    def get_session_detail(
        db: Session,
        user_id: int,
        session_id: int
    ) -> ChatSessionDetail:
        """Retrieves session with all messages. Strict 404 for unowned sessions."""
        session = db.query(ChatSession).options(
            selectinload(ChatSession.messages)
        ).filter(
            and_(ChatSession.id == session_id, ChatSession.user_id == user_id)
        ).first()

        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

        return ChatSessionDetail(
            id=session.id,
            user_id=session.user_id,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
            is_archived=session.is_archived,
            pinned=session.pinned,
            messages=[ChatMessageItem.model_validate(m) for m in session.messages]
        )

    @staticmethod
    def update_session(
        db: Session,
        user_id: int,
        session_id: int,
        update_data: ChatSessionUpdate
    ) -> ChatSession:
        """Renames, pins/unpins, or archives an active session."""
        session = db.query(ChatSession).filter(
            and_(ChatSession.id == session_id, ChatSession.user_id == user_id)
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")

        if update_data.title is not None:
            session.title = update_data.title.strip()
        if update_data.pinned is not None:
            session.pinned = update_data.pinned
        if update_data.is_archived is not None:
            session.is_archived = update_data.is_archived

        session.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def delete_session(db: Session, user_id: int, session_id: int) -> bool:
        """Deletes a session and cascades delete to all messages."""
        session = db.query(ChatSession).filter(
            and_(ChatSession.id == session_id, ChatSession.user_id == user_id)
        ).first()

        if not session:
            raise HTTPException(status_code=404, detail="Session not found.")

        db.delete(session)
        db.commit()
        return True

    @staticmethod
    def clear_all_history(db: Session, user_id: int, confirmed: bool) -> int:
        """Removes all chat sessions and messages for the user."""
        if not confirmed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Confirmation parameter '?confirm=true' is required to clear history."
            )

        sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).all()
        count = len(sessions)
        for s in sessions:
            db.delete(s)
        db.commit()
        return count

    @staticmethod
    def export_session_markdown(db: Session, user_id: int, session_id: int) -> str:
        """Generates a clean Markdown study guide from the chat session."""
        session = ChatHistoryService.get_session_detail(db, user_id, session_id)
        
        lines = [
            f"# {session.title}",
            f"*AI Study Session Export &bull; {session.created_at.strftime('%Y-%m-%d %H:%M UTC')}*",
            "\n---\n"
        ]

        for msg in session.messages:
            sender = "You" if msg.role == "user" else "AI Tutor"
            lines.append(f"### {sender} ({msg.created_at.strftime('%H:%M:%S')})")
            lines.append(f"{msg.content}\n")

        return "\n".join(lines)

