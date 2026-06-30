"""
generate_dataset.py

Orchestrates Phase 1: Synthetic Dataset Generation.
Generates baseline variables, applies correlations/non-linear effects, computes final delays,
classifies risk tiers, validates/repairs, and exports raw/train/test datasets.
"""

import argparse
import pandas as pd
from sklearn.model_selection import train_test_split
from config import RAW_DATA_PATH, TRAIN_DATA_PATH, TEST_DATA_PATH, TRAIN_TEST_SPLIT_RATIO, RANDOM_STATE, ensure_directories
from constants import FEATURES
from logger import logger
from utils import set_random_seed
from feature_generator import FeatureGenerator
from correlation_engine import CorrelationEngine
from delay_engine import DelayEngine
from risk_classifier import RiskClassifier
from dataset_validator import DatasetValidator

def run_dataset_generation(size: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Executes the dataset generation pipeline:
    1. Set seed
    2. Generate base features
    3. Apply correlation engine
    4. Compute delays
    5. Classify risk tiers
    6. Validate and repair data
    7. Save results
    """
    logger.info(f"Starting dataset generation pipeline with size={size}, seed={seed}")
    
    # Ensure directories exist
    ensure_directories()
    
    # Set seed
    set_random_seed(seed)
    
    # 1. Base generation
    fg = FeatureGenerator(seed=seed)
    df_base = fg.generate_base_features(num_samples=size)
    
    # 2. Correlation engine
    ce = CorrelationEngine(seed=seed)
    df_corr = ce.apply_correlations(df_base)
    
    # 3. Delay engine
    de = DelayEngine(seed=seed)
    df_delays = de.calculate_delays(df_corr)
    
    # 4. Risk classifier
    rc = RiskClassifier()
    df_classified = rc.apply_risk_classification(df_delays)
    
    # Ensure columns are ordered correctly as defined in constants
    # Reordering only the columns we expect
    ordered_cols = [c for c in FEATURES if c in df_classified.columns]
    df_ordered = df_classified[ordered_cols]
    
    # 5. Dataset validator
    dv = DatasetValidator()
    df_validated, is_valid = dv.validate(df_ordered, repair=True)
    
    if not is_valid:
        logger.warning("Dataset had initial validation errors, but was successfully repaired.")
    else:
        logger.info("Dataset passed all validation checks cleanly.")
        
    # 6. Save full dataset
    logger.info(f"Saving raw dataset to: {RAW_DATA_PATH}")
    df_validated.to_csv(RAW_DATA_PATH, index=False)
    logger.info("Raw dataset saved.")
    
    # 7. Split into Train & Test
    logger.info(f"Splitting dataset into train/test with ratio {1.0 - TRAIN_TEST_SPLIT_RATIO}:{TRAIN_TEST_SPLIT_RATIO}")
    df_train, df_test = train_test_split(
        df_validated, 
        test_size=TRAIN_TEST_SPLIT_RATIO, 
        random_state=RANDOM_STATE, 
        stratify=df_validated["Risk_Category"]
    )
    
    logger.info(f"Saving train dataset ({len(df_train)} rows) to: {TRAIN_DATA_PATH}")
    df_train.to_csv(TRAIN_DATA_PATH, index=False)
    
    logger.info(f"Saving test dataset ({len(df_test)} rows) to: {TEST_DATA_PATH}")
    df_test.to_csv(TEST_DATA_PATH, index=False)
    
    logger.info("Dataset generation and splitting completed successfully.")
    return df_validated

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate Synthetic Ship Delay Prediction Dataset")
    parser.add_argument("--size", type=int, default=5000, help="Number of rows to generate (e.g. 1000, 5000, 10000)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args()
    
    run_dataset_generation(size=args.size, seed=args.seed)
