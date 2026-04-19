"""
Job Scrapper Routes
===================
User-triggered scraping for LinkedIn + Indeed only.

Strict rule:
  - ATS sources are background-only and are rejected on this route.
"""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Request

from app.db_pool import get_db_connection
from app.services.job_storage import save_scan_record
from app.services.portal_scraper import (
    USER_JOB_SOURCES,
    fetch_scan_history,
    fetch_scan_status,
    list_supported_sources,
    run_job_scrape,
)

router = APIRouter()
logger = logging.getLogger("job_scrapper")

INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

_SCAN_LOCK = asyncio.Lock()


def _auth_ok(request: Request) -> bool:
    key = request.headers.get("X-API-Key") or request.headers.get("x-internal-key")
    return bool(key) and key in {INGEST_API_KEY, INTERNAL_API_KEY}


def _save_failed_scan_sync(
    *,
    scan_id: str,
    user_id: str | None,
    sources: list[str],
    keywords: list[str],
    locations: list[str],
    error_message: str,
) -> None:
    with get_db_connection() as conn:
        save_scan_record(
            conn,
            scan_id=scan_id,
            user_id=user_id,
            sources=sources,
            companies=[],
            keywords=keywords,
            locations=locations,
            status="FAILED",
            fetched=0,
            inserted=0,
            updated=0,
            errors=1,
            error_message=error_message[:1000],
        )


def _normalize_sources(raw_sources: list[str] | None) -> list[str]:
    sources = [str(source).strip().lower() for source in (raw_sources or []) if source]
    if not sources:
        return ["linkedin", "indeed"]
    invalid = [source for source in sources if source not in USER_JOB_SOURCES]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=(
                "ATS sources are background-only. "
                f"Unsupported user scraper sources: {', '.join(sorted(set(invalid)))}"
            ),
        )
    return sources


@router.post("/api/scan")
@router.post("/job-scrapper/scan")
async def scan_jobs(request: Request, payload: dict = Body(default={})):
    if not _auth_ok(request):
        raise HTTPException(status_code=403, detail="Forbidden")

    if _SCAN_LOCK.locked():
        raise HTTPException(
            status_code=409,
            detail="A job scrape is already running. Try again shortly.",
        )

    sources = _normalize_sources(payload.get("sources"))
    keywords = payload.get("keywords") or payload.get("positions") or []
    locations = payload.get("locations") or []
    user_id = payload.get("user_id")
    scan_id = payload.get("scan_id") or uuid.uuid4().hex
    experience = payload.get("experience")
    date_posted = payload.get("date_posted") or payload.get("datePosted")

    async with _SCAN_LOCK:
        try:
            return await run_job_scrape(
                user_id=user_id,
                scan_id=scan_id,
                keywords=list(keywords),
                locations=list(locations),
                sources=sources,
                experience=experience,
                date_posted=date_posted,
            )
        except HTTPException:
            raise
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            logger.exception("Job scrape failed")
            await asyncio.to_thread(
                _save_failed_scan_sync,
                scan_id=scan_id,
                user_id=user_id,
                sources=sources,
                keywords=list(keywords),
                locations=list(locations),
                error_message=str(exc),
            )
            raise HTTPException(status_code=500, detail=f"Scan failed: {exc}")


@router.get("/api/scan/sources")
@router.get("/job-scrapper/sources")
async def scan_sources():
    return {
        "sources": list_supported_sources(),
        "adzuna_configured": bool(
            os.environ.get("ADZUNA_APP_ID") and os.environ.get("ADZUNA_APP_KEY")
        ),
    }


@router.get("/api/scan/status/{scan_id}")
@router.get("/job-scrapper/status/{scan_id}")
async def scan_status(request: Request, scan_id: str):
    if not _auth_ok(request):
        raise HTTPException(status_code=403, detail="Forbidden")

    row = await fetch_scan_status(scan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Scan not found")
    return row


@router.get("/api/scan/history")
@router.get("/job-scrapper/history")
async def scan_history(request: Request, user_id: str | None = None, limit: int = 20):
    if not _auth_ok(request):
        raise HTTPException(status_code=403, detail="Forbidden")

    rows = await fetch_scan_history(user_id=user_id, limit=limit)
    return {"scans": rows}
