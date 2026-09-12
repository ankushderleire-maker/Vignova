"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Info,
  Lightbulb,
  Loader2,
  MapPin,
  Plus,
  PlayCircle,
  Search,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { CustomDialog } from "@/components/ui/CustomDialog";
import { Modal } from "@/components/ui/Modal";
import { CompanyLogo } from "@/components/jobs/CompanyLogo";
import { JobDescriptionModal } from "@/components/jobs/JobDescriptionModal";

type Job = {
  id: string;
  company: string;
  jobTitle: string;
  location: string | null;
  salary: string | null;
  description: string | null;
  status: string;
  source: string;
  jobUrl: string | null;
  sourceUrl: string | null;
  createdAt: string;
  formattedJd?: any;
};

type Profile = {
  id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

// ── Skill tags ──────────────────────────────────────────────────────────
// The job rows carry a free-text description and nothing structured, so the
// tags on each card are pulled out of that text against a fixed vocabulary.
// Only skills actually present in the JD are ever shown.
const SKILL_VOCAB = [
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", ".NET", "Go", "Rust",
  "Ruby", "PHP", "Swift", "Kotlin", "Scala", "SQL", "Bash",
  "React", "Next.js", "Angular", "Vue", "Node.js", "Express", "Django", "Flask",
  "FastAPI", "Spring Boot", "GraphQL", "REST API", "HTML", "CSS", "Tailwind",
  "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "LLM",
  "Generative AI", "PyTorch", "TensorFlow", "Scikit-learn", "Pandas", "NumPy",
  "Spark", "PySpark", "Hadoop", "Airflow", "dbt", "ETL", "Data Engineering",
  "Data Science", "Analytics", "Power BI", "Tableau", "Looker",
  "AWS", "Azure", "GCP", "Google Cloud", "Docker", "Kubernetes", "Terraform",
  "CI/CD", "Jenkins", "Git", "Linux", "Microservices", "Serverless", "Redis", "Kafka",
  "PostgreSQL", "MySQL", "MongoDB", "DynamoDB", "Snowflake", "BigQuery", "Elasticsearch",
  "Agile", "Scrum", "Kanban", "TDD", "System Design", "Distributed Systems",
  "DevOps", "MLOps", "Prompt Engineering", "RAG", "A/B Testing",
  "Product Management", "Stakeholder Management", "Roadmap", "Research",
];

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Terms like "C++" or "Next.js" have no word boundary to anchor to, so they
// fall back to a plain substring match.
const SKILL_MATCHERS = SKILL_VOCAB.map((skill) => ({
  skill,
  re: /^[a-z0-9 ]+$/i.test(skill)
    ? new RegExp(`\\b${escapeRe(skill)}\\b`, "i")
    : new RegExp(escapeRe(skill), "i"),
}));

function extractSkills(text: string | null, limit = 5): string[] {
  if (!text) return [];
  const hits: { skill: string; at: number }[] = [];
  for (const { skill, re } of SKILL_MATCHERS) {
    const found = text.search(re);
    if (found !== -1) hits.push({ skill, at: found });
  }
  return hits.sort((a, b) => a.at - b.at).slice(0, limit).map((h) => h.skill);
}

const PAGE_SIZE = 10;

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Freelance"];

function detectEmploymentType(text: string | null): string | null {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, " ");
  for (const type of EMPLOYMENT_TYPES) {
    const loose = type.replace("-", "[\\s-]?");
    if (new RegExp(`\\b${loose}\\b`, "i").test(normalized)) return type;
  }
  return null;
}

// ── Readiness ───────────────────────────────────────────────────────────
// AI Studio needs the job description to tailor anything, so the badge says
// whether this row can actually be generated from.
type Readiness = { label: string; className: string };

function readinessOf(job: Job): Readiness {
  if (!job.description || job.description.trim().length < 40) {
    return {
      label: "Add job description",
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
    };
  }
  if (job.source && job.source !== "manual") {
    return {
      label: "Synced from Job Tracker",
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
    };
  }
  return {
    label: "Ready",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  };
}



function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function relativeDay(value?: string) {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(value);
}

