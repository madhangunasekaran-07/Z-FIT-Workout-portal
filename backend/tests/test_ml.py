"""
Phase 3 Machine Learning Tests:
- Insufficient workout history: graceful fallback & informative message
- Feature extraction with chronological ordering & no future data leakage
- Progress model fitting and explainable prediction generation
- Personalized conservative workout recommendations (progression vs maintenance)
- Performance plateau detection across consecutive sessions
- Fatigue / performance-drop statistical signal detection
- Customer isolation & RBAC (customer denied admin ML analytics; admin permitted)
- Invalid exercise handling (404)
"""
import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.core.deps import get_db
from app.main import app
from app.services.seed import seed_database
from app.models.user import User, UserRole
from app.models.exercise import Exercise
from app.models.workout_log import WorkoutLog, WorkoutSetLog
from app.ml.preprocessing import (
    ExerciseSessionSummary,
    extract_user_exercise_sessions,
    calculate_epley_1rm,
)
from app.ml.features import (
    extract_features_from_history,
    build_chronological_dataset,
    FEATURE_NAMES,
)
from app.ml.progress_model import fit_and_predict_progress, round_to_gym_increment
from app.ml.recommendation import generate_workout_recommendation
from app.ml.plateau import detect_exercise_plateau
from app.ml.fatigue import evaluate_fatigue_signal
from app.ml.predictor import MLPredictorService

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
    assert res.status_code == 200, f"Customer login failed: {res.text}"
    return res.json()["access_token"]


def get_admin_token():
    res = client.post("/api/auth/login", json={
        "email": "admin@zfit.com",
        "password": "Admin@123"
    })
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


def _make_session(ex_id, ex_name, idx, base_weight, reps=8.0, completed=True, rpe=7.5, all_met=True):
    now = datetime.now(timezone.utc)
    w = base_weight + idx * 2.5
    return ExerciseSessionSummary(
        workout_log_id=idx,
        exercise_id=ex_id,
        exercise_name=ex_name,
        completed_at=now - timedelta(days=(5 - idx) * 3),
        avg_weight_kg=w,
        max_weight_kg=w,
        avg_reps=reps,
        max_reps=int(reps),
        total_sets=3,
        volume_kg=w * reps * 3,
        estimated_1rm=calculate_epley_1rm(w, int(reps)),
        avg_rpe=rpe,
        target_weight_kg=w,
        target_reps=8,
        all_target_reps_met=all_met,
    )


# ==============================================================================
# 1. UNIT TESTS: FEATURE ENGINEERING & NO DATA LEAKAGE
# ==============================================================================

class TestFeatureEngineering:
    def test_epley_1rm_calculation(self):
        assert calculate_epley_1rm(100.0, 1) == 100.0
        assert calculate_epley_1rm(100.0, 10) == pytest.approx(133.33, rel=1e-2)
        assert calculate_epley_1rm(0.0, 10) == 0.0
        assert calculate_epley_1rm(100.0, 0) == 0.0

    def test_features_extracted_chronologically_no_data_leakage(self):
        sessions = [_make_session(1, "Bench Press", i, 60.0) for i in range(5)]

        feat = extract_features_from_history(sessions[:3])
        # Session index 2 has weight 60 + 2*2.5 = 65.0
        assert feat["recent_weight"] == 65.0
        assert feat["total_completed_sessions"] == 3.0
        for fname in FEATURE_NAMES:
            assert fname in feat, f"Missing feature: {fname}"

    def test_build_chronological_dataset_uses_only_prior_sessions(self):
        sessions = [_make_session(1, "Bench Press", i, 60.0) for i in range(5)]
        X, y_weight, y_reps = build_chronological_dataset(sessions)
        # 5 sessions -> row 0 trains on [0,1] predicts idx 2, etc → 3 training rows
        assert len(X) == 3
        assert len(y_weight) == 3
        # y_weight[0] = session idx 2 weight = 60 + 2*2.5 = 65.0
        assert y_weight[0] == pytest.approx(65.0, rel=1e-3)
        # y_weight[2] = session idx 4 weight = 60 + 4*2.5 = 70.0
        assert y_weight[2] == pytest.approx(70.0, rel=1e-3)

    def test_insufficient_sessions_returns_empty_dataset(self):
        sessions = [_make_session(1, "Bench Press", i, 60.0) for i in range(2)]
        X, y_weight, y_reps = build_chronological_dataset(sessions)
        assert len(X) == 0
        assert len(y_weight) == 0


