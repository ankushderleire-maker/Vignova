-- Interview and deadline dates for a tracked application.
-- Additive and nullable, so existing rows and older code are unaffected.
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "interviewAt" TIMESTAMP(3);
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "deadlineAt" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "JobApplication_interviewAt_idx" ON "JobApplication"("interviewAt");
CREATE INDEX IF NOT EXISTS "JobApplication_deadlineAt_idx" ON "JobApplication"("deadlineAt");
