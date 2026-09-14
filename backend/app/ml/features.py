from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional
import numpy as np

from app.ml.preprocessing import ExerciseSessionSummary


FEATURE_NAMES = [
    "recent_weight",
    "previous_weight",
    "average_weight",
    "max_weight",
    "weight_change_pct",
    "recent_reps",
    "previous_reps",
    "average_reps",
    "max_reps",
    "reps_change_pct",
    "recent_volume",
    "previous_volume",
    "average_volume",
    "volume_change_pct",
    "recent_1rm",
    "previous_1rm",
    "max_1rm",
    "total_completed_sessions",
    "days_since_previous_workout",
    "workout_frequency",
    "target_completion_rate",
    "recent_rpe",
]


def extract_features_from_history(
    history: List[ExerciseSessionSummary],
    evaluation_time: Optional[datetime] = None
) -> Dict[str, float]:
    """
    Chronological feature engineering strictly computed from past sessions.
    Guaranteed NO DATA LEAKAGE: only considers elements in `history`.
    """
    if not history:
        return {name: 0.0 for name in FEATURE_NAMES}

    n = len(history)
    weights = [s.avg_weight_kg for s in history]
    max_weights = [s.max_weight_kg for s in history]
    reps = [s.avg_reps for s in history]
    max_reps_list = [s.max_reps for s in history]
    volumes = [s.volume_kg for s in history]
    one_rms = [s.estimated_1rm for s in history]
    completion_flags = [1.0 if s.all_target_reps_met else 0.0 for s in history]
    rpes = [s.avg_rpe for s in history if s.avg_rpe is not None]

    recent_s = history[-1]
    prev_s = history[-2] if n >= 2 else history[-1]

    # Percentage changes between most recent two sessions
    weight_change_pct = (
        ((recent_s.avg_weight_kg - prev_s.avg_weight_kg) / prev_s.avg_weight_kg * 100.0)
        if prev_s.avg_weight_kg > 0 and n >= 2 else 0.0
    )
    reps_change_pct = (
        ((recent_s.avg_reps - prev_s.avg_reps) / prev_s.avg_reps * 100.0)
        if prev_s.avg_reps > 0 and n >= 2 else 0.0
    )
    volume_change_pct = (
        ((recent_s.volume_kg - prev_s.volume_kg) / prev_s.volume_kg * 100.0)
        if prev_s.volume_kg > 0 and n >= 2 else 0.0
    )

    # Days elapsed
    ref_time = evaluation_time or datetime.now(timezone.utc)
    # Ensure completed_at is offset-aware for subtraction
    rec_time = recent_s.completed_at
    if rec_time.tzinfo is None and ref_time.tzinfo is not None:
        rec_time = rec_time.replace(tzinfo=timezone.utc)
    elif rec_time.tzinfo is not None and ref_time.tzinfo is None:
        ref_time = ref_time.replace(tzinfo=timezone.utc)

    days_since_prev = max(0.0, float((ref_time - rec_time).total_seconds() / 86400.0))

    # Workout frequency (sessions per week over rolling timeframe)
    first_time = history[0].completed_at
    if first_time.tzinfo is None and rec_time.tzinfo is not None:
        first_time = first_time.replace(tzinfo=timezone.utc)
    total_span_days = max(1.0, float((rec_time - first_time).total_seconds() / 86400.0))
    workout_frequency = (n / total_span_days) * 7.0

    recent_rpe_val = recent_s.avg_rpe if recent_s.avg_rpe is not None else (sum(rpes) / len(rpes) if rpes else 7.5)

    return {
        "recent_weight": float(recent_s.avg_weight_kg),
        "previous_weight": float(prev_s.avg_weight_kg),
        "average_weight": float(np.mean(weights)),
        "max_weight": float(max(max_weights)),
        "weight_change_pct": round(weight_change_pct, 2),
        "recent_reps": float(recent_s.avg_reps),
        "previous_reps": float(prev_s.avg_reps),
        "average_reps": float(np.mean(reps)),
        "max_reps": float(max(max_reps_list)),
        "reps_change_pct": round(reps_change_pct, 2),
        "recent_volume": float(recent_s.volume_kg),
        "previous_volume": float(prev_s.volume_kg),
        "average_volume": float(np.mean(volumes)),
        "volume_change_pct": round(volume_change_pct, 2),
        "recent_1rm": float(recent_s.estimated_1rm),
        "previous_1rm": float(prev_s.estimated_1rm),
        "max_1rm": float(max(one_rms)),
        "total_completed_sessions": float(n),
        "days_since_previous_workout": round(days_since_prev, 1),
        "workout_frequency": round(workout_frequency, 2),
        "target_completion_rate": round(float(np.mean(completion_flags)), 2),
        "recent_rpe": round(float(recent_rpe_val), 1),
    }


def build_chronological_dataset(
    sessions: List[ExerciseSessionSummary]
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Builds (X, y_weight, y_reps) strictly respecting temporal order.
    Example k uses features extracted strictly from sessions 0..k-1 to predict session k.
    Requires at least 3 sessions to produce at least 1 valid (X, y) pair.
    """
    if len(sessions) < 3:
        return np.empty((0, len(FEATURE_NAMES))), np.empty((0,)), np.empty((0,))

    X_list = []
    y_weight_list = []
    y_reps_list = []

    # For each session from index 2 onwards, features are computed ONLY from strictly prior sessions
    for i in range(2, len(sessions)):
        prior_history = sessions[:i]
        target_session = sessions[i]

        feature_dict = extract_features_from_history(
            prior_history,
            evaluation_time=target_session.completed_at
        )
        row = [feature_dict[name] for name in FEATURE_NAMES]
        X_list.append(row)
        y_weight_list.append(target_session.avg_weight_kg)
        y_reps_list.append(target_session.avg_reps)

    return (
        np.array(X_list, dtype=np.float64),
        np.array(y_weight_list, dtype=np.float64),
        np.array(y_reps_list, dtype=np.float64),
    )
