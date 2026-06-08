"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    FileText,
    Loader2,
    Briefcase,
    Clock,
    Sparkles,
    Search,
    Trash2,
    X,
    ChevronRight,
    Layers,
    ArrowUpRight,
    Building2,
} from "lucide-react";
import styles from "@/components/dashboard/DashboardCard.module.css";
import { CustomDialog } from "@/components/ui/CustomDialog";

type SavedResume = {
    id: string;
    name: string;
    createdAt: string;
    jobId: string;
    job: { company: string; jobTitle: string };
    content: any;
};

type JobGroup = {
    jobId: string;
    jobTitle: string;
    company: string;
    resumes: SavedResume[];
    latestDate: string;
};

export default function SavedResumesPage() {
    const router = useRouter();
    const [resumes, setResumes] = useState<SavedResume[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [openJobId, setOpenJobId] = useState<string | null>(null);
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

    const filteredResumes = useMemo(
        () =>
            resumes.filter(
                (r) =>
                    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    r.job.company.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        [resumes, searchQuery]
    );

    // Group by jobId, sorted newest-updated first
    const jobGroups = useMemo<JobGroup[]>(() => {
        const map = new Map<string, JobGroup>();
        filteredResumes.forEach((resume) => {
            if (!map.has(resume.jobId)) {
                map.set(resume.jobId, {
                    jobId: resume.jobId,
                    jobTitle: resume.job.jobTitle,
                    company: resume.job.company,
                    resumes: [],
                    latestDate: resume.createdAt,
                });
            }
            const g = map.get(resume.jobId)!;
            g.resumes.push(resume);
            if (new Date(resume.createdAt) > new Date(g.latestDate)) g.latestDate = resume.createdAt;
        });
        return Array.from(map.values()).sort(
            (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
        );
    }, [filteredResumes]);

    const activeGroup = jobGroups.find((g) => g.jobId === openJobId) ?? null;

    const promptDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDialogConfig({
            isOpen: true,
            type: "confirm",
            title: "Delete Resume",
            description: "Are you sure you want to delete this resume? This action cannot be undone.",
            variant: "destructive",
            confirmText: "Delete",
            onConfirm: async () => {
                await fetch(`/api/resumes/${id}`, { method: "DELETE" });
                setResumes((prev) => prev.filter((r) => r.id !== id));
                const remaining = resumes.filter((r) => r.id !== id && r.jobId === openJobId);
                if (remaining.length === 0) setOpenJobId(null);
            },
        });
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - d.getTime()) / 3_600_000);
        const diffDays = Math.floor(diffHours / 24);
        if (diffHours < 1) return "Just now";
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const handleCardClick = (group: JobGroup) => {
        if (group.resumes.length === 1) {
            router.push(`/dashboard/jobs/${group.jobId}?resumeId=${group.resumes[0].id}`);
        } else {
            setOpenJobId(group.jobId === openJobId ? null : group.jobId);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-[var(--primary)] opacity-20 blur-xl animate-pulse" />
                    <Loader2 className="relative animate-spin h-10 w-10 text-[var(--primary)]" />
                </div>
                <p className="text-gray-500 text-sm animate-pulse">Loading your resumes...</p>
            </div>
        );
    }

    return (
        <>
            {/* ── Page content (animate-slide-down creates a stacking context;
                fixed children must live outside this div) ── */}
            <div className="max-w-7xl mx-auto space-y-6 animate-slide-down">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-[var(--text-secondary)] text-sm">
                        {resumes.length} resume{resumes.length !== 1 ? "s" : ""} across{" "}
                        <span className="font-semibold text-[var(--foreground)]">{jobGroups.length}</span>{" "}
                        job{jobGroups.length !== 1 ? "s" : ""}
                    </p>
                    {resumes.length > 0 && (
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                            <input
                                type="text"
                                placeholder="Search by job title or company..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-1 focus:ring-[var(--primary)]/20 transition-all shadow-sm"
                            />
                        </div>
                    )}
                </div>

                {/* Empty state */}
                {resumes.length === 0 ? (
                    <div className={styles.cardWrapper} style={{ "--border-color": "var(--primary)" } as React.CSSProperties}>
                        <div className={styles.innerCard}>
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 rounded-2xl bg-[var(--primary)] opacity-20 blur-2xl" />
                                    <div className="relative p-5 rounded-2xl bg-[var(--primary)]/10">
                                        <Sparkles className="h-10 w-10 text-[var(--primary)]" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">No resumes yet</h3>
                                <p className="text-[var(--text-secondary)] text-sm mb-6 max-w-sm">
                                    Start by adding a job description, then generate a tailored resume with one click.
                                </p>
                                <button
                                    onClick={() => router.push("/dashboard/jobs")}
                                    className="bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all"
                                >
                                    Browse Jobs
                                </button>
                            </div>
                        </div>
                    </div>
                ) : jobGroups.length === 0 ? (
                    <div className="text-center py-16">
                        <Search className="h-10 w-10 text-[var(--text-secondary)] mx-auto mb-4 opacity-50" />
                        <p className="text-[var(--text-secondary)]">No jobs match &quot;{searchQuery}&quot;</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {jobGroups.map((group, index) => (
                            <div
                                key={group.jobId}
                                onClick={() => handleCardClick(group)}
                                className={`${styles.cardWrapper} cursor-pointer`}
                                style={{ "--border-color": "var(--primary)", animationDelay: `${index * 50}ms` } as React.CSSProperties}
                            >
                                <div className={`${styles.innerCard} group relative`}>
                                    {/* Icon + version badge */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="relative">
                                            <div className="absolute inset-0 rounded-xl bg-[var(--primary)] opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
                                            <div className="relative p-3 rounded-xl bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 transition-colors">
                                                <FileText className="h-5 w-5 text-[var(--primary)]" />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {group.resumes.length > 1 && (
                                                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] text-[11px] font-bold">
                                                    <Layers className="h-3 w-3" />
                                                    {group.resumes.length} versions
                                                </span>
                                            )}
                                            <div className="p-1.5 rounded-lg text-gray-500 group-hover:text-[var(--primary)] group-hover:bg-[var(--primary)]/10 transition-all">
                                                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* JD Title — primary heading */}
                                    <div className="flex-1 min-w-0 mb-3">
                                        <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors leading-snug line-clamp-2">
                                            {group.jobTitle}
                                        </h3>
                                        <div className="flex items-center gap-1.5 mt-1.5">
                                            <Building2 className="h-3 w-3 text-[var(--text-secondary)] shrink-0" />
                                            <span className="text-xs text-[var(--text-secondary)] truncate">{group.company}</span>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                                            <Clock className="h-3 w-3" />
                                            <span>Latest: {formatDate(group.latestDate)}</span>
                                        </div>
                                        <span className="text-[10px] text-[var(--primary)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                            {group.resumes.length > 1 ? "View versions →" : "Open →"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Version Picker Modal ────────────────────────────────────────────
                Rendered OUTSIDE the animate-slide-down div.
                CSS transform on that ancestor breaks position:fixed children
                by making them relative to the transformed box instead of viewport.
            ─────────────────────────────────────────────────────────────────── */}
            {openJobId && activeGroup && (
                <>
                    {/* Backdrop — separate from panel so layout overflow can't affect centering */}
                    <div
                        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
                        onClick={() => setOpenJobId(null)}
                    />

                    {/* Panel — true viewport center via transform, unaffected by sidebar/overflow */}
                    <div
                        className="fixed z-[201] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                                   bg-[var(--sidebar-bg)] border border-[var(--border-color)]
                                   rounded-2xl shadow-2xl flex flex-col animate-scale-in"
                        style={{ width: "min(92vw, 620px)", maxHeight: "min(80vh, 580px)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between p-5 border-b border-[var(--border-color)] bg-[var(--primary)]/5 rounded-t-2xl shrink-0">
                            <div className="min-w-0 pr-4">
                                <h2 className="text-base font-bold text-[var(--foreground)] leading-snug line-clamp-2">
                                    {activeGroup.jobTitle}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Building2 className="h-3 w-3 text-[var(--text-secondary)] shrink-0" />
                                    <span className="text-xs text-[var(--text-secondary)] truncate">{activeGroup.company}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setOpenJobId(null)}
                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--foreground)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Sub-header */}
                        <div className="px-5 py-2.5 border-b border-[var(--border-color)]/50 shrink-0">
                            <p className="text-xs text-[var(--text-secondary)] font-medium">
                                {activeGroup.resumes.length} saved version{activeGroup.resumes.length !== 1 ? "s" : ""} — newest first
                            </p>
                        </div>

                        {/* Scrollable version list */}
                        <div className="divide-y divide-[var(--border-color)]/60 overflow-y-auto flex-1">
                            {activeGroup.resumes
                                .slice()
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .map((resume) => (
                                    <div
                                        key={resume.id}
                                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--primary)]/5 transition-colors group cursor-pointer"
                                        onClick={() => {
                                            setOpenJobId(null);
                                            router.push(`/dashboard/jobs/${resume.jobId}?resumeId=${resume.id}`);
                                        }}
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                                            <FileText className="h-4 w-4 text-[var(--primary)]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors truncate">
                                                {resume.name}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                                {formatDate(resume.createdAt)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                onClick={(e) => promptDelete(e, resume.id)}
                                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                            <div className="p-1.5 rounded-lg text-[var(--text-secondary)] group-hover:text-[var(--primary)] group-hover:bg-[var(--primary)]/10 transition-all">
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-3 border-t border-[var(--border-color)]/50 flex justify-between items-center shrink-0 rounded-b-2xl">
                            <button
                                onClick={() => { setOpenJobId(null); router.push(`/dashboard/jobs/${activeGroup.jobId}`); }}
                                className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors"
                            >
                                Go to AI Studio →
                            </button>
                            <button
                                onClick={() => setOpenJobId(null)}
                                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--foreground)]/5 hover:bg-[var(--foreground)]/10 text-[var(--foreground)] transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}

            <CustomDialog
                {...dialogConfig}
                onClose={() => setDialogConfig((s) => ({ ...s, isOpen: false }))}
            />
        </>
    );
}
