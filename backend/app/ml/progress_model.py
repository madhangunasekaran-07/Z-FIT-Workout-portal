from typing import Tuple, Dict, Any, List
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor

from app.ml.preprocessing import ExerciseSessionSummary
from app.ml.features import (
    FEATURE_NAMES,
    extract_features_from_history,
    build_chronological_dataset,
)


def round_to_gym_increment(weight: float, increment: float = 0.5) -> float:
    """Rounds weight to realistic gym increments (e.g. 0.5kg or 1.25kg)."""
    return round(round(weight / increment) * increment, 2)


def fit_and_predict_progress(
    sessions: List[ExerciseSessionSummary]
) -> Dict[str, Any]:
    """
    Fits ML regressor on chronological workout history and predicts next session's
    working weight and reps with an explainable confidence score and trend.
    """
    if len(sessions) < 3:
        raise ValueError("Insufficient workout history for ML model fitting (minimum 3 sessions required).")

    recent_session = sessions[-1]
    recent_weight = recent_session.avg_weight_kg
    recent_reps = recent_session.avg_reps

    X, y_weight, y_reps = build_chronological_dataset(sessions)

    # Extract features for next session prediction (using all past sessions up to now)
    next_features_dict = extract_features_from_history(sessions)
    next_X = np.array([[next_features_dict[name] for name in FEATURE_NAMES]], dtype=np.float64)

    # Select model based on available training points
    if len(X) >= 6:
        model_weight = RandomForestRegressor(n_estimators=30, max_depth=4, random_state=42)
        model_reps = RandomForestRegressor(n_estimators=30, max_depth=4, random_state=42)
    else:
        # For small historical sets, regularized Ridge prevents overfitting
        model_weight = Ridge(alpha=1.0)
        model_reps = Ridge(alpha=1.0)

    if len(X) > 0:
        model_weight.fit(X, y_weight)
        model_reps.fit(X, y_reps)

        raw_pred_weight = float(model_weight.predict(next_X)[0])
        raw_pred_reps = float(model_reps.predict(next_X)[0])
    else:
        # Fallback if chronological dataset has 0 rows (e.g. exactly 2 prior points)
        raw_pred_weight = recent_weight
        raw_pred_reps = recent_reps

    # Sports Science Safety Constraints: Conservative Progression Bounds
    # Weight cannot jump more than +5% or +2.5kg in a single session
    max_safe_weight = max(recent_weight * 1.05, recent_weight + 2.5)
    min_safe_weight = max(5.0, recent_weight * 0.90)

    clamped_weight = max(min_safe_weight, min(max_safe_weight, raw_pred_weight))
    pred_weight = round_to_gym_increment(clamped_weight, increment=0.5)

    clamped_reps = max(4, min(20, int(round(raw_pred_reps))))

    # Compute trend using 1RM regression slope across sessions
    one_rms = [s.estimated_1rm for s in sessions]
    x_indices = np.arange(len(one_rms))
    if len(one_rms) >= 2:
        slope, _ = np.polyfit(x_indices, one_rms, 1)
    else:
        slope = 0.0

    if slope > 0.3:
        trend = "improving"
    elif slope < -0.3:
        trend = "declining"
    else:
        trend = "stagnant"

    # Confidence calculation:
    # 1. Base confidence (0.60)
    # 2. Number of sessions (+0.03 per session, up to +0.20)
    # 3. Consistency of performance (+0.05 if recent weight is stable or progressing smoothly)
    session_bonus = min(0.20, len(sessions) * 0.03)
    consistency_bonus = 0.05 if abs(slope) < 3.0 else 0.0
    # Deduct confidence if high variance in recent RPE or erratic weights
    weights_std = float(np.std([s.avg_weight_kg for s in sessions]))
    variance_penalty = 0.05 if weights_std > 10.0 else 0.0

    confidence = round(
        max(0.55, min(0.94, 0.60 + session_bonus + consistency_bonus - variance_penalty)),
        2
    )

    # Explainable narrative
    if pred_weight > recent_weight:
        diff = round(pred_weight - recent_weight, 1)
        explanation = (
            f"Based on consistent completion of recent sets and steady 1RM velocity ({trend}), "
            f"the model projects a progressive overload increase of +{diff} kg to {pred_weight} kg."
        )
    elif pred_weight < recent_weight:
        diff = round(recent_weight - pred_weight, 1)
        explanation = (
            f"Recent volume indicators and elevated exertion suggest a temporary workload reduction of "
            f"-{diff} kg to optimize recovery and prevent overtraining."
        )
    else:
        explanation = (
            f"Performance stability indicates maintaining {pred_weight} kg for {clamped_reps} reps to "
            f"solidify form and muscle recruitment before the next weight increment."
        )

    return {
        "predicted_weight": pred_weight,
        "predicted_reps": clamped_reps,
        "confidence": confidence,
        "trend": trend,
        "explanation": explanation,
        "slope": round(float(slope), 2),
    }
