"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  Search,
  MapPin,
  MoreHorizontal,
  Loader2,
  Briefcase,
  Pencil,
  Trash2,
  X,
  LayoutList,
  KanbanSquare,
  ArrowDownUp,
  Bookmark,
  Send,
  Users,
  Trophy,
  FolderOpen,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CustomDialog } from "@/components/ui/CustomDialog";
import { CompanyLogo } from "@/components/jobs/CompanyLogo";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// --- TYPES & CONFIG ---

type Job = {
  id: string;
  company: string;
  jobTitle: string;
  location?: string;
  status: string;
  description?: string; // Added description
  jobUrl?: string; // Added jobUrl
  interviewAt?: string | null;
  deadlineAt?: string | null;
  createdAt: string;
};

const PAGE_SIZE = 12;
const STATUS_ORDER = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"];

const SORTS = {
  newest: "Date added (newest)",
  oldest: "Date added (oldest)",
  company: "Company A–Z",
  status: "Status",
} as const;
type SortKey = keyof typeof SORTS;

/** Icon per status, so the pill reads at a glance. */
const STATUS_ICONS: Record<string, React.ElementType> = {
  SAVED: Bookmark,
  APPLIED: Send,
  INTERVIEW: Users,
  OFFER: Trophy,
  REJECTED: X,
};

