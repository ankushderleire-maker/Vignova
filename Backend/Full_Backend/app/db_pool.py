"""
Centralized PostgreSQL connection pool.

Usage:
    from app.db_pool import get_db_connection, run_migrations

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT ...")
        conn.commit()
"""

import contextlib
import logging
import os
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from psycopg2 import pool as pg_pool

logger = logging.getLogger("db_pool")

_pool: pg_pool.ThreadedConnectionPool | None = None


def _build_pool() -> pg_pool.ThreadedConnectionPool:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL environment variable is not set")

    parsed = urlparse(db_url)
    new_pool = pg_pool.ThreadedConnectionPool(
        minconn=2,
        maxconn=10,
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=parsed.path.lstrip("/"),
        user=parsed.username,
        password=parsed.password,
        connect_timeout=5,
        # Kill idle-in-transaction sessions automatically (mirrors PG server setting)
        options="-c idle_in_transaction_session_timeout=30000",
    )
    logger.info("PostgreSQL connection pool initialized (min=2 max=10)")
    return new_pool


def _get_pool() -> pg_pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = _build_pool()
    return _pool


@contextlib.contextmanager
def get_db_connection():
    """
    Borrow a connection from the pool.  Always commits or rolls back and
    returns the connection to the pool — even on exception.

    with get_db_connection() as conn:
        ...
        conn.commit()   # caller must commit explicitly
    """
    pool = _get_pool()
    conn = pool.getconn()
    try:
        yield conn
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            pool.putconn(conn)
        except Exception:
            pass


# ── Migrations ──────────────────────────────────────────────────────────

def run_migrations() -> None:
    """
    Apply any un-applied *.sql files from the migrations/ directory,
    in filename-sorted order.  Tracks applied files in a _migrations table
    so each file runs exactly once across all deployments.
    """
    migrations_dir = Path(__file__).resolve().parents[1] / "migrations"
    if not migrations_dir.exists():
        logger.info("No migrations directory found — skipping")
        return

    sql_files = sorted(migrations_dir.glob("*.sql"))
    if not sql_files:
        return

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS _migrations (
                    filename  TEXT PRIMARY KEY,
                    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """)
        conn.commit()

        for sql_file in sql_files:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT 1 FROM _migrations WHERE filename = %s",
                    (sql_file.name,),
                )
                if cur.fetchone():
                    continue  # already applied

            logger.info("Applying migration: %s", sql_file.name)
            sql = sql_file.read_text(encoding="utf-8")
            with conn.cursor() as cur:
                cur.execute(sql)
                cur.execute(
                    "INSERT INTO _migrations (filename) VALUES (%s)",
                    (sql_file.name,),
                )
            conn.commit()
            logger.info("Migration applied: %s", sql_file.name)
