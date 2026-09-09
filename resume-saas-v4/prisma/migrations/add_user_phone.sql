-- Contact number captured at signup.
--
-- The signup form has always had a phone field, but nothing accepted the
-- value: the register route destructured only fullName/email/password/country,
-- so every number typed was silently discarded. Stored in E.164 (a leading +
-- and digits only) so the country code travels with it.
--
-- Additive and nullable, so existing rows and older code are unaffected.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(20);
