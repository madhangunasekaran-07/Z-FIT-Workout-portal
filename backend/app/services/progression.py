from datetime import datetime, timezone, date, timedelta
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.assignment import UserProgram
from app.models.program import Program, ProgramDay
from app.models.workout_log import WorkoutLog, WorkoutSetLog
from app.models.pr import PersonalRecord
from app.schemas.workout import WorkoutCompletionRequest

def get_active_user_program(db: Session, user_id: int) -> Optional[UserProgram]:
    """Retrieve the primary active program assignment for the user."""
    return (
        db.query(UserProgram)
        .filter(UserProgram.user_id == user_id, UserProgram.status == "ACTIVE")
        .order_by(desc(UserProgram.assigned_at))
        .first()
    )

def calculate_due_date_status(due_date: date, assignment_status: str) -> Tuple[int, str]:
    """Calculate remaining days and status tag: ACTIVE, DUE_SOON, EXPIRED, COMPLETED."""
    if assignment_status == "COMPLETED":
        return 0, "COMPLETED"
    
    today = date.today()
    days_remaining = (due_date - today).days
    
    if days_remaining < 0:
        return days_remaining, "EXPIRED"
    elif days_remaining <= 5:
        return days_remaining, "DUE_SOON"
    else:
        return days_remaining, "ACTIVE"

def calculate_user_streaks(db: Session, user_id: int) -> Tuple[int, int]:
    """
    Calculate current workout streak and longest workout streak based on workout completion history.
    A workout streak continues if workouts are within 2 days of each other (allowing for a rest day).
    """
    logs = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == user_id)
        .order_by(desc(WorkoutLog.completed_at))
        .all()
    )
    if not logs:
        return 0, 0

    unique_dates = sorted(list({log.completed_at.date() for log in logs}), reverse=True)
    if not unique_dates:
        return 0, 0

    today = date.today()
    current_streak = 0
    longest_streak = 0
    
    # Calculate current streak: is most recent workout today or yesterday (or within 2 days)?
    if (today - unique_dates[0]).days <= 2:
        curr = 1
        for i in range(len(unique_dates) - 1):
            diff = (unique_dates[i] - unique_dates[i + 1]).days
            if diff <= 2:
                curr += 1
            else:
                break
        current_streak = curr
    else:
        current_streak = 0

    # Calculate longest streak across all history
    if len(unique_dates) > 0:
        streak_len = 1
        max_streak = 1
        for i in range(len(unique_dates) - 1):
            diff = (unique_dates[i] - unique_dates[i + 1]).days
            if diff <= 2:
                streak_len += 1
            else:
                if streak_len > max_streak:
                    max_streak = streak_len
                streak_len = 1
        if streak_len > max_streak:
            max_streak = streak_len
        longest_streak = max(max_streak, current_streak)

    return current_streak, longest_streak

def process_personal_records(
    db: Session,
    user_id: int,
    workout_log_id: int,
    set_logs: List[WorkoutSetLog]
) -> List[PersonalRecord]:
    """Check if any completed set sets a new Personal Record for weight or reps."""
    new_prs = []
    now = datetime.now(timezone.utc)

    for s in set_logs:
        if not s.is_completed or not s.exercise_id or s.actual_weight_kg <= 0:
            continue

        existing_pr = (
            db.query(PersonalRecord)
            .filter(
                PersonalRecord.user_id == user_id,
                PersonalRecord.exercise_id == s.exercise_id
            )
            .first()
        )

        is_new_pr = False
        if not existing_pr:
            new_pr = PersonalRecord(
                user_id=user_id,
                exercise_id=s.exercise_id,
                weight_kg=s.actual_weight_kg,
                reps=s.actual_reps,
                achieved_at=now,
                workout_log_id=workout_log_id
            )
            db.add(new_pr)
            new_prs.append(new_pr)
        else:
            # Better if weight is strictly higher, or same weight with more reps
            if (s.actual_weight_kg > existing_pr.weight_kg) or (
                s.actual_weight_kg == existing_pr.weight_kg and s.actual_reps > existing_pr.reps
            ):
                existing_pr.weight_kg = s.actual_weight_kg
                existing_pr.reps = s.actual_reps
                existing_pr.achieved_at = now
                existing_pr.workout_log_id = workout_log_id
                new_prs.append(existing_pr)

    return new_prs

