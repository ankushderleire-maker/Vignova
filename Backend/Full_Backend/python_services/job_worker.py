"""
Job Ingestion Worker
====================
Fetches public job listings from Lever and Greenhouse ATS APIs
concurrently and inserts them into PostgreSQL in batches.

Features:
  - Concurrent fetching via ThreadPoolExecutor (batches of 20 companies)
  - Incremental DB inserts after each batch (data available immediately)
  - 30-day FIFO rotation: old jobs auto-deleted at start of each run

Cron Setup (every 6 hours):
  0 */6 * * * cd /path/to/Backend/Full_Backend && python python_services/job_worker.py

Environment:
  Reads DATABASE_URL from .env in Backend/Full_Backend/
"""

import os
import re
import sys
import json
import logging
import requests
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

# Setup paths
SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent
DATA_DIR = BACKEND_DIR / "data"

# Concurrency settings
BATCH_SIZE = 20  # companies per batch
MAX_WORKERS = 20  # thread pool size

# Load .env manually
env_path = BACKEND_DIR / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())

# Logging
log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("job_worker")


# ── Database ──────────────────────────────────────────────────────────

def get_db_connection():
    """Create a PostgreSQL connection from DATABASE_URL."""
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
    )


def ensure_ingested_at_column(conn):
    """Add ingested_at column if it doesn't exist yet."""
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE jobs ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP DEFAULT NOW();
        """)
    conn.commit()


def cleanup_old_jobs(conn):
    """Delete jobs older than 30 days (FIFO rotation)."""
    with conn.cursor() as cur:
        cur.execute("DELETE FROM jobs WHERE ingested_at < NOW() - INTERVAL '30 days';")
        deleted = cur.rowcount
    conn.commit()
    return deleted


def insert_jobs(conn, jobs_data):
    """Insert jobs with ON CONFLICT DO NOTHING to skip duplicates."""
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

def fetch_lever_jobs(company):
    """Fetch jobs from Lever's public API."""
    url = f"https://api.lever.co/v0/postings/{company}?mode=json"
    try:
        resp = requests.get(url, timeout=15)
        if resp.status_code != 200:
            logger.warning(f"  Lever {company}: HTTP {resp.status_code}")
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
                "title": p.get("text", "Untitled"),
                "company": company.capitalize(),
                "location": location,
                "description": p.get("descriptionPlain", ""),
                "apply_url": p.get("hostedUrl") or p.get("applyUrl", ""),
                "source": "lever",
                "date_posted": date_posted,
            })

        return jobs
    except requests.RequestException as e:
        logger.error(f"  Lever {company}: {e}")
        return []


def fetch_greenhouse_jobs(company):
    """Fetch jobs from Greenhouse's public API with descriptions."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code != 200:
            logger.warning(f"  Greenhouse {company}: HTTP {resp.status_code}")
            return []

        data = resp.json()
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
                "title": p.get("title", "Untitled"),
                "company": company.capitalize(),
                "location": location,
                "description": description,
                "apply_url": p.get("absolute_url", ""),
                "source": "greenhouse",
                "date_posted": date_posted,
            })

        return jobs
    except requests.RequestException as e:
        logger.error(f"  Greenhouse {company}: {e}")
        return []


def fetch_company_jobs(company):
    """Fetch jobs from both Lever and Greenhouse for one company."""
    lever_jobs = fetch_lever_jobs(company)
    greenhouse_jobs = fetch_greenhouse_jobs(company)

    return {
        "company": company,
        "lever_jobs": lever_jobs,
        "greenhouse_jobs": greenhouse_jobs,
    }


# ── Main ──────────────────────────────────────────────────────────────

def load_companies():
    """Load company slugs from data/companies.txt."""
    companies_file = DATA_DIR / "companies.txt"
    if not companies_file.exists():
        logger.error(f"Companies file not found: {companies_file}")
        sys.exit(1)

    with open(companies_file) as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]


def run():
    """Main worker entry point."""
    logger.info("=" * 60)
    logger.info("Job Ingestion Worker — Starting")
    logger.info("=" * 60)

    companies = load_companies()
    logger.info(f"Loaded {len(companies)} companies from companies.txt")

    conn = get_db_connection()
    logger.info("Connected to PostgreSQL")

    # Ensure schema is ready
    ensure_ingested_at_column(conn)

    # 30-day FIFO cleanup
    deleted = cleanup_old_jobs(conn)
    logger.info(f"Cleaned up {deleted} jobs older than 30 days")

    total_fetched = 0
    total_inserted = 0
    total_errors = 0
    batches_processed = 0

    # Process companies in batches using ThreadPoolExecutor
    for i in range(0, len(companies), BATCH_SIZE):
        batch = companies[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        logger.info(f"Batch {batch_num}: processing {len(batch)} companies ({i+1}-{i+len(batch)} of {len(companies)})")

        batch_jobs = []

        # Fetch all companies in this batch concurrently
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
            future_to_company = {
                executor.submit(fetch_company_jobs, company): company
                for company in batch
            }

            for future in as_completed(future_to_company):
                company = future_to_company[future]
                try:
                    result = future.result()
                    lever_jobs = result["lever_jobs"]
                    greenhouse_jobs = result["greenhouse_jobs"]

                    logger.info(f"  {company}: Lever={len(lever_jobs)}, Greenhouse={len(greenhouse_jobs)}")

                    batch_jobs.extend(lever_jobs)
                    batch_jobs.extend(greenhouse_jobs)
                except Exception as e:
                    total_errors += 1
                    logger.error(f"  {company}: fetch error: {e}")

        total_fetched += len(batch_jobs)

        # Insert this batch into DB immediately
        if batch_jobs:
            try:
                inserted = insert_jobs(conn, batch_jobs)
                total_inserted += inserted
                skipped = len(batch_jobs) - inserted
                logger.info(f"  Batch {batch_num}: inserted {inserted}, skipped {skipped} duplicates")
            except Exception as e:
                total_errors += 1
                logger.error(f"  Batch {batch_num} DB error: {e}")
                conn.rollback()

        batches_processed += 1

    conn.close()

    summary = {
        "jobs_fetched": total_fetched,
        "jobs_inserted": total_inserted,
        "duplicates_skipped": total_fetched - total_inserted,
        "old_jobs_cleaned": deleted,
        "errors": total_errors,
        "batches_processed": batches_processed,
    }

    logger.info("=" * 60)
    logger.info(f"Summary: {json.dumps(summary, indent=2)}")
    logger.info("Job Ingestion Worker — Complete")
    logger.info("=" * 60)

    return summary


if __name__ == "__main__":
    run()
