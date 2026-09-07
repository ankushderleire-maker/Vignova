"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Award,
    Briefcase,
    Building2,
    Check,
    Coins,
    Copy,
    Gift,
    GraduationCap,
    ListChecks,
    MapPin,
    Sparkles,
    Users,
} from "lucide-react";
import { formatWithParser, type FormattedJd, type JdEnvelope } from "@/lib/jobDescription";

/**
 * The structured job-description view, shared by the Preview JD modal and
 * Resume Studio so both read identically. The formatter agent supplies the
 * structure; `formatWithParser` stands in until it answers.
 */

export type JobLike = {
    id: string;
    company: string;
    jobTitle: string;
    location?: string | null;
    salary?: string | null;
    description?: string | null;
    source?: string;
    jobUrl?: string | null;
    sourceUrl?: string | null;
    createdAt?: string;
    formattedJd?: JdEnvelope | null;
};

const SKILLS_SHOWN = 7;

export function relativeDay(value?: string) {
    if (!value) return null;
    const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 30) return `${days} days ago`;
    return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Resolves the structured version of a posting.
 *
 * Jobs saved before the formatter existed — and any whose background run was
 * interrupted — are formatted on first open, then cached on the row.
 *
 * The "already requested" set is a ref, not state, on purpose: anything derived
 * from the response must stay out of the effect's dependency list, or the
 * effect re-arms itself and loops.
 */
export function useFormattedJd(job: JobLike | null) {
    const [fetched, setFetched] = useState<JdEnvelope | null>(null);
    const [formatting, setFormatting] = useState(false);
    const requestedRef = useRef<Set<string>>(new Set());

    const stored = job?.formattedJd;
    const jobId = job?.id;
    const hasDescription = Boolean(job?.description);
    // Only an AI result is final; a parser fallback is worth one more attempt.
    const storedIsFinal = stored?.status === "READY" && Boolean(stored?.data) && stored?.source === "ai";

    useEffect(() => {
        if (!jobId || !hasDescription || storedIsFinal) return;
        if (requestedRef.current.has(jobId)) return;
        requestedRef.current.add(jobId);

        let cancelled = false;
        setFormatting(true);
        fetch(`/api/jobs/${jobId}/format`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (!cancelled && data?.formattedJd) setFetched(data.formattedJd);
            })
            .catch(() => {
                requestedRef.current.delete(jobId);
            })
            .finally(() => {
                if (!cancelled) setFormatting(false);
            });

        return () => {
            cancelled = true;
        };
    }, [jobId, hasDescription, storedIsFinal]);

    const usable = (e?: JdEnvelope | null) => (e?.status === "READY" && e.data ? e : null);
    const ready = usable(fetched) || usable(stored);

    const jd: FormattedJd | null = useMemo(() => {
        if (ready?.data) return ready.data;
        if (!job?.description) return null;
        return formatWithParser(job.description, {
            company: job.company,
            location: job.location,
            salary: job.salary,
        }).data;
    }, [ready, job?.description, job?.company, job?.location, job?.salary]);

    return { jd, formatting };
}

