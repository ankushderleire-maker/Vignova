"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    Bookmark,
    BookmarkCheck,
    Briefcase,
    Building2,
    Calendar,
    CheckCircle2,
    Clock,
    Crown,
    ExternalLink,
    Loader2,
    MapPin,
    Radar,
    RefreshCw,
    Rocket,
    SearchCode,
    Sparkles,
} from "lucide-react";
import { ScanFiltersModal, type ScanFilterState } from "@/components/job-platform/ScanFiltersModal";

type RecentJob = {
    id: string;
    title: string;
    company: string;
    location: string | null;
    apply_url: string | null;
    source: string | null;
    source_type: string | null;
    experience_level: string | null;
    date_posted: string | null;
    scraped_at: string | null;
};

function formatRelative(dateStr: string | null) {
    if (!dateStr) return "Just now";
    const then = new Date(dateStr).getTime();
    if (!Number.isFinite(then)) return "Just now";
    const diffMs = Date.now() - then;
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type AgentStatus = {
    id: string;
    status: string;
    sources: string[];
    jobs_fetched: number;
    jobs_inserted: number;
    duplicates: number;
    errors: number;
    error_message: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    created_at?: string | null;
};

type LastScanInfo = {
    id: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    jobsInserted: number;
    jobsFetched: number;
    updatedExisting: number;
    errors: number;
};

export default function JobScrapperPage() {
    const router = useRouter();
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [filters, setFilters] = useState<ScanFilterState>({
        positions: [],
        locations: [],
        experience: ["medium"],
        datePosted: "week",
    });

    const [nextAllowedAt, setNextAllowedAt] = useState<string | null>(null);
    const [adminDisabled, setAdminDisabled] = useState<{ reason: string | null } | null>(null);
    const [premiumRequired, setPremiumRequired] = useState<{ planType: string } | null>(null);
    const [lastScan, setLastScan] = useState<LastScanInfo | null>(null);
    const [nowMs, setNowMs] = useState(() => Date.now());

    const [agentRunning, setAgentRunning] = useState(false);
    const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
    const [agentError, setAgentError] = useState<string | null>(null);

    const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
    const [recentJobsLoading, setRecentJobsLoading] = useState(false);
    const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
    const [savingJobId, setSavingJobId] = useState<string | null>(null);

    const loadRecentJobs = useCallback(async (scanId?: string | null) => {
        try {
            setRecentJobsLoading(true);
            const params = new URLSearchParams({ limit: "30" });
            if (scanId) params.set("scanId", scanId);
            const response = await fetch(`/api/job-scrapper/recent-jobs?${params.toString()}`, {
                cache: "no-store",
            });
            if (!response.ok) {
                setRecentJobs([]);
                return;
            }
            const data = await response.json();
            setRecentJobs(Array.isArray(data?.jobs) ? (data.jobs as RecentJob[]) : []);
        } catch {
            setRecentJobs([]);
        } finally {
            setRecentJobsLoading(false);
        }
    }, []);

    async function saveJob(job: RecentJob) {
        if (savedJobIds.has(job.id) || savingJobId === job.id) return;
        setSavingJobId(job.id);
        try {
            const response = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    company: job.company,
                    jobTitle: job.title,
                    description: "",
                    jobUrl: job.apply_url || "",
                    location: job.location || "",
                }),
            });
            if (response.ok) {
                setSavedJobIds((previous) => new Set(previous).add(job.id));
            }
        } catch {
            // best effort
        } finally {
            setSavingJobId(null);
        }
    }

    function stopPolling() {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }

    async function loadState() {
        try {
            const response = await fetch("/api/job-scrapper/scan", { cache: "no-store" });
            const data = await response.json().catch(() => ({}));

            setLastScan(data?.lastScan || null);
            setNextAllowedAt(data?.throttled ? data.nextAllowedAt || null : null);
            setAdminDisabled(data?.disabled ? { reason: data.reason || null } : null);
            setPremiumRequired(
                data?.premium_required ? { planType: data.plan_type || "FREE" } : null
            );
        } catch {
            setNextAllowedAt(null);
            setAdminDisabled(null);
            setPremiumRequired(null);
        }
    }

    useEffect(() => {
        const timeout = setTimeout(() => {
            void loadState();
            void loadRecentJobs();
        }, 0);
        return () => {
            clearTimeout(timeout);
            stopPolling();
        };
    }, [loadRecentJobs]);

    useEffect(() => {
        const interval = setInterval(() => setNowMs(Date.now()), 60_000);
        return () => clearInterval(interval);
    }, []);

    async function startPolling(scanId: string) {
        stopPolling();
        setAgentRunning(true);
        setAgentError(null);

        let consecutive404 = 0;
        let consecutiveErrors = 0;
        let stagnantPolls = 0;
        let lastFingerprint: string | null = null;

        const stopWithError = (message: string) => {
            stopPolling();
            setAgentRunning(false);
            setAgentError(message);
        };

        const poll = async () => {
            try {
                const response = await fetch(`/api/job-scrapper/status/${encodeURIComponent(scanId)}`);
                if (!response.ok) {
                    if (response.status === 404) {
                        consecutive404 += 1;
                        if (consecutive404 >= 6) {
                            stopWithError(
                                "Scan status could not be found. Please start a new job scrape."
                            );
                        }
                        return;
                    }

                    const data = await response.json().catch(() => ({}));
                    consecutiveErrors += 1;
                    if (consecutiveErrors >= 3) {
                        stopWithError(data.error || "We could not read scan progress.");
                    }
                    return;
                }

                const row = (await response.json()) as AgentStatus;
                consecutive404 = 0;
                consecutiveErrors = 0;
                setAgentStatus(row);

                const fingerprint = [
                    row.status,
                    row.jobs_fetched || 0,
                    row.jobs_inserted || 0,
                    row.duplicates || 0,
                    row.errors || 0,
                ].join("|");
                if (fingerprint === lastFingerprint) {
                    stagnantPolls += 1;
                } else {
                    stagnantPolls = 0;
                    lastFingerprint = fingerprint;
                }

                const startedAt = row.started_at || row.created_at || null;
                const startedAtMs = startedAt ? Date.parse(startedAt) : NaN;
                const scanIsOld =
                    Number.isFinite(startedAtMs) &&
                    Date.now() - startedAtMs > 25 * 60 * 1000;

                if (
                    scanIsOld &&
                    stagnantPolls >= 12 &&
                    (row.status === "RUNNING" || row.status === "PENDING")
                ) {
                    stopWithError(
                        "This job scrape looks stuck, likely due to a restart or timeout. Please start a new one."
                    );
                    return;
                }

                if (row.status === "DONE" || row.status === "FAILED") {
                    stopPolling();
                    setAgentRunning(false);
                    if (row.status === "FAILED") {
                        setAgentError(row.error_message || "Job scrape failed.");
                    }
                    setLastScan({
                        id: row.id,
                        status: row.status,
                        createdAt: row.created_at || new Date().toISOString(),
                        completedAt: row.completed_at || new Date().toISOString(),
                        jobsInserted: row.jobs_inserted || 0,
                        jobsFetched: row.jobs_fetched || 0,
                        updatedExisting: row.duplicates || 0,
                        errors: row.errors || 0,
                    });
                    await loadState();
                    if (row.status === "DONE") {
                        await loadRecentJobs(row.id);
                    }
                }
            } catch {
                consecutiveErrors += 1;
                if (consecutiveErrors >= 4) {
                    stopWithError(
                        "Connection to scan status was lost. Refresh the page and try again."
                    );
                }
            }
        };

        await poll();
        pollRef.current = setInterval(poll, 5000);
    }

    function throttleCountdown(iso: string | null) {
        if (!iso) return null;
        const target = new Date(iso).getTime();
        const ms = target - nowMs;
        if (ms <= 0) return null;
        const hours = Math.floor(ms / 3_600_000);
        const mins = Math.floor((ms % 3_600_000) / 60_000);
        if (hours > 0) return `in ${hours}h ${mins}m`;
        return `in ${mins}m`;
    }

    const throttleLabel = throttleCountdown(nextAllowedAt);
    const priorScanRunning =
        !!lastScan && (lastScan.status === "RUNNING" || lastScan.status === "PENDING");

    async function submitScan() {
        if (agentRunning || priorScanRunning) return;
        if (filters.positions.length === 0) {
            setAgentError("Add at least one position to scan for.");
            return;
        }

        setFilterModalOpen(false);
        stopPolling();
        setAgentStatus(null);
        setAgentError(null);
        setAgentRunning(true);

        try {
            const response = await fetch("/api/job-scrapper/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(filters),
            });
            const data = await response.json().catch(() => ({}));

            if (response.status === 402 || data?.premium_required) {
                setAgentRunning(false);
                setPremiumRequired({ planType: data.plan_type || "FREE" });
                return;
            }

            if (response.status === 423 || data?.disabled) {
                setAgentRunning(false);
                setAdminDisabled({ reason: data.reason || null });
                return;
            }

            if (data?.throttled) {
                setAgentRunning(false);
                setNextAllowedAt(data.nextAllowedAt || null);
                return;
            }

            if (!response.ok || !data?.scan_id) {
                setAgentRunning(false);
                setAgentError(data?.error || data?.message || "Job scrape could not be started.");
                return;
            }

            setLastScan((previous) =>
                previous && previous.id === data.scan_id
                    ? previous
                    : {
                          id: data.scan_id,
                          status: "RUNNING",
                          createdAt: new Date().toISOString(),
                          completedAt: null,
                          jobsInserted: 0,
                          jobsFetched: 0,
                          updatedExisting: 0,
                          errors: 0,
                      }
            );

            await startPolling(data.scan_id);
        } catch {
            setAgentRunning(false);
            setAgentError("Job scrape could not be started.");
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-slide-down">
            <section className="rounded-3xl border border-[var(--border-color)] bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(16,185,129,0.08),transparent_72%)] p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-sky-400">
                            <Radar className="h-3.5 w-3.5" />
                            Beta
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--foreground)]">
                                Search jobs from LinkedIn and Indeed
                            </h2>
                            <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
                                Find fresh job openings from LinkedIn and Indeed matched to your skills and preferences.
                                Click Scan Jobs below to pull the latest listings into your personal job feed.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-2 sm:gap-3 shrink-0">
                        <button
                            onClick={() => loadState()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] h-11 px-4 text-sm font-semibold text-[var(--foreground)] hover:border-[var(--primary)]/30 transition whitespace-nowrap"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </button>
                        {premiumRequired ? (
                            <button
                                onClick={() => router.push("/dashboard/billing")}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 h-11 px-5 text-sm font-bold uppercase tracking-[0.14em] text-white hover:opacity-90 transition whitespace-nowrap"
                            >
                                <Crown className="h-4 w-4" />
                                Upgrade
                            </button>
                        ) : (
                            <button
                                onClick={() => setFilterModalOpen(true)}
                                disabled={agentRunning || priorScanRunning || !!throttleLabel || !!adminDisabled}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] h-11 px-5 text-sm font-bold uppercase tracking-[0.14em] text-[var(--background)] hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                            >
                                {agentRunning || priorScanRunning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Rocket className="h-4 w-4" />
                                )}
                                {agentRunning || priorScanRunning ? "Scanning..." : "Scan Jobs"}
                            </button>
                        )}
                    </div>
                </div>
            </section>

            <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 p-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Sources
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-blue-400">
                            LinkedIn
                        </span>
                        <span className="rounded-full border border-blue-600/20 bg-blue-600/10 px-3 py-1 text-blue-500">
                            Indeed
                        </span>
                    </div>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 p-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Cooldown
                    </div>
                    <div className="mt-3 text-sm text-[var(--foreground)]">
                        {throttleLabel ? `Next run unlocks ${throttleLabel}.` : "Ready for a new scan."}
                    </div>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 p-5">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                        Output
                    </div>
                    <div className="mt-3 text-sm text-[var(--foreground)]">
                        Fresh jobs are inserted into the shared database and appear in Find Jobs.
                    </div>
                </div>
            </section>

            {premiumRequired && (
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent px-5 py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="font-semibold text-[var(--foreground)]">
                                Job Scrapper is available on paid plans
                            </div>
                            <div className="mt-1 text-sm text-[var(--text-secondary)]">
                                Your current plan ({premiumRequired.planType}) does not include LinkedIn and Indeed scraping.
                            </div>
                        </div>
                        <button
                            onClick={() => router.push("/dashboard/billing")}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white hover:opacity-90 transition"
                        >
                            <Crown className="h-4 w-4" />
                            Upgrade Plan
                        </button>
                    </div>
                </div>
            )}

            {adminDisabled && (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-[var(--foreground)]">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        {adminDisabled.reason || "Job scraping is temporarily disabled by the admin."}
                    </div>
                </div>
            )}

            {throttleLabel && (
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-[var(--primary)]" />
                        Next scan unlocks {throttleLabel}
                        {nextAllowedAt && (
                            <span>
                                · around{" "}
                                {new Date(nextAllowedAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </span>
                        )}
                    </div>
                </div>
            )}

            {lastScan && !agentRunning && priorScanRunning && (
                <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="font-semibold text-[var(--foreground)]">
                                Your previous job scrape is still running
                            </div>
                            <div className="mt-1 text-sm text-[var(--text-secondary)]">
                                Started {new Date(lastScan.createdAt).toLocaleString()}.
                            </div>
                        </div>
                        <button
                            onClick={() => startPolling(lastScan.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/30 px-4 py-2.5 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition"
                        >
                            <SearchCode className="h-4 w-4" />
                            View Live Progress
                        </button>
                    </div>
                </div>
            )}

            {lastScan && !agentRunning && lastScan.status === "DONE" && (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                        <div className="text-sm">
                            <div className="font-semibold text-[var(--foreground)]">
                                Last scan added {lastScan.jobsInserted.toLocaleString()} new jobs
                            </div>
                            <div className="mt-1 text-[var(--text-secondary)]">
                                {lastScan.jobsFetched.toLocaleString()} fetched ·{" "}
                                {lastScan.updatedExisting.toLocaleString()} updated existing ·{" "}
                                {lastScan.errors.toLocaleString()} errors
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {(lastScan?.status === "DONE" || recentJobs.length > 0) && (
                <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 p-5">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="font-semibold text-[var(--foreground)]">
                                Jobs from your last scan
                            </div>
                            <div className="text-sm text-[var(--text-secondary)]">
                                {recentJobs.length > 0
                                    ? `Showing ${recentJobs.length} LinkedIn and Indeed openings found for you.`
                                    : "No new jobs were pulled in this scan — try different positions or locations."}
                            </div>
                        </div>
                        <button
                            onClick={() => loadRecentJobs(lastScan?.id || null)}
                            disabled={recentJobsLoading}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--background)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:border-[var(--primary)]/30 transition disabled:opacity-60"
                        >
                            {recentJobsLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="h-3.5 w-3.5" />
                            )}
                            Refresh
                        </button>
                    </div>

                    {recentJobs.length > 0 && (
                        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {recentJobs.map((job) => {
                                const isLinkedIn = (job.source || "").toLowerCase() === "linkedin";
                                const badgeClass = isLinkedIn
                                    ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    : "bg-blue-600/10 text-blue-500 border-blue-500/20";
                                const isSaved = savedJobIds.has(job.id);
                                const isSaving = savingJobId === job.id;

                                return (
                                    <article
                                        key={job.id}
                                        className="group flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--background)] p-4 transition hover:border-[var(--primary)]/30"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${badgeClass}`}>
                                                {isLinkedIn ? "LinkedIn" : "Indeed"}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                                                <Calendar className="h-3 w-3" />
                                                {formatRelative(job.date_posted || job.scraped_at)}
                                            </span>
                                        </div>

                                        <h3 className="mt-3 text-sm font-semibold leading-snug text-[var(--foreground)] line-clamp-2 group-hover:text-[var(--primary)] transition">
                                            {job.title}
                                        </h3>

                                        <div className="mt-3 space-y-1.5 text-xs text-[var(--text-secondary)]">
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

                                        <div className="mt-4 flex gap-2">
                                            {job.apply_url ? (
                                                <a
                                                    href={job.apply_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--background)] hover:opacity-90 transition"
                                                >
                                                    <ExternalLink className="h-3 w-3" />
                                                    Apply
                                                </a>
                                            ) : (
                                                <button
                                                    disabled
                                                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-secondary)] opacity-60"
                                                >
                                                    No Link
                                                </button>
                                            )}
                                            <button
                                                onClick={() => saveJob(job)}
                                                disabled={isSaved || isSaving}
                                                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition ${
                                                    isSaved
                                                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                                        : "border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)] hover:border-[var(--primary)]/30"
                                                } disabled:cursor-not-allowed disabled:opacity-70`}
                                            >
                                                {isSaving ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : isSaved ? (
                                                    <BookmarkCheck className="h-3 w-3" />
                                                ) : (
                                                    <Bookmark className="h-3 w-3" />
                                                )}
                                                {isSaved ? "Saved" : "Save"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {(agentRunning || agentStatus || agentError) && (
                <section className="rounded-3xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/80 p-5">
                    <div className="flex items-center gap-3">
                        {agentRunning ? (
                            <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
                        ) : (
                            <Sparkles className="h-5 w-5 text-[var(--primary)]" />
                        )}
                        <div>
                            <div className="font-semibold text-[var(--foreground)]">Live Job Scrapper Status</div>
                            <div className="text-sm text-[var(--text-secondary)]">
                                Polling the backend worker for this run.
                            </div>
                        </div>
                    </div>

                    {agentStatus && (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)] p-4">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                    Status
                                </div>
                                <div className="mt-2 text-lg font-bold text-[var(--foreground)]">
                                    {agentStatus.status}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)] p-4">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                    Fetched
                                </div>
                                <div className="mt-2 text-lg font-bold text-[var(--foreground)]">
                                    {agentStatus.jobs_fetched.toLocaleString()}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)] p-4">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                    New jobs
                                </div>
                                <div className="mt-2 text-lg font-bold text-emerald-500">
                                    {agentStatus.jobs_inserted.toLocaleString()}
                                </div>
                            </div>
                            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--background)] p-4">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                                    Updated
                                </div>
                                <div className="mt-2 text-lg font-bold text-[var(--foreground)]">
                                    {agentStatus.duplicates.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}

                    {agentError && (
                        <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-400">
                            {agentError}
                        </div>
                    )}
                </section>
            )}

            <ScanFiltersModal
                open={filterModalOpen}
                filters={filters}
                onChange={setFilters}
                onClose={() => setFilterModalOpen(false)}
                onSubmit={submitScan}
                submitting={agentRunning}
            />
        </div>
    );
}
