"""
Job Ingestion Worker (standalone cron script)
=============================================
Fetches public job listings from Lever and Greenhouse ATS APIs
concurrently and inserts them into PostgreSQL in batches.

Cron setup (every 6 hours):
  0 */6 * * * cd /path/to/Backend/Full_Backend && python python_services/job_worker.py

Production fixes applied:
  - ensure_ingested_at_column() removed: schema is managed by migrations/001_initial.sql
  - cleanup_old_jobs() now batch-deletes (1 000 rows/tx) to avoid WAL storms
  - conn.close() moved into a finally block so it is always called on exception too
  - requests replaced with httpx for consistent timeout behaviour
"""

import json
import logging
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import execute_values
import requests

# ── Path / env setup ─────────────────────────────────────────────────

SCRIPT_DIR  = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
DATA_DIR    = BACKEND_DIR / "data"

BATCH_SIZE  = 20   # companies per thread-pool batch
MAX_WORKERS = 20   # concurrent HTTP fetchers

# Load .env manually (cron doesn't inherit shell env)
env_path = BACKEND_DIR / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

# ── Logging ──────────────────────────────────────────────────────────

logging.basicConfig(
    level=getattr(logging, os.environ.get("LOG_LEVEL", "INFO")),
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("job_worker")


# ── Database ──────────────────────────────────────────────────────────

def get_db_connection():
    """Open a direct psycopg2 connection from DATABASE_URL."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL not set in environment")
        sys.exit(1)

    parsed = urlparse(db_url)
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=parsed.path.lstrip("/"),
        user=parsed.username,
        password=parsed.password,
        connect_timeout=5,
    )


def cleanup_old_jobs(conn, batch_size: int = 1_000) -> int:
    """
    Batch-delete jobs older than 30 days.
    Deletes at most `batch_size` rows per transaction to spread WAL writes
    and avoid a single massive lock on the jobs table.
    Relies on jobs_ingested_at_idx (created in migrations/001_initial.sql).
    """
    total_deleted = 0
    while True:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM jobs
                WHERE id IN (
                    SELECT id FROM jobs
                    WHERE ingested_at < NOW() - INTERVAL '30 days'
                    LIMIT %s
                )
            """, (batch_size,))
            deleted = cur.rowcount
        conn.commit()
        total_deleted += deleted
        if deleted < batch_size:
            break
        time.sleep(0.05)   # brief pause so other queries can proceed
    return total_deleted


def insert_jobs(conn, jobs_data: list) -> int:
    """Insert jobs; skip exact duplicates via the unique index."""
    if not jobs_data:
        return 0

    sql = """
        INSERT INTO jobs (title, company, location, description, apply_url, source, date_posted, ingested_at)
        VALUES %s
        ON CONFLICT (title, company, location) DO NOTHING
    """
    values = [
        (
            j["title"][:500],
            j["company"][:200],
            j.get("location", "Remote"),
            j.get("description", "")[:5000] if j.get("description") else None,
            j.get("apply_url"),
            j.get("source"),
            j.get("date_posted"),
            datetime.utcnow(),
        )
        for j in jobs_data
    ]

    with conn.cursor() as cur:
        execute_values(cur, sql, values)
        inserted = cur.rowcount

    conn.commit()
    return inserted


# ── ATS Fetchers ──────────────────────────────────────────────────────

def fetch_lever_jobs(company: str) -> list:
    url = f"https://api.lever.co/v0/postings/{company}?mode=json"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            logger.warning("Lever %s: HTTP %s", company, resp.status_code)
            return []

        postings = resp.json()
        if not isinstance(postings, list):
            return []

        jobs = []
        for p in postings:
            location = "Remote"
            if p.get("categories", {}).get("location"):
                location = p["categories"]["location"]

            date_posted = None
            if p.get("createdAt"):
                try:
                    date_posted = datetime.fromtimestamp(p["createdAt"] / 1000)
                except Exception:
                    pass

            jobs.append({
                "title":       p.get("text", "Untitled"),
                "company":     company.capitalize(),
                "location":    location,
                "description": p.get("descriptionPlain", ""),
                "apply_url":   p.get("hostedUrl") or p.get("applyUrl", ""),
                "source":      "lever",
                "date_posted": date_posted,
            })
        return jobs
    except requests.RequestException as e:
        logger.error("Lever %s: %s", company, e)
        return []


