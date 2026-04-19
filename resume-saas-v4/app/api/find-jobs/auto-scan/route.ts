import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { callBackend } from "@/lib/career-ops";

const DEFAULT_THROTTLE_HOURS = 6;
const FRONTEND_WAIT_MS = 8_000;
const STALE_SCAN_MINUTES = 15;
const PREMIUM_PLANS = new Set(["PRO", "PREMIUM"]);

type ScanFilters = {
    positions?: string[];
    locations?: string[];
    experience?: string;
    datePosted?: "recent" | "week" | "month";
};

type ScanLookupRow = {
    id: string;
    status: string;
};

type GlobalPolicyRow = {
    cooldown_hours_default: number | null;
    scan_enabled: boolean | null;
    scan_disabled_reason: string | null;
};

type UserOverrideRow = {
    cooldown_hours: number | null;
    scan_disabled: boolean | null;
    scan_disabled_reason: string | null;
};

type LastScanRow = {
    id: string;
    status: string;
    created_at: Date | string;
    completed_at: Date | string | null;
    jobs_inserted: number | null;
    jobs_fetched: number | null;
    duplicates: number | null;
    errors: number | null;
};

type ThrottleRow = {
    id: string;
    status: string;
    created_at: Date | string;
};

function getSessionUserId(session: Session | null) {
    const user = session?.user as (Session["user"] & { id?: string }) | undefined;
    return user?.id;
}

async function reapOrphanScans(userId: string): Promise<void> {
    try {
        await db.$executeRawUnsafe(
            `UPDATE scan_jobs
                SET status        = 'FAILED',
                    completed_at  = NOW(),
                    error_message = COALESCE(
                        error_message,
                        'Job scraping did not complete — the worker may have been restarted. Please try again.'
                    )
              WHERE user_id       = $1::uuid
                AND status        IN ('PENDING', 'RUNNING')
                AND completed_at  IS NULL
                AND created_at    < NOW() - ($2::int * INTERVAL '1 minute')`,
            userId,
            STALE_SCAN_MINUTES
        );
    } catch {
        // best effort only
    }
}

async function findScanRow(
    userId: string,
    scanId: string
): Promise<{ id: string; status: string } | null> {
    try {
        const rows = (await db.$queryRawUnsafe(
            `SELECT id, status
               FROM scan_jobs
              WHERE id = $1
                AND user_id = $2::uuid
              LIMIT 1`,
            scanId,
            userId
        )) as ScanLookupRow[];
        if (Array.isArray(rows) && rows[0]) {
            return { id: String(rows[0].id), status: String(rows[0].status || "") };
        }
    } catch {
        // ignore
    }
    return null;
}

