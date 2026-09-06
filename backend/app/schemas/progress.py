from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from app.schemas.workout import WorkoutLogOut

class PersonalRecordOut(BaseModel):
    id: int
    exercise_id: int
    exercise_name: str
    weight_kg: float
    reps: int
    achieved_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CompletionDataPoint(BaseModel):
    week_label: str       # e.g. "Week 1", "Week 2", "Week 3", "Week 4"
    completion_rate: int  # e.g. 75 (%)
    completed_count: int
    target_count: int

class StrengthDataPoint(BaseModel):
    date_label: str
    exercise_name: str
    weight_kg: float

class ConsistencyDataPoint(BaseModel):
    day_name: str         # "Mon", "Tue", etc.
    workouts_count: int

class JourneyDayOut(BaseModel):
    day_order: int
    day_name: str
    day_type: str
    is_rest_day: bool
    status: str          # "COMPLETED", "CURRENT", "UPCOMING"
    completed_at: Optional[datetime] = None
    exercises_count: int = 0
    duration_minutes: int = 45

class ProgressStatsOut(BaseModel):
    has_assignment: bool
    program_name: Optional[str] = None
    level_name: Optional[str] = None
    overall_completion_percent: float = 0.0
    total_program_days: int = 0
    completed_workouts: int = 0
    remaining_workouts: int = 0
    current_workout_day: int = 1
    current_streak: int = 0
    longest_streak: int = 0
    due_date: Optional[date] = None
    days_remaining: Optional[int] = None
    status: str = "NO_PROGRAM"  # ACTIVE, DUE_SOON, EXPIRED, COMPLETED, NO_PROGRAM
    personal_records: List[PersonalRecordOut] = []
    completion_chart: List[CompletionDataPoint] = []
    strength_chart: List[StrengthDataPoint] = []
    consistency_chart: List[ConsistencyDataPoint] = []
    recent_history: List[WorkoutLogOut] = []
