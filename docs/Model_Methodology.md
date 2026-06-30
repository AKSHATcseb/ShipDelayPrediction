# Model Methodology: Ship Acquisition Delay Prediction System

This document describes the preprocessing, feature engineering, modeling, evaluation, and explanation pipeline utilized in the Ship Acquisition Delay Risk Prediction System.

---

## 1. Preprocessing Pipeline

To clean and transform raw synthetic features before model feeding, the `Preprocessor` module implements a structured sklearn-based transformation workflow:

1. **Outlier Mitigation**: Numeric features are clipped to the $[1\%, 99\%]$ quantiles to remove extreme values arising from Gaussian noise or long-tailed Poisson distributions, improving model stability.
2. **Standard Scaling**: Continuous features (e.g. `Project_Cost`, `Project_Size`, `Technical_Complexity`, and delay days) are scaled using a standard scaler:
   $$z = \frac{x - \mu}{\sigma}$$
   Ensuring all numerical variables are centered around $0$ with a variance of $1$.
3. **One-Hot Encoding**: The categorical attribute `Ship_Type` is transformed into binary column vectors. Infrequent or unknown ship classes at inference are handled gracefully (`handle_unknown='ignore'`).
4. **Target Encoding**:
   * **Regression**: Predictions are fitted directly to raw numerical vectors (`Delay_Months` and `Delay_Percentage`).
   * **Classification**: Ordinal text targets (`Low`, `Medium`, `High`, `Critical`) are mapped to integer values:
     $$\text{Low} \to 0, \quad \text{Medium} \to 1, \quad \text{High} \to 2, \quad \text{Critical} \to 3$$

---

## 2. Feature Engineering

Domain-specific features are created to capture engineering, supply chain, and organizational risks:

* **Complexity-to-Maturity Ratio**:
  $$\text{Complexity\_to\_Maturity} = \frac{\text{Technical\_Complexity}}{\text{Technology\_Maturity} + 0.1}$$
  High complexity combined with low technology maturity indicates high execution risk.
* **Cost Intensity**:
  $$\text{Cost\_Intensity} = \frac{\text{Project\_Cost}}{\text{Planned\_Duration} + 0.1}$$
  Indicates the average monthly capital flow. Extremely high burn rates correlate with oversight overhead and approval delays.
* **Cumulative Delay Aggregations**:
  * **Total Admin Delay Days** = $\text{Approval} + \text{Tender} + \text{Contract} + \text{Funding} + \text{Clearance}$
  * **Total Physical Delay Days** = $\text{Construction} + \text{Testing}$
* **Quality Failure Index (QFI)**:
  $$\text{QFI} = (1.0 \times \text{QA\_Issues}) + (2.0 \times \text{Inspection\_Failures}) + (4.0 \times \text{FAT\_Failures}) + (6.0 \times \text{SAT\_Failures})$$
  Penalizes failures in late-stage trials (SAT) much more heavily than early-stage indicators (QA issues).
* **Vendor Risk Score**:
  $$\text{Vendor\_Risk\_Score} = (5.0 - \text{Vendor\_Performance}) \times \left(1.0 + \frac{\text{Imported\_Equipment}}{100.0}\right)$$
  Multiplies poor vendor performance by reliance on foreign imported equipment.

---

## 3. Modeling Algorithms

The pipeline fits and evaluates four major families of machine learning algorithms for both regression and classification:

### A. Decision Tree
* **Regressor & Classifier**: Serves as a baseline model.
* **Properties**: Simple, highly interpretable, non-parametric, but prone to variance/overfitting. Depth is constrained (max depth = 6 to 8) to ensure generalization.

### B. Random Forest
* **Regressor & Classifier**: An ensemble bagging algorithm.
* **Properties**: Trains multiple deep decision trees in parallel on bootstrap samples and aggregates their predictions (averaging for regression, voting for classification). Reduces overfitting significantly.

### C. Gradient Boosting (GBM)
* **Regressor & Classifier**: An ensemble boosting algorithm.
* **Properties**: Trains shallow trees sequentially. Each new tree corrects the residual errors of the prior ensemble using gradient descent on the loss function. High prediction accuracy.

### D. XGBoost (Extreme Gradient Boosting)
* **Regressor & Classifier**: Highly optimized gradient boosting framework.
* **Properties**: Implements L1 and L2 regularization to control model complexity, parallel tree learning, and handles sparse data matrices efficiently. Used if installed in the environment.

---

## 4. Model Evaluation Metrics

### Regression Metrics (Target: Delay Percentage & Delay Months)
* **Mean Absolute Error (MAE)**: $\frac{1}{n} \sum |y_i - \hat{y}_i|$ (interpretable in months/percentage).
* **Mean Squared Error (MSE)**: $\frac{1}{n} \sum (y_i - \hat{y}_i)^2$ (penalizes large outlier errors).
* **Root Mean Squared Error (RMSE)**: $\sqrt{\text{MSE}}$.
* **R-squared ($R^2$) Score**: Proportions of variance explained by features. Best model selection is based on maximizing this metric.
* **Mean Absolute Percentage Error (MAPE)**: Percentage error relative to actual.

### Classification Metrics (Target: Risk Category)
* **Accuracy**: Proportion of correct risk tier classifications.
* **Precision / Recall / F1-Score**: Evaluated using both macro average and weighted average to account for class imbalance (Aircraft Carriers are rare, leading to fewer Critical cases). Best classification model is selected by maximizing **Weighted F1-score**.
* **ROC-AUC (Receiver Operating Characteristic - Area Under Curve)**: One-vs-Rest (OvR) weighted average. Measures the model's ability to distinguish between risk tiers.

---

## 5. Inference and PMG Recommendation Pipeline

### Explainability Engine
To explain *why* a project is predicted to have a high delay risk:
1. The system compares the project's input values against the dataset's **baseline defaults** to calculate feature deviations.
2. It weights the deviations by the best regression model's **built-in feature importances** (Gini impurity or gain-based importances).
3. The top 5 features with the highest risk scores are returned as key risk factors.

### PMG Recommendation Engine
A rule-based steering logic translates risk factors and predicted tiers into actionable project management decisions:

* **High administrative delays** ($>90$ days) trigger a recommendation to "escalate approvals via a dedicated clearance desk."
* **High requirement changes** ($>4$) trigger a recommendation to "freeze the design baseline and convene the Configuration Control Board (CCB)."
* **Critical risk classification** triggers a recommendation to "escalate the project to Ministry of Defense / PMG Tier-2 cabinet review for contingency funding."
