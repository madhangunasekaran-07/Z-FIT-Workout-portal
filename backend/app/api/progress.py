from typing import List, Optional
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.assignment import UserProgram
from app.models.program import Program, ProgramDay
from app.models.exercise import Exercise
from app.models.workout_log import WorkoutLog, WorkoutSetLog
from app.models.pr import PersonalRecord
from app.schemas.progress import (
    ProgressStatsOut,
    PersonalRecordOut,
    CompletionDataPoint,
    StrengthDataPoint,
    ConsistencyDataPoint,
    VolumeDataPoint,
    ExerciseHistoryOut,
    ExerciseProgressionPoint,
    ExerciseHistorySession,
    JourneyDayOut,
    StreakMetrics,
)
from app.services.progression import (
    get_active_user_program,
    calculate_due_date_status,
    calculate_user_streaks,
    calculate_streak_metrics,
    calculate_workout_volume,
    calculate_estimated_1rm,
)

router = APIRouter(prefix="/progress", tags=["Progress"])


def _build_pr_out(pr: PersonalRecord) -> PersonalRecordOut:
    return PersonalRecordOut(
        id=pr.id,
        exercise_id=pr.exercise_id,
        exercise_name=pr.exercise.name if pr.exercise else "Exercise",
        weight_kg=pr.weight_kg,
        reps=pr.reps,
        previous_weight_kg=getattr(pr, "previous_weight_kg", None),
        previous_reps=getattr(pr, "previous_reps", None),
        estimated_1rm=getattr(pr, "estimated_1rm", None),
        pr_type=getattr(pr, "pr_type", "MAX_WEIGHT") or "MAX_WEIGHT",
        achieved_at=pr.achieved_at,
    )


