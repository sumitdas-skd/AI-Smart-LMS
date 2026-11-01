from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, and_, desc
from datetime import datetime
from typing import Optional, Tuple, List
from fastapi import HTTPException, status

from app.models.content import Announcement
from app.models.academic import Subject
from app.models.user import User
from app.schemas.announcements import AnnouncementCreate, AnnouncementUpdate

class AnnouncementsService:

    @staticmethod
    def list_announcements(
        db: Session,
        current_user: Optional[User] = None,
        priority: Optional[str] = None,
        subject_id: Optional[int] = None,
        search: Optional[str] = None,
        include_expired: bool = False,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Announcement], int, int]:
        """Fetches filtered, paginated announcements with pinned items first, then newest."""
        limit = min(max(1, limit), 100)
        query = db.query(Announcement).options(
            selectinload(Announcement.author),
            selectinload(Announcement.subject)
        )

        now = datetime.utcnow()
        if not include_expired:
            query = query.filter(
                or_(Announcement.expires_at.is_(None), Announcement.expires_at > now)
            )

        if priority and priority in ("urgent", "general", "exam"):
            query = query.filter(Announcement.priority == priority)

        if subject_id is not None:
            query = query.filter(Announcement.subject_id == subject_id)

        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Announcement.title.ilike(search_pattern),
                    Announcement.content.ilike(search_pattern)
                )
            )

        total = query.count()

        # Sort pinned first, then created_at desc
        items = query.order_by(
            desc(Announcement.pinned),
            desc(Announcement.created_at)
        ).offset(offset).limit(limit).all()

        # Unread count calculation
        unread_count = 0
        if current_user:
            last_viewed = current_user.last_notices_viewed_at
            unread_q = db.query(Announcement).filter(
                or_(Announcement.expires_at.is_(None), Announcement.expires_at > now)
            )
            if last_viewed:
                unread_q = unread_q.filter(Announcement.created_at > last_viewed)
            unread_count = unread_q.count()

        return items, total, unread_count

    @staticmethod
    def get_unread_count(db: Session, current_user: User) -> int:
        now = datetime.utcnow()
        query = db.query(Announcement).filter(
            or_(Announcement.expires_at.is_(None), Announcement.expires_at > now)
        )
        if current_user.last_notices_viewed_at:
            query = query.filter(Announcement.created_at > current_user.last_notices_viewed_at)
        return query.count()

    @staticmethod
    def mark_notices_read(db: Session, current_user: User) -> datetime:
        now = datetime.utcnow()
        current_user.last_notices_viewed_at = now
        db.commit()
        return now

    @staticmethod
    def create_announcement(db: Session, item: AnnouncementCreate, current_user: User) -> Announcement:
        if item.subject_id:
            subj = db.query(Subject).filter(Subject.id == item.subject_id).first()
            if not subj:
                raise HTTPException(status_code=400, detail="Specified subject does not exist.")

        announcement = Announcement(
            title=item.title.strip(),
            content=item.content.strip(),
            priority=item.priority,
            subject_id=item.subject_id,
            pinned=item.pinned,
            expires_at=item.expires_at,
            created_by=current_user.id
        )
        db.add(announcement)
        db.commit()
        db.refresh(announcement)
        return announcement

    @staticmethod
    def update_announcement(db: Session, announcement_id: int, item: AnnouncementUpdate, current_user: User) -> Announcement:
        announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")

        # Must be author or admin
        if announcement.created_by != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author or an admin can edit this notice")

        if item.title is not None:
            announcement.title = item.title.strip()
        if item.content is not None:
            announcement.content = item.content.strip()
        if item.priority is not None:
            announcement.priority = item.priority
        if item.subject_id is not None:
            announcement.subject_id = item.subject_id
        if item.pinned is not None:
            announcement.pinned = item.pinned
        if item.expires_at is not None:
            announcement.expires_at = item.expires_at

        db.commit()
        db.refresh(announcement)
        return announcement

    @staticmethod
    def delete_announcement(db: Session, announcement_id: int, current_user: User) -> bool:
        announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
        if not announcement:
            raise HTTPException(status_code=404, detail="Announcement not found")

        # Must be author or admin
        if announcement.created_by != current_user.id and current_user.role != "admin":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author or an admin can delete this notice")

        db.delete(announcement)
        db.commit()
        return True

