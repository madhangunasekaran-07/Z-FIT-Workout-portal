from datetime import datetime, timezone, date, timedelta
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.level import Level
from app.models.exercise import Exercise
from app.models.program import Program, ProgramDay, ProgramExercise
from app.models.assignment import UserProgram
from app.models.workout_log import WorkoutLog, WorkoutSetLog
from app.models.pr import PersonalRecord

def seed_database(db: Session) -> None:
    """Idempotent seed data for initial application setup."""
    
    # 1. Levels
    levels_data = [
        {"name": "Beginner", "description": "Foundational strength and habit-building split routines."},
        {"name": "Intermediate", "description": "Structured Push/Pull/Legs and Upper/Lower splits for steady progressive overload."},
        {"name": "Advanced", "description": "High-volume periodized splits for maximum hypertrophy and performance."},
    ]
    levels_map = {}
    for l_data in levels_data:
        lvl = db.query(Level).filter(Level.name == l_data["name"]).first()
        if not lvl:
            lvl = Level(name=l_data["name"], description=l_data["description"])
            db.add(lvl)
            db.flush()
        levels_map[l_data["name"]] = lvl

    # 2. Master Exercises
    exercises_data = [
        {"name": "Bench Press", "muscle_group": "Chest", "equipment": "Barbell", "difficulty": "Intermediate", "default_sets": 4, "default_reps": 8, "rest_seconds": 90, "instructions": "Lie on bench, grip bar slightly wider than shoulder width, lower bar to mid-chest, press up explosively."},
        {"name": "Incline Dumbbell Press", "muscle_group": "Chest", "equipment": "Dumbbell", "difficulty": "Intermediate", "default_sets": 3, "default_reps": 10, "rest_seconds": 75, "instructions": "Set bench to 30-45 degrees. Press dumbbells upwards while retracting shoulder blades."},
        {"name": "Lat Pulldown", "muscle_group": "Back", "equipment": "Cable", "difficulty": "Beginner", "default_sets": 4, "default_reps": 10, "rest_seconds": 60, "instructions": "Grip wide bar, pull smoothly down to upper chest, squeeze lats, and control the eccentric."},
        {"name": "Barbell Row", "muscle_group": "Back", "equipment": "Barbell", "difficulty": "Intermediate", "default_sets": 4, "default_reps": 8, "rest_seconds": 90, "instructions": "Hinge at hips with flat back, row barbell to lower ribs, keeping elbows close."},
        {"name": "Seated Cable Row", "muscle_group": "Back", "equipment": "Cable", "difficulty": "Beginner", "default_sets": 3, "default_reps": 12, "rest_seconds": 60, "instructions": "Sit upright with neutral spine, pull attachment to abdomen, pinching shoulder blades."},
        {"name": "Face Pull", "muscle_group": "Shoulders", "equipment": "Cable", "difficulty": "Beginner", "default_sets": 3, "default_reps": 15, "rest_seconds": 60, "instructions": "Set rope at eye level, pull towards face while externally rotating shoulders."},
        {"name": "Overhead Barbell Press", "muscle_group": "Shoulders", "equipment": "Barbell", "difficulty": "Advanced", "default_sets": 4, "default_reps": 6, "rest_seconds": 90, "instructions": "Stand with core braced, press barbell overhead in a straight vertical bar path."},
        {"name": "Lateral Raise", "muscle_group": "Shoulders", "equipment": "Dumbbell", "difficulty": "Beginner", "default_sets": 3, "default_reps": 15, "rest_seconds": 45, "instructions": "Raise dumbbells out to sides until parallel to floor with slight elbow bend."},
        {"name": "Barbell Squat", "muscle_group": "Legs", "equipment": "Barbell", "difficulty": "Advanced", "default_sets": 4, "default_reps": 8, "rest_seconds": 120, "instructions": "Rest bar on upper traps, descend until thighs are at least parallel with floor, drive through heels."},
        {"name": "Leg Press", "muscle_group": "Legs", "equipment": "Machine", "difficulty": "Beginner", "default_sets": 3, "default_reps": 12, "rest_seconds": 75, "instructions": "Feet shoulder width on sled, lower smoothly without rounding lower back, press up."},
        {"name": "Leg Curl", "muscle_group": "Legs", "equipment": "Machine", "difficulty": "Beginner", "default_sets": 3, "default_reps": 12, "rest_seconds": 60, "instructions": "Lie facedown, curl heels toward glutes, pause at contraction, slowly return."},
        {"name": "Standing Calf Raise", "muscle_group": "Legs", "equipment": "Machine", "difficulty": "Beginner", "default_sets": 4, "default_reps": 15, "rest_seconds": 45, "instructions": "Balls of feet on platform, lower for deep stretch, press all the way onto toes."},
        {"name": "Barbell Bicep Curl", "muscle_group": "Arms", "equipment": "Barbell", "difficulty": "Beginner", "default_sets": 3, "default_reps": 10, "rest_seconds": 60, "instructions": "Stand tall, curl bar towards shoulders keeping elbows stationary at your sides."},
        {"name": "Tricep Rope Pushdown", "muscle_group": "Arms", "equipment": "Cable", "difficulty": "Beginner", "default_sets": 3, "default_reps": 12, "rest_seconds": 45, "instructions": "Extend arms downward spreading rope at bottom for peak triceps contraction."},
        {"name": "Romanian Deadlift", "muscle_group": "Legs", "equipment": "Barbell", "difficulty": "Intermediate", "default_sets": 3, "default_reps": 10, "rest_seconds": 90, "instructions": "Slight knee bend, push hips back, lower bar along shins until hamstring stretch."},
        {"name": "Hanging Leg Raise", "muscle_group": "Core", "equipment": "Bodyweight", "difficulty": "Intermediate", "default_sets": 3, "default_reps": 12, "rest_seconds": 60, "instructions": "Hang from pull-up bar, curl hips and raise legs toward chest without swinging."}
    ]
    exercises_map = {}
    for ex in exercises_data:
        existing = db.query(Exercise).filter(Exercise.name == ex["name"]).first()
        if not existing:
            existing = Exercise(**ex)
            db.add(existing)
            db.flush()
        exercises_map[ex["name"]] = existing

    # 3. Intermediate PPL Program
    inter_lvl = levels_map["Intermediate"]
    ppl_prog = db.query(Program).filter(Program.name == "Intermediate PPL").first()
    if not ppl_prog:
        ppl_prog = Program(
            name="Intermediate PPL",
            description="The classic Push / Pull / Legs sequence designed for balanced hypertrophy, progressive overload, and scheduled recovery.",
            level_id=inter_lvl.id,
            is_active=True
        )
        db.add(ppl_prog)
        db.flush()

        # Build 7-day split
        days_spec = [
            {
                "day_order": 1,
                "name": "Day 1 - Push",
                "day_type": "PUSH",
                "is_rest_day": False,
                "estimated_duration_minutes": 55,
                "notes": "Focus on horizontal press strength and shoulder stability.",
                "exercises": [
                    ("Bench Press", 4, 8, 90),
                    ("Incline Dumbbell Press", 3, 10, 75),
                    ("Overhead Barbell Press", 3, 8, 90),
                    ("Lateral Raise", 3, 15, 45),
                    ("Tricep Rope Pushdown", 3, 12, 45),
                ]
            },
            {
                "day_order": 2,
                "name": "Day 2 - Pull",
                "day_type": "PULL",
                "is_rest_day": False,
                "estimated_duration_minutes": 55,
                "notes": "Upper back thickness and vertical lat pulling power.",
                "exercises": [
                    ("Lat Pulldown", 4, 10, 60),
                    ("Barbell Row", 4, 8, 90),
                    ("Seated Cable Row", 3, 12, 60),
                    ("Face Pull", 3, 15, 60),
                    ("Barbell Bicep Curl", 3, 10, 60),
                ]
            },
            {
                "day_order": 3,
                "name": "Day 3 - Legs",
                "day_type": "LEGS",
                "is_rest_day": False,
                "estimated_duration_minutes": 60,
                "notes": "Heavy quad recruitment and posterior chain control.",
                "exercises": [
                    ("Barbell Squat", 4, 8, 120),
                    ("Romanian Deadlift", 3, 10, 90),
                    ("Leg Press", 3, 12, 75),
                    ("Leg Curl", 3, 12, 60),
                    ("Standing Calf Raise", 4, 15, 45),
                ]
            },
            {
                "day_order": 4,
                "name": "Day 4 - Rest",
                "day_type": "REST",
                "is_rest_day": True,
                "estimated_duration_minutes": 0,
                "notes": "Recovery is part of the program. Hydrate, rest, and let muscle tissues rebuild.",
                "exercises": []
            },
            {
                "day_order": 5,
                "name": "Day 5 - Push Hypertrophy",
                "day_type": "PUSH",
                "is_rest_day": False,
                "estimated_duration_minutes": 50,
                "notes": "Moderate weights, high mind-muscle connection and chest pump.",
                "exercises": [
                    ("Incline Dumbbell Press", 4, 10, 75),
                    ("Bench Press", 3, 10, 90),
                    ("Lateral Raise", 4, 15, 45),
                    ("Tricep Rope Pushdown", 4, 12, 45),
                ]
            },
            {
                "day_order": 6,
                "name": "Day 6 - Pull Hypertrophy",
                "day_type": "PULL",
                "is_rest_day": False,
                "estimated_duration_minutes": 50,
                "notes": "Focus on high reps and controlled negatives on rows.",
                "exercises": [
                    ("Lat Pulldown", 4, 12, 60),
                    ("Seated Cable Row", 4, 12, 60),
                    ("Face Pull", 3, 15, 60),
                    ("Barbell Bicep Curl", 4, 12, 60),
                ]
            },
            {
                "day_order": 7,
                "name": "Day 7 - Legs & Core",
                "day_type": "LEGS",
                "is_rest_day": False,
                "estimated_duration_minutes": 55,
                "notes": "Leg volume and core stabilization.",
                "exercises": [
                    ("Leg Press", 4, 12, 75),
                    ("Leg Curl", 4, 12, 60),
                    ("Standing Calf Raise", 4, 15, 45),
                    ("Hanging Leg Raise", 3, 15, 60),
                ]
            }
        ]

        for d_spec in days_spec:
            prog_day = ProgramDay(
                program_id=ppl_prog.id,
                day_order=d_spec["day_order"],
                name=d_spec["name"],
                day_type=d_spec["day_type"],
                is_rest_day=d_spec["is_rest_day"],
                estimated_duration_minutes=d_spec["estimated_duration_minutes"],
                notes=d_spec["notes"]
            )
            db.add(prog_day)
            db.flush()

            for order_idx, (ex_name, sets, reps, rest) in enumerate(d_spec["exercises"], start=1):
                if ex_name in exercises_map:
                    pe = ProgramExercise(
                        program_day_id=prog_day.id,
                        exercise_id=exercises_map[ex_name].id,
                        exercise_order=order_idx,
                        target_sets=sets,
                        target_reps=reps,
                        rest_seconds=rest
                    )
                    db.add(pe)

    # 4. Admin Account
    admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
    if not admin_user:
        admin_user = User(
            email=settings.ADMIN_EMAIL,
            hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
            full_name="Z Fit Administrator",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)

    # 5. Demo Customer Account
    customer_user = db.query(User).filter(User.email == "customer@zfit.com").first()
    if not customer_user:
        customer_user = User(
            email="customer@zfit.com",
            hashed_password=get_password_hash("Customer@123"),
            full_name="Madhan Kumar",
            role=UserRole.CUSTOMER,
            is_active=True,
            level_id=inter_lvl.id
        )
        db.add(customer_user)
        db.flush()

        # Assign Intermediate PPL
        today = date.today()
        assignment = UserProgram(
            user_id=customer_user.id,
            program_id=ppl_prog.id,
            start_date=today - timedelta(days=2),
            due_date=today + timedelta(days=28),
            current_day_order=3,  # Day 1 & 2 completed, currently on Day 3 Legs
            status="ACTIVE"
        )
        db.add(assignment)
        db.flush()

        # Add sample past workout logs for Day 1 and Day 2 so customer dashboard has realistic data
        # Day 1 Push log
        log1 = WorkoutLog(
            user_id=customer_user.id,
            user_program_id=assignment.id,
            day_order_completed=1,
            day_name="Day 1 - Push",
            day_type="PUSH",
            started_at=datetime.now(timezone.utc) - timedelta(days=2, hours=1),
            completed_at=datetime.now(timezone.utc) - timedelta(days=2),
            duration_seconds=3200,
            notes="Great bench press session. Felt strong on overhead presses."
        )
        db.add(log1)
        db.flush()

        # Add sets for Day 1
        bench = exercises_map["Bench Press"]
        for s in range(1, 5):
            db.add(WorkoutSetLog(
                workout_log_id=log1.id,
                exercise_id=bench.id,
                exercise_name=bench.name,
                set_number=s,
                target_weight_kg=70.0,
                target_reps=8,
                actual_weight_kg=72.5 if s > 2 else 70.0,
                actual_reps=8,
                is_completed=True
            ))
        db.add(PersonalRecord(
            user_id=customer_user.id,
            exercise_id=bench.id,
            weight_kg=72.5,
            reps=8,
            achieved_at=datetime.now(timezone.utc) - timedelta(days=2),
            workout_log_id=log1.id
        ))

        # Day 2 Pull log
        log2 = WorkoutLog(
            user_id=customer_user.id,
            user_program_id=assignment.id,
            day_order_completed=2,
            day_name="Day 2 - Pull",
            day_type="PULL",
            started_at=datetime.now(timezone.utc) - timedelta(days=1, hours=1),
            completed_at=datetime.now(timezone.utc) - timedelta(days=1),
            duration_seconds=3100,
            notes="Good back pump. Rows felt smooth."
        )
        db.add(log2)
        db.flush()

        lat = exercises_map["Lat Pulldown"]
        for s in range(1, 5):
            db.add(WorkoutSetLog(
                workout_log_id=log2.id,
                exercise_id=lat.id,
                exercise_name=lat.name,
                set_number=s,
                target_weight_kg=55.0,
                target_reps=10,
                actual_weight_kg=55.0,
                actual_reps=10,
                is_completed=True
            ))

        # Squat PR placeholder
        squat = exercises_map["Barbell Squat"]
        db.add(PersonalRecord(
            user_id=customer_user.id,
            exercise_id=squat.id,
            weight_kg=100.0,
            reps=6,
            achieved_at=datetime.now(timezone.utc) - timedelta(days=5),
            workout_log_id=None
        ))

    # Commit all seed data
    db.commit()
