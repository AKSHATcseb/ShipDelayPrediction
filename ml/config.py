"""
Configuration for the Activity-Level Machine Learning Pipeline.
"""

from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
PLOTS_DIR = BASE_DIR / "plots"

# Output paths
RAW_DATA_PATH = DATA_DIR / "activity_dataset.csv"
TRAIN_DATA_PATH = DATA_DIR / "activity_train.csv"
TEST_DATA_PATH = DATA_DIR / "activity_test.csv"
METRICS_JSON_PATH = DATA_DIR / "activity_dashboard_metrics.json"

# Models save paths dict
MODEL_PATHS = {
    # Regressor models (Delay Percentage)
    "dt_reg_pct": MODELS_DIR / "dt_reg_pct.pkl",
    "rf_reg_pct": MODELS_DIR / "rf_reg_pct.pkl",
    "gb_reg_pct": MODELS_DIR / "gb_reg_pct.pkl",
    "xgb_reg_pct": MODELS_DIR / "xgb_reg_pct.pkl",
    
    # Regressor models (Delay Months)
    "dt_reg_months": MODELS_DIR / "dt_reg_months.pkl",
    "rf_reg_months": MODELS_DIR / "rf_reg_months.pkl",
    "gb_reg_months": MODELS_DIR / "gb_reg_months.pkl",
    "xgb_reg_months": MODELS_DIR / "xgb_reg_months.pkl",
    
    # Classifier models (Risk Category)
    "dt_cls": MODELS_DIR / "dt_cls.pkl",
    "rf_cls": MODELS_DIR / "rf_cls.pkl",
    "gb_cls": MODELS_DIR / "gb_cls.pkl",
    "xgb_cls": MODELS_DIR / "xgb_cls.pkl",
    
    # Production Pipelines
    "preprocessor": MODELS_DIR / "activity_preprocessor.pkl",
    "best_reg_pct": MODELS_DIR / "best_reg_pct.pkl",
    "best_reg_months": MODELS_DIR / "best_reg_months.pkl",
    "best_cls": MODELS_DIR / "best_cls.pkl"
}

# Hyperparameters
DEFAULT_NUM_PROJECTS = 1000
SNAPSHOTS_PER_PROJECT = 7
TRAIN_TEST_SPLIT_RATIO = 0.2
RANDOM_STATE = 42

# Ensure directories exist
for folder in [DATA_DIR, MODELS_DIR, PLOTS_DIR]:
    folder.mkdir(parents=True, exist_ok=True)
