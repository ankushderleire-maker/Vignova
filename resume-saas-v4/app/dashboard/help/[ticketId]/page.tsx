"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, User, Shield, AlertCircle, Clock, CheckCircle } from "lucide-react";

export default function TicketDetailsPage({ params }: { params: Promise<{ ticketId: string }> }) {
    const resolvedParams = use(params);
    const { ticketId } = resolvedParams;
    const router = useRouter();

    const [ticket, setTicket] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [reply, setReply] = useState("");
    const [isSending, setIsSending] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTicket();
        markAsRead();
    }, [ticketId]);

    const markAsRead = async () => {
        try {
            await fetch(`/api/tickets/${ticketId}/read`, { method: "POST" });
        } catch (e) {
            console.error("Failed to mark ticket as read", e);
        }
    };

    useEffect(() => {
        // Auto scroll to bottom when new messages load
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [ticket?.messages]);

    const fetchTicket = async () => {
        try {
            const res = await fetch(`/api/tickets/${ticketId}`);
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
            const res = await fetch(`/api/tickets/${ticketId}/messages`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: reply })
            });

            if (!res.ok) throw new Error("Failed to send reply");

            const newMessage = await res.json();
            
            // Optimistically append the message
            // Note: we might want to just re-fetch to get the sender details populated correctly, 
            // but since we know it's the current user, we can fake it or re-fetch.
            fetchTicket();
            setReply("");
        } catch (e: any) {
            console.error("Reply error", e);
            alert("Failed to send message: " + e.message);
        } finally {
            setIsSending(false);
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
            <div className="flex-1 flex justify-center items-center h-full">
                <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !ticket) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center h-full space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 opacity-50" />
                <p className="text-[var(--foreground)] font-medium">{error || "Ticket not found"}</p>
                <Link href="/dashboard/help" className="text-sm text-[var(--primary)] hover:underline">
                    Back to Help Center
                </Link>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-64px)] bg-[var(--background)] relative">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)]/50 backdrop-blur-sm z-10 shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/help" className="p-2 -ml-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-[var(--foreground)] leading-tight">{ticket.subject}</h1>
                        <div className="flex items-center gap-3 mt-1 text-xs font-medium">
                            <span className="text-[var(--text-secondary)]">Ticket #{ticket.id.slice(-6).toUpperCase()}</span>
                            <span className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
                            <span className="text-[var(--text-secondary)]">{ticket.category}</span>
                            <span className="w-1 h-1 rounded-full bg-[var(--border-color)]" />
                            <span className={`px-2 py-0.5 rounded-full border ${getStatusColor(ticket.status)}`}>
                                {ticket.status.replace("_", " ")}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {ticket.messages.map((msg: any) => {
                    const isSystemOrAdmin = msg.isAdmin;
                    return (
                        <div key={msg.id} className={`flex gap-4 max-w-3xl ${isSystemOrAdmin ? "" : "ml-auto flex-row-reverse"}`}>
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                                isSystemOrAdmin 
                                    ? "bg-red-500/10 border-red-500/20 text-red-500" 
                                    : "bg-[var(--primary)]/10 border-[var(--primary)]/20 text-[var(--primary)]"
                            }`}>
                                {isSystemOrAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`space-y-1 ${isSystemOrAdmin ? "" : "items-end flex flex-col"}`}>
                                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mx-1">
                                    <span className="font-semibold text-[var(--foreground)]">
                                        {isSystemOrAdmin ? "Support Agent" : "You"}
                                    </span>
                                    <span>•</span>
                                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                                </div>
                                <div className={`p-4 rounded-2xl whitespace-pre-wrap text-sm shadow-sm ${
                                    isSystemOrAdmin
                                        ? "bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--foreground)] rounded-tl-sm"
                                        : "bg-[var(--primary)] text-white rounded-tr-sm"
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
            {ticket.status === 'CLOSED' ? (
                <div className="p-4 border-t border-[var(--border-color)] bg-[var(--sidebar-bg)] text-center text-sm text-[var(--text-secondary)] shrink-0">
                    This ticket has been closed. If you need further assistance, please open a new ticket.
                </div>
            ) : (
                <div className="p-4 border-t border-[var(--border-color)] bg-[var(--sidebar-bg)] shrink-0">
                    <form onSubmit={handleSendReply} className="max-w-4xl mx-auto flex items-end gap-3">
                        <textarea
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            placeholder="Type your reply here..."
                            className="flex-1 bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-3 text-sm focus:outline-none focus:border-[var(--primary)] resize-none min-h-[44px] max-h-32"
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
                            className="w-12 h-12 flex items-center justify-center bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary)]/90 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                        >
                            {isSending ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-5 h-5 -ml-0.5" />
                            )}
                        </button>
                    </form>
                    <p className="text-center text-xs text-[var(--text-secondary)] mt-2">
                        Press <kbd className="font-sans px-1 rounded bg-black/5 dark:bg-white/5">Enter</kbd> to send, <kbd className="font-sans px-1 rounded bg-black/5 dark:bg-white/5">Shift + Enter</kbd> for a new line.
                    </p>
                </div>
            )}
        </div>
    );
}
