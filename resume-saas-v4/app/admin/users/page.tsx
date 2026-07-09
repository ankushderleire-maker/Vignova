"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/DataTable";
import { UserModal } from "@/components/admin/UserModal";
import { Search, Download, Eye } from "lucide-react";

interface User {
    id: string;
    email: string;
    fullName: string | null;
    role: string;
    status: string;
    createdAt: string;
    subscription: {
        plan_type: string;
        credits_remaining: number;
        credits_total: number;
        expires_at: string | null;
    } | null;
    counts: {
        resumes: number;
        jobs: number;
        payments: number;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1, limit: 20, total: 0, totalPages: 0,
    });
    const [search, setSearch] = useState("");
    const [planFilter, setPlanFilter] = useState("");
    const [roleFilter, setRoleFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const buildFilterParams = useCallback(() => {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (planFilter) params.set("plan", planFilter);
        if (roleFilter) params.set("role", roleFilter);
        if (statusFilter) params.set("status", statusFilter);
        return params;
    }, [search, planFilter, roleFilter, statusFilter]);

    const fetchUsers = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params = buildFilterParams();
            params.set("page", page.toString());
            params.set("limit", "20");

            const res = await fetch(`/api/admin/users?${params}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load users");
            setUsers(data.users);
            setPagination(data.pagination);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    }, [buildFilterParams]);

    // Debounce the text search; filters refetch immediately.
    useEffect(() => {
        const t = setTimeout(() => fetchUsers(1), search ? 400 : 0);
        return () => clearTimeout(t);
    }, [fetchUsers, search]);

    const handleSave = async (data: {
        role?: string;
        status?: string;
        plan_type?: string;
        credits_remaining?: number;
    }) => {
        if (!selectedUser) return;
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        const body = await res.json();
        if (!res.ok) {
            throw new Error(body.error || "Failed to save changes");
        }
        setSelectedUser(null);
        fetchUsers(pagination.page);
    };

    const handleDelete = async () => {
        if (!selectedUser) return;
        const res = await fetch(`/api/admin/users/${selectedUser.id}`, { method: "DELETE" });
        const body = await res.json();
        if (!res.ok) {
            setError(body.error || "Failed to delete user");
        }
        setSelectedUser(null);
        fetchUsers(1);
    };

    const handleExport = () => {
        const params = buildFilterParams();
        window.open(`/api/admin/users/export?${params}`, "_blank");
    };

    const planBadge = (plan: string | undefined) => {
        const colors: Record<string, string> = {
            FREE: "text-gray-400 bg-gray-400/10 border-gray-500/20",
            PRO: "text-green-400 bg-green-400/10 border-green-500/20",
            PREMIUM: "text-amber-400 bg-amber-400/10 border-amber-500/20",
        };
        const p = plan || "FREE";
        return (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${colors[p] || colors.FREE}`}>
                {p}
            </span>
        );
    };

    const statusBadge = (status: string) => (
        <span
            className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                status === "SUSPENDED"
                    ? "text-red-400 bg-red-400/10 border-red-500/20"
                    : "text-green-400 bg-green-400/10 border-green-500/20"
            }`}
        >
            {status || "ACTIVE"}
        </span>
    );

    const columns = [
        {
            key: "email",
            label: "User",
            render: (u: User) => (
                <div>
                    <p className="text-white font-medium">{u.fullName || "—"}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                </div>
            ),
        },
        {
            key: "status",
            label: "Status",
            render: (u: User) => statusBadge(u.status),
        },
        {
            key: "role",
            label: "Role",
            render: (u: User) => (
                <span className={`text-xs font-bold ${u.role === "ADMIN" ? "text-red-400" : "text-gray-400"}`}>
                    {u.role}
                </span>
            ),
        },
        {
            key: "plan",
            label: "Plan",
            render: (u: User) => planBadge(u.subscription?.plan_type),
        },
        {
            key: "credits",
            label: "Credits",
            render: (u: User) => (
                <span className="text-gray-300 text-xs">
                    {u.subscription?.credits_remaining ?? 0} / {u.subscription?.credits_total ?? 3}
                </span>
            ),
        },
        {
            key: "resumes",
            label: "Resumes",
            render: (u: User) => <span className="text-gray-300">{u.counts.resumes}</span>,
        },
        {
            key: "createdAt",
            label: "Joined",
            render: (u: User) => (
                <span className="text-gray-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>
            ),
        },
        {
            key: "detail",
            label: "",
            render: (u: User) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/admin/users/${u.id}`);
                    }}
                    title="View full detail"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Eye className="w-4 h-4" />
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-slide-down">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                <div className="relative flex-1 max-w-md w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                    >
                        <option value="">All Plans</option>
                        <option value="FREE">Free</option>
                        <option value="PRO">Pro</option>
                        <option value="PREMIUM">Premium</option>
                    </select>
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                    >
                        <option value="">All Roles</option>
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                    >
                        <option value="">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                    </select>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 bg-zinc-900 border border-white/10 rounded-lg hover:bg-zinc-800 hover:text-white transition-all"
                        title="Export current filter as CSV"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            {/* Table */}
            <DataTable
                columns={columns}
                data={users}
                isLoading={loading}
                onRowClick={(u) => setSelectedUser(u)}
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                    onPageChange: (p) => fetchUsers(p),
                }}
            />

            {/* Edit Modal */}
            {selectedUser && (
                <UserModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}
