"""
Standalone ATS ingestion worker.

Runs the same ingestion pipeline as POST /admin/ingest-ats-jobs so cron,
manual admin runs, and local debugging all share one code path.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = SCRIPT_DIR.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.ats_ingestion import run_ats_ingestion


def load_env() -> None:
    env_path = BACKEND_DIR / ".env"
    if not env_path.exists():
        return

    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def main() -> dict:
    load_env()

    logging.basicConfig(
        level=getattr(logging, os.environ.get("LOG_LEVEL", "INFO")),
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    result = asyncio.run(run_ats_ingestion())
    logging.getLogger("job_worker").info("ATS ingestion summary:\n%s", json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    main()
