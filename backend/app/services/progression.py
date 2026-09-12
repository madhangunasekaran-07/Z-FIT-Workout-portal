from datetime import datetime, timezone, date, timedelta
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.assignment import UserProgram
from app.models.program import Program, ProgramDay
from app.models.workout_log import WorkoutLog, WorkoutSetLog
from app.models.pr import PersonalRecord
from app.schemas.workout import WorkoutCompletionRequest, PRCelebrationOut


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
    Calculate current workout streak and longest workout streak.
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


def calculate_streak_metrics(db: Session, user_id: int) -> Dict[str, int]:
    """
    Return full streak metrics: current streak, longest streak,
    total completed workouts, workouts this week, workouts this month.
    """
    logs = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == user_id)
        .order_by(desc(WorkoutLog.completed_at))
        .all()
    )

    current_streak, longest_streak = calculate_user_streaks(db, user_id)
    total_completed = len(logs)

    today = date.today()
    # Workouts this week (Monday to Sunday)
    week_start = today - timedelta(days=today.weekday())
    workouts_this_week = sum(
        1 for log in logs if log.completed_at.date() >= week_start
    )
    # Workouts this month
    month_start = today.replace(day=1)
    workouts_this_month = sum(
        1 for log in logs if log.completed_at.date() >= month_start
    )

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "total_completed_workouts": total_completed,
        "workouts_this_week": workouts_this_week,
        "workouts_this_month": workouts_this_month,
    }


def calculate_workout_volume(sets: List[WorkoutSetLog]) -> float:
    """
    Calculate total training volume for a list of set logs.
    Volume = Weight × Reps, only for completed sets with valid positive values.
    """
    total = 0.0
    for s in sets:
        if s.is_completed and s.actual_weight_kg > 0 and s.actual_reps > 0:
            total += s.actual_weight_kg * s.actual_reps
    return round(total, 2)


def calculate_estimated_1rm(weight_kg: float, reps: int) -> float:
    """
    Epley formula for estimated one-rep max.
    1RM = weight * (1 + reps / 30)
    For reps == 1, 1RM is the weight itself.
    """
    if reps <= 0 or weight_kg <= 0:
        return 0.0
    if reps == 1:
        return round(weight_kg, 2)
    return round(weight_kg * (1 + reps / 30.0), 2)


def process_personal_records(
    db: Session,
    user_id: int,
    workout_log_id: int,
    set_logs: List[WorkoutSetLog]
) -> List[PRCelebrationOut]:
    """
    Check if any completed set sets a new Personal Record.
    Tracks maximum weight, maximum reps at given weight, and estimated 1RM.
    Returns list of PR celebration objects with previous and new values.
    """
    new_prs: List[PRCelebrationOut] = []
    now = datetime.now(timezone.utc)
    # Track best per exercise within this session to avoid false multi-set PRs
    session_best: Dict[int, Tuple[float, int]] = {}

    for s in set_logs:
        if not s.is_completed or not s.exercise_id:
            continue
        # Reject invalid/incomplete data
        if s.actual_weight_kg <= 0 or s.actual_reps <= 0:
            continue

        ex_id = s.exercise_id
        new_weight = s.actual_weight_kg
        new_reps = s.actual_reps
        new_1rm = calculate_estimated_1rm(new_weight, new_reps)

        # Only use the best performance per exercise within this session
        if ex_id in session_best:
            prev_w, prev_r = session_best[ex_id]
            prev_1rm = calculate_estimated_1rm(prev_w, prev_r)
            if new_1rm <= prev_1rm:
                continue
        session_best[ex_id] = (new_weight, new_reps)

    # Now compare session bests against stored PRs
    for ex_id, (new_weight, new_reps) in session_best.items():
        new_1rm = calculate_estimated_1rm(new_weight, new_reps)

        existing_pr = (
            db.query(PersonalRecord)
            .filter(
                PersonalRecord.user_id == user_id,
                PersonalRecord.exercise_id == ex_id
            )
            .first()
        )

        is_new_pr = False
        prev_weight_kg = None
        prev_reps = None
        pr_type = "MAX_WEIGHT"

        if not existing_pr:
            is_new_pr = True
            new_pr_obj = PersonalRecord(
                user_id=user_id,
                exercise_id=ex_id,
                weight_kg=new_weight,
                reps=new_reps,
                previous_weight_kg=None,
                previous_reps=None,
                estimated_1rm=new_1rm,
                pr_type="MAX_WEIGHT",
                achieved_at=now,
                workout_log_id=workout_log_id
            )
            db.add(new_pr_obj)
        else:
            existing_1rm = calculate_estimated_1rm(existing_pr.weight_kg, existing_pr.reps)
            # Check if this is genuinely a new PR
            if new_weight > existing_pr.weight_kg:
                pr_type = "MAX_WEIGHT"
                is_new_pr = True
            elif new_weight == existing_pr.weight_kg and new_reps > existing_pr.reps:
                pr_type = "MAX_REPS"
                is_new_pr = True
            elif new_1rm > existing_1rm:
                pr_type = "ESTIMATED_1RM"
                is_new_pr = True

            if is_new_pr:
                prev_weight_kg = existing_pr.weight_kg
                prev_reps = existing_pr.reps
                existing_pr.previous_weight_kg = existing_pr.weight_kg
                existing_pr.previous_reps = existing_pr.reps
                existing_pr.weight_kg = new_weight
                existing_pr.reps = new_reps
                existing_pr.estimated_1rm = new_1rm
                existing_pr.pr_type = pr_type
                existing_pr.achieved_at = now
                existing_pr.workout_log_id = workout_log_id

        if is_new_pr:
            # Get exercise name for the celebration
            set_for_exercise = next(
                (s for s in set_logs if s.exercise_id == ex_id), None
            )
            exercise_name = set_for_exercise.exercise_name if set_for_exercise else "Exercise"

            new_prs.append(
                PRCelebrationOut(
                    exercise_id=ex_id,
                    exercise_name=exercise_name,
                    weight_kg=new_weight,
                    reps=new_reps,
                    previous_weight_kg=prev_weight_kg,
                    previous_reps=prev_reps,
                    estimated_1rm=new_1rm,
                    pr_type=pr_type,
                    achieved_at=now,
                )
            )

    return new_prs


def advance_workout_progression(
    db: Session,
    user: User,
    completion_data: WorkoutCompletionRequest
) -> Dict[str, Any]:
    """
    CRITICAL BUSINESS RULE:
    1. Records the user's workout completion into WorkoutLog and WorkoutSetLog.
    2. Identifies and updates Personal Records (PRs) with previous comparisons.
    3. Calculates total training volume for this session.
    4. Advances current_day_order strictly to the next sequence item.
    5. Progression is never triggered by calendar days.
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
            rpe=s.rpe,
            notes=s.notes
        )
        db.add(set_log)
        set_records.append(set_log)

    db.flush()

    # Calculate total volume
    total_volume_kg = calculate_workout_volume(set_records)

    # Track Personal Records
    new_prs = process_personal_records(db, user.id, workout_log.id, set_records)

    # Sequence calculation: find all days in program
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
        "message": "Workout successfully completed and recorded.",
        "previous_day_order": workout_log.day_order_completed,
        "new_day_order": assignment.current_day_order,
        "is_program_completed": is_program_completed,
        "new_prs": new_prs,
        "total_volume_kg": total_volume_kg,
        "workout_log_id": workout_log.id,
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
