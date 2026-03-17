"use client";

import { useState, useEffect, useRef } from "react";
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
  KanbanSquare
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CustomDialog } from "@/components/ui/CustomDialog";
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
  createdAt: string;
};

const STATUSES = {
  SAVED: { label: "Saved", color: "text-gray-400 bg-gray-500/10 border-gray-500/20" },
  TAILORING: { label: "Tailoring", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    if (activeMenuId) window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col space-y-6 min-w-0 px-2 sm:px-4">

      {/* --- ADD JOB BUTTON --- */}
      <div className="flex justify-end shrink-0">
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white px-5 py-2.5 rounded-lg transition shadow-lg shadow-[var(--primary)]/20 font-medium text-sm"
        >
          <Plus className="h-4 w-4" />
          Add Job Manually
        </button>
      </div>

      {/* --- TOOLBAR --- */}
      <div className="flex flex-col md:flex-row gap-4 p-1 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search companies or roles..."
            className="w-full bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg pl-10 pr-4 py-2.5 text-[var(--foreground)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--primary)]/50 focus:ring-1 focus:ring-[var(--primary)]/50 transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* View Toggle */}
        <div className="flex bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-lg p-1 shrink-0">
          <button
            onClick={() => handleViewModeChange('board')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition ${viewMode === 'board' ? 'bg-[var(--primary)] text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}
            title="Board View"
          >
            <KanbanSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Board</span>
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className={`px-3 py-1.5 rounded-md flex items-center gap-2 text-xs font-medium transition ${viewMode === 'list' ? 'bg-[var(--primary)] text-white shadow' : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'}`}
            title="List View"
          >
            <LayoutList className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          {["ALL", "SAVED", "APPLIED", "INTERVIEW", "OFFER"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition whitespace-nowrap ${statusFilter === status
                ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-md"
                : "bg-[var(--sidebar-bg)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--foreground)]/50 hover:text-[var(--foreground)]"
                }`}
            >
              {status === "ALL" ? "All Jobs" : STATUSES[status as keyof typeof STATUSES]?.label || status}
            </button>
          ))}
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      {viewMode === 'list' ? (
        <div className="flex-1 bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl overflow-hidden flex flex-col shadow-2xl">
          <div className="grid grid-cols-12 gap-4 p-4 border-b border-[var(--border-color)] bg-[var(--sidebar-bg)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider shrink-0">
            <div className="col-span-4">Company & Role</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-2">Location</div>
            <div className="col-span-1 text-center">Job Post</div>
            <div className="col-span-1 text-right">Added</div>
            <div className="col-span-1 text-center">Actions</div>
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
              filteredJobs.map((job) => (
                <div key={job.id} className="grid grid-cols-12 gap-4 p-4 items-center border-b border-[var(--border-color)] hover:bg-black/5 dark:hover:bg-white/5 transition group relative">

                  {/* Column 1: Info */}
                  <div className="col-span-4 cursor-pointer min-w-0 pr-4" onClick={() => router.push(`/dashboard/jobs/${job.id}`)}>
                    <h3 className="font-bold text-[var(--foreground)] text-sm group-hover:text-[var(--primary)] transition-colors truncate" title={job.jobTitle}>{job.jobTitle}</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{job.company}</p>
                  </div>

                  {/* Column 2: Status */}
                  <div className="col-span-3">
                    <div className="relative inline-block">
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job.id, e.target.value)}
                        className={`appearance-none pl-3 pr-8 py-1.5 rounded-md text-xs font-medium border bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/50 transition ${STATUSES[job.status as keyof typeof STATUSES]?.color || "text-[var(--foreground)] border-[var(--border-color)]"}`}
                      >
                        {Object.entries(STATUSES).map(([key, config]) => (
                          <option key={key} value={key} className="bg-[var(--sidebar-bg)] text-[var(--foreground)]">{config.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Column 3: Location */}
                  <div className="col-span-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                    <MapPin className="h-3.5 w-3.5 opacity-50" />
                    <span className="truncate">{job.location || "Remote"}</span>
                  </div>

                  {/* Column 4: Link */}
                  <div className="col-span-1 flex justify-center">
                    {job.jobUrl ? (
                      <a
                        href={job.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--text-secondary)] hover:text-[var(--primary)] transition p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                        title="Open Job Posting"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                      </a>
                    ) : (
                      <span className="text-[var(--text-secondary)]/50">-</span>
                    )}
                  </div>

                  {/* Column 5: Date */}
                  <div className="col-span-1 text-right text-xs text-[var(--text-secondary)] font-mono">
                    {new Date(job.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </div>

                  {/* Column 5: Actions (Kebab Menu) */}
                  <div className="col-span-1 flex justify-center relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === job.id ? null : job.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--foreground)] transition"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === job.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)}></div>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEditModal(job)}
                            className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[var(--foreground)] flex items-center gap-2"
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(job.id)}
                            className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-2 border-t border-[var(--border-color)]"
                          >
                            <Trash2 className="h-3 w-3" /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              ))
            )}
          </div>
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
                                      marginLeft: snapshot.isDragging && typeof window !== 'undefined' && window.innerWidth >= 768 ? '-256px' : '0px'
                                    }}
                                    className={`mb-2.5 w-full bg-[var(--sidebar-bg)] border hover:border-[var(--primary)]/50 focus-within:border-[var(--primary)]/50 rounded-xl p-3 shadow-sm hover:shadow-md relative group flex flex-col ${snapshot.isDragging ? 'border-[var(--primary)] shadow-lg z-50 cursor-grabbing' : 'border-[var(--border-color)] cursor-grab'}`}
                                    onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                                  >
                                    <div className="flex justify-between items-start mb-2 pointer-events-none">
                                      {/* Company Icon & Name */}
                                      <div className="flex gap-2.5 overflow-hidden">
                                        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-[var(--primary)] to-blue-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-inner">
                                          {job.company.substring(0, 2).toUpperCase()}
                                        </div>
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
                          {provided.placeholder}
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

function JobModal({ jobToEdit, onClose, onSuccess }: { jobToEdit: Job | null; onClose: () => void; onSuccess: () => void; }) {
  const [form, setForm] = useState({
    company: "",
    jobTitle: "",
    location: "",
    description: "", // Added Description
    jobUrl: "" // Added Job URL
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
        jobUrl: jobToEdit.jobUrl || ""
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
        body: JSON.stringify(form)
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
            <div className="grid grid-cols-2 gap-4">
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