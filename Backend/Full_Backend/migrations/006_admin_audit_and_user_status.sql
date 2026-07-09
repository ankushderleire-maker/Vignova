-- Admin panel hardening: audit trail + user suspension
-- Backs /app/api/admin/audit-logs and the users.status checks in auth.
-- Idempotent — safe to re-run.

-- 1) User account status (ACTIVE | SUSPENDED). Enforced at login and in
--    the OAuth signIn callback; toggled from the admin Users page.
ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "status" VARCHAR(16) NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" ("status");

-- 2) Immutable audit trail of every admin mutation. Written via raw SQL
--    from lib/admin-guard.ts (fail-open so a missing table never breaks
--    the admin action itself).
CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
    "id"           BIGSERIAL    PRIMARY KEY,
    "admin_id"     UUID,
    "admin_email"  TEXT,
    "action"       VARCHAR(64)  NOT NULL,
    "target_type"  VARCHAR(32),
    "target_id"    TEXT,
    "details"      JSONB,
    "ip"           TEXT,
    "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "admin_audit_logs_created_at_idx"
    ON "admin_audit_logs" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "admin_audit_logs_admin_id_idx"
    ON "admin_audit_logs" ("admin_id");
CREATE INDEX IF NOT EXISTS "admin_audit_logs_action_idx"
    ON "admin_audit_logs" ("action");