export function BulletSection({
    title,
    icon: Icon,
    items,
}: {
    title: string;
    icon: React.ElementType;
    items: string[];
}) {
    if (!items.length) return null;
    return (
        <section className="pt-4 mt-4 border-t border-[var(--border-color)]">
            <h4 className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)] mb-2.5">
                <Icon className="w-4 h-4 text-[var(--primary)] shrink-0" />
                {title}
            </h4>
            <ul className="space-y-1.5">
                {items.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[var(--primary)] shrink-0" />
                        <span>{item}</span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export function KeyInfoCell({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2.5 min-w-0">
            <Icon className="w-4 h-4 text-[var(--text-secondary)] shrink-0 mt-0.5" />
            <div className="min-w-0">
                <p className="text-[11px] text-[var(--text-secondary)]">{label}</p>
                <p className="text-xs font-bold text-[var(--foreground)] leading-snug break-words mt-0.5">{value}</p>
            </div>
        </div>
    );
}

/** Builds the Key Information cells, skipping anything the posting didn't state. */
export function keyInfoCells(jd: FormattedJd | null, job: JobLike) {
    const key = jd?.keyInfo;
    const salary = key?.salary || job.salary || null;
    const location = key?.location || job.location || null;
    return [
        key?.jobType && { icon: Briefcase, label: "Job Type", value: key.jobType },
        location && { icon: MapPin, label: "Location", value: location },
        salary && { icon: Coins, label: "Salary", value: salary },
        key?.workMode && { icon: Users, label: "Work Mode", value: key.workMode },
        (key?.company || job.company) && { icon: Building2, label: "Company", value: key?.company || job.company },
        key?.experienceLevel && { icon: GraduationCap, label: "Experience", value: key.experienceLevel },
    ].filter(Boolean) as { icon: React.ElementType; label: string; value: string }[];
}

export function KeyInfoGrid({ cells }: { cells: ReturnType<typeof keyInfoCells> }) {
    if (!cells.length) return null;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cells.map((cell, i) => (
                <KeyInfoCell key={i} icon={cell.icon} label={cell.label} value={cell.value} />
            ))}
        </div>
    );
}

export function SkillChips({ skills }: { skills: string[] }) {
    const [expanded, setExpanded] = useState(false);
    if (!skills.length) return null;
    const shown = expanded ? skills : skills.slice(0, SKILLS_SHOWN);
    const hidden = skills.length - shown.length;

    return (
        <div className="flex flex-wrap gap-1.5">
            {shown.map((skill) => (
                <span
                    key={skill}
                    className="px-2.5 py-1 rounded-md bg-[var(--primary)]/8 border border-[var(--primary)]/20 text-[11px] font-medium text-[var(--primary)]"
                >
                    {skill}
                </span>
            ))}
            {hidden > 0 && (
                <button
                    onClick={() => setExpanded(true)}
                    className="px-2.5 py-1 rounded-md border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--foreground)] transition"
                >
                    +{hidden} more
                </button>
            )}
        </div>
    );
}

export function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <button
            onClick={() => {
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] text-[11px] font-semibold text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied" : "Copy"}
        </button>
    );
}

/** The full structured body: prose, bullet sections, key info and skills. */
export function JobDescriptionBody({ job, jd }: { job: JobLike; jd: FormattedJd | null }) {
    const cells = keyInfoCells(jd, job);

    if (!jd) {
        return <p className="text-[13px] text-[var(--text-secondary)]">No job description saved for this role.</p>;
    }

    return (
        <>
            <div className="flex items-center justify-between gap-3 mb-3">
                <h4 className="text-sm font-bold text-[var(--foreground)]">Job Description</h4>
                <CopyButton text={job.description || ""} />
            </div>

            <div className="space-y-2.5">
                {jd.overview.map((paragraph, i) => (
                    <p key={i} className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                        {paragraph}
                    </p>
                ))}
            </div>

            <BulletSection title="Responsibilities" icon={ListChecks} items={jd.responsibilities} />
            <BulletSection title="Requirements" icon={Award} items={jd.requirements} />
            <BulletSection title="Nice to have" icon={Sparkles} items={jd.niceToHave} />
            <BulletSection title="Benefits" icon={Gift} items={jd.benefits} />

            {cells.length > 0 && (
                <div className="pt-4 mt-4 border-t border-[var(--border-color)]">
                    <KeyInfoGrid cells={cells} />
                </div>
            )}

            {jd.skills.length > 0 && (
                <div className="pt-4 mt-4 border-t border-[var(--border-color)]">
                    <h4 className="text-sm font-bold text-[var(--foreground)] mb-2.5">Skills &amp; Keywords</h4>
                    <SkillChips skills={jd.skills} />
                </div>
            )}
        </>
    );
}
