import { db } from "@/lib/db";

export function jsonObject(value: unknown): Record<string, any> {
    if (typeof value === "string") { try { return jsonObject(JSON.parse(value)); } catch { return {}; } }
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

export function startOfWeek(now = new Date()) {
    const start = new Date(now);
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
    return start;
}

// Preserve unrelated extension settings when updating a template or preference.
export async function mergeExtensionSettings(userId: string, patch: Record<string, unknown>) {
    await db.$executeRaw`UPDATE "users" SET "extensionSettings" =
        COALESCE("extensionSettings", '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb
        WHERE "id" = ${userId}::uuid`;
    const user = await db.users.findUnique({ where: { id: userId }, select: { extensionSettings: true } });
    return jsonObject(user?.extensionSettings);
}

export async function activeExtensionProfile(userId: string) {
    return db.master_profiles.findFirst({ where: { user_id: userId },
        orderBy: [{ is_default: "desc" }, { updated_at: "desc" }] });
}
