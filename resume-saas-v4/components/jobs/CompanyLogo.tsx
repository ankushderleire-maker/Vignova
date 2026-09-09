"use client";

import { useMemo, useState } from "react";

/**
 * A company's logo, falling back to a tinted initial tile.
 *
 * Logos come through our own /api/company-logo, not straight from Google. That
 * keeps the user's job list out of a third party's logs, and — the reason it is
 * a proxy at all — lets the server turn Google's "404 with a generic globe in
 * the body" into a bodyless 404, so the initials show instead of a globe.
 * Pass `logos={false}` to opt a surface out entirely.
 *
 * There is no logo API here that takes a company *name*, so the domain has to
 * be worked out: the job's own URL when it points at a company careers site,
 * otherwise a guess from the name. A wrong guess simply 404s and the initials
 * show, which is why the fallback matters more than the hit rate.
 */

const TINTS = [
    "bg-violet-500/12 text-violet-600 dark:text-violet-400",
    "bg-blue-500/12 text-blue-600 dark:text-blue-400",
    "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
    "bg-amber-500/12 text-amber-600 dark:text-amber-400",
    "bg-rose-500/12 text-rose-600 dark:text-rose-400",
    "bg-cyan-500/12 text-cyan-600 dark:text-cyan-400",
];

/** Hosts that are job boards, not the employer — their favicon is useless here. */
const JOB_BOARDS = [
    "linkedin.com", "indeed.com", "glassdoor.com", "monster.com", "ziprecruiter.com",
    "totaljobs.com", "reed.co.uk", "irishjobs.ie", "jobs.ie", "seek.com",
    "greenhouse.io", "lever.co", "workday.com", "myworkdayjobs.com", "ashbyhq.com",
    "smartrecruiters.com", "workable.com", "icims.com", "bamboohr.com", "breezy.hr",
    "google.com", "bing.com",
];

/** Suffixes that are legal form, not part of the name a domain would use. */
const SUFFIXES = /\b(limited|ltd|llc|inc|incorporated|plc|gmbh|bv|nv|sa|ag|pty|co|corp|corporation|company|group|holdings|services|recruitment|solutions)\b/gi;

function hostOf(url?: string | null): string | null {
    if (!url) return null;
    try {
        return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return null;
    }
}

/** Best guess at the employer's domain, or null when there isn't one worth trying. */
export function companyDomain(company?: string | null, jobUrl?: string | null): string | null {
    const host = hostOf(jobUrl);
    if (host && !JOB_BOARDS.some((b) => host === b || host.endsWith("." + b))) {
        // A careers subdomain still resolves a favicon for the parent brand.
        return host;
    }

    const name = (company || "").trim();
    if (!name) return null;

    // Scraped postings put whole sentences in `company` — "Adega Ltd. Hybrid
    // work in Dublin", "Optum DUBLIN 8, County Dublin". A comma is the giveaway
    // that a location got appended, and nothing that long is a brand name.
    if (name.length > 40 || name.includes(",")) return null;

    const words = name
        .replace(SUFFIXES, " ")
        .replace(/[^a-zA-Z0-9\s-]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    // Judged after stripping legal suffixes, so "Ergo IT Recruitment Services"
    // is two words, not four.
    if (!words.length || words.length > 3) return null;

    const slug = words.join("").toLowerCase();
    return slug.length >= 2 ? `${slug}.com` : null;
}

export function CompanyLogo({
    company,
    jobUrl,
    size = 40,
    rounded = "rounded-lg",
    logos = true,
    className = "",
}: {
    company?: string | null;
    jobUrl?: string | null;
    size?: number;
    rounded?: string;
    /** Set false to keep this surface entirely local. */
    logos?: boolean;
    className?: string;
}) {
    const [failed, setFailed] = useState(false);

    const name = (company || "?").trim();
    const domain = useMemo(() => (logos ? companyDomain(company, jobUrl) : null), [company, jobUrl, logos]);

    const tint = useMemo(() => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
        return TINTS[hash % TINTS.length];
    }, [name]);

    const box = { width: size, height: size };

    if (domain && !failed) {
        return (
            <img
                src={`/api/company-logo?domain=${encodeURIComponent(domain)}`}
                alt=""
                width={size}
                height={size}
                loading="lazy"
                onError={() => setFailed(true)}
                style={box}
                className={`shrink-0 ${rounded} object-contain bg-white border border-[var(--border-color)] p-1 ${className}`}
            />
        );
    }

    return (
        <div
            style={box}
            className={`shrink-0 ${rounded} flex items-center justify-center font-bold ${tint} ${className}`}
        >
            <span style={{ fontSize: Math.max(10, Math.round(size * 0.32)) }}>{name.slice(0, 2).toUpperCase()}</span>
        </div>
    );
}

export default CompanyLogo;
