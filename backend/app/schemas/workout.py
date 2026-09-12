from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict, Field, field_validator


class SetLogInput(BaseModel):
    exercise_id: Optional[int] = None
    exercise_name: str
    set_number: int = Field(..., ge=1)
    target_weight_kg: Optional[float] = None
    target_reps: Optional[int] = None
    actual_weight_kg: float = Field(..., ge=0.0, le=1500.0)
    actual_reps: int = Field(..., ge=0, le=500)
    is_completed: bool = True
    rpe: Optional[float] = Field(None, ge=1.0, le=10.0)
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("actual_weight_kg")
    @classmethod
    def weight_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Weight cannot be negative")
        return v

    @field_validator("actual_reps")
    @classmethod
    def reps_non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Reps cannot be negative")
        return v


class WorkoutCompletionRequest(BaseModel):
    program_day_id: Optional[int] = None
    day_order: int
    duration_seconds: int = 0
    notes: Optional[str] = None
    sets: List[SetLogInput] = []


class WorkoutSetLogOut(BaseModel):
    id: int
    exercise_id: Optional[int] = None
    exercise_name: str
    set_number: int
    target_weight_kg: Optional[float] = None
    target_reps: Optional[int] = None
    actual_weight_kg: float
    actual_reps: int
    is_completed: bool
    rpe: Optional[float] = None
    notes: Optional[str] = None

    @property
    def set_volume_kg(self) -> float:
        if self.is_completed and self.actual_weight_kg > 0 and self.actual_reps > 0:
            return round(self.actual_weight_kg * self.actual_reps, 2)
        return 0.0

    model_config = ConfigDict(from_attributes=True)


class WorkoutLogOut(BaseModel):
    id: int
    user_id: int
    user_program_id: Optional[int] = None
    program_day_id: Optional[int] = None
    day_order_completed: int
    day_name: str
    day_type: str
    started_at: datetime
    completed_at: datetime
    duration_seconds: int
    notes: Optional[str] = None
    sets: List[WorkoutSetLogOut] = []
    total_volume_kg: float = 0.0
    exercises_completed_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class PRCelebrationOut(BaseModel):
    exercise_id: int
    exercise_name: str
    weight_kg: float
    reps: int
    previous_weight_kg: Optional[float] = None
    previous_reps: Optional[int] = None
    estimated_1rm: float
    pr_type: str
    achieved_at: datetime


class WorkoutCompletionResponse(BaseModel):
    message: str
    previous_day_order: int
    new_day_order: int
    is_program_completed: bool
    new_prs: List[PRCelebrationOut] = []
    total_volume_kg: float
    workout_log_id: int


class WorkoutExerciseTarget(BaseModel):
    exercise_id: int
    name: str
    muscle_group: str
    equipment: str
    exercise_order: int
    target_sets: int
    target_reps: int
    rest_seconds: int
    instructions: Optional[str] = None
    media_url: Optional[str] = None
    notes: Optional[str] = None
    previous_best_weight: Optional[float] = None


class CurrentWorkoutOut(BaseModel):
    has_assignment: bool
    program_id: Optional[int] = None
    program_name: Optional[str] = None
    level_name: Optional[str] = None
    day_id: Optional[int] = None
    day_order: Optional[int] = None
    day_name: Optional[str] = None
    day_type: Optional[str] = None
    is_rest_day: bool = False
    estimated_duration_minutes: int = 45
    exercises: List[WorkoutExerciseTarget] = []
    total_program_days: int = 0
    completed_days_count: int = 0
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    days_remaining: Optional[int] = None
    assignment_status: Optional[str] = None
    current_streak: int = 0
    notes: Optional[str] = None
