from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class PersonalRecord(Base):
    __tablename__ = "personal_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(Integer, ForeignKey("exercises.id", ondelete="CASCADE"), nullable=False)
    weight_kg = Column(Float, nullable=False)
    reps = Column(Integer, nullable=False)
    achieved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    workout_log_id = Column(Integer, ForeignKey("workout_logs.id", ondelete="SET NULL"), nullable=True)

    user = relationship("User", back_populates="personal_records")
    exercise = relationship("Exercise")
