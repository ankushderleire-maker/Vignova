-- Extension settings singleton table
-- Backed by /api/admin/extension-settings and read publicly via /api/extension-config.
-- Idempotent — safe to re-run.

CREATE TABLE IF NOT EXISTS "admin_extension_settings" (
    "id"                TEXT        PRIMARY KEY,
    "extension_id"      TEXT        NOT NULL DEFAULT '',
    "extension_version" TEXT        NOT NULL DEFAULT '1.0.0',
    "extension_name"    TEXT        NOT NULL DEFAULT 'Vignova Extension',
    "install_url"       TEXT        NOT NULL DEFAULT '',
    "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_by"        UUID
);

-- Seed singleton row so GET works immediately without a write.
INSERT INTO "admin_extension_settings" ("id")
VALUES ('singleton')
ON CONFLICT ("id") DO NOTHING;
