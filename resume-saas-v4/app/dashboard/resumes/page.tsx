"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowDownUp,
    Building2,
    Clock,
    Download,
    Eye,
    FileText,
    Layers,
    Loader2,
    MoreVertical,
    Search,
    SlidersHorizontal,
    Sparkles,
    Trash2,
    Wand2,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { CustomDialog } from "@/components/ui/CustomDialog";

/**
 * Saved resumes, grouped by the job they were tailored for.
 *
 * A saved row is one *version*: generating again for the same job appends
 * another. So a card is a job, and the versions live behind it.
 */

type SavedResume = {
    id: string;
    name: string;
    createdAt: string;
    jobId: string;
    job: { company: string; jobTitle: string };
    content: any;
    templateId?: string | null;
};

type JobGroup = {
    jobId: string;
    jobTitle: string;
    company: string;
    resumes: SavedResume[];
    latestDate: string;
};

type SortKey = "latest" | "oldest" | "versions" | "company";

const SORT_LABELS: Record<SortKey, string> = {
    latest: "Latest first",
    oldest: "Oldest first",
    versions: "Most versions",
    company: "Company A–Z",
};

const ALL_COMPANIES = "__all__";

/** Used only for rows saved before templateId existed. */
const FALLBACK_TEMPLATE = "modern";

