"use client";

import React from "react";
import { Briefcase, CalendarClock, Check, Copy, FileText, MapPin, Pencil, UserRound } from "lucide-react";
import {
    ACCOMPLISHMENT_KINDS, ACCOMPLISHMENT_LABELS, NAUKRI_LIMITS, type NaukriProfile,
} from "@/lib/naukri-profile";

/**
 * A Naukri profile drawn the way naukri.com draws it: the profile card with
 * the completeness ring, Quick links down the side, and one card per section
 * in Naukri's order. Anyone who knows their Naukri page can find each part
 * here, and paste it back into the same place there.
 */

const NAUKRI_PROFILE_URL = "https://www.naukri.com/mnjuser/profile";
const BLUE = "text-[#275df5] dark:text-[#8aa4ff]";

type Props = {
    profile: NaukriProfile;
    /** The optimized version: copy buttons and Naukri's limits instead of edit links. */
    editable?: boolean;
    /** Lower-cased skills the rewrite added, highlighted in the list. */
    addedSkills?: Set<string>;
    /** Quick links down the side. Off where two profiles sit next to each other. */
    quickLinks?: boolean;
    /** Keeps section ids unique when two profiles share a page. */
    idPrefix?: string;
    /** Index of the first project the rewrite added from the Master Profile. */
    newProjectsFrom?: number;
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

/** Naukri's pencil, which here opens the profile on Naukri to edit it. */
function EditOnNaukri({ label }: { label: string }) {
    return (
        <a href={NAUKRI_PROFILE_URL} target="_blank" rel="noopener noreferrer" aria-label={`Edit ${label} on Naukri`} title="Edit on Naukri" className="text-[var(--text-secondary)] transition hover:text-[var(--foreground)]">
            <Pencil className="h-3.5 w-3.5" />
        </a>
    );
}

function AddOnNaukri({ children }: { children: React.ReactNode }) {
    return (
        <a href={NAUKRI_PROFILE_URL} target="_blank" rel="noopener noreferrer" className={`text-sm font-semibold hover:underline ${BLUE}`}>
            {children}
        </a>
    );
}

function Card({ id, title, action, children }: { id: string; title: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <section id={id} className="scroll-mt-6 rounded-[20px] border border-[var(--border-color)] bg-[var(--background)] p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="flex min-w-0 items-center gap-2 text-base font-bold text-[var(--foreground)]">
                    <span className="truncate">{title}</span>
                </h3>
                {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
            </div>
            {children}
        </section>
    );
}

const Text = ({ value }: { value: string }) => (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--foreground)]">{value}</p>
);
const muted = "text-sm text-[var(--text-secondary)]";
const join = (...parts: string[]) => parts.filter(Boolean).join(" | ");

/** What Naukri would list under "Add missing details", worked out from the profile. */
function missingDetails(profile: NaukriProfile): string[] {
    return [
        !profile.headline && "Add resume headline",
        profile.keySkills.length < 5 && "Add more key skills",
        profile.employment.some((job) => !job.description) && "Add job profiles",
        !profile.projects.length && "Add projects",
        !profile.profileSummary && "Add profile summary",
        !profile.itSkills.length && "Add IT skills",
        !Object.keys(profile.careerProfile).length && "Add career profile",
    ].filter((item): item is string => Boolean(item));
}