def advance_workout_progression(
    db: Session,
    user: User,
    completion_data: WorkoutCompletionRequest
) -> Dict[str, Any]:
    """
    CRITICAL BUSINESS RULE:
    1. Records the user's workout completion into WorkoutLog and WorkoutSetLog.
    2. Identifies and updates Personal Records (PRs).
    3. Advances current_day_order strictly to the next sequence item.
    4. Progression is never triggered by calendar days.
    """
    assignment = get_active_user_program(db, user.id)
    if not assignment:
        raise ValueError("User does not have an active workout program assigned.")

    program = db.query(Program).filter(Program.id == assignment.program_id).first()
    if not program:
        raise ValueError("Assigned program not found.")

    # Find the current program day
    current_day = (
        db.query(ProgramDay)
        .filter(
            ProgramDay.program_id == program.id,
            ProgramDay.day_order == assignment.current_day_order
        )
        .first()
    )

    day_name = current_day.name if current_day else f"Day {assignment.current_day_order}"
    day_type = current_day.day_type if current_day else "WORKOUT"

    now = datetime.now(timezone.utc)
    workout_log = WorkoutLog(
        user_id=user.id,
        user_program_id=assignment.id,
        program_day_id=current_day.id if current_day else None,
        day_order_completed=assignment.current_day_order,
        day_name=day_name,
        day_type=day_type,
        started_at=now - timedelta(seconds=completion_data.duration_seconds or 1800),
        completed_at=now,
        duration_seconds=completion_data.duration_seconds or 1800,
        notes=completion_data.notes
    )
    db.add(workout_log)
    db.flush()  # obtain workout_log.id

    # Add sets to set logs
    set_records = []
    for s in completion_data.sets:
        set_log = WorkoutSetLog(
            workout_log_id=workout_log.id,
            exercise_id=s.exercise_id,
            exercise_name=s.exercise_name,
            set_number=s.set_number,
            target_weight_kg=s.target_weight_kg,
            target_reps=s.target_reps,
            actual_weight_kg=s.actual_weight_kg,
            actual_reps=s.actual_reps,
            is_completed=s.is_completed,
            notes=s.notes
        )
        db.add(set_log)
        set_records.append(set_log)

    db.flush()

    # Track Personal Records
    new_prs = process_personal_records(db, user.id, workout_log.id, set_records)

    # Sequence calculation: find all days in program
    days_in_program = (
        db.query(ProgramDay)
        .filter(ProgramDay.program_id == program.id)
        .order_by(ProgramDay.day_order)
        .all()
    )
    total_days = len(days_in_program)
    max_day_order = max([d.day_order for d in days_in_program]) if days_in_program else 1

    next_order = assignment.current_day_order + 1
    is_program_completed = False

    if next_order > max_day_order:
        is_program_completed = True
        assignment.status = "COMPLETED"
        assignment.completed_at = now
    else:
        assignment.current_day_order = next_order

    db.commit()
    db.refresh(assignment)

    return {
        "message": "Workout successfully completed and recorded.",
        "previous_day_order": workout_log.day_order_completed,
        "new_day_order": assignment.current_day_order,
        "is_program_completed": is_program_completed,
        "new_prs_count": len(new_prs),
        "workout_log_id": workout_log.id
    }

def advance_rest_day(db: Session, user: User) -> Dict[str, Any]:
    """Advance past a scheduled Rest Day to the next workout day in sequence."""
    assignment = get_active_user_program(db, user.id)
    if not assignment:
        raise ValueError("User does not have an active workout program assigned.")

    program = db.query(Program).filter(Program.id == assignment.program_id).first()
    if not program:
        raise ValueError("Assigned program not found.")

    current_day = (
        db.query(ProgramDay)
        .filter(
            ProgramDay.program_id == program.id,
            ProgramDay.day_order == assignment.current_day_order
        )
        .first()
    )

    now = datetime.now(timezone.utc)
    # Log rest day
    day_name = current_day.name if current_day else f"Day {assignment.current_day_order} - Rest"
    workout_log = WorkoutLog(
        user_id=user.id,
        user_program_id=assignment.id,
        program_day_id=current_day.id if current_day else None,
        day_order_completed=assignment.current_day_order,
        day_name=day_name,
        day_type="REST",
        started_at=now,
        completed_at=now,
        duration_seconds=0,
        notes="Rest & Recovery day acknowledged."
    )
    db.add(workout_log)

    days_in_program = (
        db.query(ProgramDay)
        .filter(ProgramDay.program_id == program.id)
        .order_by(ProgramDay.day_order)
        .all()
    )
    max_day_order = max([d.day_order for d in days_in_program]) if days_in_program else 1

    next_order = assignment.current_day_order + 1
    is_program_completed = False

    if next_order > max_day_order:
        is_program_completed = True
        assignment.status = "COMPLETED"
        assignment.completed_at = now
    else:
        assignment.current_day_order = next_order

    db.commit()
    db.refresh(assignment)

    return {
        "message": "Rest day completed. Next workout is ready.",
        "new_day_order": assignment.current_day_order,
        "is_program_completed": is_program_completed
    }
