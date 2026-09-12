"use client";

import { useEffect, useMemo, useState } from "react";
import { StatsGraph } from "@/components/dashboard/StatsGraph";
import { StatCard } from "@/components/dashboard/StatCard";
import { SubscriptionCard } from "@/components/dashboard/SubscriptionCard";
import { ActionCard } from "@/components/dashboard/ActionCard";
import {
    ActionRow,
    Chip,
    DateTile,
    Delta,
    EmptyLine,
    Panel,
    PanelLink,
    PipelineColumn,
    PipelineItem,
    Row,
    type Trend,
} from "@/components/dashboard/DashboardSections";
import {
    Activity,
    Award,
    Bookmark,
    Briefcase,
    CalendarDays,
    Chrome,
    Clock,
    Download,
    FileText,
    Flag,
    Loader2,
    Mail,
    ScanLine,
    Send,
    Sparkles,
    Target,
    TrendingUp,
    UserCircle,
    Users,
} from "lucide-react";

interface DashboardStats {
    totalResumes: number;
    extensionResumes: number;
    totalJobs: number;
    jobStats?: { saved: number; applied: number; interviewing: number; offer: number };
    period: "day" | "week" | "month";
    stats: Array<{ date: string; total: number; manual: number; extension: number }>;
    trends?: { resumes: Trend; extensionResumes: Trend; jobs: Trend };
    thisWeek?: { applicationsSent: Trend; resumesCreated: Trend; interviewsBooked: number };
}

interface SubscriptionData {
    plan_type: string;
    credits_remaining: number;
    credits_total?: number;
}

type Job = {
    id: string;
    company: string;
    jobTitle: string;
    status: string;
    location?: string | null;
    coverLetter?: string | null;
    interviewAt?: string | null;
    deadlineAt?: string | null;
    createdAt: string;
    updatedAt?: string;
};

type SavedResume = {
    id: string;
    name: string;
    jobId: string;
    createdAt: string;
    job?: { company: string; jobTitle: string };
};

type AtsReport = {
    id: string;
    jobId: string;
    atsResult?: any;
    createdAt: string;
    job?: { jobTitle: string; company: string };
};

/**
 * Routes here answer with a plain-text body on failure ("Internal Error"), so
 * calling .json() on a non-ok response throws a SyntaxError and takes the page
 * down with it. Never throw: a section with no data renders its empty state.
 */
async function getJson(url: string) {
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    } catch {
        return null;
    }
}