async function confirmScanStarted(
    userId: string,
    scanId: string,
    attempts = 4,
    delayMs = 500
): Promise<boolean> {
    for (let index = 0; index < attempts; index += 1) {
        const row = await findScanRow(userId, scanId);
        if (row) return true;
        if (index < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
    return false;
}

async function resolveUserPlan(userId: string): Promise<{
    planType: string;
    hasAccess: boolean;
}> {
    try {
        const sub = await db.subscriptions.findUnique({
            where: { user_id: userId },
            select: { plan_type: true, expires_at: true },
        });
        if (!sub) return { planType: "FREE", hasAccess: false };

        if (sub.expires_at && sub.expires_at.getTime() < Date.now()) {
            return { planType: "FREE", hasAccess: false };
        }

        const planType = (sub.plan_type || "FREE").toUpperCase();
        return { planType, hasAccess: PREMIUM_PLANS.has(planType) };
    } catch (error) {
        console.error("[JOB_SCRAPPER_PLAN_LOOKUP]", error);
        return { planType: "FREE", hasAccess: false };
    }
}

async function resolveScanPolicy(userId: string): Promise<{
    scanDisabled: boolean;
    reason: string | null;
    cooldownHours: number;
}> {
    let cooldown = DEFAULT_THROTTLE_HOURS;
    let disabled = false;
    let reason: string | null = null;

    try {
        const globalRows = (await db.$queryRawUnsafe(
            `SELECT cooldown_hours_default, scan_enabled, scan_disabled_reason
               FROM admin_scan_settings
              WHERE id = 'singleton'
              LIMIT 1`
        )) as GlobalPolicyRow[];

        if (Array.isArray(globalRows) && globalRows[0]) {
            if (Number.isFinite(globalRows[0].cooldown_hours_default)) {
                cooldown = Number(globalRows[0].cooldown_hours_default);
            }
            if (globalRows[0].scan_enabled === false) {
                disabled = true;
                reason =
                    globalRows[0].scan_disabled_reason ||
                    "Job scraping is temporarily disabled by the admin.";
            }
        }
    } catch {
        // table missing on fresh installs
    }

    try {
        const overrideRows = (await db.$queryRawUnsafe(
            `SELECT cooldown_hours, scan_disabled, scan_disabled_reason
               FROM user_cooldown_overrides
              WHERE user_id = $1::uuid
                AND (expires_at IS NULL OR expires_at > NOW())
              LIMIT 1`,
            userId
        )) as UserOverrideRow[];

        if (Array.isArray(overrideRows) && overrideRows[0]) {
            if (
                overrideRows[0].cooldown_hours !== null &&
                Number.isFinite(overrideRows[0].cooldown_hours)
            ) {
                cooldown = Number(overrideRows[0].cooldown_hours);
            }
            if (overrideRows[0].scan_disabled === true && !disabled) {
                disabled = true;
                reason =
                    overrideRows[0].scan_disabled_reason ||
                    "Job scraping is disabled for your account.";
            }
        }
    } catch {
        // table missing on fresh installs
    }

    if (!Number.isFinite(cooldown) || cooldown < 0) cooldown = DEFAULT_THROTTLE_HOURS;
    if (cooldown > 168) cooldown = 168;

    return { scanDisabled: disabled, reason, cooldownHours: cooldown };
}

async function getLastScan(userId: string) {
    try {
        const rows = (await db.$queryRawUnsafe(
            `SELECT id, status, created_at, completed_at,
                    COALESCE(jobs_inserted, 0) AS jobs_inserted,
                    COALESCE(jobs_fetched,  0) AS jobs_fetched,
                    COALESCE(duplicates,    0) AS duplicates,
                    COALESCE(errors,        0) AS errors
               FROM scan_jobs
              WHERE user_id = $1::uuid
              ORDER BY created_at DESC
              LIMIT 1`,
            userId
        )) as LastScanRow[];

        if (Array.isArray(rows) && rows[0]) {
            return {
                id: rows[0].id,
                status: rows[0].status,
                createdAt: new Date(rows[0].created_at).toISOString(),
                completedAt: rows[0].completed_at
                    ? new Date(rows[0].completed_at).toISOString()
                    : null,
                jobsInserted: Number(rows[0].jobs_inserted || 0),
                jobsFetched: Number(rows[0].jobs_fetched || 0),
                updatedExisting: Number(rows[0].duplicates || 0),
                errors: Number(rows[0].errors || 0),
            };
        }
    } catch {
        // table missing
    }
    return null;
}

async function getThrottleStatus(userId: string, cooldownHours: number) {
    try {
        const rows = (await db.$queryRawUnsafe(
            `SELECT id, status, created_at
               FROM scan_jobs
              WHERE user_id = $1::uuid
                AND created_at > NOW() - ($2::int * INTERVAL '1 hour')
              ORDER BY created_at DESC
              LIMIT 1`,
            userId,
            cooldownHours
        )) as ThrottleRow[];

        if (Array.isArray(rows) && rows[0]) {
            const lastScanAt = new Date(rows[0].created_at);
            const nextAllowedAt = new Date(
                lastScanAt.getTime() + cooldownHours * 3_600_000
            );
            return {
                throttled: true,
                lastScanAt: rows[0].created_at,
                lastScanStatus: rows[0].status,
                nextAllowedAt: nextAllowedAt.toISOString(),
                cooldownHours,
            };
        }
    } catch {
        // fall through
    }
    return { throttled: false, cooldownHours };
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await reapOrphanScans(userId);

    let filters: ScanFilters = {};
    try {
        filters = (await req.json()) || {};
    } catch {
        filters = {};
    }

    const plan = await resolveUserPlan(userId);
    if (!plan.hasAccess) {
        return NextResponse.json(
            {
                triggered: false,
                premium_required: true,
                plan_type: plan.planType,
                message:
                    "Job Scrapper is a premium feature. Upgrade your plan to scan LinkedIn and Indeed.",
            },
            { status: 402 }
        );
    }

    const policy = await resolveScanPolicy(userId);
    if (policy.scanDisabled) {
        return NextResponse.json(
            {
                triggered: false,
                disabled: true,
                reason: policy.reason,
                message: policy.reason || "Job scraping is currently disabled.",
            },
            { status: 423 }
        );
    }

    const throttle = await getThrottleStatus(userId, policy.cooldownHours);
    if (throttle.throttled) {
        return NextResponse.json(throttle);
    }

    const keywords = Array.isArray(filters.positions)
        ? filters.positions
              .map((value) => String(value).trim())
              .filter((value) => value.length >= 2 && value.length <= 64)
              .slice(0, 5)
        : [];

    if (keywords.length === 0) {
        return NextResponse.json({
            triggered: false,
            reason: "no_keywords",
            message: "Add at least one position to scan for.",
        });
    }

    const locations = Array.isArray(filters.locations)
        ? filters.locations
              .map((value) => String(value).trim())
              .filter((value) => value.length > 0)
              .slice(0, 10)
        : [];

    const scanId = randomUUID().replace(/-/g, "");

    const payload = {
        user_id: userId,
        scan_id: scanId,
        sources: ["linkedin", "indeed"],
        keywords,
        locations,
        experience: filters.experience || null,
        date_posted: filters.datePosted || null,
    };

    const result = await callBackend("/api/scan", {
        method: "POST",
        body: payload,
        timeoutMs: FRONTEND_WAIT_MS,
    });

    if (result.ok) {
        return NextResponse.json({
            triggered: true,
            scan_id: scanId,
            keywords,
            locations,
            ...result.data,
        });
    }

    if (result.status === 0 || result.status === 500) {
        const started = await confirmScanStarted(userId, scanId);
        if (started) {
            return NextResponse.json({
                triggered: true,
                pending: true,
                scan_id: scanId,
                keywords,
                locations,
                message: "Job scrape is running in the background. Fresh jobs will appear in Find Jobs shortly.",
            });
        }
        return NextResponse.json(
            {
                triggered: false,
                error:
                    "Job scraping could not be confirmed after a backend interruption. Please try again.",
            },
            { status: 502 }
        );
    }

    if (result.status === 409) {
        return NextResponse.json(
            {
                triggered: false,
                busy: true,
                message:
                    result.error ||
                    "Another job scrape is already running. Try again in a moment.",
            },
            { status: 409 }
        );
    }

    return NextResponse.json(
        {
            triggered: false,
            error: result.error || "Job scrape could not be started",
        },
        { status: result.status || 500 }
    );
}

export async function GET() {
    const session = await getServerSession(authOptions);
    const userId = getSessionUserId(session);
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await reapOrphanScans(userId);

    const plan = await resolveUserPlan(userId);
    if (!plan.hasAccess) {
        return NextResponse.json({
            premium_required: true,
            plan_type: plan.planType,
            throttled: false,
            lastScan: await getLastScan(userId),
        });
    }

    const policy = await resolveScanPolicy(userId);
    if (policy.scanDisabled) {
        return NextResponse.json({
            disabled: true,
            reason: policy.reason,
            cooldownHours: policy.cooldownHours,
            lastScan: await getLastScan(userId),
        });
    }

    const lastScan = await getLastScan(userId);
    const throttle = await getThrottleStatus(userId, policy.cooldownHours);

    return NextResponse.json({
        ...throttle,
        cooldownHours: policy.cooldownHours,
        lastScan,
    });
}
