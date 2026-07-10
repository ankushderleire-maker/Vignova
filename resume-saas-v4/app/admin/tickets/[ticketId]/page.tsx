"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, User, Shield, AlertCircle, Clock, CheckCircle } from "lucide-react";

export default function AdminTicketDetailsPage({ params }: { params: Promise<{ ticketId: string }> }) {
    const resolvedParams = use(params);
    const { ticketId } = resolvedParams;
    const router = useRouter();

    const [ticket, setTicket] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [reply, setReply] = useState("");
    const [isSending, setIsSending] = useState(false);
    
    // Admin Controls State
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTicket();
    }, [ticketId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [ticket?.messages]);

    const fetchTicket = async () => {
        try {
            const res = await fetch(`/api/admin/tickets/${ticketId}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error("Ticket not found");
                throw new Error("Failed to load ticket");
            }
            setTicket(await res.json());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reply.trim()) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: reply })
            });

            if (!res.ok) throw new Error("Failed to send reply");

            fetchTicket();
            setReply("");
        } catch (e: any) {
            console.error("Reply error", e);
            alert("Failed to send message: " + e.message);
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        setIsUpdatingStatus(true);
        try {
            const res = await fetch(`/api/admin/tickets/${ticketId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!res.ok) throw new Error("Failed to update status");
            
            fetchTicket();
        } catch (e: any) {
            alert("Status update failed: " + e.message);
        } finally {
            setIsUpdatingStatus(false);
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

    if (isLoading) {
        return (
            <div className="flex-1 flex justify-center items-center h-[calc(100vh-64px)] bg-zinc-950">
                <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-[calc(100vh-64px)] space-y-4 bg-zinc-950 text-white">
                <AlertCircle className="w-12 h-12 text-red-500 opacity-50" />
                <p className="font-medium">{error || "Ticket not found"}</p>
                <Link href="/admin/tickets" className="text-sm text-red-500 hover:underline">
                    Back to Tickets
                </Link>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-zinc-950 relative text-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-zinc-900 z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/admin/tickets" className="p-2 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold leading-tight">{ticket.subject}</h1>
                        <div className="flex items-center gap-3 mt-1 text-xs font-medium">
                            <span className="text-gray-400">User: {ticket.user?.full_name} ({ticket.user?.email})</span>
                            <span className="w-1 h-1 rounded-full bg-gray-600" />
                            <span className="text-gray-400">{ticket.category}</span>
                            <span className="w-1 h-1 rounded-full bg-gray-600" />
                            <span className={`px-2 py-0.5 rounded-full border ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace("_", " ")}
                            </span>
                        </div>
                    </div>
                </div>
                
                {/* Admin Status Controls */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 font-medium">Update Status:</span>
                    <select
                        value={ticket.status}
                        onChange={(e) => handleUpdateStatus(e.target.value)}
                        disabled={isUpdatingStatus}
                        className="bg-zinc-800 border border-white/10 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-red-500 disabled:opacity-50"
                    >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                    </select>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {ticket.messages.map((msg: any) => {
                    const isSystemOrAdmin = msg.isAdmin;
                    return (
                        <div key={msg.id} className={`flex gap-4 max-w-3xl ${isSystemOrAdmin ? "ml-auto flex-row-reverse" : ""}`}>
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                                isSystemOrAdmin 
                                    ? "bg-red-500/10 border-red-500/20 text-red-500" 
                                    : "bg-blue-500/10 border-blue-500/20 text-blue-500"
                            }`}>
                                {isSystemOrAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`space-y-1 ${isSystemOrAdmin ? "items-end flex flex-col" : ""}`}>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mx-1">
                                    <span className="font-semibold text-gray-300">
                                        {isSystemOrAdmin ? "You (Admin)" : ticket.user?.full_name}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                                </div>
                                <div className={`p-4 rounded-2xl whitespace-pre-wrap text-sm shadow-sm ${
                                    isSystemOrAdmin
                                        ? "bg-red-500/10 border border-red-500/20 text-white rounded-tr-sm"
                                        : "bg-zinc-800 border border-white/10 text-gray-200 rounded-tl-sm"
                                }`}>
                                    {msg.message}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-zinc-900 shrink-0">
                <form onSubmit={handleSendReply} className="max-w-4xl mx-auto flex items-end gap-3">
                    <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Type your reply to the user here..."
                        className="flex-1 bg-zinc-950 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-red-500 resize-none min-h-[44px] max-h-32 text-white"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendReply(e);
                            }
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!reply.trim() || isSending}
                        className="w-12 h-12 flex items-center justify-center bg-red-600 text-white rounded-xl hover:bg-red-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        {isSending ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Send className="w-5 h-5 -ml-0.5" />
                        )}
                    </button>
                </form>
                <div className="max-w-4xl mx-auto mt-2 flex justify-between items-center text-xs text-gray-500">
                    <p>
                        Press <kbd className="font-sans px-1 rounded bg-white/5">Enter</kbd> to send, <kbd className="font-sans px-1 rounded bg-white/5">Shift + Enter</kbd> for a new line.
                    </p>
                    <p>Replying to user will automatically set status to IN PROGRESS.</p>
                </div>
            </div>
        </div>
    );
}
