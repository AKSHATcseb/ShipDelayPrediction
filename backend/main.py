"""
FastAPI application entry point.
Mounts routers, sets up CORS policy, and runs database migrations + seed script on startup.
"""

import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.config import CORS_ORIGINS, HOST, PORT
from backend.database import init_db, SessionLocal, migrate_database
from backend.seed import seed_database

# Import routers
from backend.api import auth, templates, projects, activities, predictions, dashboard, reports

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] %(message)s"
)
logger = logging.getLogger("backend")

app = FastAPI(
    title="Indian Navy Ship Acquisition PMIS",
    description="Enterprise Project Management Information System with ML Delay Predictions",
    version="2.0.0"
)

# CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(templates.router)
app.include_router(projects.router)
app.include_router(activities.router)
app.include_router(predictions.router)
app.include_router(dashboard.router)
app.include_router(reports.router)

@app.on_event("startup")
def startup_event():
    """Startup initialization of database and seeding default values."""
    logger.info("Starting up FastAPI application...")
    
    # Initialize SQL database tables
    logger.info("Initializing SQL database schemas...")
    init_db()
    
    # Run database migrations
    logger.info("Running database migrations...")
    migrate_database()
    
    # Run seed script
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
        
    logger.info("FastAPI initialization sequence complete.")


@app.get("/api/health")
def health_check():
    """Simple status check for operational readiness."""
    return {"status": "healthy", "service": "PMIS backend"}



# Mount static files at root (must be mounted last to avoid shadowing api routes)
static_dir = Path(__file__).resolve().parent / "static"
static_dir.mkdir(exist_ok=True)
app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

