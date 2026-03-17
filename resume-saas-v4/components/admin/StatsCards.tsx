"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: string;
    subtitle?: string;
}

export function AdminStatCard({ title, value, icon: Icon, color, subtitle }: StatCardProps) {
    return (
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl p-6 hover:border-white/20 transition-all duration-300 group">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-sm text-gray-400">{title}</p>
                    <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
                    {subtitle && (
                        <p className="text-xs text-gray-500">{subtitle}</p>
                    )}
                </div>
                <div
                    className="p-3 rounded-xl opacity-80 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: `${color}15` }}
                >
                    <Icon className="w-6 h-6" style={{ color }} />
                </div>
            </div>
        </div>
    );
}
