"use client";

import React from "react";
import {
    Linkedin, ArrowRight, Search, Target, BarChart3, Zap, Info,
    Briefcase, GraduationCap, Sparkles, FolderKanban, CheckCircle2, AlertTriangle,
    FileText, Pencil, Layers, ListChecks, Plus,
} from "lucide-react";
import {
    profileFacts, improvements, readiness, roleMatches,
} from "@/lib/linkedin-report";

/**
 * The before/after report shown once a profile has been optimised.
 *
 * Every number on it is derived from the two profiles and the scores the
 * backend already returns — nothing here asks the model for a figure it could
 * make up. Where a section has nothing to say (no roles found, no measurable
 * changes) it is left out rather than shown empty.
 */

type Props = {
    currentScore: number;
    optimizedScore: number;
    currentScores: any;
    optimizedScores: any;
    currentProfile: any;
    optimizedProfile: any;
    missingKeywords?: string[];
    profileUrl?: string | null;
};

/** Reference labels, mapped onto the scores the backend computes. */
const METRICS = [
    { key: "keyword", label: "Search Visibility", icon: Search, blurb: "How easily recruiters can find you in search results." },
    { key: "semantic", label: "Role Alignment", icon: Target, blurb: "How well your profile matches your target roles." },
    { key: "impact", label: "Impact Strength", icon: BarChart3, blurb: "Use of achievements, results and quantifiable impact." },
    { key: "completeness", label: "Profile Completeness", icon: Zap, blurb: "All important sections filled and optimized." },
] as const;

const IMPROVEMENT_ICONS: Record<string, React.ElementType> = {
    "Keywords added": FileText,
    "Experience bullets strengthened": Pencil,
    "Achievements quantified": BarChart3,
    "Skills added": Layers,
    "Sections rewritten": ListChecks,
    "Missing section added": Plus,
};

const num = (v: unknown, fallback = 0) => (typeof v === "number" && isFinite(v) ? Math.round(v) : fallback);

