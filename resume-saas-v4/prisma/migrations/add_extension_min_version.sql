-- Force-update controls for the browser extension.
--
-- The Chrome Web Store pushes updates on its own schedule and cannot be told
-- to retire a build, so an old extension can keep calling the API for days.
-- `min_version` is the oldest build still allowed to run: anything below it
-- blocks itself and shows the update screen.
--
-- Additive with defaults, so existing rows and older code are unaffected.
-- 0.0.0 means "block nothing", which is the safe starting state.
ALTER TABLE "admin_extension_settings" ADD COLUMN IF NOT EXISTS "min_version" TEXT NOT NULL DEFAULT '0.0.0';
ALTER TABLE "admin_extension_settings" ADD COLUMN IF NOT EXISTS "update_message" TEXT NOT NULL DEFAULT '';
