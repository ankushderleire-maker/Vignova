"use client";

import { useId, useState } from "react";
import {
    Award,
    BarChart3,
    BookOpen,
    Briefcase,
    Building2,
    Check,
    Copy,
    ExternalLink,
    Eye,
    FileText,
    FolderKanban,
    Globe,
    GraduationCap,
    Heart,
    Sparkles,
    Star,
    Target,
    Trophy,
    UserCircle,
    Users,
} from "lucide-react";

/**
 * Renders a scraped LinkedIn profile the way LinkedIn itself lays it out, so
 * the user can see at a glance that we pulled the real thing. Every section is
 * omitted when the profile API returned nothing for it.
 *
 * Purely presentational — the page owns the fetch, the scoring and the AI
 * rewrite; this only draws whatever `profile` it is handed.
 */

// ── small building blocks ───────────────────────────────────────────────

/**
 * LinkedIn CDN URLs are signed and expire, so every remote image degrades to
 * its icon fallback instead of showing a broken-image glyph.
 */
function SafeImg({ src, alt, className }: { src?: string; alt?: string; className?: string }) {
    const [failed, setFailed] = useState(false);
    if (!src || failed) return null;
    return (
        <img
            src={src}
            alt={alt || ""}
            className={className}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
        />
    );
}

function LogoBox({
    src,
    alt,
    fallback,
    size = "md",
}: {
    src?: string;
    alt?: string;
    fallback: React.ReactNode;
    size?: "sm" | "md";
}) {
    const [failed, setFailed] = useState(false);
    const box = size === "sm" ? "w-8 h-8" : "w-12 h-12";
    const showImg = src && !failed;
    return (
        <div
            className={`${box} shrink-0 rounded overflow-hidden flex items-center justify-center ${
                showImg ? "bg-white" : "bg-[var(--sidebar-bg)] border border-[var(--border-color)]"
            }`}
        >
            {showImg ? (
                <img
                    src={src}
                    alt={alt || ""}
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => setFailed(true)}
                />
            ) : (
                fallback
            )}
        </div>
    );
}

/** One LinkedIn-style profile card. */
function Section({
    title,
    icon,
    action,
    children,
}: {
    title: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-[var(--background)] rounded-xl shadow-sm border border-[var(--border-color)] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2">
                    {icon && <span className="text-[var(--text-secondary)]">{icon}</span>}
                    {title}
                </h3>
                {action}
            </div>
            {children}
        </section>
    );
}

/** A logo + body row, divided like LinkedIn's list entries. */
function EntryRow({ logo, children }: { logo: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex gap-3 py-3.5 border-b border-[var(--border-color)] last:border-0 first:pt-0 last:pb-0">
            {logo}
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-[var(--text-secondary)] mt-0.5">{icon}</span>
            <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--foreground)] leading-none">{value}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">{label}</p>
            </div>
        </div>
    );
}

function Empty({ children }: { children: React.ReactNode }) {
    return <p className="text-xs text-[var(--text-secondary)]">{children}</p>;
}

/**
 * LinkedIn's profile photo frames. It ships exactly two: #OPENTOWORK (green)
 * and #HIRING (purple), and never both at once.
 */
const PHOTO_FRAMES = {
    openToWork: { label: "#OPENTOWORK", color: "#01754f" },
    hiring: { label: "#HIRING", color: "#5b2e91" },
} as const;

// Frame geometry, in the 0..100 viewBox laid over the avatar. Angles run from
// the positive x-axis with y pointing down, so 183° is 9 o'clock and 60° is
// 5 o'clock — the band runs between them, across the lower-left.
//
// LinkedIn ships the frame as a square PNG whose green fills the bottom-left
// corner behind an inner arc, then clips the whole photo to a circle. What
// survives that clip is a band whose outer edge IS the photo's rim, roughly a
// third of the radius thick, with the label nearly filling it end to end.
const FRAME_FROM = 183;   // 9 o'clock
const FRAME_TO = 60;      // 5 o'clock
const FRAME_R = 40;       // band centre line; width 16 spans r 32..48
const FRAME_W = 16;       // outer edge lands on the photo rim, inside our 3px ring
const FRAME_FONT = 11.5;   // cap height ~8.2, a little over half the band's thickness
const FRAME_TEXT_R = 44.1; // FRAME_R + capHeight/2, so the glyphs sit centred in the band
const FADE_STEPS = 10;    // stepped ramp past each end
const FADE_DEG = 1.5;

