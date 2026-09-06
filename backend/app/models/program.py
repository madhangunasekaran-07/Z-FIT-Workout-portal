from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), index=True, nullable=False)
    description = Column(Text, nullable=True)
    level_id = Column(Integer, ForeignKey("levels.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    level = relationship("Level", back_populates="programs")
    days = relationship("ProgramDay", back_populates="program", order_by="ProgramDay.day_order", cascade="all, delete-orphan")
    user_assignments = relationship("UserProgram", back_populates="program", cascade="all, delete-orphan")


class ProgramDay(Base):
    __tablename__ = "program_days"

    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.id", ondelete="CASCADE"), nullable=False)
    day_order = Column(Integer, nullable=False)  # 1, 2, 3...
    name = Column(String(255), nullable=False)   # e.g., "Day 1 - Push" or "Push"
    day_type = Column(String(100), nullable=False, default="FULL_BODY")  # PUSH, PULL, LEGS, REST, etc.
    is_rest_day = Column(Boolean, default=False, nullable=False)
    estimated_duration_minutes = Column(Integer, default=45, nullable=False)
    notes = Column(Text, nullable=True)

    program = relationship("Program", back_populates="days")
    exercises = relationship("ProgramExercise", back_populates="program_day", order_by="ProgramExercise.exercise_order", cascade="all, delete-orphan")


class ProgramExercise(Base):
    __tablename__ = "program_exercises"

    id = Column(Integer, primary_key=True, index=True)
    program_day_id = Column(Integer, ForeignKey("program_days.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="RESTRICT"), nullable=False)
    exercise_order = Column(Integer, nullable=False)
    target_sets = Column(Integer, default=3, nullable=False)
    target_reps = Column(Integer, default=10, nullable=False)
    rest_seconds = Column(Integer, default=60, nullable=False)
    notes = Column(Text, nullable=True)

    program_day = relationship("ProgramDay", back_populates="exercises")
    exercise = relationship("Exercise")
