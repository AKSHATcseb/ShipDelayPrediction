"""
Seed script.
Seeds the default users (e.g. admin/admin) and pre-populates default Project Templates
from ml/constants.py.
"""

import logging
from sqlalchemy.orm import Session
from backend.database import SessionLocal, init_db
from backend.models.user import User, UserRole
from backend.services.auth_service import hash_password
from backend.services.template_service import create_template
from ml.constants import DEFAULT_TEMPLATES

logger = logging.getLogger("seed")

def seed_database(db: Session):
    """Populates database tables with default values."""
    logger.info("Starting database seeding...")
    
    # 1. Seed default user admin/admin
    admin_user = db.query(User).filter(User.username == "admin").first()
    if not admin_user:
        admin_user = User(
            username="admin",
            hashed_password=hash_password("admin"),
            email="admin@navy.gov.in",
            full_name="Naval System Admin",
            role=UserRole.ADMIN,
            is_active=True,
            is_first_login=True
        )
        db.add(admin_user)
        logger.info("Admin user seeded (username: 'admin', password: 'admin')")
    
    # Seed default PM user pm/admin
    pm_user = db.query(User).filter(User.username == "pm").first()
    if not pm_user:
        pm_user = User(
            username="pm",
            hashed_password=hash_password("admin"),
            email="pm@navy.gov.in",
            full_name="Naval Project Manager",
            role=UserRole.PROJECT_MANAGER,
            is_active=True,
            is_first_login=True
        )
        db.add(pm_user)
        logger.info("PM user seeded (username: 'pm', password: 'admin')")

    # Seed default Viewer user viewer/admin
    viewer_user = db.query(User).filter(User.username == "viewer").first()
    if not viewer_user:
        viewer_user = User(
            username="viewer",
            hashed_password=hash_password("admin"),
            email="viewer@navy.gov.in",
            full_name="Naval Project Observer",
            role=UserRole.VIEWER,
            is_active=True,
            is_first_login=True
        )
        db.add(viewer_user)
        logger.info("Viewer user seeded (username: 'viewer', password: 'admin')")
        
    db.commit()

    # 2. Seed default project templates
    for name, activities in DEFAULT_TEMPLATES.items():
        # Check if template already exists
        from backend.models.template import ProjectTemplate
        existing = db.query(ProjectTemplate).filter(ProjectTemplate.name == name).first()
        if not existing:
            # We convert dependency format to sequence matching sequence_number list
            activities_data = []
            for act in activities:
                activities_data.append({
                    "name": act["name"],
                    "description": f"Standard workflow stage for {act['name']}",
                    "category": act["category"],
                    "sequence_number": act["sequence_number"],
                    "parallel_group": act["parallel_group"],
                    "dependency_list": act["dependency_list"],
                    "default_duration_months": act["default_duration_months"],
                    "historical_risk_weight": act["historical_risk_weight"],
                    "responsible_department": act["responsible_department"],
                    "is_milestone": act["is_milestone"],
                    "is_critical_path": act["is_critical_path"]
                })
            
            try:
                create_template(db, name, f"Pre-configured {name} lifecycle workflow.", activities_data, created_by=admin_user.id)
                logger.info(f"Seeded template '{name}' successfully.")
            except Exception as e:
                logger.error(f"Error seeding template '{name}': {e}")
        else:
            logger.info(f"Template '{name}' already exists.")

    logger.info("Database seeding completed.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
