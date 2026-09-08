"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowDownUp,
    BarChart3,
    Building2,
    CalendarDays,
    CheckCircle2,
    Copy,
    Download,
    ExternalLink,
    Eye,
    FileText,
    Filter,
    Loader2,
    MapPin,
    MoreVertical,
    Pen,
    Search,
    Sparkles,
    Trash2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CustomDialog } from "@/components/ui/CustomDialog";

/**
 * Cover letters live on the job they were written for (JobApplication.coverLetter),
 * so this page is a view over jobs that have one.
 */

type Job = {
    id: string;
    company: string;
    jobTitle: string;
    location?: string;
    jobUrl?: string;
    coverLetter?: string;
    status?: string;
    createdAt: string;
};

/**
 * The pipeline status of the application the letter belongs to. These are the
 * values the Job Tracker writes; there is no separate status for the letter.
 */
const STATUSES: Record<string, { label: string; dot: string; chip: string }> = {
    SAVED: { label: "Saved", dot: "bg-slate-400", chip: "text-slate-500 dark:text-slate-400 bg-slate-500/10" },
    APPLIED: { label: "Applied", dot: "bg-blue-500", chip: "text-blue-600 dark:text-blue-400 bg-blue-500/10" },
    INTERVIEW: { label: "Interviewing", dot: "bg-amber-500", chip: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
    OFFER: { label: "Offer", dot: "bg-emerald-500", chip: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
    REJECTED: { label: "Rejected", dot: "bg-red-500", chip: "text-red-600 dark:text-red-400 bg-red-500/10" },
};

const SORT_LABELS = {
    latest: "Latest first",
    oldest: "Oldest first",
    company: "Company A–Z",
} as const;

type SortKey = keyof typeof SORT_LABELS;

const ALL_STATUSES = "__all__";

export default function CoverLetterPage() {
    const router = useRouter();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("latest");
    const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);

    const [viewing, setViewing] = useState<Job | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [menuId, setMenuId] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        type: "alert" | "confirm";
        title: string;
        description: string;
        variant: "default" | "destructive" | "success";
        confirmText?: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: "alert", title: "", description: "", variant: "default" });

    useEffect(() => {
        fetch("/api/jobs")
            .then((r) => r.json())
            .then((j) => setJobs((j.data || []).filter((job: Job) => Boolean(job.coverLetter))))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // ── Derived ───────────────────────────────────────────────────────────

    const companies = useMemo(() => new Set(jobs.map((j) => j.company).filter(Boolean)).size, [jobs]);

    const recentThisWeek = useMemo(() => {
        const cutoff = Date.now() - 7 * 24 * 3_600_000;
        return jobs.filter((j) => new Date(j.createdAt).getTime() >= cutoff).length;
    }, [jobs]);

    const presentStatuses = useMemo(
        () => Array.from(new Set(jobs.map((j) => j.status || "SAVED"))).filter((s) => STATUSES[s]),
        [jobs]
    );

    const rows = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        const filtered = jobs.filter((job) => {
            if (statusFilter !== ALL_STATUSES && (job.status || "SAVED") !== statusFilter) return false;
            if (!needle) return true;
            return (
                job.jobTitle.toLowerCase().includes(needle) ||
                job.company.toLowerCase().includes(needle) ||
                (job.coverLetter || "").toLowerCase().includes(needle)
            );
        });

        const at = (job: Job) => new Date(job.createdAt).getTime();
        return filtered.sort((a, b) => {
            if (sortKey === "oldest") return at(a) - at(b);
            if (sortKey === "company") return a.company.localeCompare(b.company) || at(b) - at(a);
            return at(b) - at(a);
        });
    }, [jobs, searchQuery, statusFilter, sortKey]);

    // ── Actions ───────────────────────────────────────────────────────────

    const copyLetter = (job: Job) => {
        navigator.clipboard.writeText(job.coverLetter || "");
        setCopiedId(job.id);
        setTimeout(() => setCopiedId((id) => (id === job.id ? null : id)), 2000);
    };

    /** Wraps the letter in minimal print HTML — the PDF service takes HTML, not text. */
    const letterHtml = (job: Job) => `<!doctype html><html><head><meta charset="utf-8"><style>
        @page { margin: 22mm 20mm; }
        body { font-family: Georgia, "Times New Roman", serif; font-size: 11.5pt; line-height: 1.65; color: #1a1a1a; }
        h1 { font-size: 15pt; margin: 0 0 2px; }
        .meta { font-size: 10pt; color: #666; margin-bottom: 26px; }
        p { margin: 0 0 12px; white-space: pre-wrap; }
    </style></head><body>
        <h1>${escapeHtml(job.jobTitle)}</h1>
        <div class="meta">${escapeHtml(job.company)}${job.location ? " · " + escapeHtml(job.location) : ""}</div>
        <p>${escapeHtml(job.coverLetter || "")}</p>
    </body></html>`;

    const downloadPdf = async (job: Job) => {
        setBusyId(job.id);
        try {
            const fileName = `Cover Letter - ${job.company} - ${job.jobTitle}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
            const response = await fetch("/api/pdf/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ html: letterHtml(job), filename: fileName }),
            });
            if (!response.ok) throw new Error("PDF request failed");

            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch {
            setDialogConfig({
                isOpen: true,
                type: "alert",
                title: "Download failed",
                description: "Could not build the PDF. Please try again in a moment.",
                variant: "destructive",
            });
        } finally {
            setBusyId(null);
        }
    };

    const promptDelete = (job: Job) => {
        setMenuId(null);
        setDialogConfig({
            isOpen: true,
            type: "confirm",
            title: "Delete cover letter",
            description: `The cover letter for “${job.jobTitle}” will be removed. The job itself stays in your tracker.`,
            variant: "destructive",
            confirmText: "Delete",
            onConfirm: async () => {
                await fetch(`/api/jobs/${job.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ coverLetter: null }),
                });
                setJobs((prev) => prev.filter((j) => j.id !== job.id));
            },
        });
    };

    const formatDate = (value: string) =>
        new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    // ── Render ────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <Loader2 className="h-9 w-9 animate-spin text-[var(--primary)]" />
                <p className="animate-pulse text-sm text-[var(--text-secondary)]">Loading your cover letters…</p>
            </div>
        );
    }

    return (
        <>
            <div className="mx-auto w-full max-w-[1700px] space-y-5 animate-slide-down">
                {jobs.length > 0 && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <StatCard icon={FileText} value={jobs.length} label="Cover Letters" />
                            <StatCard icon={Building2} value={companies} label="Companies" />
                            <StatCard icon={BarChart3} value={recentThisWeek} label="Recent This Week" />
                        </div>

                        <div className="flex flex-col lg:flex-row gap-3">
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                                <input
                                    type="text"
                                    placeholder="Search cover letters by company, role, or keyword…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-12 w-full rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] pl-11 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--text-secondary)] transition focus:border-[var(--primary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/15"
                                />
                            </div>

                            <SelectMenu
                                icon={ArrowDownUp}
                                value={SORT_LABELS[sortKey]}
                                options={(Object.keys(SORT_LABELS) as SortKey[]).map((k) => ({ id: k, label: SORT_LABELS[k] }))}
                                selectedId={sortKey}
                                onSelect={(id) => setSortKey(id as SortKey)}
                            />

                            <SelectMenu
                                icon={Filter}
                                value={statusFilter === ALL_STATUSES ? "All statuses" : STATUSES[statusFilter].label}
                                options={[
                                    { id: ALL_STATUSES, label: "All statuses" },
                                    ...presentStatuses.map((s) => ({ id: s, label: STATUSES[s].label })),
                                ]}
                                selectedId={statusFilter}
                                onSelect={setStatusFilter}
                            />
                        </div>
                    </>
                )}

                {jobs.length === 0 ? (
                    <EmptyState
                        title="No cover letters yet"
                        body="Generate one from Resume Studio, or let the Vignova extension write it while you browse a job post."
                        actionLabel="Go to Job Tracker"
                        onAction={() => router.push("/dashboard/jobs")}
                    />
                ) : rows.length === 0 ? (
                    <EmptyState
                        title="Nothing matches those filters"
                        body="Try a different search term, or widen the status filter."
                        actionLabel="Clear filters"
                        onAction={() => {
                            setSearchQuery("");
                            setStatusFilter(ALL_STATUSES);
                        }}
                    />
                ) : (
                    <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]">
                        {/* Column heads — desktop only; each row is self-describing on mobile */}
                        <div className="hidden lg:grid grid-cols-[minmax(0,2.4fr)_1fr_1fr_0.9fr_auto] items-center gap-4 border-b border-[var(--border-color)] px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            <span>Company &amp; Role</span>
                            <span>Location</span>
                            <span>Generated</span>
                            <span>Status</span>
                            <span className="pr-1 text-right">Actions</span>
                        </div>

                        <div className="divide-y divide-[var(--border-color)]">
                            {rows.map((job) => {
                                const status = STATUSES[job.status || "SAVED"] ?? STATUSES.SAVED;
                                const busy = busyId === job.id;

                                return (
                                    <div
                                        key={job.id}
                                        className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.4fr)_1fr_1fr_0.9fr_auto] items-center gap-3 lg:gap-4 px-4 py-3 transition hover:bg-[var(--primary)]/4"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                                                <FileText className="h-[18px] w-[18px]" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-bold text-[var(--foreground)]">{job.jobTitle}</span>
                                                <span className="block truncate text-xs text-[var(--text-secondary)]">{job.company}</span>
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{job.location || "Remote"}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{formatDate(job.createdAt)}</span>
                                        </div>

                                        <div>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.chip}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                                {status.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 lg:justify-end">
                                            <button
                                                onClick={() => setViewing(job)}
                                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/8 px-3 text-[12px] font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/15"
                                            >
                                                <Eye className="h-3.5 w-3.5" /> Preview
                                            </button>
                                            <button
                                                onClick={() => router.push(`/dashboard/jobs/${job.id}?doc=cover-letter`)}
                                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-color)] px-3 text-[12px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
                                            >
                                                <Pen className="h-3.5 w-3.5" /> Edit
                                            </button>
                                            <button
                                                onClick={() => downloadPdf(job)}
                                                disabled={busy}
                                                aria-label={`Download the ${job.jobTitle} cover letter as PDF`}
                                                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] disabled:opacity-50"
                                            >
                                                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                            </button>

                                            <div className="relative">
                                                <button
                                                    onClick={() => setMenuId(menuId === job.id ? null : job.id)}
                                                    aria-label={`More actions for ${job.jobTitle}`}
                                                    aria-expanded={menuId === job.id}
                                                    className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-secondary)] transition hover:bg-black/5 hover:text-[var(--foreground)] dark:hover:bg-white/10"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>

                                                {menuId === job.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                                                        <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] py-1 shadow-xl">
                                                            <button
                                                                onClick={() => {
                                                                    copyLetter(job);
                                                                    setMenuId(null);
                                                                }}
                                                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition hover:bg-[var(--primary)]/8 hover:text-[var(--foreground)]"
                                                            >
                                                                <Copy className="h-3.5 w-3.5" /> Copy text
                                                            </button>
                                                            {job.jobUrl && (
                                                                <a
                                                                    href={job.jobUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={() => setMenuId(null)}
                                                                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition hover:bg-[var(--primary)]/8 hover:text-[var(--foreground)]"
                                                                >
                                                                    <ExternalLink className="h-3.5 w-3.5" /> View job post
                                                                </a>
                                                            )}
                                                            <button
                                                                onClick={() => promptDelete(job)}
                                                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-red-500 transition hover:bg-red-500/10"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" /> Delete cover letter
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {jobs.length > 0 && (
                    <div className="flex flex-col gap-5 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-5 lg:flex-row lg:items-center">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/12 text-[var(--primary)]">
                            <Sparkles className="h-6 w-6" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-[var(--foreground)]">Write better applications faster</h3>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                                Generate personalized, compelling cover letters that help you stand out and get more interviews.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-x-8 gap-y-2 shrink-0">
                            {["Tailored tone", "Role-specific content", "Editable before sending"].map((item) => (
                                <span key={item} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--primary)]" />
                                    {item}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Modal
                open={Boolean(viewing)}
                onClose={() => setViewing(null)}
                title={viewing?.jobTitle ?? "Cover letter"}
                subtitle={viewing ? `${viewing.company}${viewing.location ? ` · ${viewing.location}` : ""}` : ""}
                size="lg"
                footer={
                    viewing ? (
                        <div className="flex items-center justify-between gap-3">
                            <button
                                onClick={() => copyLetter(viewing)}
                                className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--primary)] hover:underline"
                            >
                                {copiedId === viewing.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copiedId === viewing.id ? "Copied" : "Copy text"}
                            </button>
                            <button
                                onClick={() => {
                                    const job = viewing;
                                    setViewing(null);
                                    router.push(`/dashboard/jobs/${job.id}?doc=cover-letter`);
                                }}
                                className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white transition hover:brightness-110"
                                style={{ backgroundImage: "var(--brand-gradient)" }}
                            >
                                <Pen className="h-3.5 w-3.5" /> Edit in Resume Studio
                            </button>
                        </div>
                    ) : undefined
                }
            >
                <div className="whitespace-pre-wrap rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-5 text-sm leading-relaxed text-[var(--foreground)]">
                    {viewing?.coverLetter}
                </div>
            </Modal>

            <CustomDialog {...dialogConfig} onClose={() => setDialogConfig((s) => ({ ...s, isOpen: false }))} />
        </>
    );
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ── Pieces ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
    return (
        <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] px-4 py-3.5">
            <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-70 blur-2xl"
                style={{ background: "var(--primary-soft)" }}
            />
            <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                <Icon className="h-5 w-5" />
            </span>
            <div className="relative min-w-0">
                <p className="text-2xl font-bold leading-none text-[var(--foreground)]">{value}</p>
                <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">{label}</p>
            </div>
        </div>
    );
}

