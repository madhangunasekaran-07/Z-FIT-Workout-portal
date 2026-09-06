from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class LevelBase(BaseModel):
    name: str
    description: Optional[str] = None

class LevelCreate(LevelBase):
    pass

class LevelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class LevelOut(LevelBase):
    id: int
    created_at: datetime
    programs_count: int = 0
    users_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ExerciseBase(BaseModel):
    name: str
    muscle_group: str
    equipment: str
    difficulty: str = "Intermediate"
    instructions: Optional[str] = None
    default_sets: int = 3
    default_reps: int = 10
    rest_seconds: int = 60
    media_url: Optional[str] = None
    is_active: bool = True

class ExerciseCreate(ExerciseBase):
    pass

class ExerciseUpdate(BaseModel):
    name: Optional[str] = None
    muscle_group: Optional[str] = None
    equipment: Optional[str] = None
    difficulty: Optional[str] = None
    instructions: Optional[str] = None
    default_sets: Optional[int] = None
    default_reps: Optional[int] = None
    rest_seconds: Optional[int] = None
    media_url: Optional[str] = None
    is_active: Optional[bool] = None

class ExerciseOut(ExerciseBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
