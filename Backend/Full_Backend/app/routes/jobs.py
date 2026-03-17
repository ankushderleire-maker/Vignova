"""
Job Ingestion Route
===================
POST /api/ingest-jobs — Fetches jobs from Lever & Greenhouse ATS APIs
concurrently (in batches) and inserts them into PostgreSQL incrementally.

Features:
  - Async concurrent fetching via aiohttp (batches of 20 companies)
  - Incremental DB inserts after each batch (data available immediately)
  - 30-day FIFO rotation: old jobs auto-deleted at start of each run
"""

import os
import re
import logging
import asyncio
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import aiohttp
import psycopg2
from psycopg2.extras import execute_values
from fastapi import APIRouter, HTTPException, Request

router = APIRouter()

logger = logging.getLogger("job_worker")

# API Key for securing the ingest endpoint
INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "")

# Paths
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BACKEND_DIR / "data"

# Concurrency settings
BATCH_SIZE = 20  # companies per batch
HTTP_TIMEOUT = 15  # seconds per request


# ── Database ──────────────────────────────────────────────────────────

def get_db_connection():
    """Create a PostgreSQL connection from DATABASE_URL."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise Exception("DATABASE_URL not set in environment")

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


# ── Async ATS Fetchers ────────────────────────────────────────────────

async def fetch_lever_jobs_async(session: aiohttp.ClientSession, company: str):
    """Fetch jobs from Lever's public API (async)."""
    url = f"https://api.lever.co/v0/postings/{company}?mode=json"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT)) as resp:
            if resp.status != 200:
                logger.warning(f"  Lever {company}: HTTP {resp.status}")
                return []

            postings = await resp.json()
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
    except Exception as e:
        logger.error(f"  Lever {company}: {e}")
        return []


async def fetch_greenhouse_jobs_async(session: aiohttp.ClientSession, company: str):
    """Fetch jobs from Greenhouse's public API (async)."""
    url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status != 200:
                logger.warning(f"  Greenhouse {company}: HTTP {resp.status}")
                return []

            data = await resp.json()
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
    except Exception as e:
        logger.error(f"  Greenhouse {company}: {e}")
        return []


async def fetch_company_jobs(session: aiohttp.ClientSession, company: str):
    """Fetch jobs from both Lever and Greenhouse concurrently for one company."""
    lever_task = fetch_lever_jobs_async(session, company)
    greenhouse_task = fetch_greenhouse_jobs_async(session, company)

    lever_jobs, greenhouse_jobs = await asyncio.gather(lever_task, greenhouse_task)

    return {
        "company": company,
        "lever_jobs": lever_jobs,
        "greenhouse_jobs": greenhouse_jobs,
    }


# ── Helper ────────────────────────────────────────────────────────────

def load_companies():
    """Load company slugs from data/companies.txt."""
    companies_file = DATA_DIR / "companies.txt"
    if not companies_file.exists():
        raise FileNotFoundError(f"Companies file not found: {companies_file}")

    with open(companies_file) as f:
        return [line.strip() for line in f if line.strip() and not line.startswith("#")]


# ── Route ─────────────────────────────────────────────────────────────

@router.post("/api/ingest-jobs")
async def ingest_jobs(request: Request):
    """
    Trigger job ingestion from Lever & Greenhouse.
    Requires X-API-Key header for authentication.
    """
    # Verify API key
    api_key = request.headers.get("X-API-Key", "")
    if not INGEST_API_KEY or api_key != INGEST_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        companies = load_companies()
        conn = get_db_connection()

        # Ensure schema is ready
        ensure_ingested_at_column(conn)

        # 30-day FIFO cleanup
        deleted = cleanup_old_jobs(conn)
        logger.info(f"Cleaned up {deleted} jobs older than 30 days")

        total_fetched = 0
        total_inserted = 0
        total_errors = 0
        batches_processed = 0

        # Use a TCP connector with connection limit to avoid overwhelming APIs
        connector = aiohttp.TCPConnector(limit=40, limit_per_host=10)
        async with aiohttp.ClientSession(connector=connector) as session:

            # Process companies in batches
            for i in range(0, len(companies), BATCH_SIZE):
                batch = companies[i : i + BATCH_SIZE]
                batch_num = (i // BATCH_SIZE) + 1
                logger.info(f"Batch {batch_num}: processing {len(batch)} companies ({i+1}-{i+len(batch)} of {len(companies)})")

                # Fetch all companies in this batch concurrently
                tasks = [fetch_company_jobs(session, company) for company in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                # Collect jobs from this batch and insert immediately
                batch_jobs = []
                for result in results:
                    if isinstance(result, Exception):
                        total_errors += 1
                        logger.error(f"  Batch error: {result}")
                        continue

                    lever_jobs = result["lever_jobs"]
                    greenhouse_jobs = result["greenhouse_jobs"]
                    batch_jobs.extend(lever_jobs)
                    batch_jobs.extend(greenhouse_jobs)

                total_fetched += len(batch_jobs)

                # Insert this batch into DB immediately
                if batch_jobs:
                    try:
                        inserted = insert_jobs(conn, batch_jobs)
                        total_inserted += inserted
                        logger.info(f"  Batch {batch_num}: inserted {inserted}, skipped {len(batch_jobs) - inserted} duplicates")
                    except Exception as e:
                        total_errors += 1
                        logger.error(f"  Batch {batch_num} DB error: {e}")
                        conn.rollback()

                batches_processed += 1

        conn.close()

        return {
            "status": "success",
            "jobs_fetched": total_fetched,
            "jobs_inserted": total_inserted,
            "duplicates_skipped": total_fetched - total_inserted,
            "old_jobs_cleaned": deleted,
            "errors": total_errors,
            "companies_processed": len(companies),
            "batches_processed": batches_processed,
        }

    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail="Job ingestion failed. Please try again.")
