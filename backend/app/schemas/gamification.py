from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class XPEventItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    event_type: str
    xp: int
    ref_id: Optional[str] = None
    created_at: datetime

class GamificationProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    full_name: str
    role: str
    study_streak_count: int
    last_active_date: Optional[str] = None
    xp_points: int
    level: int
    level_title: str
    badge_level: str
    next_level_xp: int
    current_level_base_xp: int
    progress_percentage: float
    recent_events: List[XPEventItem]

class LeaderboardUser(BaseModel):
    rank: int
    user_id: int
    display_name: str
    badge_level: str
    level: int
    xp_points: int
    streak: int

