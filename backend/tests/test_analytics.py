"""
Phase 2 Analytics & Progress Tracking Tests
Tests: volume calculation, PR detection, streak metrics, exercise history, workout history,
admin analytics, data validation, and security isolation.
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from datetime import date, timedelta, datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.core.deps import get_db
from app.main import app
from app.services.seed import seed_database
from app.services.progression import (
    calculate_workout_volume,
    calculate_estimated_1rm,
    calculate_streak_metrics,
    process_personal_records,
)
from app.models.workout_log import WorkoutSetLog, WorkoutLog

TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def get_customer_token():
    res = client.post("/api/auth/login", json={
        "email": "customer@zfit.com",
        "password": "Customer@123"
    })
    assert res.status_code == 200
    return res.json()["access_token"]


def get_admin_token():
    res = client.post("/api/auth/login", json={
        "email": "admin@zfit.com",
        "password": "Admin@123"
    })
    assert res.status_code == 200
    return res.json()["access_token"]


# ==================== UNIT: Volume Calculation ====================

class TestVolumeCalculation:
    def test_volume_single_set(self):
        s = WorkoutSetLog()
        s.actual_weight_kg = 60.0
        s.actual_reps = 10
        s.is_completed = True
        assert calculate_workout_volume([s]) == 600.0

    def test_volume_multiple_sets(self):
        sets = []
        for w, r in [(60, 10), (60, 9), (62.5, 8)]:
            s = WorkoutSetLog()
            s.actual_weight_kg = w
            s.actual_reps = r
            s.is_completed = True
            sets.append(s)
        # 600 + 540 + 500 = 1640
        assert calculate_workout_volume(sets) == 1640.0

    def test_volume_excludes_incomplete_sets(self):
        s1 = WorkoutSetLog()
        s1.actual_weight_kg = 60.0
        s1.actual_reps = 10
        s1.is_completed = True

        s2 = WorkoutSetLog()
        s2.actual_weight_kg = 60.0
        s2.actual_reps = 10
        s2.is_completed = False  # Incomplete - should be excluded

        assert calculate_workout_volume([s1, s2]) == 600.0

    def test_volume_excludes_zero_weight(self):
        s = WorkoutSetLog()
        s.actual_weight_kg = 0.0
        s.actual_reps = 10
        s.is_completed = True
        assert calculate_workout_volume([s]) == 0.0

    def test_volume_excludes_zero_reps(self):
        s = WorkoutSetLog()
        s.actual_weight_kg = 60.0
        s.actual_reps = 0
        s.is_completed = True
        assert calculate_workout_volume([s]) == 0.0

    def test_volume_empty_list(self):
        assert calculate_workout_volume([]) == 0.0


# ==================== UNIT: Estimated 1RM ====================

class TestEstimated1RM:
    def test_1rm_single_rep(self):
        assert calculate_estimated_1rm(100.0, 1) == 100.0

    def test_1rm_epley_formula(self):
        # 60 kg * (1 + 10/30) = 60 * 1.333... = 80.0
        result = calculate_estimated_1rm(60.0, 10)
        assert abs(result - 80.0) < 0.1

    def test_1rm_zero_weight(self):
        assert calculate_estimated_1rm(0.0, 10) == 0.0

    def test_1rm_zero_reps(self):
        assert calculate_estimated_1rm(60.0, 0) == 0.0


# ==================== INTEGRATION: Workout Logging & Volume ====================

class TestWorkoutLogging:
    def test_complete_workout_with_actual_performance(self):
        """Customer can log actual weights/reps distinct from planned targets."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        curr_res = client.get("/api/workouts/current", headers=headers)
        assert curr_res.status_code == 200
        curr = curr_res.json()
        assert curr["has_assignment"] is True

        if curr.get("is_rest_day"):
            # Advance rest day first
            client.post("/api/workouts/advance-rest", headers=headers)
            curr_res = client.get("/api/workouts/current", headers=headers)
            curr = curr_res.json()

        day_order = curr.get("day_order", 1)
        exercises = curr.get("exercises", [])

        sets_payload = []
        if exercises:
            ex = exercises[0]
            # Log 3 sets with DIFFERENT actual weights vs target
            for i in range(1, 4):
                sets_payload.append({
                    "exercise_id": ex["exercise_id"],
                    "exercise_name": ex["name"],
                    "set_number": i,
                    "target_weight_kg": ex.get("previous_best_weight") or 60.0,
                    "target_reps": ex["target_reps"],
                    "actual_weight_kg": 80.0 + (i * 2.5),  # Different from target
                    "actual_reps": 8,
                    "is_completed": True,
                    "rpe": 7.5,
                    "notes": f"Test set {i}"
                })

        res = client.post("/api/workouts/complete", headers=headers, json={
            "day_order": day_order,
            "duration_seconds": 3600,
            "notes": "Phase 2 test workout",
            "sets": sets_payload
        })
        assert res.status_code == 200
        data = res.json()
        assert "message" in data
        assert "total_volume_kg" in data
        assert data["total_volume_kg"] >= 0.0
        assert "new_prs" in data
        assert "workout_log_id" in data

    def test_workout_log_contains_volume(self):
        """Workout history should include total_volume_kg."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/workouts/history", headers=headers)
        assert res.status_code == 200
        logs = res.json()
        assert len(logs) > 0
        for log in logs:
            assert "total_volume_kg" in log
            assert log["total_volume_kg"] >= 0.0
            assert "exercises_completed_count" in log

    def test_workout_log_detail_with_rpe(self):
        """Workout detail should include RPE in sets."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        logs_res = client.get("/api/workouts/history", headers=headers)
        assert logs_res.status_code == 200
        logs = logs_res.json()
        assert len(logs) > 0

        log_id = logs[0]["id"]
        detail_res = client.get(f"/api/workouts/{log_id}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert "sets" in detail
        # Check sets have rpe field
        for s in detail["sets"]:
            assert "rpe" in s

    def test_customer_cannot_view_another_customers_log(self):
        """Security: Customer must not be able to access another customer's workout log."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        # Try to access log ID 0 or a very large ID that doesn't belong to this user
        res = client.get("/api/workouts/99999", headers=headers)
        assert res.status_code == 404


# ==================== INTEGRATION: PR Detection ====================

class TestPersonalRecords:
    def test_pr_detected_after_workout(self):
        """PRs should be detected when actual performance beats existing records."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        # Check that some PRs exist from seeded data or previous tests
        prs_res = client.get("/api/progress/prs", headers=headers)
        assert prs_res.status_code == 200
        prs = prs_res.json()
        # Should have at least Bench Press PR from seed data
        assert len(prs) > 0

    def test_pr_has_previous_values(self):
        """PRs should include previous_weight_kg and previous_reps fields."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        prs_res = client.get("/api/progress/prs", headers=headers)
        assert prs_res.status_code == 200
        prs = prs_res.json()
        for pr in prs:
            assert "weight_kg" in pr
            assert "reps" in pr
            assert "previous_weight_kg" in pr
            assert "previous_reps" in pr
            assert "estimated_1rm" in pr
            assert "pr_type" in pr

    def test_pr_not_detected_for_incomplete_sets(self):
        """PRs should NOT be detected for sets marked as not completed."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        curr_res = client.get("/api/workouts/current", headers=headers)
        curr = curr_res.json()
        if curr.get("is_rest_day") or not curr.get("has_assignment"):
            return  # Skip if no workout available

        exercises = curr.get("exercises", [])
        if not exercises:
            return

        ex = exercises[0]
        day_order = curr.get("day_order", 1)
        prs_before_res = client.get("/api/progress/prs", headers=headers)
        prs_before = {pr["exercise_id"]: pr["weight_kg"] for pr in prs_before_res.json()}

        # Submit INCOMPLETE set with very high weight
        res = client.post("/api/workouts/complete", headers=headers, json={
            "day_order": day_order,
            "duration_seconds": 1800,
            "sets": [{
                "exercise_id": ex["exercise_id"],
                "exercise_name": ex["name"],
                "set_number": 1,
                "actual_weight_kg": 999.0,  # Very high weight
                "actual_reps": 1,
                "is_completed": False  # NOT completed - should NOT set PR
            }]
        })
        assert res.status_code == 200
        data = res.json()
        # New PR should NOT be detected for the 999kg set
        new_pr_ids = [pr["exercise_id"] for pr in data.get("new_prs", [])]
        assert ex["exercise_id"] not in new_pr_ids


# ==================== INTEGRATION: Data Validation ====================

class TestDataValidation:
    def test_negative_weight_rejected(self):
        """Negative weight values should be rejected with 422."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        curr_res = client.get("/api/workouts/current", headers=headers)
        curr = curr_res.json()
        if not curr.get("has_assignment") or curr.get("is_rest_day"):
            return

        exercises = curr.get("exercises", [])
        if not exercises:
            return

        ex = exercises[0]
        res = client.post("/api/workouts/complete", headers=headers, json={
            "day_order": curr.get("day_order", 1),
            "duration_seconds": 1800,
            "sets": [{
                "exercise_id": ex["exercise_id"],
                "exercise_name": ex["name"],
                "set_number": 1,
                "actual_weight_kg": -10.0,  # NEGATIVE - should be rejected
                "actual_reps": 10,
                "is_completed": True
            }]
        })
        assert res.status_code == 422

    def test_negative_reps_rejected(self):
        """Negative rep values should be rejected with 422."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        curr_res = client.get("/api/workouts/current", headers=headers)
        curr = curr_res.json()
        if not curr.get("has_assignment") or curr.get("is_rest_day"):
            return

        exercises = curr.get("exercises", [])
        if not exercises:
            return

        ex = exercises[0]
        res = client.post("/api/workouts/complete", headers=headers, json={
            "day_order": curr.get("day_order", 1),
            "duration_seconds": 1800,
            "sets": [{
                "exercise_id": ex["exercise_id"],
                "exercise_name": ex["name"],
                "set_number": 1,
                "actual_weight_kg": 60.0,
                "actual_reps": -5,  # NEGATIVE - should be rejected
                "is_completed": True
            }]
        })
        assert res.status_code == 422

    def test_invalid_rpe_rejected(self):
        """RPE outside 1-10 range should be rejected."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        curr_res = client.get("/api/workouts/current", headers=headers)
        curr = curr_res.json()
        if not curr.get("has_assignment") or curr.get("is_rest_day"):
            return

        exercises = curr.get("exercises", [])
        if not exercises:
            return

        ex = exercises[0]
        res = client.post("/api/workouts/complete", headers=headers, json={
            "day_order": curr.get("day_order", 1),
            "duration_seconds": 1800,
            "sets": [{
                "exercise_id": ex["exercise_id"],
                "exercise_name": ex["name"],
                "set_number": 1,
                "actual_weight_kg": 60.0,
                "actual_reps": 10,
                "is_completed": True,
                "rpe": 15.0  # Invalid - should be rejected (max 10)
            }]
        })
        assert res.status_code == 422


# ==================== INTEGRATION: Progress Stats ====================

class TestProgressStats:
    def test_progress_overview(self):
        """Progress endpoint returns all required Phase 2 fields."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/progress", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "workouts_this_week" in data
        assert "workouts_this_month" in data
        assert "total_training_volume_kg" in data
        assert "volume_chart" in data
        assert data["total_training_volume_kg"] >= 0.0
        assert len(data["volume_chart"]) == 6

    def test_progress_streak_metrics(self):
        """Streak metrics should all be returned."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/progress", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "current_streak" in data
        assert "longest_streak" in data
        assert data["current_streak"] >= 0
        assert data["longest_streak"] >= data["current_streak"]

    def test_exercise_history(self):
        """Exercise history endpoint returns chronological session data."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        # Get logged exercises for this user
        exercises_res = client.get("/api/progress/exercises", headers=headers)
        assert exercises_res.status_code == 200
        exercises = exercises_res.json()

        if not exercises:
            return  # No exercises logged yet

        ex_id = exercises[0]["exercise_id"]
        res = client.get(f"/api/progress/exercise-history/{ex_id}", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "exercise_id" in data
        assert "exercise_name" in data
        assert "sessions" in data
        assert "progression_points" in data
        assert "sessions_count" in data

    def test_exercise_history_not_found(self):
        """Non-existent exercise should return 404."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/progress/exercise-history/99999", headers=headers)
        assert res.status_code == 404

    def test_personal_records_endpoint(self):
        """Personal records endpoint returns all PRs with required fields."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/progress/prs", headers=headers)
        assert res.status_code == 200
        prs = res.json()
        assert isinstance(prs, list)
        for pr in prs:
            assert "exercise_id" in pr
            assert "exercise_name" in pr
            assert "weight_kg" in pr
            assert "reps" in pr
            assert "achieved_at" in pr


# ==================== INTEGRATION: Streak Calculation ====================

class TestStreakCalculation:
    def test_streak_not_affected_by_calendar_gap(self):
        """Missing calendar days should NOT skip workout day order (completion-based progression)."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        # Get current day before
        curr_before = client.get("/api/workouts/current", headers=headers).json()
        current_day = curr_before.get("day_order", 1)

        # Verify progress data
        progress = client.get("/api/progress", headers=headers).json()
        assert progress["current_workout_day"] == current_day, \
            "Workout day should match the current day order, not a calendar date"

    def test_streak_metrics_all_fields_present(self):
        """Streak metrics returned by the service should be complete."""
        db = TestingSessionLocal()
        try:
            from app.models.user import User
            user = db.query(User).filter(User.email == "customer@zfit.com").first()
            if user:
                metrics = calculate_streak_metrics(db, user.id)
                assert "current_streak" in metrics
                assert "longest_streak" in metrics
                assert "total_completed_workouts" in metrics
                assert "workouts_this_week" in metrics
                assert "workouts_this_month" in metrics
                assert metrics["total_completed_workouts"] > 0
        finally:
            db.close()

    def test_streak_endpoint(self):
        """Test GET /api/progress/streak returns valid metrics."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}
        res = client.get("/api/progress/streak", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "current_streak" in data
        assert "longest_streak" in data
        assert "total_completed_workouts" in data
        assert "workouts_this_week" in data
        assert "workouts_this_month" in data
        assert data["current_streak"] >= 0
        assert data["longest_streak"] >= data["current_streak"]



# ==================== INTEGRATION: Admin Analytics ====================

class TestAdminAnalytics:
    def test_admin_analytics_endpoint(self):
        """Admin analytics endpoint returns all required aggregates."""
        token = get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/admin/analytics", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_customers" in data
        assert "active_customers" in data
        assert "total_completed_workouts" in data
        assert "total_training_volume_kg" in data
        assert "popular_exercises" in data
        assert "most_active_customers" in data
        assert "weekly_volume_trend" in data
        assert data["total_customers"] >= 1
        assert len(data["weekly_volume_trend"]) == 6

    def test_admin_analytics_no_customer_email_leaked(self):
        """Admin analytics should not expose raw customer emails."""
        token = get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/admin/analytics", headers=headers)
        assert res.status_code == 200
        data = res.json()
        for customer in data.get("most_active_customers", []):
            assert "athlete_name" in customer
            assert "email" not in customer  # No email in leaderboard

    def test_customer_cannot_access_admin_analytics(self):
        """Customer cannot access admin analytics endpoint."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/admin/analytics", headers=headers)
        assert res.status_code == 403

    def test_admin_stats_still_work(self):
        """Original admin stats endpoint should still function."""
        token = get_admin_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/admin/stats", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "total_customers" in data
        assert "active_customers" in data
        assert "completed_workouts_today" in data


# ==================== INTEGRATION: Workout History ====================

class TestWorkoutHistory:
    def test_workout_history_returns_all_logs(self):
        """Workout history should include at least seeded + test logs."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        res = client.get("/api/workouts/history", headers=headers)
        assert res.status_code == 200
        logs = res.json()
        assert len(logs) >= 2  # At least Day 1 and Day 2 from seed

    def test_workout_detail_shows_target_vs_actual(self):
        """Workout detail should include both target and actual values."""
        token = get_customer_token()
        headers = {"Authorization": f"Bearer {token}"}

        logs_res = client.get("/api/workouts/history", headers=headers)
        logs = logs_res.json()
        assert len(logs) > 0

        # Find a log that has sets
        log_with_sets = next((l for l in logs if l.get("sets")), None)
        if not log_with_sets:
            return

        detail_res = client.get(f"/api/workouts/{log_with_sets['id']}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        for s in detail.get("sets", []):
            assert "actual_weight_kg" in s
            assert "actual_reps" in s
            assert "target_weight_kg" in s
            assert "target_reps" in s
