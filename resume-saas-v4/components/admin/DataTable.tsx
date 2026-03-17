"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Column<T> {
    key: string;
    label: string;
    render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    pagination?: {
        page: number;
        totalPages: number;
        total: number;
        onPageChange: (page: number) => void;
    };
    onRowClick?: (item: T) => void;
    isLoading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
    columns,
    data,
    pagination,
    onRowClick,
    isLoading,
}: DataTableProps<T>) {
    if (isLoading) {
        return (
            <div className="bg-zinc-900/80 border border-white/10 rounded-xl overflow-hidden">
                <div className="p-12 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900/80 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-white/10 bg-zinc-950/50">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500">
                                    No data found
                                </td>
                            </tr>
                        ) : (
                            data.map((item, idx) => (
                                <tr
                                    key={idx}
                                    onClick={() => onRowClick?.(item)}
                                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${onRowClick ? "cursor-pointer" : ""
                                        }`}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-6 py-4 text-gray-300 whitespace-nowrap">
                                            {col.render
                                                ? col.render(item)
                                                : String(item[col.key] ?? "")}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-zinc-950/30">
                    <span className="text-xs text-gray-500">
                        Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => pagination.onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => pagination.onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