function SelectMenu({
    icon: Icon,
    value,
    options,
    selectedId,
    onSelect,
}: {
    icon: React.ElementType;
    value: string;
    options: { id: string; label: string }[];
    selectedId: string;
    onSelect: (id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open]);

    return (
        <div ref={ref} className="relative shrink-0">
            <button
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex h-12 w-full lg:w-[190px] items-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] px-3.5 text-left transition hover:border-[var(--primary)]/40"
            >
                <Icon className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                <span className="flex-1 truncate text-[13px] font-semibold text-[var(--foreground)]">{value}</span>
            </button>

            {open && (
                <div className="absolute right-0 top-full z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] py-1 shadow-xl">
                    {options.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => {
                                onSelect(option.id);
                                setOpen(false);
                            }}
                            className={`block w-full truncate px-3 py-2 text-left text-xs transition hover:bg-[var(--primary)]/8 ${
                                option.id === selectedId
                                    ? "font-bold text-[var(--primary)]"
                                    : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function EmptyState({
    title,
    body,
    actionLabel,
    onAction,
}: {
    title: string;
    body: string;
    actionLabel: string;
    onAction: () => void;
}) {
    return (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] py-16 text-center">
            <div className="relative mx-auto mb-5 w-fit">
                <div className="absolute inset-0 rounded-2xl bg-[var(--primary)] opacity-20 blur-2xl" />
                <div className="relative rounded-2xl bg-[var(--primary)]/10 p-5">
                    <FileText className="h-9 w-9 text-[var(--primary)]" />
                </div>
            </div>
            <h3 className="mb-2 text-xl font-bold text-[var(--foreground)]">{title}</h3>
            <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--text-secondary)]">{body}</p>
            <button
                onClick={onAction}
                className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
            >
                {actionLabel}
            </button>
        </div>
    );
}
