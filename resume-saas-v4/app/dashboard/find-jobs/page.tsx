"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Search,
    MapPin,
    Briefcase,
    ExternalLink,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Building2,
    Calendar,
    SearchX,
    Bookmark,
    BookmarkCheck,
    Zap,
    Check,
} from "lucide-react";

type Job = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    description: string | null;
    apply_url: string | null;
    source: string | null;
    date_posted: string | null;
};

type ApiResponse = {
    jobs: Job[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

export default function FindJobsPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [location, setLocation] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const LIMIT = 20;

    // Track saved/saving state per job
    const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
    const [savingJobs, setSavingJobs] = useState<Set<string>>(new Set());
    const [tailoringJob, setTailoringJob] = useState<string | null>(null);

    // Debounce search
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [debouncedLocation, setDebouncedLocation] = useState("");

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setDebouncedLocation(location);
            setPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search, location]);

    const fetchJobs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (debouncedSearch) params.set("search", debouncedSearch);
            if (debouncedLocation) params.set("location", debouncedLocation);
            params.set("page", String(page));
            params.set("limit", String(LIMIT));

            const res = await fetch(`/api/find-jobs?${params.toString()}`);
            const data: ApiResponse = await res.json();

            setJobs(data.jobs || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 0);
        } catch (err) {
            console.error("Failed to fetch jobs:", err);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, debouncedLocation, page]);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // ── Save job to Job Tracker ──────────────────────────────────────
    const saveToTracker = async (job: Job) => {
        if (savedJobs.has(job.id) || savingJobs.has(job.id)) return;

        setSavingJobs((prev) => new Set(prev).add(job.id));
        try {
            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company: job.company,
                    jobTitle: job.title,
                    description: job.description || "",
                    jobUrl: job.apply_url || "",
                    location: job.location || "",
                }),
            });

            if (res.ok) {
                setSavedJobs((prev) => new Set(prev).add(job.id));
            }
        } catch (err) {
            console.error("Failed to save job:", err);
        } finally {
            setSavingJobs((prev) => {
                const next = new Set(prev);
                next.delete(job.id);
                return next;
            });
        }
    };

    // ── Tailor Resume: save then navigate to generator ───────────────
    const tailorResume = async (job: Job) => {
        setTailoringJob(job.id);
        try {
            // Save the job first (if not already saved)
            if (!savedJobs.has(job.id)) {
                const res = await fetch("/api/jobs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        company: job.company,
                        jobTitle: job.title,
                        description: job.description || "",
                        jobUrl: job.apply_url || "",
                        location: job.location || "",
                    }),
                });

                if (res.ok) {
                    setSavedJobs((prev) => new Set(prev).add(job.id));
                }
            }

            // Navigate to generator page
            router.push("/dashboard/generator");
        } catch (err) {
            console.error("Failed to tailor resume:", err);
        } finally {
            setTailoringJob(null);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "Recently";
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const getSourceBadge = (source: string | null) => {
        if (!source) return null;
        const colors: Record<string, string> = {
            lever: "bg-purple-500/10 text-purple-400 border-purple-500/20",
            greenhouse: "bg-green-500/10 text-green-400 border-green-500/20",
        };
        return colors[source] || "bg-gray-500/10 text-gray-400 border-gray-500/20";
    };

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6 animate-slide-down">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-[var(--primary)]" />
                        Find Jobs
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                        {total > 0 ? `${total.toLocaleString()} jobs available` : "Browse open positions"}
                    </p>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        placeholder="Search by title or company..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all"
                    />
                </div>
                <div className="relative sm:w-64">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        placeholder="Filter by location..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 transition-all"
                    />
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="w-7 h-7 animate-spin text-[var(--primary)]" />
                    <span className="text-sm text-[var(--text-secondary)]">Searching jobs...</span>
                </div>
            )}

            {/* Empty State */}
            {!loading && jobs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="p-4 rounded-2xl bg-[var(--sidebar-bg)] border border-[var(--border-color)]">
                        <SearchX className="w-10 h-10 text-[var(--text-secondary)]/40" />
                    </div>
                    <div className="text-center">
                        <p className="text-[var(--foreground)] font-semibold mb-1">No jobs found</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                            {debouncedSearch || debouncedLocation
                                ? "Try adjusting your search or filters"
                                : "Jobs will appear here once the data pipeline runs"}
                        </p>
                    </div>
                </div>
            )}

            {/* Job Cards */}
            {!loading && jobs.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {jobs.map((job) => {
                        const isSaved = savedJobs.has(job.id);
                        const isSaving = savingJobs.has(job.id);
                        const isTailoring = tailoringJob === job.id;

                        return (
                            <div
                                key={job.id}
                                className="group bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-5 hover:border-[var(--primary)]/30 hover:shadow-lg hover:shadow-[var(--primary)]/5 transition-all duration-300 flex flex-col"
                            >
                                {/* Top row: Source badge + Date */}
                                <div className="flex items-center justify-between mb-3">
                                    {job.source && (
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getSourceBadge(job.source)}`}>
                                            {job.source}
                                        </span>
                                    )}
                                    <span className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 ml-auto">
                                        <Calendar className="w-3 h-3" />
                                        {formatDate(job.date_posted)}
                                    </span>
                                </div>

                                {/* Title */}
                                <h3 className="font-semibold text-[var(--foreground)] text-sm leading-snug mb-2 line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                                    {job.title}
                                </h3>

                                {/* Company + Location */}
                                <div className="flex flex-col gap-1.5 mb-4">
                                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs">
                                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                                        <span className="truncate">{job.company}</span>
                                    </div>
                                    {job.location && (
                                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs">
                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                            <span className="truncate">{job.location}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="mt-auto flex flex-col gap-2">
                                    {/* Apply Button */}
                                    {job.apply_url ? (
                                        <a
                                            href={job.apply_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--background)] text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity w-full justify-center"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                            Apply Now
                                        </a>
                                    ) : (
                                        <button
                                            disabled
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--border-color)] text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wider w-full justify-center cursor-not-allowed opacity-50"
                                        >
                                            No Link Available
                                        </button>
                                    )}

                                    {/* Save + Tailor Row */}
                                    <div className="flex gap-2">
                                        {/* Save to Tracker */}
                                        <button
                                            onClick={() => saveToTracker(job)}
                                            disabled={isSaved || isSaving}
                                            className={`flex-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all justify-center border ${isSaved
                                                ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20 cursor-default"
                                                : "bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                                                } disabled:opacity-70`}
                                        >
                                            {isSaving ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : isSaved ? (
                                                <Check className="w-3.5 h-3.5" />
                                            ) : (
                                                <Bookmark className="w-3.5 h-3.5" />
                                            )}
                                            {isSaved ? "Saved" : isSaving ? "Saving..." : "Save"}
                                        </button>

                                        {/* Tailor Resume */}
                                        <button
                                            onClick={() => tailorResume(job)}
                                            disabled={isTailoring}
                                            className="flex-1 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all justify-center border bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-purple-500/40 hover:text-purple-400 disabled:opacity-70"
                                        >
                                            {isTailoring ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Zap className="w-3.5 h-3.5" />
                                            )}
                                            {isTailoring ? "Saving..." : "Tailor CV"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 pb-4">
                    <p className="text-xs text-[var(--text-secondary)]">
                        Page {page} of {totalPages} · {total.toLocaleString()} results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)] hover:border-[var(--primary)]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === pageNum
                                            ? "bg-[var(--primary)] text-[var(--background)]"
                                            : "bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--primary)]/30"
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="p-2 rounded-lg border border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)] hover:border-[var(--primary)]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
