"use client";

import { useState, useEffect } from "react";
import { Plus, Search, HelpCircle, FileText, ChevronDown, ChevronUp, MessageSquare, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Placeholder FAQs
const FAQS = [
    {
        question: "How do I upgrade my plan?",
        answer: "You can upgrade your plan by visiting the Billing page in your dashboard and selecting a new plan. Your credits will be prorated automatically."
    },
    {
        question: "How does the ATS Score work?",
        answer: "Our ATS scanner analyzes your resume against the provided Job Description using semantic matching and keyword extraction, simulating how an actual ATS processes your application."
    },
    {
        question: "What happens if I run out of AI credits?",
        answer: "If you run out of credits, you can either upgrade to a higher tier plan or wait until your billing cycle resets. Free tier users get 1 free credit initially."
    },
    {
        question: "Can I download my resume as a PDF?",
        answer: "Yes, you can generate and download your resume as a perfectly formatted PDF directly from the Resumes tab."
    }
];

export default function HelpCenterPage() {
    const router = useRouter();
    const [tickets, setTickets] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

    // New Ticket Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState("GENERAL");
    const [priority, setPriority] = useState("NORMAL");
    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await fetch("/api/tickets");
            if (res.ok) {
                setTickets(await res.json());
            }
        } catch (e) {
            console.error("Failed to fetch tickets", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);
        try {
            const res = await fetch("/api/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject, category, priority, message })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create ticket");
            }

            const newTicket = await res.json();
            setTickets([newTicket, ...tickets]);
            setIsModalOpen(false);
            setSubject("");
            setMessage("");
            setCategory("GENERAL");
            setPriority("NORMAL");
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSubmitting(false);
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
            case 'OPEN': return <AlertCircle className="w-3 h-3" />;
            case 'IN_PROGRESS': return <Clock className="w-3 h-3" />;
            case 'RESOLVED': return <CheckCircle className="w-3 h-3" />;
            case 'CLOSED': return <CheckCircle className="w-3 h-3" />;
            default: return <AlertCircle className="w-3 h-3" />;
        }
    };

    const filteredFaqs = FAQS.filter(f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-[var(--background)] overflow-y-auto">
            <div className="max-w-5xl mx-auto w-full p-6 space-y-10 py-10">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-sm font-medium border border-[var(--primary)]/20">
                            <HelpCircle className="w-4 h-4" />
                            Help Center
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] tracking-tight">
                            How can we help you?
                        </h1>
                        <p className="text-[var(--text-secondary)] text-lg max-w-xl">
                            Search our FAQs or raise a support ticket if you need further assistance.
                        </p>
                    </div>
                    
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white font-medium rounded-xl hover:bg-[var(--primary)]/90 transition shadow-lg shadow-[var(--primary)]/20"
                    >
                        <Plus className="w-5 h-5" />
                        Raise a Ticket
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left Column: FAQs */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                            <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[var(--primary)]" />
                                Frequently Asked Questions
                            </h2>
                        </div>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search for answers..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                            />
                        </div>

                        <div className="space-y-3">
                            {filteredFaqs.length === 0 ? (
                                <div className="text-center py-8 text-[var(--text-secondary)]">
                                    No FAQs found for your search.
                                </div>
                            ) : (
                                filteredFaqs.map((faq, i) => (
                                    <div key={i} className="border border-[var(--border-color)] rounded-xl bg-[var(--sidebar-bg)] overflow-hidden transition-all duration-200">
                                        <button
                                            onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                                            className="w-full flex items-center justify-between p-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                        >
                                            <span className="font-medium text-[var(--foreground)] pr-4">{faq.question}</span>
                                            {expandedFaq === i ? (
                                                <ChevronUp className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-[var(--text-secondary)] flex-shrink-0" />
                                            )}
                                        </button>
                                        {expandedFaq === i && (
                                            <div className="p-4 pt-0 text-[var(--text-secondary)] text-sm leading-relaxed border-t border-[var(--border-color)] bg-black/5 dark:bg-white/5">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: User's Tickets */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                            <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-[var(--primary)]" />
                                My Tickets
                            </h2>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-10">
                                <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : tickets.length === 0 ? (
                            <div className="text-center py-12 px-4 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--sidebar-bg)]">
                                <MessageSquare className="w-8 h-8 text-gray-400 mx-auto mb-3 opacity-50" />
                                <p className="text-[var(--foreground)] font-medium mb-1">No tickets yet</p>
                                <p className="text-sm text-[var(--text-secondary)] mb-4">You haven't raised any support tickets.</p>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="text-sm font-medium text-[var(--primary)] hover:underline"
                                >
                                    Raise your first ticket
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {tickets.map(ticket => (
                                    <Link 
                                        key={ticket.id} 
                                        href={`/dashboard/help/${ticket.id}`}
                                        className="block border border-[var(--border-color)] rounded-xl p-4 bg-[var(--sidebar-bg)] hover:border-[var(--primary)]/50 transition-colors group relative"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h3 className="font-medium text-sm text-[var(--foreground)] line-clamp-2 pr-4">{ticket.subject}</h3>
                                            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border flex-shrink-0 ${getStatusColor(ticket.status)}`}>
                                                {getStatusIcon(ticket.status)}
                                                {ticket.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-3 text-xs text-[var(--text-secondary)]">
                                            <span className="flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--border-color)]" />
                                                {ticket.category}
                                            </span>
                                            <span>
                                                {new Date(ticket.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        {ticket.messages && ticket.messages.length > 0 && (
                                             <div className="absolute -top-2 -right-2 w-5 h-5 bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-lg border border-[var(--sidebar-bg)]">
                                                {ticket.messages.length}
                                            </div>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                </div>

            </div>

            {/* New Ticket Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between bg-black/5 dark:bg-white/5">
                            <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[var(--primary)]" />
                                Raise a Ticket
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-[var(--foreground)] transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleCreateTicket} className="p-6 space-y-5">
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--foreground)]">Subject</label>
                                <input
                                    required
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                                    placeholder="Brief summary of your issue..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--foreground)]">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                                    >
                                        <option value="GENERAL">General Inquiry</option>
                                        <option value="TECHNICAL">Technical Support</option>
                                        <option value="BILLING">Billing & Plans</option>
                                        <option value="BUG">Report a Bug</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-[var(--foreground)]">Priority</label>
                                    <select
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                                    >
                                        <option value="LOW">Low</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="HIGH">High</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[var(--foreground)]">Message</label>
                                <textarea
                                    required
                                    rows={5}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full bg-[var(--background)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
                                    placeholder="Please describe your issue in detail..."
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !subject || !message}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--primary)] text-white font-medium rounded-xl hover:bg-[var(--primary)]/90 transition shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Submit Ticket</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
