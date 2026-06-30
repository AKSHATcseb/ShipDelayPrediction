# Indian Navy Ship Acquisition PMIS (Project Management Information System)

An enterprise-grade, full-stack Project Management Information System (PMIS) tailored for planning, scheduling, monitoring, and delay risk prediction of large-scale ship acquisition programs.

Instead of predicting delays from flat, project-level summaries, this system is built on a realistic **activity-level database schema**. It simulates sequential and parallel workflow dependencies (Directed Acyclic Graphs), tracks live updates, propagates delays, and leverages Machine Learning (XGBoost & Gradient Boosting) to forecast handover dates and provide PMG action recommendations.

---

## Key Features

1. **Modular Authentication**: Clean, secure login panel using PBKDF2-HMAC-SHA256 password hashes and signed JWT session tokens. Defaults to `admin` / `admin` for local development.
2. **Workflow Template Builder**: Define reusable project lifecycles (e.g. Nomination, Competitive, Indigenous Procurement). Supports custom names, activity categorization, sequence indexing, expected durations, risk weights, milestones, and predecessor mappings.
3. **DAG Scheduling & Date Cascade**: Instantiates live projects from templates. Auto-schedules planned start/end dates by traversing the dependency DAG from the project's start date. Updates propagate downstream delays automatically using a Critical Path Method (CPM) forward pass.
4. **Day-by-Day Event Simulator**: Runs high-fidelity daily execution simulations of vessel acquisition lifecycles, injecting probabilistic delay events (vendor bottlenecks, approval holds, testing failures) to build robust model training datasets.
5. **Real-time ML Delays Forecast**: Triggers XGBoost regressors and classifiers on the fly when activities are updated. Yields predicted delay percentages, delay months, risk category tiers (Low, Medium, High, Critical), and model confidence.
6. **XAI & Action Recommendations**: Compares project parameters against historical baselines to flag the top 5 risk drivers. Outputs context-aware PMG action recommendations (e.g. freeze requirements, reallocate shipyard labor, build import buffers).
7. **SVG Gantt Chart**: Dynamic, responsive Gantt timelines rendered directly via SVG in the browser, highlighting milestones and the critical path.
8. **Document Exporters**: Export formatted status reports directly as PDF files (via ReportLab) and Excel spreadsheets (via openpyxl).

---

## Directory Structure

```
ShipDelayPrediction/
├── backend/                     # FastAPI Backend Server
│   ├── api/                     # Auth, Template, Project, Activity, Predictions & Dashboard routers
│   ├── models/                  # SQLAlchemy ORM models (SQLite database)
│   ├── schemas/                 # Pydantic validation schemas
│   ├── services/                # Database logic & CPM date calculators
│   ├── static/                  # Single Page Frontend SPA (index.html)
│   ├── database.py              # SQL session factory
│   ├── seed.py                  # Seeder for templates and default users
│   └── main.py                  # API App factory
│
├── ml/                          # Activity-Level ML Pipeline
│   ├── constants.py             # Vessel specs and default templates
│   ├── config.py                # ML paths and hyper-parameters
│   ├── dataset_builder.py       # Orchestrates simulations and splits
│   ├── simulation_engine.py     # Day-by-day project execution simulator
│   ├── preprocessor.py          # StandardScaler & OneHotEncoder
│   ├── trainer.py               # Fits DT/RF/GB/XGBoost models
│   ├── evaluator.py             # Computes MAE, RMSE, R2, F1-scores
│   ├── predictor.py             # Server inference handler
│   ├── explainer.py             # Feature deviations calculator
│   └── recommendation.py        # PMG rule matcher
│
├── run_pipeline.py              # CLI: Generate dataset & train models
├── run_server.py                # CLI: Start backend & serve frontend
├── Dockerfile                   # Single container builder
└── docker-compose.yml           # Compose coordinator
```

---

## Setup & Installation

### 1. Prerequisites
Ensure you have **Python 3.11+** installed on your system.

### 2. Install Dependencies
Clone the repository and install all required python libraries:
```bash
pip install -r requirements.txt
```

---

## CLI Workflows

### 1. Generate Data & Train Models
Orchestrate the procedural generation of templates, day-by-day execution simulations, preprocessing, model fitting, and export evaluation plots:
```bash
# Simulates 1000 projects, extracts ~7000 progress snapshots, and fits ML models
python run_pipeline.py --projects 1000 --seed 42
```
Output files will generate under `data/`, `models/`, and diagnostic plots under `plots/`.

### 2. Start the PMIS Web Application
Launch the FastAPI backend. On startup, the server automatically initializes the SQLite database and seeds default data:
```bash
python run_server.py
```
Open your browser and navigate to **`http://localhost:8000`** to access the Project Management Information System!

*   **Login Credentials**:
    *   **Username**: `admin`
    *   **Password**: `admin`

---

## Container Deployment

To run the application inside Docker:

```bash
# Build and start container
docker-compose up --build -d

# Check server logs
docker-compose logs -f
```
Access the application on **`http://localhost:8000`**. The SQLite database is persisted inside the named volume `pmis-db-volume`.

---

## Verification & Auditing

### Automated Tests
Run the pipeline to test model compilation:
```bash
python run_pipeline.py --projects 50 --seed 42
```
Ensure all joblib `.pkl` binaries, CSV splits, and plot files export successfully under their respective directories.
