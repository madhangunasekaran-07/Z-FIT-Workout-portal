from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.assignment import UserProgram
from app.models.program import Program, ProgramDay, ProgramExercise
from app.models.workout_log import WorkoutLog, WorkoutSetLog
from app.models.pr import PersonalRecord
from app.schemas.workout import (
    CurrentWorkoutOut,
    WorkoutExerciseTarget,
    WorkoutCompletionRequest,
    WorkoutCompletionResponse,
    WorkoutLogOut,
)
from app.services.progression import (
    get_active_user_program,
    calculate_due_date_status,
    calculate_user_streaks,
    calculate_workout_volume,
    advance_workout_progression,
    advance_rest_day,
)

router = APIRouter(prefix="/workouts", tags=["Workouts"])


def _enrich_log(log: WorkoutLog) -> WorkoutLogOut:
    """Build a WorkoutLogOut with computed total_volume_kg and exercises_completed_count."""
    volume = calculate_workout_volume(log.sets)
    exercise_names = {s.exercise_name for s in log.sets if s.is_completed}
    return WorkoutLogOut(
        id=log.id,
        user_id=log.user_id,
        user_program_id=log.user_program_id,
        program_day_id=log.program_day_id,
        day_order_completed=log.day_order_completed,
        day_name=log.day_name,
        day_type=log.day_type,
        started_at=log.started_at,
        completed_at=log.completed_at,
        duration_seconds=log.duration_seconds,
        notes=log.notes,
        sets=log.sets,
        total_volume_kg=volume,
        exercises_completed_count=len(exercise_names),
    )


