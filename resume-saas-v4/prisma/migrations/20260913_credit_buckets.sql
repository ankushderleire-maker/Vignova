-- Metered credit buckets.
--
-- Replaces the single subscriptions.credits_remaining pool with one integer
-- allowance per feature family, so a cover letter can be worth less than a
-- tailored resume without fractional credits.
--
-- start.sh runs every .sql file in this directory on each container start, so
-- every statement here has to be safe to repeat forever, not just once. Steps
-- 4 and 5 were not: they reset plan numbers edited in /admin/plans and refilled
-- every user's credits on each deploy. The legacy columns are deliberately
-- left in place so a rollback does not lose anyone's balance.

-- ── 1. The buckets ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_buckets (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bucket       VARCHAR(32) NOT NULL,
    remaining    INTEGER     NOT NULL DEFAULT 0,
    total        INTEGER     NOT NULL DEFAULT 0,
    period_start TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS credit_buckets_user_id_bucket_key
    ON credit_buckets (user_id, bucket);
CREATE INDEX IF NOT EXISTS credit_buckets_user_id_idx
    ON credit_buckets (user_id);

-- ── 2. Per-bucket allowances on the admin-editable plan table ─────────────
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS tailoring_credits INTEGER NOT NULL DEFAULT 3;
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS writing_credits   INTEGER NOT NULL DEFAULT 3;
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS interview_credits INTEGER NOT NULL DEFAULT 1;
ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS max_profiles      INTEGER NOT NULL DEFAULT 1;

-- ── 3. Which period a subscription is in ──────────────────────────────────
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS period_start TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- ── 4. Plan numbers ───────────────────────────────────────────────────────
-- -1 means unlimited; lib/planLimits.ts spends it against a fair-use ceiling
-- that is never advertised.
--
-- Only a paid plan still sitting on the ADD COLUMN defaults (3 / 3 / 1 / 1) is
-- filled in. That is true once, before anyone has configured the plan, so a
-- value set from /admin/plans is never overwritten. Free's numbers are the
-- defaults and need nothing. Feature flags are left to lib/planCatalog.ts and
-- the admin seed button for the same reason.

UPDATE plan_configs SET
    tailoring_credits = 50, writing_credits = 100, interview_credits = 5, max_profiles = 5
WHERE plan_type = 'PRO'
  AND tailoring_credits = 3 AND writing_credits = 3 AND interview_credits = 1 AND max_profiles = 1;

UPDATE plan_configs SET
    tailoring_credits = -1, writing_credits = -1, interview_credits = -1, max_profiles = -1
WHERE plan_type = 'PREMIUM'
  AND tailoring_credits = 3 AND writing_credits = 3 AND interview_credits = 1 AND max_profiles = 1;

-- Rows written by the old /api/admin/plans/seed button carry its exact labels:
-- "3 resumes/month" with "Basic", "40 resumes/month" and "150 resumes/month".
-- That button also left Free without the extension or interview prep, so the
-- pricing page listed both as missing. Only rows still carrying the fingerprint
-- are corrected; a corrected row stops matching, and a plan an admin has since
-- relabelled is left alone.
UPDATE plan_configs SET
    credits = 3, has_extension_access = TRUE, has_interview_prep = TRUE,
    resume_creation_label = '3 tailored resumes/month', ai_optimization_label = 'Keyword match score'
WHERE plan_type = 'FREE' AND resume_creation_label = '3 resumes/month' AND ai_optimization_label = 'Basic';

UPDATE plan_configs SET credits = 50, resume_creation_label = '50 tailored resumes/month'
WHERE plan_type = 'PRO' AND resume_creation_label = '40 resumes/month';

UPDATE plan_configs SET credits = -1, resume_creation_label = 'Unlimited tailored resumes'
WHERE plan_type = 'PREMIUM' AND resume_creation_label = '150 resumes/month';

-- ── 5. Give every existing account a full allowance ───────────────────────
-- DO NOTHING, not DO UPDATE. This used to reset every existing balance to a
-- full allowance, and because start.sh re-runs this file on every container
-- start, each deploy handed every user a fresh month of credits. Existing rows
-- belong to lib/credits.ts, which also creates missing ones lazily; this only
-- saves an account's first request that work.
INSERT INTO credit_buckets (user_id, bucket, remaining, total, period_start)
SELECT
    s.user_id,
    b.bucket,
    CASE WHEN b.allowance < 0 THEN 1000 ELSE b.allowance END,
    CASE WHEN b.allowance < 0 THEN 1000 ELSE b.allowance END,
    DATE_TRUNC('month', NOW())
FROM subscriptions s
JOIN plan_configs p ON p.plan_type = s.plan_type
CROSS JOIN LATERAL (
    VALUES
        ('tailoring', p.tailoring_credits),
        ('writing',   p.writing_credits),
        ('interview', p.interview_credits)
) AS b(bucket, allowance)
ON CONFLICT (user_id, bucket) DO NOTHING;
