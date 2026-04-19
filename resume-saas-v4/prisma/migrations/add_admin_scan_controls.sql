-- Admin scan-controls tables
-- These back /app/api/admin/scan-controls/* and are queried via $queryRawUnsafe,
-- so they live outside schema.prisma. Idempotent — safe to re-run.

-- 1) Singleton settings row used by the global scan-controls page.
CREATE TABLE IF NOT EXISTS "admin_scan_settings" (
    "id"                      TEXT        PRIMARY KEY,
    "cooldown_hours_default"  INTEGER     NOT NULL DEFAULT 24,
    "scan_enabled"            BOOLEAN     NOT NULL DEFAULT TRUE,
    "scan_disabled_reason"    TEXT,
    "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_by"              UUID
);

-- Seed the singleton row (id = 'singleton') so GET works immediately.
INSERT INTO "admin_scan_settings" ("id")
VALUES ('singleton')
ON CONFLICT ("id") DO NOTHING;

-- 2) Per-user cooldown / disable overrides, keyed 1:1 by user.
CREATE TABLE IF NOT EXISTS "user_cooldown_overrides" (
    "user_id"               UUID        PRIMARY KEY,
    "cooldown_hours"        INTEGER,
    "scan_disabled"         BOOLEAN     NOT NULL DEFAULT FALSE,
    "scan_disabled_reason"  TEXT,
    "expires_at"            TIMESTAMPTZ,
    "updated_by"            UUID,
    "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make the JOIN from users -> overrides fast and add FK integrity when possible.
CREATE INDEX IF NOT EXISTS "user_cooldown_overrides_user_id_idx"
    ON "user_cooldown_overrides" ("user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conname = 'user_cooldown_overrides_user_id_fkey'
    ) THEN
        ALTER TABLE "user_cooldown_overrides"
            ADD CONSTRAINT "user_cooldown_overrides_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users" ("id")
            ON DELETE CASCADE;
    END IF;
END $$;
