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
    job: {
        company: string;
        jobTitle: string;
    };
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
        type: 'alert' | 'confirm';
        title: string;
        description: string;
        variant: 'default' | 'destructive' | 'success';
        confirmText?: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: 'alert', title: '', description: '', variant: 'default' });

    useEffect(() => {
        const fetchResumes = async () => {
            try {
                const res = await fetch("/api/resumes");
                const json = await res.json();
                setResumes(json.data || []);
            } catch (error) {
                console.error("Failed to fetch resumes", error);
            } finally {
                setLoading(false);
            }
        };
        fetchResumes();
    }, []);

    // Filter by search
    const filteredResumes = useMemo(() =>
        resumes.filter(
            (r) =>
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.job.company.toLowerCase().includes(searchQuery.toLowerCase())
        ), [resumes, searchQuery]);

    // Group by jobId — newest resume first within each group
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
            if (new Date(resume.createdAt) > new Date(g.latestDate)) {
                g.latestDate = resume.createdAt;
            }
        });
        // Sort groups by latest resume date (newest first)
        return Array.from(map.values()).sort(
            (a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
        );
    }, [filteredResumes]);

    const activeGroup = jobGroups.find((g) => g.jobId === openJobId) ?? null;

    const promptDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDialogConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Delete Resume',
            description: 'Are you sure you want to delete this resume? This action cannot be undone.',
            variant: 'destructive',
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await fetch(`/api/resumes/${id}`, { method: "DELETE" });
                    setResumes((prev) => prev.filter((r) => r.id !== id));
                    // Close popup if the group becomes empty
                    const remaining = resumes.filter((r) => r.id !== id && r.jobId === openJobId);
                    if (remaining.length === 0) setOpenJobId(null);
                } catch (err) {
                    console.error("Failed to delete resume:", err);
                }
            }
        });
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
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
        <div className="max-w-7xl mx-auto space-y-6 animate-slide-down">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[var(--text-secondary)] text-sm">
                    {resumes.length} resume{resumes.length !== 1 ? "s" : ""} across{" "}
                    <span className="font-semibold text-[var(--foreground)]">{jobGroups.length}</span> job{jobGroups.length !== 1 ? "s" : ""}
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

            {/* Empty State */}
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
                                className="bg-[var(--primary)] hover:bg-[var(--primary)]/80 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:shadow-[var(--primary)]/20"
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
                /* Job Group Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {jobGroups.map((group, index) => (
                        <div
                            key={group.jobId}
                            onClick={() => handleCardClick(group)}
                            className={`${styles.cardWrapper} cursor-pointer`}
                            style={{
                                "--border-color": "var(--primary)",
                                animationDelay: `${index * 50}ms`,
                            } as React.CSSProperties}
                        >
                            <div className={`${styles.innerCard} group relative`}>

                                {/* Header row: icon + version badge */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-xl bg-[var(--primary)] opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
                                        <div className="relative p-3 rounded-xl bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 transition-colors">
                                            <FileText className="h-5 w-5 text-[var(--primary)]" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Version count badge */}
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

                                {/* JD Title — primary bold heading */}
                                <div className="flex-1 min-w-0 mb-3">
                                    <h3 className="text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors leading-snug line-clamp-2">
                                        {group.jobTitle}
                                    </h3>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <Building2 className="h-3 w-3 text-[var(--text-secondary)] shrink-0" />
                                        <span className="text-xs text-[var(--text-secondary)] truncate">{group.company}</span>
                                    </div>
                                </div>

                                {/* Footer: latest date + open hint */}
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

            {/* ── Version Picker Modal ─────────────────────────────────────── */}
            {openJobId && activeGroup && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => setOpenJobId(null)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Panel */}
                    <div
                        className="relative z-10 w-full max-w-md bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div className="flex items-start justify-between p-5 border-b border-[var(--border-color)] bg-[var(--primary)]/5">
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

                        {/* Version count sub-header */}
                        <div className="px-5 py-2.5 border-b border-[var(--border-color)]/50">
                            <p className="text-xs text-[var(--text-secondary)] font-medium">
                                {activeGroup.resumes.length} saved version{activeGroup.resumes.length !== 1 ? "s" : ""} — newest first
                            </p>
                        </div>

                        {/* Resume version list */}
                        <div className="divide-y divide-[var(--border-color)]/60 max-h-[60vh] overflow-y-auto">
                            {activeGroup.resumes
                                .slice()
                                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                .map((resume, idx) => (
                                    <div
                                        key={resume.id}
                                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--primary)]/5 transition-colors group cursor-pointer"
                                        onClick={() => {
                                            setOpenJobId(null);
                                            router.push(`/dashboard/jobs/${resume.jobId}?resumeId=${resume.id}`);
                                        }}
                                    >
                                        {/* Version icon */}
                                        <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                                            <FileText className="h-4 w-4 text-[var(--primary)]" />
                                        </div>

                                        {/* Name + date */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors truncate">
                                                {resume.name}
                                            </p>
                                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                                {formatDate(resume.createdAt)}
                                            </p>
                                        </div>

                                        {/* Actions */}
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

                        {/* Modal footer */}
                        <div className="px-5 py-3 border-t border-[var(--border-color)]/50 flex justify-between items-center bg-[var(--sidebar-bg)]">
                            <button
                                onClick={() => {
                                    setOpenJobId(null);
                                    router.push(`/dashboard/jobs/${activeGroup.jobId}`);
                                }}
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
                </div>
            )}

            <CustomDialog
                {...dialogConfig}
                onClose={() => setDialogConfig(s => ({ ...s, isOpen: false }))}
            />
        </div>
    );
}