# ==============================================================================
# 2. UNIT TESTS: PROGRESS MODEL
# ==============================================================================

class TestMLProgressModel:
    def test_progress_model_requires_minimum_3_sessions(self):
        sessions = [_make_session(1, "Bench Press", i, 60.0) for i in range(2)]
        with pytest.raises(ValueError, match="Insufficient workout history"):
            fit_and_predict_progress(sessions)

    def test_progress_model_predicts_within_safe_bounds(self):
        sessions = [_make_session(1, "Bench Press", i, 60.0) for i in range(5)]
        result = fit_and_predict_progress(sessions)
        latest_weight = sessions[-1].avg_weight_kg  # 70.0
        # Must not jump more than 5% above recent weight
        assert result["predicted_weight"] <= latest_weight * 1.06
        assert result["predicted_weight"] >= latest_weight * 0.88
        assert result["trend"] == "improving"
        assert 0.50 <= result["confidence"] <= 1.0
        assert len(result["explanation"]) > 20

    def test_progress_model_detects_stagnant_trend(self):
        # All weights constant → stagnant slope
        sessions = [_make_session(1, "Lat Pulldown", i, 60.0, reps=8.0) for i in range(4)]
        # Override to same weight
        for s in sessions:
            s.avg_weight_kg = 60.0
            s.max_weight_kg = 60.0
            s.estimated_1rm = calculate_epley_1rm(60.0, 8)
        result = fit_and_predict_progress(sessions)
        assert result["trend"] == "stagnant"

    def test_round_to_gym_increment(self):
        assert round_to_gym_increment(62.3, 0.5) == 62.5
        assert round_to_gym_increment(62.1, 0.5) == 62.0
        assert round_to_gym_increment(63.7, 1.25) == pytest.approx(63.75, rel=1e-3)


# ==============================================================================
# 3. UNIT TESTS: RECOMMENDATION ENGINE
# ==============================================================================

class TestMLRecommendation:
    def test_conservative_progression_when_all_reps_met_low_rpe(self):
        s = _make_session(1, "Bench Press", 0, 70.0, reps=8.0, rpe=7.5, all_met=True)
        rec = generate_workout_recommendation([s], "Bench Press", muscle_group="Chest")
        assert rec["progression_type"] == "conservative_increase"
        assert rec["recommended_weight_kg"] == 71.25  # +1.25 kg for upper body
        assert rec["recommended_reps_min"] <= rec["recommended_reps_max"]

    def test_maintain_when_target_reps_missed(self):
        s = _make_session(1, "Bench Press", 0, 70.0, reps=6.0, rpe=9.0, all_met=False)
        rec = generate_workout_recommendation([s], "Bench Press", muscle_group="Chest")
        assert rec["progression_type"] == "maintain"
        assert rec["recommended_weight_kg"] == 70.0
        assert "short" in rec["reason"].lower() or "target" in rec["reason"].lower()

    def test_maintain_when_high_rpe_even_if_reps_met(self):
        s = _make_session(1, "Bench Press", 0, 70.0, reps=8.0, rpe=9.0, all_met=True)
        # Override rpe
        s.avg_rpe = 9.0
        rec = generate_workout_recommendation([s], "Bench Press", muscle_group="Chest")
        assert rec["progression_type"] == "maintain"
        assert rec["recommended_weight_kg"] == 70.0

    def test_lower_body_uses_larger_increment(self):
        s = _make_session(1, "Barbell Squat", 0, 100.0, reps=8.0, rpe=7.0, all_met=True)
        rec = generate_workout_recommendation([s], "Barbell Squat", muscle_group="Legs")
        assert rec["progression_type"] == "conservative_increase"
        assert rec["recommended_weight_kg"] == 102.5  # +2.5 kg for lower body

    def test_recommendation_is_not_ml_tagged_with_1_session(self):
        s = _make_session(1, "Bench Press", 0, 60.0, reps=8.0, rpe=7.5, all_met=True)
        rec = generate_workout_recommendation([s], "Bench Press")
        assert rec["is_ml_recommendation"] is False

    def test_recommendation_is_ml_tagged_with_3_plus_sessions(self):
        sessions = [_make_session(1, "Bench Press", i, 60.0) for i in range(3)]
        rec = generate_workout_recommendation(sessions, "Bench Press")
        assert rec["is_ml_recommendation"] is True


