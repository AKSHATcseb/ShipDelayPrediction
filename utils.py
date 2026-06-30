"""
utils.py

Helper utilities for seed initialization, directory management, model serialization,
and environment setup checks.
"""

import random
import pickle
import numpy as np
from pathlib import Path
from typing import Any
from logger import logger

def set_random_seed(seed: int = 42) -> None:
    """Sets the random seed for reproducibility across python, numpy, and other packages."""
    logger.info(f"Setting random seed to {seed} for reproducibility.")
    random.seed(seed)
    np.random.seed(seed)

def save_pickle(obj: Any, file_path: Path) -> None:
    """Saves a python object as a pickle file."""
    logger.info(f"Saving pickle object to: {file_path}")
    # Ensure directory exists
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, "wb") as f:
        pickle.dump(obj, f)
    logger.info("Pickle saved successfully.")

def load_pickle(file_path: Path) -> Any:
    """Loads a python object from a pickle file."""
    logger.info(f"Loading pickle object from: {file_path}")
    if not file_path.exists():
        raise FileNotFoundError(f"Pickle file not found at: {file_path}")
    with open(file_path, "rb") as f:
        obj = pickle.load(f)
    logger.info("Pickle loaded successfully.")
    return obj

def check_xgboost_installed() -> bool:
    """Checks if xgboost is available in the environment."""
    try:
        import xgboost
        return True
    except ImportError:
        logger.warning("xgboost is not installed. Models based on XGBoost will be skipped or substituted.")
        return False
