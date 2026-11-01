from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.gamification_service import GamificationService
from app.schemas.gamification import GamificationProfileResponse, LeaderboardUser

router = APIRouter(prefix="/gamification", tags=["gamification"])

@router.get("/me", response_model=GamificationProfileResponse)
def get_my_gamification_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch current user's study streak, total XP, badge tier, level progress, and recent XP events."""
    # Also trigger streak check
    GamificationService.update_streak(db, current_user)
    db.commit()
    return GamificationService.get_profile(db, current_user)

@router.get("/leaderboard", response_model=List[LeaderboardUser])
def get_leaderboard(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve top active students by XP for public motivation."""
    return GamificationService.get_leaderboard(db, limit=min(max(1, limit), 25))

@router.post("/activity")
def record_learning_activity(
    event_type: str = "login",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Logs user activity (e.g. daily visit) and updates streak/XP."""
    xp_earned = GamificationService.award_xp(db, current_user, event_type)
    return {
        "ok": True,
        "xp_earned": xp_earned,
        "current_streak": current_user.study_streak_count,
        "total_xp": current_user.xp_points
    }