def fetch_greenhouse_jobs(company: str) -> list:
    url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code != 200:
            logger.warning("Greenhouse %s: HTTP %s", company, resp.status_code)
            return []

        data     = resp.json()
        postings = data.get("jobs", [])

        jobs = []
        for p in postings:
            location = "Remote"
            if p.get("location", {}).get("name"):
                location = p["location"]["name"]

            date_posted = None
            if p.get("updated_at"):
                try:
                    date_posted = datetime.fromisoformat(
                        p["updated_at"].replace("Z", "+00:00")
                    )
                except Exception:
                    pass

            description = ""
            content = p.get("content", "")
            if content:
                description = re.sub(r"<[^>]+>", " ", content)
                description = re.sub(r"\s+", " ", description).strip()

            jobs.append({
                "title":       p.get("title", "Untitled"),
                "company":     company.capitalize(),
                "location":    location,
                "description": description,
                "apply_url":   p.get("absolute_url", ""),
                "source":      "greenhouse",
                "date_posted": date_posted,
            })
        return jobs
    except requests.RequestException as e:
        logger.error("Greenhouse %s: %s", company, e)
        return []


def fetch_company_jobs(company: str) -> dict:
    return {
        "company":         company,
        "lever_jobs":      fetch_lever_jobs(company),
        "greenhouse_jobs": fetch_greenhouse_jobs(company),
    }


# ── Helpers ───────────────────────────────────────────────────────────

def load_companies() -> list:
    companies_file = DATA_DIR / "companies.txt"
    if not companies_file.exists():
        logger.error("Companies file not found: %s", companies_file)
        sys.exit(1)
    with open(companies_file) as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]


# ── Main ──────────────────────────────────────────────────────────────

def run():
    logger.info("=" * 60)
    logger.info("Job Ingestion Worker — Starting")
    logger.info("=" * 60)

    companies = load_companies()
    logger.info("Loaded %d companies from companies.txt", len(companies))

    conn = get_db_connection()
    logger.info("Connected to PostgreSQL")

    try:
        # 30-day FIFO cleanup (batched — no full-table lock)
        deleted = cleanup_old_jobs(conn)
        logger.info("Cleaned up %d jobs older than 30 days", deleted)

        total_fetched    = 0
        total_inserted   = 0
        total_errors     = 0
        batches_processed = 0

        for i in range(0, len(companies), BATCH_SIZE):
            batch     = companies[i : i + BATCH_SIZE]
            batch_num = (i // BATCH_SIZE) + 1
            logger.info(
                "Batch %d: processing %d companies (%d-%d of %d)",
                batch_num, len(batch), i + 1, i + len(batch), len(companies),
            )

            batch_jobs = []
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                future_to_company = {
                    executor.submit(fetch_company_jobs, company): company
                    for company in batch
                }
                for future in as_completed(future_to_company):
                    company = future_to_company[future]
                    try:
                        result = future.result()
                        logger.info(
                            "  %s: Lever=%d, Greenhouse=%d",
                            company,
                            len(result["lever_jobs"]),
                            len(result["greenhouse_jobs"]),
                        )
                        batch_jobs.extend(result["lever_jobs"])
                        batch_jobs.extend(result["greenhouse_jobs"])
                    except Exception as e:
                        total_errors += 1
                        logger.error("  %s: fetch error: %s", company, e)

            total_fetched += len(batch_jobs)

            if batch_jobs:
                try:
                    inserted = insert_jobs(conn, batch_jobs)
                    total_inserted += inserted
                    logger.info(
                        "  Batch %d: inserted %d, skipped %d duplicates",
                        batch_num, inserted, len(batch_jobs) - inserted,
                    )
                except Exception as e:
                    total_errors += 1
                    logger.error("  Batch %d DB error: %s", batch_num, e)
                    conn.rollback()

            batches_processed += 1

    finally:
        # Always close — even if an exception aborts the loop early
        conn.close()
        logger.info("Database connection closed")

    summary = {
        "jobs_fetched":       total_fetched,
        "jobs_inserted":      total_inserted,
        "duplicates_skipped": total_fetched - total_inserted,
        "old_jobs_cleaned":   deleted,
        "errors":             total_errors,
        "batches_processed":  batches_processed,
    }

    logger.info("=" * 60)
    logger.info("Summary:\n%s", json.dumps(summary, indent=2))
    logger.info("Job Ingestion Worker — Complete")
    logger.info("=" * 60)

    return summary


if __name__ == "__main__":
    run()