export default function OptimizationReport({
    currentScore,
    optimizedScore,
    currentScores,
    optimizedScores,
    currentProfile,
    optimizedProfile,
    missingKeywords = [],
    profileUrl,
}: Props) {
    const before = Math.round(currentScore);
    const after = Math.round(optimizedScore);
    const delta = Math.max(0, after - before);

    const facts = profileFacts(currentProfile);
    const changes = improvements(currentProfile, optimizedProfile);
    const { items: readyItems, verdict } = readiness(optimizedScores, optimizedProfile || currentProfile, missingKeywords);
    const roles = roleMatches(optimizedProfile || currentProfile, optimizedScores);

    const tiles = [
        { icon: Briefcase, value: facts.targetRoles.length, label: "Target Roles", detail: facts.targetRoles.slice(0, 2).join(", ") },
        { icon: GraduationCap, value: facts.schools.length, label: "Schools", detail: facts.schools.slice(0, 2).join(", ") },
        {
            icon: Sparkles,
            value: facts.skills.length,
            label: "Key Skills",
            detail:
                facts.skills.slice(0, 3).join(", ") +
                (facts.skills.length > 3 ? ` +${facts.skills.length - 3} more` : ""),
        },
        { icon: FolderKanban, value: facts.projects.length, label: "Projects", detail: facts.projects.slice(0, 2).join(", ") },
    ].filter((t) => t.value > 0);

    return (
        <div className="space-y-4">
            {/* ── Header ── */}
            <div className="rounded-2xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-[#0a66c2] text-white flex items-center justify-center shrink-0">
                            <Linkedin className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
                                LinkedIn Profile Optimizer
                            </p>
                            <h2 className="text-xl font-bold text-[var(--foreground)] mt-0.5">
                                Current profile vs optimized profile
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                See how your profile improves after AI-powered optimization. These metrics show how well
                                your profile is discoverable, relevant and recruiter-friendly.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-2.5 shrink-0">
                        <span className="hidden sm:block text-[11px] font-semibold text-[var(--text-secondary)] px-1 max-w-[68px] leading-tight">
                            Overall Profile Score
                        </span>
                        <div className="text-center rounded-lg bg-[var(--background)] border border-[var(--border-color)] px-4 py-1.5 min-w-[76px]">
                            <p className="text-[10px] text-[var(--text-secondary)] font-semibold">Before</p>
                            <p className="text-2xl font-bold text-[var(--foreground)] leading-tight">{before}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                        <div className="text-center rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-4 py-1.5 min-w-[76px]">
                            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">After</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 leading-tight">{after}</p>
                        </div>
                        {delta > 0 && (
                            <span className="rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 text-xs font-bold">
                                +{delta}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── What the profile contains ── */}
            {tiles.length > 0 && (
                <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                    {tiles.map((t) => (
                        <div key={t.label} className="rounded-xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] p-3.5 flex items-start gap-3 shadow-sm">
                            <span className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                                <t.icon className="w-4.5 h-4.5" />
                            </span>
                            <div className="min-w-0">
                                <p className="text-lg font-bold text-[var(--foreground)] leading-none">{t.value}</p>
                                <p className="text-[11px] font-semibold text-[var(--foreground)] mt-1">{t.label}</p>
                                {t.detail && (
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate" title={t.detail}>
                                        {t.detail}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── Key metrics + recruiter readiness ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-4 items-start">
                <div className="rounded-2xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] p-4 sm:p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <h3 className="text-base font-bold text-[var(--foreground)]">Key Metrics</h3>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                How your profile performs across important areas
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)] shrink-0">
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[var(--border-color)]" /> Before
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" /> After
                            </span>
                        </div>
                    </div>

                    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                        {METRICS.map((m) => {
                            const b = num(currentScores?.[m.key]);
                            const a = num(optimizedScores?.[m.key], b);
                            const d = a - b;
                            const isPercent = m.key === "completeness";
                            return (
                                <div key={m.key} className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-3.5">
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                                            <m.icon className="w-3.5 h-3.5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[12.5px] font-bold text-[var(--foreground)] leading-tight">{m.label}</p>
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-[var(--text-secondary)] leading-snug mb-3 min-h-[30px]">{m.blurb}</p>

                                    <div className="flex items-baseline gap-1.5 mb-2 flex-wrap">
                                        <span className="text-lg font-bold text-[var(--text-secondary)]">{b}{isPercent ? "%" : ""}</span>
                                        <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
                                        <span className="text-lg font-bold text-[var(--primary)]">{a}{isPercent ? "%" : ""}</span>
                                        {d > 0 && (
                                            <span className="ml-auto text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                                ▲ +{d}{isPercent ? "%" : ""}
                                            </span>
                                        )}
                                    </div>

                                    <Bar value={b} tone="before" />
                                    <div className="h-1" />
                                    <Bar value={a} tone="after" />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="rounded-2xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] p-4 sm:p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-1.5">
                            Recruiter Readiness
                            <Info className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        </h3>
                        <span
                            className={`shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold ${
                                verdict === "Excellent"
                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                    : verdict === "Good"
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                        >
                            {verdict}
                        </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mb-4 leading-relaxed">
                        {verdict === "Excellent"
                            ? "Your profile is well optimized and ready to attract opportunities."
                            : "A few areas still need attention before recruiters see their best."}
                    </p>

                    <ul className="space-y-2.5 list-none m-0 p-0">
                        {readyItems.map((item) => (
                            <li key={item.label} className="flex items-start gap-2.5">
                                {item.ok ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-px" />
                                ) : (
                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-px" />
                                )}
                                <span className="text-xs text-[var(--foreground)] leading-snug">{item.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* ── What changed + role fit ── */}
            {(changes.length > 0 || roles.length > 0) && (
                <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
                    {changes.length > 0 && (
                        <div className="rounded-2xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] p-4 sm:p-5 shadow-sm">
                            <h3 className="text-base font-bold text-[var(--foreground)]">What We Improved</h3>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-4">
                                Specific changes made to your profile
                            </p>
                            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                                {changes.map((c) => {
                                    const Icon = IMPROVEMENT_ICONS[c.label] || Sparkles;
                                    return (
                                        <div key={c.label} className="flex items-start gap-2">
                                            <span className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                                                <Icon className="w-3.5 h-3.5" />
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-lg font-bold text-[var(--foreground)] leading-none">{c.count}</p>
                                                <p className="text-[11px] text-[var(--text-secondary)] leading-tight mt-1">{c.label}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {roles.length > 0 && (
                        <div className="rounded-2xl bg-[var(--sidebar-bg)] border border-[var(--border-color)] p-4 sm:p-5 shadow-sm">
                            <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-1.5">
                                Target Role Match
                                <Info className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 mb-4">
                                How well your profile fits different roles
                            </p>
                            <div className="space-y-3">
                                {roles.map((r) => (
                                    <div key={r.role}>
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                            <span className="text-xs font-semibold text-[var(--foreground)] truncate" title={r.role}>
                                                {r.role}
                                            </span>
                                            <span className="text-xs font-bold text-[var(--foreground)] shrink-0">{r.percent}%</span>
                                        </div>
                                        <Bar value={r.percent} tone="after" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function Bar({ value, tone }: { value: number; tone: "before" | "after" }) {
    const width = Math.max(0, Math.min(100, value));
    return (
        <div className="h-1.5 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.06] overflow-hidden">
            {/* The before fill needs to read against the track it sits on —
                --border-color is close enough to the track to vanish. */}
            <div
                className={`h-full rounded-full transition-[width] duration-700 ${
                    tone === "after" ? "bg-[var(--primary)]" : "bg-black/20 dark:bg-white/25"
                }`}
                style={{ width: `${width}%` }}
            />
        </div>
    );
}
