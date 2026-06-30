"""
app.py

Streamlit web application for the Ship Acquisition Delay Prediction System.
Provides a premium, responsive graphical interface to make delay predictions,
examine PMG recommendations, inspect model metrics, and launch training.
"""

import streamlit as st
import pandas as pd
import numpy as np
import json
from pathlib import Path

# Set page config first
st.set_page_config(
    page_title="Indian Navy Ship Delay Prediction System",
    page_icon="⚓",
    layout="wide",
    initial_sidebar_state="expanded"
)

from predict import predict_project_delays
from explain_prediction import explain_prediction_details
from config import RAW_DATA_PATH, DATA_DIR, PLOTS_DIR
from main import run_pipeline
from constants import SHIP_TYPES, SHIP_CHARACTERISTICS

# --- Premium Custom Styling (CSS) ---
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Outfit', sans-serif;
    }
    
    /* Header Gradient styling */
    .main-header {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        padding: 2.5rem;
        border-radius: 15px;
        color: white;
        text-align: center;
        margin-bottom: 2rem;
        border-bottom: 4px solid #38bdf8;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }
    
    .main-header h1 {
        font-weight: 800;
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        color: #f8fafc;
    }
    
    .main-header p {
        font-size: 1.1rem;
        color: #94a3b8;
    }
    
    /* Risk cards styling */
    .metric-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 1.5rem;
        text-align: center;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    
    .metric-title {
        font-size: 0.9rem;
        color: #64748b;
        text-transform: uppercase;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }
    
    .metric-value {
        font-size: 2rem;
        font-weight: 800;
        margin-bottom: 0.2rem;
    }
    
    /* Risk Category color schemes */
    .risk-Low {
        background-color: #dcfce7;
        color: #15803d;
        border: 2px solid #bbf7d0;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-weight: 700;
        font-size: 1.2rem;
    }
    .risk-Medium {
        background-color: #fef3c7;
        color: #b45309;
        border: 2px solid #fde68a;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-weight: 700;
        font-size: 1.2rem;
    }
    .risk-High {
        background-color: #fee2e2;
        color: #b91c1c;
        border: 2px solid #fecaca;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-weight: 700;
        font-size: 1.2rem;
    }
    .risk-Critical {
        background-color: #f3e8ff;
        color: #6b21a8;
        border: 2px solid #e9d5ff;
        border-radius: 8px;
        padding: 0.5rem 1rem;
        font-weight: 700;
        font-size: 1.2rem;
    }
    
    /* Recommendations container style */
    .rec-box {
        background-color: #f1f5f9;
        border-left: 5px solid #0284c7;
        border-radius: 4px;
        padding: 1rem;
        margin-bottom: 0.8rem;
    }
    
    .rec-category {
        font-weight: 700;
        color: #0369a1;
        font-size: 0.95rem;
        text-transform: uppercase;
        margin-bottom: 0.3rem;
    }
    
    .rec-text {
        font-size: 1rem;
        color: #334155;
    }
    
    /* Sidebar styling */
    .css-1542z7w {
        background-color: #0f172a;
    }
    </style>
""", unsafe_allow_html=True)

# --- Header Section ---
st.markdown("""
    <div class="main-header">
        <h1>⚓ INDIAN NAVY SHIP ACQUISITION DELAY PREDICTION</h1>
        <p>Advanced Machine Learning & Explainable AI (XAI) System for Project Risk Mitigation</p>
    </div>
""", unsafe_allow_html=True)

# --- Load Dashboard Data if available ---
metrics_path = DATA_DIR / "dashboard_metrics.json"
dashboard_data = None
if metrics_path.exists():
    with open(metrics_path, "r", encoding="utf-8") as f:
        dashboard_data = json.load(f)

# --- Sidebar Inputs Panel ---
st.sidebar.markdown("### 🛠️ Project Configuration")

# Ship selection
ship_type = st.sidebar.selectbox("Select Vessel Class", SHIP_TYPES, index=3) # Default Submarine

# Get ship specific baseline to initialize sliders sensibly
ship_baselines = SHIP_CHARACTERISTICS[ship_type]

# Dynamic sliders initializing from ship-type baselines
project_cost = st.sidebar.slider(
    "Project Cost (Crores INR)", 
    min_value=100.0, 
    max_value=60000.0, 
    value=float(ship_baselines["cost_mode"]),
    step=100.0
)

planned_duration = st.sidebar.slider(
    "Planned Duration (Months)",
    min_value=12,
    max_value=180,
    value=int(ship_baselines["duration_mode"]),
    step=2
)

planned_size = st.sidebar.slider(
    "Displacement Size (Tonnage / 1000)",
    min_value=0.1,
    max_value=50.0,
    value=float(ship_baselines["size_mode"]),
    step=0.5
)

tech_complexity = st.sidebar.slider(
    "Technical Complexity (1-10)",
    min_value=1.0,
    max_value=10.0,
    value=float(ship_baselines["complexity_mode"]),
    step=0.1
)

tech_maturity = st.sidebar.slider(
    "Technology Maturity (1-10)",
    min_value=1.0,
    max_value=10.0,
    value=float(ship_baselines["maturity_mode"]),
    step=0.1
)

foreign_dependency = st.sidebar.checkbox(
    "Foreign OEM Dependency", 
    value=bool(ship_baselines["foreign_dep_prob"] >= 0.5)
)

st.sidebar.markdown("---")
st.sidebar.markdown("### ⚠️ Delay and Risk Factors")

approval_delay = st.sidebar.slider("Approval Delay (Days)", 0, 365, 45)
vendor_delay = st.sidebar.slider("Vendor Delay (Days)", 0, 365, 90)
requirement_changes = st.sidebar.slider("Requirement Changes Count", 0, 25, 3)

st.sidebar.markdown("---")
# Button to run training
if st.sidebar.button("⚙️ Retrain ML Models (1000 rows)"):
    with st.spinner("Generating dataset & training all models (approx. 10-15s)..."):
        try:
            run_pipeline(size=1000, seed=42)
            st.sidebar.success("Models retrained successfully!")
            st.rerun()
        except Exception as e:
            st.sidebar.error(f"Error training models: {e}")

# --- Tab Layout ---
tab_predict, tab_model_perf, tab_data_insights = st.tabs([
    "🎯 Real-time Delay Prediction & PMG Action Plan",
    "📊 Model Performance & Comparisons",
    "📈 Fleet Exploratory Insights"
])

# --- TAB 1: Single Prediction & Explainability ---
with tab_predict:
    col_input_summary, col_results = st.columns([1, 2])
    
    with col_input_summary:
        st.markdown("### 📋 Input Summary")
        st.info(f"""
        **Vessel Class**: {ship_type}  
        **Planned Duration**: {planned_duration} months  
        **Budget**: {project_cost:,.0f} Crores INR  
        **Size**: {planned_size:.1f} T displacement  
        **Foreign OEM Dependency**: {'Yes' if foreign_dependency else 'No'}  
        **Technical Complexity**: {tech_complexity:.1f}/10  
        **Technology Maturity**: {tech_maturity:.1f}/10  
        """)
        
        # Prepare inputs
        query_input = {
            "Ship_Type": ship_type,
            "Project_Cost": project_cost,
            "Project_Size": planned_size,
            "Planned_Duration": planned_duration,
            "Technical_Complexity": tech_complexity,
            "Technology_Maturity": tech_maturity,
            "Foreign_Dependency": foreign_dependency,
            "Approval_Delay": approval_delay,
            "Vendor_Delay": vendor_delay,
            "Requirement_Changes": requirement_changes
        }
        
    with col_results:
        st.markdown("### 🔮 Predicted Project Delay Tiers")
        
        # Run prediction
        try:
            pred = predict_project_delays(query_input)
            explain = explain_prediction_details(query_input, pred)
            
            # Display metrics in cards
            c_pct, c_months, c_risk = st.columns(3)
            
            with c_pct:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-title">Predicted Delay %</div>
                    <div class="metric-value" style="color:#0284c7;">{pred['Predicted_Delay_Percentage']:.1f}%</div>
                </div>
                """, unsafe_allow_html=True)
                
            with c_months:
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-title">Predicted Delay Months</div>
                    <div class="metric-value" style="color:#e0f2fe; background-color:#0369a1; border-radius: 8px; padding: 0.1rem 0;">{pred['Predicted_Delay_Months']:.1f}m</div>
                </div>
                """, unsafe_allow_html=True)
                
            with c_risk:
                risk_tier = pred['Predicted_Risk_Category']
                st.markdown(f"""
                <div class="metric-card">
                    <div class="metric-title">Predicted Risk Category</div>
                    <div class="risk-{risk_tier}">{risk_tier} Risk</div>
                    <div style="font-size: 0.8rem; color:#64748b; margin-top:0.3rem;">Confidence: {pred['Prediction_Confidence']}%</div>
                </div>
                """, unsafe_allow_html=True)
                
            st.markdown("---")
            
            # Risk Drivers & Recommendations columns
            col_drivers, col_recs = st.columns([1, 1])
            
            with col_drivers:
                st.markdown("#### 🔍 Primary Delay Drivers (Feature Deviations)")
                
                for idx, driver in enumerate(explain["Top_Risk_Drivers"]):
                    # Determine progress bar color
                    val = driver['value']
                    base = driver['baseline']
                    dev = driver['deviation_pct']
                    feat_lbl = driver['feature'].replace('_', ' ')
                    
                    st.write(f"**{idx+1}. {feat_lbl}**")
                    st.caption(f"Value: **{val}** (Baseline default: {base}) | Deviation: **+{dev}%**")
                    
                    # Normalized progress bar (clip between 0.1 and 1.0)
                    prog_val = min(1.0, max(0.05, float(driver['risk_score']) * 5.0))
                    st.progress(prog_val)
                    
            with col_recs:
                st.markdown("#### 🛡️ PMG Steering Committee Recommendations")
                
                for rec in explain["PMG_Recommendations"]:
                    st.markdown(f"""
                    <div class="rec-box">
                        <div class="rec-category">{rec['category']}</div>
                        <div class="rec-text">{rec['recommendation']}</div>
                    </div>
                    """, unsafe_allow_html=True)
                    
        except FileNotFoundError:
            st.error("⚠️ Model files not found! Please run training first using the sidebar retrain button or run `python main.py` in your terminal.")

# --- TAB 2: Model Performance ---
with tab_model_perf:
    st.markdown("### 📊 Pipeline Model Evaluation & Comparison")
    
    if dashboard_data:
        best_reg = dashboard_data["model_comparison"]["best_regression_model"]
        best_cls = dashboard_data["model_comparison"]["best_classification_model"]
        
        st.success(f"🏆 **Selected Production Pipeline Models**: Regression: **{best_reg}** | Classification: **{best_cls}**")
        
        c_reg_metrics, c_cls_metrics = st.columns(2)
        
        with c_reg_metrics:
            st.markdown("#### Regression Models Comparison (Target: Delay Percentage)")
            df_reg = pd.DataFrame(dashboard_data["model_comparison"]["regression_percentage_metrics"]).T
            st.dataframe(df_reg.style.highlight_max(axis=0, subset=["R2"]).highlight_min(axis=0, subset=["MAE", "RMSE", "MAPE"]))
            
            st.markdown("#### Regression Models Comparison (Target: Delay Months)")
            df_reg_m = pd.DataFrame(dashboard_data["model_comparison"]["regression_months_metrics"]).T
            st.dataframe(df_reg_m.style.highlight_max(axis=0, subset=["R2"]).highlight_min(axis=0, subset=["MAE", "RMSE", "MAPE"]))
            
        with c_cls_metrics:
            st.markdown("#### Classification Models Comparison (Target: Risk Category)")
            df_cls = pd.DataFrame(dashboard_data["model_comparison"]["classification_metrics"]).T
            st.dataframe(df_cls.style.highlight_max(axis=0, subset=["Accuracy", "Weighted_F1", "ROC_AUC"]))
            
        # Display Feature Importance Plot
        st.markdown("---")
        st.markdown("#### Model Feature Importance & Diagnosis Plots")
        
        col_img_imp, col_img_cm = st.columns(2)
        
        with col_img_imp:
            feat_imp_plot = PLOTS_DIR / "feature_importance.png"
            if feat_imp_plot.exists():
                st.image(str(feat_imp_plot), caption="Top Feature Importances from Best Regressor", use_container_width=True)
            else:
                st.info("Feature importance plot not generated yet.")
                
        with col_img_cm:
            cm_plot = PLOTS_DIR / "confusion_matrix.png"
            if cm_plot.exists():
                st.image(str(cm_plot), caption="Confusion Matrix of Risk Classification (Test Partition)", use_container_width=True)
            else:
                st.info("Confusion matrix plot not generated yet.")
    else:
        st.info("💡 Model comparison data is not generated yet. Click the sidebar Retrain button or run `python main.py` to train all models and generate the dashboards comparison table.")

# --- TAB 3: Dataset Insights ---
with tab_data_insights:
    st.markdown("### 📈 Historical Ship Fleet Acquisition Statistics")
    
    if dashboard_data:
        stats = dashboard_data["dataset_summary"]
        
        c_tot, c_m_delay, c_pct_delay = st.columns(3)
        c_tot.metric("Total Generated Historical Projects", f"{stats['total_projects']:,}")
        c_m_delay.metric("Average Project Delay (Months)", f"{stats['avg_delay_months']} months")
        c_pct_delay.metric("Average Project Delay (%)", f"{stats['avg_delay_pct']}%")
        
        st.markdown("---")
        
        col_type_table, col_dist_plots = st.columns([1, 1])
        
        with col_type_table:
            st.markdown("#### Acquisition Averages by Ship Type Class")
            df_ship_stats = pd.DataFrame(stats["ship_type_breakdown"])
            df_ship_stats = df_ship_stats.rename(columns={
                "Avg_Cost_Cr": "Avg Cost (Cr)",
                "Avg_Duration_Months": "Avg Duration (months)",
                "Avg_Delay_Months": "Avg Delay (months)",
                "Avg_Delay_Percentage": "Avg Delay (%)"
            })
            st.dataframe(df_ship_stats.set_index("Ship_Type").style.background_gradient(cmap="Blues", subset=["Count"]))
            
        with col_dist_plots:
            risk_plot = PLOTS_DIR / "risk_distribution.png"
            if risk_plot.exists():
                st.image(str(risk_plot), caption="Vessel Counts across Risk Categories", use_container_width=True)
                
        st.markdown("---")
        st.markdown("#### Pipeline Delays and Correlations")
        col_dist, col_heatmap = st.columns(2)
        
        with col_dist:
            dist_plot = PLOTS_DIR / "delay_distribution.png"
            if dist_plot.exists():
                st.image(str(dist_plot), caption="Delay Duration and Percentage Distributions", use_container_width=True)
                
        with col_heatmap:
            heatmap_plot = PLOTS_DIR / "correlation_heatmap.png"
            if heatmap_plot.exists():
                st.image(str(heatmap_plot), caption="Correlation Matrix of Baseline Pipeline Parameters", use_container_width=True)
                
    else:
        st.info("💡 Dataset insight summaries are not generated yet. Click the sidebar Retrain button or run `python main.py` first.")
