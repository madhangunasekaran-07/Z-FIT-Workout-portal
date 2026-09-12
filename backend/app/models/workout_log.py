from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class WorkoutLog(Base):
    __tablename__ = "workout_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_program_id = Column(Integer, ForeignKey("user_programs.id", ondelete="SET NULL"), nullable=True)
    program_day_id = Column(Integer, ForeignKey("program_days.id", ondelete="SET NULL"), nullable=True)
    day_order_completed = Column(Integer, nullable=False)
    day_name = Column(String(255), nullable=False)
    day_type = Column(String(100), nullable=False)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    duration_seconds = Column(Integer, default=0, nullable=False)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="workout_logs")
    sets = relationship("WorkoutSetLog", back_populates="workout_log", cascade="all, delete-orphan")


class WorkoutSetLog(Base):
    __tablename__ = "workout_set_logs"

    id = Column(Integer, primary_key=True, index=True)
    workout_log_id = Column(Integer, ForeignKey("workout_logs.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="SET NULL"), nullable=True)
    exercise_name = Column(String(255), nullable=False)
    set_number = Column(Integer, nullable=False)
    target_weight_kg = Column(Float, nullable=True)
    target_reps = Column(Integer, nullable=True)
    actual_weight_kg = Column(Float, default=0.0, nullable=False)
    actual_reps = Column(Integer, default=0, nullable=False)
    is_completed = Column(Boolean, default=True, nullable=False)
    rpe = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    workout_log = relationship("WorkoutLog", back_populates="sets")
    exercise = relationship("Exercise")
