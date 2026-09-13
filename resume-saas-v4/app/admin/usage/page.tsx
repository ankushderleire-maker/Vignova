"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Gauge, RefreshCw } from "lucide-react";

type BucketStat = {
    bucket: string;
    label: string;
    total_used: number;
    active_users: number;
    mean: number;
    p50: number;
    p90: number;
    max: number;
    exhausted_users: number;
};

type PlanStat = { plan_type: string; users: number; buckets: BucketStat[] };

type UsageReport = {
    period_start: string;
    resets_at: string;
    totals: {
        users: number;
        resumes_generated: number;
        interviews_generated: number;
        jobs_tracked: number;
    };
    by_plan: PlanStat[];
};

export default function AdminUsagePage() {
    const [report, setReport] = useState<UsageReport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/usage", { cache: "no-store" });
            if (!res.ok) throw new Error("Failed to load usage");
            setReport(await res.json());
            setError(null);
        } catch (err: any) {
            setError(err?.message || "Failed to load usage");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const since = report
        ? new Date(report.period_start).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
          })
        : "";

    return (
        <div className="p-8 max-w-6xl mx-auto text-white">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                <div>
                    <h1 className="text-2xl font-semibold flex items-center gap-2">
                        <Gauge className="w-5 h-5 text-violet-400" />
                        Usage &amp; allowances
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        What each plan is actually consuming since {since}. Use this to set the
                        allowances on the Plans page — a cap nobody reaches drives no upgrades, and
                        one everybody hits reads as a paywall.
                    </p>
                </div>
                <button
                    onClick={load}
                    disabled={loading}
                    className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-white/10 bg-black/20 hover:bg-black/40 disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 my-6 text-sm text-rose-200">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {report && (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
                        {[
                            ["Accounts", report.totals.users],
                            ["Resumes generated", report.totals.resumes_generated],
                            ["Interviews generated", report.totals.interviews_generated],
                            ["Jobs tracked", report.totals.jobs_tracked],
                        ].map(([label, value]) => (
                            <div
                                key={String(label)}
                                className="rounded-xl border border-white/10 bg-black/20 p-4"
                            >
                                <p className="text-xs text-gray-500">{label}</p>
                                <p className="text-2xl font-semibold tabular-nums mt-1">{value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-6">
                        {report.by_plan.map((plan) => (
                            <div
                                key={plan.plan_type}
                                className="rounded-xl border border-white/10 bg-black/20 overflow-hidden"
                            >
                                <div className="flex items-baseline justify-between gap-3 px-5 py-3 border-b border-white/10">
                                    <h2 className="font-medium">{plan.plan_type}</h2>
                                    <span className="text-xs text-gray-500 tabular-nums">
                                        {plan.users} account{plan.users === 1 ? "" : "s"}
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm min-w-[640px]">
                                        <thead>
                                            <tr className="text-gray-500 text-xs">
                                                <th className="text-left font-normal px-5 py-2">
                                                    Bucket
                                                </th>
                                                <th className="text-right font-normal px-3 py-2">
                                                    Used
                                                </th>
                                                <th className="text-right font-normal px-3 py-2">
                                                    Active
                                                </th>
                                                <th className="text-right font-normal px-3 py-2">
                                                    Mean
                                                </th>
                                                <th className="text-right font-normal px-3 py-2">
                                                    Median
                                                </th>
                                                {/* The number that should set the cap: covering the
                                                    90th percentile leaves the heaviest users to
                                                    upgrade rather than everyone. */}
                                                <th className="text-right font-normal px-3 py-2 text-violet-300">
                                                    p90
                                                </th>
                                                <th className="text-right font-normal px-3 py-2">
                                                    Max
                                                </th>
                                                <th className="text-right font-normal px-5 py-2">
                                                    Ran out
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {plan.buckets.map((b) => (
                                                <tr
                                                    key={b.bucket}
                                                    className="border-t border-white/5 tabular-nums"
                                                >
                                                    <td className="px-5 py-2.5 text-gray-300">
                                                        {b.label}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right">
                                                        {b.total_used}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-gray-400">
                                                        {b.active_users}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-gray-400">
                                                        {b.mean}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-gray-400">
                                                        {b.p50}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-violet-300 font-medium">
                                                        {b.p90}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-right text-gray-400">
                                                        {b.max}
                                                    </td>
                                                    <td
                                                        className={`px-5 py-2.5 text-right ${b.exhausted_users > 0 ? "text-amber-300" : "text-gray-600"}`}
                                                    >
                                                        {b.exhausted_users}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-gray-600 mt-6 leading-relaxed">
                        Figures cover the current period only, so early in the month they read low.
                        &ldquo;Ran out&rdquo; counts accounts sitting at zero in that bucket — the
                        only direct evidence a cap is binding on anyone.
                    </p>
                </>
            )}

            {loading && !report && <p className="text-sm text-gray-500 mt-6">Loading…</p>}
        </div>
    );
}