# ==============================================================================
# 4. UNIT TESTS: PLATEAU DETECTION
# ==============================================================================

class TestPlateauDetection:
    def test_plateau_detected_on_4_unchanged_sessions(self):
        sessions = [_make_session(1, "Barbell Row", i, 60.0) for i in range(4)]
        # Override all to same weight (no variance)
        for s in sessions:
            s.avg_weight_kg = 60.0
            s.max_weight_kg = 60.0
            s.avg_reps = 8.0
            s.max_reps = 8
            s.volume_kg = 60.0 * 8 * 3
        result = detect_exercise_plateau(sessions, "Barbell Row")
        assert result is not None
        assert result["status"] == "possible_training_plateau"
        assert result["sessions_stagnant"] == 4
        assert "Barbell Row" in result["message"]
        assert len(result["suggestion"]) > 20

    def test_no_plateau_when_weight_progressing(self):
        sessions = [_make_session(1, "Barbell Row", i, 60.0) for i in range(4)]
        result = detect_exercise_plateau(sessions, "Barbell Row")
        # sessions have increasing weight, so no plateau
        assert result is None

    def test_plateau_requires_minimum_3_sessions(self):
        sessions = [_make_session(1, "Barbell Row", i, 60.0) for i in range(2)]
        result = detect_exercise_plateau(sessions, "Barbell Row", min_sessions_for_plateau=3)
        assert result is None


# ==============================================================================
# 5. UNIT TESTS: FATIGUE / PERFORMANCE DROP DETECTION
# ==============================================================================

class TestFatigueDetection:
    def test_fatigue_not_detected_when_performance_normal(self):
        sessions = [_make_session(1, "Barbell Squat", i, 100.0) for i in range(4)]
        result = evaluate_fatigue_signal({1: sessions})
        assert result["detected"] is False
        assert result["status"] == "normal"
        assert result["severity"] == "none"

    def test_fatigue_detected_on_significant_volume_drop(self):
        now = datetime.now(timezone.utc)
        sessions = []
        for i in range(4):
            w = 100.0
            r = 8.0 if i < 3 else 4.0  # Sharp drop on last session
            vol = w * r * (4 if i < 3 else 2)
            sessions.append(ExerciseSessionSummary(
                workout_log_id=i,
                exercise_id=1,
                exercise_name="Barbell Squat",
                completed_at=now - timedelta(days=(4 - i) * 3),
                avg_weight_kg=w,
                max_weight_kg=w,
                avg_reps=r,
                max_reps=int(r),
                total_sets=4 if i < 3 else 2,
                volume_kg=vol,
                estimated_1rm=calculate_epley_1rm(w, int(r)),
                avg_rpe=8.0 if i < 3 else 9.5,
                target_weight_kg=w,
                target_reps=8,
                all_target_reps_met=(i < 3),
            ))
        result = evaluate_fatigue_signal({1: sessions})
        assert result["detected"] is True
        assert result["status"] == "performance_drop"
        assert result["drop_percentage"] > 15.0
        assert result["severity"] in ["mild", "moderate", "high"]

    def test_fatigue_requires_at_least_3_sessions(self):
        sessions = [_make_session(1, "Bench Press", i, 60.0) for i in range(2)]
        result = evaluate_fatigue_signal({1: sessions})
        assert result["detected"] is False


# ==============================================================================
# 6. ENDPOINT INTEGRATION TESTS
# ==============================================================================

