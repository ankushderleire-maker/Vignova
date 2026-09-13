"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, FileText, MessageSquareQuote, Mic, RefreshCw, Users } from "lucide-react";

type BucketState = {
    bucket: "tailoring" | "writing" | "interview";
    label: string;
    description: string;
    remaining: number;
    total: number;
    used: number;
    unlimited: boolean;
};

type Usage = {
    plan_type: string;
    billing_cycle: string;
    resets_at: string;
    buckets: BucketState[];
    profiles: { used: number; total: number; unlimited: boolean };
    features: Record<string, boolean>;
};

const ICONS = {
    tailoring: FileText,
    writing: MessageSquareQuote,
    interview: Mic,
} as const;

/**
 * Colour follows how much is left, not which bucket it is: the point of this
 * screen is to show what is about to run out.
 */
function tone(remaining: number, total: number, unlimited: boolean) {
    if (unlimited) return { bar: "bg-violet-500", text: "text-violet-300" };
    const ratio = total > 0 ? remaining / total : 0;
    if (remaining === 0) return { bar: "bg-rose-500", text: "text-rose-300" };
    if (ratio <= 0.2) return { bar: "bg-amber-500", text: "text-amber-300" };
    return { bar: "bg-emerald-500", text: "text-emerald-300" };
}

export default function UsagePage() {
    const [usage, setUsage] = useState<Usage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch("/api/usage", { cache: "no-store" });
            if (!res.ok) throw new Error("Could not load your usage.");
            setUsage(await res.json());
            setError(null);
        } catch (err: any) {
            setError(err?.message || "Could not load your usage.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const resetsOn = usage
        ? new Date(usage.resets_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
          })
        : "";

    return (
        <div className="p-8 max-w-5xl mx-auto text-[var(--foreground)] animate-slide-down">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
                <div>
                    <h1 className="text-2xl font-semibold">Your usage</h1>
                    <p className="text-sm text-gray-400 mt-1">
                        {usage
                            ? `${usage.plan_type.charAt(0)}${usage.plan_type.slice(1).toLowerCase()} plan — allowances refresh on ${resetsOn}.`
                            : "Allowances refresh on the 1st of each month."}
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/10 bg-black/20 hover:bg-black/40 disabled:opacity-50 transition"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 mb-6 text-sm text-rose-200">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(usage?.buckets ?? []).map((bucket) => {
                    const Icon = ICONS[bucket.bucket];
                    const colour = tone(bucket.remaining, bucket.total, bucket.unlimited);
                    // An unlimited bucket has a real ceiling underneath, but
                    // showing a bar against a number we never advertise would
                    // invite questions about a limit that is not the product.
                    const percent = bucket.unlimited
                        ? 100
                        : bucket.total > 0
                          ? Math.round((bucket.remaining / bucket.total) * 100)
                          : 0;

                    return (
                        <div
                            key={bucket.bucket}
                            className="rounded-xl border border-white/10 bg-black/20 p-5 flex flex-col gap-4"
                        >
                            <div className="flex items-start gap-3">
                                <span className="rounded-lg bg-violet-500/15 text-violet-300 p-2">
                                    <Icon className="w-4 h-4" />
                                </span>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-medium leading-tight">{bucket.label}</h2>
                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                        {bucket.description}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <div className="flex items-baseline justify-between gap-2">
                                    <span className="text-3xl font-semibold tabular-nums">
                                        {bucket.unlimited ? "∞" : bucket.remaining}
                                    </span>
                                    <span className="text-xs text-gray-500 tabular-nums">
                                        {bucket.unlimited
                                            ? "unlimited"
                                            : `${bucket.used} of ${bucket.total} used`}
                                    </span>
                                </div>

                                <div className="h-1.5 rounded-full bg-white/10 mt-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${colour.bar} transition-all`}
                                        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                                    />
                                </div>

                                <p className={`text-xs mt-2 ${colour.text}`}>
                                    {bucket.unlimited
                                        ? "No limit on your plan"
                                        : bucket.remaining === 0
                                          ? `None left — refreshes ${resetsOn}`
                                          : `${percent}% remaining`}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {usage && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-5 mt-5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-violet-500/15 text-violet-300 p-2">
                            <Users className="w-4 h-4" />
                        </span>
                        <div>
                            <h2 className="text-sm font-medium">Master profiles</h2>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Saved profiles, not a monthly allowance — deleting one frees a slot.
                            </p>
                        </div>
                    </div>
                    <span className="text-sm tabular-nums text-gray-300">
                        {usage.profiles.used} of{" "}
                        {usage.profiles.unlimited ? "unlimited" : usage.profiles.total}
                    </span>
                </div>
            )}

            {usage && usage.plan_type !== "PREMIUM" && (
                <div className="rounded-xl border border-violet-500/25 bg-violet-500/10 p-5 mt-5 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h2 className="text-sm font-medium">Need more?</h2>
                        <p className="text-xs text-gray-400 mt-1">
                            Higher plans raise every allowance. Your keyword score, job tracker and
                            status updates stay free on every plan.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/billing"
                        className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition"
                    >
                        See plans
                        <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>
            )}

            {loading && !usage && (
                <p className="text-sm text-gray-500 mt-6">Loading your usage…</p>
            )}
        </div>
    );
}
