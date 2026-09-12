from typing import List, Optional
from datetime import datetime, timezone, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.core.deps import get_db, require_admin
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.level import Level
from app.models.exercise import Exercise
from app.models.program import Program, ProgramDay, ProgramExercise
from app.models.assignment import UserProgram
from app.models.workout_log import WorkoutLog, WorkoutSetLog
from app.models.pr import PersonalRecord
from app.schemas.user import UserCreate, UserUpdate, CustomerDetailOut
from app.schemas.exercise import ExerciseCreate, ExerciseUpdate, ExerciseOut, LevelCreate, LevelUpdate, LevelOut
from app.schemas.program import (
    ProgramCreate,
    ProgramUpdate,
    ProgramOut,
    ProgramDetailOut,
    AssignProgramRequest,
    ResetProgressRequest
)
from app.schemas.admin import AdminDashboardStatsOut, RecentActivityItem, AdminAnalyticsOut, PopularExerciseItem, ActiveCustomerItem, VolumeDataPoint
from app.services.progression import calculate_due_date_status, calculate_user_streaks, calculate_workout_volume, calculate_streak_metrics

router = APIRouter(prefix="/admin", tags=["Admin"], dependencies=[Depends(require_admin)])

# ==================== 1. DASHBOARD STATS ====================

@router.get("/stats", response_model=AdminDashboardStatsOut)
def get_admin_stats(db: Session = Depends(get_db)):
    total_customers = db.query(User).filter(User.role == UserRole.CUSTOMER).count()
    active_customers = db.query(User).filter(User.role == UserRole.CUSTOMER, User.is_active == True).count()
    active_programs = db.query(Program).filter(Program.is_active == True).count()

    today = date.today()
    completed_today = db.query(WorkoutLog).filter(
        func.date(WorkoutLog.completed_at) == today
    ).count()

    soon_due = today + timedelta(days=5)
    expiring_soon = db.query(UserProgram).filter(
        UserProgram.status == "ACTIVE",
        UserProgram.due_date <= soon_due,
        UserProgram.due_date >= today
    ).count()

    # Recent activities
    recent_logs = (
        db.query(WorkoutLog)
        .order_by(desc(WorkoutLog.completed_at))
        .limit(6)
        .all()
    )
    activities = []
    for log in recent_logs:
        u = log.user
        name = u.full_name if u else "Customer"
        email = u.email if u else ""
        activities.append(
            RecentActivityItem(
                id=f"log-{log.id}",
                user_name=name,
                user_email=email,
                action_type="WORKOUT_COMPLETED",
                description=f"{name} completed {log.day_name} ({log.day_type})",
                timestamp=log.completed_at
            )
        )

    # Add recent user registrations
    recent_users = (
        db.query(User)
        .filter(User.role == UserRole.CUSTOMER)
        .order_by(desc(User.created_at))
        .limit(3)
        .all()
    )
    for u in recent_users:
        activities.append(
            RecentActivityItem(
                id=f"user-{u.id}",
                user_name=u.full_name,
                user_email=u.email,
                action_type="USER_REGISTERED",
                description=f"New customer registered: {u.full_name}",
                timestamp=u.created_at
            )
        )

    activities.sort(key=lambda a: a.timestamp, reverse=True)

    return AdminDashboardStatsOut(
        total_customers=total_customers,
        active_customers=active_customers,
        active_programs=active_programs,
        completed_workouts_today=completed_today,
        programs_expiring_soon=expiring_soon,
        recent_activities=activities[:10]
    )

# ==================== 2. CUSTOMER MANAGEMENT ====================

