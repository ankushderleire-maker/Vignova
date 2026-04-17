"""
Job Ingestion Route
===================
POST /api/ingest-jobs — Fetches jobs from Lever & Greenhouse ATS APIs
concurrently (in batches) and inserts them into PostgreSQL incrementally.

Production fixes applied:
  - All psycopg2 calls run via run_in_executor (never blocks the event loop)
  - Connections are borrowed from a shared pool and always returned in finally
  - ALTER TABLE removed: schema is managed by migrations/001_initial.sql
  - DELETE batched (1 000 rows at a time) to avoid full-table WAL storms
  - _INGEST_LOCK prevents overlapping ingest runs from piling up connections
"""

import asyncio
import logging
import os
import re
import time
from datetime import datetime
from functools import partial
from pathlib import Path

import aiohttp
import psycopg2
from psycopg2.extras import execute_values
from fastapi import APIRouter, HTTPException, Request

from app.db_pool import get_db_connection

router = APIRouter()
logger = logging.getLogger("job_worker")

INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "")

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR    = BACKEND_DIR / "data"

BATCH_SIZE   = 20   # companies per async fetch-batch
HTTP_TIMEOUT = 15   # seconds per outbound HTTP request

# Prevents two concurrent ingest requests from running at the same time,
# which would double the DB connection pressure and WAL write load.
_INGEST_LOCK = asyncio.Lock()


# ── Synchronous DB helpers (always called via run_in_executor) ─────────

def cleanup_old_jobs(conn, batch_size: int = 1_000) -> int:
    """
    Batch-delete jobs older than 30 days.
    Deletes at most `batch_size` rows per iteration so the WAL write is
    spread over many small transactions instead of one massive one.
    Uses the jobs_ingested_at_idx index (created in migration 001).
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
        time.sleep(0.05)   # yield between batches so other queries can proceed
    return total_deleted


def insert_jobs(conn, jobs_data: list) -> int:
    """Insert a batch of jobs; skip exact duplicates via the unique index."""
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
    url = f"https://api.lever.co/v0/postings/{company}?mode=json"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=HTTP_TIMEOUT)) as resp:
            if resp.status != 200:
                logger.warning("Lever %s: HTTP %s", company, resp.status)
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
                    "title":       p.get("text", "Untitled"),
                    "company":     company.capitalize(),
                    "location":    location,
                    "description": p.get("descriptionPlain", ""),
                    "apply_url":   p.get("hostedUrl") or p.get("applyUrl", ""),
                    "source":      "lever",
                    "date_posted": date_posted,
                })
            return jobs
    except Exception as e:
        logger.error("Lever %s: %s", company, e)
        return []


async def fetch_greenhouse_jobs_async(session: aiohttp.ClientSession, company: str):
    url = f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs?content=true"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            if resp.status != 200:
                logger.warning("Greenhouse %s: HTTP %s", company, resp.status)
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
                    "title":       p.get("title", "Untitled"),
                    "company":     company.capitalize(),
                    "location":    location,
                    "description": description,
                    "apply_url":   p.get("absolute_url", ""),
                    "source":      "greenhouse",
                    "date_posted": date_posted,
                })
            return jobs
    except Exception as e:
        logger.error("Greenhouse %s: %s", company, e)
        return []


async def fetch_company_jobs(session: aiohttp.ClientSession, company: str):
    lever_jobs, greenhouse_jobs = await asyncio.gather(
        fetch_lever_jobs_async(session, company),
        fetch_greenhouse_jobs_async(session, company),
    )
    return {"company": company, "lever_jobs": lever_jobs, "greenhouse_jobs": greenhouse_jobs}


def load_companies():
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
    Returns 409 if an ingestion is already running.
    """
    api_key = request.headers.get("X-API-Key", "")
    if not INGEST_API_KEY or api_key != INGEST_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")

    # Reject concurrent ingest requests — a second call while the first is
    # still running would open a second DB connection and double the load.
    if _INGEST_LOCK.locked():
        raise HTTPException(status_code=409, detail="Ingestion already in progress. Try again later.")

    async with _INGEST_LOCK:
        return await _run_ingest()


async def _run_ingest():
    loop = asyncio.get_event_loop()

    try:
        companies = load_companies()
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))

    total_fetched   = 0
    total_inserted  = 0
    total_errors    = 0
    batches_processed = 0

    # Borrow ONE connection from the pool for the entire ingest run.
    # The context manager guarantees it is returned even on exception.
    with get_db_connection() as conn:

        # 30-day FIFO cleanup — runs in a thread to avoid blocking event loop
        deleted = await loop.run_in_executor(None, cleanup_old_jobs, conn)
        logger.info("Cleaned up %d jobs older than 30 days", deleted)

        connector = aiohttp.TCPConnector(limit=40, limit_per_host=10)
        async with aiohttp.ClientSession(connector=connector) as session:

            for i in range(0, len(companies), BATCH_SIZE):
                batch     = companies[i : i + BATCH_SIZE]
                batch_num = (i // BATCH_SIZE) + 1
                logger.info(
                    "Batch %d: processing %d companies (%d-%d of %d)",
                    batch_num, len(batch), i + 1, i + len(batch), len(companies),
                )

                tasks   = [fetch_company_jobs(session, c) for c in batch]
                results = await asyncio.gather(*tasks, return_exceptions=True)

                batch_jobs = []
                for result in results:
                    if isinstance(result, Exception):
                        total_errors += 1
                        logger.error("Batch error: %s", result)
                        continue
                    batch_jobs.extend(result["lever_jobs"])
                    batch_jobs.extend(result["greenhouse_jobs"])

                total_fetched += len(batch_jobs)

                if batch_jobs:
                    try:
                        # DB insert runs in thread — never blocks event loop
                        inserted = await loop.run_in_executor(
                            None, insert_jobs, conn, batch_jobs
                        )
                        total_inserted += inserted
                        logger.info(
                            "Batch %d: inserted %d, skipped %d duplicates",
                            batch_num, inserted, len(batch_jobs) - inserted,
                        )
                    except Exception as e:
                        total_errors += 1
                        logger.error("Batch %d DB error: %s", batch_num, e)
                        conn.rollback()

                batches_processed += 1

    return {
        "status":             "success",
        "jobs_fetched":       total_fetched,
        "jobs_inserted":      total_inserted,
        "duplicates_skipped": total_fetched - total_inserted,
        "old_jobs_cleaned":   deleted,
        "errors":             total_errors,
        "companies_processed": len(companies),
        "batches_processed":  batches_processed,
    }
