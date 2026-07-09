"use client";

import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/admin/DataTable";
import { Search, ScrollText } from "lucide-react";

interface AuditLog {
    id: string;
    adminId: string | null;
    adminEmail: string | null;
    action: string;
    targetType: string | null;
    targetId: string | null;
    details: Record<string, unknown> | null;
    ip: string | null;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

const ACTION_COLORS: Record<string, string> = {
    USER_DELETE: "text-red-400 bg-red-400/10 border-red-500/20",
    USER_UPDATE: "text-blue-400 bg-blue-400/10 border-blue-500/20",
    USER_PASSWORD_RESET_SENT: "text-purple-400 bg-purple-400/10 border-purple-500/20",
    PLAN_UPDATE: "text-amber-400 bg-amber-400/10 border-amber-500/20",
    PLANS_SEED: "text-amber-400 bg-amber-400/10 border-amber-500/20",
    EXCHANGE_RATE_UPDATE: "text-green-400 bg-green-400/10 border-green-500/20",
    USERS_EXPORT: "text-cyan-400 bg-cyan-400/10 border-cyan-500/20",
    PAYMENTS_EXPORT: "text-cyan-400 bg-cyan-400/10 border-cyan-500/20",
};

export default function AdminAuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [actions, setActions] = useState<string[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1, limit: 25, total: 0, totalPages: 0,
    });
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchLogs = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: "25" });
            if (search) params.set("search", search);
            if (actionFilter) params.set("action", actionFilter);

            const res = await fetch(`/api/admin/audit-logs?${params}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load audit logs");
            setLogs(data.logs);
            setActions(data.actions || []);
            setPagination(data.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    }, [search, actionFilter]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const actionBadge = (action: string) => (
        <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded border whitespace-nowrap ${
                ACTION_COLORS[action] || "text-gray-400 bg-gray-400/10 border-gray-500/20"
            }`}
        >
            {action}
        </span>
    );

    const columns = [
        {
            key: "createdAt",
            label: "When",
            render: (l: AuditLog) => (
                <span className="text-gray-400 text-xs whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                </span>
            ),
        },
        {
            key: "adminEmail",
            label: "Admin",
            render: (l: AuditLog) => (
                <span className="text-white text-xs">{l.adminEmail || "—"}</span>
            ),
        },
        {
            key: "action",
            label: "Action",
            render: (l: AuditLog) => actionBadge(l.action),
        },
        {
            key: "target",
            label: "Target",
            render: (l: AuditLog) => (
                <div className="text-xs">
                    <span className="text-gray-400">{l.targetType || "—"}</span>
                    {l.targetId && (
                        <p className="text-gray-500 font-mono text-[10px] max-w-[180px] truncate">{l.targetId}</p>
                    )}
                </div>
            ),
        },
        {
            key: "details",
            label: "Details",
            render: (l: AuditLog) =>
                l.details ? (
                    <pre
                        className={`text-[10px] text-gray-400 font-mono max-w-md whitespace-pre-wrap break-all ${
                            expandedId === l.id ? "" : "max-h-10 overflow-hidden"
                        }`}
                    >
                        {JSON.stringify(l.details, null, expandedId === l.id ? 2 : 0)}
                    </pre>
                ) : (
                    <span className="text-gray-600 text-xs">—</span>
                ),
        },
        {
            key: "ip",
            label: "IP",
            render: (l: AuditLog) => (
                <span className="text-gray-500 text-xs font-mono">{l.ip || "—"}</span>
            ),
        },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-slide-down">
            {/* Info */}
            <div className="flex items-center gap-3 text-sm text-gray-400 bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-3">
                <ScrollText className="w-4 h-4 text-red-400 flex-shrink-0" />
                Every admin mutation (user edits, deletions, plan changes, settings, exports) is recorded here permanently.
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by admin email, target, or details..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                    />
                </div>
                <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                >
                    <option value="">All Actions</option>
                    {actions.map((a) => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {/* Table */}
            <DataTable
                columns={columns}
                data={logs}
                isLoading={loading}
                onRowClick={(l) => setExpandedId(expandedId === l.id ? null : l.id)}
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                    onPageChange: (p) => fetchLogs(p),
                }}
            />
        </div>
    );
}
