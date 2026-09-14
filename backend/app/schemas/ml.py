from typing import List, Optional
from pydantic import BaseModel, Field


class HistoricalPoint(BaseModel):
    session_index: int
    date: str
    weight_kg: float
    reps: int
    estimated_1rm: float
    volume_kg: float


class ProgressPredictionItem(BaseModel):
    exercise_id: int
    exercise_name: str
    current_weight_kg: float
    predicted_weight_kg: float
    predicted_reps: int
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score between 0 and 1")
    trend: str = Field(description="'improving' | 'stagnant' | 'declining'")
    is_ml_prediction: bool
    explanation: str
    historical_points: List[HistoricalPoint] = []
    predicted_point: Optional[HistoricalPoint] = None


class WorkoutRecommendationItem(BaseModel):
    exercise_id: int
    exercise_name: str
    current_weight_kg: float
    recommended_weight_kg: float
    recommended_reps_min: int
    recommended_reps_max: int
    target_sets: int
    reason: str
    confidence: float = Field(ge=0.0, le=1.0)
    progression_type: str = Field(
        description="'conservative_increase' | 'maintain' | 'recovery'"
    )
    is_ml_recommendation: bool


class PlateauInsightItem(BaseModel):
    exercise_id: int
    exercise_name: str
    sessions_stagnant: int
    status: str = "possible_training_plateau"
    message: str
    suggestion: str


class FatigueSignalItem(BaseModel):
    detected: bool
    status: str = "normal"  # "normal" | "performance_drop"
    severity: str = "none"  # "none" | "mild" | "moderate" | "high"
    message: str
    drop_percentage: float = 0.0


class PerformanceInsightCard(BaseModel):
    id: str
    type: str  # "improving" | "strength" | "plateau" | "volume" | "fatigue" | "info"
    title: str
    description: str
    badge: str
    severity: str = "info"  # "info" | "success" | "warning" | "caution"


class MLDashboardResponse(BaseModel):
    data_sufficient: bool
    completed_sessions_count: int
    min_sessions_required: int = 3
    message: str
    predictions: List[ProgressPredictionItem] = []
    recommendations: List[WorkoutRecommendationItem] = []
    insights: List[PerformanceInsightCard] = []
    plateaus: List[PlateauInsightItem] = []
    fatigue_signal: FatigueSignalItem


class SingleExercisePredictionResponse(BaseModel):
    exercise_id: int
    exercise_name: str
    data_sufficient: bool
    message: str
    prediction: Optional[ProgressPredictionItem] = None
    recommendation: Optional[WorkoutRecommendationItem] = None
    plateau: Optional[PlateauInsightItem] = None


class AdminMLAnalyticsOut(BaseModel):
    total_active_customers: int
    average_progress_rate_pct: float
    customers_improving_count: int
    customers_plateaued_count: int
    customers_fatigued_count: int
    average_completion_rate_pct: float
    summary_insights: List[str] = []
