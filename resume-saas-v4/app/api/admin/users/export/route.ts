import { NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/**
 * GET /api/admin/users/export
 * Streams all users as a CSV download (capped at 50k rows).
 * Honors the same search/plan/role/status filters as the list endpoint.
 */

function csvEscape(value: unknown): string {
    const s = value === null || value === undefined ? "" : String(value);
    if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

export async function GET(req: Request) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    try {
        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";
        const plan = searchParams.get("plan") || "";
        const role = searchParams.get("role") || "";
        const status = searchParams.get("status") || "";

        const where: Record<string, unknown> = {};
        if (search) {
            where.OR = [
                { email: { contains: search, mode: "insensitive" } },
                { full_name: { contains: search, mode: "insensitive" } },
            ];
        }
        if (plan) where.subscriptions = { is: { plan_type: plan } };
        if (role) where.role = role;
        if (status) where.status = status;

        const users = await db.users.findMany({
            where,
            include: {
                subscriptions: {
                    select: {
                        plan_type: true,
                        credits_remaining: true,
                        credits_total: true,
                        expires_at: true,
                    },
                },
                _count: {
                    select: {
                        generated_resumes: true,
                        job_applications: true,
                        payments: true,
                    },
                },
            },
            orderBy: { created_at: "desc" },
            take: 50000,
        });

        const header = [
            "id", "email", "full_name", "role", "status", "country", "plan",
            "credits_remaining", "credits_total", "resumes", "jobs", "payments",
            "created_at",
        ].join(",");

        const rows = users.map((u) =>
            [
                u.id,
                u.email,
                u.full_name,
                u.role,
                u.status,
                u.country,
                u.subscriptions?.plan_type ?? "FREE",
                u.subscriptions?.credits_remaining ?? "",
                u.subscriptions?.credits_total ?? "",
                u._count.generated_resumes,
                u._count.job_applications,
                u._count.payments,
                u.created_at.toISOString(),
            ]
                .map(csvEscape)
                .join(",")
        );

        await logAdminAction({
            admin: auth.user,
            action: "USERS_EXPORT",
            targetType: "user",
            details: { count: users.length, filters: { search, plan, role, status } },
            req,
        });

        const csv = [header, ...rows].join("\r\n");
        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="vignova-users-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error) {
        console.error("[ADMIN_USERS_EXPORT]", error);
        return NextResponse.json({ error: "Export failed" }, { status: 500 });
    }
}
