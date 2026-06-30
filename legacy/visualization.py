"""
visualization.py

This module handles generating and saving all required visualization plots for
the Ship Delay Prediction pipeline. All plots are styled to look professional and premium.
"""

import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List
from sklearn.metrics import roc_curve, auc
from config import PLOTS_DIR
from logger import logger

# Set global plotting style for professional look
sns.set_theme(style="whitegrid")
plt.rcParams.update({
    'font.size': 10,
    'axes.labelsize': 12,
    'axes.titlesize': 14,
    'xtick.labelsize': 10,
    'ytick.labelsize': 10,
    'figure.titlesize': 16,
    'font.family': 'sans-serif'
})

# Curated palette colors
PRIMARY_COLOR = "#1f77b4"
ACCENT_COLOR = "#ff7f0e"
SUCCESS_COLOR = "#2ca02c"
DANGER_COLOR = "#d62728"
PALETTE_RISK = {"Low": "#2ca02c", "Medium": "#ff7f0e", "High": "#d62728", "Critical": "#9467bd"}

def plot_correlation_heatmap(df: pd.DataFrame, save_path: Path = PLOTS_DIR / "correlation_heatmap.png") -> None:
    """Generates and saves a correlation heatmap for key features."""
    logger.info(f"Generating correlation heatmap to: {save_path}")
    # Filter to numeric columns only
    numeric_df = df.select_dtypes(include=[np.number])
    
    # Select a subset of features for readability
    key_features = [
        "Project_Cost", "Project_Size", "Planned_Duration", "Technical_Complexity",
        "Technology_Maturity", "Approval_Delay", "Vendor_Delay", "Requirement_Changes",
        "QA_Issues", "Construction_Delay", "Testing_Delay", "Delay_Months", "Delay_Percentage"
    ]
    cols = [c for c in key_features if c in numeric_df.columns]
    
    plt.figure(figsize=(12, 10))
    corr = numeric_df[cols].corr()
    
    mask = np.triu(np.ones_like(corr, dtype=bool))
    sns.heatmap(
        corr, mask=mask, annot=True, fmt=".2f", cmap="coolwarm", 
        vmin=-1, vmax=1, center=0, square=True, linewidths=.5,
        cbar_kws={"shrink": .8}
    )
    plt.title("Correlation Matrix of Key Ship Project Features", pad=20)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    logger.info("Correlation heatmap saved.")

def plot_delay_distribution(df: pd.DataFrame, save_path: Path = PLOTS_DIR / "delay_distribution.png") -> None:
    """Generates and saves the distribution of project delay months and percentage."""
    logger.info(f"Generating delay distribution to: {save_path}")
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # 1. Delay Months Distribution
    sns.histplot(df["Delay_Months"], kde=True, ax=axes[0], color=PRIMARY_COLOR, bins=30)
    axes[0].axvline(df["Delay_Months"].mean(), color=DANGER_COLOR, linestyle="--", label=f"Mean: {df['Delay_Months'].mean():.1f}m")
    axes[0].set_title("Distribution of Delay (Months)")
    axes[0].set_xlabel("Delay in Months")
    axes[0].set_ylabel("Frequency")
    axes[0].legend()
    
    # 2. Delay Percentage Distribution
    sns.histplot(df["Delay_Percentage"], kde=True, ax=axes[1], color=ACCENT_COLOR, bins=30)
    axes[1].axvline(df["Delay_Percentage"].mean(), color=DANGER_COLOR, linestyle="--", label=f"Mean: {df['Delay_Percentage'].mean():.1f}%")
    axes[1].set_title("Distribution of Delay Percentage")
    axes[1].set_xlabel("Delay Percentage (%)")
    axes[1].set_ylabel("Frequency")
    axes[1].legend()
    
    plt.suptitle("Ship Acquisition Delay Distribution Analysis", y=0.98)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    logger.info("Delay distribution plot saved.")

def plot_risk_distribution(df: pd.DataFrame, save_path: Path = PLOTS_DIR / "risk_distribution.png") -> None:
    """Generates and saves the count plot of project risk categories."""
    logger.info(f"Generating risk distribution countplot to: {save_path}")
    plt.figure(figsize=(8, 6))
    
    order = ["Low", "Medium", "High", "Critical"]
    existing_order = [o for o in order if o in df["Risk_Category"].unique()]
    
    sns.countplot(
        data=df, x="Risk_Category", order=existing_order, 
        palette=PALETTE_RISK, hue="Risk_Category", legend=False
    )
    
    # Add count values on top of bars
    ax = plt.gca()
    for p in ax.patches:
        ax.annotate(
            f'{int(p.get_height())}', 
            (p.get_x() + p.get_width() / 2., p.get_height()), 
            ha='center', va='center', xytext=(0, 8), 
            textcoords='offset points', fontsize=11, weight='bold'
        )
        
    plt.title("Distribution of Projects across Risk Tiers", pad=15)
    plt.xlabel("Risk Category Tier")
    plt.ylabel("Number of Ship Projects")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    logger.info("Risk distribution plot saved.")