@router.get("/customers", response_model=List[CustomerDetailOut])
def list_customers(db: Session = Depends(get_db)):
    customers = (
        db.query(User)
        .filter(User.role == UserRole.CUSTOMER)
        .order_by(desc(User.created_at))
        .all()
    )
    result = []
    for c in customers:
        active_assignment = (
            db.query(UserProgram)
            .filter(UserProgram.user_id == c.id, UserProgram.status == "ACTIVE")
            .order_by(desc(UserProgram.assigned_at))
            .first()
        )
        if not active_assignment:
            active_assignment = (
                db.query(UserProgram)
                .filter(UserProgram.user_id == c.id)
                .order_by(desc(UserProgram.assigned_at))
                .first()
            )

        completed_count = db.query(WorkoutLog).filter(WorkoutLog.user_id == c.id).count()
        curr_streak, long_streak = calculate_user_streaks(db, c.id)

        prog_id = active_assignment.program_id if active_assignment else None
        prog_name = active_assignment.program.name if (active_assignment and active_assignment.program) else None
        curr_day = active_assignment.current_day_order if active_assignment else None
        tot_days = len(active_assignment.program.days) if (active_assignment and active_assignment.program) else None
        s_date = active_assignment.start_date if active_assignment else None
        d_date = active_assignment.due_date if active_assignment else None
        a_status = active_assignment.status if active_assignment else None

        result.append(
            CustomerDetailOut(
                id=c.id,
                email=c.email,
                full_name=c.full_name,
                role=c.role,
                is_active=c.is_active,
                level_id=c.level_id,
                level_name=c.level.name if c.level else None,
                created_at=c.created_at,
                assigned_program_id=prog_id,
                assigned_program_name=prog_name,
                current_day_order=curr_day,
                total_days=tot_days,
                start_date=s_date,
                due_date=d_date,
                assignment_status=a_status,
                completed_workouts_count=completed_count,
                current_streak=curr_streak,
                longest_streak=long_streak
            )
        )
    return result

@router.post("/customers", response_model=CustomerDetailOut)
def create_customer(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Customer email already registered")

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=UserRole.CUSTOMER,
        is_active=user_in.is_active,
        level_id=user_in.level_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return CustomerDetailOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        level_id=user.level_id,
        level_name=user.level.name if user.level else None,
        created_at=user.created_at
    )

@router.get("/customers/{user_id}")
def get_customer_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.CUSTOMER).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    active_assignment = (
        db.query(UserProgram)
        .filter(UserProgram.user_id == user.id)
        .order_by(desc(UserProgram.assigned_at))
        .first()
    )
    logs = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == user.id)
        .order_by(desc(WorkoutLog.completed_at))
        .all()
    )
    prs = (
        db.query(PersonalRecord)
        .filter(PersonalRecord.user_id == user.id)
        .all()
    )
    curr_streak, long_streak = calculate_user_streaks(db, user.id)

    return {
        "customer": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "level_id": user.level_id,
            "level_name": user.level.name if user.level else None,
            "created_at": user.created_at
        },
        "assignment": {
            "id": active_assignment.id if active_assignment else None,
            "program_id": active_assignment.program_id if active_assignment else None,
            "program_name": active_assignment.program.name if (active_assignment and active_assignment.program) else None,
            "current_day_order": active_assignment.current_day_order if active_assignment else 1,
            "total_days": len(active_assignment.program.days) if (active_assignment and active_assignment.program) else 0,
            "start_date": active_assignment.start_date if active_assignment else None,
            "due_date": active_assignment.due_date if active_assignment else None,
            "status": active_assignment.status if active_assignment else None,
        } if active_assignment else None,
        "stats": {
            "completed_workouts_count": len(logs),
            "current_streak": curr_streak,
            "longest_streak": long_streak
        },
        "personal_records": [
            {
                "id": p.id,
                "exercise_id": p.exercise_id,
                "exercise_name": p.exercise.name if p.exercise else "Exercise",
                "weight_kg": p.weight_kg,
                "reps": p.reps,
                "achieved_at": p.achieved_at
            } for p in prs
        ],
        "workout_logs": [
            {
                "id": l.id,
                "day_name": l.day_name,
                "day_type": l.day_type,
                "day_order_completed": l.day_order_completed,
                "completed_at": l.completed_at,
                "duration_seconds": l.duration_seconds,
                "notes": l.notes,
                "sets_count": len(l.sets)
            } for l in logs
        ]
    }

