"""
ATS Ingestion Trigger
=====================
POST /api/ats/ingest   — run the full ATS ingestion pipeline now.
GET  /api/ats/ingest/health — cheap ping so admins can verify the URL.

Auth:
  The caller must send X-API-Key (or x-internal-key) matching either
  INGEST_API_KEY or INTERNAL_API_KEY. This is the same key used by the
  Next.js job scrapper bridge, so one secret covers both flows.

This route is what the admin panel "Run ATS ingestion now" button hits
(proxied) and is also the URL admins paste into their cron job.
"""

from __future__ import annotations

import asyncio
import logging
import os

from fastapi import APIRouter, HTTPException, Request

from app.services.ats_ingestion import run_ats_ingestion

router = APIRouter()
logger = logging.getLogger("ats_ingest")

INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "")
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")

# Only one ATS ingestion may run at a time — this touches every connector
# we know about and hammers upstream ATS feeds. A queue isn't needed; we
# just reject concurrent triggers so the admin sees a clear 409.
_ATS_INGEST_LOCK = asyncio.Lock()


def _auth_ok(request: Request) -> bool:
    key = request.headers.get("X-API-Key") or request.headers.get("x-internal-key")
    return bool(key) and key in {INGEST_API_KEY, INTERNAL_API_KEY}


@router.get("/api/ats/ingest/health")
async def ats_ingest_health():
    """Public health probe — confirms the route is mounted and discoverable."""
    return {
        "ok": True,
        "auth_required": True,
        "auth_header": "X-API-Key",
        "method": "POST",
        "path": "/api/ats/ingest",
    }


@router.post("/api/ats/ingest")
async def ats_ingest(request: Request):
    if not _auth_ok(request):
        raise HTTPException(status_code=403, detail="Forbidden")

    if _ATS_INGEST_LOCK.locked():
        raise HTTPException(
            status_code=409,
            detail="An ATS ingestion run is already in progress.",
        )

    async with _ATS_INGEST_LOCK:
        try:
            logger.info("ATS ingestion: starting run (triggered via HTTP)")
            result = await run_ats_ingestion()
            logger.info(
                "ATS ingestion: done — sources=%s fetched=%s inserted=%s updated=%s errors=%s",
                result.get("sources_processed"),
                result.get("jobs_fetched"),
                result.get("jobs_inserted"),
                result.get("jobs_updated"),
                result.get("errors"),
            )
            return result
        except Exception as exc:
            logger.exception("ATS ingestion failed")
            raise HTTPException(status_code=500, detail=f"ATS ingestion failed: {exc}")
