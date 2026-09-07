"""
JD Formatter Route
==================
POST /api/jd/format — structures a raw job description into JSON.

Auth: this service is reachable from the public internet, so the route requires
the internal API key. Only the Next.js server calls it; the browser never does,
which is what keeps the provider key and the model choice off the client.
"""

import logging
import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from app.limiter import limiter
from app.services.jd_formatter import JdFormatError, format_job_description, is_configured

router = APIRouter()
logger = logging.getLogger("jd_format")

INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


def _require_internal_auth(request: Request) -> None:
    key = request.headers.get("X-API-Key") or request.headers.get("x-internal-key")
    if not INTERNAL_API_KEY or key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _rate_key(request: Request) -> str:
    """
    Rate-limit per end user, not per source IP. Every request arrives from the
    Next.js server, so an IP-keyed limit would be one shared bucket and a single
    user could 429 everyone else.
    """
    from slowapi.util import get_remote_address

    return request.headers.get("X-Client-Id") or get_remote_address(request)


class JdFormatRequest(BaseModel):
    description: str
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    salary: Optional[str] = None


@router.post("/api/jd/format")
@limiter.limit("60/minute", key_func=_rate_key)
async def format_jd(request: Request, payload: JdFormatRequest):
    _require_internal_auth(request)

    if not is_configured():
        raise HTTPException(status_code=503, detail="JD formatting is not configured on the server.")

    try:
        result = await format_job_description(
            payload.description,
            job_title=payload.jobTitle,
            company=payload.company,
            location=payload.location,
            salary=payload.salary,
        )
    except JdFormatError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc))
    except Exception as exc:
        logger.error("JD format error: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to format the job description.")

    return {"model": result["model"], "data": result["data"]}
