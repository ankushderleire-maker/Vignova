-- Migration 003: Admin controls for scan cooldown + scan lock.
--
-- Gives the admin panel a place to:
--   1. Change the global cooldown hours (default 6).
--   2. Globally disable the "Scan Portals Now" button (with a reason).
--   3. Override cooldown per user, or hard-disable scan for a specific user.
--
-- All tables use IF NOT EXISTS so this migration is re-run-safe.

-- ── Global settings: one row, id = 'singleton' ─────────────────────
CREATE TABLE IF NOT EXISTS admin_scan_settings (
    id                      TEXT        PRIMARY KEY DEFAULT 'singleton',
    cooldown_hours_default  INTEGER     NOT NULL DEFAULT 6,
    scan_enabled            BOOLEAN     NOT NULL DEFAULT TRUE,
    scan_disabled_reason    TEXT,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by              UUID
);

-- Seed the singleton row if missing. Safe to run repeatedly.
INSERT INTO admin_scan_settings (id)
VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- ── Per-user overrides ─────────────────────────────────────────────
-- One row per user with a non-default setting. Absence = global default.
CREATE TABLE IF NOT EXISTS user_cooldown_overrides (
    user_id              UUID        PRIMARY KEY
                                     REFERENCES users(id) ON DELETE CASCADE,
    cooldown_hours       INTEGER,        -- NULL = use global default
    scan_disabled        BOOLEAN     NOT NULL DEFAULT FALSE,
    scan_disabled_reason TEXT,
    expires_at           TIMESTAMPTZ,    -- override auto-expires after this
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by           UUID
);

CREATE INDEX IF NOT EXISTS user_cooldown_overrides_expires_idx
    ON user_cooldown_overrides (expires_at)
    WHERE expires_at IS NOT NULL;
