-- The application email drafted alongside the resume and cover letter.
--
-- It used to be returned to the extension and then forgotten, so closing the
-- overlay lost it. Storing it also lets the duplicate check see that an email
-- already exists for a posting.
--
-- Additive and nullable, so existing rows and older code are unaffected.
ALTER TABLE "JobApplication" ADD COLUMN IF NOT EXISTS "draftEmail" TEXT;
