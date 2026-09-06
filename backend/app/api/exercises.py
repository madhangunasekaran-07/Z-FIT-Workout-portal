from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.exercise import Exercise
from app.schemas.exercise import ExerciseOut

router = APIRouter(prefix="/exercises", tags=["Exercises"])

@router.get("", response_model=List[ExerciseOut])
def list_exercises(
    muscle_group: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Exercise).filter(Exercise.is_active == True)
    if muscle_group and muscle_group.lower() != "all":
        query = query.filter(Exercise.muscle_group.ilike(f"%{muscle_group}%"))
    if search:
        query = query.filter(Exercise.name.ilike(f"%{search}%"))
    return query.order_by(Exercise.name).all()

@router.get("/{exercise_id}", response_model=ExerciseOut)
def get_exercise(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex
