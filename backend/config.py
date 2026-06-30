"""
Backend configuration module.
Loads settings from environment variables with sensible defaults.
"""

import os
from pathlib import Path

# Base directory is the project root (parent of backend/)
BASE_DIR = Path(__file__).resolve().parent.parent

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'database' / 'pmis.db'}")

# JWT Authentication
SECRET_KEY = os.getenv("SECRET_KEY", "ship-pmis-dev-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_MINUTES = int(os.getenv("JWT_EXPIRY_MINUTES", "480"))

# Default admin credentials (simple for local dev)
DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin")

# Directory paths
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
PLOTS_DIR = BASE_DIR / "plots"
DATABASE_DIR = BASE_DIR / "database"

# CORS
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8000").split(",")

# Server
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Ensure directories exist
for d in [DATA_DIR, MODELS_DIR, PLOTS_DIR, DATABASE_DIR]:
    d.mkdir(parents=True, exist_ok=True)
