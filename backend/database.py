"""
SQLAlchemy database engine, session factory, and base model.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from backend.config import DATABASE_URL

# Enable WAL mode for SQLite concurrent reads
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False,
    pool_pre_ping=True,
)

# Enable foreign keys for SQLite
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


def get_db():
    """FastAPI dependency that yields a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all database tables."""
    # Import all models so SQLAlchemy registers them
    import backend.models.user  # noqa: F401
    import backend.models.template  # noqa: F401
    import backend.models.project  # noqa: F401
    import backend.models.activity  # noqa: F401
    import backend.models.prediction  # noqa: F401
    Base.metadata.create_all(bind=engine)


def migrate_database():
    """Applies schema migrations for new columns to SQLite database if missing."""
    import logging
    from sqlalchemy import text
    logger = logging.getLogger("backend.database")
    
    with engine.connect() as conn:
        # Check and add duration_months
        try:
            conn.execute(text("SELECT duration_months FROM project_activities LIMIT 1"))
        except Exception:
            logger.info("Migration: Adding duration_months column to project_activities table...")
            conn.execute(text("ALTER TABLE project_activities ADD COLUMN duration_months FLOAT DEFAULT 1.0"))
            conn.commit()
            
        # Check and add remaining_months
        try:
            conn.execute(text("SELECT remaining_months FROM project_activities LIMIT 1"))
        except Exception:
            logger.info("Migration: Adding remaining_months column to project_activities table...")
            conn.execute(text("ALTER TABLE project_activities ADD COLUMN remaining_months FLOAT DEFAULT 1.0"))
            conn.commit()
            
        # Populate values for existing records based on planned_start_date and planned_end_date
        try:
            from backend.models.activity import ProjectActivity, ActivityStatus
            from datetime import date
            
            db = SessionLocal()
            activities = db.query(ProjectActivity).all()
            updated = False
            for act in activities:
                # If duration was not calculated, or it's default 1.0 but has custom dates
                if act.planned_start_date and act.planned_end_date:
                    dur = round((act.planned_end_date - act.planned_start_date).days / 30.0, 1)
                    if act.duration_months == 1.0 and dur != 1.0:
                        act.duration_months = dur
                        updated = True
                
                # Setup remaining_months based on status
                if act.current_status == ActivityStatus.COMPLETED:
                    if act.remaining_months != 0.0:
                        act.remaining_months = 0.0
                        updated = True
                elif act.current_status == ActivityStatus.NOT_STARTED:
                    if act.remaining_months != act.duration_months:
                        act.remaining_months = act.duration_months or 1.0
                        updated = True
                else: # InProgress, Delayed, Blocked
                    if act.planned_end_date:
                        rem = round(max(0, (act.planned_end_date - date.today()).days) / 30.0, 1)
                        if act.remaining_months == 1.0 and rem != 1.0:
                            act.remaining_months = rem
                            updated = True
            if updated:
                db.commit()
            db.close()
        except Exception as e:
            logger.error(f"Migration error while pre-populating: {e}")
