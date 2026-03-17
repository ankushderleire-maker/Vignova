"use client";

import { useEffect, useState, useCallback } from "react";
import { DataTable } from "@/components/admin/DataTable";
import { Loader2 } from "lucide-react";

interface Payment {
    id: string;
    userEmail: string;
    userName: string | null;
    amount: number;
    currency: string;
    status: string;
    paymentMethod: string;
    transactionId: string;
    planType: string;
    billingCycle: string;
    createdAt: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1, limit: 20, total: 0, totalPages: 0,
    });
    const [statusFilter, setStatusFilter] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchPayments = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: "20" });
            if (statusFilter) params.set("status", statusFilter);

            const res = await fetch(`/api/admin/payments?${params}`);
            const data = await res.json();
            setPayments(data.payments);
            setPagination(data.pagination);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const statusBadge = (status: string) => {
        const c: Record<string, string> = {
            COMPLETED: "text-green-400 bg-green-400/10 border-green-500/20",
            PENDING: "text-amber-400 bg-amber-400/10 border-amber-500/20",
            FAILED: "text-red-400 bg-red-400/10 border-red-500/20",
        };
        return (
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${c[status] || "text-gray-400 bg-gray-400/10 border-gray-500/20"}`}>
                {status}
            </span>
        );
    };

    const columns = [
        {
            key: "user",
            label: "User",
            render: (p: Payment) => (
                <div>
                    <p className="text-white text-sm">{p.userName || "—"}</p>
                    <p className="text-xs text-gray-500">{p.userEmail}</p>
                </div>
            ),
        },
        {
            key: "amount",
            label: "Amount",
            render: (p: Payment) => (
                <span className="text-white font-medium">${p.amount.toFixed(2)} {p.currency}</span>
            ),
        },
        {
            key: "planType",
            label: "Plan",
            render: (p: Payment) => (
                <span className="text-gray-300 text-xs">{p.planType} • {p.billingCycle}</span>
            ),
        },
        {
            key: "status",
            label: "Status",
            render: (p: Payment) => statusBadge(p.status),
        },
        {
            key: "transactionId",
            label: "Transaction",
            render: (p: Payment) => (
                <span className="text-gray-500 text-xs font-mono">{p.transactionId.slice(0, 16)}...</span>
            ),
        },
        {
            key: "createdAt",
            label: "Date",
            render: (p: Payment) => (
                <span className="text-gray-400 text-xs">{new Date(p.createdAt).toLocaleDateString()}</span>
            ),
        },
    ];

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-slide-down">
            {/* Filter */}
            <div className="flex items-center gap-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50"
                >
                    <option value="">All Statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PENDING">Pending</option>
                    <option value="FAILED">Failed</option>
                </select>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={payments}
                isLoading={loading}
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.totalPages,
                    total: pagination.total,
                    onPageChange: (p) => fetchPayments(p),
                }}
            />
        </div>
    );
}
