"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    FileText,
    Loader2,
    ArrowUpRight,
    Briefcase,
    Clock,
    Sparkles,
    Search,
    Trash2,
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

export default function SavedResumesPage() {
    const router = useRouter();
    const [resumes, setResumes] = useState<SavedResume[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
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

    const filteredResumes = resumes.filter(
        (r) =>
            r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.job.company.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
        <div className="max-w-7xl mx-auto space-y-8 animate-slide-down">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--foreground)] mb-1">
                        Saved Resumes
                    </h1>
                    <p className="text-[var(--text-secondary)] text-sm">
                        {resumes.length} resume{resumes.length !== 1 ? "s" : ""} generated
                    </p>
                </div>

                {/* Search Bar */}
                {resumes.length > 0 && (
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                        <input
                            type="text"
                            placeholder="Search resumes..."
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
            ) : filteredResumes.length === 0 ? (
                <div className="text-center py-16">
                    <Search className="h-10 w-10 text-[var(--text-secondary)] mx-auto mb-4 opacity-50" />
                    <p className="text-[var(--text-secondary)]">No resumes match "{searchQuery}"</p>
                </div>
            ) : (
                /* Resume Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResumes.map((resume, index) => (
                        <div
                            key={resume.id}
                            onClick={() => router.push(`/dashboard/jobs/${resume.jobId}?resumeId=${resume.id}`)}
                            className={styles.cardWrapper}
                            style={{
                                "--border-color": "var(--primary)",
                                animationDelay: `${index * 60}ms`,
                                cursor: "pointer",
                            } as React.CSSProperties}
                        >
                            <div className={`${styles.innerCard} group`}>
                                {/* Top Row: Icon + Actions */}
                                <div className="flex items-start justify-between mb-5">
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-xl bg-[var(--primary)] opacity-20 blur-lg group-hover:opacity-40 transition-opacity" />
                                        <div className="relative p-3 rounded-xl bg-[var(--primary)]/10 group-hover:bg-[var(--primary)]/20 transition-colors">
                                            <FileText className="h-5 w-5 text-[var(--primary)]" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={(e) => promptDelete(e, resume.id)}
                                            className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete resume"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                        <div className="p-2 rounded-lg text-gray-500 group-hover:text-[var(--primary)] group-hover:bg-[var(--primary)]/10 transition-all">
                                            <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-[var(--foreground)] mb-1 group-hover:text-[var(--primary)] transition-colors truncate">
                                        {resume.name}
                                    </h3>
                                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] mb-4">
                                        <Clock className="h-3 w-3" />
                                        <span>{formatDate(resume.createdAt)}</span>
                                    </div>
                                </div>

                                {/* Job Badge */}
                                <div className="mt-auto pt-4 border-t border-[var(--border-color)]">
                                    <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                        <Briefcase className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
                                        <span className="truncate text-[var(--foreground)]">{resume.job.jobTitle}</span>
                                        <span className="text-[var(--text-secondary)]/50">•</span>
                                        <span className="truncate">{resume.job.company}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <CustomDialog
                {...dialogConfig}
                onClose={() => setDialogConfig(s => ({ ...s, isOpen: false }))}
            />
        </div>
    );
}