const relative = (value: string) => {
    const hours = Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000);
    if (hours < 1) return "just now";
    if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
    return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function DashboardPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [resumes, setResumes] = useState<SavedResume[]>([]);
    const [reports, setReports] = useState<AtsReport[]>([]);
    const [period, setPeriod] = useState<"day" | "week" | "month">("day");
    const [loading, setLoading] = useState(true);

    // The chart is the only thing that depends on `period`, so it refetches
    // alone rather than reloading the whole page.
    useEffect(() => {
        getJson(`/api/dashboard/stats?period=${period}`)
            .then((data) => data && setStats(data))
            .finally(() => setLoading(false));
    }, [period]);

    useEffect(() => {
        const get = getJson;
        Promise.all([get("/api/subscription"), get("/api/jobs"), get("/api/resumes"), get("/api/ats-reports")]).then(
            ([sub, jobsJson, resumesJson, reportsJson]) => {
                if (sub) setSubscription(sub);
                if (jobsJson?.data) setJobs(jobsJson.data);
                if (resumesJson?.data) setResumes(resumesJson.data);
                if (Array.isArray(reportsJson)) setReports(reportsJson);
            }
        );
    }, []);

    // ── Derived views ─────────────────────────────────────────────────────

    const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);

    const pipeline = useMemo(() => {
        const bucket = (status: string) => jobs.filter((j) => (j.status || "SAVED").toUpperCase() === status);
        return {
            saved: [...bucket("SAVED"), ...bucket("TAILORING"), ...bucket("RESUME_READY")],
            applied: bucket("APPLIED"),
            interviewing: bucket("INTERVIEW"),
            offered: bucket("OFFER"),
        };
    }, [jobs]);

    /** Resumes, cover letters and ATS runs woven into one reverse-chronological feed. */
    const activity = useMemo(() => {
        const items: { id: string; kind: string; title: string; subtitle: string; at: string; chip: React.ReactNode; href: string }[] = [];

        resumes.forEach((r) =>
            items.push({
                id: `r-${r.id}`,
                kind: "resume",
                title: "Resume generated",
                subtitle: `${r.job?.jobTitle ?? r.name}${r.job?.company ? ` · ${r.job.company}` : ""}`,
                at: r.createdAt,
                chip: <Chip label="Completed" tone="good" />,
                href: `/dashboard/jobs/${r.jobId}?resumeId=${r.id}`,
            })
        );

        reports.forEach((report) => {
            const score = report.atsResult?.overall_ats_score;
            items.push({
                id: `a-${report.id}`,
                kind: "ats",
                title: "ATS check",
                subtitle: `${report.job?.jobTitle ?? "Job"}${report.job?.company ? ` · ${report.job.company}` : ""}`,
                at: report.createdAt,
                chip:
                    typeof score === "number" ? (
                        <Chip label={`Score: ${score}`} tone={score >= 80 ? "good" : score >= 50 ? "warn" : "bad"} />
                    ) : (
                        <Chip label="Completed" tone="good" />
                    ),
                href: `/dashboard/ats-score?jobId=${report.jobId}`,
            });
        });

        jobs
            .filter((j) => j.coverLetter)
            .forEach((j) =>
                items.push({
                    id: `c-${j.id}`,
                    kind: "letter",
                    title: "Cover letter created",
                    subtitle: `${j.jobTitle} · ${j.company}`,
                    at: j.updatedAt || j.createdAt,
                    chip: <Chip label="Completed" tone="good" />,
                    href: `/dashboard/jobs/${j.id}?doc=cover-letter`,
                })
            );

        return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 5);
    }, [resumes, reports, jobs]);

    /** Interviews and deadlines that have not passed, soonest first. */
    const upcoming = useMemo(() => {
        const now = Date.now();
        const items: { id: string; job: Job; at: string; type: "interview" | "deadline" }[] = [];
        jobs.forEach((job) => {
            if (job.interviewAt && new Date(job.interviewAt).getTime() >= now) {
                items.push({ id: `i-${job.id}`, job, at: job.interviewAt, type: "interview" });
            }
            if (job.deadlineAt && new Date(job.deadlineAt).getTime() >= now) {
                items.push({ id: `d-${job.id}`, job, at: job.deadlineAt, type: "deadline" });
            }
        });
        return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).slice(0, 4);
    }, [jobs]);

    /** The lowest-scoring recent report's own suggestions — real, not invented. */
    const atsOpportunities = useMemo(() => {
        const scored = reports
            .filter((r) => typeof r.atsResult?.overall_ats_score === "number")
            .sort((a, b) => a.atsResult.overall_ats_score - b.atsResult.overall_ats_score);
        const worst = scored[0];
        if (!worst) return null;
        const improvements: { category?: string; severity?: string; message: string }[] = worst.atsResult.improvements || [];
        return {
            jobId: worst.jobId,
            score: worst.atsResult.overall_ats_score as number,
            label: `${worst.job?.jobTitle ?? "Job"}${worst.job?.company ? ` · ${worst.job.company}` : ""}`,
            items: improvements.slice(0, 5),
        };
    }, [reports]);

    /** Nudges derived from what the account is actually missing. */
    const recommendations = useMemo(() => {
        // Scraped postings sometimes stuff a whole sentence into `company`.
        const short = (value: string) => {
            const clean = (value || "").trim();
            return clean.length > 28 ? `${clean.slice(0, 28).trimEnd()}…` : clean || "this job";
        };
        const out: { title: string; subtitle: string; icon: React.ElementType; href: string }[] = [];
        const jobsWithResume = new Set(resumes.map((r) => r.jobId));
        const jobsWithReport = new Set(reports.map((r) => r.jobId));

        const savedWithoutResume = pipeline.saved.find((j) => !jobsWithResume.has(j.id));
        if (savedWithoutResume) {
            out.push({
                title: "Generate resume for a saved job",
                subtitle: `Create a tailored resume for ${short(savedWithoutResume.company)}`,
                icon: Sparkles,
                href: `/dashboard/jobs/${savedWithoutResume.id}`,
            });
        }

        const resumeWithoutReport = resumes.find((r) => !jobsWithReport.has(r.jobId));
        if (resumeWithoutReport) {
            out.push({
                title: "Run an ATS score check",
                subtitle: "See how your resume performs for the target role",
                icon: ScanLine,
                href: `/dashboard/ats-score?jobId=${resumeWithoutReport.jobId}&resumeId=${resumeWithoutReport.id}`,
            });
        }

        const jobWithoutLetter = [...pipeline.applied, ...pipeline.saved].find((j) => !j.coverLetter);
        if (jobWithoutLetter) {
            out.push({
                title: "Create a cover letter",
                subtitle: `Write a tailored letter for ${short(jobWithoutLetter.company)}`,
                icon: Mail,
                href: `/dashboard/jobs/${jobWithoutLetter.id}?doc=cover-letter`,
            });
        }

        const interviewingWithoutDate = pipeline.interviewing.find((j) => !j.interviewAt);
        if (interviewingWithoutDate) {
            out.push({
                title: "Add your interview date",
                subtitle: `${short(interviewingWithoutDate.company)} is at interview stage`,
                icon: CalendarDays,
                href: "/dashboard/jobs",
            });
        }

        out.push({
            title: "Complete your master profile",
            subtitle: "Better resume results come from more detail",
            icon: UserCircle,
            href: "/dashboard/profile",
        });

        return out.slice(0, 4);
    }, [pipeline, resumes, reports]);

    /** Newest resumes and cover letters, as things you can open or take away. */
    const documents = useMemo(() => {
        const docs: { id: string; name: string; meta: string; at: string; href: string; icon: React.ElementType }[] = [];
        resumes.forEach((r) =>
            docs.push({
                id: `r-${r.id}`,
                name: `${r.job?.company ? `${r.job.company} — ` : ""}${r.name}`,
                meta: `Resume · ${relative(r.createdAt)}`,
                at: r.createdAt,
                href: `/dashboard/jobs/${r.jobId}?resumeId=${r.id}`,
                icon: FileText,
            })
        );
        jobs
            .filter((j) => j.coverLetter)
            .forEach((j) =>
                docs.push({
                    id: `c-${j.id}`,
                    name: `${j.company} — Cover letter`,
                    meta: `Cover letter · ${relative(j.updatedAt || j.createdAt)}`,
                    at: j.updatedAt || j.createdAt,
                    href: `/dashboard/jobs/${j.id}?doc=cover-letter`,
                    icon: Mail,
                })
            );
        return docs.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 4);
    }, [resumes, jobs]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    const week = stats?.thisWeek;

    return (
        <div id="tour-dashboard" className="space-y-4 w-full max-w-[1700px] mx-auto animate-slide-down">
            {stats && <StatsGraph data={stats.stats} period={period} onPeriodChange={setPeriod} />}

            {/* Counts */}
            <div id="tour-dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Resumes Created"
                    count={stats?.totalResumes || 0}
                    icon={FileText}
                    trend={stats?.trends?.resumes.percent}
                    color="var(--primary)"
                    footer={<Delta trend={stats?.trends?.resumes} />}
                />
                <StatCard
                    title="Extension Created CVs"
                    count={stats?.extensionResumes || 0}
                    icon={Chrome}
                    color="#8b5cf6"
                    footer={<Delta trend={stats?.trends?.extensionResumes} />}
                />
                <StatCard
                    title="Jobs Tracked"
                    count={stats?.totalJobs || 0}
                    icon={Briefcase}
                    color="#157bdc"
                    jobStats={stats?.jobStats}
                />
                <SubscriptionCard
                    plan={subscription?.plan_type || "Free"}
                    creditsRemaining={subscription?.credits_remaining ?? 3}
                    creditsTotal={subscription?.credits_total}
                />
            </div>

            {/* Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ActionCard
                    title="Master Profile"
                    description="Update your skills, experience, and career information"
                    icon={FileText}
                    href="/dashboard/profile"
                    color="var(--primary)"
                />
                <ActionCard
                    title="Generate Resume"
                    description="Create tailored resumes for your saved jobs"
                    icon={Chrome}
                    href="/dashboard/generator"
                    color="#157bdc"
                />
            </div>

            {/* Activity + pipeline */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                <Panel
                    className="xl:col-span-5"
                    icon={Clock}
                    title="Recent Activity"
                    subtitle="Your latest resume, ATS, and application activity"
                    action={<PanelLink href="/dashboard/resumes" />}
                >
                    {activity.length === 0 ? (
                        <EmptyLine>Nothing yet. Generate a resume to start your activity feed.</EmptyLine>
                    ) : (
                        <div className="space-y-1">
                            {activity.map((item) => (
                                <Row
                                    key={item.id}
                                    href={item.href}
                                    icon={item.kind === "ats" ? Activity : item.kind === "letter" ? Mail : FileText}
                                    title={item.title}
                                    subtitle={item.subtitle}
                                    trailing={
                                        <span className="flex shrink-0 items-center gap-2">
                                            <span className="hidden sm:block text-[11px] text-[var(--text-secondary)]">
                                                {relative(item.at)}
                                            </span>
                                            {item.chip}
                                        </span>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel
                    className="xl:col-span-7"
                    icon={Briefcase}
                    title="Job Pipeline Snapshot"
                    subtitle="Your job search at a glance"
                    action={<PanelLink href="/dashboard/jobs" />}
                >
                    <div className="grid grid-cols-2 2xl:grid-cols-4 gap-3 h-full">
                        {([
                            ["Saved", pipeline.saved, Bookmark, "bg-slate-500/12 text-slate-500 dark:text-slate-300", "SAVED"],
                            ["Applied", pipeline.applied, Send, "bg-blue-500/12 text-blue-600 dark:text-blue-400", "APPLIED"],
                            ["Interviewing", pipeline.interviewing, Users, "bg-amber-500/12 text-amber-600 dark:text-amber-400", "INTERVIEW"],
                            ["Offered", pipeline.offered, Award, "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400", "OFFER"],
                        ] as const).map(([label, list, icon, accent, status]) => (
                            <PipelineColumn
                                key={label}
                                label={label}
                                count={list.length}
                                icon={icon}
                                accent={accent}
                                href={`/dashboard/jobs?status=${status}`}
                            >
                                {list.length === 0 ? (
                                    <p className="px-2 py-3 text-center text-[10px] text-[var(--text-secondary)]">Nothing here yet.</p>
                                ) : (
                                    list.slice(0, 3).map((job) => (
                                        <PipelineItem
                                            key={job.id}
                                            title={job.jobTitle}
                                            company={job.company}
                                            when={relative(job.updatedAt || job.createdAt)}
                                            href={`/dashboard/jobs/${job.id}`}
                                        />
                                    ))
                                )}
                            </PipelineColumn>
                        ))}
                    </div>
                </Panel>
            </div>

            {/* Coaching row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Panel
                    icon={Target}
                    title="ATS Improvement Opportunities"
                    subtitle={atsOpportunities ? atsOpportunities.label : "Boost your ATS score"}
                    action={atsOpportunities ? <PanelLink href={`/dashboard/ats-score?jobId=${atsOpportunities.jobId}`} /> : undefined}
                >
                    {!atsOpportunities || atsOpportunities.items.length === 0 ? (
                        <EmptyLine>Run an ATS check on a resume and its suggestions will land here.</EmptyLine>
                    ) : (
                        <div className="space-y-1">
                            {atsOpportunities.items.map((item, index) => (
                                <Row
                                    key={index}
                                    icon={Target}
                                    title={item.category || "Improvement"}
                                    subtitle={item.message}
                                    trailing={
                                        <Chip
                                            label={item.severity || "tip"}
                                            tone={item.severity === "high" ? "bad" : item.severity === "medium" ? "warn" : "brand"}
                                        />
                                    }
                                />
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel
                    icon={CalendarDays}
                    title="Upcoming Interviews / Tasks"
                    subtitle="Stay prepared and never miss a deadline"
                    action={<PanelLink href="/dashboard/jobs" />}
                >
                    {upcoming.length === 0 ? (
                        <EmptyLine>
                            No interviews or deadlines scheduled. Add dates from the Job Tracker&apos;s Edit form.
                        </EmptyLine>
                    ) : (
                        <div className="space-y-2">
                            {upcoming.map((item) => {
                                const when = new Date(item.at);
                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] px-3 py-2.5"
                                    >
                                        <DateTile date={when} />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-bold text-[var(--foreground)]">{item.job.jobTitle}</p>
                                            <p className="truncate text-[11px] text-[var(--text-secondary)]">{item.job.company}</p>
                                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                                                <Clock className="h-3 w-3" />
                                                {when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                                            <Chip label={item.type === "interview" ? "Interview" : "Deadline"} tone={item.type === "interview" ? "brand" : "bad"} />
                                            <a
                                                href={item.type === "interview" ? `/dashboard/interview-prep?jobId=${item.job.id}` : `/dashboard/jobs/${item.job.id}`}
                                                className="rounded-lg border border-[var(--border-color)] px-2.5 py-1 text-[11px] font-semibold text-[var(--foreground)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                                            >
                                                {item.type === "interview" ? "Prep" : "View"}
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Panel>

                <Panel
                    icon={Sparkles}
                    title="Recommended Actions"
                    subtitle="Personalized for your job search"
                    action={<PanelLink href="/dashboard/jobs" label="See all" />}
                >
                    <div className="space-y-2">
                        {recommendations.map((item) => (
                            <ActionRow key={item.title} {...item} />
                        ))}
                    </div>
                </Panel>
            </div>

            {/* Documents + progress */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Panel
                    icon={FileText}
                    title="Recent Documents"
                    subtitle="Your latest resumes and cover letters"
                    action={<PanelLink href="/dashboard/resumes" />}
                >
                    {documents.length === 0 ? (
                        <EmptyLine>No documents yet.</EmptyLine>
                    ) : (
                        <div className="space-y-1">
                            {documents.map((doc) => (
                                <Row
                                    key={doc.id}
                                    href={doc.href}
                                    icon={doc.icon}
                                    title={doc.name}
                                    subtitle={doc.meta}
                                    trailing={
                                        <span className="shrink-0 rounded-lg border border-[var(--border-color)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
                                            Open
                                        </span>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </Panel>

                <Panel
                    icon={TrendingUp}
                    title="Your Progress This Week"
                    subtitle="Small steps lead to big opportunities"
                    action={<PanelLink href="/dashboard/jobs" />}
                >
                    <div className="grid grid-cols-3 gap-3">
                        {([
                            ["Applications sent", week?.applicationsSent.current ?? 0, week?.applicationsSent, Send],
                            ["Interviews booked", week?.interviewsBooked ?? 0, undefined, Users],
                            ["Resumes created", week?.resumesCreated.current ?? 0, week?.resumesCreated, FileText],
                        ] as const).map(([label, value, trend, Icon]) => (
                            <div key={label} className="rounded-xl border border-[var(--border-color)] p-3">
                                <Icon className="h-4 w-4 text-[var(--primary)] mb-2" />
                                <p className="text-2xl font-bold leading-none text-[var(--foreground)]">{value}</p>
                                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{label}</p>
                                <Delta trend={trend} suffix="vs last week" />
                            </div>
                        ))}
                    </div>

                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-3.5">
                        <Flag className="h-5 w-5 shrink-0 text-[var(--primary)]" />
                        <div className="min-w-0">
                            <p className="text-[13px] font-bold text-[var(--foreground)]">Keep going!</p>
                            <p className="text-[11px] text-[var(--text-secondary)]">
                                {(week?.applicationsSent.current ?? 0) > 0
                                    ? "You're making steady progress toward your career goals."
                                    : "Move a job to Applied in the Job Tracker to start this week's streak."}
                            </p>
                        </div>
                    </div>
                </Panel>
            </div>
        </div>
    );
}
