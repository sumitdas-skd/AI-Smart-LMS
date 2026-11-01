from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.chat_history_service import ChatHistoryService
from app.schemas.chat_history import (
    ChatSessionSummary,
    ChatSessionDetail,
    ChatSessionUpdate
)

router = APIRouter(prefix="/chat/sessions", tags=["chat-history"])

@router.get("/", response_model=List[ChatSessionSummary])
def list_my_sessions(
    q: Optional[str] = Query(None, description="Search session title"),
    include_archived: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists current user's past AI chat sessions, pinned first, then sorted by recent activity."""
    return ChatHistoryService.list_sessions(
        db=db,
        user_id=current_user.id,
        q=q,
        include_archived=include_archived,
        limit=limit,
        offset=offset
    )

@router.get("/{session_id}", response_model=ChatSessionDetail)
def get_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all messages in a specific chat session. Strict 404 if not found or unauthorized."""
    return ChatHistoryService.get_session_detail(db, current_user.id, session_id)

@router.patch("/{session_id}")
def update_session(
    session_id: int,
    update_data: ChatSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Rename, pin/unpin, or archive a session."""
    session = ChatHistoryService.update_session(db, current_user.id, session_id, update_data)
    return {"ok": True, "id": session.id, "title": session.title, "pinned": session.pinned, "is_archived": session.is_archived}

@router.delete("/{session_id}")
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a chat session and all its messages."""
    ChatHistoryService.delete_session(db, current_user.id, session_id)
    return {"msg": "Chat session successfully deleted", "id": session_id}

@router.delete("/")
def clear_all_history(
    confirm: bool = Query(False, description="Must be true to confirm clearing all history"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permanently clears all AI chat history for the logged-in user."""
    count = ChatHistoryService.clear_all_history(db, current_user.id, confirmed=confirm)
    return {"msg": f"Cleared {count} chat session(s)", "cleared_count": count}

@router.get("/{session_id}/export", response_class=PlainTextResponse)
def export_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export the full conversation as a clean Markdown study guide."""
    md_content = ChatHistoryService.export_session_markdown(db, current_user.id, session_id)
    return PlainTextResponse(
        content=md_content,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=ai_chat_session_{session_id}.md"}
    )

