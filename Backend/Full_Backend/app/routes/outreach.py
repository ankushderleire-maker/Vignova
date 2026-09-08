"""
Outreach Routes
===============
POST /api/outreach/hr-message  — short recruiter/hiring-manager message
POST /api/outreach/email       — application email, subject plus body

Auth: this service is reachable from the public internet, so both routes require
the internal API key. Only the Next.js server calls them, which is what keeps
the provider key and the model choice off the client — and off the extension,
which is just packed JavaScript anyone can unzip.
"""

import logging
import os
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.limiter import limiter
from app.services.openai_client import OpenAiError, is_configured
from app.services.outreach import application_email, hr_message

router = APIRouter()
logger = logging.getLogger("outreach_route")

INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


def _require_internal_auth(request: Request) -> None:
    key = request.headers.get("X-API-Key") or request.headers.get("x-internal-key")
    if not INTERNAL_API_KEY or key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _rate_key(request: Request) -> str:
    """Per user, not per IP — every request arrives from the Next.js server."""
    from slowapi.util import get_remote_address

    return request.headers.get("X-Client-Id") or get_remote_address(request)


class OutreachRequest(BaseModel):
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    recipient: Optional[str] = None
    jobDescription: Optional[str] = None
    fullName: Optional[str] = None
    currentTitle: Optional[str] = None
    skills: Optional[list[str]] = None
    experience: Optional[list[str]] = None
    summary: Optional[str] = None
    source: Optional[str] = None


def _guard() -> None:
    if not is_configured():
        raise HTTPException(status_code=503, detail="AI features are not configured on the server.")


@router.post("/api/outreach/hr-message")
@limiter.limit("20/minute", key_func=_rate_key)
async def post_hr_message(request: Request, payload: OutreachRequest):
    _require_internal_auth(request)
    _guard()

    try:
        return await hr_message(
            job_title=payload.jobTitle,
            company=payload.company,
            recipient=payload.recipient,
            job_description=payload.jobDescription,
            full_name=payload.fullName,
            current_title=payload.currentTitle,
            skills=payload.skills,
            experience=payload.experience,
            summary=payload.summary,
        )
    except OpenAiError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc))
    except Exception as exc:
        logger.error("hr message failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not write the message.")


@router.post("/api/outreach/email")
@limiter.limit("20/minute", key_func=_rate_key)
async def post_application_email(request: Request, payload: OutreachRequest):
    _require_internal_auth(request)
    _guard()

    try:
        return await application_email(
            job_title=payload.jobTitle,
            company=payload.company,
            recipient=payload.recipient,
            job_description=payload.jobDescription,
            full_name=payload.fullName,
            current_title=payload.currentTitle,
            skills=payload.skills,
            experience=payload.experience,
            summary=payload.summary,
            source=payload.source,
        )
    except OpenAiError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc))
    except Exception as exc:
        logger.error("application email failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not write the email.")
