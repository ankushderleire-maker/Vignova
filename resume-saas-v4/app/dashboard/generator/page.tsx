"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Zap, CheckCircle, Loader2, FileText, ArrowRight, AlertCircle, User } from "lucide-react";
import { CustomDialog } from "@/components/ui/CustomDialog";

type Job = {
  id: string;
  company: string;
  jobTitle: string;
  status: string;
  createdAt: string;
};

export default function GeneratorPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm';
    title: string;
    description: string;
    variant: 'default' | 'destructive' | 'success';
    confirmText?: string;
    onConfirm?: () => void;
  }>({ isOpen: false, type: 'alert', title: '', description: '', variant: 'default' });

  // --- CHECK FOR PROFILE ---
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const res = await fetch("/api/profiles");
        const json = await res.json();
        setHasProfile(json.profiles && json.profiles.length > 0);
      } catch (error) {
        console.error("Failed to check profile:", error);
        setHasProfile(false);
      }
    };
    checkProfile();
  }, []);

  // --- 1. FETCH JOBS ---
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("/api/jobs");
        const json = await res.json();
        // Only show jobs that haven't been applied to yet, or show all sorted by date
        if (json.data) setJobs(json.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // --- 2. HANDLE GENERATION ---
  const handleGenerate = async (jobId: string) => {
    // Check if profile exists before generating
    if (hasProfile === false) {
      router.push("/dashboard/profile");
      return;
    }

    setGeneratingId(jobId);

    try {
      // B. Update Job Status to 'TAILORING' (Optional but good for tracking)
      await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "TAILORING" }),
      });

      // C. Redirect to Studio to Start AI
      router.push(`/dashboard/jobs/${jobId}`);

    } catch (error) {
      console.error(error);
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title: 'Error',
        description: 'Something went wrong while navigating to the studio.',
        variant: 'destructive'
      });
      setGeneratingId(null);
    }
  };

  if (loading || hasProfile === null) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-[var(--primary)] h-8 w-8" /></div>;

  // NO PROFILE STATE - Show message and redirect button
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
              You need to create a Master Profile before you can generate resumes. This profile contains your experience, skills, and other information used to tailor resumes.
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/profile")}
            className="flex items-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white px-8 py-4 rounded-lg font-bold transition-all shadow-lg shadow-[var(--primary)]/20"
          >
            <User className="h-5 w-5" />
            Create Master Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-20 animate-slide-down">
      {/* JOB LIST */}
      <div className="mt-2">

        {/* Desktop table header */}
        <div id="tour-generator" className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 border-b border-[var(--border-color)] bg-transparent text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          <div className="col-span-5">Job Details</div>
          <div className="col-span-3">Status</div>
          <div className="col-span-2">Date Added</div>
          <div className="col-span-2 text-right">Action</div>
        </div>
        {/* Mobile header */}
        <div className="flex md:hidden items-center justify-between px-4 py-2.5 border-b border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
          <span>Job Details</span>
          <span>Action</span>
        </div>

        {/* List Items */}
        <div className="divide-y divide-[var(--border-color)]">
          {jobs.length === 0 ? (
            <div className="p-10 text-center text-[var(--text-secondary)]">
              No jobs found. Go to "Job Tracker" to add one first.
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">

                {/* Mobile card row */}
                <div className="flex md:hidden items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[var(--foreground)] text-sm group-hover:text-[var(--primary)] transition-colors truncate">
                      {job.jobTitle}
                    </h3>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mt-0.5 truncate">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate">{job.company}</span>
                    </div>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${
                      job.status === 'SAVED' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                      job.status === 'TAILORING' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20'
                    }`}>
                      {job.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="shrink-0">
                    {generatingId === job.id ? (
                      <button disabled className="flex items-center gap-1.5 bg-[var(--primary)]/50 text-white px-3 py-2 rounded-lg text-xs font-bold">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Loading...</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerate(job.id)}
                        className="flex items-center gap-1.5 bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--foreground)] hover:text-[var(--background)] px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                      >
                        <Zap className="h-3.5 w-3.5 fill-current" />
                        Resume Studio
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop table row */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2.5 items-center">
                  {/* 1. Job Details */}
                  <div className="col-span-5 min-w-0">
                    <h3 className="font-bold text-[var(--foreground)] text-sm group-hover:text-[var(--primary)] transition-colors truncate" title={job.jobTitle}>
                      {job.jobTitle}
                    </h3>
                    <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mt-1 truncate" title={job.company}>
                      <FileText className="h-3 w-3 shrink-0" /> <span className="truncate">{job.company}</span>
                    </div>
                  </div>
                  {/* 2. Status Badge */}
                  <div className="col-span-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border tracking-wider ${
                      job.status === 'SAVED' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' :
                      job.status === 'TAILORING' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      'bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20'
                    }`}>
                      {job.status.replace("_", " ")}
                    </span>
                  </div>
                  {/* 3. Date */}
                  <div className="col-span-2 text-sm text-[var(--text-secondary)]">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </div>
                  {/* 4. Action Button */}
                  <div className="col-span-2 flex justify-end">
                    {generatingId === job.id ? (
                      <button disabled className="flex items-center gap-1.5 bg-[var(--primary)]/50 text-white px-3 py-1.5 rounded-md text-xs font-bold">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing...
                      </button>
                    ) : (
                      <button
                        onClick={() => handleGenerate(job.id)}
                        data-tour="ai-studio"
                        className="flex items-center gap-1.5 bg-[var(--primary)] text-[var(--background)] hover:bg-[var(--foreground)] hover:text-[var(--background)] px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-md hover:shadow-lg"
                      >
                        <Zap className="h-3 w-3 fill-current" />
                        Resume Studio
                      </button>
                    )}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      </div>

      <CustomDialog
        {...dialogConfig}
        onClose={() => setDialogConfig(s => ({ ...s, isOpen: false }))}
      />
    </div>
  );
}