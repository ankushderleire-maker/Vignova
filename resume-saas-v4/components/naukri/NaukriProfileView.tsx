"use client";

import React from "react";
import {
    Award, Briefcase, Check, Copy, FileText, FolderKanban, GraduationCap, Languages, Link2, Sparkles, Target, Type, Wrench,
} from "lucide-react";
import { ACCOMPLISHMENT_KINDS, ACCOMPLISHMENT_LABELS, NAUKRI_LIMITS, type NaukriProfile } from "@/lib/naukri-profile";

/**
 * A Naukri profile laid out in the order naukri.com shows it, so each part
 * can be found and pasted back into the matching section there.
 */

type Props = {
    profile: NaukriProfile;
    /** The optimized version: copy buttons and Naukri's character limits. */
    editable?: boolean;
    /** Lower-cased skills the rewrite added, highlighted in the list. */
    addedSkills?: Set<string>;
    copiedText: string;
    onCopy: (text: string) => void;
};

export function CopyButton({ value, copiedText, onCopy }: { value: string; copiedText: string; onCopy: (text: string) => void }) {
    if (!value) return null;
    const copied = copiedText === value;
    return (
        <button
            type="button"
            onClick={() => onCopy(value)}
            className="inline-flex shrink-0 items-center gap-1 rounded border border-green-500/20 bg-green-500/10 px-2 py-1 text-[11px] font-semibold text-green-700 shadow-sm transition hover:bg-green-500/15 dark:text-green-400"
        >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
        </button>
    );
}

/** Characters used against Naukri's limit for the field. */
export function Limit({ value, max }: { value: string; max: number }) {
    return (
        <span className={`text-[10px] font-semibold ${value.length > max ? "text-red-500" : "text-[var(--text-secondary)]"}`}>
            {value.length}/{max}
        </span>
    );
}

function Card({ icon, title, action, children }: { icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                    <span className="text-[var(--primary)]">{icon}</span>
                    <span className="truncate">{title}</span>
                </h3>
                {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
            </div>
            {children}
        </section>
    );
}

const Empty = ({ children }: { children: React.ReactNode }) => <p className="text-xs italic text-[var(--text-secondary)]">{children}</p>;
const Body = ({ text }: { text: string }) => (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--foreground)]">{text}</p>
);
const join = (...parts: string[]) => parts.filter(Boolean).join(" \u00B7 ");
const icon = "h-4 w-4";

