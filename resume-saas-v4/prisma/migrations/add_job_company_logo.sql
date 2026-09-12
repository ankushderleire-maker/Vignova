-- The employer's logo, as the job board showed it when the job was saved.
--
-- The dashboard had no stored logo at all: it guessed a domain from the company
-- name and asked Google for a favicon, which misses for every employer whose
-- name is not their domain, and for every posting saved from LinkedIn (whose
-- own URL is a job board, not the employer).
--
-- Additive and nullable, so existing rows and older code are unaffected.
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "companyLogo" TEXT;
