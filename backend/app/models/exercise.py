from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from app.database.base import Base

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, index=True, nullable=False)
    muscle_group = Column(String(100), index=True, nullable=False)  # Chest, Back, Legs, Shoulders, Arms, Core, Cardio
    equipment = Column(String(100), nullable=False)                 # Barbell, Dumbbell, Cable, Machine, Bodyweight
    difficulty = Column(String(50), default="Intermediate")          # Beginner, Intermediate, Advanced
    instructions = Column(Text, nullable=True)
    default_sets = Column(Integer, default=3, nullable=False)
    default_reps = Column(Integer, default=10, nullable=False)
    rest_seconds = Column(Integer, default=60, nullable=False)
    media_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
