import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/**
 * GET /api/admin/audit-logs?page=&limit=&action=&search=
 *
 * Read-only view of the admin audit trail. Queried via raw SQL so it works
 * even before `prisma generate` picks up the new model (matches the
 * scan-controls pattern).
 */

type Row = {
    id: bigint;
    admin_id: string | null;
    admin_email: string | null;
    action: string;
    target_type: string | null;
    target_id: string | null;
    details: unknown;
    ip: string | null;
    created_at: string;
};

export async function GET(req: NextRequest) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const url = new URL(req.url);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25) || 25));
    const action = (url.searchParams.get("action") || "").trim();
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const offset = (page - 1) * limit;

    try {
        const actionFilter = action || null;
        const searchFilter = search ? `%${search}%` : null;

        const whereSql = `
             WHERE ($1::text IS NULL OR action = $1)
               AND ($2::text IS NULL
                    OR LOWER(COALESCE(admin_email, '')) LIKE $2
                    OR LOWER(COALESCE(target_id, '')) LIKE $2
                    OR LOWER(COALESCE(details::text, '')) LIKE $2)`;

        const [rows, countRows, actionRows] = await Promise.all([
            db.$queryRawUnsafe(
                `SELECT id, admin_id, admin_email, action, target_type, target_id,
                        details, ip, created_at
                   FROM admin_audit_logs
                 ${whereSql}
                  ORDER BY created_at DESC
                  LIMIT $3 OFFSET $4`,
                actionFilter,
                searchFilter,
                limit,
                offset
            ) as Promise<Row[]>,
            db.$queryRawUnsafe(
                `SELECT COUNT(*)::int AS count FROM admin_audit_logs ${whereSql}`,
                actionFilter,
                searchFilter
            ) as Promise<Array<{ count: number }>>,
            db.$queryRawUnsafe(
                `SELECT DISTINCT action FROM admin_audit_logs ORDER BY action`
            ) as Promise<Array<{ action: string }>>,
        ]);

        const total = countRows[0]?.count ?? 0;

        return NextResponse.json({
            logs: rows.map((r) => ({
                id: String(r.id),
                adminId: r.admin_id,
                adminEmail: r.admin_email,
                action: r.action,
                targetType: r.target_type,
                targetId: r.target_id,
                details: r.details,
                ip: r.ip,
                createdAt: r.created_at,
            })),
            actions: actionRows.map((a) => a.action),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        console.error("[ADMIN_AUDIT_LOGS_GET]", err);
        return NextResponse.json(
            { error: "Failed to load audit logs — has migration 006 been applied?" },
            { status: 500 }
        );
    }
}
