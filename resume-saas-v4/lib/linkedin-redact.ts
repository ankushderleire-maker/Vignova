/**
 * Strips provider fingerprints out of a LinkedIn analysis before it reaches
 * the browser.
 *
 * The normalized profile carries `source: "apify"` and the analysis carries
 * the provider's run identifiers, so opening devtools on the optimizer page
 * named our vendor outright. None of it is used by the UI — it is bookkeeping
 * that was being forwarded because the route passed the payload through
 * verbatim.
 *
 * Deliberately a denylist of known-internal keys rather than an allowlist of
 * profile fields: the profile shape is wide and still growing, and silently
 * dropping a new section the UI had started rendering would be a worse bug
 * than leaking a key name we forgot to list. New internal fields should be
 * added here as they appear.
 */

/** Keys that describe how we fetched, not what we fetched. */
const INTERNAL_KEYS = new Set([
    "source",
    "runId",
    "run_id",
    "datasetId",
    "dataset_id",
    "actorId",
    "actor_id",
    "actorRunId",
    "apifyRunId",
    "statusMessage",
    "provider",
    "scraper",
]);

function scrub(value: unknown, depth: number): unknown {
    if (depth > 12 || value === null || typeof value !== "object") return value;

    if (Array.isArray(value)) {
        return value.map((v) => scrub(v, depth + 1));
    }

    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        if (INTERNAL_KEYS.has(key)) continue;
        out[key] = scrub(v, depth + 1);
    }
    return out;
}

/** The analysis, with provider bookkeeping removed at every depth. */
export function redactLinkedInAnalysis<T>(analysis: T): T {
    return scrub(analysis, 0) as T;
}