class TestMLEndpointsAuth:
    def test_unauthenticated_request_denied(self):
        res = client.get("/api/ml/progress")
        assert res.status_code == 401

    def test_customer_denied_admin_ml_endpoint(self):
        token = get_customer_token()
        res = client.get("/api/ml/admin/analytics", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 403

    def test_admin_allowed_admin_ml_endpoint(self):
        token = get_admin_token()
        res = client.get("/api/ml/admin/analytics", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "total_active_customers" in data
        assert "customers_improving_count" in data
        assert "customers_plateaued_count" in data
        assert "summary_insights" in data
        assert isinstance(data["summary_insights"], list)

    def test_invalid_exercise_returns_404(self):
        token = get_customer_token()
        res = client.get("/api/ml/exercises/99999/prediction",
                         headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 404


class TestMLEndpointsCustomer:
    def test_customer_with_seed_data_returns_valid_progress_response(self):
        """Customer has 2 seed workouts — insufficient for full ML, returns graceful message."""
        MLPredictorService._cache.clear()
        token = get_customer_token()
        res = client.get("/api/ml/progress", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        # Core schema fields present
        assert "data_sufficient" in data
        assert "completed_sessions_count" in data
        assert "message" in data
        assert "predictions" in data
        assert "recommendations" in data
        assert "insights" in data
        assert "plateaus" in data
        assert "fatigue_signal" in data

    def test_insufficient_data_message_present(self):
        """Seed has <3 sessions for any single exercise, so expect graceful message."""
        MLPredictorService._cache.clear()
        token = get_customer_token()
        res = client.get("/api/ml/progress", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        if not data["data_sufficient"]:
            assert "workout history" in data["message"].lower() or "not enough" in data["message"].lower()
            # Fallback recommendations should be tagged as non-ML
            for rec in data["recommendations"]:
                assert rec["is_ml_recommendation"] is False

    def test_customer_recommendations_endpoint(self):
        token = get_customer_token()
        res = client.get("/api/ml/recommendations", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        assert isinstance(res.json(), list)

    def test_customer_insights_endpoint(self):
        token = get_customer_token()
        res = client.get("/api/ml/insights", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert "insights" in data
        assert "plateaus" in data
        assert "fatigue_signal" in data
        assert isinstance(data["insights"], list)
        assert isinstance(data["plateaus"], list)

    def test_sufficient_workout_history_unlocks_ml_prediction(self):
        """Add 4 chronological bench press sessions to trigger ML model fit."""
        db = TestingSessionLocal()
        cust = db.query(User).filter(User.email == "customer@zfit.com").first()
        bench = db.query(Exercise).filter(Exercise.name == "Bench Press").first()
        # Read IDs before closing the session to avoid DetachedInstanceError
        cust_id = cust.id
        bench_id = bench.id
        bench_name = bench.name
        now = datetime.now(timezone.utc)

        for idx in range(4):
            log = WorkoutLog(
                user_id=cust_id,
                day_order_completed=10 + idx,
                day_name="ML Test Push Day",
                day_type="WORKOUT",
                started_at=now - timedelta(days=(4 - idx) * 4),
                completed_at=now - timedelta(days=(4 - idx) * 4),
                duration_seconds=3000,
                notes="ML Phase 3 Test"
            )
            db.add(log)
            db.flush()
            for s in range(1, 4):
                db.add(WorkoutSetLog(
                    workout_log_id=log.id,
                    exercise_id=bench_id,
                    exercise_name=bench_name,
                    set_number=s,
                    target_weight_kg=60.0 + idx * 2.5,
                    target_reps=8,
                    actual_weight_kg=60.0 + idx * 2.5,
                    actual_reps=8,
                    is_completed=True,
                    rpe=7.5
                ))
        db.commit()
        db.close()

        MLPredictorService._cache.clear()
        token = get_customer_token()
        res = client.get("/api/ml/progress", headers={"Authorization": f"Bearer {token}"})
        assert res.status_code == 200
        data = res.json()
        assert data["data_sufficient"] is True
        assert len(data["predictions"]) > 0

        bench_pred = next(
            (p for p in data["predictions"] if p["exercise_id"] == bench_id), None
        )
        assert bench_pred is not None
        assert bench_pred["is_ml_prediction"] is True
        assert bench_pred["predicted_weight_kg"] > 0
        assert 0.50 <= bench_pred["confidence"] <= 1.0
        assert bench_pred["trend"] in ["improving", "stagnant", "declining"]
        assert len(bench_pred["historical_points"]) >= 4
        assert bench_pred["predicted_point"] is not None
        assert bench_pred["predicted_point"]["date"] == "Next Session (AI)"

    def test_single_exercise_prediction_endpoint_returns_data(self):
        db = TestingSessionLocal()
        bench = db.query(Exercise).filter(Exercise.name == "Bench Press").first()
        bench_id = bench.id
        db.close()
        token = get_customer_token()
        res = client.get(
            f"/api/ml/exercises/{bench_id}/prediction",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["exercise_id"] == bench_id
        # With 4 workouts added above, this should be sufficient
        if data["data_sufficient"]:
            assert data["prediction"] is not None
            assert data["recommendation"] is not None
            assert data["prediction"]["predicted_weight_kg"] > 0