function SidebarCard({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
            {icon}
          </span>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const AI_STUDIO_STEPS = [
  {
    title: "Select a job description",
    body: "Choose a job description from your saved jobs.",
  },
  {
    title: "Open AI Studio",
    body: "We combine your Master Profile with the job details.",
  },
  {
    title: "Generate tailored resume",
    body: "Get an ATS-optimised resume, ready to download.",
  },
];

export default function GeneratorPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "synced" | "incomplete">("all");
  const [sort, setSort] = useState<"recent" | "oldest" | "company">("recent");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: "alert" | "confirm";
    title: string;
    description: string;
    variant: "default" | "destructive" | "success";
  }>({ isOpen: false, type: "alert", title: "", description: "", variant: "default" });

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, jobRes] = await Promise.all([
          fetch("/api/profiles"),
          fetch("/api/jobs"),
        ]);

        const profileJson = await profileRes.json().catch(() => ({}));
        const list: Profile[] = profileJson?.profiles || [];
        setProfiles(list);
        setHasProfile(list.length > 0);

        const jobJson = await jobRes.json().catch(() => ({}));
        if (jobJson?.data) setJobs(jobJson.data);
      } catch (error) {
        console.error("Failed to load generator data:", error);
        setHasProfile(false);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Tags and employment type are derived from the JD text, so cache them per
  // job rather than recomputing on every keystroke in the search box.
  const enriched = useMemo(
    () =>
      jobs.map((job) => ({
        job,
        skills: extractSkills(job.description),
        employmentType: detectEmploymentType(job.description),
        readiness: readinessOf(job),
      })),
    [jobs]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = enriched;

    if (q) {
      rows = rows.filter(({ job, skills }) =>
        [job.jobTitle, job.company, job.location || "", skills.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    if (filter !== "all") {
      rows = rows.filter(({ job, readiness }) => {
        if (filter === "incomplete") return readiness.label === "Add job description";
        if (filter === "synced") return job.source && job.source !== "manual";
        return readiness.label === "Ready";
      });
    }

    const sorted = [...rows];
    if (sort === "company") {
      sorted.sort((a, b) => a.job.company.localeCompare(b.job.company));
    } else {
      sorted.sort((a, b) => {
        const delta = new Date(b.job.createdAt).getTime() - new Date(a.job.createdAt).getTime();
        return sort === "recent" ? delta : -delta;
      });
    }
    return sorted;
  }, [enriched, query, filter, sort]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // First page, last page, and the pages either side of the current one.
  const pageNumbers = useMemo<(number | "gap")[]>(() => {
    const wanted = new Set<number>([1, pageCount, currentPage, currentPage - 1, currentPage + 1]);
    const pages = [...wanted].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
    const out: (number | "gap")[] = [];
    pages.forEach((n, i) => {
      if (i > 0 && n - (pages[i - 1] as number) > 1) out.push("gap");
      out.push(n);
    });
    return out;
  }, [pageCount, currentPage]);

  useEffect(() => {
    setPage(1);
  }, [query, filter, sort]);

  const primaryProfile = profiles.find((p) => p.is_default) || profiles[0];
  const lastUpdated = profiles.reduce<string | undefined>((latest, p) => {
    if (!latest) return p.updated_at;
    return new Date(p.updated_at) > new Date(latest) ? p.updated_at : latest;
  }, undefined);

  const handleGenerate = async (jobId: string) => {
    if (hasProfile === false) {
      router.push("/dashboard/profile");
      return;
    }
    setGeneratingId(jobId);
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "TAILORING" }),
      });
      router.push(`/dashboard/jobs/${jobId}`);
    } catch (error) {
      console.error(error);
      setDialogConfig({
        isOpen: true,
        type: "alert",
        title: "Error",
        description: "Something went wrong while navigating to the studio.",
        variant: "destructive",
      });
      setGeneratingId(null);
    }
  };

  if (loading || hasProfile === null) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="animate-spin text-[var(--primary)] h-8 w-8" />
      </div>
    );
  }

  if (hasProfile === false) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-orange-400" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[var(--foreground)] mb-2">Master Profile Required</h2>
            <p className="text-[var(--text-secondary)] max-w-md">
              You need to create a Master Profile before you can generate resumes. This profile contains your
              experience, skills, and other information used to tailor resumes.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/profile")}
            className="flex items-center gap-2 bg-[var(--primary)] hover:opacity-90 text-white px-8 py-4 rounded-lg font-bold transition-all shadow-lg shadow-[var(--primary)]/20"
          >
            <User className="h-5 w-5" />
            Create Master Profile
          </button>
        </div>
      </div>
    );
  }

  const selectClass =
    "h-10 rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 pr-8 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition cursor-pointer appearance-none";

  return (
    <div className="w-full pb-16 animate-slide-down">
      {/* ── Page actions (the shell header already carries the title) ── */}
      <div className="flex items-center justify-end mb-4">
        <button
          onClick={() => setShowHowItWorks(true)}
          className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-[var(--border-color)] text-sm font-medium text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition"
        >
          <PlayCircle className="w-4 h-4 text-[var(--primary)]" />
          How it works?
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* ══ LEFT: search + job list ══ */}
        <div className="min-w-0 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search job titles, companies, skills..."
                className="w-full h-10 rounded-lg border border-[var(--border-color)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--text-secondary)] outline-none focus:border-[var(--primary)] transition"
              />
            </div>

            <div className="flex gap-2 shrink-0">
              <div className="relative">
                <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className={selectClass}>
                  <option value="all">All jobs</option>
                  <option value="ready">Ready</option>
                  <option value="synced">Synced</option>
                  <option value="incomplete">Missing JD</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
              </div>

              <div className="relative">
                <select value={sort} onChange={(e) => setSort(e.target.value as any)} className={selectClass}>
                  <option value="recent">Most recent</option>
                  <option value="oldest">Oldest first</option>
                  <option value="company">Company A–Z</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
              </div>

              <button
                onClick={() => router.push("/dashboard/jobs")}
                className="flex items-center gap-1.5 h-10 px-3.5 rounded-lg border border-[var(--primary)]/40 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Go to Job Tracker
              </button>
            </div>
          </div>

          {/* Job list */}
          <div id="tour-generator" className="space-y-3">
            {jobs.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] rounded-xl p-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[var(--foreground)]">No saved jobs yet</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                  Add a job in Job Tracker — the description you save there is what AI Studio tailors your resume
                  against.
                </p>
                <button
                  onClick={() => router.push("/dashboard/jobs")}
                  className="mt-4 inline-flex items-center gap-1.5 bg-[var(--primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition"
                >
                  <Plus className="w-4 h-4" /> Go to Job Tracker
                </button>
              </div>
            ) : visible.length === 0 ? (
              <div className="border border-dashed border-[var(--border-color)] rounded-xl p-10 text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  No jobs match your search. Try a different keyword or filter.
                </p>
              </div>
            ) : (
              pageRows.map(({ job, skills, employmentType, readiness }) => {
                const expanded = expandedId === job.id;
                const busy = generatingId === job.id;
                return (
                  <article
                    key={job.id}
                    className="group bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm hover:border-[var(--primary)]/40 hover:shadow-md transition"
                  >
                    <div className="flex gap-3">
                      <CompanyLogo company={job.company} jobUrl={job.jobUrl} logoUrl={(job as any).companyLogo} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition">
                              {job.jobTitle}
                            </h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${readiness.className}`}
                            >
                              {readiness.label}
                            </span>
                          </div>
                          <span className="shrink-0 text-[11px] text-[var(--text-secondary)] whitespace-nowrap">
                            Saved {formatDate(job.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1.5 text-xs text-[var(--text-secondary)]">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" /> {job.company}
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {job.location}
                            </span>
                          )}
                          {employmentType && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-3.5 h-3.5" /> {employmentType}
                            </span>
                          )}
                          {job.salary && (
                            <span className="flex items-center gap-1">
                              <CircleDollarSign className="w-3.5 h-3.5" /> {job.salary}
                            </span>
                          )}
                        </div>

                        {job.description ? (
                          <div className="mt-2">
                            <p
                              className={`text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap ${
                                expanded ? "" : "line-clamp-2"
                              }`}
                            >
                              {job.description}
                            </p>
                            <button
                              onClick={() => setExpandedId(expanded ? null : job.id)}
                              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline"
                            >
                              {expanded ? "Show less" : "Show more"}
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                              />
                            </button>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                            No job description saved — add one in Job Tracker so AI Studio has something to tailor
                            against.
                          </p>
                        )}

                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {skills.map((skill) => (
                              <span
                                key={skill}
                                className="px-2 py-0.5 rounded-md bg-[var(--primary)]/8 border border-[var(--primary)]/20 text-[10px] font-medium text-[var(--primary)]"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="hidden sm:flex flex-col gap-2 w-[136px] shrink-0">
                        <button
                          onClick={() => setPreviewJob(job)}
                          disabled={!job.description}
                          className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Eye className="w-3.5 h-3.5" /> Preview JD
                        </button>
                        <button
                          onClick={() => handleGenerate(job.id)}
                          disabled={busy}
                          data-tour="ai-studio"
                          className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold hover:opacity-90 transition shadow-sm disabled:opacity-60"
                        >
                          {busy ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Opening
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" /> AI Studio
                              <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Mobile actions */}
                    <div className="flex sm:hidden gap-2 mt-3">
                      <button
                        onClick={() => setPreviewJob(job)}
                        disabled={!job.description}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--foreground)] disabled:opacity-40"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview JD
                      </button>
                      <button
                        onClick={() => handleGenerate(job.id)}
                        disabled={busy}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[var(--primary)] text-white text-xs font-semibold disabled:opacity-60"
                      >
                        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        AI Studio
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Pagination — 10 jobs a page, so a long tracker stays scannable */}
          {visible.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <p className="text-xs text-[var(--text-secondary)]">
                Showing{" "}
                <span className="font-semibold text-[var(--foreground)]">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, visible.length)}
                </span>{" "}
                of <span className="font-semibold text-[var(--foreground)]">{visible.length}</span> jobs
              </p>

              {pageCount > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 px-2.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--foreground)] flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>

                  {pageNumbers.map((entry, i) =>
                    entry === "gap" ? (
                      <span key={`gap-${i}`} className="px-1.5 text-xs text-[var(--text-secondary)]">
                        …
                      </span>
                    ) : (
                      <button
                        key={entry}
                        onClick={() => setPage(entry)}
                        className={`h-8 min-w-8 px-2 rounded-lg text-xs font-semibold transition ${
                          entry === currentPage
                            ? "bg-[var(--primary)] text-white"
                            : "border border-[var(--border-color)] text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        {entry}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage === pageCount}
                    className="h-8 px-2.5 rounded-lg border border-[var(--border-color)] text-xs font-semibold text-[var(--foreground)] flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ══ RIGHT: context rail ══ */}
        <aside className="space-y-4 xl:sticky xl:top-0">
          <SidebarCard
            title="Profile source"
            icon={<User className="w-3.5 h-3.5" />}
            action={
              <span title="This is the profile AI Studio reads from when tailoring a resume.">
                <Info className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </span>
            }
          >
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <span className="w-7 h-7 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                  <FileText className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--foreground)] truncate">
                    {primaryProfile?.name || "Master Profile"}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Used to generate every tailored resume.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-[11px] text-[var(--text-secondary)]">
                <Users className="w-3.5 h-3.5 shrink-0" />
                {profiles.length} profile{profiles.length === 1 ? "" : "s"} available
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-[var(--text-secondary)]">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                Last updated {relativeDay(lastUpdated)}
              </div>

              <button
                onClick={() => router.push("/dashboard/profile")}
                className="w-full flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold hover:bg-[var(--primary)]/15 transition"
              >
                View Master Profile <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </SidebarCard>

          <SidebarCard title="How AI Studio works" icon={<Sparkles className="w-3.5 h-3.5" />}>
            <ol className="relative space-y-4">
              {AI_STUDIO_STEPS.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <div className="relative flex flex-col items-center shrink-0">
                    <span className="w-6 h-6 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {i < AI_STUDIO_STEPS.length - 1 && (
                      <span className="w-px flex-1 mt-1 bg-[var(--border-color)]" />
                    )}
                  </div>
                  <div className="min-w-0 pb-1">
                    <p className="text-xs font-semibold text-[var(--foreground)]">{step.title}</p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </SidebarCard>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
              <FileText className="w-4 h-4 text-[var(--primary)] mb-2" />
              <p className="text-xl font-bold text-[var(--foreground)] leading-none">{jobs.length}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Saved jobs</p>
            </div>
            <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
              <User className="w-4 h-4 text-[var(--primary)] mb-2" />
              <p className="text-xl font-bold text-[var(--foreground)] leading-none">{profiles.length}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Profile sources</p>
            </div>
          </div>

          <div className="rounded-xl p-4 border border-[var(--primary)]/25 bg-[var(--primary)]/8">
            <h3 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                <Lightbulb className="w-3.5 h-3.5" />
              </span>
              Pro tip
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] mt-2 leading-relaxed">
              Save more job descriptions in Job Tracker to build a tailored resume for each role you are chasing.
            </p>
            <button
              onClick={() => router.push("/dashboard/jobs")}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--primary)] hover:underline"
            >
              Go to Job Tracker <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </aside>
      </div>

      {/* JD preview */}
      <JobDescriptionModal
        job={previewJob}
        onClose={() => setPreviewJob(null)}
        onOpenStudio={(id) => {
          setPreviewJob(null);
          handleGenerate(id);
        }}
      />

      {/* Walkthrough */}
      <Modal
        open={showHowItWorks}
        title="How the Resume Generator works"
        subtitle="Pick a saved job, and AI Studio tailors your Master Profile to it."
        onClose={() => setShowHowItWorks(false)}
      >
        <ol className="space-y-3 mb-5">
          {AI_STUDIO_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">{step.title}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <img
          src="/hiw_img/3_resume_generator.png"
          alt="Resume Generator walkthrough"
          className="w-full rounded-lg border border-[var(--border-color)]"
        />
      </Modal>

      <CustomDialog {...dialogConfig} onClose={() => setDialogConfig((s) => ({ ...s, isOpen: false }))} />
    </div>
  );
}