function polar(deg: number, r: number): [number, number] {
    const a = (deg * Math.PI) / 180;
    return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
}

/** Arc sweeping from the higher angle down to the lower one (sweep-flag 0). */
function arcPath(from: number, to: number, r: number): string {
    const [x1, y1] = polar(from, r);
    const [x2, y2] = polar(to, r);
    const large = from - to > 180 ? 1 : 0;
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/**
 * Draws one of those frames over the avatar.
 *
 * Two details worth keeping:
 *
 *  - The label rides on its own arc at a larger radius than the band. Text on
 *    a path sits its baseline on the path and grows inward, so sharing one
 *    radius would pin the letters against the band's inner edge and leave a
 *    thick empty margin outside them.
 *
 *  - The ends fade with a stepped opacity ramp rather than a gradient. SVG
 *    can't run a gradient along a curve; projecting the arc onto its own chord
 *    almost works, but that projection bunches up near the ends, so a label
 *    this size inevitably lands on top of the fade. Stepping in arc space
 *    keeps the fade strictly outside the solid stretch the label occupies.
 */
function PhotoFrame({ variant }: { variant: keyof typeof PHOTO_FRAMES }) {
    // Two frames on one page would otherwise share this id.
    const uid = useId().replace(/:/g, "");
    const { label, color } = PHOTO_FRAMES[variant];

    const fades: { d: string; opacity: number }[] = [];
    for (let i = 0; i < FADE_STEPS; i++) {
        const opacity = (FADE_STEPS - i) / (FADE_STEPS + 1);
        const spread = FADE_DEG * i;
        fades.push({
            d: arcPath(FRAME_FROM + spread + FADE_DEG, FRAME_FROM + spread, FRAME_R),
            opacity,
        });
        fades.push({
            d: arcPath(FRAME_TO - spread, FRAME_TO - spread - FADE_DEG, FRAME_R),
            opacity,
        });
    }

    return (
        <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full pointer-events-none"
            aria-hidden="true"
        >
            <g fill="none" stroke={color} strokeWidth={FRAME_W}>
                <path d={arcPath(FRAME_FROM, FRAME_TO, FRAME_R)} />
                {fades.map((f, i) => (
                    <path key={i} d={f.d} strokeOpacity={f.opacity} />
                ))}
            </g>
            <path
                id={`framePath-${uid}`}
                d={arcPath(FRAME_FROM, FRAME_TO, FRAME_TEXT_R)}
                fill="none"
            />
            <text fill="#ffffff" fontSize={FRAME_FONT} fontWeight="700">
                <textPath href={`#framePath-${uid}`} startOffset="50%" textAnchor="middle">
                    {label}
                </textPath>
            </text>
        </svg>
    );
}

function CopyBtn({
    text,
    copied,
    onCopy,
}: {
    text: string;
    copied: string;
    onCopy: (t: string) => void;
}) {
    return (
        <button
            onClick={() => onCopy(text)}
            className="shrink-0 inline-flex items-center gap-1 text-[11px] text-green-700 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition font-semibold bg-green-500/10 border border-green-500/20 px-2 py-1 rounded shadow-sm"
        >
            {copied === text ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
        </button>
    );
}

// ── the profile ─────────────────────────────────────────────────────────

type Skill = { name: string; endorsements?: string; positions?: string[] };

export type LinkedInProfileViewProps = {
    profile: any;
    /** "optimized" turns on the per-section copy buttons. */
    viewMode: "current" | "optimized";
    /** Skills as plain strings when the AI rewrite is being shown. */
    optimizedSkills?: string[] | null;
    copiedText: string;
    onCopy: (text: string) => void;
};

/** Counts used by the caller's "fetched from LinkedIn" summary. */
export function summarizeProfile(profile: any) {
    const len = (v: any) => (Array.isArray(v) ? v.length : 0);
    const skills = len(profile?.skillDetails) || len(profile?.skills);
    return [
        { label: "Roles", value: len(profile?.experience) },
        { label: "Schools", value: len(profile?.education) },
        { label: "Skills", value: skills },
        { label: "Certificates", value: len(profile?.certifications) },
        { label: "Projects", value: len(profile?.projects) },
        { label: "Languages", value: len(profile?.languages) },
    ].filter((c) => c.value > 0);
}

export default function LinkedInProfileView({
    profile: p,
    viewMode,
    optimizedSkills,
    copiedText,
    onCopy,
}: LinkedInProfileViewProps) {
    const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

    const experience = arr(p.experience);
    const education = arr(p.education);
    const certifications = arr(p.certifications);
    const projects = arr(p.projects);
    const volunteering = arr(p.volunteering);
    const publications = arr(p.publications);
    const courses = arr(p.courses);
    const awards = arr(p.honorsAndAwards);
    const patents = arr(p.patents);
    const organizations = arr(p.organizations);
    const interests = arr(p.interests);
    const topSkills: string[] = arr(p.topSkills);

    const languages = arr(p.languages)
        .map((l: any) => (typeof l === "string" ? { name: l, proficiency: "" } : l))
        .filter((l: any) => l?.name);

    const featured = p.featured && (p.featured.title || p.featured.imageUrl) ? p.featured : null;

    // The AI rewrite hands back plain strings; the scrape hands back objects
    // carrying endorsement counts. Render either shape.
    const skills: Skill[] =
        viewMode === "optimized" && optimizedSkills
            ? optimizedSkills.map((s) => ({ name: s }))
            : arr(p.skillDetails).length
              ? arr(p.skillDetails)
              : arr(p.skills).map((s: any) => (typeof s === "string" ? { name: s } : s));
    const canCopy = viewMode === "optimized";
    const experienceCopyText = experience
        .map((exp: any) => [exp.title, exp.company, exp.dateRange, exp.location, exp.description, exp.associatedSkills].filter(Boolean).join("\n"))
        .filter(Boolean)
        .join("\n\n");
    const educationCopyText = education
        .map((edu: any) => [edu.school, edu.degree, edu.dateRange, edu.description].filter(Boolean).join("\n"))
        .filter(Boolean)
        .join("\n\n");
    const skillsCopyText = skills.map((s) => s.name).filter(Boolean).join(", ");
    return (
        <div className="space-y-3 min-w-0">
            {/* ── Intro card ── */}
            <div className="bg-[var(--background)] rounded-xl shadow-sm border border-[var(--border-color)] overflow-hidden">
                <div className="h-[120px] sm:h-[180px] w-full relative bg-gradient-to-r from-[#0a66c2]/25 via-[#0a66c2]/10 to-[var(--sidebar-bg)]">
                    {p.coverImageUrl && (
                        <SafeImg src={p.coverImageUrl} alt="" className="w-full h-full object-cover" />
                    )}
                </div>

                <div className="px-4 sm:px-6 pb-5">
                    {/* Avatar, with LinkedIn's #OPENTOWORK ring when the profile has it on */}
                    <div className="relative -mt-[52px] sm:-mt-[72px] mb-3 w-[104px] h-[104px] sm:w-[148px] sm:h-[148px]">
                        <div className="absolute inset-0 rounded-full border-[3px] border-[var(--background)] bg-[var(--sidebar-bg)] overflow-hidden">
                            {p.photoUrl ? (
                                <SafeImg
                                    src={p.photoUrl}
                                    alt={p.name || "Profile"}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserCircle className="w-full h-full text-[var(--text-secondary)]" strokeWidth={1} />
                            )}
                        </div>
                        {/* LinkedIn shows one frame or the other, never both. */}
                        {p.openToWork ? (
                            <PhotoFrame variant="openToWork" />
                        ) : p.hiring ? (
                            <PhotoFrame variant="hiring" />
                        ) : null}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg sm:text-2xl font-semibold text-[var(--foreground)] leading-tight flex items-center gap-1.5 flex-wrap">
                                {p.name || "Your Name"}
                                {p.verified && (
                                    <svg
                                        className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--text-secondary)]"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        aria-label="Verified"
                                    >
                                        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.8 14.8L6 12.6l1.4-1.4 2.8 2.8 7.2-7.2 1.4 1.4-8.6 8.6z" />
                                    </svg>
                                )}
                                {p.premium && (
                                    <span className="inline-block w-3.5 h-3.5 rounded-[2px] bg-[#e7a33e]" title="Premium" />
                                )}
                            </h2>

                            <div className="mt-1 flex items-start gap-2">
                                <p className="text-sm text-[var(--foreground)] leading-snug flex-1">
                                    {p.headline || "Your Professional Headline"}
                                </p>
                                {canCopy && p.headline ? (
                                    <CopyBtn text={p.headline} copied={copiedText} onCopy={onCopy} />
                                ) : null}
                            </div>

                            <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                                {p.location || "Location"}
                                <span className="mx-1.5">·</span>
                                <a
                                    href={p.linkedinUrl || undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#0a66c2] font-semibold hover:underline"
                                >
                                    Contact info
                                </a>
                            </p>

                            <p className="text-xs mt-1 flex items-center gap-1.5 flex-wrap">
                                {!!p.connectionsCount && (
                                    <span className="text-[#0a66c2] font-semibold">
                                        {p.connectionsCount >= 500 ? "500+" : p.connectionsCount} connections
                                    </span>
                                )}
                                {!!p.followerCount && !!p.connectionsCount && (
                                    <span className="text-[var(--text-secondary)]">·</span>
                                )}
                                {!!p.followerCount && (
                                    <span className="text-[var(--text-secondary)] font-medium">
                                        {Number(p.followerCount).toLocaleString()} followers
                                    </span>
                                )}
                            </p>

                            {topSkills.length > 0 && (
                                <p className="text-xs text-[var(--text-secondary)] mt-2 flex items-start gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                    <span>
                                        <span className="font-semibold text-[var(--foreground)]">Top skills:</span>{" "}
                                        {topSkills.join(" · ")}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* Current company / school, like LinkedIn's intro-card side rail */}
                        {(p.currentCompany?.name || p.topEducation?.school) && (
                            <div className="shrink-0 md:w-[190px] space-y-2">
                                {p.currentCompany?.name && (
                                    <div className="flex items-center gap-2">
                                        <LogoBox
                                            src={p.currentCompany.logoUrl}
                                            alt={p.currentCompany.name}
                                            size="sm"
                                            fallback={<Briefcase className="w-4 h-4 text-[var(--text-secondary)]" />}
                                        />
                                        <span className="text-xs font-semibold text-[var(--foreground)] line-clamp-2">
                                            {p.currentCompany.name}
                                        </span>
                                    </div>
                                )}
                                {p.topEducation?.school && (
                                    <div className="flex items-center gap-2">
                                        <LogoBox
                                            src={p.topEducation.logoUrl}
                                            alt={p.topEducation.school}
                                            size="sm"
                                            fallback={<GraduationCap className="w-4 h-4 text-[var(--text-secondary)]" />}
                                        />
                                        <span className="text-xs font-semibold text-[var(--foreground)] line-clamp-2">
                                            {p.topEducation.school}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {p.openToWork && (
                        <div className="mt-4 p-3 rounded-lg bg-[#0a66c2]/10 border border-[#0a66c2]/20">
                            <p className="text-xs font-bold text-[var(--foreground)]">Open to work</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                {p.location ? `${p.location} · ` : ""}Actively looking for new opportunities
                            </p>
                        </div>
                    )}

                    {p.hiring && (
                        <div className="mt-4 p-3 rounded-lg bg-[#0a66c2]/10 border border-[#0a66c2]/20">
                            <p className="text-xs font-bold text-[var(--foreground)]">Hiring</p>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                {p.currentCompany?.name
                                    ? `Recruiting for ${p.currentCompany.name}`
                                    : "Actively recruiting for open roles"}
                            </p>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-4">
                        <span className="bg-[#0a66c2] text-white px-3.5 py-1 rounded-full font-semibold text-xs opacity-60">Open to</span>
                        <span className="text-[#0a66c2] border border-[#0a66c2] px-3.5 py-1 rounded-full font-semibold text-xs opacity-60">Add profile section</span>
                        <span className="text-[#0a66c2] border border-[#0a66c2] px-3.5 py-1 rounded-full font-semibold text-xs opacity-60">Enhance profile</span>
                        <span className="text-[var(--text-secondary)] border border-[var(--border-color)] px-3.5 py-1 rounded-full font-semibold text-xs opacity-60">Resources</span>
                    </div>
                </div>
            </div>

            {/* ── Reach ── */}
            {(!!p.followerCount || !!p.connectionsCount || !!p.registeredAt) && (
                <Section title="Reach" icon={<BarChart3 className="w-4 h-4" />}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {!!p.followerCount && (
                            <Stat
                                icon={<Users className="w-4 h-4" />}
                                value={Number(p.followerCount).toLocaleString()}
                                label="Followers"
                            />
                        )}
                        {!!p.connectionsCount && (
                            <Stat
                                icon={<Users className="w-4 h-4" />}
                                value={p.connectionsCount >= 500 ? "500+" : String(p.connectionsCount)}
                                label="Connections"
                            />
                        )}
                        {!!p.registeredAt && (
                            <Stat
                                icon={<Eye className="w-4 h-4" />}
                                value={String(p.registeredAt).slice(0, 4)}
                                label="On LinkedIn since"
                            />
                        )}
                    </div>
                </Section>
            )}

            {/* ── About ── */}
            <Section
                title="About"
                action={canCopy && p.about ? <CopyBtn text={p.about || ""} copied={copiedText} onCopy={onCopy} /> : null}
            >
                <p className="text-[13px] text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                    {p.about || "No About section found."}
                </p>
            </Section>

            {/* ── Featured ── */}
            {featured && (
                <Section title="Featured" icon={<Star className="w-4 h-4" />}>
                    <a href={featured.url || undefined} target="_blank" rel="noreferrer" className="flex gap-3 group">
                        {featured.imageUrl && (
                            <SafeImg
                                src={featured.imageUrl}
                                alt=""
                                className="w-24 h-16 rounded object-cover shrink-0 border border-[var(--border-color)]"
                            />
                        )}
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--foreground)] group-hover:underline">{featured.title}</p>
                            {featured.subtitle && (
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{featured.subtitle}</p>
                            )}
                        </div>
                    </a>
                </Section>
            )}

            {/* ── Experience ── */}
            <Section
                title="Experience"
                icon={<Briefcase className="w-4 h-4" />}
                action={canCopy && experienceCopyText ? <CopyBtn text={experienceCopyText} copied={copiedText} onCopy={onCopy} /> : null}
            >
                {experience.length > 0 ? (
                    <div>
                        {experience.map((exp: any, i: number) => (
                            <EntryRow
                                key={i}
                                logo={
                                    <LogoBox
                                        src={exp.companyLogoUrl}
                                        alt={exp.company}
                                        fallback={<Briefcase className="w-5 h-5 text-[var(--text-secondary)]" />}
                                    />
                                }
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <h4 className="text-sm font-semibold text-[var(--foreground)]">{exp.title}</h4>
                                    {canCopy && exp.description ? (
                                        <CopyBtn text={exp.description} copied={copiedText} onCopy={onCopy} />
                                    ) : null}
                                </div>
                                <p className="text-xs text-[var(--foreground)] mt-0.5">
                                    {exp.company}
                                    {exp.employmentType ? (
                                        <span className="text-[var(--text-secondary)]"> · {exp.employmentType}</span>
                                    ) : null}
                                </p>
                                {exp.dateRange && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{exp.dateRange}</p>}
                                {(exp.location || exp.workplaceType) && (
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {[exp.location, exp.workplaceType].filter(Boolean).join(" · ")}
                                    </p>
                                )}
                                {exp.description && (
                                    <div className="mt-2">
                                        <p className="text-[13px] text-[var(--foreground)] whitespace-pre-wrap leading-relaxed">
                                            {exp.description}
                                        </p>
                                    </div>
                                )}
                                {exp.associatedSkills && (
                                    <p className="text-xs font-medium text-[var(--foreground)] mt-2 flex items-start gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        <span>{exp.associatedSkills}</span>
                                    </p>
                                )}
                            </EntryRow>
                        ))}
                    </div>
                ) : (
                    <Empty>No experience found.</Empty>
                )}
            </Section>

            {/* ── Education ── */}
            <Section
                title="Education"
                icon={<GraduationCap className="w-4 h-4" />}
                action={canCopy && educationCopyText ? <CopyBtn text={educationCopyText} copied={copiedText} onCopy={onCopy} /> : null}
            >
                {education.length > 0 ? (
                    <div>
                        {education.map((edu: any, i: number) => (
                            <EntryRow
                                key={i}
                                logo={
                                    <LogoBox
                                        src={edu.schoolLogoUrl}
                                        alt={edu.school}
                                        fallback={<GraduationCap className="w-5 h-5 text-[var(--text-secondary)]" />}
                                    />
                                }
                            >
                                <h4 className="text-sm font-semibold text-[var(--foreground)]">{edu.school}</h4>
                                {edu.degree && <p className="text-xs text-[var(--foreground)] mt-0.5">{edu.degree}</p>}
                                {edu.dateRange && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{edu.dateRange}</p>}
                                {edu.description && (
                                    <p className="text-[13px] text-[var(--foreground)] mt-2 whitespace-pre-wrap leading-relaxed">
                                        {edu.description}
                                    </p>
                                )}
                                {edu.associatedSkills && (
                                    <p className="text-xs font-medium text-[var(--foreground)] mt-2 flex items-start gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        <span>{edu.associatedSkills}</span>
                                    </p>
                                )}
                            </EntryRow>
                        ))}
                    </div>
                ) : (
                    <Empty>No education found.</Empty>
                )}
            </Section>

            {/* ── Licenses & certifications ── */}
            {certifications.length > 0 && (
                <Section title="Licenses & certifications" icon={<Award className="w-4 h-4" />}>
                    {certifications.map((c: any, i: number) => (
                        <EntryRow
                            key={i}
                            logo={
                                <LogoBox
                                    src={c.logoUrl}
                                    alt={c.organization}
                                    fallback={<Award className="w-5 h-5 text-[var(--text-secondary)]" />}
                                />
                            }
                        >
                            <h4 className="text-sm font-semibold text-[var(--foreground)]">{c.name}</h4>
                            {c.organization && <p className="text-xs text-[var(--foreground)] mt-0.5">{c.organization}</p>}
                            {c.issueDate && <p className="text-xs text-[var(--text-secondary)] mt-0.5">Issued {c.issueDate}</p>}
                            {c.url && (
                                <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[var(--foreground)] border border-[var(--border-color)] rounded-full px-3 py-1 hover:bg-[var(--sidebar-bg)] transition"
                                >
                                    Show credential <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </EntryRow>
                    ))}
                </Section>
            )}

            {/* ── Projects ── */}
            {projects.length > 0 && (
                <Section title="Projects" icon={<FolderKanban className="w-4 h-4" />}>
                    {projects.map((pr: any, i: number) => (
                        <EntryRow
                            key={i}
                            logo={<LogoBox alt={pr.title} fallback={<FolderKanban className="w-5 h-5 text-[var(--text-secondary)]" />} />}
                        >
                            <h4 className="text-sm font-semibold text-[var(--foreground)]">{pr.title}</h4>
                            {pr.dateRange && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{pr.dateRange}</p>}
                            {pr.associatedWith && (
                                <p className="text-xs text-[var(--text-secondary)]">Associated with {pr.associatedWith}</p>
                            )}
                            {pr.description && (
                                <p className="text-[13px] text-[var(--foreground)] mt-2 whitespace-pre-wrap leading-relaxed">
                                    {pr.description}
                                </p>
                            )}
                            {pr.url && (
                                <a
                                    href={pr.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#0a66c2] hover:underline"
                                >
                                    View project <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </EntryRow>
                    ))}
                </Section>
            )}

            {/* ── Skills ── */}
            <Section
                title="Skills"
                icon={<Sparkles className="w-4 h-4" />}
                action={canCopy && skillsCopyText ? <CopyBtn text={skillsCopyText} copied={copiedText} onCopy={onCopy} /> : null}
            >
                {skills.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        {skills.map((s: Skill, i: number) => (
                            <div key={i} className="py-2 border-b border-[var(--border-color)] last:border-0">
                                <p className="text-[13px] font-semibold text-[var(--foreground)] leading-snug">{s.name}</p>
                                {(s.endorsements || (s.positions && s.positions.length > 0)) && (
                                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                                        {[
                                            s.endorsements ? `${s.endorsements} endorsements` : null,
                                            s.positions && s.positions.length ? s.positions[0] : null,
                                        ]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <Empty>No skills found.</Empty>
                )}
            </Section>

            {/* ── Languages ── */}
            {languages.length > 0 && (
                <Section title="Languages" icon={<Globe className="w-4 h-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        {languages.map((l: any, i: number) => (
                            <div key={i} className="py-2 border-b border-[var(--border-color)] last:border-0">
                                <p className="text-[13px] font-semibold text-[var(--foreground)]">{l.name}</p>
                                {l.proficiency && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{l.proficiency}</p>}
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── Honors & awards ── */}
            {awards.length > 0 && (
                <Section title="Honors & awards" icon={<Trophy className="w-4 h-4" />}>
                    {awards.map((a: any, i: number) => (
                        <EntryRow key={i} logo={<LogoBox alt={a.title} fallback={<Trophy className="w-5 h-5 text-[var(--text-secondary)]" />} />}>
                            <h4 className="text-sm font-semibold text-[var(--foreground)]">{a.title}</h4>
                            {(a.issuedBy || a.issuedAt) && (
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    {[a.issuedBy ? `Issued by ${a.issuedBy}` : null, a.issuedAt].filter(Boolean).join(" · ")}
                                </p>
                            )}
                            {a.description && (
                                <p className="text-[13px] text-[var(--foreground)] mt-2 whitespace-pre-wrap leading-relaxed">{a.description}</p>
                            )}
                        </EntryRow>
                    ))}
                </Section>
            )}

            {/* ── Publications ── */}
            {publications.length > 0 && (
                <Section title="Publications" icon={<FileText className="w-4 h-4" />}>
                    {publications.map((pub: any, i: number) => (
                        <EntryRow key={i} logo={<LogoBox alt={pub.title} fallback={<FileText className="w-5 h-5 text-[var(--text-secondary)]" />} />}>
                            <h4 className="text-sm font-semibold text-[var(--foreground)]">{pub.title}</h4>
                            {pub.publishedAt && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{pub.publishedAt}</p>}
                            {pub.description && (
                                <p className="text-[13px] text-[var(--foreground)] mt-2 whitespace-pre-wrap leading-relaxed">{pub.description}</p>
                            )}
                            {pub.url && (
                                <a
                                    href={pub.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-[#0a66c2] hover:underline"
                                >
                                    Show publication <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </EntryRow>
                    ))}
                </Section>
            )}

            {/* ── Patents ── */}
            {patents.length > 0 && (
                <Section title="Patents" icon={<FileText className="w-4 h-4" />}>
                    {patents.map((pt: any, i: number) => (
                        <EntryRow key={i} logo={<LogoBox alt={pt.title} fallback={<FileText className="w-5 h-5 text-[var(--text-secondary)]" />} />}>
                            <h4 className="text-sm font-semibold text-[var(--foreground)]">{pt.title}</h4>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                {[pt.number, pt.issuedAt].filter(Boolean).join(" · ")}
                            </p>
                            {pt.description && (
                                <p className="text-[13px] text-[var(--foreground)] mt-2 whitespace-pre-wrap leading-relaxed">{pt.description}</p>
                            )}
                        </EntryRow>
                    ))}
                </Section>
            )}

            {/* ── Courses ── */}
            {courses.length > 0 && (
                <Section title="Courses" icon={<BookOpen className="w-4 h-4" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                        {courses.map((c: any, i: number) => (
                            <div key={i} className="py-2 border-b border-[var(--border-color)] last:border-0">
                                <p className="text-[13px] font-semibold text-[var(--foreground)]">{c.title}</p>
                                {c.associatedWith && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{c.associatedWith}</p>}
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* ── Volunteering ── */}
            {volunteering.length > 0 && (
                <Section title="Volunteering" icon={<Heart className="w-4 h-4" />}>
                    {volunteering.map((v: any, i: number) => (
                        <EntryRow key={i} logo={<LogoBox alt={v.organization} fallback={<Heart className="w-5 h-5 text-[var(--text-secondary)]" />} />}>
                            <h4 className="text-sm font-semibold text-[var(--foreground)]">{v.role}</h4>
                            {v.organization && <p className="text-xs text-[var(--foreground)] mt-0.5">{v.organization}</p>}
                            {v.dateRange && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{v.dateRange}</p>}
                            {v.description && (
                                <p className="text-[13px] text-[var(--foreground)] mt-2 whitespace-pre-wrap leading-relaxed">{v.description}</p>
                            )}
                        </EntryRow>
                    ))}
                </Section>
            )}

            {/* ── Organizations ── */}
            {organizations.length > 0 && (
                <Section title="Organizations" icon={<Building2 className="w-4 h-4" />}>
                    {organizations.map((o: any, i: number) => (
                        <EntryRow
                            key={i}
                            logo={<LogoBox src={o.logoUrl} alt={o.name} fallback={<Building2 className="w-5 h-5 text-[var(--text-secondary)]" />} />}
                        >
                            <h4 className="text-sm font-semibold text-[var(--foreground)]">{o.name}</h4>
                            {o.positionHeld && <p className="text-xs text-[var(--foreground)] mt-0.5">{o.positionHeld}</p>}
                            {o.dateRange && <p className="text-xs text-[var(--text-secondary)] mt-0.5">{o.dateRange}</p>}
                            {o.description && (
                                <p className="text-[13px] text-[var(--foreground)] mt-2 whitespace-pre-wrap leading-relaxed">{o.description}</p>
                            )}
                        </EntryRow>
                    ))}
                </Section>
            )}

            {/* ── Interests ── */}
            {interests.length > 0 && (
                <Section title="Interests" icon={<Target className="w-4 h-4" />}>
                    <div className="space-y-4">
                        {interests.map((group: any, gi: number) => (
                            <div key={gi}>
                                {group.name && (
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
                                        {group.name}
                                    </p>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                                    {(group.items || []).map((it: any, ii: number) => (
                                        <div
                                            key={ii}
                                            className="flex items-center gap-2 py-2 border-b border-[var(--border-color)] last:border-0"
                                        >
                                            <LogoBox
                                                src={it.logoUrl}
                                                alt={it.title}
                                                size="sm"
                                                fallback={<Building2 className="w-4 h-4 text-[var(--text-secondary)]" />}
                                            />
                                            <div className="min-w-0">
                                                <p className="text-[13px] font-semibold text-[var(--foreground)] truncate">{it.title}</p>
                                                {it.subtitle && (
                                                    <p className="text-[11px] text-[var(--text-secondary)] truncate">{it.subtitle}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>
            )}
        </div>
    );
}
