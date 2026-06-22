"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Briefcase, User, Lightbulb, AlertCircle, ArrowLeft, Download, History, Plus, Sparkles } from "lucide-react";
import { useReactToPrint } from "react-to-print";

interface Job { id: string; jobTitle: string; company: string; description?: string; }
interface Question { question: string; tip: string; type: string; }
interface SavedInterview { id: string; createdAt: string; source: string; jobId?: string; questions: Question[]; jobDetails?: { company: string; jobTitle: string; }; }

type Phase = "setup" | "generating" | "results";
type GenerationSource = "profile" | "job";
type Tab = "new" | "history";

export default function InterviewPrepPage() {
  const [tab, setTab] = useState<Tab>("new");
  
  // Generation States
  const [phase, setPhase] = useState<Phase>("setup");
  const [source, setSource] = useState<GenerationSource>("profile");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");
  const [activeCompany, setActiveCompany] = useState("");
  const [waitingStepIndex, setWaitingStepIndex] = useState(0);

  // History States
  const [history, setHistory] = useState<SavedInterview[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);

  // Printing
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Interview_Prep_Questions"
  });

  // Fetch jobs and profiles for dropdowns
  useEffect(() => {
    fetch("/api/jobs").then(r => r.json()).then(data => {
      const ok = (j: Job) => j.jobTitle?.trim().length >= 3;
      const list = (data.data || data.jobs || data || []).filter(ok);
      setJobs(list);
      if (list.length > 0) setSelectedJobId(list[0].id);
    }).catch(() => setJobs([]));

    fetch("/api/profiles").then(r => r.json()).then(data => {
      const pList = data.profiles || [];
      setProfiles(pList);
      const def = pList.find((p: any) => p.is_default);
      if (def) setSelectedProfileId(def.id);
      else if (pList.length > 0) setSelectedProfileId(pList[0].id);
    }).catch(err => console.error(err));
  }, []);

  // Fetch history when tab changes
  useEffect(() => {
    if (tab === "history") {
      setHistoryLoading(true);
      fetch("/api/interview/history")
        .then(r => r.json())
        .then(data => setHistory(data.history || []))
        .catch(err => console.error(err))
        .finally(() => setHistoryLoading(false));
    }
  }, [tab]);

  // Loading animation interval
  useEffect(() => {
    let interval: any;
    if (phase === "generating") {
      interval = setInterval(() => {
        setWaitingStepIndex((prev) => prev < 4 ? prev + 1 : prev);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  const handleGenerateClick = () => {
    setShowCreditModal(true);
  };

  const proceedWithGeneration = async () => {
    setShowCreditModal(false);

    setError("");
    setPhase("generating");
    setWaitingStepIndex(0);
    
    const payload: any = { num_questions: 15, source };
    if (source === "profile") {
      payload.job_title = "General Professional";
      payload.job_description = "General interview based on the candidate's master profile.";
      payload.company = "";
      if (selectedProfileId) payload.profileId = selectedProfileId;
      setActiveCompany("");
    } else {
      const job = jobs.find(j => j.id === selectedJobId);
      if (!job) {
        setPhase("setup");
        setError("Please select a valid job.");
        return;
      }
      payload.job_title = job.jobTitle;
      payload.company = job.company || "";
      payload.job_description = job.description || "";
      payload.jobId = job.id;
      setActiveCompany(job.company || "");
    }

    try {
      const creditRes = await fetch("/api/credits/deduct", { method: "POST" });
      if (!creditRes.ok) {
        if (creditRes.status === 403) throw new Error("Insufficient Credits to perform this action.");
        throw new Error("Failed to deduct credit.");
      }

      const res = await fetch("/api/interview/questions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.detail || "Failed to generate questions");
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(data.questions);
        setPhase("results");
      } else throw new Error("Invalid response format");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setPhase("setup");
    }
  };

  const viewHistoryItem = (item: SavedInterview) => {
    setQuestions(item.questions);
    setPhase("results");
    setTab("new");
  };

  const QuestionList = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Your Custom Interview Plan</h2>
        <div className="flex items-center gap-3">
          <button onClick={() => { setPhase("setup"); setQuestions([]); }} className="text-sm flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--foreground)] px-3 py-1.5 rounded-lg hover:bg-[var(--card-border-bg)] transition">
            <ArrowLeft className="w-4 h-4" /> Start Over
          </button>
          <button onClick={() => handlePrint()} className="text-sm flex items-center gap-1.5 bg-[var(--primary)] text-white hover:opacity-90 px-4 py-2 rounded-lg shadow-sm transition">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      <div ref={printRef} className="space-y-5 print:p-8 print:text-black print:bg-white">
        {/* PDF Header with Logo */}
        <div className="hidden print:flex items-end mb-8 pb-4 border-b border-gray-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Vignova Logo" width={40} height={40} className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold text-black tracking-tight -ml-1.5 mb-0.5">VIGNOVA</span>
        </div>
        <h1 className="hidden print:block text-2xl font-bold mb-6">Interview Prep Questions</h1>
        
        {questions.map((q, idx) => (
          <div key={idx} className="bg-[var(--sidebar-bg)] print:bg-white print:border-gray-200 rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
            <div className="p-5 border-b border-[var(--border-color)] print:border-gray-200 bg-[var(--background)]/50 print:bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] print:bg-gray-200 print:text-black flex items-center justify-center text-sm font-bold mt-0.5">
                  {idx + 1}
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] print:text-gray-500 mb-1 block">
                    {q.type} Question
                  </span>
                  <h3 className="text-base font-medium text-[var(--foreground)] print:text-black leading-snug">
                    {q.question}
                  </h3>
                </div>
              </div>
            </div>
            <div className="p-5 bg-[var(--card-border-bg)]/30 print:bg-white flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <Lightbulb className="w-5 h-5 text-amber-500 print:text-gray-500" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-[var(--foreground)] print:text-black mb-1">How to answer:</h4>
                <p className="text-sm text-[var(--text-secondary)] print:text-gray-700 leading-relaxed">
                  {q.tip}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {showCreditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" style={{ position: 'fixed' }}>
          <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-[var(--foreground)]">Use 1 Credit?</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Generating interview questions requires 1 credit to proceed. Do you want to continue?
              </p>
              <div className="flex items-center gap-3 w-full pt-2">
                <button onClick={() => setShowCreditModal(false)} className="flex-1 py-2.5 px-4 rounded-lg font-medium text-[var(--foreground)] bg-[var(--card-border-bg)] hover:bg-[var(--border-color)] transition">
                  Cancel
                </button>
                <button onClick={proceedWithGeneration} className="flex-1 py-2.5 px-4 rounded-lg font-medium text-white bg-[var(--primary)] hover:opacity-90 transition">
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    <div className="min-h-full">
      <div className="max-w-4xl mx-auto pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-3">
              <span>🎯</span> Interview Question Generator
              <span className="text-xs font-bold bg-[var(--primary)] text-white px-2 py-0.5 rounded ml-1">AI</span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Generate 15+ tailored interview questions and best-answer hints.
            </p>
          </div>
          
          <div className="flex bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl p-1 shrink-0">
            <button onClick={() => {setTab("new"); setPhase("setup");}} className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${tab === "new" && phase === "setup" ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}>
              <Plus className="w-4 h-4" /> Generate
            </button>
            <button onClick={() => setTab("history")} className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${tab === "history" ? "bg-[var(--primary)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}>
              <History className="w-4 h-4" /> History
            </button>
          </div>
        </div>

        {tab === "new" && phase === "setup" && (
          <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--border-color)] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[var(--foreground)] mb-6">What should we base the questions on?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button onClick={() => setSource("profile")} className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all ${source === "profile" ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border-color)] hover:border-[var(--primary)]/40"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${source === "profile" ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "bg-[var(--card-border-bg)] text-[var(--text-secondary)]"}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)]">Master Profile</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Generate general behavioral and technical questions based purely on your background.</p>
              </button>

              <button onClick={() => setSource("job")} className={`flex flex-col text-left p-5 rounded-xl border-2 transition-all ${source === "job" ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border-color)] hover:border-[var(--primary)]/40"}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${source === "job" ? "bg-[var(--primary)]/20 text-[var(--primary)]" : "bg-[var(--card-border-bg)] text-[var(--text-secondary)]"}`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)]">Saved Job</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">Generate highly targeted questions tailored to a specific job you've saved.</p>
              </button>
            </div>

            {source === "profile" && profiles.length > 1 && (
              <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Select Master Profile</label>
                <select value={selectedProfileId} onChange={(e) => setSelectedProfileId(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border-color)] text-[var(--foreground)] text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--primary)]">
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.name} {p.is_default ? '(Default)' : ''}</option>)}
                </select>
              </div>
            )}

            {source === "job" && (
              <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Select a Saved Job</label>
                {jobs.length === 0 ? (
                  <div className="p-4 bg-[var(--card-border-bg)] rounded-xl border border-[var(--border-color)]"><p className="text-sm text-[var(--text-secondary)]">No saved jobs found.</p></div>
                ) : (
                  <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className="w-full bg-[var(--background)] border border-[var(--border-color)] text-[var(--foreground)] text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--primary)]">
                    {jobs.map(job => <option key={job.id} value={job.id}>{job.jobTitle} - {job.company}</option>)}
                  </select>
                )}
              </div>
            )}

            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="pt-4">
              <button onClick={handleGenerateClick} disabled={source === "job" && jobs.length === 0} className="w-full py-3.5 px-6 bg-[var(--primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-opacity">
                Generate Interview Questions
              </button>
            </div>
          </div>
        )}

        {tab === "new" && phase === "generating" && (
          <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--border-color)] p-12 flex flex-col items-center text-center shadow-sm">
            <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin mb-6" />
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-3">Generating Questions...</h2>
            
            <div className="text-sm text-[var(--primary)] font-medium max-w-sm h-6 animate-pulse">
              {waitingStepIndex === 0 && "Initializing secure connection..."}
              {waitingStepIndex === 1 && "Searching internet for most recent interview patterns..."}
              {waitingStepIndex === 2 && (source === "job" && activeCompany ? `Searching most recent interview questions of ${activeCompany} from internet...` : "Synthesizing master profile data...")}
              {waitingStepIndex === 3 && "Generating draft questions and hints..."}
              {waitingStepIndex >= 4 && "Finalizing formatting..."}
            </div>
          </div>
        )}

        {tab === "new" && phase === "results" && <QuestionList />}

        {tab === "history" && (
          <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--border-color)] p-6 shadow-sm min-h-[400px]">
            <h2 className="text-base font-semibold text-[var(--foreground)] mb-6">Past Generations</h2>
            {historyLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" /></div>
            ) : history.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center">
                <History className="w-10 h-10 text-[var(--text-secondary)] opacity-20 mb-3" />
                <p className="text-[var(--text-secondary)] text-sm">No saved interviews found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border border-[var(--border-color)] rounded-xl hover:border-[var(--primary)]/40 hover:bg-[var(--card-border-bg)]/50 transition">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)] text-sm capitalize">
                        {item.source === "job" && item.jobDetails ? `${item.jobDetails.company} - ${item.jobDetails.jobTitle}` : "Master Profile Interview"}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{new Date(item.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.questions.length} questions generated</p>
                    </div>
                    <button onClick={() => viewHistoryItem(item)} className="px-4 py-2 bg-[var(--card-border-bg)] hover:bg-[var(--primary)]/10 border border-[var(--border-color)] hover:border-[var(--primary)]/30 text-[var(--foreground)] hover:text-[var(--primary)] text-sm font-medium rounded-lg transition-colors">
                      View Questions
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}
