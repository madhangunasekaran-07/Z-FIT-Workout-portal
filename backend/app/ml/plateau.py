from typing import List, Optional, Dict, Any
import numpy as np

from app.ml.preprocessing import ExerciseSessionSummary


def detect_exercise_plateau(
    sessions: List[ExerciseSessionSummary],
    exercise_name: str,
    min_sessions_for_plateau: int = 3
) -> Optional[Dict[str, Any]]:
    """
    Detects if performance on an exercise has plateaued over consecutive completed sessions.
    Stagnation is identified when working weight, reps, and volume show negligible variation (< 2.5%)
    over 3 or more consecutive workouts.
    """
    if len(sessions) < min_sessions_for_plateau:
        return None

    # Consider the last 3-5 sessions
    window_size = min(5, len(sessions))
    recent_window = sessions[-window_size:]

    weights = [s.avg_weight_kg for s in recent_window]
    reps = [s.avg_reps for s in recent_window]
    volumes = [s.volume_kg for s in recent_window]

    max_weight = max(weights)
    min_weight = min(weights)
    weight_variance_pct = ((max_weight - min_weight) / max_weight * 100.0) if max_weight > 0 else 0.0

    max_reps = max(reps)
    min_reps = min(reps)
    reps_diff = max_reps - min_reps

    mean_volume = float(np.mean(volumes))
    volume_std = float(np.std(volumes))
    volume_cov = (volume_std / mean_volume * 100.0) if mean_volume > 0 else 0.0

    # Plateau condition:
    # 1. Weight variance <= 2.5% across the window
    # 2. Reps difference <= 1.0 rep across the window
    # 3. Volume coefficient of variation <= 4.0%
    if weight_variance_pct <= 2.5 and reps_diff <= 1.0 and volume_cov <= 4.0:
        return {
            "exercise_id": recent_window[0].exercise_id,
            "exercise_name": exercise_name,
            "sessions_stagnant": window_size,
            "status": "possible_training_plateau",
            "message": (
                f"{exercise_name} performance has remained nearly unchanged "
                f"for the last {window_size} completed sessions at ~{round(float(np.mean(weights)), 1)} kg."
            ),
            "suggestion": (
                "Consider incorporating a minor variation: adjust your rep tempo (e.g. 3-second eccentric), "
                "switch to a slightly different grip/stance, or allocate an extra recovery day to refresh central nervous system adaptation."
            ),
        }

    return None
