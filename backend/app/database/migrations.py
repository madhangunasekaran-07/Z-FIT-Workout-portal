import logging
from sqlalchemy import inspect, text

logger = logging.getLogger("zfit.migrations")

def run_migrations(engine):
    """
    Safely and idempotently ensure new Phase 2 columns exist on database tables without data loss.
    """
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    with engine.connect() as conn:
        # 1. workout_set_logs table
        if "workout_set_logs" in tables:
            columns = [c["name"] for c in inspector.get_columns("workout_set_logs")]
            if "rpe" not in columns:
                conn.execute(text("ALTER TABLE workout_set_logs ADD COLUMN rpe REAL;"))
                conn.commit()
                logger.info("Migrated workout_set_logs: added rpe column.")

        # 2. personal_records table
        if "personal_records" in tables:
            columns = [c["name"] for c in inspector.get_columns("personal_records")]
            if "previous_weight_kg" not in columns:
                conn.execute(text("ALTER TABLE personal_records ADD COLUMN previous_weight_kg REAL;"))
            if "previous_reps" not in columns:
                conn.execute(text("ALTER TABLE personal_records ADD COLUMN previous_reps INTEGER;"))
            if "estimated_1rm" not in columns:
                conn.execute(text("ALTER TABLE personal_records ADD COLUMN estimated_1rm REAL;"))
            if "pr_type" not in columns:
                conn.execute(text("ALTER TABLE personal_records ADD COLUMN pr_type VARCHAR(50) DEFAULT 'MAX_WEIGHT';"))
            conn.commit()
            logger.info("Migrated personal_records: added Phase 2 PR columns.")
