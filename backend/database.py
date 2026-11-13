from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# Find .env in the same directory as this file (backend/)
_backend_dir = os.path.dirname(os.path.abspath(__file__))
_env_path = os.path.join(_backend_dir, '.env')
load_dotenv(_env_path)

import time

DATABASE_URL = os.getenv('DATABASE_URL')
if os.getenv("TESTING") == "1":
    DATABASE_URL = "sqlite:///:memory:"

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set in .env or environment variables.")

# Support SQLite or MySQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,       # Reconnect on stale connections
        pool_recycle=1800,        # Recycle connections every 30 min (prevents MySQL timeout)
        pool_size=10,             # Keep 10 persistent connections in pool
        max_overflow=20,          # Allow 20 extra connections under burst load
        pool_timeout=30,          # Wait up to 30s for a connection before erroring
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def init_db(max_retries: int = 15, retry_delay: float = 2.0):
    for attempt in range(1, max_retries + 1):
        try:
            Base.metadata.create_all(bind=engine)
            # Ensure newly added columns exist on existing tables without manual SQL migration scripts
            try:
                with engine.begin() as conn:
                    for col_name, col_type in [
                        ("assigned_worker", "VARCHAR(100) NULL"),
                        ("worker_notes", "TEXT NULL"),
                        ("assigned_at", "DATETIME NULL"),
                    ]:
                        try:
                            conn.execute(text(f"ALTER TABLE reports ADD COLUMN {col_name} {col_type}"))
                        except Exception:
                            pass
            except Exception as e:
                print(f"[INIT_DB WARNING] Schema column check notice: {e}")
            print("[INIT_DB] Database successfully initialized.")
            return
        except Exception as e:
            if attempt < max_retries:
                print(f"[INIT_DB] Database not ready yet (attempt {attempt}/{max_retries}: {e}). Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                print(f"[INIT_DB ERROR] Could not connect to database after {max_retries} attempts: {e}")
                raise

