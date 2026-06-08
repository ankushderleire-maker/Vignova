/**
 * Shared helper for Career Ops API routes.
 * Forwards a request to the FastAPI backend, injecting the internal API key
 * and optionally the authenticated user_id.
 */

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || "http://localhost:8000";
const INTERNAL_API_KEY =
    process.env.INTERNAL_API_KEY || "vignova_internal_secret_key_123";

export type BackendCallOpts = {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: any;
    query?: Record<string, string | number | undefined | null>;
    /** Extra headers to merge on. */
    headers?: Record<string, string>;
    /** Milliseconds to wait. Defaults to 120_000. */
    timeoutMs?: number;
};

export async function callBackend<T = any>(
    path: string,
    opts: BackendCallOpts = {}
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
    const method = opts.method || "GET";

    const url = new URL(path.startsWith("http") ? path : `${AI_BACKEND_URL}${path}`);
    if (opts.query) {
        for (const [k, v] of Object.entries(opts.query)) {
            if (v !== undefined && v !== null && v !== "") {
                url.searchParams.set(k, String(v));
            }
        }
    }

    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        opts.timeoutMs ?? 120_000
    );

    try {
        const res = await fetch(url.toString(), {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": INTERNAL_API_KEY,
                "x-internal-key": INTERNAL_API_KEY,
                ...(opts.headers || {}),
            },
            body:
                method === "GET" || method === "DELETE"
                    ? undefined
                    : JSON.stringify(opts.body ?? {}),
            signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") || "";
        const data = contentType.includes("application/json")
            ? await res.json()
            : ((await res.text()) as any);

        return {
            ok: res.ok,
            status: res.status,
            data: res.ok ? (data as T) : null,
            error: res.ok ? undefined : typeof data === "string" ? data : data?.detail || data?.error,
        };
    } catch (err: any) {
        return {
            ok: false,
            status: 500,
            data: null,
            error: err?.message || "Backend call failed",
        };
    } finally {
        clearTimeout(timeout);
    }
}

/** Reason strings for the unauthorized early-return, deduped across routes. */
export const UNAUTHORIZED = { error: "Unauthorized" } as const;
