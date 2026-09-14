"""
Z Fit ML Module — Machine Learning Layer for Workout Performance & Progress Prediction.
Provides modular feature extraction, progress prediction, conservative recommendations,
plateau detection, and fatigue / performance-drop signals.
"""

from app.ml.predictor import MLPredictorService

__all__ = ["MLPredictorService"]