def plot_confusion_matrix(
    conf_matrix: np.ndarray, 
    classes: List[str], 
    save_path: Path = PLOTS_DIR / "confusion_matrix.png"
) -> None:
    """Generates and saves a confusion matrix heatmap."""
    logger.info(f"Generating confusion matrix to: {save_path}")
    plt.figure(figsize=(8, 6))
    
    sns.heatmap(
        conf_matrix, annot=True, fmt="d", cmap="Blues",
        xticklabels=classes, yticklabels=classes, cbar=False
    )
    plt.title("Classification Model Confusion Matrix", pad=15)
    plt.ylabel("Actual Risk Category")
    plt.xlabel("Predicted Risk Category")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    logger.info("Confusion matrix plot saved.")

def plot_feature_importance(
    importances: np.ndarray, 
    feature_names: List[str], 
    save_path: Path = PLOTS_DIR / "feature_importance.png",
    top_n: int = 15
) -> None:
    """Generates and saves a bar chart of the top feature importances."""
    logger.info(f"Generating feature importance to: {save_path}")
    
    df_imp = pd.DataFrame({
        "Feature": feature_names,
        "Importance": importances
    }).sort_values(by="Importance", ascending=False).head(top_n)
    
    plt.figure(figsize=(10, 8))
    sns.barplot(data=df_imp, x="Importance", y="Feature", palette="viridis", hue="Feature", legend=False)
    plt.title(f"Top {top_n} Most Important Model Features", pad=15)
    plt.xlabel("Feature Importance Score")
    plt.ylabel("Feature Name")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    logger.info("Feature importance plot saved.")

def plot_roc_curve(
    y_test: np.ndarray, 
    y_prob: np.ndarray, 
    classes: List[str], 
    save_path: Path = PLOTS_DIR / "roc_curve.png"
) -> None:
    """Generates and saves the multiclass ROC curve (One-vs-Rest)."""
    logger.info(f"Generating ROC-AUC curves to: {save_path}")
    plt.figure(figsize=(9, 7))
    
    # Binarize labels for multi-class ROC curve
    n_classes = len(classes)
    y_test_bin = np.eye(n_classes)[y_test]
    
    for i in range(n_classes):
        fpr, tpr, _ = roc_curve(y_test_bin[:, i], y_prob[:, i])
        roc_auc = auc(fpr, tpr)
        plt.plot(fpr, tpr, label=f"Class {classes[i]} (AUC = {roc_auc:.2f})")
        
    plt.plot([0, 1], [0, 1], 'k--', label="Random Guess (AUC = 0.50)")
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel("False Positive Rate (FPR)")
    plt.ylabel("True Positive Rate (TPR)")
    plt.title("ROC-AUC Curves for Risk Tier Classification (OvR)")
    plt.legend(loc="lower right")
    plt.grid(True, linestyle=":", alpha=0.6)
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    logger.info("ROC-AUC plot saved.")

def plot_residual_plot(
    y_true: np.ndarray, 
    y_pred: np.ndarray, 
    save_path: Path = PLOTS_DIR / "residual_plot.png"
) -> None:
    """Generates and saves a residual plot for a regression model."""
    logger.info(f"Generating residual plot to: {save_path}")
    residuals = y_true - y_pred
    
    plt.figure(figsize=(9, 6))
    sns.scatterplot(x=y_pred, y=residuals, alpha=0.5, color=PRIMARY_COLOR)
    plt.axhline(0, color=DANGER_COLOR, linestyle="--", linewidth=1.5)
    plt.title("Model Prediction Residual Analysis")
    plt.xlabel("Predicted Values")
    plt.ylabel("Residuals (Actual - Predicted)")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    logger.info("Residual plot saved.")

def plot_actual_vs_predicted(
    y_true: np.ndarray, 
    y_pred: np.ndarray, 
    save_path: Path = PLOTS_DIR / "actual_vs_predicted.png"
) -> None:
    """Generates and saves a scatterplot of Actual vs Predicted values with a diagonal identity line."""
    logger.info(f"Generating actual vs predicted plot to: {save_path}")
    plt.figure(figsize=(8, 8))
    
    # Scatter plot
    sns.scatterplot(x=y_true, y=y_pred, alpha=0.5, color=PRIMARY_COLOR)
    
    # Identity line
    max_val = max(y_true.max(), y_pred.max())
    min_val = min(y_true.min(), y_pred.min())
    plt.plot([min_val, max_val], [min_val, max_val], color=DANGER_COLOR, linestyle="--", label="Perfect Fit")
    
    plt.title("Actual vs Predicted Project Delays")
    plt.xlabel("Actual Delay (Percentage/Months)")
    plt.ylabel("Predicted Delay (Percentage/Months)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(save_path, dpi=150)
    plt.close()
    logger.info("Actual vs predicted plot saved.")