@router.put("/customers/{user_id}")
def update_customer(user_id: int, user_update: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    if user_update.full_name is not None:
        user.full_name = user_update.full_name
    if user_update.email is not None:
        user.email = user_update.email
    if user_update.level_id is not None:
        user.level_id = user_update.level_id
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    if user_update.password:
        user.hashed_password = get_password_hash(user_update.password)

    db.commit()
    db.refresh(user)
    return {"message": "Customer updated successfully", "user_id": user.id}

@router.post("/customers/{user_id}/assign-program")
def assign_program(user_id: int, req: AssignProgramRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")

    program = db.query(Program).filter(Program.id == req.program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Program not found")

    # Deactivate existing active programs
    existing_assignments = db.query(UserProgram).filter(
        UserProgram.user_id == user_id,
        UserProgram.status == "ACTIVE"
    ).all()
    for ea in existing_assignments:
        ea.status = "PAUSED"

    new_assignment = UserProgram(
        user_id=user_id,
        program_id=req.program_id,
        start_date=req.start_date,
        due_date=req.due_date,
        current_day_order=req.start_day_order,
        status="ACTIVE"
    )
    db.add(new_assignment)

    # Sync user level if program has level
    if program.level_id:
        user.level_id = program.level_id

    db.commit()
    db.refresh(new_assignment)

    return {
        "message": f"Program '{program.name}' assigned to {user.full_name}.",
        "assignment_id": new_assignment.id,
        "current_day_order": new_assignment.current_day_order
    }

@router.post("/customers/{user_id}/reset-progress")
def reset_customer_progress(user_id: int, req: ResetProgressRequest, db: Session = Depends(get_db)):
    assignment = (
        db.query(UserProgram)
        .filter(UserProgram.user_id == user_id, UserProgram.status == "ACTIVE")
        .order_by(desc(UserProgram.assigned_at))
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="No active program assignment found to reset")

    assignment.current_day_order = req.new_day_order
    db.commit()
    return {
        "message": f"Customer progress reset to Day {req.new_day_order}.",
        "current_day_order": assignment.current_day_order
    }

@router.put("/customers/{user_id}/toggle-status")
def toggle_customer_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Customer not found")
    user.is_active = not user.is_active
    db.commit()
    return {"message": "Customer status changed", "is_active": user.is_active}

# ==================== 3. PROGRAM MANAGEMENT & SPLIT BUILDER ====================

@router.get("/programs", response_model=List[ProgramOut])
def list_programs(db: Session = Depends(get_db)):
    programs = db.query(Program).order_by(desc(Program.created_at)).all()
    result = []
    for p in programs:
        result.append(
            ProgramOut(
                id=p.id,
                name=p.name,
                description=p.description,
                level_id=p.level_id,
                level_name=p.level.name if p.level else None,
                is_active=p.is_active,
                created_at=p.created_at,
                days_count=len(p.days)
            )
        )
    return result

@router.post("/programs", response_model=ProgramDetailOut)
def create_program(prog_in: ProgramCreate, db: Session = Depends(get_db)):
    prog = Program(
        name=prog_in.name,
        description=prog_in.description,
        level_id=prog_in.level_id,
        is_active=prog_in.is_active
    )
    db.add(prog)
    db.flush()

    for d in prog_in.days:
        day_model = ProgramDay(
            program_id=prog.id,
            day_order=d.day_order,
            name=d.name,
            day_type=d.day_type,
            is_rest_day=d.is_rest_day,
            estimated_duration_minutes=d.estimated_duration_minutes,
            notes=d.notes
        )
        db.add(day_model)
        db.flush()

        for pe in d.exercises:
            pe_model = ProgramExercise(
                program_day_id=day_model.id,
                exercise_id=pe.exercise_id,
                exercise_order=pe.exercise_order,
                target_sets=pe.target_sets,
                target_reps=pe.target_reps,
                rest_seconds=pe.rest_seconds,
                notes=pe.notes
            )
            db.add(pe_model)

    db.commit()
    db.refresh(prog)
    return prog

@router.get("/programs/{prog_id}", response_model=ProgramDetailOut)
def get_program(prog_id: int, db: Session = Depends(get_db)):
    prog = db.query(Program).filter(Program.id == prog_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    return prog

@router.put("/programs/{prog_id}", response_model=ProgramDetailOut)
def update_program(prog_id: int, prog_update: ProgramUpdate, db: Session = Depends(get_db)):
    prog = db.query(Program).filter(Program.id == prog_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")

    if prog_update.name is not None:
        prog.name = prog_update.name
    if prog_update.description is not None:
        prog.description = prog_update.description
    if prog_update.level_id is not None:
        prog.level_id = prog_update.level_id
    if prog_update.is_active is not None:
        prog.is_active = prog_update.is_active

    # If days are updated, rebuild the program days
    if prog_update.days is not None:
        # Delete old days
        for old_day in list(prog.days):
            db.delete(old_day)
        db.flush()

        for d in prog_update.days:
            day_model = ProgramDay(
                program_id=prog.id,
                day_order=d.day_order,
                name=d.name,
                day_type=d.day_type,
                is_rest_day=d.is_rest_day,
                estimated_duration_minutes=d.estimated_duration_minutes,
                notes=d.notes
            )
            db.add(day_model)
            db.flush()

            for pe in d.exercises:
                pe_model = ProgramExercise(
                    program_day_id=day_model.id,
                    exercise_id=pe.exercise_id,
                    exercise_order=pe.exercise_order,
                    target_sets=pe.target_sets,
                    target_reps=pe.target_reps,
                    rest_seconds=pe.rest_seconds,
                    notes=pe.notes
                )
                db.add(pe_model)

    db.commit()
    db.refresh(prog)
    return prog

@router.delete("/programs/{prog_id}")
def delete_program(prog_id: int, db: Session = Depends(get_db)):
    prog = db.query(Program).filter(Program.id == prog_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    prog.is_active = False
    db.commit()
    return {"message": "Program deactivated successfully"}

@router.post("/programs/{prog_id}/duplicate")
def duplicate_program(prog_id: int, db: Session = Depends(get_db)):
    original = db.query(Program).filter(Program.id == prog_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Program not found")

    new_prog = Program(
        name=f"{original.name} (Copy)",
        description=original.description,
        level_id=original.level_id,
        is_active=True
    )
    db.add(new_prog)
    db.flush()

    for d in original.days:
        new_day = ProgramDay(
            program_id=new_prog.id,
            day_order=d.day_order,
            name=d.name,
            day_type=d.day_type,
            is_rest_day=d.is_rest_day,
            estimated_duration_minutes=d.estimated_duration_minutes,
            notes=d.notes
        )
        db.add(new_day)
        db.flush()

        for pe in d.exercises:
            new_pe = ProgramExercise(
                program_day_id=new_day.id,
                exercise_id=pe.exercise_id,
                exercise_order=pe.exercise_order,
                target_sets=pe.target_sets,
                target_reps=pe.target_reps,
                rest_seconds=pe.rest_seconds,
                notes=pe.notes
            )
            db.add(new_pe)

    db.commit()
    db.refresh(new_prog)
    return {"message": "Program duplicated successfully", "new_program_id": new_prog.id}

# ==================== 4. LEVEL MANAGEMENT ====================

@router.get("/levels", response_model=List[LevelOut])
def list_levels(db: Session = Depends(get_db)):
    levels = db.query(Level).order_by(Level.id).all()
    result = []
    for l in levels:
        result.append(
            LevelOut(
                id=l.id,
                name=l.name,
                description=l.description,
                created_at=l.created_at,
                programs_count=len(l.programs),
                users_count=len(l.users)
            )
        )
    return result

@router.post("/levels", response_model=LevelOut)
def create_level(level_in: LevelCreate, db: Session = Depends(get_db)):
    existing = db.query(Level).filter(Level.name.ilike(level_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="A level with this name already exists")
    lvl = Level(name=level_in.name, description=level_in.description)
    db.add(lvl)
    db.commit()
    db.refresh(lvl)
    return LevelOut(
        id=lvl.id,
        name=lvl.name,
        description=lvl.description,
        created_at=lvl.created_at,
        programs_count=0,
        users_count=0
    )

@router.put("/levels/{level_id}", response_model=LevelOut)
def update_level(level_id: int, level_in: LevelUpdate, db: Session = Depends(get_db)):
    lvl = db.query(Level).filter(Level.id == level_id).first()
    if not lvl:
        raise HTTPException(status_code=404, detail="Level not found")
    if level_in.name is not None:
        lvl.name = level_in.name
    if level_in.description is not None:
        lvl.description = level_in.description
    db.commit()
    db.refresh(lvl)
    return LevelOut(
        id=lvl.id,
        name=lvl.name,
        description=lvl.description,
        created_at=lvl.created_at,
        programs_count=len(lvl.programs),
        users_count=len(lvl.users)
    )

@router.delete("/levels/{level_id}")
def delete_level(level_id: int, db: Session = Depends(get_db)):
    lvl = db.query(Level).filter(Level.id == level_id).first()
    if not lvl:
        raise HTTPException(status_code=404, detail="Level not found")
    if lvl.programs or lvl.users:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete level while it is still linked to active programs or users"
        )
    db.delete(lvl)
    db.commit()
    return {"message": "Level deleted successfully"}

# ==================== 5. EXERCISE MANAGEMENT ====================

@router.get("/exercises", response_model=List[ExerciseOut])
def admin_list_exercises(db: Session = Depends(get_db)):
    return db.query(Exercise).order_by(Exercise.name).all()

@router.post("/exercises", response_model=ExerciseOut)
def create_exercise(ex_in: ExerciseCreate, db: Session = Depends(get_db)):
    existing = db.query(Exercise).filter(Exercise.name.ilike(ex_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Exercise with this name already exists")
    ex = Exercise(**ex_in.model_dump())
    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex

@router.put("/exercises/{exercise_id}", response_model=ExerciseOut)
def update_exercise(exercise_id: int, ex_in: ExerciseUpdate, db: Session = Depends(get_db)):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    for field, val in ex_in.model_dump(exclude_unset=True).items():
        setattr(ex, field, val)
    db.commit()
    db.refresh(ex)
    return ex

@router.delete("/exercises/{exercise_id}")
def delete_exercise(exercise_id: int, db: Session = Depends(get_db)):
    ex = db.query(Exercise).filter(Exercise.id == exercise_id).first()
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    ex.is_active = False
    db.commit()
    return {"message": "Exercise deactivated"}


# ==================== ADMIN ANALYTICS ====================

@router.get("/analytics", response_model=AdminAnalyticsOut)
def get_admin_analytics(db: Session = Depends(get_db)):
    """Aggregated gym analytics for admin. Does not expose private customer details to other customers."""
    total_customers = db.query(User).filter(User.role == UserRole.CUSTOMER).count()
    active_customers = db.query(User).filter(User.role == UserRole.CUSTOMER, User.is_active == True).count()

    total_completed = db.query(WorkoutLog).count()

    # Total scheduled workouts across all active assignments
    total_scheduled = 0
    assignments = db.query(UserProgram).all()
    for a in assignments:
        if a.program and a.program.days:
            total_scheduled += len(a.program.days)

    avg_completion = 0.0
    if total_scheduled > 0:
        avg_completion = round((total_completed / total_scheduled) * 100, 1)

    # Total training volume
    all_sets = db.query(WorkoutSetLog).all()
    total_volume = calculate_workout_volume(all_sets)

    # Most popular exercises by total sets logged
    exercise_stats: dict = {}
    for s in all_sets:
        if s.exercise_id and s.is_completed:
            if s.exercise_id not in exercise_stats:
                exercise_stats[s.exercise_id] = {
                    "exercise_id": s.exercise_id,
                    "exercise_name": s.exercise_name,
                    "muscle_group": "",
                    "total_sets": 0,
                    "total_volume_kg": 0.0,
                    "athletes": set(),
                }
            exercise_stats[s.exercise_id]["total_sets"] += 1
            if s.actual_weight_kg > 0 and s.actual_reps > 0:
                exercise_stats[s.exercise_id]["total_volume_kg"] += s.actual_weight_kg * s.actual_reps
            wl = s.workout_log
            if wl:
                exercise_stats[s.exercise_id]["athletes"].add(wl.user_id)

    # Fill in muscle group from Exercise table
    for ex_id, stats in exercise_stats.items():
        ex = db.query(Exercise).filter(Exercise.id == ex_id).first()
        if ex:
            stats["muscle_group"] = ex.muscle_group

    popular_exercises = sorted(
        exercise_stats.values(), key=lambda x: x["total_sets"], reverse=True
    )[:10]
    popular_out = [
        PopularExerciseItem(
            exercise_id=e["exercise_id"],
            exercise_name=e["exercise_name"],
            muscle_group=e["muscle_group"],
            total_sets=e["total_sets"],
            total_volume_kg=round(e["total_volume_kg"], 2),
            unique_athletes=len(e["athletes"]),
        )
        for e in popular_exercises
    ]

    # Most active customers (by workouts completed) - show athlete name only, no email
    customers = db.query(User).filter(User.role == UserRole.CUSTOMER).all()
    active_customer_list = []
    for c in customers:
        cust_logs = db.query(WorkoutLog).filter(WorkoutLog.user_id == c.id).all()
        workouts_done = len(cust_logs)
        if workouts_done == 0:
            continue
        cust_sets = []
        for wl in cust_logs:
            cust_sets.extend(wl.sets)
        cust_volume = calculate_workout_volume(cust_sets)
        streak_m = calculate_streak_metrics(db, c.id)
        last_log = max(cust_logs, key=lambda l: l.completed_at, default=None)
        last_active = last_log.completed_at.strftime("%b %d, %Y") if last_log else None
        active_customer_list.append(
            ActiveCustomerItem(
                user_id=c.id,
                athlete_name=c.full_name,
                workouts_completed=workouts_done,
                total_volume_kg=cust_volume,
                current_streak=streak_m["current_streak"],
                last_active_date=last_active,
            )
        )
    active_customer_list.sort(key=lambda x: x.workouts_completed, reverse=True)
    top_customers = active_customer_list[:10]

    # Weekly volume trend (last 6 weeks)
    today = date.today()
    volume_trend = []
    for w in range(6, 0, -1):
        start_w = today - timedelta(days=w * 7)
        end_w = today - timedelta(days=(w - 1) * 7)
        week_logs = db.query(WorkoutLog).filter(
            func.date(WorkoutLog.completed_at) >= start_w,
            func.date(WorkoutLog.completed_at) < end_w,
        ).all()
        week_sets = []
        for wl in week_logs:
            week_sets.extend(wl.sets)
        week_volume = calculate_workout_volume(week_sets)
        week_workouts = len([wl for wl in week_logs if wl.day_type != "REST"])
        volume_trend.append(
            VolumeDataPoint(
                period_label=f"Week {7 - w}",
                volume_kg=week_volume,
                workouts_count=week_workouts,
            )
        )

    return AdminAnalyticsOut(
        total_customers=total_customers,
        active_customers=active_customers,
        total_completed_workouts=total_completed,
        total_scheduled_workouts=total_scheduled,
        avg_completion_rate=avg_completion,
        total_training_volume_kg=round(total_volume, 2),
        popular_exercises=popular_out,
        most_active_customers=top_customers,
        weekly_volume_trend=volume_trend,
    )
