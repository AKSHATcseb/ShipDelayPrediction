"""
Dataset Builder.
Orchestrates project generation and day-by-day simulations to build training datasets.
"""

import logging
import pandas as pd
from typing import Tuple
from sklearn.model_selection import train_test_split

from ml.config import RAW_DATA_PATH, TRAIN_DATA_PATH, TEST_DATA_PATH, DEFAULT_NUM_PROJECTS, RANDOM_STATE
from ml.template_generator import TemplateGenerator
from ml.project_generator import ProjectGenerator
from ml.snapshot_generator import SnapshotGenerator
from ml.feature_extractor import FeatureExtractor

logger = logging.getLogger(__name__)

def build_dataset(num_projects: int = DEFAULT_NUM_PROJECTS, seed: int = 42) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Generates N projects, runs day-by-day simulations to collect snapshots,
    extracts features, saves raw/train/test CSVs, and returns train/test splits.
    """
    logger.info(f"Initiating dataset construction for {num_projects} projects (seed={seed})")
    
    t_gen = TemplateGenerator(seed)
    p_gen = ProjectGenerator(seed)
    s_gen = SnapshotGenerator(seed)

    all_snapshots = []
    
    # Generate templates
    template_types = ["Nomination Procurement", "Competitive Procurement", "Emergency Procurement", "Indigenous Procurement"]

    for i in range(1, num_projects + 1):
        # Pick template type
        t_type = template_types[(i - 1) % len(template_types)]
        template = t_gen.generate_template(t_type)
        
        # Generate project spec
        project = p_gen.generate_project(template, i)
        
        # Run day-by-day simulation and collect snapshots
        snapshots, final_project = s_gen.generate_project_snapshots(project)
        all_snapshots.extend(snapshots)

        if i % 100 == 0:
            logger.info(f"Simulated {i} of {num_projects} projects...")

    # Convert to DataFrame
    df = FeatureExtractor.convert_snapshots_to_dataframe(all_snapshots)
    logger.info(f"Generated a total of {len(df)} snapshots from {num_projects} projects.")

    # Save raw dataset
    df.to_csv(RAW_DATA_PATH, index=False)
    logger.info(f"Saved complete activity dataset to: {RAW_DATA_PATH}")

    # Stratified Train-Test Split based on target risk category
    train_df, test_df = train_test_split(
        df,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=df["target_risk_category"]
    )

    # Save splits
    train_df.to_csv(TRAIN_DATA_PATH, index=False)
    test_df.to_csv(TEST_DATA_PATH, index=False)
    
    logger.info(f"Saved train set ({len(train_df)} rows) to: {TRAIN_DATA_PATH}")
    logger.info(f"Saved test set ({len(test_df)} rows) to: {TEST_DATA_PATH}")

    return train_df, test_df
