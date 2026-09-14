"use client";

import React from "react";
import { Briefcase, FileText, FolderKanban, Sparkles, Type } from "lucide-react";
import { NAUKRI_LIMITS, type NaukriProfile } from "@/lib/naukri-profile";
import { CopyButton, Limit } from "./NaukriProfileView";

/**
 * The imported Naukri profile and its rewrite, one row per section Naukri lets
 * a user edit, so each role's job profile sits beside its new version and one
 * scroll moves both.
 */

type Props = { current: NaukriProfile; optimized: NaukriProfile; copiedText: string; onCopy: (text: string) => void };

const join = (...parts: string[]) => parts.filter(Boolean).join(" \u00B7 ");

function Paragraph({ value, empty }: { value?: string; empty: string }) {
    return value ? (
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--foreground)]">{value}</p>
    ) : (
        <p className="text-xs italic text-[var(--text-secondary)]">{empty}</p>
    );
}

function Chips({ skills, added }: { skills: string[]; added?: Set<string> }) {
    if (!skills.length) return <p className="text-xs italic text-[var(--text-secondary)]">No key skills</p>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => {
                const isNew = added?.has(skill.toLowerCase());
                return (
                    <span
                        key={skill}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${isNew ? "border-green-500/40 bg-green-500/15 text-green-700 dark:text-green-400" : "border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)]"}`}
                    >
                        {isNew ? `+ ${skill}` : skill}
                    </span>
                );
            })}
        </div>
    );
}

type RowProps = {
    icon: React.ReactNode;
    title: string;
    before: React.ReactNode;
    after: React.ReactNode;
    copyValue?: string;
    limit?: number;
    unchanged?: boolean;
    copiedText: string;
    onCopy: (text: string) => void;
};

function Row({ icon, title, before, after, copyValue, limit, unchanged, copiedText, onCopy }: RowProps) {
    return (
        <section className="border-t border-[var(--border-color)] first:border-t-0">
            <div className="flex items-center gap-2 bg-[var(--sidebar-bg)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                <span className="text-[var(--primary)]">{icon}</span>
                <span className="min-w-0 truncate">{title}</span>
                {unchanged && (
                    <span className="ml-auto shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal dark:bg-white/10">No change</span>
                )}
            </div>
            <div className="grid grid-cols-2 divide-x divide-[var(--border-color)]">
                <div className="min-w-0 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Before</p>
                    {before}
                </div>
                <div className="min-w-0 bg-green-50/70 p-4 dark:bg-emerald-950/20">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">After</p>
                        <div className="flex items-center gap-2">
                            {copyValue && limit ? <Limit value={copyValue} max={limit} /> : null}
                            {copyValue ? <CopyButton value={copyValue} copiedText={copiedText} onCopy={onCopy} /> : null}
                        </div>
                    </div>
                    {after}
                </div>
            </div>
        </section>
    );
}

export default function NaukriSideBySide({ current, optimized, copiedText, onCopy }: Props) {
    const had = new Set(current.keySkills.map((skill) => skill.toLowerCase()));
    const added = new Set(optimized.keySkills.map((skill) => skill.toLowerCase()).filter((skill) => !had.has(skill)));
    const shared = { copiedText, onCopy };
    const small = "h-3.5 w-3.5";

    return (
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--background)] shadow-sm">
            <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                    <Row {...shared} icon={<Type className={small} />} title="Resume headline"
                        before={<Paragraph value={current.headline} empty="No resume headline" />}
                        after={<Paragraph value={optimized.headline} empty="No resume headline" />}
                        copyValue={optimized.headline} limit={NAUKRI_LIMITS.headline}
                        unchanged={current.headline === optimized.headline} />
                    <Row {...shared} icon={<Sparkles className={small} />}
                        title={`Key skills \u00B7 ${optimized.keySkills.length}${added.size ? ` (${added.size} added)` : ""}`}
                        before={<Chips skills={current.keySkills} />}
                        after={<Chips skills={optimized.keySkills} added={added} />}
                        copyValue={optimized.keySkills.join(", ")}
                        unchanged={added.size === 0 && optimized.keySkills.length === current.keySkills.length} />
                    {current.employment.map((job, i) => (
                        <Row {...shared} key={`job-${i}`} icon={<Briefcase className={small} />}
                            title={`Employment \u00B7 ${join(job.designation, job.company)}`}
                            before={<Paragraph value={job.description} empty="No job profile" />}
                            after={<Paragraph value={optimized.employment[i]?.description} empty="No job profile" />}
                            copyValue={optimized.employment[i]?.description} limit={NAUKRI_LIMITS.jobProfile}
                            unchanged={job.description === (optimized.employment[i]?.description || "")} />
                    ))}
                    {current.projects.map((project, i) => (
                        <Row {...shared} key={`project-${i}`} icon={<FolderKanban className={small} />}
                            title={`Project \u00B7 ${project.title}`}
                            before={<Paragraph value={project.description} empty="No project details" />}
                            after={<Paragraph value={optimized.projects[i]?.description} empty="No project details" />}
                            copyValue={optimized.projects[i]?.description} limit={NAUKRI_LIMITS.projectDetails}
                            unchanged={project.description === (optimized.projects[i]?.description || "")} />
                    ))}
                    <Row {...shared} icon={<FileText className={small} />} title="Profile summary"
                        before={<Paragraph value={current.profileSummary} empty="No profile summary" />}
                        after={<Paragraph value={optimized.profileSummary} empty="No profile summary" />}
                        copyValue={optimized.profileSummary} limit={NAUKRI_LIMITS.profileSummary}
                        unchanged={current.profileSummary === optimized.profileSummary} />
                </div>
            </div>
        </div>
    );
}
