from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user, require_admin
from app.models.user import User
from app.models.exercise import Exercise
from app.ml.predictor import MLPredictorService
from app.schemas.ml import (
    MLDashboardResponse,
    WorkoutRecommendationItem,
    PerformanceInsightCard,
    PlateauInsightItem,
    FatigueSignalItem,
    SingleExercisePredictionResponse,
    AdminMLAnalyticsOut,
)

router = APIRouter(prefix="/ml", tags=["Machine Learning"])


@router.get("/progress", response_model=MLDashboardResponse)
def get_ml_progress_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns personalized ML progress predictions, conservative recommendations,
    plateau detections, and fatigue signals based on the customer's real workout history.
    """
    return MLPredictorService.get_customer_ml_dashboard(db, current_user.id)


@router.get("/recommendations", response_model=List[WorkoutRecommendationItem])
def get_ml_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns explainable next-workout recommendations for each logged exercise
    based on recent actual performance.
    """
    dashboard = MLPredictorService.get_customer_ml_dashboard(db, current_user.id)
    return dashboard.recommendations


@router.get("/insights")
def get_ml_insights(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns AI performance insight cards, plateau detections, and fatigue/performance drop signals.
    """
    dashboard = MLPredictorService.get_customer_ml_dashboard(db, current_user.id)
    return {
        "insights": dashboard.insights,
        "plateaus": dashboard.plateaus,
        "fatigue_signal": dashboard.fatigue_signal,
    }


@router.get("/exercises/{exercise_id}/prediction", response_model=SingleExercisePredictionResponse)
def get_exercise_prediction(
    exercise_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns detailed machine-learning performance prediction and historical Recharts progression
    for a specific exercise.
    """
    try:
        return MLPredictorService.get_single_exercise_prediction(db, current_user.id, exercise_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/admin/analytics", response_model=AdminMLAnalyticsOut)
def get_admin_ml_analytics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Admin-only aggregate ML analytics across all athletes.
    Evaluates progression trends, plateaus, and workload alerts without exposing private emails.
    """
    return MLPredictorService.get_admin_ml_analytics(db)
