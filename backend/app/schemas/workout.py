from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict

class SetLogInput(BaseModel):
    exercise_id: Optional[int] = None
    exercise_name: str
    set_number: int
    target_weight_kg: Optional[float] = None
    target_reps: Optional[int] = None
    actual_weight_kg: float
    actual_reps: int
    is_completed: bool = True
    notes: Optional[str] = None

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
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class WorkoutLogOut(BaseModel):
    id: int
    user_id: int
    day_order_completed: int
    day_name: str
    day_type: str
    started_at: datetime
    completed_at: datetime
    duration_seconds: int
    notes: Optional[str] = None
    sets: List[WorkoutSetLogOut] = []

    model_config = ConfigDict(from_attributes=True)

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