@router.get("", response_model=ProgressStatsOut)
def get_progress_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = get_active_user_program(db, current_user.id)
    logs = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == current_user.id)
        .order_by(desc(WorkoutLog.completed_at))
        .all()
    )
    prs = (
        db.query(PersonalRecord)
        .filter(PersonalRecord.user_id == current_user.id)
        .order_by(desc(PersonalRecord.achieved_at))
        .all()
    )

    streak_metrics = calculate_streak_metrics(db, current_user.id)
    current_streak = streak_metrics["current_streak"]
    longest_streak = streak_metrics["longest_streak"]
    workouts_this_week = streak_metrics["workouts_this_week"]
    workouts_this_month = streak_metrics["workouts_this_month"]

    # Calculate total training volume from all completed set logs
    all_set_logs = (
        db.query(WorkoutSetLog)
        .join(WorkoutLog, WorkoutSetLog.workout_log_id == WorkoutLog.id)
        .filter(WorkoutLog.user_id == current_user.id)
        .all()
    )
    total_volume = calculate_workout_volume(all_set_logs)

    # Build weekly completion chart (past 4 weeks, real data)
    today = date.today()
    completion_data = []
    week_targets = [4, 4, 4, 4]
    for w in range(4, 0, -1):
        start_w = today - timedelta(days=w * 7)
        end_w = today - timedelta(days=(w - 1) * 7)
        count_in_week = sum(
            1 for log in logs
            if start_w <= log.completed_at.date() < end_w
            and log.day_type != "REST"
        )
        target = week_targets[4 - w]
        rate = min(round((count_in_week / target) * 100), 100) if count_in_week > 0 else 0
        completion_data.append(
            CompletionDataPoint(
                week_label=f"Week {5 - w}",
                completion_rate=rate,
                completed_count=count_in_week,
                target_count=target
            )
        )

    # Build volume chart (past 6 weeks)
    volume_chart = []
    for w in range(6, 0, -1):
        start_w = today - timedelta(days=w * 7)
        end_w = today - timedelta(days=(w - 1) * 7)
        week_logs = [
            log for log in logs
            if start_w <= log.completed_at.date() < end_w
        ]
        week_sets = []
        for wl in week_logs:
            week_sets.extend(wl.sets)
        week_volume = calculate_workout_volume(week_sets)
        workout_count = len([l for l in week_logs if l.day_type != "REST"])
        volume_chart.append(
            VolumeDataPoint(
                period_label=f"Week {7 - w}",
                volume_kg=week_volume,
                workouts_count=workout_count
            )
        )

    # Build Strength progression chart data (from actual logs)
    strength_data = []
    for log in reversed(logs[-8:]):
        date_str = log.completed_at.strftime("%b %d")
        for s in log.sets:
            if s.is_completed and s.actual_weight_kg > 0:
                strength_data.append(
                    StrengthDataPoint(
                        date_label=date_str,
                        exercise_name=s.exercise_name,
                        weight_kg=s.actual_weight_kg
                    )
                )

    # Build consistency chart by day of week
    days_map = {"Mon": 0, "Tue": 0, "Wed": 0, "Thu": 0, "Fri": 0, "Sat": 0, "Sun": 0}
    day_abbrs = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for log in logs:
        weekday_idx = log.completed_at.weekday()
        days_map[day_abbrs[weekday_idx]] += 1

    consistency_data = [
        ConsistencyDataPoint(day_name=k, workouts_count=v) for k, v in days_map.items()
    ]

    # If no active assignment, check for any latest assignment
    if not assignment:
        latest = (
            db.query(UserProgram)
            .filter(UserProgram.user_id == current_user.id)
            .order_by(desc(UserProgram.assigned_at))
            .first()
        )
        if latest and latest.program:
            prog = latest.program
            total_days = len(prog.days)
            completed_count = len(logs)
            pct = round((completed_count / total_days) * 100, 1) if total_days > 0 else 0.0
            days_rem, status_str = calculate_due_date_status(latest.due_date, latest.status)
            return ProgressStatsOut(
                has_assignment=True,
                program_name=prog.name,
                level_name=prog.level.name if prog.level else None,
                overall_completion_percent=min(pct, 100.0),
                total_program_days=total_days,
                completed_workouts=completed_count,
                remaining_workouts=max(0, total_days - completed_count),
                current_workout_day=latest.current_day_order,
                current_streak=current_streak,
                longest_streak=longest_streak,
                workouts_this_week=workouts_this_week,
                workouts_this_month=workouts_this_month,
                total_training_volume_kg=total_volume,
                due_date=latest.due_date,
                days_remaining=days_rem,
                status=status_str,
                personal_records=[_build_pr_out(p) for p in prs],
                completion_chart=completion_data,
                strength_chart=strength_data,
                consistency_chart=consistency_data,
                volume_chart=volume_chart,
                recent_history=logs[:5],
            )

        return ProgressStatsOut(
            has_assignment=False,
            current_streak=current_streak,
            longest_streak=longest_streak,
            workouts_this_week=workouts_this_week,
            workouts_this_month=workouts_this_month,
            total_training_volume_kg=total_volume,
            status="NO_PROGRAM",
            personal_records=[_build_pr_out(p) for p in prs],
            completion_chart=completion_data,
            consistency_chart=consistency_data,
            volume_chart=volume_chart,
            recent_history=logs[:5],
        )

    program = assignment.program
    total_days = len(program.days) if program and program.days else 0
    completed_count = db.query(WorkoutLog).filter(
        WorkoutLog.user_id == current_user.id,
        WorkoutLog.user_program_id == assignment.id
    ).count()

    overall_pct = round((completed_count / total_days * 100), 1) if total_days > 0 else 0.0
    days_rem, status_str = calculate_due_date_status(assignment.due_date, assignment.status)

    return ProgressStatsOut(
        has_assignment=True,
        program_name=program.name if program else None,
        level_name=program.level.name if program and program.level else None,
        overall_completion_percent=min(overall_pct, 100.0),
        total_program_days=total_days,
        completed_workouts=completed_count,
        remaining_workouts=max(0, total_days - completed_count),
        current_workout_day=assignment.current_day_order,
        current_streak=current_streak,
        longest_streak=longest_streak,
        workouts_this_week=workouts_this_week,
        workouts_this_month=workouts_this_month,
        total_training_volume_kg=total_volume,
        due_date=assignment.due_date,
        days_remaining=days_rem,
        status=status_str,
        personal_records=[_build_pr_out(p) for p in prs],
        completion_chart=completion_data,
        strength_chart=strength_data,
        consistency_chart=consistency_data,
        volume_chart=volume_chart,
        recent_history=logs[:5],
    )


