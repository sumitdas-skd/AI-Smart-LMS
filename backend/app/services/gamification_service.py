import os
import math
from datetime import datetime, date, timedelta
from typing import Optional, Tuple, Dict, Any, List
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc

from app.models.user import User
from app.models.gamification import XPEvent
from app.schemas.gamification import GamificationProfileResponse, XPEventItem, LeaderboardUser

APP_TIMEZONE = os.getenv("APP_TIMEZONE", "Asia/Kolkata")

# XP Rules and Daily Caps
XP_RULES: Dict[str, Dict[str, int]] = {
    "login": {"xp": 10, "daily_cap": 10},
    "note_view": {"xp": 15, "daily_cap": 60},
    "doubt_ask": {"xp": 20, "daily_cap": 40},
    "doubt_reply": {"xp": 20, "daily_cap": 60},
    "ai_summarize": {"xp": 25, "daily_cap": 50},
    "ai_chat": {"xp": 5, "daily_cap": 25},
    "quiz_complete": {"xp": 20, "daily_cap": 60},
}

# Badge Tiers by total XP points
BADGE_TIERS = [
    (3000, "Diamond"),
    (1500, "Platinum"),
    (750, "Gold"),
    (300, "Silver"),
    (0, "Bronze"),
]

LEVEL_THRESHOLDS = [
    (1, 0, "Novice Learner"),
    (2, 100, "Curious Scholar"),
    (3, 250, "Dedicated Student"),
    (4, 500, "Academic Ace"),
    (5, 850, "Knowledge Seeker"),
    (6, 1300, "Master of Concepts"),
    (7, 1900, "Campus Mentor"),
    (8, 2600, "Grand Scholar"),
    (9, 3500, "University Fellow"),
    (10, 4600, "LMS Luminary"),
]

def get_tz() -> ZoneInfo:
    try:
        return ZoneInfo(APP_TIMEZONE)
    except Exception:
        return ZoneInfo("UTC")

def get_level_info(xp: int) -> Tuple[int, str, int, int, float]:
    """Returns (current_level, title, next_level_threshold, current_level_base_xp, progress_percentage)."""
    current_lvl = 1
    current_title = "Novice Learner"
    base_xp = 0
    next_xp = 100

    for idx, (lvl, req_xp, title) in enumerate(LEVEL_THRESHOLDS):
        if xp >= req_xp:
            current_lvl = lvl
            current_title = title
            base_xp = req_xp
            if idx + 1 < len(LEVEL_THRESHOLDS):
                next_xp = LEVEL_THRESHOLDS[idx + 1][1]
            else:
                next_xp = req_xp + 1500
        else:
            break

    denom = max(1, next_xp - base_xp)
    numer = min(denom, max(0, xp - base_xp))
    pct = round((numer / denom) * 100.0, 1)

    return current_lvl, current_title, next_xp, base_xp, pct

def get_badge_for_xp(xp: int) -> str:
    for threshold, badge in BADGE_TIERS:
        if xp >= threshold:
            return badge
    return "Bronze"

