"use client";

import { useState, useEffect } from "react";
import { Search, MapPin, Loader2, FileText, Copy, CheckCircle2 } from "lucide-react";
import { CustomDialog } from "@/components/ui/CustomDialog";

type Job = {
    id: string;
    company: string;
    jobTitle: string;
    location?: string;
    jobUrl?: string;
    coverLetter?: string;
    createdAt: string;
};

export default function CoverLetterPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewingLetter, setViewingLetter] = useState<Job | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchJobs = async () => {
        try {
            const res = await fetch("/api/jobs");
            const json = await res.json();
            if (json.data) {
                setJobs(json.data.filter((j: Job) => !!j.coverLetter));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredJobs = jobs.filter((job) => {
        return (
            job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
            job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    return (
        <div className="w-full max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col space-y-6 animate-slide-down">
            {/* --- TOOLBAR --- */}
            <div className="flex flex-col md:flex-row gap-4 p-1 shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        placeholder="Search cover letters by company or role..."
                        className="w-full bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg pl-10 pr-4 py-2.5 text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-1 focus:ring-[var(--primary)]/50 transition"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* --- TABLE LIST VIEW --- */}
            <div className="flex-1 bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col shadow-2xl">
                <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">
                    <div className="col-span-5">Company & Role</div>
                    <div className="col-span-3">Location</div>
                    <div className="col-span-2 text-center">Job Post</div>
                    <div className="col-span-2 text-right">Generated</div>
                </div>

                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" /></div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                            <FileText className="h-10 w-10 mb-3 opacity-20" />
                            <p>No cover letters found.</p>
                            <p className="text-xs opacity-60 mt-2">Use the Vignova Extension to generate a cover letter.</p>
                        </div>
                    ) : (
                        filteredJobs.map((job) => (
                            <div
                                key={job.id}
                                onClick={() => setViewingLetter(job)}
                                className="grid grid-cols-12 gap-4 p-4 items-center border-b border-[var(--border-color)] hover:bg-black/5 dark:hover:bg-white/5 transition group relative cursor-pointer"
                            >
                                {/* Column 1: Info */}
                                <div className="col-span-5">
                                    <h3 className="font-bold text-[var(--foreground)] text-sm group-hover:text-[var(--primary)] transition-colors truncate">{job.jobTitle}</h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{job.company}</p>
                                </div>

                                {/* Column 2: Location */}
                                <div className="col-span-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                    <MapPin className="h-3.5 w-3.5 opacity-50" />
                                    <span className="truncate">{job.location || "Remote"}</span>
                                </div>

                                {/* Column 3: Link */}
                                <div className="col-span-2 flex justify-center">
                                    {job.jobUrl ? (
                                        <a
                                            href={job.jobUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                                            title="Open Job Posting"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                                        </a>
                                    ) : (
                                        <span className="text-[var(--text-secondary)]/50">-</span>
                                    )}
                                </div>

                                {/* Column 4: Date */}
                                <div className="col-span-2 text-right text-xs text-[var(--text-secondary)] font-mono">
                                    {new Date(job.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <CustomDialog
                isOpen={!!viewingLetter}
                title={`Cover Letter - ${viewingLetter?.company}`}
                description={
                    <div className="mt-4 w-full">
                        <div className="flex items-center justify-between mb-2 w-full">
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">For the role of {viewingLetter?.jobTitle}</span>
                            <button
                                onClick={() => handleCopy(viewingLetter?.coverLetter || "")}
                                className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
                            >
                                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? "Copied!" : "Copy text"}
                            </button>
                        </div>
                        <div className="p-4 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg max-h-[50vh] overflow-y-auto w-full text-sm whitespace-pre-wrap leading-relaxed custom-scrollbar text-[var(--foreground)] text-left">
                            {viewingLetter?.coverLetter}
                        </div>
                    </div>
                }
                onClose={() => setViewingLetter(null)}
                type="alert"
                confirmText="Close"
                className="!max-w-2xl w-full"
                descriptionClassName="!max-w-none w-full px-2"
            />
        </div>
    );
}
