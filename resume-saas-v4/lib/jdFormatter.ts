/**
 * Thin client for the JD formatter agent.
 *
 * The agent itself lives in the FastAPI backend
 * (`app/services/jd_formatter.py`), alongside the rest of the AI stack. This
 * file only forwards to it. The provider key, the model choice and the prompt
 * never enter the Next.js process, so nothing about them can reach a browser
 * bundle — and the backend route is behind INTERNAL_API_KEY, which `callBackend`
 * injects and the client cannot.
 *
 * If the backend is unreachable or unconfigured, `lib/jobDescription.ts`
 * produces the same shape deterministically, so formatting never blocks a save.
 */

import { callBackend } from "@/lib/career-ops";
import { formatWithParser, type FormattedJd, type JdEnvelope } from "@/lib/jobDescription";

export type { FormattedJd, JdKeyInfo, JdEnvelope } from "@/lib/jobDescription";

const TIMEOUT_MS = Number(process.env.JD_FORMAT_TIMEOUT_MS || 60_000);

export type JdFormatContext = {
    jobTitle?: string | null;
    company?: string | null;
    location?: string | null;
    salary?: string | null;
    /** Passed through so the backend can rate-limit per user, not per server IP. */
    userId?: string | null;
};

/**
 * Formats one posting. Always resolves — a failure comes back as the parser
 * fallback rather than throwing, because this runs on the job-save path.
 */
export async function formatJobDescription(
    description: string | null | undefined,
    context?: JdFormatContext
): Promise<JdEnvelope> {
    const text = (description || "").trim();

    if (!text) {
        return {
            status: "FAILED",
            version: 1,
            source: "parser",
            model: null,
            formattedAt: new Date().toISOString(),
            data: null,
            error: "No job description to format.",
        };
    }

    const bail = (reason: string): JdEnvelope => {
        const fallback = formatWithParser(text, context);
        fallback.error = reason;
        return fallback;
    };

    const result = await callBackend<{ model: string; data: FormattedJd }>("/api/jd/format", {
        method: "POST",
        timeoutMs: TIMEOUT_MS,
        headers: context?.userId ? { "X-Client-Id": context.userId } : undefined,
        body: {
            description: text,
            jobTitle: context?.jobTitle || null,
            company: context?.company || null,
            location: context?.location || null,
            salary: context?.salary || null,
        },
    });

    if (!result.ok || !result.data?.data) {
        console.error("[JD_FORMAT] backend returned", result.status, result.error);
        return bail(result.error || `Formatter unavailable (HTTP ${result.status}); used the built-in parser.`);
    }

    return {
        status: "READY",
        version: 1,
        source: "ai",
        model: result.data.model || null,
        formattedAt: new Date().toISOString(),
        data: result.data.data,
    };
}
