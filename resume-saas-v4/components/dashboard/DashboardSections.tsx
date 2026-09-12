"use client";

import Link from "next/link";
import { ArrowRight, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";

/**
 * The building blocks the dashboard's lower half is made of. They live here so
 * the page itself stays a readable list of sections rather than 900 lines of
 * markup.
 */

export type Trend = { current: number; previous: number; change: number; percent: number };

export function Panel({
    title,
    subtitle,
    icon: Icon,
    action,
    children,
    className = "",
}: {
    title: string;
    subtitle?: string;
    icon: React.ElementType;
    /** Usually a "View all" link. */
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <section
            className={`flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-5 ${className}`}
        >
            <header className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                    <span className="grid place-items-center h-10 w-10 shrink-0 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                        <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-[15px] font-bold text-[var(--foreground)] leading-tight">{title}</h2>
                        {subtitle && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
                    </div>
                </div>
                {action}
            </header>
            <div className="flex-1 min-h-0">{children}</div>
        </section>
    );
}

export function PanelLink({ href, label = "View all" }: { href: string; label?: string }) {
    return (
        <Link
            href={href}
            className="shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline whitespace-nowrap"
        >
            {label}
        </Link>
    );
}

export function EmptyLine({ children }: { children: React.ReactNode }) {
    return (
        <p className="rounded-xl border border-dashed border-[var(--border-color)] px-4 py-6 text-center text-xs text-[var(--text-secondary)]">
            {children}
        </p>
    );
}

/** A row that reads icon · title · subtitle · trailing slot. */
export function Row({
    icon: Icon,
    title,
    subtitle,
    trailing,
    href,
    onClick,
    tint,
}: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    trailing?: React.ReactNode;
    href?: string;
    onClick?: () => void;
    /** Tailwind classes for the icon tile, when it should not be brand-coloured. */
    tint?: string;
}) {
    const inner = (
        <>
            <span
                className={`grid place-items-center h-9 w-9 shrink-0 rounded-lg ${tint ?? "bg-[var(--primary)]/10 text-[var(--primary)]"}`}
            >
                <Icon className="h-4 w-4" />
            </span>
            <span className="flex-1 min-w-0">
                <span className="block truncate text-[13px] font-bold text-[var(--foreground)]">{title}</span>
                {subtitle && <span className="block truncate text-[11px] text-[var(--text-secondary)] mt-0.5">{subtitle}</span>}
            </span>
            {trailing}
        </>
    );

    const shell =
        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-[var(--primary)]/6";

    if (href) return <Link href={href} className={shell}>{inner}</Link>;
    if (onClick) return <button onClick={onClick} className={shell}>{inner}</button>;
    return <div className={shell.replace(" hover:bg-[var(--primary)]/6", "")}>{inner}</div>;
}

export function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" | "bad" | "brand" }) {
    const tones = {
        neutral: "bg-[var(--foreground)]/8 text-[var(--text-secondary)]",
        good: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
        warn: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
        bad: "bg-red-500/12 text-red-600 dark:text-red-400",
        brand: "bg-[var(--primary)]/12 text-[var(--primary)]",
    };
    return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>{label}</span>;
}

export function Delta({ trend, suffix = "from last month" }: { trend?: Trend; suffix?: string }) {
    if (!trend) return null;
    const up = trend.change >= 0;
    return (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
            {up ? (
                <TrendingUp className="h-3 w-3 text-emerald-500" />
            ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                {up ? "+" : ""}
                {trend.change}
            </span>
            {suffix}
        </p>
    );
}

/** One column of the pipeline snapshot. */
export function PipelineColumn({
    label,
    count,
    icon: Icon,
    accent,
    children,
    href,
}: {
    label: string;
    count: number;
    icon: React.ElementType;
    accent: string;
    children: React.ReactNode;
    href: string;
}) {
    return (
        <div className="flex min-w-[250px] flex-col rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-3">
            <div className="flex items-center gap-2 mb-3">
                <span className={`grid place-items-center h-7 w-7 shrink-0 rounded-lg ${accent}`}>
                    <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-[var(--foreground)] leading-none">{label}</span>
                    <span className="block text-[10px] text-[var(--text-secondary)] mt-1">
                        {count} job{count !== 1 ? "s" : ""}
                    </span>
                </span>
            </div>
            <div className="flex-1 space-y-1.5">{children}</div>
            <Link
                href={href}
                className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-[var(--border-color)] py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
            >
                View all ({count}) <ArrowRight className="h-3 w-3" />
            </Link>
        </div>
    );
}

export function PipelineItem({ title, company, when, href }: { title: string; company: string; when: string; href: string }) {
    // The date sits under the text rather than beside it. These columns are a
    // quarter of a panel wide, and a trailing date left the title barely one
    // character across.
    return (
        <Link
            href={href}
            className="flex items-start gap-2 rounded-lg px-2 py-2 transition hover:bg-[var(--primary)]/8"
        >
            <span className="grid place-items-center h-7 w-7 shrink-0 rounded-lg bg-[var(--primary)]/10 text-[10px] font-bold text-[var(--primary)]">
                {(company || "?").trim().charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold leading-snug text-[var(--foreground)] line-clamp-2">{title}</span>
                <span className="block truncate text-[10px] text-[var(--text-secondary)] mt-0.5">{company}</span>
                <span className="block truncate text-[10px] text-[var(--text-secondary)]/80 mt-0.5">{when}</span>
            </span>
        </Link>
    );
}

export function ActionRow({ title, subtitle, icon: Icon, href }: { title: string; subtitle: string; icon: React.ElementType; href: string }) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3 rounded-xl border border-[var(--border-color)] px-3 py-2.5 transition hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
        >
            <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold text-[var(--foreground)]">{title}</span>
                <span className="block truncate text-[11px] text-[var(--text-secondary)]">{subtitle}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--primary)]" />
        </Link>
    );
}

/** Date tile used by the upcoming interviews and deadlines list. */
export function DateTile({ date }: { date: Date }) {
    return (
        <span className="grid h-11 w-11 shrink-0 place-content-center rounded-xl bg-[var(--primary)]/10 text-center text-[var(--primary)]">
            <span className="block text-[9px] font-bold uppercase leading-none">
                {date.toLocaleDateString("en-US", { month: "short" })}
            </span>
            <span className="block text-base font-bold leading-none mt-0.5">{date.getDate()}</span>
        </span>
    );
}
