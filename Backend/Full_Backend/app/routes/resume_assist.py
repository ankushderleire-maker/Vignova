"""
Resume Assistant Routes
=======================
POST /api/resume/summary-variants — three rewrites of the professional summary
POST /api/resume/suggest-skills   — job skills the resume is missing

Auth: this service is reachable from the public internet, so both routes require
the internal API key. Only the Next.js server calls them, which is what keeps
the provider key and the model choice off the client.
"""

import logging
import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from app.limiter import limiter
from app.services.openai_client import OpenAiError, is_configured
from app.services.resume_assist import suggest_skills, summary_variants

router = APIRouter()
logger = logging.getLogger("resume_assist_route")

INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")


def _require_internal_auth(request: Request) -> None:
    key = request.headers.get("X-API-Key") or request.headers.get("x-internal-key")
    if not INTERNAL_API_KEY or key != INTERNAL_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _rate_key(request: Request) -> str:
    """Per user, not per IP — every request arrives from the Next.js server."""
    from slowapi.util import get_remote_address

    return request.headers.get("X-Client-Id") or get_remote_address(request)


class SummaryRequest(BaseModel):
    currentSummary: str = ""
    jobTitle: Optional[str] = None
    company: Optional[str] = None
    jobDescription: Optional[str] = None
    skills: Optional[list[str]] = None
    experience: Optional[list[str]] = None


class SkillsRequest(BaseModel):
    currentSkills: Optional[list[str]] = None
    jobDescription: Optional[str] = None
    jobTitle: Optional[str] = None


@router.post("/api/resume/summary-variants")
@limiter.limit("20/minute", key_func=_rate_key)
async def post_summary_variants(request: Request, payload: SummaryRequest):
    _require_internal_auth(request)
    if not is_configured():
        raise HTTPException(status_code=503, detail="AI features are not configured on the server.")

    try:
        return await summary_variants(
            current_summary=payload.currentSummary,
            job_title=payload.jobTitle,
            company=payload.company,
            job_description=payload.jobDescription,
            skills=payload.skills,
            experience=payload.experience,
        )
    except OpenAiError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc))
    except Exception as exc:
        logger.error("summary variants failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not generate summary options.")


@router.post("/api/resume/suggest-skills")
@limiter.limit("20/minute", key_func=_rate_key)
async def post_suggest_skills(request: Request, payload: SkillsRequest):
    _require_internal_auth(request)
    if not is_configured():
        raise HTTPException(status_code=503, detail="AI features are not configured on the server.")

    try:
        return await suggest_skills(
            current_skills=payload.currentSkills,
            job_description=payload.jobDescription,
            job_title=payload.jobTitle,
        )
    except OpenAiError as exc:
        raise HTTPException(status_code=exc.status, detail=str(exc))
    except Exception as exc:
        logger.error("skill suggestions failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Could not suggest skills.")
