"use client";

import React from "react";
import { Briefcase, Check, Copy, FileText, FolderKanban, GraduationCap, Sparkles, Type } from "lucide-react";
import { cleanSkills, sanitizeLinkedInProfile } from "@/lib/linkedin-skills";

/**
 * The previous and the optimized profile, section by section in one grid.
 *
 * Two full profile views next to each other drift out of line as soon as one
 * side has a longer About or an extra bullet, so comparing a role meant
 * scrolling each column on its own, and below the widest breakpoint the two
 * stacked into one long column. Here every section, and every role inside
 * Experience, is one row with the old version on the left and the new one on
 * the right, so scrolling moves both. Narrow screens scroll the grid sideways
 * instead of stacking it.
 */

type Props = {
    current: unknown;
    optimized: unknown;
    /** Skills as the AI rewrite returned them, when it did. */
    optimizedSkills?: string[] | null;
    copiedText: string;
    onCopy: (text: string) => void;
};

type Entry = { heading: string; meta: string; body: string; skills: string };
type EntryKind = "experience" | "education" | "projects";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const list = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value : []);
const joined = (...parts: string[]) => parts.filter(Boolean).join(" \u00B7 ");

function entriesOf(items: unknown, kind: EntryKind): Entry[] {
    return list(items).map((item) => {
        if (kind === "experience") {
            return {
                heading: joined(text(item?.title), text(item?.company)),
                meta: joined(text(item?.dateRange), text(item?.location)),
                body: text(item?.description),
                skills: text(item?.associatedSkills),
            };
        }
        if (kind === "education") {
            return {
                heading: text(item?.school),
                meta: joined(text(item?.degree), text(item?.dateRange)),
                body: text(item?.description),
                skills: text(item?.associatedSkills),
            };
        }
        return {
            heading: text(item?.title),
            meta: joined(text(item?.dateRange), text(item?.associatedWith)),
            body: text(item?.description),
            skills: cleanSkills(item?.skills).join(", "),
        };
    });
}