const STATUSES = {
  SAVED: { label: "Saved", color: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  APPLIED: { label: "Applied", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  INTERVIEW: { label: "Interviewing", color: "text-orange-400 bg-orange-500/10 border-orange-500/20" },
  OFFER: { label: "Offer", color: "text-[var(--primary)] bg-[var(--primary)]/10 border-[var(--primary)]/20" },
  REJECTED: { label: "Rejected", color: "text-red-400 bg-red-500/10 border-red-500/20" },
};

export default function JobTrackerPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    description: string;
    variant: 'default' | 'destructive' | 'success';
    confirmText?: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', description: '', variant: 'default' });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null); // For Editing

  // Dropdown Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const [isMounted, setIsMounted] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);

  const handleViewModeChange = (mode: 'list' | 'board') => {
    setViewMode(mode);
    localStorage.setItem('jobTrackerViewMode', mode);
  };

  // 1. Fetch Jobs
  const fetchJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const json = await res.json();
      if (json.data) {
        // Map legacy/extension statuses to standard dashboard statuses
        const mappedJobs = json.data.map((job: Job) => {
          if (job.status === "RESUME_READY" || job.status === "TAILORING") {
            return { ...job, status: "SAVED" };
          }
          return job;
        });
        setJobs(mappedJobs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    const savedViewMode = localStorage.getItem('jobTrackerViewMode') as 'list' | 'board';
    if (savedViewMode) setViewMode(savedViewMode);
    fetchJobs();
  }, []);

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    setJobs((prev) =>
      prev.map((job) => job.id === jobId ? { ...job, status: newStatus } : job)
    );
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      fetchJobs();
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    handleStatusChange(draggableId, destination.droppableId);
  };

  // 3. Delete Job
  const handleDelete = (jobId: string) => {
    setActiveMenuId(null);
    setDialogConfig({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Job',
      description: 'Are you sure you want to delete this job? This action cannot be undone.',
      variant: 'destructive',
      confirmText: 'Delete',
      onConfirm: async () => {
        // Optimistic Update
        setJobs(prev => prev.filter(j => j.id !== jobId));

        try {
          const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
          if (!res.ok) fetchJobs(); // Revert if failed
        } catch (e) {
          console.error(e);
          fetchJobs();
        }
      }
    });
  };

  // 4. Open Edit Modal
  const openEditModal = (job: Job) => {
    setJobToEdit(job);
    setActiveMenuId(null);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setJobToEdit(null);
    setIsModalOpen(true);
  };

  // 5. Filter Logic
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Counts per status, with how many of each arrived this month against last.
  // Derived here rather than from an API: every job is already loaded, and
  // `createdAt` is the only timestamp that reliably marks when a job entered
  // the tracker. A status change does not get its own timestamp, so "this
  // month" means added this month — not moved to that status this month.
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

    const count = (match: (j: Job) => boolean) => {
      let total = 0, thisMonth = 0, lastMonth = 0;
      for (const job of jobs) {
        if (!match(job)) continue;
        total += 1;
        const at = new Date(job.createdAt).getTime();
        if (at >= monthStart) thisMonth += 1;
        else if (at >= prevStart) lastMonth += 1;
      }
      const change = thisMonth - lastMonth;
      const percent = lastMonth === 0 ? (thisMonth > 0 ? 100 : 0) : Math.round((change / lastMonth) * 100);
      return { total, thisMonth, lastMonth, change, percent };
    };

    const is = (status: string) => (job: Job) => (job.status || "SAVED").toUpperCase() === status;
    return [
      { key: "ALL", label: "Total Jobs", icon: FolderOpen, ...count(() => true) },
      { key: "SAVED", label: "Saved", icon: Bookmark, ...count(is("SAVED")) },
      { key: "APPLIED", label: "Applied", icon: Send, ...count(is("APPLIED")) },
      { key: "INTERVIEW", label: "Interviewing", icon: Users, ...count(is("INTERVIEW")) },
      { key: "OFFER", label: "Offers", icon: Trophy, ...count(is("OFFER")) },
    ];
  }, [jobs]);

  const sortedJobs = useMemo(() => {
    const at = (job: Job) => new Date(job.createdAt).getTime();
    const list = [...filteredJobs];
    if (sortKey === "oldest") return list.sort((a, b) => at(a) - at(b));
    if (sortKey === "company") return list.sort((a, b) => a.company.localeCompare(b.company) || at(b) - at(a));
    if (sortKey === "status") {
      const rank = (job: Job) => STATUS_ORDER.indexOf((job.status || "SAVED").toUpperCase());
      return list.sort((a, b) => rank(a) - rank(b) || at(b) - at(a));
    }
    return list.sort((a, b) => at(b) - at(a));
  }, [filteredJobs, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / PAGE_SIZE));
  const page = Math.min(pageNumber, totalPages);
  const pagedJobs = sortedJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // A narrowed list must not leave the user stranded on an empty page.
  useEffect(() => { setPageNumber(1); }, [searchQuery, statusFilter, sortKey]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  return (
    <div className="w-full max-w-[1700px] mx-auto h-[calc(100vh-120px)] flex flex-col space-y-5 min-w-0">

      {/* --- PIPELINE AT A GLANCE --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        {stats.map((card) => {
          const Icon = card.icon;
          const up = card.change >= 0;
          const active = statusFilter === card.key;
          return (
            <button
              key={card.key}
              onClick={() => setStatusFilter(card.key)}
              className={`text-left rounded-2xl border bg-[var(--sidebar-bg)] p-3.5 transition ${active
                ? "border-[var(--primary)] ring-1 ring-[var(--primary)]/25"
                : "border-[var(--border-color)] hover:border-[var(--primary)]/40"}`}
            >
              <div className="flex items-start gap-2.5">
                <span className="grid place-items-center h-9 w-9 shrink-0 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">{card.label}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[var(--foreground)] leading-none">{card.total}</span>
                    {card.change !== 0 && (
                      <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-emerald-500" : "text-red-500"}`}>
                        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {up ? "+" : ""}{card.percent}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-secondary)]">
                {card.change === 0
                  ? `${card.thisMonth} added this month`
                  : `${card.change > 0 ? "+" : ""}${card.change} vs last month`}
              </p>
            </button>
          );
        })}
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col lg:flex-row gap-3 shrink-0">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search companies, roles, or keywords..."
            className="w-full h-11 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl pl-11 pr-4 text-sm text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-2 focus:ring-[var(--primary)]/15 transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div id="tour-job-views" className="flex bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-1 shrink-0">
          {([["board", KanbanSquare, "Board"], ["list", LayoutList, "List"]] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              className={`px-3.5 h-9 rounded-lg flex items-center gap-2 text-xs font-semibold transition ${viewMode === mode
                ? "bg-[var(--primary)] text-white shadow"
                : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            onClick={() => setSortOpen((v) => !v)}
            aria-expanded={sortOpen}
            className="flex h-11 w-full lg:w-[210px] items-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] px-3.5 text-left transition hover:border-[var(--primary)]/40"
          >
            <ArrowDownUp className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Sort by</span>
              <span className="block truncate text-[13px] font-semibold text-[var(--foreground)]">{SORTS[sortKey]}</span>
            </span>
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] py-1 shadow-xl">
                {(Object.keys(SORTS) as SortKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => { setSortKey(key); setSortOpen(false); }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition hover:bg-[var(--primary)]/8 ${key === sortKey ? "font-bold text-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}
                  >
                    {SORTS[key]}
                    {key === sortKey && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          id="tour-add-job"
          onClick={openAddModal}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white shadow-lg shadow-[var(--primary)]/20 transition hover:bg-[var(--primary-dark)] shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="whitespace-nowrap">Add Job</span>
        </button>
      </div>

      {/* --- CONTENT AREA --- */}
      {viewMode === 'list' ? (
        <div className="flex-1 bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col shadow-2xl">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-12 gap-4 p-4 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">
            <div className="col-span-4">Company &amp; Role</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1 text-center">Job Post</div>
            <div className="col-span-1 text-right">Added</div>
            <div className="col-span-2 text-right pr-1">Actions</div>
          </div>
          {/* Mobile header */}
          <div className="flex md:hidden items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">
            <span>Company & Role</span>
            <span>Status / Actions</span>
          </div>

          <div className="overflow-y-auto flex-1 custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" /></div>
            ) : filteredJobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Briefcase className="h-10 w-10 mb-3 opacity-20" />
                <p>No jobs found.</p>
              </div>
            ) : (
              pagedJobs.map((job) => (
                <div key={job.id} className="border-b border-[var(--border-color)] hover:bg-black/5 dark:hover:bg-white/5 transition group relative">

                  {/* Mobile card row */}
                  <div className="flex md:hidden items-center gap-3 p-3">
                    <CompanyLogo company={job.company} jobUrl={job.jobUrl} size={36} />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/dashboard/jobs/${job.id}`)}>
                      <h3 className="font-bold text-[var(--foreground)] text-sm group-hover:text-[var(--primary)] transition-colors truncate">{job.jobTitle}</h3>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{job.company}</p>
                      {job.location && <p className="text-[10px] text-[var(--text-secondary)]/70 truncate mt-0.5 flex items-center gap-1"><MapPin className="h-2.5 w-2.5 shrink-0" />{job.location}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.id, e.target.value)}
                        className={`appearance-none pl-2 pr-6 py-1 rounded-md text-xs font-medium border bg-transparent cursor-pointer focus:outline-none ${STATUSES[job.status as keyof typeof STATUSES]?.color || "text-[var(--foreground)] border-[var(--border-color)]"}`}
                      >
                        {Object.entries(STATUSES).map(([key, config]) => (
                          <option key={key} value={key} className="bg-[var(--sidebar-bg)] text-[var(--foreground)]">{config.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === job.id ? null : job.id); }}
                        className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {activeMenuId === job.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                          <div className="absolute right-0 top-full mt-2 w-40 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openEditModal(job)} className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--foreground)] flex items-center gap-2"><Pencil className="h-3 w-3" /> Edit</button>
                            <button onClick={() => handleDelete(job.id)} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2 border-t border-[var(--border-color)]"><Trash2 className="h-3 w-3" /> Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Desktop table row */}
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 items-center">
                    {/* Column 1: Info */}
                    <div className="col-span-4 cursor-pointer min-w-0 pr-4 flex items-center gap-3" onClick={() => router.push(`/dashboard/jobs/${job.id}`)}>
                      <CompanyLogo company={job.company} jobUrl={job.jobUrl} size={38} />
                      <div className="min-w-0">
                        <h3 className="font-bold text-[var(--foreground)] text-sm group-hover:text-[var(--primary)] transition-colors truncate" title={job.jobTitle}>{job.jobTitle}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{job.company}</p>
                      </div>
                    </div>
                    {/* Column 2: Status */}
                    <div className="col-span-2 relative" onClick={(e) => e.stopPropagation()}>
                      <StatusPill
                        status={job.status}
                        open={statusMenuId === job.id}
                        onToggle={() => setStatusMenuId(statusMenuId === job.id ? null : job.id)}
                        onPick={(next) => { handleStatusChange(job.id, next); setStatusMenuId(null); }}
                      />
                    </div>
                    {/* Column 3: Location */}
                    <div className="col-span-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                      <MapPin className="h-3.5 w-3.5 opacity-50" />
                      <span className="truncate">{job.location || "Remote"}</span>
                    </div>
                    {/* Column 4: Link */}
                    <div className="col-span-1 flex justify-center">
                      {job.jobUrl ? (
                        <a href={job.jobUrl} target="_blank" rel="noopener noreferrer"
                          className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                          title="Open Job Posting" onClick={(e) => e.stopPropagation()}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                        </a>
                      ) : (
                        <span className="text-[var(--text-secondary)]/50">-</span>
                      )}
                    </div>
                    {/* Column 5: Date */}
                    <div className="col-span-1 text-right text-xs text-[var(--text-secondary)] font-mono">
                      {new Date(job.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                    {/* Column 6: Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2 relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/8 px-3 text-[12px] font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/15"
                      >
                        View
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === job.id ? null : job.id); }}
                        className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      {activeMenuId === job.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                          <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openEditModal(job)} className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--foreground)] flex items-center gap-2"><Pencil className="h-3 w-3" /> Edit</button>
                            <button onClick={() => handleDelete(job.id)} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2 border-t border-[var(--border-color)]"><Trash2 className="h-3 w-3" /> Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>

          {/* Pagination — a long tracker should not be one endless scroll */}
          {!loading && sortedJobs.length > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] px-4 py-3 shrink-0">
              <p className="text-xs text-[var(--text-secondary)]">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sortedJobs.length)} of {sortedJobs.length} job{sortedJobs.length !== 1 ? "s" : ""}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPageNumber(page - 1)}
                    disabled={page === 1}
                    aria-label="Previous page"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border-color)] disabled:hover:text-[var(--text-secondary)]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                    .map((n, i, all) => (
                      <span key={n} className="flex items-center gap-1.5">
                        {i > 0 && all[i - 1] !== n - 1 && <span className="text-xs text-[var(--text-secondary)]">…</span>}
                        <button
                          onClick={() => setPageNumber(n)}
                          className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${n === page
                            ? "bg-[var(--primary)] text-white"
                            : "border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"}`}
                        >
                          {n}
                        </button>
                      </span>
                    ))}
                  <button
                    onClick={() => setPageNumber(page + 1)}
                    disabled={page === totalPages}
                    aria-label="Next page"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] transition hover:border-[var(--primary)]/40 hover:text-[var(--primary)] disabled:opacity-40 disabled:hover:border-[var(--border-color)] disabled:hover:text-[var(--text-secondary)]"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* --- KANBAN BOARD VIEW --- */
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 flex mt-2 relative pr-4">

            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--sidebar-bg)]/50 backdrop-blur-sm z-10 rounded-xl">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
              </div>
            )}

            {isMounted && Object.entries(STATUSES).map(([statusKey, config]) => {
              const columnJobs = filteredJobs.filter(job => job.status === statusKey);

              return (
                <div key={statusKey} className="flex-none w-[260px] mr-4 flex flex-col items-stretch h-full bg-black/5 dark:bg-white/5 rounded-xl border border-[var(--border-color)]/50 p-2">
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-2 border-b border-[var(--border-color)]/50 shrink-0">
                    <h3 className="font-bold text-[13px] tracking-wide text-[var(--foreground)] flex items-center gap-2 uppercase">
                      {config.label}
                      <span className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] text-[11px] px-1.5 py-0.5 rounded-full font-mono">
                        {columnJobs.length}
                      </span>
                    </h3>
                  </div>

                  {/* Scrollable Container Wraps Droppable */}
                  <div className="flex-1 overflow-y-auto mt-2 custom-scrollbar pr-1 relative min-h-[150px]">
                    <Droppable droppableId={statusKey}>
                      {(provided: any, snapshot: any) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-full pb-8 transition-colors ${snapshot.isDraggingOver ? 'bg-black/5 dark:bg-white/5 rounded-lg' : ''}`}
                        >
                          {columnJobs.length === 0 ? (
                            <div className="h-20 border-2 border-dashed border-[var(--border-color)] rounded-xl flex items-center justify-center text-[11px] text-[var(--text-secondary)]/50 font-medium">
                              No jobs
                            </div>
                          ) : (
                            columnJobs.map((job, index) => (
                              <Draggable key={job.id} draggableId={job.id} index={index}>
                                {(provided: any, snapshot: any) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                      ...provided.draggableProps.style,
                                    }}
                                    className={`mb-2.5 w-full bg-[var(--sidebar-bg)] border hover:border-[var(--primary)]/50 focus-within:border-[var(--primary)]/50 rounded-xl p-3 shadow-sm hover:shadow-md relative group flex flex-col ${snapshot.isDragging ? 'border-[var(--primary)] shadow-lg z-50 cursor-grabbing' : 'border-[var(--border-color)] cursor-grab'}`}
                                    onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                                  >
                                    <div className="flex justify-between items-start mb-2 pointer-events-none">
                                      {/* Company Icon & Name */}
                                      <div className="flex gap-2.5 overflow-hidden">
                                        <CompanyLogo company={job.company} jobUrl={job.jobUrl} size={28} rounded="rounded-md" />
                                        <div className="overflow-hidden">
                                          <h4 className="font-bold text-[var(--foreground)] text-[13px] leading-snug truncate pr-1 group-hover:text-[var(--primary)]">{job.jobTitle}</h4>
                                          <p className="text-[11px] text-[var(--text-secondary)] truncate">{job.company}</p>
                                        </div>
                                      </div>

                                      {/* Actions Kebab */}
                                      <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === job.id ? null : job.id);
                                          }}
                                          className="p-1 rounded bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--foreground)] shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                                        >
                                          <MoreHorizontal className="h-3 w-3" />
                                        </button>
                                        {activeMenuId === job.id && (
                                          <>
                                            <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
                                            <div className="absolute right-0 top-full mt-1 w-32 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
                                              <button onClick={() => openEditModal(job)} className="w-full text-left px-3 py-2 text-[11px] text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2"><Pencil className="h-3 w-3" /> Edit</button>
                                              <button onClick={() => handleDelete(job.id)} className="w-full text-left px-3 py-2 text-[11px] text-red-500 hover:bg-red-500/10 flex items-center gap-2 border-t border-[var(--border-color)]"><Trash2 className="h-3 w-3" /> Delete</button>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>

                                    {/* Footer details of card */}
                                    <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-1 pt-2.5 border-t border-[var(--border-color)]/30">
                                      <div className="flex items-center gap-1.5 truncate pr-2">
                                        <MapPin className="h-2.5 w-2.5 shrink-0 opacity-70" />
                                        <span className="truncate">{job.location || "Remote"}</span>
                                      </div>

                                      {job.jobUrl && (
                                        <a
                                          href={job.jobUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-500 hover:text-blue-600 shrink-0"
                                          title="View Job Post"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))
                          )}
                          <div style={{ display: 'none' }}>{provided.placeholder}</div>
                        </div>
                      )}
                    </Droppable>
                  </div>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {
        isModalOpen && (
          <JobModal
            jobToEdit={jobToEdit}
            onClose={() => setIsModalOpen(false)}
            onSuccess={() => { setIsModalOpen(false); fetchJobs(); }}
          />
        )
      }

      <CustomDialog
        {...dialogConfig}
        onClose={() => setDialogConfig(s => ({ ...s, isOpen: false }))}
      />
    </div >
  );
}

/* ------------------ JOB MODAL (ADD / EDIT) ------------------ */

/**
 * A `datetime-local` input wants "YYYY-MM-DDTHH:mm" in *local* time, while the
 * API speaks ISO/UTC. Slicing the ISO string would silently shift the time by
 * the user's offset, so convert through the local getters.
 */
function toLocalInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Status as a coloured pill rather than a bare <select>: it reads at a glance
 * in a dense table, and still opens the picker on click so the status stays
 * editable from the list.
 */
function StatusPill({
  status,
  open,
  onToggle,
  onPick,
}: {
  status: string;
  open: boolean;
  onToggle: () => void;
  onPick: (next: string) => void;
}) {
  const key = (status || "SAVED").toUpperCase();
  const config = STATUSES[key as keyof typeof STATUSES];
  const Icon = STATUS_ICONS[key] || Bookmark;

  return (
    <>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:brightness-110 ${config?.color || "text-[var(--foreground)] border-[var(--border-color)]"}`}
      >
        <Icon className="h-3 w-3" />
        {config?.label || key}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onToggle} />
          <div className="absolute left-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] py-1 shadow-2xl">
            {Object.entries(STATUSES).map(([value, cfg]) => {
              const RowIcon = STATUS_ICONS[value] || Bookmark;
              return (
                <button
                  key={value}
                  onClick={() => onPick(value)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-[var(--primary)]/8 ${value === key ? "font-bold text-[var(--primary)]" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}
                >
                  <RowIcon className="h-3.5 w-3.5" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

function JobModal({ jobToEdit, onClose, onSuccess }: { jobToEdit: Job | null; onClose: () => void; onSuccess: () => void; }) {
  const [form, setForm] = useState({
    company: "",
    jobTitle: "",
    location: "",
    description: "", // Added Description
    jobUrl: "", // Added Job URL
    interviewAt: "", // datetime-local, empty means "not scheduled"
    deadlineAt: "",
  });
  const [loading, setLoading] = useState(false);

  // Initialize form if editing
  useEffect(() => {
    if (jobToEdit) {
      setForm({
        company: jobToEdit.company,
        jobTitle: jobToEdit.jobTitle,
        location: jobToEdit.location || "",
        description: jobToEdit.description || "",
        jobUrl: jobToEdit.jobUrl || "",
        interviewAt: toLocalInput(jobToEdit.interviewAt),
        deadlineAt: toLocalInput(jobToEdit.deadlineAt),
      });
    }
  }, [jobToEdit]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isEdit = !!jobToEdit;
    const url = isEdit ? `/api/jobs/${jobToEdit.id}` : "/api/jobs";
    const method = isEdit ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          interviewAt: form.interviewAt ? new Date(form.interviewAt).toISOString() : null,
          deadlineAt: form.deadlineAt ? new Date(form.deadlineAt).toISOString() : null,
        })
      });
      if (res.ok) onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-black/5 dark:bg-white/5 rounded-t-xl shrink-0">
          <h2 className="text-lg font-bold text-[var(--foreground)]">{jobToEdit ? "Edit Job" : "Add New Job"}</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--foreground)] transition rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto custom-scrollbar p-6">
          <form id="jobForm" onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Job Title <span className="text-red-500">*</span></label>
                <input required className="w-full p-3 bg-black/5 dark:bg-white/5 border border-[var(--border-color)] rounded-lg text-[var(--foreground)] focus:border-[var(--primary)]/50 outline-none transition text-sm" placeholder="e.g. Frontend Engineer" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Company <span className="text-red-500">*</span></label>
                <input required className="w-full p-3 bg-black/5 dark:bg-white/5 border border-[var(--border-color)] rounded-lg text-[var(--foreground)] focus:border-[var(--primary)]/50 outline-none transition text-sm" placeholder="e.g. Netflix" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Location</label>
              <input className="w-full p-3 bg-black/5 dark:bg-white/5 border border-[var(--border-color)] rounded-lg text-[var(--foreground)] focus:border-[var(--primary)]/50 outline-none transition text-sm" placeholder="e.g. Remote / New York" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Job URL</label>
              <input className="w-full p-3 bg-black/5 dark:bg-white/5 border border-[var(--border-color)] rounded-lg text-[var(--foreground)] focus:border-[var(--primary)]/50 outline-none transition text-sm mb-4" placeholder="e.g. https://linkedin.com/jobs/view/..." value={form.jobUrl} onChange={(e) => setForm({ ...form, jobUrl: e.target.value })} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Interview</label>
                  <input
                    type="datetime-local"
                    className="w-full p-3 bg-black/5 dark:bg-white/5 border border-[var(--border-color)] rounded-lg text-[var(--foreground)] focus:border-[var(--primary)]/50 outline-none transition text-sm"
                    value={form.interviewAt}
                    onChange={(e) => setForm({ ...form, interviewAt: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Application deadline</label>
                  <input
                    type="datetime-local"
                    className="w-full p-3 bg-black/5 dark:bg-white/5 border border-[var(--border-color)] rounded-lg text-[var(--foreground)] focus:border-[var(--primary)]/50 outline-none transition text-sm"
                    value={form.deadlineAt}
                    onChange={(e) => setForm({ ...form, deadlineAt: e.target.value })}
                  />
                </div>
              </div>

              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Job Description</label>
              <textarea
                className="w-full p-3 bg-black/5 dark:bg-white/5 border border-[var(--border-color)] rounded-lg text-[var(--foreground)] focus:border-[var(--primary)]/50 outline-none transition text-sm h-40 resize-none scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 scrollbar-track-transparent"
                placeholder="Paste the full job description here..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)] bg-black/5 dark:bg-white/5 rounded-b-xl shrink-0 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--foreground)] py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition text-sm font-medium">Cancel</button>
          <button
            form="jobForm"
            disabled={loading}
            type="submit"
            className="flex-1 bg-[var(--primary)] text-white py-2.5 rounded-lg hover:bg-[var(--primary)]/90 transition text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Saving..." : (jobToEdit ? "Update Job" : "Add Job")}
          </button>
        </div>

      </div>
    </div>
  );
}