@router.get("/current", response_model=CurrentWorkoutOut)
def get_current_workout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = get_active_user_program(db, current_user.id)
    if not assignment:
        # Check if user has a completed assignment
        completed_assignment = (
            db.query(UserProgram)
            .filter(UserProgram.user_id == current_user.id)
            .order_by(desc(UserProgram.assigned_at))
            .first()
        )
        if completed_assignment and completed_assignment.status == "COMPLETED":
            days_rem, status_str = calculate_due_date_status(
                completed_assignment.due_date,
                completed_assignment.status
            )
            curr_streak, _ = calculate_user_streaks(db, current_user.id)
            total_days = len(completed_assignment.program.days) if completed_assignment.program else 0
            completed_logs = db.query(WorkoutLog).filter(
                WorkoutLog.user_id == current_user.id,
                WorkoutLog.user_program_id == completed_assignment.id
            ).count()
            return CurrentWorkoutOut(
                has_assignment=False,
                is_program_completed=True,
                assignment_status="COMPLETED",
                program_id=completed_assignment.program_id,
                program_name=completed_assignment.program.name if completed_assignment.program else None,
                level_name=completed_assignment.program.level.name if (completed_assignment.program and completed_assignment.program.level) else None,
                total_program_days=total_days,
                completed_days_count=max(total_days, completed_logs),
                days_remaining=days_rem,
                current_streak=curr_streak,
                notes="Congratulations! You have completed all scheduled workouts in this program."
            )
        elif completed_assignment:
            days_rem, status_str = calculate_due_date_status(
                completed_assignment.due_date,
                completed_assignment.status
            )
            return CurrentWorkoutOut(
                has_assignment=False,
                is_program_completed=False,
                assignment_status=completed_assignment.status,
                program_name=completed_assignment.program.name if completed_assignment.program else None,
                total_program_days=len(completed_assignment.program.days) if completed_assignment.program else 0,
                completed_days_count=len(completed_assignment.program.days) if completed_assignment.program else 0,
                days_remaining=days_rem,
                notes="No active program assignment. Check completed history or contact admin."
            )
        return CurrentWorkoutOut(
            has_assignment=False,
            is_program_completed=False,
            assignment_status="NO_PROGRAM",
            notes="No workout program has been assigned to your account yet. Please contact your coach/admin."
        )

    program = db.query(Program).filter(Program.id == assignment.program_id).first()
    if not program or not program.days:
        return CurrentWorkoutOut(
            has_assignment=False,
            is_program_completed=False,
            assignment_status="EMPTY_PROGRAM",
            notes="Assigned program contains no scheduled days."
        )

    days_sorted = sorted(program.days, key=lambda d: d.day_order)
    total_days = len(days_sorted)

    # Calculate days completed
    completed_days_count = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == current_user.id,
        WorkoutLog.user_program_id == assignment.id
    ).count()

    days_rem, due_status = calculate_due_date_status(assignment.due_date, assignment.status)
    curr_streak, _ = calculate_user_streaks(db, current_user.id)

    # Find the current program day
    current_day = next((d for d in days_sorted if d.day_order == assignment.current_day_order), None)
    if not current_day:
        # User has exceeded all days in program
        assignment.status = "COMPLETED"
        assignment.completed_at = datetime.now(timezone.utc)
        db.commit()
        return CurrentWorkoutOut(
            has_assignment=False,
            is_program_completed=True,
            program_id=program.id,
            program_name=program.name,
            level_name=program.level.name if program.level else None,
            total_program_days=total_days,
            completed_days_count=total_days,
            start_date=assignment.start_date,
            due_date=assignment.due_date,
            days_remaining=days_rem,
            assignment_status="COMPLETED",
            current_streak=curr_streak,
            notes="Congratulations! You have completed all scheduled workouts in this program."
        )

    # Build target exercises with PR info
    exercise_targets = []
    if not current_day.is_rest_day:
        for pe in current_day.exercises:
            ex = pe.exercise
            if not ex:
                continue
            pr = db.query(PersonalRecord).filter(
                PersonalRecord.user_id == current_user.id,
                PersonalRecord.exercise_id == ex.id
            ).first()

            exercise_targets.append(
                WorkoutExerciseTarget(
                    exercise_id=ex.id,
                    name=ex.name,
                    muscle_group=ex.muscle_group,
                    equipment=ex.equipment,
                    exercise_order=pe.exercise_order,
                    target_sets=pe.target_sets,
                    target_reps=pe.target_reps,
                    rest_seconds=pe.rest_seconds,
                    instructions=ex.instructions,
                    media_url=ex.media_url,
                    notes=pe.notes,
                    previous_best_weight=pr.weight_kg if pr else None
                )
            )

    return CurrentWorkoutOut(
        has_assignment=True,
        program_id=program.id,
        program_name=program.name,
        level_name=program.level.name if program.level else None,
        day_id=current_day.id,
        day_order=current_day.day_order,
        day_name=current_day.name,
        day_type=current_day.day_type,
        is_rest_day=current_day.is_rest_day,
        estimated_duration_minutes=current_day.estimated_duration_minutes,
        exercises=exercise_targets,
        total_program_days=total_days,
        completed_days_count=completed_days_count,
        start_date=assignment.start_date,
        due_date=assignment.due_date,
        days_remaining=days_rem,
        assignment_status=due_status,
        current_streak=curr_streak,
        notes=current_day.notes
    )


@router.post("/complete", response_model=WorkoutCompletionResponse)
def complete_workout(
    completion_data: WorkoutCompletionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = get_active_user_program(db, current_user.id)
    if not assignment or assignment.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active workout program found to complete. The program may already be completed or not yet assigned."
        )
    if completion_data.day_order is None:
        completion_data.day_order = assignment.current_day_order

    try:
        result = advance_workout_progression(db, current_user, completion_data)
        return WorkoutCompletionResponse(
            message=result["message"],
            previous_day_order=result["previous_day_order"],
            new_day_order=result["new_day_order"],
            is_program_completed=result["is_program_completed"],
            new_prs=result["new_prs"],
            total_volume_kg=result["total_volume_kg"],
            workout_log_id=result["workout_log_id"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/advance-rest")
def complete_rest_day(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        result = advance_rest_day(db, current_user)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/history", response_model=List[WorkoutLogOut])
def get_workout_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == current_user.id)
        .order_by(desc(WorkoutLog.completed_at))
        .all()
    )
    return [_enrich_log(log) for log in logs]


@router.get("/{log_id}", response_model=WorkoutLogOut)
def get_workout_log_detail(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    log = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.id == log_id, WorkoutLog.user_id == current_user.id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Workout record not found")
    return _enrich_log(log)