function CopyButton({ value, copiedText, onCopy }: { value: string; copiedText: string; onCopy: (text: string) => void }) {
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

function Placeholder({ children }: { children: React.ReactNode }) {
    return <p className="text-xs italic text-[var(--text-secondary)]">{children}</p>;
}

function Paragraph({ value, empty }: { value: string; empty: string }) {
    return value ? (
        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[var(--foreground)]">{value}</p>
    ) : (
        <Placeholder>{empty}</Placeholder>
    );
}

function EntryBody({ entry }: { entry?: Entry }) {
    if (!entry) return <Placeholder>Not in this version</Placeholder>;
    return (
        <div className="space-y-1.5">
            {entry.heading && <p className="text-sm font-semibold text-[var(--foreground)]">{entry.heading}</p>}
            {entry.meta && <p className="text-xs text-[var(--text-secondary)]">{entry.meta}</p>}
            {entry.body && (
                <p className="whitespace-pre-wrap break-words pt-1 text-[13px] leading-relaxed text-[var(--foreground)]">{entry.body}</p>
            )}
            {entry.skills && (
                <p className="flex items-start gap-1.5 pt-1 text-xs font-medium text-[var(--foreground)]">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{entry.skills}</span>
                </p>
            )}
        </div>
    );
}

function SkillChips({ skills, added }: { skills: string[]; added?: Set<string> }) {
    if (!skills.length) return <Placeholder>No skills</Placeholder>;
    return (
        <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => {
                const isNew = added?.has(skill.toLowerCase());
                return (
                    <span
                        key={skill}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                            isNew
                                ? "border-green-500/40 bg-green-500/15 text-green-700 dark:text-green-400"
                                : "border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)]"
                        }`}
                    >
                        {isNew ? `+ ${skill}` : skill}
                    </span>
                );
            })}
        </div>
    );
}

function Row({
    icon,
    title,
    before,
    after,
    copyValue,
    unchanged,
    copiedText,
    onCopy,
}: {
    icon: React.ReactNode;
    title: string;
    before: React.ReactNode;
    after: React.ReactNode;
    copyValue?: string;
    unchanged?: boolean;
    copiedText: string;
    onCopy: (text: string) => void;
}) {
    return (
        <section className="border-t border-[var(--border-color)] first:border-t-0">
            <div className="flex items-center gap-2 bg-[var(--sidebar-bg)] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                <span className="text-[var(--primary)]">{icon}</span>
                <span className="min-w-0 truncate">{title}</span>
                {unchanged && (
                    <span className="ml-auto shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal dark:bg-white/10">
                        No change
                    </span>
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
                        {copyValue ? <CopyButton value={copyValue} copiedText={copiedText} onCopy={onCopy} /> : null}
                    </div>
                    {after}
                </div>
            </div>
        </section>
    );
}

const ENTRY_SECTIONS: { kind: EntryKind; title: string; icon: React.ReactNode }[] = [
    { kind: "experience", title: "Experience", icon: <Briefcase className="h-3.5 w-3.5" /> },
    { kind: "education", title: "Education", icon: <GraduationCap className="h-3.5 w-3.5" /> },
    { kind: "projects", title: "Projects", icon: <FolderKanban className="h-3.5 w-3.5" /> },
];

export default function LinkedInSideBySide({ current, optimized, optimizedSkills, copiedText, onCopy }: Props) {
    const before = sanitizeLinkedInProfile(current) || {};
    const after = sanitizeLinkedInProfile(optimized) || {};

    const beforeSkills = cleanSkills(before.skills);
    const afterSkills = optimizedSkills?.length ? cleanSkills(optimizedSkills) : cleanSkills(after.skills);
    const had = new Set(beforeSkills.map((skill) => skill.toLowerCase()));
    const added = new Set(afterSkills.map((skill) => skill.toLowerCase()).filter((skill) => !had.has(skill)));
    const shared = { copiedText, onCopy };

    return (
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--background)] shadow-sm">
            <div className="overflow-x-auto">
                <div className="min-w-[680px]">
                    <Row
                        {...shared}
                        icon={<Type className="h-3.5 w-3.5" />}
                        title="Headline"
                        before={<Paragraph value={text(before.headline)} empty="No headline" />}
                        after={<Paragraph value={text(after.headline)} empty="No headline" />}
                        copyValue={text(after.headline)}
                        unchanged={text(before.headline) === text(after.headline)}
                    />
                    <Row
                        {...shared}
                        icon={<FileText className="h-3.5 w-3.5" />}
                        title="About"
                        before={<Paragraph value={text(before.about)} empty="No About section" />}
                        after={<Paragraph value={text(after.about)} empty="No About section" />}
                        copyValue={text(after.about)}
                        unchanged={text(before.about) === text(after.about)}
                    />
                    {ENTRY_SECTIONS.map(({ kind, title, icon }) => {
                        const was = entriesOf(before[kind], kind);
                        const now = entriesOf(after[kind], kind);
                        return Array.from({ length: Math.max(was.length, now.length) }, (_, i) => (
                            <Row
                                {...shared}
                                key={`${kind}-${i}`}
                                icon={icon}
                                title={`${title} \u00B7 ${now[i]?.heading || was[i]?.heading || i + 1}`}
                                before={<EntryBody entry={was[i]} />}
                                after={<EntryBody entry={now[i]} />}
                                copyValue={now[i]?.body}
                                unchanged={!!was[i] && !!now[i] && was[i].body === now[i].body && was[i].skills === now[i].skills}
                            />
                        ));
                    })}
                    <Row
                        {...shared}
                        icon={<Sparkles className="h-3.5 w-3.5" />}
                        title={`Skills \u00B7 ${afterSkills.length}${added.size ? ` (${added.size} added)` : ""}`}
                        before={<SkillChips skills={beforeSkills} />}
                        after={<SkillChips skills={afterSkills} added={added} />}
                        copyValue={afterSkills.join(", ")}
                        unchanged={added.size === 0 && afterSkills.length === beforeSkills.length}
                    />
                </div>
            </div>
        </div>
    );
}
