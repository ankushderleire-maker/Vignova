-- Migration 001: jobs table baseline (idempotent — Prisma is the source of
-- truth for this table; this migration only ensures indexes/constraints the
-- Python scan + worker code relies on are present.
--
-- Safe to re-run: every statement guards with IF NOT EXISTS.

-- The table itself is created & managed by Prisma (resume-saas-v4/prisma/schema.prisma),
-- so we do NOT CREATE TABLE here. If you're bootstrapping a fresh DB without
-- Prisma, run `npx prisma db push` from the Next app first.

-- Deduplication constraint: ON CONFLICT (title, company, location) DO NOTHING
CREATE UNIQUE INDEX IF NOT EXISTS jobs_dedup_idx
    ON jobs (title, company, location);

-- Used by the 30-day FIFO cleanup DELETE — prevents a full table scan.
-- We key it on `created_at` (Prisma's column) instead of the old
-- `ingested_at` column which the legacy worker used.
CREATE INDEX IF NOT EXISTS jobs_created_at_idx
    ON jobs (created_at);

-- Drop the legacy index if the DB was migrated from an older schema that
-- had `ingested_at`. Safe no-op on fresh installs.
DROP INDEX IF EXISTS jobs_ingested_at_idx;
