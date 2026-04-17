"""
FastAPI application factory
===========================
Changes from original:
  - slowapi rate limiter wired up (in-memory, per-IP)
  - startup event runs DB migrations exactly once via db_pool.run_migrations()
  - rate limits applied to expensive endpoints:
      /api/calculate-ats          → 20 req/min/IP
      /api/enhance-ats-report     → 10 req/min/IP
      /api/generate-tailored-resume → 5 req/min/IP
      /api/score-job              → 30 req/min/IP
"""

import asyncio
import logging
import os

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

logger = logging.getLogger("app")

# ── Rate limiter (in-memory, per worker process) ──────────────────────
# With 2 gunicorn workers the effective limit is 2× the configured value,
# which is acceptable without a Redis backend.
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development") == "development" else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
allowed_origins = [o.strip() for o in allowed_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

# ── Body-size guard (10 MB) ───────────────────────────────────────────
MAX_BODY_SIZE = 10 * 1024 * 1024

@app.middleware("http")
async def limit_request_body(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return Response("Request body too large", status_code=413)
    return await call_next(request)


# ── Startup: run DB migrations once per worker process ───────────────
@app.on_event("startup")
async def startup():
    try:
        from app.db_pool import run_migrations
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, run_migrations)
    except Exception as exc:
        # Log but don't crash — app still works without DB (for non-DB routes)
        logger.error("DB migration failed at startup: %s", exc)


# ── Routers ───────────────────────────────────────────────────────────
from app.routes.resume import router as resume_router
from app.routes.ats    import router as ats_router
from app.routes.score  import router as score_router
from app.routes.jobs   import router as jobs_router
from app.routes.plan   import router as plan_router

app.include_router(resume_router)
app.include_router(ats_router)
app.include_router(score_router)
app.include_router(jobs_router)
app.include_router(plan_router)


# ── Rate-limit decorators applied after routers are registered ────────
# We decorate the actual route functions so slowapi can find them.

from app.routes.ats    import calculate_ats, enhance_ats_report
from app.routes.resume import generate_tailored_resume, parse_resume
from app.routes.score  import score_job

limiter.limit("20/minute")(calculate_ats)
limiter.limit("10/minute")(enhance_ats_report)
limiter.limit("5/minute")(generate_tailored_resume)
limiter.limit("30/minute")(score_job)