export default function SavedResumesPage() {
    const router = useRouter();
    const [resumes, setResumes] = useState<SavedResume[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("latest");
    const [company, setCompany] = useState<string>(ALL_COMPANIES);

    const [openJobId, setOpenJobId] = useState<string | null>(null);
    const [menuJobId, setMenuJobId] = useState<string | null>(null);
    const [preview, setPreview] = useState<{ resume: SavedResume; html: string } | null>(null);
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
        fetch("/api/resumes")
            .then((r) => r.json())
            .then((j) => setResumes(j.data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    // ── Derived data ──────────────────────────────────────────────────────

    const companies = useMemo(
        () => Array.from(new Set(resumes.map((r) => r.job.company).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
        [resumes]
    );

    const allGroups = useMemo<JobGroup[]>(() => {
        const map = new Map<string, JobGroup>();
        resumes.forEach((resume) => {
            if (!map.has(resume.jobId)) {
                map.set(resume.jobId, {
                    jobId: resume.jobId,
                    jobTitle: resume.job.jobTitle,
                    company: resume.job.company,
                    resumes: [],
                    latestDate: resume.createdAt,
                });
            }
            const group = map.get(resume.jobId)!;
            group.resumes.push(resume);
            if (new Date(resume.createdAt) > new Date(group.latestDate)) group.latestDate = resume.createdAt;
        });
        return Array.from(map.values());
    }, [resumes]);

    const jobGroups = useMemo(() => {
        const needle = searchQuery.trim().toLowerCase();
        const filtered = allGroups.filter((group) => {
            if (company !== ALL_COMPANIES && group.company !== company) return false;
            if (!needle) return true;
            return (
                group.jobTitle.toLowerCase().includes(needle) ||
                group.company.toLowerCase().includes(needle) ||
                group.resumes.some((r) => r.name.toLowerCase().includes(needle))
            );
        });

        const byDate = (g: JobGroup) => new Date(g.latestDate).getTime();
        return filtered.sort((a, b) => {
            if (sortKey === "oldest") return byDate(a) - byDate(b);
            if (sortKey === "versions") return b.resumes.length - a.resumes.length || byDate(b) - byDate(a);
            if (sortKey === "company") return a.company.localeCompare(b.company) || byDate(b) - byDate(a);
            return byDate(b) - byDate(a);
        });
    }, [allGroups, searchQuery, company, sortKey]);

    const activeGroup = jobGroups.find((g) => g.jobId === openJobId) ?? allGroups.find((g) => g.jobId === openJobId) ?? null;

    const latestOf = (group: JobGroup) =>
        group.resumes.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    // ── Actions ───────────────────────────────────────────────────────────

    const buildHtml = async (resume: SavedResume) => {
        // Loaded on demand: the template module pulls in every template, and
        // this page only needs it once someone previews or downloads.
        const { getTemplateGenerator } = await import("@/components/resume-html-templates");
        // Reproduce the template the resume was saved with; older rows have none.
        return getTemplateGenerator(resume.templateId || FALLBACK_TEMPLATE)(resume.content);
    };

    const failed = (title: string, description: string) =>
        setDialogConfig({ isOpen: true, type: "alert", title, description, variant: "destructive" });

    const openPreview = async (resume: SavedResume) => {
        setBusyId(resume.id);
        try {
            setPreview({ resume, html: await buildHtml(resume) });
        } catch {
            failed("Preview failed", "Could not render this resume. Open it in Resume Studio instead.");
        } finally {
            setBusyId(null);
        }
    };

    const downloadPdf = async (resume: SavedResume, group: JobGroup) => {
        setBusyId(resume.id);
        try {
            const fileName = `${group.company || "resume"} - ${group.jobTitle || resume.name}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
            // Template id and data, not finished HTML: the server renders it so
            // the premium check cannot be sidestepped by the browser.
            const response = await fetch("/api/pdf/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    templateId: resume.templateId || FALLBACK_TEMPLATE,
                    data: resume.content,
                    filename: fileName,
                }),
            });

            if (response.status === 402) {
                const info = await response.json().catch(() => ({}));
                failed(
                    info.error || "Pro template",
                    info.message || "This template needs a Pro plan. Switch to a free template to download."
                );
                return;
            }

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
            failed("Download failed", "Could not build the PDF. Please try again in a moment.");
        } finally {
            setBusyId(null);
        }
    };

    const promptDeleteVersion = (event: React.MouseEvent, id: string) => {
        event.stopPropagation();
        setDialogConfig({
            isOpen: true,
            type: "confirm",
            title: "Delete version",
            description: "This version will be removed permanently. This cannot be undone.",
            variant: "destructive",
            confirmText: "Delete",
            onConfirm: async () => {
                await fetch(`/api/resumes/${id}`, { method: "DELETE" });
                setResumes((prev) => {
                    const next = prev.filter((r) => r.id !== id);
                    if (!next.some((r) => r.jobId === openJobId)) setOpenJobId(null);
                    return next;
                });
            },
        });
    };

    const promptDeleteGroup = (group: JobGroup) => {
        setMenuJobId(null);
        setDialogConfig({
            isOpen: true,
            type: "confirm",
            title: `Delete ${group.resumes.length} version${group.resumes.length !== 1 ? "s" : ""}`,
            description: `Every saved resume for “${group.jobTitle}” will be removed permanently. This cannot be undone.`,
            variant: "destructive",
            confirmText: "Delete all",
            onConfirm: async () => {
                await Promise.all(group.resumes.map((r) => fetch(`/api/resumes/${r.id}`, { method: "DELETE" })));
                setResumes((prev) => prev.filter((r) => r.jobId !== group.jobId));
                if (openJobId === group.jobId) setOpenJobId(null);
            },
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const hours = Math.floor((Date.now() - date.getTime()) / 3_600_000);
        const days = Math.floor(hours / 24);
        if (hours < 1) return "just now";
        if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
        if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    // ── Render ────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-[var(--primary)] opacity-20 blur-xl animate-pulse" />
                    <Loader2 className="relative animate-spin h-10 w-10 text-[var(--primary)]" />
                </div>
                <p className="text-[var(--text-secondary)] text-sm animate-pulse">Loading your resumes…</p>
            </div>
        );
    }

    return (
        <>
            <div className="w-full max-w-[1700px] mx-auto space-y-5 animate-slide-down">
                {/* Toolbar: counts on the left, controls on the right */}
                {resumes.length > 0 && (
                    <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                        <div className="grid grid-cols-3 gap-3 xl:shrink-0">
                            <StatPill icon={FileText} value={resumes.length} label="Total Resumes" />
                            <StatPill icon={Layers} value={allGroups.length} label="Jobs Targeted" />
                            <StatPill icon={Building2} value={companies.length} label="Companies" />
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
                            <div className="relative flex-1 min-w-0">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                                <input
                                    type="text"
                                    placeholder="Search by job title, company, or keyword…"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-[58px] pl-11 pr-4 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15 transition"
                                />
                            </div>

                            <SelectMenu
                                icon={ArrowDownUp}
                                label="Sort"
                                value={SORT_LABELS[sortKey]}
                                options={(Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
                                    id: key,
                                    label: SORT_LABELS[key],
                                }))}
                                selectedId={sortKey}
                                onSelect={(id) => setSortKey(id as SortKey)}
                            />

                            <SelectMenu
                                icon={SlidersHorizontal}
                                label="Filter"
                                value={company === ALL_COMPANIES ? "All companies" : company}
                                options={[
                                    { id: ALL_COMPANIES, label: "All companies" },
                                    ...companies.map((name) => ({ id: name, label: name })),
                                ]}
                                selectedId={company}
                                onSelect={setCompany}
                            />
                        </div>
                    </div>
                )}

                {resumes.length === 0 ? (
                    <EmptyState
                        icon={Sparkles}
                        title="No resumes yet"
                        body="Start by adding a job description, then generate a tailored resume with one click."
                        action={{ label: "Browse Jobs", onClick: () => router.push("/dashboard/jobs") }}
                    />
                ) : jobGroups.length === 0 ? (
                    <EmptyState
                        icon={Search}
                        title="Nothing matches those filters"
                        body="Try a different search term, or widen the company filter."
                        action={{
                            label: "Clear filters",
                            onClick: () => {
                                setSearchQuery("");
                                setCompany(ALL_COMPANIES);
                            },
                        }}
                    />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {jobGroups.map((group) => {
                            const latest = latestOf(group);
                            const count = group.resumes.length;
                            const busy = busyId === latest.id;

                            return (
                                <div
                                    key={group.jobId}
                                    className="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-4 transition hover:border-[var(--primary)]/45 hover:shadow-[var(--card-hover-shadow)]"
                                >
                                    {/* Brand wash in the corner, purely decorative */}
                                    <div
                                        aria-hidden
                                        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full opacity-60 blur-2xl"
                                        style={{ background: "var(--primary-soft)" }}
                                    />

                                    <div className="relative">
                                        <div className="flex items-center gap-2 mb-3.5">
                                            <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                                                <FileText className="h-[18px] w-[18px]" />
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)]">
                                                <Layers className="h-3 w-3" />
                                                {count} version{count !== 1 ? "s" : ""}
                                            </span>

                                            <div className="relative ml-auto">
                                                <button
                                                    onClick={() => setMenuJobId(menuJobId === group.jobId ? null : group.jobId)}
                                                    aria-label={`More actions for ${group.jobTitle}`}
                                                    aria-expanded={menuJobId === group.jobId}
                                                    className="grid place-items-center h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/10 transition"
                                                >
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>

                                                {menuJobId === group.jobId && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setMenuJobId(null)} />
                                                        <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] py-1 shadow-xl">
                                                            <button
                                                                onClick={() => {
                                                                    setMenuJobId(null);
                                                                    router.push(`/dashboard/jobs/${group.jobId}`);
                                                                }}
                                                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--primary)]/8 hover:text-[var(--foreground)] transition"
                                                            >
                                                                <Wand2 className="h-3.5 w-3.5" /> Open in Resume Studio
                                                            </button>
                                                            <button
                                                                onClick={() => promptDeleteGroup(group)}
                                                                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-red-500 hover:bg-red-500/10 transition"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" /> Delete all versions
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <h3 className="text-[15px] font-bold leading-snug text-[var(--foreground)] line-clamp-2 min-h-[2.6em]">
                                            {group.jobTitle}
                                        </h3>

                                        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">{group.company || "Unknown company"}</span>
                                        </div>

                                        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                            <Clock className="h-3.5 w-3.5 shrink-0" />
                                            <span className="truncate">Updated {formatDate(group.latestDate)}</span>
                                            <span aria-hidden className="opacity-50">•</span>
                                            <FileText className="h-3.5 w-3.5 shrink-0" />
                                            <span className="shrink-0">
                                                {count} version{count !== 1 ? "s" : ""}
                                            </span>
                                        </div>

                                        <div className="mt-4 flex items-center gap-2">
                                            <button
                                                onClick={() =>
                                                    count === 1
                                                        ? router.push(`/dashboard/jobs/${group.jobId}?resumeId=${latest.id}`)
                                                        : setOpenJobId(group.jobId)
                                                }
                                                className="flex flex-1 min-w-0 items-center justify-center gap-1.5 h-9 rounded-lg bg-[var(--primary)] px-3 text-[12px] font-semibold text-white transition hover:bg-[var(--primary-dark)]"
                                            >
                                                <Eye className="h-3.5 w-3.5 shrink-0" />
                                                {count === 1 ? "Open resume" : "View versions"}
                                            </button>

                                            <button
                                                onClick={() => openPreview(latest)}
                                                disabled={busy}
                                                className="flex flex-1 min-w-0 items-center justify-center gap-1.5 h-9 rounded-lg border border-[var(--border-color)] px-3 text-[12px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 disabled:opacity-50"
                                            >
                                                {busy ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                                                ) : (
                                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                                )}
                                                Preview
                                            </button>

                                            <button
                                                onClick={() => downloadPdf(latest, group)}
                                                disabled={busy}
                                                aria-label={`Download ${group.jobTitle} as PDF`}
                                                className="grid place-items-center h-9 w-9 shrink-0 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 hover:text-[var(--primary)] disabled:opacity-50"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Versions */}
            <Modal
                open={Boolean(openJobId && activeGroup)}
                onClose={() => setOpenJobId(null)}
                title={activeGroup?.jobTitle ?? ""}
                subtitle={activeGroup ? `${activeGroup.company} · ${activeGroup.resumes.length} saved versions, newest first` : ""}
                size="lg"
                footer={
                    activeGroup ? (
                        <button
                            onClick={() => {
                                setOpenJobId(null);
                                router.push(`/dashboard/jobs/${activeGroup.jobId}`);
                            }}
                            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--primary)] hover:underline"
                        >
                            <Wand2 className="h-3.5 w-3.5" /> Open in Resume Studio
                        </button>
                    ) : undefined
                }
            >
                <div className="divide-y divide-[var(--border-color)]">
                    {activeGroup?.resumes
                        .slice()
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map((resume) => (
                            <div key={resume.id} className="group flex items-center gap-3 py-3">
                                <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                                    <FileText className="h-4 w-4" />
                                </span>
                                <button
                                    onClick={() => {
                                        setOpenJobId(null);
                                        router.push(`/dashboard/jobs/${resume.jobId}?resumeId=${resume.id}`);
                                    }}
                                    className="flex-1 min-w-0 text-left"
                                >
                                    <p className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                                        {resume.name}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{formatDate(resume.createdAt)}</p>
                                </button>
                                <button
                                    onClick={() => openPreview(resume)}
                                    disabled={busyId === resume.id}
                                    className="shrink-0 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5 disabled:opacity-50"
                                >
                                    {busyId === resume.id ? "Loading…" : "Preview"}
                                </button>
                                <button
                                    onClick={(e) => promptDeleteVersion(e, resume.id)}
                                    aria-label={`Delete ${resume.name}`}
                                    className="shrink-0 rounded-lg p-1.5 text-[var(--text-secondary)] transition hover:bg-red-500/10 hover:text-red-500"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                </div>
            </Modal>

            {/* Preview */}
            <Modal
                open={Boolean(preview)}
                onClose={() => setPreview(null)}
                title={preview?.resume.job.jobTitle ?? "Preview"}
                subtitle={preview ? `${preview.resume.name} · ${preview.resume.job.company}` : ""}
                size="xl"
            >
                <iframe
                    title="Resume preview"
                    srcDoc={preview?.html ?? ""}
                    className="h-[65vh] w-full rounded-lg border border-[var(--border-color)] bg-white"
                />
            </Modal>

            <CustomDialog {...dialogConfig} onClose={() => setDialogConfig((s) => ({ ...s, isOpen: false }))} />
        </>
    );
}

// ── Pieces ────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, value, label }: { icon: React.ElementType; value: number; label: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] px-3 py-2.5">
            <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                <Icon className="h-[18px] w-[18px]" />
            </span>
            <div className="min-w-0">
                <p className="text-xl font-bold leading-none text-[var(--foreground)]">{value}</p>
                <p className="mt-1 truncate text-[11px] text-[var(--text-secondary)]">{label}</p>
            </div>
        </div>
    );
}

function SelectMenu({
    icon: Icon,
    label,
    value,
    options,
    selectedId,
    onSelect,
}: {
    icon: React.ElementType;
    label: string;
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
                className="flex h-[58px] w-full sm:w-[168px] items-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] px-3.5 text-left transition hover:border-[var(--primary)]/40"
            >
                <Icon className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                        {label}
                    </span>
                    <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">{value}</span>
                </span>
            </button>

            {open && (
                <div className="absolute right-0 top-full z-30 mt-1 max-h-72 w-60 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] py-1 shadow-xl">
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
    icon: Icon,
    title,
    body,
    action,
}: {
    icon: React.ElementType;
    title: string;
    body: string;
    action: { label: string; onClick: () => void };
}) {
    return (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] py-16 text-center">
            <div className="relative mx-auto mb-5 w-fit">
                <div className="absolute inset-0 rounded-2xl bg-[var(--primary)] opacity-20 blur-2xl" />
                <div className="relative rounded-2xl bg-[var(--primary)]/10 p-5">
                    <Icon className="h-9 w-9 text-[var(--primary)]" />
                </div>
            </div>
            <h3 className="mb-2 text-xl font-bold text-[var(--foreground)]">{title}</h3>
            <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--text-secondary)]">{body}</p>
            <button
                onClick={action.onClick}
                className="rounded-xl bg-[var(--primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
            >
                {action.label}
            </button>
        </div>
    );
}
