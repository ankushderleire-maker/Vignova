"use client";

import { useEffect, useState } from "react";
import {
    ArrowRight,
    BarChart3,
    Briefcase,
    CalendarDays,
    ExternalLink,
    FileText,
    ListChecks,
    Loader2,
    MapPin,
    Sparkles,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
    JobDescriptionBody,
    KeyInfoGrid,
    SkillChips,
    keyInfoCells,
    relativeDay,
    useFormattedJd,
    type JobLike,
} from "@/components/jobs/JobDetails";

const LOGO_TINTS = [
    "bg-blue-500/12 text-blue-600 dark:text-blue-400",
    "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400",
];

const STUDIO_STEPS = [
    { title: "Open in AI Studio", body: "This job description will be loaded automatically." },
    { title: "AI tailors your resume", body: "We match the job description against your Master Profile." },
    { title: "Review & download", body: "Edit, fine-tune and export your ATS-optimised resume." },
];

export function JobDescriptionModal({
    job,
    onClose,
    onOpenStudio,
}: {
    job: JobLike | null;
    onClose: () => void;
    onOpenStudio: (jobId: string) => void;
}) {
    const { jd, formatting, refining } = useFormattedJd(job);
    const [tab, setTab] = useState<"description" | "key" | "match">("description");

    useEffect(() => setTab("description"), [job?.id]);

    if (!job) return null;

    const name = (job.company || "?").trim();
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
    const tint = LOGO_TINTS[hash % LOGO_TINTS.length];

    const cells = keyInfoCells(jd, job);
    const location = jd?.keyInfo?.location || job.location || null;
    const originalUrl = job.jobUrl || job.sourceUrl || null;
    const saved = relativeDay(job.createdAt);

    const tabs = [
        { id: "description" as const, label: "Job Description", icon: FileText },
        { id: "key" as const, label: "Key Information", icon: ListChecks },
        { id: "match" as const, label: "Match insights", icon: BarChart3, badge: "New" },
    ];

    return (
        <Modal
            open
            size="xl"
            title={job.jobTitle}
            onClose={onClose}
            header={
                <div className="min-w-0 flex gap-3">
                    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold ${tint}`}>
                        {name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-[var(--foreground)]">{job.jobTitle}</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-0.5 truncate">{job.company}</p>
                        <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1.5 text-xs text-[var(--text-secondary)]">
                            {location && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5" /> {location}
                                </span>
                            )}
                            {jd?.keyInfo?.jobType && (
                                <span className="flex items-center gap-1.5">
                                    <Briefcase className="w-3.5 h-3.5" /> {jd.keyInfo.jobType}
                                </span>
                            )}
                            {saved && (
                                <span className="flex items-center gap-1.5">
                                    <CalendarDays className="w-3.5 h-3.5" /> Saved {saved}
                                </span>
                            )}
                            {formatting && (
                                <span className="flex items-center gap-1.5 text-[var(--primary)]">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Structuring…
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            }
        >
            <div className="flex items-center gap-1 border-b border-[var(--border-color)] -mt-1 mb-4">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => setTab(t.id)}
                        className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
                            tab === t.id
                                ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5 rounded-t-lg"
                                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        <t.icon className="w-4 h-4" />
                        {t.label}
                        {t.badge && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                {t.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_296px] gap-5 items-start">
                <div className="min-w-0 rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-4 sm:p-5">
                    {tab === "description" ? (
                        <JobDescriptionBody job={job} jd={jd} refining={refining} />
                    ) : tab === "key" ? (
                        <>
                            <h4 className="text-sm font-bold text-[var(--foreground)] mb-3">Key Information</h4>
                            {cells.length > 0 ? (
                                <KeyInfoGrid cells={cells} />
                            ) : (
                                <p className="text-[13px] text-[var(--text-secondary)]">
                                    This posting didn&apos;t state any of the usual details.
                                </p>
                            )}
                            {jd && jd.skills.length > 0 && (
                                <div className="pt-4 mt-4 border-t border-[var(--border-color)]">
                                    <h4 className="text-sm font-bold text-[var(--foreground)] mb-2.5">Skills &amp; Keywords</h4>
                                    <SkillChips skills={jd.skills} />
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <h4 className="text-sm font-bold text-[var(--foreground)] mb-1">Match insights</h4>
                            <p className="text-[13px] text-[var(--text-secondary)] mb-4">
                                These are the keywords this posting screens for. AI Studio scores them against your
                                Master Profile and shows which ones your resume is missing.
                            </p>
                            {jd && jd.skills.length > 0 ? (
                                <SkillChips skills={jd.skills} />
                            ) : (
                                <p className="text-[13px] text-[var(--text-secondary)]">
                                    No skills or keywords were named in this posting.
                                </p>
                            )}
                        </>
                    )}
                </div>

                <aside className="rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/15 p-4 space-y-4">
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex gap-2.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--foreground)]">Use your Master Profile</p>
                            <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                                AI will tailor the resume using your skills, experience and achievements.
                            </p>
                        </div>
                    </div>

                    <ol className="space-y-3">
                        {STUDIO_STEPS.map((step, i) => (
                            <li key={step.title} className="flex gap-2.5">
                                <div className="flex flex-col items-center shrink-0">
                                    <span className="w-6 h-6 rounded-full bg-[var(--primary)]/12 text-[var(--primary)] text-[11px] font-bold flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                    {i < STUDIO_STEPS.length - 1 && (
                                        <span className="w-px flex-1 mt-1 bg-[var(--border-color)]" />
                                    )}
                                </div>
                                <div className="min-w-0 pb-1">
                                    <p className="text-xs font-semibold text-[var(--foreground)]">{step.title}</p>
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                                        {step.body}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className="space-y-2">
                        <button
                            onClick={() => onOpenStudio(job.id)}
                            className="w-full h-11 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-sm"
                        >
                            <Sparkles className="w-4 h-4" /> Open in AI Studio <ArrowRight className="w-4 h-4" />
                        </button>
                        <p className="text-[11px] text-[var(--text-secondary)] text-center">
                            1 credit will be used for this generation
                        </p>

                        {/* Only rendered when we actually know where the posting lives. */}
                        {originalUrl && (
                            <a
                                href={originalUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="w-full h-10 rounded-xl border border-[var(--border-color)] bg-[var(--background)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> View on site
                            </a>
                        )}
                    </div>
                </aside>
            </div>
        </Modal>
    );
}

export default JobDescriptionModal;
