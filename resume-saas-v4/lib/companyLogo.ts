/**
 * A logo URL from a job board, or "" if it is not one we will store.
 *
 * The value ends up in an <img src> via our own proxy, and the proxy has its
 * own allowlist — but a row that can only ever hold a job board's https URL is
 * one less thing to reason about later.
 */
const LOGO_HOSTS = new Set([
    "media.licdn.com",
    "media-exp1.licdn.com",
    "static.licdn.com",
    "d2q79iu7y748jz.cloudfront.net",
    "employer-logos.indeed.com",
]);

function isAllowedLogoHost(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return LOGO_HOSTS.has(host) || host.endsWith(".monster.com") || host.endsWith(".newjobs.com");
}

export function safeCompanyLogo(value: unknown): string {
    if (typeof value !== "string" || value.length > 500) return "";
    try {
        const url = new URL(value.trim());
        if (url.protocol !== "https:") return "";
        return isAllowedLogoHost(url.hostname) ? url.toString() : "";
    } catch {
        return "";
    }
}
