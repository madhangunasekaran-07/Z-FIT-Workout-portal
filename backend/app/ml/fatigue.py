from typing import List, Dict, Any
import numpy as np

from app.ml.preprocessing import ExerciseSessionSummary


def evaluate_fatigue_signal(
    all_sessions_by_exercise: Dict[int, List[ExerciseSessionSummary]]
) -> Dict[str, Any]:
    """
    Evaluates statistical performance drops across recent sessions against the athlete's
    recent baseline. Flags a 'possible fatigue signal' or 'performance drop' if volume
    or performance is significantly below baseline.
    Strictly uses non-medical terminology.
    """
    total_exercises_analyzed = 0
    drops = []

    for ex_id, sessions in all_sessions_by_exercise.items():
        if len(sessions) < 3:
            continue

        total_exercises_analyzed += 1
        recent = sessions[-1]
        baseline = sessions[-4:-1] if len(sessions) >= 4 else sessions[:-1]

        baseline_volume = float(np.mean([s.volume_kg for s in baseline]))
        recent_volume = recent.volume_kg

        if baseline_volume > 0:
            diff_pct = (recent_volume - baseline_volume) / baseline_volume * 100.0
            if diff_pct < -15.0:
                drops.append({
                    "exercise_name": recent.exercise_name,
                    "drop_pct": abs(round(diff_pct, 1)),
                    "recent_rpe": recent.avg_rpe,
                })

    if not drops or total_exercises_analyzed == 0:
        return {
            "detected": False,
            "status": "normal",
            "severity": "none",
            "message": "Performance is within normal baseline parameters. Fatigue markers are normal.",
            "drop_percentage": 0.0,
        }

    # Calculate average drop percentage
    avg_drop = round(float(np.mean([d["drop_pct"] for d in drops])), 1)

    if avg_drop > 35.0:
        severity = "high"
        msg = (
            f"Significant performance drop detected ({avg_drop}% below baseline across "
            f"{len(drops)} movements). Your nervous system may need active recovery. "
            "Consider a light mobility session or an extra rest day."
        )
    elif avg_drop > 22.0:
        severity = "moderate"
        msg = (
            f"Recent training performance dropped {avg_drop}% below your established baseline. "
            "Focus on sleep, nutrition, and maintaining weights rather than pushing for new PRs."
        )
    else:
        severity = "mild"
        msg = (
            f"Mild performance dip ({avg_drop}%) noted in recent workout. "
            "Normal day-to-day fluctuation; monitor energy levels during your next session."
        )

    return {
        "detected": True,
        "status": "performance_drop",
        "severity": severity,
        "message": msg,
        "drop_percentage": avg_drop,
    }
