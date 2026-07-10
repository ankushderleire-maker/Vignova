"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LifeBuoy, Search, AlertCircle, Clock, CheckCircle, ArrowRight, User } from "lucide-react";

export default function AdminTicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await fetch("/api/admin/tickets");
            if (res.ok) {
                setTickets(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch tickets", e);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return "bg-blue-500/10 text-blue-500 border-blue-500/20";
            case 'IN_PROGRESS': return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
            case 'RESOLVED': return "bg-green-500/10 text-green-500 border-green-500/20";
            case 'CLOSED': return "bg-gray-500/10 text-gray-500 border-gray-500/20";
            default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'OPEN': return <AlertCircle className="w-3.5 h-3.5" />;
            case 'IN_PROGRESS': return <Clock className="w-3.5 h-3.5" />;
            case 'RESOLVED': return <CheckCircle className="w-3.5 h-3.5" />;
            case 'CLOSED': return <CheckCircle className="w-3.5 h-3.5" />;
            default: return <AlertCircle className="w-3.5 h-3.5" />;
        }
    };
    
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH': return "text-red-500";
            case 'NORMAL': return "text-yellow-500";
            case 'LOW': return "text-green-500";
            default: return "text-gray-500";
        }
    }

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              ticket.user?.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === "ALL" || ticket.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 space-y-6 bg-zinc-950 min-h-[calc(100vh-64px)] text-white">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <LifeBuoy className="w-6 h-6 text-red-500" />
                        Support Tickets
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Manage and respond to user inquiries.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by subject or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-red-500 transition-colors"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-zinc-900 border border-white/10 rounded-lg py-2 px-4 text-sm focus:outline-none focus:border-red-500 transition-colors"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                </select>
            </div>

            {/* Tickets Table */}
            <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white/5 border-b border-white/10 text-gray-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">Ticket Details</th>
                                <th className="px-6 py-4 font-medium">User</th>
                                <th className="px-6 py-4 font-medium">Status & Priority</th>
                                <th className="px-6 py-4 font-medium">Activity</th>
                                <th className="px-6 py-4 font-medium text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex justify-center mb-2">
                                            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                        </div>
                                        Loading tickets...
                                    </td>
                                </tr>
                            ) : filteredTickets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        No tickets found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredTickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-200 line-clamp-1">{ticket.subject}</div>
                                            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                <span>#{ticket.id.slice(-6).toUpperCase()}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-600" />
                                                <span>{ticket.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                                                    <User className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-300 text-xs truncate max-w-[150px]">{ticket.user?.full_name || 'Unknown'}</div>
                                                    <div className="text-[10px] text-gray-500 truncate max-w-[150px]">{ticket.user?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                                                    {getStatusIcon(ticket.status)}
                                                    {ticket.status.replace("_", " ")}
                                                </span>
                                                <span className={`text-[10px] font-bold tracking-wider ${getPriorityColor(ticket.priority)}`}>
                                                    {ticket.priority} PRIORITY
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs text-gray-400">
                                                Last active: {new Date(ticket.updatedAt).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {ticket._count?.messages || 0} messages
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/admin/tickets/${ticket.id}`}
                                                className="inline-flex items-center justify-center p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                            >
                                                <ArrowRight className="w-5 h-5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
