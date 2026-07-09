"use client";

import { useState, useEffect, Suspense } from "react";
import {
    Loader2,
    UploadCloud,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    RefreshCw,
    ScanLine,
    Briefcase,
    FileText,
    Zap,
    BookOpen,
    Layers,
    Target,
    Shield,
    User,
    TrendingUp,
    AlertCircle,
    Info,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Crown,
    Pen,
    Star,
    ChevronRight,
    Repeat,
    Eye,
    Wand2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomDialog } from "@/components/ui/CustomDialog";

type Job = {
    id: string;
    company: string;
    jobTitle: string;
    description?: string;
    createdAt: string;
};

interface KeywordItem {
    keyword: string;
    relevance: number;
}

interface SectionFeedback {
    has_summary: boolean;
    has_experience: boolean;
    has_education: boolean;
    has_skills: boolean;
    has_projects: boolean;
}

interface ImpactDetails {
    action_verbs_found: string[];
    action_verb_count: number;
    percentages_count: number;
    dollar_amounts_count: number;
    numbers_count: number;
    total_metrics: number;
}

interface ReadabilityDetails {
    word_count: number;
    sentence_count: number;
    avg_sentence_length: number;
    bullet_line_ratio: number;
}

interface FormatChecks {
    has_email: boolean;
    has_phone: boolean;
    has_linkedin: boolean;
    no_smart_quotes: boolean;
    no_tables: boolean;
    has_dates: boolean;
    good_length: boolean;
}

interface ExperienceInfo {
    level: string;
    confidence: string;
    estimated_years: number;
    seniority_signals: {
        senior_keywords_found: number;
        mid_keywords_found: number;
        entry_keywords_found: number;
    };
}

interface Improvement {
    category: string;
    severity: string;
    message: string;
}

interface RepeatedWord {
    word: string;
    count: number;
    synonyms: string[];
}

interface SectionDiagnostic {
    section: string;
    status: "strong" | "needs_work" | "missing";
    line_count: number;
    bullet_count: number;
    word_count: number;
    avg_words_per_line: number;
    issues: string[];
}

interface ContentAnalysis {
    repeated_words: RepeatedWord[];
    section_diagnostics: SectionDiagnostic[];
}

interface ATSResult {
    overall_ats_score: number;
    semantic_match_score: number;
    keyword_score: number;
    section_score: number;
    impact_score: number;
    readability_score: number;
    format_score: number;
    found_skills: KeywordItem[];
    missing_skills: KeywordItem[];
    found_keywords: string[];
    missing_keywords: string[];
    section_feedback: SectionFeedback;
    impact_details: ImpactDetails;
    readability_details: ReadabilityDetails;
    format_checks: FormatChecks;
    experience_info: ExperienceInfo;
    improvements: Improvement[];
    content_analysis?: ContentAnalysis;
}

export default function AtsScorePage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>}>
            <AtsScoreContent />
        </Suspense>
    );
}

function AtsScoreContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [step, setStep] = useState<"setup" | "loading" | "result">("setup");
    const [jobs, setJobs] = useState<Job[]>([]);
    const [selectedJobId, setSelectedJobId] = useState("");
    const [isFetchingJobs, setIsFetchingJobs] = useState(true);
    const [resumeSource, setResumeSource] = useState<"saved" | "upload">("saved");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [result, setResult] = useState<ATSResult | null>(null);
    const [error, setError] = useState("");
    const [expandedCard, setExpandedCard] = useState<string | null>(null);
    const [activeSection, setActiveSection] = useState("overview");
    const [dialogConfig, setDialogConfig] = useState<{
        isOpen: boolean;
        type: 'alert' | 'confirm';
        title: string;
        description: string;
        variant: 'default' | 'destructive' | 'success';
        confirmText?: string;
        onConfirm?: () => void;
    }>({ isOpen: false, type: 'alert', title: '', description: '', variant: 'default' });

    // Saved resumes
    type SavedResume = { id: string; name: string; content: any; createdAt: string; job?: { company: string; jobTitle: string } };
    const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
    const [selectedResumeId, setSelectedResumeId] = useState("");
    const [isFetchingResumes, setIsFetchingResumes] = useState(true);

    // AI Enhancement
    const [aiReport, setAiReport] = useState<any>(null);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiError, setAiError] = useState("");
    const [subscription, setSubscription] = useState<any>(null);
    // Store text for AI call
    const [lastResumeText, setLastResumeText] = useState("");
    const [lastJdText, setLastJdText] = useState("");

    useEffect(() => {
        fetchJobs();
        fetchResumes();
        fetchSubscription();

        const prefillJobId = searchParams.get("jobId");
        const prefillResumeId = searchParams.get("resumeId");

        if (prefillJobId) setSelectedJobId(prefillJobId);
        if (prefillResumeId) {
            setResumeSource("saved");
            setSelectedResumeId(prefillResumeId);
        }
    }, [searchParams]);

    const fetchSubscription = async () => {
        try { const r = await fetch("/api/subscription"); setSubscription(await r.json()); } catch (e) { console.error(e); }
    };

    const fetchJobs = async () => {
        setIsFetchingJobs(true);
        try {
            const res = await fetch("/api/jobs");
            const json = await res.json();
            if (json.data) {
                const jobsWithDesc = json.data.filter((j: Job) => j.description && j.description.trim().length > 0);
                setJobs(jobsWithDesc);
            }
        } catch (err) { console.error("Failed to fetch jobs:", err); }
        finally { setIsFetchingJobs(false); }
    };

    const fetchResumes = async () => {
        setIsFetchingResumes(true);
        try {
            const res = await fetch("/api/resumes");
            const json = await res.json();
            if (json.data) setSavedResumes(json.data);
        } catch (err) { console.error("Failed to fetch resumes:", err); }
        finally { setIsFetchingResumes(false); }
    };

    // Flatten structured resume JSON into plain text for ATS analysis
    const resumeToText = (content: any): string => {
        if (!content) return "";
        const data = typeof content === "string" ? JSON.parse(content) : content;
        const parts: string[] = [];

        // Name and title
        if (data.fullName) parts.push(data.fullName);
        if (data.jobTitle) parts.push(data.jobTitle);

        // Contact info — handle both flat (data.email) and nested (data.contact.email)
        const email = data.email || data.contact?.email || "";
        const phone = data.phone || data.contact?.phone || "";
        const location = data.location || data.contact?.location || "";
        const linkedin = data.linkedin || data.contact?.linkedin || "";
        const website = data.website || data.contact?.website || "";
        const github = data.github || data.contact?.github || "";
        if (email) parts.push(email);
        if (phone) parts.push(phone);
        if (location) parts.push(location);
        if (linkedin) parts.push(linkedin);
        if (website) parts.push(website);
        if (github) parts.push(github);

        // Summary — include section header for ATS section detection
        if (data.summary) parts.push(`Summary\n${data.summary}`);

        // Skills — handle flat array, {technical,soft} object, or string
        if (data.skills) {
            if (Array.isArray(data.skills)) {
                // Flat array: ["Python", "SQL", ...]
                parts.push(`Skills\n${data.skills.join(", ")}`);
            } else if (typeof data.skills === "object") {
                // Object: {technical: "...", soft: "..."}
                const tech = data.skills.technical || "";
                const soft = data.skills.soft || "";
                const techStr = Array.isArray(tech) ? tech.join(", ") : tech;
                const softStr = Array.isArray(soft) ? soft.join(", ") : soft;
                if (techStr) parts.push(`Skills\nTechnical Skills: ${techStr}`);
                if (softStr) parts.push(`Soft Skills: ${softStr}`);
            } else {
                parts.push(`Skills\n${String(data.skills)}`);
            }
        }

        // Experience
        if (data.experience?.length) {
            parts.push("Experience");
            for (const exp of data.experience) {
                parts.push(`${exp.role || exp.title || ""} at ${exp.company || ""} (${exp.startDate || ""} - ${exp.endDate || ""})`);
                if (exp.location) parts.push(exp.location);
                if (exp.description) {
                    let bullets: string[] = [];
                    if (Array.isArray(exp.description)) {
                        bullets = exp.description;
                    } else if (typeof exp.description === "string") {
                        bullets = exp.description.includes("\n") ? exp.description.split("\n") : [exp.description];
                    }
                    const desc = bullets.filter(Boolean).map((d: string) => `• ${d.replace(/^[-•*]\s*/, '')}`).join("\n");
                    parts.push(desc);
                }
            }
        }

        // Education
        if (data.education?.length) {
            parts.push("Education");
            for (const edu of data.education) {
                parts.push(`${edu.degree || ""} ${edu.field || ""} - ${edu.school || edu.institution || ""}`);
                if (edu.startDate || edu.endDate) parts.push(`${edu.startDate || ""} - ${edu.endDate || ""}`);
            }
        }

        // Projects
        if (data.projects?.length) {
            parts.push("Projects");
            for (const proj of data.projects) {
                parts.push(`${proj.name || ""} (${proj.techStack || ""})`);
                if (proj.description) {
                    let bullets: string[] = [];
                    if (Array.isArray(proj.description)) {
                        bullets = proj.description;
                    } else if (typeof proj.description === "string") {
                        bullets = proj.description.includes("\n") ? proj.description.split("\n") : [proj.description];
                    }
                    const desc = bullets.filter(Boolean).map((d: string) => `• ${d.replace(/^[-•*]\s*/, '')}`).join("\n");
                    parts.push(desc);
                }
            }
        }

        // Certifications
        if (data.certifications?.length) {
            parts.push("Certifications");
            for (const cert of data.certifications) parts.push(typeof cert === "string" ? cert : cert.name || "");
        }

        // Languages
        if (data.languages?.length) {
            parts.push("Languages");
            for (const lang of data.languages) parts.push(typeof lang === "string" ? lang : `${lang.name || ""} (${lang.proficiency || ""})`);
        }
        return parts.filter(Boolean).join("\n");
    };

    const handleRunAnalysis = async () => {
        setError("");
        if (!selectedJobId) { setError("Please select a Job Description."); return; }
        if (resumeSource === "saved" && !selectedResumeId) { setError("Please select a saved resume."); return; }
        if (resumeSource === "upload" && !uploadFile) { setError("Please upload a PDF file."); return; }
        const selectedJob = jobs.find((j) => j.id === selectedJobId);
        if (!selectedJob || !selectedJob.description) { setError("Selected job has no description text."); return; }

        setStep("loading");
        setAiReport(null);
        setAiError("");
        try {
            const formData = new FormData();
            formData.append("jd_text", selectedJob.description);
            let usedResumeText = "";
            if (resumeSource === "saved") {
                const selectedResume = savedResumes.find((r) => r.id === selectedResumeId);
                if (!selectedResume) { setError("Selected resume not found."); setStep("setup"); return; }
                usedResumeText = resumeToText(selectedResume.content);
                formData.append("resume_text", usedResumeText);
            } else if (uploadFile) {
                formData.append("resume_file", uploadFile);
                usedResumeText = "[PDF uploaded]";
            }
            setLastResumeText(usedResumeText);
            setLastJdText(selectedJob.description);

            const response = await fetch("/api/python/calculate-ats", { method: "POST", body: formData });
            if (!response.ok) throw new Error(await response.text());
            const data = await response.json();
            setResult(data);
            setStep("result");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong during analysis.");
            setStep("setup");
        }
    };

    const isPremium = subscription && subscription.plan_type !== "FREE";
    const hasCredits = subscription && subscription.credits_remaining > 0;

    const fetchAiReport = async (atsResult: any) => {
        if (!isPremium || !hasCredits) return;
        setIsLoadingAi(true);
        setAiError("");
        try {
            // Deduct credit
            const creditRes = await fetch("/api/credits/deduct", { method: "POST" });
            if (!creditRes.ok) { setAiError("No credits remaining."); setIsLoadingAi(false); return; }

            const formData = new FormData();
            formData.append("jd_text", lastJdText);
            formData.append("resume_text", lastResumeText);
            formData.append("ats_scores", JSON.stringify(atsResult));

            const res = await fetch("/api/python/enhance-ats-report", { method: "POST", body: formData });
            if (!res.ok) throw new Error(await res.text());
            setAiReport(await res.json());
            fetchSubscription();
        } catch (e: any) {
            console.error(e);
            setAiError(e.message || "Failed to generate AI report.");
        } finally { setIsLoadingAi(false); }
    };

    const getScoreColor = (score: number) => { if (score < 50) return "#ef4444"; if (score < 80) return "#eab308"; return "#22c55e"; };
    const getScoreTextColor = (score: number) => { if (score < 50) return "text-red-500"; if (score < 80) return "text-yellow-500"; return "text-green-600 dark:text-green-500"; };
    const getScoreBgColor = (score: number) => { if (score < 50) return "bg-red-500"; if (score < 80) return "bg-yellow-500"; return "bg-green-500"; };
    const getScoreLabel = (score: number) => { if (score < 30) return "Poor"; if (score < 50) return "Needs Work"; if (score < 70) return "Fair"; if (score < 80) return "Good"; return "Excellent"; };

    const getSeverityColor = (severity: string) => {
        if (severity === "high") return "text-red-400 bg-red-500/10 border-red-500/20";
        if (severity === "medium") return "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    };
    const getSeverityIcon = (severity: string) => {
        if (severity === "high") return <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
        if (severity === "medium") return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />;
        return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
    };

    const FORMAT_LABELS: Record<string, string> = {
        has_email: "Email address detected",
        has_phone: "Phone number detected",
        has_linkedin: "LinkedIn profile present",
        no_smart_quotes: "No smart quotes / special chars",
        no_tables: "No table formatting detected",
        has_dates: "Date references found",
        good_length: "Resume length is appropriate",
    };

    const startOver = () => { setStep("setup"); setResult(null); setAiReport(null); setError(""); setAiError(""); setUploadFile(null); setExpandedCard(null); setActiveSection("overview"); };

    const toggleCard = (card: string) => setExpandedCard(expandedCard === card ? null : card);

    const ScoreBar = ({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) => (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">{icon}{label}</div>
                <span className={`text-sm font-bold ${getScoreTextColor(score)}`}>{score}%</span>
            </div>
            <div className="w-full h-0.75 rounded-full bg-[var(--border-color)]/50 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ease-out ${getScoreBgColor(score)}`} style={{ width: `${score}%` }} />
            </div>
        </div>
    );

    const handleRefineWithAI = () => {
        if (!selectedJobId) {
            setDialogConfig({
                isOpen: true,
                type: 'alert',
                title: 'Job Required',
                description: 'A valid Job Tracking ID is required to refine with AI. Please make sure you selected a Saved Job.',
                variant: 'destructive',
                confirmText: 'Got it'
            });
            return;
        }

        setDialogConfig({
            isOpen: true,
            type: 'confirm',
            title: 'Use AI Refinement',
            description: 'Refining your resume with AI will cost 1 credit. Do you want to continue?',
            variant: 'default',
            confirmText: 'Refine Resume',
            onConfirm: () => {
                sessionStorage.setItem("ats_refine_resume", lastResumeText);
                sessionStorage.setItem("ats_refine_jd", lastJdText);
                if (result) {
                    sessionStorage.setItem("ats_refine_report", JSON.stringify(result));
                }
                router.push(`/dashboard/jobs/${selectedJobId}?refine=true`);
            }
        });
    };

    return (
        <div className="w-full max-w-7xl mx-auto min-h-[calc(100vh-120px)] flex flex-col space-y-6 animate-slide-down">

            {/* Page Header */}
            <div className="flex items-center justify-end shrink-0">

                <div className="flex items-center gap-3">
                    {step === "result" && (
                        <button onClick={handleRefineWithAI} className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg transition shadow-lg shadow-purple-500/20 text-sm font-bold">
                            <Wand2 className="h-4 w-4" /> Refine with AI
                        </button>
                    )}
                    {step === "result" && (
                        <button onClick={startOver} className="flex items-center gap-2 bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--foreground)] px-4 py-2 rounded-lg transition text-sm font-medium">
                            <RefreshCw className="h-4 w-4" /> New Analysis
                        </button>
                    )}
                    {subscription && (
                        <span className="text-xs text-[var(--text-secondary)] bg-[var(--sidebar-bg)] border border-[var(--border-color)] px-3 py-1.5 rounded-lg">
                            <Crown className="w-3 h-3 inline mr-1 text-amber-600 dark:text-amber-400" />{subscription.credits_remaining} credits
                        </span>
                    )}
                </div>
            </div>

            {/* ─── SETUP STEP ─── */}
            {
                step === "setup" && (
                    <div id="tour-ats-setup" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LEFT: JD Selection */}
                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-5">
                            <div>
                                <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">1. Select Job Description</h2>
                                <p className="text-xs text-[var(--text-secondary)]">Choose from your saved jobs in the Job Tracker.</p>
                            </div>
                            {error && (<div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>)}
                            {isFetchingJobs ? (
                                <div className="flex items-center justify-center h-32"><Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" /></div>
                            ) : jobs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-[var(--text-secondary)]">
                                    <Briefcase className="h-8 w-8 mb-2 opacity-20" />
                                    <p className="text-sm">No jobs with descriptions found.</p>
                                    <p className="text-xs mt-1">Add a job with a description in the Job Tracker first.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                                    {jobs.map((job) => (
                                        <label key={job.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedJobId === job.id ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 shadow-md" : "bg-black/5 dark:bg-white/5 border-[var(--border-color)] hover:border-[var(--foreground)]/30"}`}>
                                            <input type="radio" name="jdSelect" value={job.id} checked={selectedJobId === job.id} onChange={() => setSelectedJobId(job.id)} className="mt-1 w-4 h-4 text-[var(--primary)] bg-transparent border-[var(--border-color)] focus:ring-[var(--primary)]" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-[var(--foreground)] truncate">{job.jobTitle}</p>
                                                <p className="text-xs text-[var(--text-secondary)] truncate">{job.company}</p>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 opacity-60">{job.description?.substring(0, 120)}...</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Resume Source */}
                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-5 flex flex-col">
                            <div>
                                <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">2. Choose Resume</h2>
                                <p className="text-xs text-[var(--text-secondary)]">Select a saved resume or upload a new PDF.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setResumeSource("saved")} className={`flex-1 text-xs font-semibold py-2 px-3 rounded-lg border transition-all ${resumeSource === "saved" ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]" : "bg-black/5 dark:bg-white/5 border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--foreground)]/30"}`}>
                                    Saved Resumes
                                </button>
                                <button onClick={() => setResumeSource("upload")} className={`flex-1 text-xs font-semibold py-2 px-3 rounded-lg border transition-all ${resumeSource === "upload" ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 text-[var(--primary)]" : "bg-black/5 dark:bg-white/5 border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--foreground)]/30"}`}>
                                    Upload PDF
                                </button>
                            </div>

                            {resumeSource === "saved" && (
                                <div className="flex-1">
                                    {isFetchingResumes ? (
                                        <div className="flex items-center justify-center h-24"><Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" /></div>
                                    ) : savedResumes.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-24 text-[var(--text-secondary)]">
                                            <FileText className="h-8 w-8 mb-2 opacity-20" />
                                            <p className="text-sm">No saved resumes found.</p>
                                            <p className="text-xs mt-1">Generate a tailored resume first, or upload a PDF.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                                            {savedResumes.map((resume) => (
                                                <label key={resume.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedResumeId === resume.id ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 shadow-md" : "bg-black/5 dark:bg-white/5 border-[var(--border-color)] hover:border-[var(--foreground)]/30"}`}>
                                                    <input type="radio" name="resumeSelect" value={resume.id} checked={selectedResumeId === resume.id} onChange={() => setSelectedResumeId(resume.id)} className="mt-1 w-4 h-4 text-[var(--primary)] bg-transparent border-[var(--border-color)] focus:ring-[var(--primary)]" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[var(--foreground)] truncate">{resume.name}</p>
                                                        {resume.job && (
                                                            <p className="text-xs text-[var(--text-secondary)] truncate">{resume.job.jobTitle} — {resume.job.company}</p>
                                                        )}
                                                        <p className="text-[10px] text-[var(--text-secondary)] mt-1 opacity-50">
                                                            {new Date(resume.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {resumeSource === "upload" && (
                                <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 flex flex-col items-center justify-center bg-black/5 dark:bg-white/5 text-[var(--text-secondary)] hover:border-[var(--primary)]/40 transition-colors cursor-pointer relative group">
                                    <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                                    <UploadCloud className="w-10 h-10 mb-2 opacity-30 group-hover:opacity-60 group-hover:text-[var(--primary)] transition-all" />
                                    <span className="text-sm font-medium text-center">{uploadFile ? <span className="text-[var(--primary)]">{uploadFile.name}</span> : "Click or drag to upload PDF"}</span>
                                </div>
                            )}

                            <div className="mt-auto pt-4">
                                <button id="tour-run-ats" onClick={handleRunAnalysis} disabled={!selectedJobId || (resumeSource === "saved" && !selectedResumeId) || (resumeSource === "upload" && !uploadFile)} className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-white px-5 py-3 rounded-xl transition shadow-lg shadow-[var(--primary)]/20 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                    <ScanLine className="h-4 w-4" /> Run ATS Analysis
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ─── LOADING STEP ─── */}
            {
                step === "loading" && (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-10">
                        {/* Animated spinner with orbiting dots */}
                        <div className="relative w-28 h-28">
                            <div className="absolute inset-0 rounded-full blur-3xl bg-[var(--primary)]/20 animate-pulse" />
                            <div className="absolute inset-0 rounded-full border-4 border-[var(--border-color)]/30" />
                            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--primary)] animate-spin" />
                            <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-[var(--primary)]/50 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <ScanLine className="w-8 h-8 text-[var(--primary)] animate-pulse" />
                            </div>
                        </div>

                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-semibold text-[var(--foreground)]">Running deep analysis...</h3>
                            <p className="text-sm text-[var(--text-secondary)]" >Scanning your resume across 7 dimensions</p>
                        </div>

                        {/* Animated analysis steps */}
                        <div className="w-full max-w-md space-y-3">
                            {[
                                { label: "Extracting keywords from JD", icon: <Target className="w-4 h-4" />, delay: "0s" },
                                { label: "Computing semantic similarity", icon: <ScanLine className="w-4 h-4" />, delay: "0.6s" },
                                { label: "Checking resume sections", icon: <FileText className="w-4 h-4" />, delay: "1.2s" },
                                { label: "Analyzing impact & metrics", icon: <Zap className="w-4 h-4" />, delay: "1.8s" },
                                { label: "Evaluating readability", icon: <BookOpen className="w-4 h-4" />, delay: "2.4s" },
                                { label: "Checking ATS formatting", icon: <Shield className="w-4 h-4" />, delay: "3.0s" },
                                { label: "Detecting experience level", icon: <User className="w-4 h-4" />, delay: "3.6s" },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)]/50 opacity-0"
                                    style={{ animation: `ats-step-in 0.5s ease-out forwards`, animationDelay: item.delay }}
                                >
                                    <div className="text-[var(--primary)] opacity-0" style={{ animation: `ats-step-in 0.3s ease-out forwards`, animationDelay: `calc(${item.delay} + 0.2s)` }}>
                                        {item.icon}
                                    </div>
                                    <span className="text-sm text-[var(--foreground)] flex-1">{item.label}</span>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--primary)] opacity-0" style={{ animation: `ats-step-in 0.3s ease-out forwards`, animationDelay: `calc(${item.delay} + 0.3s)` }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* ─── RESULT STEP ─── */}
            {
                step === "result" && result && (
                    <div>

                        {/* Inline keyframes for animations */}
                        <style>{`
                        @keyframes ats-fade-up { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
                        @keyframes ats-step-in { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: translateX(0); } }
                        @keyframes ats-score-pop { 0% { opacity: 0; transform: scale(0.5); } 60% { transform: scale(1.08); } 100% { opacity: 1; transform: scale(1); } }
                        .ats-row-1 { animation: ats-fade-up 0.6s ease-out both; animation-delay: 0.1s; }
                        .ats-row-2 { animation: ats-fade-up 0.6s ease-out both; animation-delay: 0.15s; }
                        .ats-row-3 { animation: ats-fade-up 0.6s ease-out both; animation-delay: 0.2s; }
                        .ats-row-4 { animation: ats-fade-up 0.6s ease-out both; animation-delay: 0.25s; }
                        .ats-score-pop { animation: ats-score-pop 0.8s ease-out both; animation-delay: 0.3s; }
                    `}</style>

                        <div className="flex gap-6">

                            {/* ── Sticky Section Sidebar ── */}
                            <div className="hidden lg:block w-56 shrink-0">
                                <div className="sticky top-4 space-y-1.5 bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-3 shadow-xl">
                                    <div className="px-2 py-1.5 mb-1">
                                        <div className={`text-2xl font-bold ${result.overall_ats_score >= 80 ? 'text-green-600 dark:text-green-500' : result.overall_ats_score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {result.overall_ats_score}%
                                        </div>
                                        <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider">ATS Score</p>
                                    </div>
                                    <div className="border-t border-[var(--border-color)] pt-1.5">
                                        {[
                                            { id: "overview", label: "Overview", icon: <Layers className="w-3.5 h-3.5" />, badge: null },
                                            { id: "keywords", label: "Keywords", icon: <Target className="w-3.5 h-3.5" />, badge: `${result.found_skills?.length || 0}/${(result.found_skills?.length || 0) + (result.missing_skills?.length || 0)}` },
                                            { id: "sections", label: "Sections & Format", icon: <Shield className="w-3.5 h-3.5" />, badge: null },
                                            { id: "improvements", label: "Improvements", icon: <AlertTriangle className="w-3.5 h-3.5" />, badge: result.improvements?.length ? `${result.improvements.length}` : null },
                                            { id: "content", label: "Content Quality", icon: <Repeat className="w-3.5 h-3.5" />, badge: result.content_analysis?.repeated_words?.length ? `${result.content_analysis.repeated_words.length}` : null },
                                            { id: "review", label: "Resume Review", icon: <Eye className="w-3.5 h-3.5" />, badge: null },
                                            { id: "ai", label: "AI Insights", icon: <Sparkles className="w-3.5 h-3.5" />, badge: isPremium ? null : "PRO" },
                                        ].map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveSection(tab.id)}
                                                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-150 text-xs font-medium ${activeSection === tab.id
                                                    ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                                                    : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-bg)] hover:text-[var(--foreground)]"
                                                    }`}
                                            >
                                                {tab.icon}
                                                <span className="flex-1 truncate">{tab.label}</span>
                                                {tab.badge && (
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tab.id === "ai" && !isPremium ? "bg-purple-500/15 text-purple-400" :
                                                        "bg-[var(--border-color)] text-[var(--text-secondary)]"
                                                        }`}>{tab.badge}</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Start Over button */}
                                    <div className="border-t border-[var(--border-color)] pt-2 mt-1">
                                        <button onClick={startOver} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-400 transition-colors">
                                            <RefreshCw className="w-3.5 h-3.5" /> Start Over
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* ── Mobile tabs (horizontal scroll) ── */}
                            <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 mb-2">
                                {[
                                    { id: "overview", label: "Overview", icon: <Layers className="w-3.5 h-3.5" /> },
                                    { id: "keywords", label: "Keywords", icon: <Target className="w-3.5 h-3.5" /> },
                                    { id: "sections", label: "Sections", icon: <Shield className="w-3.5 h-3.5" /> },
                                    { id: "improvements", label: "Fixes", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
                                    { id: "content", label: "Content", icon: <Repeat className="w-3.5 h-3.5" /> },
                                    { id: "review", label: "Review", icon: <Eye className="w-3.5 h-3.5" /> },
                                    { id: "ai", label: "AI", icon: <Sparkles className="w-3.5 h-3.5" /> },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveSection(tab.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0 ${activeSection === tab.id
                                            ? "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20"
                                            : "bg-[var(--sidebar-bg)]/50 text-[var(--text-secondary)] border border-[var(--border-color)]"
                                            }`}
                                    >
                                        {tab.icon}{tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* ── Content Area ── */}
                            <div className="flex-1 min-w-0 space-y-6">

                                {/* ── OVERVIEW Section ── */}
                                {activeSection === "overview" && (<>
                                    {/* ── ROW 1: Overall Score + Score Breakdown + Experience Badge ── */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 ats-row-1">

                                        {/* Overall Score */}
                                        <div className="lg:col-span-3 bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl flex flex-col items-center justify-center space-y-4">
                                            <div className="relative flex items-center justify-center w-36 h-36 ats-score-pop">
                                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="44" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-[var(--border-color)]" />
                                                    <circle cx="50" cy="50" r="44" fill="transparent" stroke={getScoreColor(result.overall_ats_score)} strokeWidth="6"
                                                        strokeDasharray={`${result.overall_ats_score * 2.76} 276`} strokeLinecap="round" style={{ transition: "stroke-dasharray 1.5s ease-in-out" }} />
                                                </svg>
                                                <span className={`text-4xl font-bold ${getScoreTextColor(result.overall_ats_score)}`}>{result.overall_ats_score}</span>
                                            </div>
                                            <div className="text-center">
                                                <h3 className="text-base font-bold text-[var(--foreground)]">Overall ATS Score</h3>
                                                <p className={`text-sm font-semibold mt-1 ${getScoreTextColor(result.overall_ats_score)}`}>{getScoreLabel(result.overall_ats_score)}</p>
                                            </div>

                                            {/* Experience Level Badge */}
                                            {result.experience_info && (
                                                <div className="w-full border-t border-[var(--border-color)] pt-4 mt-2">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <User className="w-4 h-4 text-[var(--primary)]" />
                                                        <span className="text-sm font-bold text-[var(--foreground)]">{result.experience_info.level}</span>
                                                    </div>
                                                    <p className="text-[10px] text-center text-[var(--text-secondary)] mt-1">
                                                        ~{result.experience_info.estimated_years} yrs detected • {result.experience_info.confidence} confidence
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Score Breakdown — 6 dimensions */}
                                        <div className="lg:col-span-5 bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-3.5">
                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                <Layers className="w-4 h-4" /> Score Breakdown
                                            </h4>
                                            <div className="space-y-3.5">
                                                <ScoreBar label="Keywords (25%)" score={result.keyword_score} icon={<Target className="w-4 h-4 text-blue-400" />} />
                                                <ScoreBar label="Semantics (20%)" score={result.semantic_match_score} icon={<ScanLine className="w-4 h-4 text-purple-400" />} />
                                                <ScoreBar label="Sections (15%)" score={result.section_score} icon={<FileText className="w-4 h-4 text-cyan-400" />} />
                                                <ScoreBar label="Impact (15%)" score={result.impact_score} icon={<Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />} />
                                                <ScoreBar label="Format (15%)" score={result.format_score} icon={<Shield className="w-4 h-4 text-rose-400" />} />
                                                <ScoreBar label="Readability (10%)" score={result.readability_score} icon={<BookOpen className="w-4 h-4 text-emerald-400" />} />
                                            </div>
                                        </div>

                                        {/* Detailed Stats Panel */}
                                        <div className="lg:col-span-4 bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-4">
                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                <TrendingUp className="w-4 h-4" /> Resume Insights
                                            </h4>

                                            <div className="grid grid-cols-2 gap-2.5">
                                                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 text-center">
                                                    <p className="text-xl font-bold text-[var(--foreground)]">{result.readability_details?.word_count ?? 0}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-medium">Total Words</p>
                                                </div>
                                                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 text-center">
                                                    <p className="text-xl font-bold text-[var(--foreground)]">{result.readability_details?.sentence_count ?? 0}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-medium">Sentences</p>
                                                </div>
                                                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 text-center">
                                                    <p className="text-xl font-bold text-[var(--foreground)]">{result.impact_details?.action_verb_count ?? 0}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-medium">Action Verbs</p>
                                                </div>
                                                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 text-center">
                                                    <p className="text-xl font-bold text-[var(--foreground)]">{result.impact_details?.total_metrics ?? 0}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-medium">Metrics Found</p>
                                                </div>
                                                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 text-center">
                                                    <p className="text-xl font-bold text-[var(--foreground)]">{result.readability_details?.avg_sentence_length ?? 0}</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-medium">Avg Sent. Len</p>
                                                </div>
                                                <div className="bg-black/5 dark:bg-white/5 rounded-lg p-3 text-center">
                                                    <p className="text-xl font-bold text-[var(--foreground)]">{result.readability_details?.bullet_line_ratio ?? 0}%</p>
                                                    <p className="text-[10px] text-[var(--text-secondary)] uppercase font-medium">Bullet Ratio</p>
                                                </div>
                                            </div>

                                            {/* Metric breakdown */}
                                            <div className="border-t border-[var(--border-color)] pt-3 space-y-1.5">
                                                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                                                    <span>Percentages (%):</span><span className="font-bold text-[var(--foreground)]">{result.impact_details?.percentages_count ?? 0}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                                                    <span>Dollar amounts ($):</span><span className="font-bold text-[var(--foreground)]">{result.impact_details?.dollar_amounts_count ?? 0}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                                                    <span>Number references:</span><span className="font-bold text-[var(--foreground)]">{result.impact_details?.numbers_count ?? 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>)}

                                {/* ── KEYWORDS Section ── */}
                                {activeSection === "keywords" && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ats-row-1">

                                        {/* Found Keywords with Relevance */}
                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-4">
                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" /> Found Keywords ({result.found_skills?.length ?? 0})
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(result.found_skills?.length ?? 0) > 0 ? result.found_skills.map((item, i) => (
                                                    <span key={i} className="group relative px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 cursor-default">
                                                        {typeof item === 'string' ? item : item.keyword}
                                                        {typeof item !== 'string' && (
                                                            <span className="ml-1.5 text-[10px] opacity-60">{Math.round(item.relevance * 100)}%</span>
                                                        )}
                                                    </span>
                                                )) : <span className="text-sm text-[var(--text-secondary)]">No matching keywords.</span>}
                                            </div>
                                            {result.impact_details?.action_verbs_found?.length > 0 && (
                                                <div className="border-t border-[var(--border-color)] pt-3">
                                                    <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Action Verbs Detected</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {result.impact_details.action_verbs_found.map((v, i) => (
                                                            <span key={i} className="px-2 py-1 rounded text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 capitalize">{v}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Missing Keywords with Relevance */}
                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-4">
                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                <XCircle className="w-4 h-4 text-red-500" /> Missing Keywords ({result.missing_skills?.length ?? 0})
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(result.missing_skills?.length ?? 0) > 0 ? result.missing_skills.map((item, i) => (
                                                    <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 cursor-default">
                                                        {typeof item === 'string' ? item : item.keyword}
                                                        {typeof item !== 'string' && (
                                                            <span className="ml-1.5 text-[10px] opacity-60">{Math.round(item.relevance * 100)}%</span>
                                                        )}
                                                    </span>
                                                )) : <span className="text-sm text-[var(--text-secondary)]">All keywords matched!</span>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── SECTIONS & FORMAT Section ── */}
                                {activeSection === "sections" && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 ats-row-1">

                                        {/* Section Coverage */}
                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-4">
                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-cyan-400" /> Resume Sections ({Object.values(result.section_feedback ?? {}).filter(Boolean).length}/{Object.keys(result.section_feedback ?? {}).length})
                                            </h4>
                                            <div className="space-y-2.5">
                                                {result.section_feedback && Object.entries(result.section_feedback).map(([key, found]) => (
                                                    <div key={key} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-black/5 dark:bg-white/5">
                                                        <span className="text-sm text-[var(--foreground)] capitalize font-medium">{key.replace("has_", "")}</span>
                                                        <div className="flex items-center gap-2">
                                                            {found ? (
                                                                <><span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Detected</span><CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" /></>
                                                            ) : (
                                                                <><span className="text-[10px] text-red-400 font-medium">Missing</span><XCircle className="w-4 h-4 text-red-500/60" /></>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ATS Format Compatibility */}
                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-4">
                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                <Shield className="w-4 h-4 text-rose-400" /> ATS Format Compatibility ({result.format_checks ? Object.values(result.format_checks).filter(Boolean).length : 0}/{result.format_checks ? Object.keys(result.format_checks).length : 0})
                                            </h4>
                                            <div className="space-y-2.5">
                                                {result.format_checks && Object.entries(result.format_checks).map(([key, passed]) => (
                                                    <div key={key} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-black/5 dark:bg-white/5">
                                                        <span className="text-sm text-[var(--foreground)] font-medium">{FORMAT_LABELS[key] || key}</span>
                                                        <div className="flex items-center gap-2">
                                                            {passed ? (
                                                                <><span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Pass</span><CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" /></>
                                                            ) : (
                                                                <><span className="text-[10px] text-red-400 font-medium">Fail</span><XCircle className="w-4 h-4 text-red-500/60" /></>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ── IMPROVEMENTS Section ── */}
                                {activeSection === "improvements" && (<>
                                    {result.improvements && result.improvements.length > 0 && (
                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-4 ats-row-1">
                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-orange-400" /> Actionable Improvements ({result.improvements.length})
                                            </h4>
                                            <div className="space-y-3">
                                                {result.improvements.map((imp, i) => (
                                                    <div key={i} className={`flex gap-3 p-3.5 rounded-lg border ${getSeverityColor(imp.severity || "low")}`}>
                                                        {getSeverityIcon(imp.severity || "low")}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{imp.category || "General"}</span>
                                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${imp.severity === "high" ? "bg-red-500/20 text-red-400" :
                                                                    imp.severity === "medium" ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" :
                                                                        "bg-blue-500/20 text-blue-400"
                                                                    }`}>{imp.severity || "info"}</span>
                                                            </div>
                                                            <p className="text-sm text-[var(--foreground)]">{imp.message || (typeof imp === 'string' ? imp : '')}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(!result.improvements || result.improvements.length === 0) && (
                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl text-center ats-row-1">
                                            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500 mx-auto mb-2" />
                                            <p className="text-sm text-[var(--foreground)] font-medium">No improvements needed!</p>
                                            <p className="text-xs text-[var(--text-secondary)]">Your resume is well-optimized for this job description.</p>
                                        </div>
                                    )}
                                </>)}

                                {/* ── CONTENT QUALITY Section ── */}
                                {activeSection === "content" && (<>
                                    {result.content_analysis?.repeated_words && result.content_analysis.repeated_words.length > 0 && (
                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-4 ats-row-1">
                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                <Repeat className="w-4 h-4 text-orange-400" /> Repeated Words ({result.content_analysis.repeated_words.length})
                                            </h4>
                                            <p className="text-xs text-[var(--text-secondary)]">
                                                Using the same action verb too often weakens your resume&apos;s impact. Try replacing repeated words with synonyms.
                                            </p>
                                            <div className="space-y-3">
                                                {result.content_analysis.repeated_words.map((rw, i) => (
                                                    <div key={i} className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-black/5 dark:bg-white/5">
                                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/25">
                                                            {rw.count}x: {rw.word}
                                                        </span>
                                                        <span className="text-xs text-[var(--text-secondary)]">try replacing with</span>
                                                        {rw.synonyms.map((syn, j) => (
                                                            <span key={j} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-default">
                                                                {syn}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {(!result.content_analysis?.repeated_words || result.content_analysis.repeated_words.length === 0) && (
                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl text-center ats-row-1">
                                            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500 mx-auto mb-2" />
                                            <p className="text-sm text-[var(--foreground)] font-medium">Great word variety!</p>
                                            <p className="text-xs text-[var(--text-secondary)]">No excessively repeated action verbs detected.</p>
                                        </div>
                                    )}
                                </>)}

                                {/* ── RESUME REVIEW Section ── */}
                                {activeSection === "review" && (<>
                                    {result.content_analysis?.section_diagnostics && (
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 ats-row-1">

                                            {/* Left: Section-by-section diagnostics */}
                                            <div className="lg:col-span-5 bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-4">
                                                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                    <Eye className="w-4 h-4 text-indigo-400" /> Section Review
                                                </h4>
                                                <div className="space-y-3">
                                                    {result.content_analysis.section_diagnostics.map((sec, i) => (
                                                        <div key={i} className={`p-3.5 rounded-lg border ${sec.status === "strong" ? "border-green-500/25 bg-green-500/5" :
                                                            sec.status === "needs_work" ? "border-yellow-500/25 bg-yellow-500/5" :
                                                                "border-red-500/25 bg-red-500/5"
                                                            }`}>
                                                            <div className="flex items-center justify-between mb-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    {sec.status === "strong" ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" /> :
                                                                        sec.status === "needs_work" ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> :
                                                                            <XCircle className="w-4 h-4 text-red-500" />}
                                                                    <span className="text-sm font-bold text-[var(--foreground)]">{sec.section}</span>
                                                                </div>
                                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${sec.status === "strong" ? "bg-green-500/15 text-green-600 dark:text-green-400" :
                                                                    sec.status === "needs_work" ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" :
                                                                        "bg-red-500/15 text-red-400"
                                                                    }`}>{sec.status === "needs_work" ? "Needs Work" : sec.status}</span>
                                                            </div>

                                                            {sec.status !== "missing" && (
                                                                <div className="flex gap-4 text-[10px] text-[var(--text-secondary)] mb-1.5">
                                                                    <span>{sec.line_count} lines</span>
                                                                    <span>{sec.bullet_count} bullets</span>
                                                                    <span>{sec.word_count} words</span>
                                                                    <span>~{sec.avg_words_per_line} words/line</span>
                                                                </div>
                                                            )}

                                                            {sec.issues.length > 0 && (
                                                                <ul className="space-y-0.5">
                                                                    {sec.issues.map((issue, j) => (
                                                                        <li key={j} className="flex gap-1.5 text-xs text-[var(--text-secondary)]">
                                                                            <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-[var(--text-secondary)]" />
                                                                            {issue}
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Right: Resume text preview */}
                                            <div className="lg:col-span-7 bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-3">
                                                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-cyan-400" /> Resume Preview
                                                </h4>
                                                <div className="max-h-[500px] overflow-y-auto rounded-lg bg-white dark:bg-gray-950 border border-[var(--border-color)] p-5 space-y-0.5">
                                                    {lastResumeText && lastResumeText !== "[PDF uploaded]" ? (
                                                        lastResumeText.split('\n').map((line, i) => {
                                                            const trimmed = line.trim();
                                                            if (!trimmed) return <div key={i} className="h-2" />;

                                                            // Detect section headers
                                                            const isSectionHeader = /^(professional\s+summary|summary|experience|education|skills|projects|certifications|languages|professional\s+experience|key\s+projects|core\s+skills)/i.test(trimmed);
                                                            const isBullet = /^[•\-·*–]/.test(trimmed);

                                                            // Color-code based on section diagnostics
                                                            let sectionStatus: string | null = null;
                                                            if (isSectionHeader && result.content_analysis?.section_diagnostics) {
                                                                const matchedSection = result.content_analysis.section_diagnostics.find(
                                                                    sec => trimmed.toLowerCase().includes(sec.section.toLowerCase())
                                                                );
                                                                if (matchedSection) sectionStatus = matchedSection.status;
                                                            }

                                                            if (isSectionHeader) {
                                                                return (
                                                                    <div key={i} className={`font-bold text-sm uppercase tracking-wider mt-3 mb-1 pb-1 border-b-2 ${sectionStatus === "strong" ? "text-green-600 dark:text-green-600 dark:text-green-400 border-green-500/30" :
                                                                        sectionStatus === "needs_work" ? "text-yellow-600 dark:text-yellow-600 dark:text-yellow-400 border-yellow-500/30" :
                                                                            sectionStatus === "missing" ? "text-red-600 dark:text-red-400 border-red-500/30" :
                                                                                "text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-700"
                                                                        }`}>
                                                                        {trimmed}
                                                                    </div>
                                                                );
                                                            }

                                                            if (isBullet) {
                                                                return (
                                                                    <p key={i} className="text-xs text-gray-700 dark:text-gray-300 pl-3 leading-relaxed">
                                                                        {trimmed}
                                                                    </p>
                                                                );
                                                            }

                                                            return (
                                                                <p key={i} className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                                                                    {trimmed}
                                                                </p>
                                                            );
                                                        })
                                                    ) : (
                                                        <p className="text-sm text-[var(--text-secondary)] text-center py-8">
                                                            Resume preview is only available for saved resumes (not PDF uploads).
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>)}

                                {/* ── AI INSIGHTS Section ── */}
                                {activeSection === "ai" && (
                                    <div className="ats-row-1">
                                        {!aiReport && !isLoadingAi && (
                                            <div className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-xl p-6 shadow-xl">
                                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                                            <Sparkles className="w-5 h-5 text-purple-400" />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-sm font-bold text-[var(--foreground)]">AI Expert Insights</h3>
                                                            <p className="text-xs text-[var(--text-secondary)]">Get bullet rewrites, keyword placement tips, and a prioritized action plan from Gemini AI</p>
                                                        </div>
                                                    </div>
                                                    {isPremium ? (
                                                        <button onClick={() => fetchAiReport(result)} disabled={!hasCredits || isLoadingAi} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-2.5 rounded-xl transition shadow-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                                                            <Sparkles className="h-4 w-4" /> Generate AI Insights <span className="text-[10px] opacity-70">(1 credit)</span>
                                                        </button>
                                                    ) : (
                                                        <a href="/dashboard/billing" className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-xl shadow-lg font-medium text-sm whitespace-nowrap">
                                                            <Crown className="h-4 w-4" /> Upgrade to PRO
                                                        </a>
                                                    )}
                                                </div>
                                                {aiError && <p className="text-xs text-red-400 mt-3">{aiError}</p>}
                                            </div>
                                        )}

                                        {isLoadingAi && (
                                            <div className="bg-[var(--sidebar-bg)]/50 border border-purple-500/20 rounded-xl p-8 shadow-xl flex flex-col items-center justify-center space-y-4">
                                                <div className="relative w-16 h-16">
                                                    <div className="absolute inset-0 rounded-full bg-purple-500/10 blur-xl animate-pulse" />
                                                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" />
                                                    <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-6 h-6 text-purple-400 animate-pulse" /></div>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-medium text-[var(--foreground)]">Generating AI expert report...</p>
                                                    <p className="text-xs text-[var(--text-secondary)] mt-1">Analyzing your scores with Gemini AI</p>
                                                </div>
                                            </div>
                                        )}

                                        {aiReport && (
                                            <div className="space-y-5">
                                                {/* AI Section Header */}
                                                <div className="flex items-center gap-2 pt-2">
                                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider">AI Expert Insights</h3>
                                                </div>

                                                {/* Executive Summary */}
                                                <div className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-xl p-6">
                                                    <p className="text-sm text-[var(--foreground)] leading-relaxed">{aiReport.executive_summary}</p>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                    {/* Keyword Insights */}
                                                    {aiReport.keyword_insights && (
                                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-5 space-y-3">
                                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2"><Target className="w-4 h-4 text-orange-400" /> Keyword Insights</h4>
                                                            <p className="text-sm text-[var(--text-secondary)]">{aiReport.keyword_insights.analysis}</p>
                                                            {aiReport.keyword_insights.critical_missing?.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-red-400 uppercase mb-1.5">Critical Missing Keywords</p>
                                                                    <div className="flex flex-wrap gap-1.5">{aiReport.keyword_insights.critical_missing.map((k: string, i: number) => <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-400 border border-red-500/20">{k}</span>)}</div>
                                                                </div>
                                                            )}
                                                            {aiReport.keyword_insights.keyword_placement_tips?.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase mb-1.5">Where to Add Them</p>
                                                                    <ul className="space-y-1">{aiReport.keyword_insights.keyword_placement_tips.map((t: string, i: number) => <li key={i} className="flex gap-2 text-xs text-[var(--foreground)]"><ChevronRight className="w-3 h-3 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />{t}</li>)}</ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Experience Review */}
                                                    {aiReport.experience_review && (
                                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-5 space-y-3">
                                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2"><Briefcase className="w-4 h-4 text-blue-400" /> Experience Review</h4>
                                                            <p className="text-sm text-[var(--text-secondary)]">{aiReport.experience_review.analysis}</p>
                                                            {aiReport.experience_review.strong_points?.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase mb-1">Strengths</p>
                                                                    <ul className="space-y-1">{aiReport.experience_review.strong_points.map((s: string, i: number) => <li key={i} className="flex gap-2 text-xs text-[var(--foreground)]"><CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />{s}</li>)}</ul>
                                                                </div>
                                                            )}
                                                            {aiReport.experience_review.gaps?.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-red-400 uppercase mb-1">Gaps</p>
                                                                    <ul className="space-y-1">{aiReport.experience_review.gaps.map((g: string, i: number) => <li key={i} className="flex gap-2 text-xs text-[var(--foreground)]"><XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />{g}</li>)}</ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Impact Review with Bullet Rewrites */}
                                                {aiReport.impact_review && (
                                                    <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-5 space-y-4">
                                                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /> Impact Review</h4>
                                                        <p className="text-sm text-[var(--text-secondary)]">{aiReport.impact_review.analysis}</p>
                                                        {aiReport.impact_review.rewrite_suggestions?.length > 0 && (
                                                            <div className="space-y-3">
                                                                <p className="text-[10px] font-bold text-purple-400 uppercase flex items-center gap-1"><Pen className="w-3 h-3" /> Bullet Rewrites</p>
                                                                {aiReport.impact_review.rewrite_suggestions.map((r: any, i: number) => (
                                                                    <div key={i} className="space-y-1.5 p-3 rounded-lg bg-black/5 dark:bg-white/5">
                                                                        <div className="flex items-start gap-2"><XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" /><p className="text-xs text-red-400 line-through opacity-70">{r.original}</p></div>
                                                                        <div className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-green-600 dark:text-green-400 mt-0.5 shrink-0" /><p className="text-xs text-green-600 dark:text-green-400">{r.improved}</p></div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Section Recommendations + Competitive Insights */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                    {aiReport.section_recommendations?.length > 0 && (
                                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-5 space-y-3">
                                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2"><Layers className="w-4 h-4 text-indigo-400" /> Section Recommendations</h4>
                                                            {aiReport.section_recommendations.map((s: any, i: number) => (
                                                                <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg bg-black/5 dark:bg-white/5">
                                                                    {s.status === "strong" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-500 mt-0.5 shrink-0" /> : s.status === "missing" ? <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-semibold text-[var(--foreground)]">{s.section}</p>
                                                                        <p className="text-[11px] text-[var(--text-secondary)]">{s.suggestion || s.feedback}</p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {aiReport.competitive_insights && (
                                                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-5 space-y-3">
                                                            <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2"><Star className="w-4 h-4 text-amber-600 dark:text-amber-400" /> Competitive Insights</h4>
                                                            {aiReport.competitive_insights.differentiators?.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase mb-1">Your Edge</p>
                                                                    <ul className="space-y-1">{aiReport.competitive_insights.differentiators.map((d: string, i: number) => <li key={i} className="flex gap-2 text-xs text-[var(--foreground)]"><Star className="w-3 h-3 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />{d}</li>)}</ul>
                                                                </div>
                                                            )}
                                                            {aiReport.competitive_insights.missing_edge?.length > 0 && (
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-400 uppercase mb-1">What's Missing</p>
                                                                    <ul className="space-y-1">{aiReport.competitive_insights.missing_edge.map((d: string, i: number) => <li key={i} className="flex gap-2 text-xs text-[var(--foreground)]"><AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />{d}</li>)}</ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Action Plan */}
                                                {aiReport.action_plan?.length > 0 && (
                                                    <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-5 space-y-3">
                                                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Prioritized Action Plan</h4>
                                                        <div className="space-y-2.5">
                                                            {aiReport.action_plan.map((a: any, i: number) => (
                                                                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-black/5 dark:bg-white/5">
                                                                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 font-bold text-xs shrink-0">{a.priority}</div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm text-[var(--foreground)]">{a.action}</p>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.impact === "high" ? "text-red-400 bg-red-500/10" : a.impact === "medium" ? "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10" : "text-blue-400 bg-blue-500/10"}`}>{a.impact}</span>
                                                                            {a.expected_score_boost && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">+{a.expected_score_boost} pts</span>}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Formatting Tips */}
                                                {aiReport.formatting_tips?.length > 0 && (
                                                    <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-5 space-y-2">
                                                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2"><Shield className="w-4 h-4 text-rose-400" /> Formatting Tips</h4>
                                                        <ul className="space-y-1">{aiReport.formatting_tips.map((t: string, i: number) => <li key={i} className="flex gap-2 text-xs text-[var(--foreground)]"><ChevronRight className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />{t}</li>)}</ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>{/* end content area */}
                        </div>{/* end flex container */}
                    </div>
                )}

            <CustomDialog
                {...dialogConfig}
                onClose={() => setDialogConfig(s => ({ ...s, isOpen: false }))}
            />
        </div>
    );
}
