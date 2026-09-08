/**
 * Version comparison for the extension's force-update check.
 *
 * Chrome extension versions are one to four dot-separated integers — no
 * pre-release tags, no build metadata — so full semver parsing would be more
 * machinery than the format allows. Missing parts count as zero, which makes
 * "1.3" and "1.3.0" the same version.
 *
 * Returns < 0 when a is older, 0 when equal, > 0 when a is newer.
 */
export function cmpVersion(a: string, b: string): number {
    const pa = String(a || "0").split(".");
    const pb = String(b || "0").split(".");
    const len = Math.max(pa.length, pb.length);

    for (let i = 0; i < len; i++) {
        const na = parseInt(pa[i] ?? "0", 10) || 0;
        const nb = parseInt(pb[i] ?? "0", 10) || 0;
        if (na !== nb) return na - nb;
    }
    return 0;
}

/** Chrome accepts 1–4 dot-separated integers, each 0–65535. */
export function isValidVersion(v: string): boolean {
    const parts = String(v || "").split(".");
    if (parts.length < 1 || parts.length > 4) return false;
    return parts.every((p) => /^\d+$/.test(p) && Number(p) <= 65535);
}
