"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

interface ChartDataPoint {
    date: string;
    signups: number;
    resumes: number;
    revenue: number;
}

export default function AdminAnalyticsPage() {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [days, setDays] = useState(30);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        fetch(`/api/admin/analytics?days=${days}`)
            .then((r) => r.json())
            .then((data) => setChartData(data.chartData || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [days]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
        );
    }

    const totals = chartData.reduce(
        (acc, d) => ({
            signups: acc.signups + d.signups,
            resumes: acc.resumes + d.resumes,
            revenue: acc.revenue + d.revenue,
        }),
        { signups: 0, resumes: 0, revenue: 0 }
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto animate-slide-down">
            {/* Period Selector */}
            <div className="flex items-center gap-3">
                {[7, 14, 30, 60, 90].map((d) => (
                    <button
                        key={d}
                        onClick={() => setDays(d)}
                        className={`px-4 py-2 text-sm rounded-lg border transition-all ${days === d
                            ? "bg-red-500/10 border-red-500/30 text-red-400 font-bold"
                            : "bg-zinc-900 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                            }`}
                    >
                        {d}d
                    </button>
                ))}
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase">Signups</p>
                    <p className="text-2xl font-bold text-green-400">{totals.signups}</p>
                </div>
                <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase">Resumes</p>
                    <p className="text-2xl font-bold text-blue-400">{totals.resumes}</p>
                </div>
                <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-500 uppercase">Revenue</p>
                    <p className="text-2xl font-bold text-amber-400">${totals.revenue.toFixed(2)}</p>
                </div>
            </div>

            {/* User Signups Chart */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">User Signups</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: "#6b7280", fontSize: 10 }}
                            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#18181b",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                        <Area type="monotone" dataKey="signups" stroke="#22c55e" fill="url(#signupGrad)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Resumes Chart */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Resume Generation</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="resumeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: "#6b7280", fontSize: 10 }}
                            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} allowDecimals={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#18181b",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                        />
                        <Area type="monotone" dataKey="resumes" stroke="#3b82f6" fill="url(#resumeGrad)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Revenue Chart */}
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Revenue ($)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: "#6b7280", fontSize: 10 }}
                            tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        />
                        <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#18181b",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                fontSize: "12px",
                            }}
                            formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, "Revenue"]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#f59e0b" fill="url(#revenueGrad)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
