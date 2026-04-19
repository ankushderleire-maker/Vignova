-- ============================================================
-- Migration 004: Job platform split
--
-- Goals:
--   1. Keep one shared `jobs` table for ATS + user-scraped jobs.
--   2. Add missing source metadata, dedupe hash, owner, and timestamps.
--   3. Add a source registry table for cron/background ATS ingestion.
--   4. Preserve backward compatibility by extending the current schema.
-- ============================================================

-- ------------------------------------------------------------
-- Extend jobs table safely (additive only)
-- ------------------------------------------------------------
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(64);

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS location_normalized TEXT;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS experience_level VARCHAR(32);

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS job_hash TEXT;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND constraint_name = 'jobs_created_by_user_id_fkey'
    ) THEN
        ALTER TABLE jobs
            ADD CONSTRAINT jobs_created_by_user_id_fkey
            FOREIGN KEY (created_by_user_id)
            REFERENCES users(id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- ------------------------------------------------------------
-- Normalize source metadata first
-- ------------------------------------------------------------
UPDATE jobs
SET source_type = lower(btrim(source))
WHERE source IS NOT NULL
  AND source_type IS NULL;

UPDATE jobs
SET source = CASE
    WHEN lower(btrim(source)) IN ('linkedin', 'indeed') THEN lower(btrim(source))
    WHEN source IS NULL THEN NULL
    ELSE 'ATS'
END
WHERE source IS NOT NULL;

UPDATE jobs
SET source_type = lower(btrim(source_type))
WHERE source_type IS NOT NULL;

UPDATE jobs
SET location_normalized = lower(btrim(regexp_replace(COALESCE(location, ''), '\s+', ' ', 'g')))
WHERE location_normalized IS NULL;

UPDATE jobs
SET experience_level = CASE
    WHEN lower(title) ~ '\m(intern|internship|trainee|graduate|campus|entry level|entry-level|fresher)\M' THEN 'fresher'
    WHEN lower(title) ~ '\m(junior|associate|analyst|assistant|apprentice)\M' THEN 'low'
    WHEN lower(title) ~ '\m(principal|staff|lead|head|director|vice president|manager|architect|senior)\M' THEN 'high'
    ELSE 'medium'
END
WHERE experience_level IS NULL;

UPDATE jobs
SET scraped_at = COALESCE(scraped_at, created_at)
WHERE scraped_at IS NULL;

-- ------------------------------------------------------------
-- Merge legacy normalized duplicates before unique hash index.
-- We keep the freshest row per normalized hash and hydrate it with any
-- missing fields from older duplicates before deleting extras.
-- ------------------------------------------------------------
WITH ranked AS (
    SELECT
        id,
        md5(
            lower(btrim(regexp_replace(COALESCE(title, ''), '\s+', ' ', 'g'))) || '|' ||
            lower(btrim(regexp_replace(COALESCE(company, ''), '\s+', ' ', 'g'))) || '|' ||
            lower(btrim(regexp_replace(COALESCE(location, ''), '\s+', ' ', 'g')))
        ) AS normalized_hash,
        ROW_NUMBER() OVER (
            PARTITION BY md5(
                lower(btrim(regexp_replace(COALESCE(title, ''), '\s+', ' ', 'g'))) || '|' ||
                lower(btrim(regexp_replace(COALESCE(company, ''), '\s+', ' ', 'g'))) || '|' ||
                lower(btrim(regexp_replace(COALESCE(location, ''), '\s+', ' ', 'g')))
            )
            ORDER BY COALESCE(date_posted, created_at) DESC, created_at DESC, id DESC
        ) AS rn
    FROM jobs
),
dupes AS (
    SELECT
        duplicate_row.id AS duplicate_id,
        keeper_row.id AS keeper_id
    FROM ranked duplicate_row
    JOIN ranked keeper_row
      ON keeper_row.normalized_hash = duplicate_row.normalized_hash
     AND keeper_row.rn = 1
    WHERE duplicate_row.rn > 1
)
UPDATE jobs AS keeper
SET
    description = COALESCE(keeper.description, duplicate_row.description),
    apply_url = COALESCE(keeper.apply_url, duplicate_row.apply_url),
    source = COALESCE(keeper.source, duplicate_row.source),
    source_type = COALESCE(keeper.source_type, duplicate_row.source_type),
    location_normalized = COALESCE(keeper.location_normalized, duplicate_row.location_normalized),
    experience_level = COALESCE(keeper.experience_level, duplicate_row.experience_level),
    created_by_user_id = COALESCE(keeper.created_by_user_id, duplicate_row.created_by_user_id),
    scraped_at = COALESCE(keeper.scraped_at, duplicate_row.scraped_at),
    date_posted = COALESCE(keeper.date_posted, duplicate_row.date_posted),
    remote = COALESCE(keeper.remote, duplicate_row.remote),
    salary_min = COALESCE(keeper.salary_min, duplicate_row.salary_min),
    salary_max = COALESCE(keeper.salary_max, duplicate_row.salary_max),
    employment_type = COALESCE(keeper.employment_type, duplicate_row.employment_type)
FROM dupes
JOIN jobs AS duplicate_row
  ON duplicate_row.id = dupes.duplicate_id
WHERE keeper.id = dupes.keeper_id;

WITH ranked AS (
    SELECT
        id,
        md5(
            lower(btrim(regexp_replace(COALESCE(title, ''), '\s+', ' ', 'g'))) || '|' ||
            lower(btrim(regexp_replace(COALESCE(company, ''), '\s+', ' ', 'g'))) || '|' ||
            lower(btrim(regexp_replace(COALESCE(location, ''), '\s+', ' ', 'g')))
        ) AS normalized_hash,
        ROW_NUMBER() OVER (
            PARTITION BY md5(
                lower(btrim(regexp_replace(COALESCE(title, ''), '\s+', ' ', 'g'))) || '|' ||
                lower(btrim(regexp_replace(COALESCE(company, ''), '\s+', ' ', 'g'))) || '|' ||
                lower(btrim(regexp_replace(COALESCE(location, ''), '\s+', ' ', 'g')))
            )
            ORDER BY COALESCE(date_posted, created_at) DESC, created_at DESC, id DESC
        ) AS rn
    FROM jobs
)
DELETE FROM jobs
USING ranked
WHERE jobs.id = ranked.id
  AND ranked.rn > 1;

-- Remaining rows can now be normalized in-place without colliding with the
-- legacy unique index on (title, company, location).
UPDATE jobs
SET
    title = btrim(regexp_replace(title, '\s+', ' ', 'g')),
    company = btrim(regexp_replace(company, '\s+', ' ', 'g')),
    location = btrim(regexp_replace(COALESCE(location, ''), '\s+', ' ', 'g'))
WHERE
    title <> btrim(regexp_replace(title, '\s+', ' ', 'g'))
    OR company <> btrim(regexp_replace(company, '\s+', ' ', 'g'))
    OR COALESCE(location, '') <> btrim(regexp_replace(COALESCE(location, ''), '\s+', ' ', 'g'));

UPDATE jobs
SET job_hash = md5(
    lower(btrim(regexp_replace(COALESCE(title, ''), '\s+', ' ', 'g'))) || '|' ||
    lower(btrim(regexp_replace(COALESCE(company, ''), '\s+', ' ', 'g'))) || '|' ||
    lower(btrim(regexp_replace(COALESCE(location, ''), '\s+', ' ', 'g')))
)
WHERE job_hash IS NULL
   OR job_hash <> md5(
        lower(btrim(regexp_replace(COALESCE(title, ''), '\s+', ' ', 'g'))) || '|' ||
        lower(btrim(regexp_replace(COALESCE(company, ''), '\s+', ' ', 'g'))) || '|' ||
        lower(btrim(regexp_replace(COALESCE(location, ''), '\s+', ' ', 'g')))
   );

-- ------------------------------------------------------------
-- Indexing
-- ------------------------------------------------------------
DROP INDEX IF EXISTS jobs_job_hash_idx;

CREATE UNIQUE INDEX IF NOT EXISTS jobs_job_hash_idx
    ON jobs (job_hash);

CREATE INDEX IF NOT EXISTS jobs_location_normalized_idx
    ON jobs (location_normalized);

CREATE INDEX IF NOT EXISTS jobs_experience_level_idx
    ON jobs (experience_level);

CREATE INDEX IF NOT EXISTS jobs_created_by_user_id_idx
    ON jobs (created_by_user_id);

-- `jobs_title_idx` already exists.
-- `jobs_date_posted_idx` already exists and remains the posted_at equivalent.

-- ------------------------------------------------------------
-- ATS source registry
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sources (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT        NOT NULL,
    ats_type     VARCHAR(64) NOT NULL,
    endpoint_url TEXT        NOT NULL,
    priority     INTEGER     NOT NULL DEFAULT 100,
    last_scraped TIMESTAMPTZ,
    active       BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX IF NOT EXISTS sources_endpoint_url_idx
    ON sources (endpoint_url);

CREATE INDEX IF NOT EXISTS sources_active_priority_idx
    ON sources (active, priority DESC);

CREATE INDEX IF NOT EXISTS sources_ats_type_idx
    ON sources (ats_type);
