import os
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

app = FastAPI(
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development") == "development" else None,
    redoc_url=None,
)

# ── CORS: Read allowed origins from env (comma-separated) ──
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
allowed_origins = [origin.strip() for origin in allowed_origins if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],
)

# ── Trusted Hosts: Only accept requests for known hostnames ──
trusted_hosts = os.getenv("TRUSTED_HOSTS", "*").split(",")

# ── Request Body Size Limit Middleware (10 MB max) ──
MAX_BODY_SIZE = 10 * 1024 * 1024  # 10 MB

@app.middleware("http")
async def limit_request_body(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return Response("Request body too large", status_code=413)
    return await call_next(request)

# Import and include routers
from app.routes.resume import router as resume_router
from app.routes.ats import router as ats_router
from app.routes.score import router as score_router
from app.routes.jobs import router as jobs_router
from app.routes.plan import router as plan_router

app.include_router(resume_router)
app.include_router(ats_router)
app.include_router(score_router)
app.include_router(jobs_router)
app.include_router(plan_router)