export default function NaukriProfileView({ profile, editable = false, addedSkills, copiedText, onCopy }: Props) {
    const copy = { copiedText, onCopy };
    const tools = (value: string, max: number) =>
        editable && value ? (
            <>
                <Limit value={value} max={max} />
                <CopyButton value={value} {...copy} />
            </>
        ) : null;
    const links = ACCOMPLISHMENT_KINDS.filter((kind) => profile.accomplishments[kind].length > 0);
    const career = Object.entries(profile.careerProfile);

    return (
        <div className="space-y-3">
            <section className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-base font-bold text-[var(--foreground)]">{profile.name || "Your Naukri profile"}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{join(profile.location, profile.experience, profile.noticePeriod)}</p>
                        {profile.lastUpdated && <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Naukri profile last updated {profile.lastUpdated}</p>}
                    </div>
                    {profile.profileCompleteness !== null && (
                        <span className="shrink-0 rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-bold text-[var(--primary)]">
                            {profile.profileCompleteness}% complete
                        </span>
                    )}
                </div>
            </section>

            <Card icon={<Type className={icon} />} title="Resume headline" action={tools(profile.headline, NAUKRI_LIMITS.headline)}>
                {profile.headline ? <Body text={profile.headline} /> : <Empty>No resume headline</Empty>}
            </Card>

            <Card
                icon={<Sparkles className={icon} />}
                title={`Key skills \u00B7 ${profile.keySkills.length}`}
                action={editable ? <CopyButton value={profile.keySkills.join(", ")} {...copy} /> : null}
            >
                {profile.keySkills.length ? (
                    <div className="flex flex-wrap gap-1.5">
                        {profile.keySkills.map((skill) => {
                            const added = addedSkills?.has(skill.toLowerCase());
                            return (
                                <span
                                    key={skill}
                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${added ? "border-green-500/40 bg-green-500/15 text-green-700 dark:text-green-400" : "border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)]"}`}
                                >
                                    {added ? `+ ${skill}` : skill}
                                </span>
                            );
                        })}
                    </div>
                ) : (
                    <Empty>No key skills</Empty>
                )}
            </Card>

            <Card icon={<Briefcase className={icon} />} title="Employment">
                {profile.employment.length ? (
                    <div className="divide-y divide-[var(--border-color)]">
                        {profile.employment.map((job, i) => (
                            <div key={i} className="py-3 first:pt-0 last:pb-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--foreground)]">{job.designation}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{join(job.company, job.employmentType, job.duration)}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">{tools(job.description, NAUKRI_LIMITS.jobProfile)}</div>
                                </div>
                                <div className="mt-2">{job.description ? <Body text={job.description} /> : <Empty>No job profile</Empty>}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Empty>No employment</Empty>
                )}
            </Card>

            <Card icon={<GraduationCap className={icon} />} title="Education">
                {profile.education.length ? (
                    <div className="space-y-2.5">
                        {profile.education.map((edu, i) => (
                            <div key={i}>
                                <p className="text-sm font-semibold text-[var(--foreground)]">{join(edu.degree, edu.specialization)}</p>
                                <p className="text-xs text-[var(--text-secondary)]">{join(edu.institute, edu.duration, edu.courseType)}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <Empty>No education</Empty>
                )}
            </Card>

            <Card icon={<Wrench className={icon} />} title="IT skills">
                {profile.itSkills.length ? (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[420px] text-left text-xs">
                            <thead className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                                <tr>
                                    {["Skills", "Version", "Last used", "Experience"].map((label) => (
                                        <th key={label} className="pb-2 pr-3 font-bold">{label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)] text-[var(--foreground)]">
                                {profile.itSkills.map((row, i) => (
                                    <tr key={i}>
                                        <td className="py-1.5 pr-3">{row.skills}</td>
                                        <td className="py-1.5 pr-3">{row.version || "-"}</td>
                                        <td className="py-1.5 pr-3">{row.lastUsed || "-"}</td>
                                        <td className="py-1.5">{row.experience || "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <Empty>No IT skills</Empty>
                )}
            </Card>

            <Card icon={<FolderKanban className={icon} />} title="Projects">
                {profile.projects.length ? (
                    <div className="divide-y divide-[var(--border-color)]">
                        {profile.projects.map((project, i) => (
                            <div key={i} className="py-3 first:pt-0 last:pb-0">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--foreground)]">{project.title}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{join(project.client, project.duration)}</p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">{tools(project.description, NAUKRI_LIMITS.projectDetails)}</div>
                                </div>
                                {project.description && (
                                    <div className="mt-2">
                                        <Body text={project.description} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <Empty>No projects yet. Recruiters see them on Naukri, so adding one or two helps.</Empty>
                )}
            </Card>

            <Card icon={<FileText className={icon} />} title="Profile summary" action={tools(profile.profileSummary, NAUKRI_LIMITS.profileSummary)}>
                {profile.profileSummary ? <Body text={profile.profileSummary} /> : <Empty>No profile summary</Empty>}
            </Card>

            {links.length > 0 && (
                <Card icon={<Award className={icon} />} title="Accomplishments">
                    <div className="space-y-3">
                        {links.map((kind) => (
                            <div key={kind}>
                                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{ACCOMPLISHMENT_LABELS[kind]}</p>
                                <ul className="space-y-1">
                                    {profile.accomplishments[kind].map((item, i) => (
                                        <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--foreground)]">
                                            <Link2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--text-secondary)]" />
                                            <span className="min-w-0 break-words">
                                                <span className="font-semibold">{item.title}</span>
                                                {item.url && (
                                                    <>
                                                        {" \u00B7 "}
                                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                                                            {item.url}
                                                        </a>
                                                    </>
                                                )}
                                                {item.description && <span className="text-[var(--text-secondary)]">{` \u00B7 ${item.description}`}</span>}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {career.length > 0 && (
                <Card icon={<Target className={icon} />} title="Career profile">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                        {career.map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-[11px] text-[var(--text-secondary)]">{label}</dt>
                                <dd className="text-xs font-semibold text-[var(--foreground)]">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </Card>
            )}

            {profile.languages.length > 0 && (
                <Card icon={<Languages className={icon} />} title="Languages">
                    <p className="text-xs text-[var(--foreground)]">{profile.languages.map((row) => join(row.language, row.proficiency)).join(", ")}</p>
                </Card>
            )}
        </div>
    );
}