class GamificationService:

    @staticmethod
    def update_streak(db: Session, user: User) -> int:
        """
        Updates streak count server-side according to APP_TIMEZONE:
        - Same day active: no change
        - Active yesterday: streak + 1
        - Gap of 2+ days: resets to 1
        """
        if user.role != "student":
            return user.study_streak_count

        tz = get_tz()
        today = datetime.now(tz).date()

        if user.last_active_date == today:
            # Already active today
            return user.study_streak_count
        elif user.last_active_date == today - timedelta(days=1):
            # Active consecutive day!
            user.study_streak_count = (user.study_streak_count or 0) + 1
        else:
            # Streak broken or first activity
            user.study_streak_count = 1

        user.last_active_date = today
        return user.study_streak_count

    @staticmethod
    def award_xp(
        db: Session,
        user: User,
        event_type: str,
        ref_id: Optional[Any] = None
    ) -> int:
        """
        Awards XP to a student with daily cap and deduplication enforcement.
        Updates streak, total XP, and badge level in one safe transaction.
        """
        # Only students earn XP
        if not user or user.role != "student":
            return 0

        rule = XP_RULES.get(event_type)
        if not rule:
            return 0

        tz = get_tz()
        now_tz = datetime.now(tz)
        today = now_tz.date()

        # Update streak first
        GamificationService.update_streak(db, user)

        # Start of day in UTC for querying
        start_of_day_tz = datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=tz)
        start_of_day_utc = start_of_day_tz.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)

        ref_str = str(ref_id) if ref_id is not None else None

        # 1. Deduplication check: same (user, event_type, ref_id, day) gets XP only once
        if ref_str:
            existing_event = db.query(XPEvent).filter(
                and_(
                    XPEvent.user_id == user.id,
                    XPEvent.event_type == event_type,
                    XPEvent.ref_id == ref_str,
                    XPEvent.created_at >= start_of_day_utc
                )
            ).first()
            if existing_event:
                # Already awarded for this resource today
                db.commit()
                return 0

        # 2. Daily cap check
        daily_earned = db.query(func.coalesce(func.sum(XPEvent.xp), 0)).filter(
            and_(
                XPEvent.user_id == user.id,
                XPEvent.event_type == event_type,
                XPEvent.created_at >= start_of_day_utc
            )
        ).scalar() or 0

        daily_cap = rule["daily_cap"]
        base_xp = rule["xp"]

        allowed_xp = min(base_xp, max(0, daily_cap - daily_earned))
        if allowed_xp <= 0:
            db.commit()
            return 0

        # 3. Create XPEvent audit record
        event = XPEvent(
            user_id=user.id,
            event_type=event_type,
            xp=allowed_xp,
            ref_id=ref_str
        )
        db.add(event)

        # 4. Update user points and badge
        user.xp_points = (user.xp_points or 0) + allowed_xp
        user.badge_level = get_badge_for_xp(user.xp_points)

        db.commit()
        db.refresh(user)
        return allowed_xp

    @staticmethod
    def get_profile(db: Session, user: User) -> GamificationProfileResponse:
        """Returns the full gamification profile for the current user."""
        xp = user.xp_points or 0
        lvl, title, next_xp, base_xp, pct = get_level_info(xp)
        badge = user.badge_level or get_badge_for_xp(xp)

        # Fetch recent 10 events
        recent = db.query(XPEvent).filter(
            XPEvent.user_id == user.id
        ).order_by(desc(XPEvent.created_at)).limit(10).all()

        return GamificationProfileResponse(
            user_id=user.id,
            full_name=user.full_name or "Student",
            role=user.role,
            study_streak_count=user.study_streak_count or 0,
            last_active_date=str(user.last_active_date) if user.last_active_date else None,
            xp_points=xp,
            level=lvl,
            level_title=title,
            badge_level=badge,
            next_level_xp=next_xp,
            current_level_base_xp=base_xp,
            progress_percentage=pct,
            recent_events=[XPEventItem.model_validate(e) for e in recent]
        )

    @staticmethod
    def get_leaderboard(db: Session, limit: int = 10) -> List[LeaderboardUser]:
        """Returns the top 10 students by XP points."""
        top_students = db.query(User).filter(
            and_(User.role == "student", User.is_active == True)
        ).order_by(desc(User.xp_points), desc(User.study_streak_count)).limit(limit).all()

        results = []
        for idx, s in enumerate(top_students, start=1):
            lvl, _, _, _, _ = get_level_info(s.xp_points or 0)
            results.append(LeaderboardUser(
                rank=idx,
                user_id=s.id,
                display_name=s.full_name or f"Scholar #{s.id}",
                badge_level=s.badge_level or "Bronze",
                level=lvl,
                xp_points=s.xp_points or 0,
                streak=s.study_streak_count or 0
            ))
        return results

