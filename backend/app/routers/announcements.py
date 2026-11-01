from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.core.deps import get_current_user, require_role
from app.models.user import User
from app.services.announcements_service import AnnouncementsService
from app.services.bput_service import BPUTService
from app.schemas.announcements import (
    AnnouncementCreate,
    AnnouncementUpdate,
    AnnouncementResponse,
    AnnouncementsPaginatedResponse,
    BPUTNoticeItem,
    BPUTSyncRequest
)

router = APIRouter(prefix="/announcements", tags=["announcements"])

@router.get("/bput", response_model=List[BPUTNoticeItem])
def get_bput_notices(
    force_refresh: bool = Query(False, description="Force re-fetch from BPUT website"),
    current_user: User = Depends(get_current_user)
):
    """Fetches real-time official notices directly from BPUT website (exam-info.php & news.php)."""
    return BPUTService.get_bput_notifications(force_refresh=force_refresh)

@router.post("/bput/sync", response_model=AnnouncementResponse)
def sync_bput_notice(
    req: BPUTSyncRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    """Admin / Teacher: Publish an official BPUT notice to the internal college notice board."""
    body_content = req.content or f"Official Notification from Biju Patnaik University of Technology (BPUT)."
    if req.link:
        body_content += f"\n\nOfficial Document: {req.link}"

    create_data = AnnouncementCreate(
        title=f"[BPUT] {req.title}".strip()[:200],
        content=body_content,
        priority=req.priority if req.priority in ("urgent", "general", "exam") else "exam",
        pinned=False
    )
    return AnnouncementsService.create_announcement(db, create_data, current_user)

@router.get("/", response_model=List[AnnouncementResponse])
def get_announcements(
    priority: Optional[str] = Query(None, description="urgent, general, or exam"),
    subject_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    include_expired: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve filtered announcements, with pinned notices first, followed by newest."""
    items, _, _ = AnnouncementsService.list_announcements(
        db=db,
        current_user=current_user,
        priority=priority,
        subject_id=subject_id,
        search=search,
        include_expired=include_expired,
        limit=limit,
        offset=offset
    )
    return items

@router.get("/paginated", response_model=AnnouncementsPaginatedResponse)
def get_announcements_paginated(
    priority: Optional[str] = Query(None),
    subject_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    include_expired: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    items, total, unread_count = AnnouncementsService.list_announcements(
        db=db,
        current_user=current_user,
        priority=priority,
        subject_id=subject_id,
        search=search,
        include_expired=include_expired,
        limit=limit,
        offset=offset
    )
    return AnnouncementsPaginatedResponse(total=total, items=items, unread_count=unread_count)

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the number of announcements published since the user last checked the Notices Hub."""
    count = AnnouncementsService.get_unread_count(db, current_user)
    return {"unread_count": count}

@router.post("/mark-read")
def mark_notices_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks all notices as seen by updating the user's last_notices_viewed_at timestamp."""
    viewed_at = AnnouncementsService.mark_notices_read(db, current_user)
    return {"ok": True, "viewed_at": viewed_at}

@router.post("/", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
def create_announcement(
    item: AnnouncementCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    """Teacher/Admin only: Publish a new notice with priority, subject tag, pin, and expiration."""
    return AnnouncementsService.create_announcement(db, item, current_user)

@router.put("/{a_id}", response_model=AnnouncementResponse)
def update_announcement(
    a_id: int,
    item: AnnouncementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Author or Admin only: Edit an existing announcement."""
    return AnnouncementsService.update_announcement(db, a_id, item, current_user)

@router.delete("/{a_id}")
def delete_announcement(
    a_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Author or Admin only: Remove an announcement."""
    AnnouncementsService.delete_announcement(db, a_id, current_user)
    return {"msg": "Notice successfully deleted", "id": a_id}
