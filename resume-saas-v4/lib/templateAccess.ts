import { db } from "@/lib/db";
import { TEMPLATES } from "@/lib/stores/resumeStore";
import { isPaidPlan } from "@/lib/extensionPlan";

/**
 * Who may download which template.
 *
 * `isPremium` has been on the template metadata all along and was never
 * enforced: the PDF route accepted whatever HTML the browser sent, so a free
 * account could download any design simply by selecting it. Preview stays open
 * to everyone — you should be able to see what you would be paying for — and
 * the gate sits on the download, where the value actually changes hands.
 *
 * Checked on the server against the session, never from a flag in the request:
 * the client knows which template is selected, but it does not get to decide
 * whether it is allowed.
 */

const PREMIUM_TEMPLATE_IDS: Set<string> = new Set(
    TEMPLATES.filter((t) => t.isPremium).map((t) => String(t.id))
);

export function isPremiumTemplate(templateId?: string | null): boolean {
    return PREMIUM_TEMPLATE_IDS.has(String(templateId || ""));
}

/** Free templates, for the "switch to one of these instead" offer. */
export function freeTemplateNames(limit = 6): string[] {
    return TEMPLATES.filter((t) => !t.isPremium).slice(0, limit).map((t) => t.name);
}

export type TemplateAccess =
    | { allowed: true }
    | { allowed: false; plan: string; templateName: string };

/**
 * Whether this user may take away a PDF of this template.
 *
 * A missing subscription row counts as FREE rather than as an error, the same
 * way the extension treats it — an account that has not been set up should see
 * the upgrade prompt, not a failure.
 */
export async function checkTemplateAccess(
    userId: string,
    templateId?: string | null
): Promise<TemplateAccess> {
    if (!isPremiumTemplate(templateId)) return { allowed: true };

    const subscription = await db.subscriptions.findFirst({
        where: { user_id: userId },
        select: { plan_type: true },
    });

    const plan = subscription?.plan_type || "FREE";
    if (isPaidPlan(plan)) return { allowed: true };

    const templateName =
        TEMPLATES.find((t) => t.id === templateId)?.name || String(templateId);

    return { allowed: false, plan, templateName };
}
