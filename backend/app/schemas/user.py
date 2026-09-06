from typing import Optional
from datetime import datetime, date
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    level_id: Optional[int] = None

class UserCreate(UserBase):
    password: str
    role: Optional[UserRole] = UserRole.CUSTOMER

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    level_id: Optional[int] = None
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None

class UserOut(UserBase):
    id: int
    role: UserRole
    created_at: datetime
    level_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class CustomerDetailOut(UserOut):
    assigned_program_id: Optional[int] = None
    assigned_program_name: Optional[str] = None
    current_day_order: Optional[int] = None
    total_days: Optional[int] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    assignment_status: Optional[str] = None
    completed_workouts_count: int = 0
    current_streak: int = 0
    longest_streak: int = 0
