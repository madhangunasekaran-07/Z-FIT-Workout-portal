from typing import List, Optional
from app.ml.preprocessing import ExerciseSessionSummary


def generate_workout_recommendation(
    sessions: List[ExerciseSessionSummary],
    exercise_name: str,
    default_target_reps: int = 8,
    default_target_sets: int = 3,
    muscle_group: str = "General"
) -> dict:
    """
    Generates personalized, explainable, and conservative workout recommendations
    based on actual recent performance history.
    """
    if not sessions:
        return {
            "current_weight_kg": 0.0,
            "recommended_weight_kg": 20.0,
            "recommended_reps_min": default_target_reps,
            "recommended_reps_max": default_target_reps + 2,
            "target_sets": default_target_sets,
            "reason": "Initial baseline session. Start with a moderate working weight and focus on form.",
            "confidence": 0.60,
            "progression_type": "maintain",
            "is_ml_recommendation": False,
        }

    recent_s = sessions[-1]
    curr_weight = recent_s.avg_weight_kg
    curr_reps = int(round(recent_s.avg_reps))
    total_sets = recent_s.total_sets or default_target_sets
    target_reps = recent_s.target_reps or default_target_reps
    avg_rpe = recent_s.avg_rpe

    # Determine safe increment based on muscle group / exercise type
    is_lower_body = muscle_group.lower() in ["legs", "quads", "hamstrings", "glutes"] or any(
        kw in exercise_name.lower() for kw in ["squat", "deadlift", "leg press", "lunge"]
    )
    weight_increment = 2.5 if is_lower_body else 1.25

    # Check for sufficient data
    is_ml = len(sessions) >= 3

    # Case 1: Completed all target reps with comfortable RPE (<= 8.0) or consistently over target reps
    if recent_s.all_target_reps_met and (avg_rpe is None or avg_rpe <= 8.2):
        new_weight = round(curr_weight + weight_increment, 2)
        min_reps = max(6, target_reps - 2)
        max_reps = target_reps
        reason = (
            f"You successfully completed all sets at {curr_weight} kg with solid reserve. "
            f"Recommended conservative increase of +{weight_increment} kg to {new_weight} kg for {min_reps}–{max_reps} reps."
        )
        prog_type = "conservative_increase"
        confidence = 0.88 if is_ml else 0.75

    # Case 2: Met target reps but at high exertion (RPE >= 8.5)
    elif recent_s.all_target_reps_met and avg_rpe is not None and avg_rpe > 8.2:
        new_weight = curr_weight
        min_reps = target_reps
        max_reps = target_reps + 1
        reason = (
            f"Completed target reps at high exertion (RPE {avg_rpe}). "
            f"Maintain {curr_weight} kg to consolidate neuromuscular adaptation before increasing load."
        )
        prog_type = "maintain"
        confidence = 0.84 if is_ml else 0.72

    # Case 3: Missed target reps on one or more sets
    elif not recent_s.all_target_reps_met:
        new_weight = curr_weight
        min_reps = target_reps
        max_reps = target_reps
        reason = (
            f"Fell slightly short of target reps on recent sets (averaged {curr_reps} reps). "
            f"Maintain {curr_weight} kg and prioritize hitting complete volume across all {total_sets} sets."
        )
        prog_type = "maintain"
        confidence = 0.82 if is_ml else 0.70

    # Default fallback
    else:
        new_weight = curr_weight
        min_reps = target_reps
        max_reps = target_reps + 2
        reason = f"Maintain current training load of {curr_weight} kg with focus on steady cadence and full range of motion."
        prog_type = "maintain"
        confidence = 0.75

    return {
        "current_weight_kg": curr_weight,
        "recommended_weight_kg": new_weight,
        "recommended_reps_min": min_reps,
        "recommended_reps_max": max_reps,
        "target_sets": total_sets,
        "reason": reason,
        "confidence": confidence,
        "progression_type": prog_type,
        "is_ml_recommendation": is_ml,
    }
