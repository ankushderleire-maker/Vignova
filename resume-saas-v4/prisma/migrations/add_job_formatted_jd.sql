-- Structured job description produced by the JD formatter agent.
-- Nullable and additive, so this is safe to re-run and safe on live data.
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "formattedJd" JSONB;
