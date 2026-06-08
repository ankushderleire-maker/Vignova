-- ============================================================
-- Migration 002: Job Scanner (Find Jobs → Scan Portals) support.
--
-- Idempotent: all CREATEs use IF NOT EXISTS so Prisma can also
-- manage these tables without conflict.  ALTER TABLE guards use
-- ADD COLUMN IF NOT EXISTS which requires PostgreSQL >= 9.6.
-- ============================================================

-- ─────────────────────────────────────────────
-- Extend public jobs listing table (scan sources)
-- ─────────────────────────────────────────────
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS remote       BOOLEAN    DEFAULT FALSE;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS salary_min   INTEGER;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS salary_max   INTEGER;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS employment_type VARCHAR(50);

CREATE INDEX IF NOT EXISTS jobs_source_idx ON jobs (source);
CREATE INDEX IF NOT EXISTS jobs_date_posted_idx ON jobs (date_posted);


-- ─────────────────────────────────────────────
-- Scan history (per user)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scan_jobs (
    id            TEXT PRIMARY KEY,
    user_id       UUID NOT NULL,
    sources       TEXT[] NOT NULL DEFAULT '{}',
    companies     TEXT[] NOT NULL DEFAULT '{}',
    keywords      TEXT[] NOT NULL DEFAULT '{}',
    locations     TEXT[] NOT NULL DEFAULT '{}',
    status        VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    jobs_fetched  INTEGER NOT NULL DEFAULT 0,
    jobs_inserted INTEGER NOT NULL DEFAULT 0,
    duplicates    INTEGER NOT NULL DEFAULT 0,
    errors        INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    started_at    TIMESTAMP WITH TIME ZONE,
    completed_at  TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scan_jobs_user_idx ON scan_jobs (user_id);
CREATE INDEX IF NOT EXISTS scan_jobs_status_idx ON scan_jobs (status);