@router.get("/journey", response_model=List[JourneyDayOut])
def get_workout_journey(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    assignment = get_active_user_program(db, current_user.id)
    if not assignment or not assignment.program:
        # Check latest completed assignment
        assignment = (
            db.query(UserProgram)
            .filter(UserProgram.user_id == current_user.id)
            .order_by(desc(UserProgram.assigned_at))
            .first()
        )
        if not assignment or not assignment.program:
            return []

    program = assignment.program
    days_sorted = sorted(program.days, key=lambda d: d.day_order)

    # Get completion logs map by day_order
    logs = (
        db.query(WorkoutLog)
        .filter(
            WorkoutLog.user_id == current_user.id,
            WorkoutLog.user_program_id == assignment.id
        )
        .all()
    )
    completed_days_map = {l.day_order_completed: l.completed_at for l in logs}

    journey = []
    for d in days_sorted:
        is_completed = (d.day_order in completed_days_map) or (d.day_order < assignment.current_day_order)
        is_current = (d.day_order == assignment.current_day_order and assignment.status != "COMPLETED")

        if is_completed:
            day_status = "COMPLETED"
        elif is_current:
            day_status = "CURRENT"
        else:
            day_status = "UPCOMING"

        journey.append(
            JourneyDayOut(
                day_order=d.day_order,
                day_name=d.name,
                day_type=d.day_type,
                is_rest_day=d.is_rest_day,
                status=day_status,
                completed_at=completed_days_map.get(d.day_order),
                exercises_count=len(d.exercises),
                duration_minutes=d.estimated_duration_minutes
            )
        )

    return journey


@router.get("/exercises", response_model=List[dict])
def get_logged_exercises(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return list of exercises this user has logged, for dropdown selection."""
    rows = (
        db.query(WorkoutSetLog.exercise_id, WorkoutSetLog.exercise_name)
        .join(WorkoutLog, WorkoutSetLog.workout_log_id == WorkoutLog.id)
        .filter(WorkoutLog.user_id == current_user.id, WorkoutSetLog.exercise_id.isnot(None))
        .distinct()
        .all()
    )
    result = []
    for row in rows:
        ex = db.query(Exercise).filter(Exercise.id == row.exercise_id).first()
        result.append({
            "exercise_id": row.exercise_id,
            "exercise_name": row.exercise_name,
            "muscle_group": ex.muscle_group if ex else None,
            "equipment": ex.equipment if ex else None,
        })
    return result


@router.get("/exercise-history/{exercise_id}", response_model=ExerciseHistoryOut)
def get_exercise_history(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return full chronological history for a specific exercise for this user."""
    exercise = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")

    # Get all set logs for this exercise for this user
    set_logs = (
        db.query(WorkoutSetLog)
        .join(WorkoutLog, WorkoutSetLog.workout_log_id == WorkoutLog.id)
        .filter(
            WorkoutLog.user_id == current_user.id,
            WorkoutSetLog.exercise_id == exercise_id,
            WorkoutSetLog.is_completed == True,
            WorkoutSetLog.actual_weight_kg > 0,
        )
        .order_by(WorkoutLog.completed_at)
        .all()
    )

    # Get PR for this exercise
    pr = (
        db.query(PersonalRecord)
        .filter(PersonalRecord.user_id == current_user.id, PersonalRecord.exercise_id == exercise_id)
        .first()
    )
    current_pr = _build_pr_out(pr) if pr else None

    # Group by workout log
    log_id_to_sets: dict = {}
    log_id_to_log: dict = {}
    for sl in set_logs:
        wl = sl.workout_log
        if wl:
            log_id_to_log[sl.workout_log_id] = wl
            log_id_to_sets.setdefault(sl.workout_log_id, []).append(sl)

    # Build progression points and sessions
    progression_points: List[ExerciseProgressionPoint] = []
    sessions: List[ExerciseHistorySession] = []

    # Track running PR to flag PRs in history
    running_best_1rm = 0.0

    for log_id in sorted(log_id_to_sets.keys(), key=lambda lid: log_id_to_log[lid].completed_at):
        wl = log_id_to_log[log_id]
        s_list = log_id_to_sets[log_id]

        # Best set in this session
        best_set = max(s_list, key=lambda s: calculate_estimated_1rm(s.actual_weight_kg, s.actual_reps))
        best_weight = best_set.actual_weight_kg
        best_reps = best_set.actual_reps
        session_1rm = calculate_estimated_1rm(best_weight, best_reps)
        session_volume = sum(s.actual_weight_kg * s.actual_reps for s in s_list if s.actual_reps > 0)

        is_pr = session_1rm > running_best_1rm
        if is_pr:
            running_best_1rm = session_1rm

        dt_label = wl.completed_at.strftime("%b %d")
        progression_points.append(
            ExerciseProgressionPoint(
                date_label=dt_label,
                date=wl.completed_at.date(),
                weight_kg=best_weight,
                reps=best_reps,
                volume_kg=round(session_volume, 2),
                estimated_1rm=session_1rm,
                workout_name=wl.day_name,
                is_pr=is_pr,
            )
        )
        sessions.append(
            ExerciseHistorySession(
                log_id=log_id,
                date=wl.completed_at.date(),
                date_label=dt_label,
                workout_name=wl.day_name,
                day_type=wl.day_type,
                sets_count=len(s_list),
                best_weight_kg=best_weight,
                best_reps=best_reps,
                total_volume_kg=round(session_volume, 2),
                is_pr=is_pr,
            )
        )

    return ExerciseHistoryOut(
        exercise_id=exercise_id,
        exercise_name=exercise.name,
        muscle_group=exercise.muscle_group,
        equipment=exercise.equipment,
        sessions_count=len(sessions),
        current_pr=current_pr,
        progression_points=progression_points,
        sessions=list(reversed(sessions)),  # Most recent first
    )


@router.get("/prs", response_model=List[PersonalRecordOut])
def get_personal_records(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return all personal records for current user."""
    prs = (
        db.query(PersonalRecord)
        .filter(PersonalRecord.user_id == current_user.id)
        .order_by(desc(PersonalRecord.achieved_at))
        .all()
    )
    return [_build_pr_out(p) for p in prs]


@router.get("/streak", response_model=StreakMetrics)
def get_streak_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return workout streak metrics (current streak, longest streak, weekly/monthly counts)."""
    metrics = calculate_streak_metrics(db, current_user.id)
    return StreakMetrics(
        current_streak=metrics["current_streak"],
        longest_streak=metrics["longest_streak"],
        total_completed_workouts=metrics["total_completed_workouts"],
        workouts_this_week=metrics["workouts_this_week"],
        workouts_this_month=metrics["workouts_this_month"],
    )

