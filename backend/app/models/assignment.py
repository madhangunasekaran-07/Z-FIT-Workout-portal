from datetime import datetime, timezone, date
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base

class UserProgram(Base):
    __tablename__ = "user_programs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    program_id = Column(Integer, ForeignKey("programs.id", ondelete="CASCADE"), nullable=False)
    start_date = Column(Date, default=date.today, nullable=False)
    due_date = Column(Date, nullable=False)
    current_day_order = Column(Integer, default=1, nullable=False)
    status = Column(String(50), default="ACTIVE", nullable=False)  # ACTIVE, COMPLETED, EXPIRED, PAUSED
    assigned_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="assigned_programs")
    program = relationship("Program", back_populates="user_assignments")
