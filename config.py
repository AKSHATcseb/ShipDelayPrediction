"""
config.py

This module defines directory configurations, training parameters, evaluation settings,
and other global configurations for the Ship Delay Prediction project.
"""

import os
from pathlib import Path

# Base project directory
BASE_DIR = Path(__file__).resolve().parent

# Data directory configuration
DATA_DIR = BASE_DIR / "data"
RAW_DATA_PATH = DATA_DIR / "ship_delay_dataset.csv"
TRAIN_DATA_PATH = DATA_DIR / "train.csv"
TEST_DATA_PATH = DATA_DIR / "test.csv"

# Models directory configuration
MODELS_DIR = BASE_DIR / "models"

# Plots directory configuration
PLOTS_DIR = BASE_DIR / "plots"

# Docs directory configuration
DOCS_DIR = BASE_DIR / "docs"

# Notebooks directory configuration
NOTEBOOKS_DIR = BASE_DIR / "notebooks"

# Model file paths
MODEL_PATHS = {
    "decision_tree_reg": MODELS_DIR / "decision_tree_regressor.pkl",
    "decision_tree_cls": MODELS_DIR / "decision_tree_classifier.pkl",
    "random_forest_reg": MODELS_DIR / "random_forest_regressor.pkl",
    "random_forest_cls": MODELS_DIR / "random_forest_classifier.pkl",
    "gradient_boosting_reg": MODELS_DIR / "gradient_boosting_regressor.pkl",
    "gradient_boosting_cls": MODELS_DIR / "gradient_boosting_classifier.pkl",
    "xgboost_reg": MODELS_DIR / "xgboost_regressor.pkl",
    "xgboost_cls": MODELS_DIR / "xgboost_classifier.pkl",
    
    # Metadata for preprocessing pipeline
    "preprocessor": MODELS_DIR / "preprocessor.pkl",
    "best_regression_model": MODELS_DIR / "best_regression_model.pkl",
    "best_classification_model": MODELS_DIR / "best_classification_model.pkl"
}

# Parameters
DEFAULT_DATASET_SIZE = 5000
TRAIN_TEST_SPLIT_RATIO = 0.2
RANDOM_STATE = 42

def ensure_directories():
    """Ensure that data, models, plots, notebooks, and docs directories exist."""
    for directory in [DATA_DIR, MODELS_DIR, PLOTS_DIR, DOCS_DIR, NOTEBOOKS_DIR]:
        directory.mkdir(parents=True, exist_ok=True)

# Run ensure directories automatically upon config import
ensure_directories()
