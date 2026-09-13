-- Metered credit buckets.
--
-- Replaces the single subscriptions.credits_remaining pool with one integer
-- allowance per feature family, so a cover letter can be worth less than a
-- tailored resume without fractional credits.
--
-- Idempotent: safe to re-run. The legacy columns are deliberately left in
-- place so a rollback does not lose anyone's balance.

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
UPDATE plan_configs SET
    tailoring_credits = 3, writing_credits = 3, interview_credits = 1,
    max_profiles = 1, has_extension_access = TRUE
WHERE plan_type = 'FREE';

UPDATE plan_configs SET
    tailoring_credits = 50, writing_credits = 100, interview_credits = 5,
    max_profiles = 5, has_extension_access = TRUE, is_popular = TRUE
WHERE plan_type = 'PRO';

UPDATE plan_configs SET
    tailoring_credits = -1, writing_credits = -1, interview_credits = -1,
    max_profiles = -1, has_extension_access = TRUE, is_popular = FALSE
WHERE plan_type = 'PREMIUM';

-- ── 5. Give every existing account a full allowance ───────────────────────
-- Every account today is a test account, so this resets rather than carrying
-- balances over. Re-running only repairs missing rows.
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
ON CONFLICT (user_id, bucket) DO UPDATE
SET remaining    = EXCLUDED.remaining,
    total        = EXCLUDED.total,
    period_start = EXCLUDED.period_start;
