-- Add onboarding_done column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_done" BOOLEAN NOT NULL DEFAULT false;
