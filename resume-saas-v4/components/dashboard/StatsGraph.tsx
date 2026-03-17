// components/dashboard/StatsGraph.tsx
"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import styles from "./DashboardCard.module.css";

interface StatsGraphProps {
    data: Array<{ date: string; total: number; manual: number; extension: number }>;
    period: "day" | "week" | "month";
    onPeriodChange: (period: "day" | "week" | "month") => void;
}

export function StatsGraph({ data, period, onPeriodChange }: StatsGraphProps) {
    const periods = [
        { value: "day", label: "Days" },
        { value: "week", label: "Weeks" },
        { value: "month", label: "Months" },
    ];

    const formatXAxis = (value: string) => {
        if (period === "day") {
            const date = new Date(value);
            return date.getDate().toString().padStart(2, "0");
        }
        return value;
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg p-3 shadow-xl">
                    <p className="text-[var(--text-secondary)] text-xs mb-2">{data.date}</p>
                    <div className="space-y-1">
                        <p className="text-[var(--foreground)] font-bold">Total: {data.total}</p>
                        {data.manual > 0 && <p className="text-blue-500 text-sm">Manual: {data.manual}</p>}
                        {data.extension > 0 && <p className="text-purple-500 text-sm">Extension: {data.extension}</p>}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={styles.cardWrapper} style={{ "--border-color": "var(--primary)" } as React.CSSProperties}>
            <div className={styles.innerCard}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">Daily Statistics</h2>
                        <p className="text-[var(--text-secondary)] text-sm">Resume generation activity</p>
                    </div>

                    {/* Period Selector */}
                    <div className="flex bg-[var(--sidebar-bg)] rounded-lg p-1 gap-1 border border-[var(--border-color)] shadow-sm">
                        {periods.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => onPeriodChange(p.value as any)}
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${period === p.value
                                    ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                                    : "text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chart */}
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />

                            <XAxis
                                dataKey="date"
                                tickFormatter={formatXAxis}
                                stroke="var(--border-color)"
                                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                            />

                            <YAxis
                                stroke="var(--border-color)"
                                tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />

                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} />

                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="var(--primary)"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorTotal)"
                                animationDuration={1500}
                                animationEasing="ease-in-out"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
