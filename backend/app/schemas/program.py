from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, ConfigDict
from app.schemas.exercise import ExerciseOut

class ProgramExerciseBase(BaseModel):
    exercise_id: int
    exercise_order: int
    target_sets: int = 3
    target_reps: int = 10
    rest_seconds: int = 60
    notes: Optional[str] = None

class ProgramExerciseCreate(ProgramExerciseBase):
    pass

class ProgramExerciseOut(ProgramExerciseBase):
    id: int
    exercise: Optional[ExerciseOut] = None

    model_config = ConfigDict(from_attributes=True)


class ProgramDayBase(BaseModel):
    day_order: int
    name: str
    day_type: str = "FULL_BODY"
    is_rest_day: bool = False
    estimated_duration_minutes: int = 45
    notes: Optional[str] = None

class ProgramDayCreate(ProgramDayBase):
    exercises: List[ProgramExerciseCreate] = []

class ProgramDayOut(ProgramDayBase):
    id: int
    exercises: List[ProgramExerciseOut] = []

    model_config = ConfigDict(from_attributes=True)


class ProgramBase(BaseModel):
    name: str
    description: Optional[str] = None
    level_id: Optional[int] = None
    is_active: bool = True

class ProgramCreate(ProgramBase):
    days: List[ProgramDayCreate] = []

class ProgramUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    level_id: Optional[int] = None
    is_active: Optional[bool] = None
    days: Optional[List[ProgramDayCreate]] = None

class ProgramOut(ProgramBase):
    id: int
    created_at: datetime
    level_name: Optional[str] = None
    days_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class ProgramDetailOut(ProgramOut):
    days: List[ProgramDayOut] = []


class AssignProgramRequest(BaseModel):
    user_id: int
    program_id: int
    start_date: date
    due_date: date
    start_day_order: int = 1


class ResetProgressRequest(BaseModel):
    new_day_order: int = 1
