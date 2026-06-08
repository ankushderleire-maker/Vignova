"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Bookmark,
    BookmarkCheck,
    Briefcase,
    Building2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Database,
    ExternalLink,
    Loader2,
    MapPin,
    RefreshCw,
    Search,
    SearchX,
    Sparkles,
} from "lucide-react";

type Job = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    description: string | null;
    apply_url: string | null;
    source: string | null;
    source_type: string | null;
    source_label: string | null;
    date_posted: string | null;
    experience_level: string | null;
    scraped_at: string | null;
};

type ApiResponse = {
    jobs: Job[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

const EXPERIENCE_OPTIONS = [
    { value: "", label: "All experience" },
    { value: "fresher", label: "Fresher" },
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
];

const DATE_OPTIONS = [
    { value: "0", label: "Any time" },
    { value: "1", label: "Last 24h" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
];

const SOURCE_BADGES: Record<string, string> = {
    greenhouse: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    lever: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
    ashby: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    workable: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    recruitee: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    smartrecruiters: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    teamtailor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    bamboohr: "bg-lime-500/10 text-lime-400 border-lime-500/20",
    zoho_recruit: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    freshteam: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    darwinbox: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    keka_hr: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    linkedin: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    indeed: "bg-blue-600/10 text-blue-500 border-blue-500/20",
};

function formatRelativeDate(dateStr: string | null, fallback: string | null) {
    const source = dateStr || fallback;
    if (!source) return "Recently";

    const date = new Date(source);
    if (Number.isNaN(date.getTime())) return "Recently";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function prettyToken(value: string | null | undefined) {
    if (!value) return "Unknown";
    return value.replace(/_/g, " ");
}

export default function FindJobsPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [titleFilter, setTitleFilter] = useState("");
    const [locationFilter, setLocationFilter] = useState("");
    const [experienceFilter, setExperienceFilter] = useState("");
    const [daysFilter, setDaysFilter] = useState("0");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
    const [savingJobs, setSavingJobs] = useState<Set<string>>(new Set());
    const [tailoringJob, setTailoringJob] = useState<string | null>(null);

    const deferredTitle = useDeferredValue(titleFilter);
    const deferredLocation = useDeferredValue(locationFilter);
    const limit = 18;

    useEffect(() => {
        setPage(1);
    }, [deferredTitle, deferredLocation, experienceFilter, daysFilter]);

    async function fetchJobs() {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                days: daysFilter,
            });

            if (deferredTitle.trim()) params.set("title", deferredTitle.trim());
            if (deferredLocation.trim()) params.set("location", deferredLocation.trim());
            if (experienceFilter) params.set("experience", experienceFilter);

            const response = await fetch(`/api/find-jobs?${params.toString()}`, {
                cache: "no-store",
            });
            const data = (await response.json()) as ApiResponse & { error?: string };

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch jobs");
            }

            setJobs(data.jobs || []);
            setTotal(data.total || 0);
            setTotalPages(data.totalPages || 0);
        } catch (fetchError) {
            console.error(fetchError);
            setJobs([]);
            setTotal(0);
            setTotalPages(0);
            setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch jobs");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchJobs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, deferredTitle, deferredLocation, experienceFilter, daysFilter]);

    let atsOnPage = 0;
    let communityOnPage = 0;
    for (const job of jobs) {
        if ((job.source || "").toUpperCase() === "ATS") atsOnPage += 1;
        if (job.source === "linkedin" || job.source === "indeed") communityOnPage += 1;
    }

    async function saveToTracker(job: Job) {
        if (savedJobs.has(job.id) || savingJobs.has(job.id)) return;

        setSavingJobs((previous) => new Set(previous).add(job.id));
        try {
            const response = await fetch("/api/jobs", {
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

            if (response.ok) {
                setSavedJobs((previous) => new Set(previous).add(job.id));
            }
        } catch (saveError) {
            console.error("Failed to save job", saveError);
        } finally {
            setSavingJobs((previous) => {
                const next = new Set(previous);
                next.delete(job.id);
                return next;
            });
        }
    }

    async function tailorResume(job: Job) {
        setTailoringJob(job.id);
        try {
            if (!savedJobs.has(job.id)) {
                await saveToTracker(job);
            }
            router.push("/dashboard/generator");
        } finally {
            setTailoringJob(null);
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-slide-down">
            <section className="rounded-3xl border border-[var(--border-color)] bg-[linear-gradient(135deg,rgba(34,197,94,0.08),rgba(59,130,246,0.06),transparent_70%)] p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                            <Database className="h-3.5 w-3.5" />
                            Global Job Board
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--foreground)]">
                                Your job board to apply globally
                            </h2>
                            <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
                                Browse fresh openings from top companies and LinkedIn and Indeed in one place.
                                Filter by role, location, and experience to find the job that fits you best.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[300px]">
                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 p-4">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                                Total jobs
                            </div>
                            <div className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                                {total.toLocaleString()}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 p-4">
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                                Showing on page
                            </div>
                            <div className="mt-2 text-2xl font-bold text-[var(--foreground)]">
                                {(atsOnPage + communityOnPage).toLocaleString()}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/70 p-4">
                <div className="flex flex-col gap-3 xl:flex-row">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            value={titleFilter}
                            onChange={(event) => setTitleFilter(event.target.value)}
                            placeholder="Filter by title or company..."
                            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--background)] pl-10 pr-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20"
                        />
                    </div>
                    <div className="relative xl:w-72">
                        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            value={locationFilter}
                            onChange={(event) => setLocationFilter(event.target.value)}
                            placeholder="Filter by location..."
                            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--background)] pl-10 pr-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20"
                        />
                    </div>
                    <select
                        value={experienceFilter}
                        onChange={(event) => setExperienceFilter(event.target.value)}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 xl:w-52"
                    >
                        {EXPERIENCE_OPTIONS.map((option) => (
                            <option key={option.value || "all"} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={daysFilter}
                        onChange={(event) => setDaysFilter(event.target.value)}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20 xl:w-48"
                    >
                        {DATE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => fetchJobs()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--background)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)]/30 transition"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>
            </section>

            {error && (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
                    {error}
                </div>
            )}

            {loading && (
                <div className="flex flex-col items-center justify-center gap-3 py-24">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
                    <span className="text-sm text-[var(--text-secondary)]">Loading jobs from the database...</span>
                </div>
            )}

            {!loading && jobs.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/60 py-20">
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)] p-4">
                        <SearchX className="h-10 w-10 text-[var(--text-secondary)]/50" />
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-semibold text-[var(--foreground)]">No jobs matched these filters</p>
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            Try widening the title, location, experience, or date filters.
                        </p>
                    </div>
                </div>
            )}

            {!loading && jobs.length > 0 && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {jobs.map((job) => {
                        const label = prettyToken(job.source_label || job.source_type || job.source);
                        const badgeClass = SOURCE_BADGES[(job.source_label || job.source_type || job.source || "").toLowerCase()] ||
                            "bg-gray-500/10 text-gray-400 border-gray-500/20";
                        const isSaved = savedJobs.has(job.id);
                        const isSaving = savingJobs.has(job.id);
                        const isTailoring = tailoringJob === job.id;

                        return (
                            <article
                                key={job.id}
                                className="group flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 p-5 transition hover:border-[var(--primary)]/30 hover:shadow-lg hover:shadow-[var(--primary)]/5"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${badgeClass}`}>
                                        {label}
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                                        <Calendar className="h-3 w-3" />
                                        {formatRelativeDate(job.date_posted, job.scraped_at)}
                                    </span>
                                </div>

                                <h3 className="mt-4 text-base font-semibold leading-snug text-[var(--foreground)] transition group-hover:text-[var(--primary)]">
                                    {job.title}
                                </h3>

                                <div className="mt-3 space-y-2 text-xs text-[var(--text-secondary)]">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{job.company}</span>
                                    </div>
                                    {job.location && (
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{job.location}</span>
                                        </div>
                                    )}
                                    {job.experience_level && (
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="h-3.5 w-3.5 shrink-0" />
                                            <span className="capitalize">{job.experience_level}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-6 flex flex-col gap-2">
                                    {job.apply_url ? (
                                        <a
                                            href={job.apply_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--background)] hover:opacity-90 transition"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            Apply Now
                                        </a>
                                    ) : (
                                        <button
                                            disabled
                                            className="inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)] opacity-60"
                                        >
                                            No Link Available
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => saveToTracker(job)}
                                            disabled={isSaved || isSaving}
                                            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${
                                                isSaved
                                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                    : "border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--primary)]/30"
                                            } disabled:cursor-not-allowed disabled:opacity-70`}
                                        >
                                            {isSaving ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : isSaved ? (
                                                <BookmarkCheck className="h-3.5 w-3.5" />
                                            ) : (
                                                <Bookmark className="h-3.5 w-3.5" />
                                            )}
                                            {isSaved ? "Saved" : "Save"}
                                        </button>

                                        <button
                                            onClick={() => tailorResume(job)}
                                            disabled={isTailoring}
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 px-4 py-2.5 text-xs font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/15 disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {isTailoring ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Sparkles className="h-3.5 w-3.5" />
                                            )}
                                            Tailor
                                        </button>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            {!loading && totalPages > 1 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-[var(--text-secondary)]">
                        Page {page} of {totalPages} · {total.toLocaleString()} results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((current) => Math.max(1, current - 1))}
                            disabled={page <= 1}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--primary)]/30 disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                        </button>
                        <button
                            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                            disabled={page >= totalPages}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] transition hover:border-[var(--primary)]/30 disabled:opacity-40"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
