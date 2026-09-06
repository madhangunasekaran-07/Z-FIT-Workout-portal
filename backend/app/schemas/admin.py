from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class RecentActivityItem(BaseModel):
    id: str
    user_name: str
    user_email: str
    action_type: str     # "WORKOUT_COMPLETED", "PROGRAM_ASSIGNED", "PROGRAM_EXPIRING", "USER_REGISTERED"
    description: str
    timestamp: datetime
    metadata: Optional[dict] = None

class AdminDashboardStatsOut(BaseModel):
    total_customers: int
    active_customers: int
    active_programs: int
    completed_workouts_today: int
    programs_expiring_soon: int
    recent_activities: List[RecentActivityItem] = []
