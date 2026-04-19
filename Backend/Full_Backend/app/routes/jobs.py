"""
Jobs Platform Routes
====================
GET  /jobs                    -> database-only Find Jobs listing
POST /admin/ingest-ats-jobs   -> cron-safe ATS ingestion

Legacy compatibility:
POST /api/ingest-jobs remains as an alias to the new admin ingestion route.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from fastapi import APIRouter, HTTPException, Query, Request

from app.db_pool import get_db_connection
from app.services.ats_ingestion import run_ats_ingestion
from app.services.job_storage import fetch_jobs_from_db

router = APIRouter()
logger = logging.getLogger("jobs_platform")

INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

_ATS_INGEST_LOCK = asyncio.Lock()


def _auth_ok(request: Request) -> bool:
    key = request.headers.get("X-API-Key") or request.headers.get("x-internal-key")
    return bool(key) and key in {INGEST_API_KEY, INTERNAL_API_KEY}


def _fetch_jobs_sync(**kwargs: Any) -> dict[str, Any]:
    with get_db_connection() as conn:
        return fetch_jobs_from_db(conn, **kwargs)


@router.get("/jobs")
async def list_jobs(
    title: str | None = Query(default=None),
    search: str | None = Query(default=None),
    location: str | None = Query(default=None),
    experience: str | None = Query(default=None),
    days: int | None = Query(default=None, ge=0, le=365),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    effective_title = title or search
    return await asyncio.to_thread(
        _fetch_jobs_sync,
        title=effective_title,
        location=location,
        experience=experience,
        days=days,
        page=page,
        limit=limit,
    )


@router.post("/admin/ingest-ats-jobs")
async def ingest_ats_jobs(request: Request):
    if not _auth_ok(request):
        raise HTTPException(status_code=403, detail="Forbidden")

    if _ATS_INGEST_LOCK.locked():
        raise HTTPException(
            status_code=409,
            detail="ATS ingestion already in progress. Try again later.",
        )

    async with _ATS_INGEST_LOCK:
        try:
            return await run_ats_ingestion()
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception("ATS ingestion failed")
            raise HTTPException(status_code=500, detail=f"ATS ingestion failed: {exc}")


@router.post("/api/ingest-jobs")
async def legacy_ingest_jobs_alias(request: Request):
    return await ingest_ats_jobs(request)
