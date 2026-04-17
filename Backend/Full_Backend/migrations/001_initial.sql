-- Migration 001: initial jobs table with proper indexes
-- Applied automatically at backend startup via db_pool.run_migrations()
-- DO NOT run ALTER TABLE or CREATE INDEX manually from application code.

CREATE TABLE IF NOT EXISTS jobs (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(500)  NOT NULL,
    company     VARCHAR(200)  NOT NULL,
    location    VARCHAR(500)  NOT NULL DEFAULT 'Remote',
    description TEXT,
    apply_url   TEXT,
    source      VARCHAR(50),
    date_posted TIMESTAMP WITH TIME ZONE,
    ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Deduplication constraint: ON CONFLICT (title, company, location) DO NOTHING
CREATE UNIQUE INDEX IF NOT EXISTS jobs_dedup_idx
    ON jobs (title, company, location);

-- Used by the 30-day FIFO cleanup DELETE — prevents full table scan
CREATE INDEX IF NOT EXISTS jobs_ingested_at_idx
    ON jobs (ingested_at);