export default function NaukriProfileView({ profile, editable = false, addedSkills, quickLinks = true, idPrefix = "naukri", newProjectsFrom, copiedText, onCopy }: Props) {
    const copy = { copiedText, onCopy };
    const id = (section: string) => `${idPrefix}-${section}`;
    const tools = (value: string, max: number, label: string) =>
        editable ? (
            value ? (
                <>
                    <Limit value={value} max={max} />
                    <CopyButton value={value} {...copy} />
                </>
            ) : null
        ) : (
            <EditOnNaukri label={label} />
        );
    const missing = missingDetails(profile);
    const completeness = profile.profileCompleteness;
    const ringColor = (completeness ?? 0) >= 80 ? "#2e9b5f" : (completeness ?? 0) >= 50 ? "#f5a623" : "#ef4444";
    const details = [
        { icon: MapPin, value: profile.location },
        { icon: Briefcase, value: profile.experience },
        { icon: CalendarClock, value: profile.noticePeriod },
    ].filter((item) => item.value);
    const hasLinks = ACCOMPLISHMENT_KINDS.some((kind) => profile.accomplishments[kind].length > 0);
    const sections = [
        { key: "headline", label: "Resume headline", empty: !profile.headline },
        { key: "skills", label: "Key skills", empty: !profile.keySkills.length },
        { key: "employment", label: "Employment", empty: !profile.employment.length },
        { key: "education", label: "Education", empty: !profile.education.length },
        { key: "it-skills", label: "IT skills", empty: !profile.itSkills.length },
        { key: "projects", label: "Projects", empty: !profile.projects.length },
        { key: "summary", label: "Profile summary", empty: !profile.profileSummary },
        { key: "accomplishments", label: "Accomplishments", empty: !hasLinks },
        { key: "career", label: "Career profile", empty: !Object.keys(profile.careerProfile).length },
        { key: "languages", label: "Languages", empty: !profile.languages.length },
    ];
    const scrollTo = (section: string) => document.getElementById(id(section))?.scrollIntoView({ behavior: "smooth", block: "start" });

    return (
        <div className="space-y-4 rounded-[24px] bg-[var(--sidebar-bg)] p-3 sm:p-4">
            <section
                className={`grid gap-5 rounded-[20px] border border-[var(--border-color)] bg-[var(--background)] p-5 shadow-sm sm:p-6 ${quickLinks ? "lg:grid-cols-[minmax(0,1fr)_260px]" : "2xl:grid-cols-[minmax(0,1fr)_240px]"}`}
            >
                <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative mx-auto h-28 w-28 shrink-0 sm:mx-0">
                        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="6" className="text-[var(--border-color)]" />
                            {completeness !== null && (
                                <circle cx="60" cy="60" r="54" fill="none" stroke={ringColor} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(completeness / 100) * 339.3} 339.3`} />
                            )}
                        </svg>
                        <div className="absolute inset-[12px] flex items-center justify-center rounded-full bg-[var(--sidebar-bg)] text-[var(--text-secondary)]">
                            <UserRound className="h-12 w-12" />
                        </div>
                        {completeness !== null && (
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full border border-[var(--border-color)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-bold" style={{ color: ringColor }}>
                                {completeness}%
                            </span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h2 className="truncate text-2xl font-bold text-[var(--foreground)]">{profile.name || "Your Naukri profile"}</h2>
                            {!editable && <EditOnNaukri label="profile" />}
                        </div>
                        {profile.lastUpdated && (
                            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                                Profile last updated - <span className="font-semibold text-[var(--foreground)]">{profile.lastUpdated}</span>
                            </p>
                        )}
                        {details.length > 0 && (
                            <div className="mt-4 grid gap-2.5 border-t border-[var(--border-color)] pt-4 sm:grid-cols-2">
                                {details.map(({ icon: Icon, value }) => (
                                    <p key={value} className="flex min-w-0 items-center gap-2 text-sm text-[var(--foreground)]">
                                        <Icon className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                                        <span className="truncate">{value}</span>
                                    </p>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                {missing.length > 0 && (
                    <div className="rounded-2xl bg-[#fff3e8] p-4 dark:bg-orange-500/10">
                        <ul className="space-y-3">
                            {missing.slice(0, 4).map((item) => (
                                <li key={item} className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[var(--text-secondary)] shadow-sm dark:bg-white/10">
                                        <FileText className="h-4 w-4" />
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                        <a href={NAUKRI_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="mt-4 block rounded-full bg-[#f05537] px-4 py-2 text-center text-sm font-bold text-white transition hover:opacity-90">
                            Add {missing.length} missing detail{missing.length === 1 ? "" : "s"}
                        </a>
                    </div>
                )}
            </section>

            <div className={quickLinks ? "grid items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]" : ""}>
                {quickLinks && (
                    <aside className="hidden rounded-[20px] border border-[var(--border-color)] bg-[var(--background)] p-5 shadow-sm lg:sticky lg:top-4 lg:block">
                        <h3 className="mb-3 text-base font-bold text-[var(--foreground)]">Quick links</h3>
                        <ul className="space-y-0.5">
                            {sections.map((section) => (
                                <li key={section.key}>
                                    <button
                                        type="button"
                                        onClick={() => scrollTo(section.key)}
                                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-black/5 dark:hover:bg-white/5"
                                    >
                                        {section.label}
                                        {section.empty && <span className={`text-xs font-semibold ${BLUE}`}>Add</span>}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>
                )}

                <div className="min-w-0 space-y-4">
                    <Card id={id("headline")} title="Resume headline" action={tools(profile.headline, NAUKRI_LIMITS.headline, "resume headline")}>
                        {profile.headline ? <Text value={profile.headline} /> : <AddOnNaukri>Add resume headline</AddOnNaukri>}
                    </Card>

                    <Card
                        id={id("skills")}
                        title="Key skills"
                        action={editable ? <CopyButton value={profile.keySkills.join(", ")} {...copy} /> : <EditOnNaukri label="key skills" />}
                    >
                        {profile.keySkills.length ? (
                            <div className="flex flex-wrap gap-2">
                                {profile.keySkills.map((skill) => {
                                    const added = addedSkills?.has(skill.toLowerCase());
                                    return (
                                        <span
                                            key={skill}
                                            className={`rounded-full border px-3 py-1.5 text-[13px] ${added ? "border-green-500/50 bg-green-500/10 font-semibold text-green-700 dark:text-green-400" : "border-[var(--border-color)] text-[var(--foreground)]"}`}
                                        >
                                            {added ? `+ ${skill}` : skill}
                                        </span>
                                    );
                                })}
                            </div>
                        ) : (
                            <AddOnNaukri>Add key skills</AddOnNaukri>
                        )}
                    </Card>

                    <Card id={id("employment")} title="Employment" action={editable ? undefined : <AddOnNaukri>Add employment</AddOnNaukri>}>
                        {profile.employment.length ? (
                            <div className="space-y-5">
                                {profile.employment.map((job, i) => (
                                    <div key={i}>
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                                                <span className="truncate">{job.designation}</span>
                                                {!editable && <EditOnNaukri label={job.designation || "employment"} />}
                                            </p>
                                            {editable && job.description && (
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <Limit value={job.description} max={NAUKRI_LIMITS.jobProfile} />
                                                    <CopyButton value={job.description} {...copy} />
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--foreground)]">{job.company}</p>
                                        <p className={muted}>{join(job.employmentType, job.duration)}</p>
                                        <div className="mt-2">
                                            {job.description ? <Text value={job.description} /> : <AddOnNaukri>Add job profile</AddOnNaukri>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <AddOnNaukri>Add employment</AddOnNaukri>
                        )}
                    </Card>

                    <Card id={id("education")} title="Education" action={editable ? undefined : <AddOnNaukri>Add education</AddOnNaukri>}>
                        {profile.education.length ? (
                            <div className="space-y-4">
                                {profile.education.map((edu, i) => (
                                    <div key={i}>
                                        <p className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                                            {[edu.degree, edu.specialization].filter(Boolean).join(" ")}
                                            {!editable && <EditOnNaukri label="education" />}
                                        </p>
                                        <p className="text-sm text-[var(--foreground)]">{edu.institute}</p>
                                        <p className={muted}>{join(edu.duration, edu.courseType)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <AddOnNaukri>Add education</AddOnNaukri>
                        )}
                    </Card>

                    <Card id={id("it-skills")} title="IT skills" action={editable ? undefined : <AddOnNaukri>Add details</AddOnNaukri>}>
                        {profile.itSkills.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[420px] text-left text-sm">
                                    <thead>
                                        <tr className="text-[var(--text-secondary)]">
                                            {["Skills", "Version", "Last used", "Experience"].map((label) => (
                                                <th key={label} className="pb-3 pr-4 font-medium">{label}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="text-[var(--foreground)]">
                                        {profile.itSkills.map((row, i) => (
                                            <tr key={i} className="border-t border-[var(--border-color)]">
                                                <td className="py-2.5 pr-4">{row.skills}</td>
                                                <td className="py-2.5 pr-4">{row.version || "-"}</td>
                                                <td className="py-2.5 pr-4">{row.lastUsed || "-"}</td>
                                                <td className="py-2.5">{row.experience || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <AddOnNaukri>Add IT skills</AddOnNaukri>
                        )}
                    </Card>

                    <Card id={id("projects")} title="Projects" action={editable ? undefined : <AddOnNaukri>Add project</AddOnNaukri>}>
                        {profile.projects.length ? (
                            <div className="space-y-5">
                                {profile.projects.map((project, i) => (
                                    <div key={i}>
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                                                <span className="truncate">{project.title}</span>
                                                {!editable && <EditOnNaukri label={project.title || "project"} />}
                                                {editable && newProjectsFrom !== undefined && i >= newProjectsFrom && (
                                                    <span className="shrink-0 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
                                                        New from Master Profile
                                                    </span>
                                                )}
                                            </p>
                                            {editable && project.description && (
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <Limit value={project.description} max={NAUKRI_LIMITS.projectDetails} />
                                                    <CopyButton value={project.description} {...copy} />
                                                </div>
                                            )}
                                        </div>
                                        <p className={muted}>{join(project.client, project.duration)}</p>
                                        {project.description && (
                                            <div className="mt-2">
                                                <Text value={project.description} />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={muted}>Stand out to employers by adding details about projects you have done so far.</p>
                        )}
                    </Card>

                    <Card id={id("summary")} title="Profile summary" action={tools(profile.profileSummary, NAUKRI_LIMITS.profileSummary, "profile summary")}>
                        {profile.profileSummary ? <Text value={profile.profileSummary} /> : <AddOnNaukri>Add profile summary</AddOnNaukri>}
                    </Card>

                    {(!editable || hasLinks) && (
                        <Card id={id("accomplishments")} title="Accomplishments">
                            <div className="space-y-5">
                                {ACCOMPLISHMENT_KINDS.filter((kind) => !editable || profile.accomplishments[kind].length > 0).map((kind) => (
                                    <div key={kind}>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm font-bold text-[var(--foreground)]">{ACCOMPLISHMENT_LABELS[kind]}</p>
                                            {!editable && <AddOnNaukri>Add</AddOnNaukri>}
                                        </div>
                                        {profile.accomplishments[kind].length ? (
                                            <ul className="mt-2 space-y-2">
                                                {profile.accomplishments[kind].map((item, i) => (
                                                    <li key={i} className="text-sm">
                                                        <p className="font-semibold text-[var(--foreground)]">{item.title}</p>
                                                        {item.url && (
                                                            <a href={item.url} target="_blank" rel="noopener noreferrer" className={`break-all font-semibold hover:underline ${BLUE}`}>
                                                                {item.url}
                                                            </a>
                                                        )}
                                                        {item.description && <p className={muted}>{item.description}</p>}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className={`mt-1 ${muted}`}>Nothing added yet</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card id={id("career")} title="Career profile" action={editable ? undefined : <EditOnNaukri label="career profile" />}>
                        {Object.keys(profile.careerProfile).length ? (
                            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                                {Object.entries(profile.careerProfile).map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-sm text-[var(--text-secondary)]">{label}</dt>
                                        <dd className="text-sm font-semibold text-[var(--foreground)]">{value}</dd>
                                    </div>
                                ))}
                            </dl>
                        ) : (
                            <AddOnNaukri>Add career profile</AddOnNaukri>
                        )}
                    </Card>

                    {(!editable || profile.languages.length > 0) && (
                        <Card id={id("languages")} title="Languages">
                            {profile.languages.length ? (
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-[var(--text-secondary)]">
                                            <th className="pb-3 pr-4 font-medium">Languages</th>
                                            <th className="pb-3 font-medium">Proficiency</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[var(--foreground)]">
                                        {profile.languages.map((row, i) => (
                                            <tr key={i} className="border-t border-[var(--border-color)]">
                                                <td className="py-2.5 pr-4">{row.language}</td>
                                                <td className="py-2.5">{row.proficiency || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <AddOnNaukri>Add languages</AddOnNaukri>
                            )}
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
