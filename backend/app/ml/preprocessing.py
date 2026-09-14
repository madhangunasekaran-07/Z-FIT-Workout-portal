from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.models.workout_log import WorkoutLog, WorkoutSetLog


@dataclass
class ExerciseSessionSummary:
    workout_log_id: int
    exercise_id: int
    exercise_name: str
    completed_at: datetime
    avg_weight_kg: float
    max_weight_kg: float
    avg_reps: float
    max_reps: int
    total_sets: int
    volume_kg: float
    estimated_1rm: float
    avg_rpe: Optional[float]
    target_weight_kg: Optional[float]
    target_reps: Optional[int]
    all_target_reps_met: bool


def calculate_epley_1rm(weight_kg: float, reps: int) -> float:
    """Calculate estimated 1RM using Epley formula: w * (1 + r / 30)."""
    if weight_kg <= 0 or reps <= 0:
        return 0.0
    if reps == 1:
        return round(float(weight_kg), 2)
    return round(float(weight_kg) * (1.0 + float(reps) / 30.0), 2)


def extract_user_exercise_sessions(
    db: Session,
    user_id: int,
    exercise_id: Optional[int] = None
) -> Dict[int, List[ExerciseSessionSummary]]:
    """
    Extracts all completed workout logs for a user, ordered chronologically,
    and summarizes performance by exercise for each workout session.
    Zero-weight, zero-reps, or incomplete sets are filtered out.
    """
    query = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == user_id)
        .order_by(asc(WorkoutLog.completed_at))
    )
    logs = query.all()

    exercise_sessions_map: Dict[int, List[ExerciseSessionSummary]] = {}

    for log in logs:
        # Group sets by exercise_id
        exercise_sets_map: Dict[int, List[WorkoutSetLog]] = {}
        for s in log.sets:
            if not s.is_completed or s.actual_weight_kg <= 0 or s.actual_reps <= 0:
                continue
            if exercise_id is not None and s.exercise_id != exercise_id:
                continue
            if s.exercise_id not in exercise_sets_map:
                exercise_sets_map[s.exercise_id] = []
            exercise_sets_map[s.exercise_id].append(s)

        for ex_id, sets in exercise_sets_map.items():
            if not sets:
                continue

            weights = [s.actual_weight_kg for s in sets]
            reps_list = [s.actual_reps for s in sets]
            volumes = [s.actual_weight_kg * s.actual_reps for s in sets]
            one_rms = [calculate_epley_1rm(s.actual_weight_kg, s.actual_reps) for s in sets]
            rpes = [s.rpe for s in sets if s.rpe is not None and s.rpe > 0]

            target_weights = [s.target_weight_kg for s in sets if s.target_weight_kg is not None]
            target_reps_list = [s.target_reps for s in sets if s.target_reps is not None]

            # Check if all sets met or exceeded target reps
            target_reps_met = True
            for s in sets:
                if s.target_reps is not None and s.actual_reps < s.target_reps:
                    target_reps_met = False
                    break

            summary = ExerciseSessionSummary(
                workout_log_id=log.id,
                exercise_id=ex_id,
                exercise_name=sets[0].exercise_name,
                completed_at=log.completed_at,
                avg_weight_kg=round(sum(weights) / len(weights), 2),
                max_weight_kg=round(max(weights), 2),
                avg_reps=round(sum(reps_list) / len(reps_list), 2),
                max_reps=max(reps_list),
                total_sets=len(sets),
                volume_kg=round(sum(volumes), 2),
                estimated_1rm=round(max(one_rms), 2),
                avg_rpe=round(sum(rpes) / len(rpes), 2) if rpes else None,
                target_weight_kg=round(sum(target_weights) / len(target_weights), 2) if target_weights else None,
                target_reps=int(round(sum(target_reps_list) / len(target_reps_list))) if target_reps_list else None,
                all_target_reps_met=target_reps_met,
            )

            if ex_id not in exercise_sessions_map:
                exercise_sessions_map[ex_id] = []
            exercise_sessions_map[ex_id].append(summary)

    return exercise_sessions_map
