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


class PopularExerciseItem(BaseModel):
    exercise_id: int
    exercise_name: str
    muscle_group: str
    total_sets: int
    total_volume_kg: float
    unique_athletes: int


class ActiveCustomerItem(BaseModel):
    user_id: int
    athlete_name: str
    workouts_completed: int
    total_volume_kg: float
    current_streak: int
    last_active_date: Optional[str] = None


class VolumeDataPoint(BaseModel):
    period_label: str
    volume_kg: float
    workouts_count: int


class AdminAnalyticsOut(BaseModel):
    total_customers: int
    active_customers: int
    total_completed_workouts: int
    total_scheduled_workouts: int
    avg_completion_rate: float
    total_training_volume_kg: float
    popular_exercises: List[PopularExerciseItem] = []
    most_active_customers: List[ActiveCustomerItem] = []
    weekly_volume_trend: List[VolumeDataPoint] = []
