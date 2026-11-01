import logging
from sqlalchemy import inspect, text
from app.database import engine, Base

# Import all models so metadata knows all tables
import app.models.user
import app.models.academic
import app.models.content
import app.models.import_
import app.models.class_chat
import app.models.chat
import app.models.results
import app.models.gamification
import app.models.chat_session
import app.models.jobs

logger = logging.getLogger(__name__)

def run_migrations():
    """
    Safely applies schema updates to SQLite or PostgreSQL without dropping data.
    1. Runs Base.metadata.create_all to create any newly defined tables.
    2. Inspects existing tables and issues ALTER TABLE ADD COLUMN for any missing columns.
    """
    logger.info("Running database migrations...")
    
    # 1. Create any missing tables
    Base.metadata.create_all(bind=engine)
    
    # 2. Check and alter existing tables for newly introduced columns
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    columns_to_ensure = {
        "users": [
            ("roll_number", "VARCHAR", "NULL"),
            ("study_streak_count", "INTEGER", "0"),
            ("last_active_date", "DATE", "NULL"),
            ("xp_points", "INTEGER", "0"),
            ("badge_level", "VARCHAR", "'Bronze'"),
            ("last_notices_viewed_at", "TIMESTAMP", "NULL"),
            ("last_jobs_viewed_at", "TIMESTAMP", "NULL"),
        ],
        "subjects": [
            ("credits", "INTEGER", "3"),
        ],
        "announcements": [
            ("priority", "VARCHAR", "'general'"),
            ("subject_id", "INTEGER", "NULL"),
            ("pinned", "BOOLEAN", "FALSE"),
            ("expires_at", "TIMESTAMP", "NULL"),
        ]
    }

    for table_name, cols in columns_to_ensure.items():
        if table_name in existing_tables:
            existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
            for col_name, col_type, default_val in cols:
                if col_name not in existing_cols:
                    logger.info(f"Adding missing column '{col_name}' ({col_type}) to table '{table_name}'...")
                    if default_val == "NULL":
                        stmt = text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
                    else:
                        stmt = text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type} DEFAULT {default_val}")
                    try:
                        with engine.begin() as conn:
                            conn.execute(stmt)
                        logger.info(f"Successfully added '{col_name}' to '{table_name}'.")
                    except Exception as e:
                        logger.warning(f"Could not add column '{col_name}' to '{table_name}': {e}")
                            
    logger.info("Database migration check completed successfully.")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run_migrations()

