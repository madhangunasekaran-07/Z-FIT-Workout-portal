from typing import List, Optional, Any, Dict
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from app.schemas.workout import WorkoutLogOut


class PersonalRecordOut(BaseModel):
    id: int
    exercise_id: int
    exercise_name: str
    weight_kg: float
    reps: int
    previous_weight_kg: Optional[float] = None
    previous_reps: Optional[int] = None
    estimated_1rm: Optional[float] = None
    pr_type: str = "MAX_WEIGHT"
    achieved_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompletionDataPoint(BaseModel):
    week_label: str       # e.g. "Week 1", "Week 2"
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


class VolumeDataPoint(BaseModel):
    period_label: str     # e.g. "Week 1", "Sep 1", "Week of Aug 31"
    volume_kg: float
    workouts_count: int


class ExerciseProgressionPoint(BaseModel):
    date_label: str
    date: date
    weight_kg: float
    reps: int
    volume_kg: float
    estimated_1rm: float
    workout_name: str
    is_pr: bool = False


class ExerciseHistorySession(BaseModel):
    log_id: int
    date: date
    date_label: str
    workout_name: str
    day_type: str
    sets_count: int
    best_weight_kg: float
    best_reps: int
    total_volume_kg: float
    is_pr: bool = False


class ExerciseHistoryOut(BaseModel):
    exercise_id: int
    exercise_name: str
    muscle_group: Optional[str] = None
    equipment: Optional[str] = None
    sessions_count: int
    current_pr: Optional[PersonalRecordOut] = None
    progression_points: List[ExerciseProgressionPoint] = []
    sessions: List[ExerciseHistorySession] = []


class JourneyDayOut(BaseModel):
    day_order: int
    day_name: str
    day_type: str
    is_rest_day: bool
    status: str          # "COMPLETED", "CURRENT", "UPCOMING"
    completed_at: Optional[datetime] = None
    exercises_count: int = 0
    duration_minutes: int = 45


class StreakMetrics(BaseModel):
    current_streak: int
    longest_streak: int
    total_completed_workouts: int
    workouts_this_week: int
    workouts_this_month: int


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
    workouts_this_week: int = 0
    workouts_this_month: int = 0
    total_training_volume_kg: float = 0.0
    due_date: Optional[date] = None
    days_remaining: Optional[int] = None
    status: str = "NO_PROGRAM"  # ACTIVE, DUE_SOON, EXPIRED, COMPLETED, NO_PROGRAM
    personal_records: List[PersonalRecordOut] = []
    completion_chart: List[CompletionDataPoint] = []
    strength_chart: List[StrengthDataPoint] = []
    consistency_chart: List[ConsistencyDataPoint] = []
    volume_chart: List[VolumeDataPoint] = []
    recent_history: List[WorkoutLogOut] = []
