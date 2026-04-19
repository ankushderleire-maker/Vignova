"""
FastAPI application factory
===========================
Rate limits are applied via @limiter.limit() decorators directly on each
route function (in their own modules), not post-hoc here.  This is the
pattern slowapi requires: the decorated function must have request: Request
in its signature, which is enforced at decoration time.
"""

import asyncio
import logging
import os

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.limiter import limiter

logger = logging.getLogger("app")

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
        logger.error("DB migration failed at startup: %s", exc)


# ── Routers ───────────────────────────────────────────────────────────
from app.routes.resume     import router as resume_router
from app.routes.ats        import router as ats_router
from app.routes.score      import router as score_router
from app.routes.jobs       import router as jobs_router
from app.routes.plan       import router as plan_router
from app.routes.interview  import router as interview_router
# Job Scanner
from app.routes.scan        import router as scan_router
# ATS ingestion (admin-triggered + cron-ready)
from app.routes.ats_ingest  import router as ats_ingest_router

app.include_router(resume_router)
app.include_router(ats_router)
app.include_router(score_router)
app.include_router(jobs_router)
app.include_router(plan_router)
app.include_router(interview_router)

# Job Scanner (Find Jobs — Scan Portals)
app.include_router(scan_router)

# ATS ingestion trigger (POST /api/ats/ingest — admins/cron)
app.include_router(ats_ingest_router)
