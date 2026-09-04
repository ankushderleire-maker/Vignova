"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import {
    Loader2,
    CheckCircle2,
    RefreshCw,
    ScanLine,
    Info,
    Wand2,
    Linkedin,
    ArrowRight,
    Shield,
    Target,
    UserCircle,
    Briefcase,
    Sparkles,
    GraduationCap,
    BarChart3,
    Search,
    Check,
    HelpCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import LinkedInProfileView, { summarizeProfile } from "@/components/linkedin/LinkedInProfileView";

interface LinkedInAnalysisResult {
    id: string;
    overallScore: number;
    sectionScores: {
        completeness: number;
        keyword: number;
        semantic: number;
        impact: number;
        readability: number;
        headline: number;
        projects?: number;
    };
    recommendations: { category: string; severity: string; message: string; }[];
    rawProfileData: any;
}

const hasUsefulMasterValue = (value: any): boolean => {
    if (typeof value === "string") {
        const clean = value.trim();
        return clean.length > 1 && clean !== "https://";
    }
    if (Array.isArray(value)) return value.some(hasUsefulMasterValue);
    if (value && typeof value === "object") return Object.values(value).some(hasUsefulMasterValue);
    return typeof value === "number" || typeof value === "boolean";
};

const hasUsableMasterProfileData = (profileData: any) => Boolean(profileData && hasUsefulMasterValue(profileData));

const estimateProjectScore = (profile: any) => {
    const projects = Array.isArray(profile?.projects) ? profile.projects : [];
    if (!projects.length) return 0;

    const projectText = projects
        .map((project: any) => [
            project?.title,
            project?.name,
            project?.description,
            project?.associatedWith,
            ...(Array.isArray(project?.skills) ? project.skills : []),
        ].filter(Boolean).join(" "))
        .join(" ");

    const countScore = Math.min(projects.length / 3, 1) * 100;
    const detailScore = Math.min(projectText.split(/\s+/).filter(Boolean).length / 120, 1) * 100;
    const relevanceScore = detailScore > 0 ? 100 : 0;
    return Math.round(Math.min(100, (0.10 * countScore) + (0.45 * relevanceScore) + (0.45 * detailScore)));
};

const scoreTokens = (text: string) => {
    const stopWords = new Set([
        "the", "and", "with", "for", "from", "this", "that", "your", "you",
        "are", "was", "were", "have", "has", "will", "can", "into", "using",
        "work", "role", "team", "teams", "profile", "linkedin", "professional",
    ]);
    return new Set((text || "").toLowerCase().match(/[a-z][a-z0-9+.#-]{2,}/g)?.filter((word) => !stopWords.has(word)) || []);
};

const profileTextForScore = (profile: any) => [
    profile?.headline,
    profile?.about,
    ...(Array.isArray(profile?.experience) ? profile.experience.map((exp: any) => [exp?.title, exp?.company, exp?.description, exp?.associatedSkills].filter(Boolean).join(" ")) : []),
    ...(Array.isArray(profile?.projects) ? profile.projects.map((project: any) => [project?.title, project?.description, project?.associatedWith, ...(Array.isArray(project?.skills) ? project.skills : [])].filter(Boolean).join(" ")) : []),
    ...(Array.isArray(profile?.skills) ? profile.skills.map((skill: any) => typeof skill === "string" ? skill : skill?.name || skill?.title || "") : []),
].filter(Boolean).join(" ");

const profileSkills = (profile: any) => (
    Array.isArray(profile?.skills)
        ? profile.skills.map((skill: any) => typeof skill === "string" ? skill : skill?.name || skill?.title || "").filter(Boolean)
        : []
);

const estimateKeywordScoreWithoutMaster = (profile: any) => {
    const skills = profileSkills(profile);
    const skillWords = scoreTokens(skills.join(" "));
    const profileWords = scoreTokens(profileTextForScore(profile));
    const headlineWords = scoreTokens(profile?.headline || "");
    const aboutWords = scoreTokens(profile?.about || "");
    const experienceWords = scoreTokens((profile?.experience || []).map((exp: any) => exp?.description || "").join(" "));

    const skillCountScore = Math.min(skills.length / 20, 1) * 35;
    const skillUsageScore = Math.min([...profileWords].filter((word) => skillWords.has(word)).length / Math.max(5, Math.min(skillWords.size || 5, 20)), 1) * 30;
    const coverageScore =
        ([...headlineWords].some((word) => skillWords.has(word)) ? 10 : 0) +
        ([...aboutWords].some((word) => skillWords.has(word)) ? 10 : 0) +
        ([...experienceWords].some((word) => skillWords.has(word)) ? 10 : 0);
    const vocabularyScore = Math.min(profileWords.size / 45, 1) * 5;
    return Math.round(Math.min(100, skillCountScore + skillUsageScore + coverageScore + vocabularyScore));
};

const estimateSemanticScoreWithoutMaster = (profile: any) => {
    const headlineWords = scoreTokens(profile?.headline || "");
    const aboutWords = scoreTokens(profile?.about || "");
    const experienceWords = scoreTokens((profile?.experience || []).map((exp: any) => exp?.description || "").join(" "));
    const skillWords = scoreTokens(profileSkills(profile).join(" "));

    const overlap = (a: Set<string>, b: Set<string>) => {
        if (!a.size || !b.size) return 0;
        return Math.min([...a].filter((word) => b.has(word)).length / Math.max(3, Math.min(a.size, b.size)), 1) * 100;
    };
    const pairScore = (
        overlap(headlineWords, aboutWords) +
        overlap(headlineWords, experienceWords) +
        overlap(skillWords, aboutWords) +
        overlap(skillWords, experienceWords)
    ) / 4;
    const depthScore =
        Math.min(aboutWords.size / 35, 1) * 40 +
        Math.min(experienceWords.size / 45, 1) * 40 +
        Math.min(skillWords.size / 15, 1) * 20;
    return Math.round((0.70 * pairScore) + (0.30 * depthScore));
};

const projectFingerprint = (profile: any) => (
    Array.isArray(profile?.projects)
        ? profile.projects.map((project: any) => [
            project?.title,
            project?.description,
            project?.associatedWith,
        ].filter(Boolean).join(" ")).join(" ")
        : ""
).toLowerCase().replace(/\s+/g, " ").trim();

const normalizeOptimizedScores = (scores: any, currentScores: any, currentProfile: any, optimizedProfile: any) => {
    const normalized = { ...(scores || {}) };
    if (projectFingerprint(currentProfile) === projectFingerprint(optimizedProfile)) {
        normalized.projects = currentScores?.projects ?? normalized.projects;
    }
    return normalized;
};

const normalizeLinkedInScores = (scores: any, profile: any, hasMasterProfile: boolean) => {
    const normalized = {
        ...(scores || {}),
        projects: typeof scores?.projects === "number" ? scores.projects : estimateProjectScore(profile),
    };
    if (!hasMasterProfile) {
        normalized.keyword = estimateKeywordScoreWithoutMaster(profile);
        normalized.semantic = estimateSemanticScoreWithoutMaster(profile);
    }
    return normalized;
};

const calculateDisplayScoreFromSections = (fallbackScore: number, normalizedScores: any) => {
    if (!normalizedScores || Object.keys(normalizedScores).length === 0) return fallbackScore;

    const score = (key: string) => {
        const value = Number(normalizedScores[key]);
        return Number.isFinite(value) ? value : 0;
    };

    const baseScore =
        0.15 * score("completeness") +
        0.25 * score("keyword") +
        0.20 * score("semantic") +
        0.20 * score("impact") +
        0.10 * score("readability") +
        0.10 * score("headline");
    const projectBonus = 0.05 * score("projects");

    return Math.min(100, Math.round((baseScore + projectBonus) * 10) / 10);
};

export default function LinkedInOptimizerPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>}>
            <LinkedInOptimizerContent />
        </Suspense>
    );
}

/**
 * The stages we walk through while the Apify run is in flight. They are
 * cosmetic — the scrape is a single opaque job — but they tell the user what
 * is actually happening instead of showing a bare spinner for a minute.
 */
const FETCH_STAGES = [
    { label: "Opening a secure channel", hint: "Handing your profile URL to our scraping service", icon: Shield },
    { label: "Locating your profile", hint: "Finding the public page behind that URL", icon: Search },
    { label: "Reading headline & about", hint: "Pulling the sections recruiters see first", icon: UserCircle },
    { label: "Extracting experience", hint: "Roles, dates, descriptions and impact", icon: Briefcase },
    { label: "Collecting skills & education", hint: "Everything that feeds keyword matching", icon: GraduationCap },
    { label: "Matching your master profile", hint: "Scoring the gap between resume and LinkedIn", icon: Target },
];

// Roughly how long each stage is shown before advancing, in ms.
const STAGE_DURATION_MS = 7000;
const POLL_INTERVAL_MS = 2500;
const MAX_WAIT_MS = 4 * 60 * 1000;

function LinkedInOptimizerContent() {
    const router = useRouter();
    const { data: session } = useSession();
    const [step, setStep] = useState<"setup" | "loading" | "result">("setup");
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [result, setResult] = useState<LinkedInAnalysisResult | null>(null);
    const [error, setError] = useState("");
    const [activeSection, setActiveSection] = useState("overview");
    const [viewMode, setViewMode] = useState<"current" | "optimized">("current");

    // Fetching animation state
    const [stageIndex, setStageIndex] = useState(0);
    const [elapsed, setElapsed] = useState(0);

    const [copiedText, setCopiedText] = useState("");
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(""), 2000);
    };

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [aiReport, setAiReport] = useState<any>(null);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [showMissingMasterModal, setShowMissingMasterModal] = useState(false);
    
    // Master profiles
    const [masterProfiles, setMasterProfiles] = useState<any[]>([]);
    const [selectedMasterProfile, setSelectedMasterProfile] = useState<string>("");
    const [selectedMasterProfileData, setSelectedMasterProfileData] = useState<any>(null);
    const [isMasterProfileLoading, setIsMasterProfileLoading] = useState(false);
    
    // Timers for the in-flight scrape, cleared on unmount / cancel.
    // runTokenRef identifies the current attempt: bumping it makes every older
    // poll loop bail out, so a re-run or a cancel can't leave a stale loop
    // writing results into the page.
    const runTokenRef = useRef(0);
    const stageTimerRef = useRef<NodeJS.Timeout | null>(null);
    const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

    const stopFetchTimers = () => {
        runTokenRef.current += 1;
        if (stageTimerRef.current) { clearInterval(stageTimerRef.current); stageTimerRef.current = null; }
        if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    };

    useEffect(() => stopFetchTimers, []);

    useEffect(() => {
        // Fetch previous analysis
        const fetchHistory = async () => {
            try {
                const res = await fetch("/api/linkedin/history");
                if (res.ok) {
                    const data = await res.json();
                    if (data.result) {
                        const parsedResult = { ...data.result };
                        
                        const deeplyParse = (val: any) => {
                            let current = val;
                            while (typeof current === 'string') {
                                try {
                                    const parsed = JSON.parse(current);
                                    if (typeof parsed === 'string' && parsed === current) break;
                                    current = parsed;
                                } catch (e) {
                                    break;
                                }
                            }
                            return current;
                        };

                        parsedResult.rawProfileData = deeplyParse(parsedResult.rawProfileData);
                        parsedResult.recommendations = deeplyParse(parsedResult.recommendations);
                        parsedResult.sectionScores = deeplyParse(parsedResult.sectionScores);
                        
                        setResult(parsedResult);
                        if (parsedResult.optimizedContent) {
                            setAiReport(deeplyParse(parsedResult.optimizedContent));
                            setViewMode("optimized");
                        }
                        setStep("result");
                    }
                }
            } catch (e) {}
        };
        fetchHistory();
        fetchMasterProfiles();
    }, []);

    useEffect(() => {
        const fetchSelectedMasterProfile = async () => {
            if (!selectedMasterProfile) {
                setSelectedMasterProfileData(null);
                setIsMasterProfileLoading(false);
                return;
            }
            setIsMasterProfileLoading(true);
            try {
                const res = await fetch(`/api/profiles/${selectedMasterProfile}`);
                if (!res.ok) {
                    setSelectedMasterProfileData(null);
                    return;
                }
                const data = await res.json();
                setSelectedMasterProfileData(data.profile?.parsed_data || null);
            } catch {
                setSelectedMasterProfileData(null);
            } finally {
                setIsMasterProfileLoading(false);
            }
        };
        fetchSelectedMasterProfile();
    }, [selectedMasterProfile]);

    const fetchMasterProfiles = async () => {
        try {
            const res = await fetch("/api/profiles");
            const data = await res.json();
            const profiles = data.data || data.profiles || [];
            if (profiles.length) {
                setMasterProfiles(profiles);
                const def = profiles.find((p: any) => p.is_default);
                if (def) setSelectedMasterProfile(def.id);
                else setSelectedMasterProfile(profiles[0].id);
            } else {
                setMasterProfiles([]);
                setSelectedMasterProfile("");
                setSelectedMasterProfileData(null);
            }
        } catch (e) { console.error("Failed to fetch master profiles", e); }
    };

    const failScrape = (message: string) => {
        stopFetchTimers();
        setError(message);
        setStep("setup");
    };

    /**
     * Kicks off the scrape on our own API (which owns the scraping provider
     * credentials) and then polls it until the profile is back. The browser
     * never touches the scraping service directly.
     */
    const handleConnect = async () => {
        setError("");
        if (!linkedinUrl.includes("linkedin.com/in/")) {
            setError("Please enter a valid LinkedIn profile URL, e.g. https://www.linkedin.com/in/your-name");
            return;
        }
        let finalUrl = linkedinUrl.trim();
        if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
            finalUrl = "https://" + finalUrl;
        }
        setLinkedinUrl(finalUrl);

        // Reset + start the animation timers. stopFetchTimers() bumps the run
        // token, so any earlier attempt still in flight stops here.
        stopFetchTimers();
        const token = runTokenRef.current;
        setStageIndex(0);
        setElapsed(0);
        setStep("loading");

        stageTimerRef.current = setInterval(() => {
            setStageIndex((prev) => Math.min(prev + 1, FETCH_STAGES.length - 1));
        }, STAGE_DURATION_MS);
        elapsedTimerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

        const masterProfileId = selectedMasterProfile;

        try {
            const startRes = await fetch("/api/linkedin/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ linkedinUrl: finalUrl, masterProfileId }),
            });
            if (runTokenRef.current !== token) return;

            const startData = await startRes.json().catch(() => ({}));
            if (!startRes.ok || !startData?.runId) {
                failScrape(startData?.error || "Could not start the LinkedIn scan. Please try again.");
                return;
            }

            await pollScrape(token, startData.runId, finalUrl, masterProfileId);
        } catch (err: any) {
            if (runTokenRef.current !== token) return;
            failScrape(err?.message || "Could not reach the server. Please try again.");
        }
    };

    const pollScrape = async (token: number, runId: string, url: string, masterProfileId: string) => {
        const deadline = Date.now() + MAX_WAIT_MS;

        while (runTokenRef.current === token) {
            if (Date.now() > deadline) {
                failScrape("The scan is taking longer than expected. Please try again in a moment.");
                return;
            }

            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
            if (runTokenRef.current !== token) return;

            let data: any;
            try {
                const res = await fetch("/api/linkedin/scrape/status", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ runId, linkedinUrl: url, masterProfileId }),
                });
                if (runTokenRef.current !== token) return;

                data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    failScrape(data?.error || "We lost track of that scan. Please try again.");
                    return;
                }
            } catch {
                // A single dropped poll shouldn't kill the run — try again.
                continue;
            }

            if (data?.status === "SUCCEEDED" && data?.result) {
                stopFetchTimers();
                setStageIndex(FETCH_STAGES.length - 1);
                setResult(data.result);
                setAiReport(null);
                setViewMode("current");
                setStep("result");
                return;
            }

            if (data?.status === "FAILED") {
                failScrape(data?.error || "We couldn't read that LinkedIn profile.");
                return;
            }
        }
    };

    const handleOptimize = () => {
        if (!result) return;
        if (isMasterProfileLoading) {
            setError("Master Profile details are still loading. Please try again in a moment.");
            return;
        }
        if (!hasUsableMasterProfileData(selectedMasterProfileData)) {
            setShowMissingMasterModal(true);
            return;
        }
        setShowCreditModal(true);
    };

    const proceedWithoutMasterProfile = () => {
        setShowMissingMasterModal(false);
        setShowCreditModal(true);
    };

    const proceedWithOptimization = async () => {
        if (!result) return;
        setShowCreditModal(false);
        setIsOptimizing(true);
        try {
            const creditRes = await fetch("/api/credits/deduct", { method: "POST" });
            if (!creditRes.ok) {
                if (creditRes.status === 403) throw new Error("Insufficient Credits to perform this action.");
                throw new Error("Failed to deduct credit.");
            }

            const res = await fetch("/api/linkedin/optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    analysisId: result.id,
                    rawProfileData: result.rawProfileData,
                    sectionScores: result.sectionScores,
                    masterProfileId: selectedMasterProfile
                })
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData?.error || "AI Optimization failed.");
            }
            setAiReport(await res.json());
            setViewMode("optimized");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsOptimizing(false);
        }
    };

    const getScoreColor = (score: number) => { if (score < 50) return "#ef4444"; if (score < 80) return "#eab308"; return "#22c55e"; };
    const getScoreTextColor = (score: number) => { if (score < 50) return "text-red-500"; if (score < 80) return "text-yellow-500"; return "text-green-600 dark:text-green-500"; };

    return (
        <>
            {showMissingMasterModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" style={{ position: 'fixed' }}>
                    <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                                <UserCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[var(--foreground)]">Master Profile unavailable</h3>
                                <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                                    Your Master Profile has no usable details yet. Do you still want to proceed with LinkedIn-only optimization, or add Master Profile details first for a stronger result?
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
                                <button onClick={() => setShowMissingMasterModal(false)} className="sm:col-span-2 py-2.5 px-4 rounded-lg font-medium text-[var(--foreground)] bg-[var(--card-border-bg)] hover:bg-[var(--border-color)] transition">
                                    Cancel
                                </button>
                                <button onClick={() => router.push("/dashboard/profile")} className="py-2.5 px-4 rounded-lg font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/15 transition">
                                    Go to Master Profile
                                </button>
                                <button onClick={proceedWithoutMasterProfile} className="py-2.5 px-4 rounded-lg font-medium text-white bg-[var(--primary)] hover:opacity-90 transition">
                                    Proceed Anyway
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showCreditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" style={{ position: 'fixed' }}>
                    <div className="bg-[var(--sidebar-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                                <Sparkles className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold text-[var(--foreground)]">Use 1 Credit?</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                LinkedIn Profile Optimization requires 1 credit to proceed. Do you want to continue?
                            </p>
                            <div className="flex items-center gap-3 w-full pt-2">
                                <button onClick={() => setShowCreditModal(false)} className="flex-1 py-2.5 px-4 rounded-lg font-medium text-[var(--foreground)] bg-[var(--card-border-bg)] hover:bg-[var(--border-color)] transition">
                                    Cancel
                                </button>
                                <button onClick={proceedWithOptimization} className="flex-1 py-2.5 px-4 rounded-lg font-medium text-white bg-[var(--primary)] hover:opacity-90 transition">
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        <div className="w-full max-w-7xl mx-auto min-h-[calc(100vh-120px)] flex flex-col space-y-6 animate-slide-down">
            
            <div className="flex items-center justify-end shrink-0">
                <div className="flex items-center gap-3">
                    {step === "result" && (
                        <button onClick={() => { setStep("setup"); setResult(null); setAiReport(null); setError(""); }} className="flex items-center gap-2 bg-[var(--sidebar-bg)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--foreground)] px-4 py-2 rounded-lg transition text-sm font-medium">
                            <RefreshCw className="h-4 w-4" /> New Analysis
                        </button>
                    )}
                </div>
            </div>

            {step === "setup" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-5">
                        <div>
                            <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">1. Choose Master Profile</h2>
                            <p className="text-xs text-[var(--text-secondary)]">We will compare your LinkedIn against this profile.</p>
                        </div>
                        <div className="space-y-2">
                            {masterProfiles.map(p => (
                                <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedMasterProfile === p.id ? "bg-[var(--primary)]/10 border-[var(--primary)]/30 shadow-md" : "bg-black/5 dark:bg-white/5 border-[var(--border-color)]"}`}>
                                    <input type="radio" value={p.id} checked={selectedMasterProfile === p.id} onChange={() => setSelectedMasterProfile(p.id)} className="w-4 h-4 text-[var(--primary)] bg-transparent border-[var(--border-color)] focus:ring-[var(--primary)]" />
                                    <span className="text-sm font-semibold text-[var(--foreground)]">{p.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl space-y-5 flex flex-col">
                        <div>
                            <h2 className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider mb-1">2. Connect LinkedIn</h2>
                            <p className="text-xs text-[var(--text-secondary)]">Enter your profile URL to begin securely syncing data.</p>
                        </div>
                        {error && (<div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>)}

                        <div className="space-y-4 flex-1 flex flex-col">
                            <div>
                                <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">LinkedIn Profile URL</label>
                                <div className="relative">
                                    <Linkedin className="w-4 h-4 text-[#0a66c2] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="https://www.linkedin.com/in/username"
                                        value={linkedinUrl}
                                        onChange={(e) => setLinkedinUrl(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter" && linkedinUrl) handleConnect(); }}
                                        className="w-full bg-black/5 dark:bg-white/5 border border-[var(--border-color)] text-[var(--foreground)] text-sm rounded-lg pl-9 pr-4 py-2.5 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none"
                                    />
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] mt-2">
                                    The profile needs to be publicly visible. Nothing to install, and we never ask for your LinkedIn password.
                                </p>
                            </div>

                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#0a66c2]/5 border border-[#0a66c2]/20">
                                <Shield className="w-4 h-4 text-[#0a66c2] shrink-0 mt-0.5" />
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    Fetching happens on our servers through a secure profile API. Your browser never talks to LinkedIn or to any third-party scraper directly.
                                </p>
                            </div>

                            <div className="mt-auto pt-2">
                                <button onClick={handleConnect} disabled={!linkedinUrl} className="w-full flex items-center justify-center gap-2 bg-[#0a66c2] hover:bg-[#004182] text-white px-5 py-3 rounded-xl transition shadow-lg shadow-blue-500/20 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                    <ScanLine className="h-4 w-4" /> Fetch &amp; Analyze Profile
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {step === "loading" && (() => {
                const stage = FETCH_STAGES[stageIndex];
                // Creeps toward 94% so the bar always feels alive; the jump to
                // 100% happens when the poll actually returns.
                const progress = Math.min(94, 8 + elapsed * 2.4);
                const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
                const ss = String(elapsed % 60).padStart(2, "0");

                return (
                <div className="flex-1 flex flex-col items-center justify-center py-10">
                    <style>{`
                        @keyframes vgnSpin    { to { transform: rotate(360deg); } }
                        @keyframes vgnPing    { 0% { transform: scale(.62); opacity: .5; } 70%, 100% { transform: scale(1.45); opacity: 0; } }
                        @keyframes vgnScan    { 0% { top: 8%; opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { top: 92%; opacity: 0; } }
                        @keyframes vgnFloat   { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                        @keyframes vgnShimmer { 0% { background-position: -280px 0; } 100% { background-position: 280px 0; } }
                        .vgn-sweep   { animation: vgnSpin 2.6s linear infinite; }
                        .vgn-orbit   { animation: vgnSpin 7s linear infinite; }
                        .vgn-orbit-2 { animation: vgnSpin 11s linear infinite reverse; }
                        .vgn-ping    { animation: vgnPing 2.4s cubic-bezier(0, 0, .2, 1) infinite; }
                        .vgn-ping-2  { animation: vgnPing 2.4s cubic-bezier(0, 0, .2, 1) infinite .8s; }
                        .vgn-ping-3  { animation: vgnPing 2.4s cubic-bezier(0, 0, .2, 1) infinite 1.6s; }
                        .vgn-scan    { animation: vgnScan 2.2s ease-in-out infinite; }
                        .vgn-float   { animation: vgnFloat 3s ease-in-out infinite; }
                        .vgn-skel {
                            background: linear-gradient(90deg, var(--card-border-bg) 0%, rgba(10,102,194,.16) 50%, var(--card-border-bg) 100%);
                            background-size: 280px 100%;
                            animation: vgnShimmer 1.5s linear infinite;
                        }
                        @media (prefers-reduced-motion: reduce) {
                            .vgn-sweep, .vgn-orbit, .vgn-orbit-2, .vgn-ping, .vgn-ping-2,
                            .vgn-ping-3, .vgn-scan, .vgn-float, .vgn-skel { animation: none; }
                        }
                    `}</style>

                    <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

                        {/* Radar / scanner */}
                        <div className="flex flex-col items-center">
                            <div className="relative w-52 h-52 flex items-center justify-center">
                                {/* expanding pulse rings */}
                                <div className="vgn-ping absolute inset-0 rounded-full border border-[#0a66c2]/40" />
                                <div className="vgn-ping-2 absolute inset-0 rounded-full border border-[#0a66c2]/40" />
                                <div className="vgn-ping-3 absolute inset-0 rounded-full border border-[#0a66c2]/40" />

                                {/* static guide rings */}
                                <div className="absolute inset-0 rounded-full border border-[var(--border-color)]" />
                                <div className="absolute inset-6 rounded-full border border-[var(--border-color)]" />

                                {/* rotating radar sweep, masked into a ring */}
                                <div
                                    className="vgn-sweep absolute inset-0 rounded-full"
                                    style={{
                                        background: "conic-gradient(from 0deg, rgba(10,102,194,0) 0deg, rgba(10,102,194,0) 250deg, rgba(10,102,194,.55) 350deg, rgba(10,102,194,.9) 360deg)",
                                        WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
                                        mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
                                    }}
                                />

                                {/* orbiting satellites */}
                                <div className="vgn-orbit absolute inset-0">
                                    <div className="absolute left-1/2 -top-1 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#0a66c2] shadow-[0_0_12px_2px_rgba(10,102,194,.8)]" />
                                </div>
                                <div className="vgn-orbit-2 absolute inset-6">
                                    <div className="absolute left-1/2 -top-1 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_10px_2px_var(--primary)]" />
                                </div>

                                {/* core */}
                                <div className="vgn-float relative w-24 h-24 rounded-full bg-[var(--sidebar-bg)] border border-[#0a66c2]/30 shadow-xl overflow-hidden flex items-center justify-center">
                                    <Linkedin className="w-10 h-10 text-[#0a66c2]" />
                                    <div className="vgn-scan absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0a66c2] to-transparent" />
                                </div>
                            </div>

                            <div className="mt-6 text-center space-y-1.5">
                                <h3 className="text-lg font-bold text-[var(--foreground)]">Fetching your LinkedIn profile</h3>
                                <p className="text-sm text-[var(--text-secondary)] min-h-[20px]">{stage.hint}</p>
                            </div>

                            {/* progress */}
                            <div className="w-full max-w-xs mt-5">
                                <div className="h-1.5 w-full rounded-full bg-[var(--border-color)] overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#0a66c2] to-[var(--primary)] transition-all duration-1000 ease-out"
                                        style={{ width: progress + "%" }}
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-2 text-[11px] text-[var(--text-secondary)]">
                                    <span>{Math.round(progress)}%</span>
                                    <span className="font-mono">{mm}:{ss}</span>
                                </div>
                            </div>
                        </div>

                        {/* Stage checklist */}
                        <div className="space-y-1">
                            {FETCH_STAGES.map((s, i) => {
                                const done = i < stageIndex;
                                const active = i === stageIndex;
                                const StageIcon = s.icon;
                                return (
                                    <div
                                        key={s.label}
                                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-500 ${active ? "bg-[#0a66c2]/10 border border-[#0a66c2]/25" : "border border-transparent"}`}
                                        style={{ opacity: done ? 0.75 : active ? 1 : 0.4 }}
                                    >
                                        <div className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-colors ${done ? "bg-[var(--primary)]/15 text-[var(--primary)]" : active ? "bg-[#0a66c2]/15 text-[#0a66c2]" : "bg-[var(--card-border-bg)] text-[var(--text-secondary)]"}`}>
                                            {done
                                                ? <CheckCircle2 className="w-4 h-4" />
                                                : active
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <StageIcon className="w-3.5 h-3.5" />}
                                        </div>
                                        <span className={`text-sm ${active ? "font-semibold text-[var(--foreground)]" : "text-[var(--text-secondary)]"}`}>
                                            {s.label}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* skeleton of the card we are about to fill in */}
                            <div className="mt-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--background)] space-y-2.5">
                                <div className="flex items-center gap-3">
                                    <div className="vgn-skel w-10 h-10 rounded-full" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="vgn-skel h-2.5 w-2/5 rounded" />
                                        <div className="vgn-skel h-2 w-3/5 rounded" />
                                    </div>
                                </div>
                                <div className="vgn-skel h-2 w-full rounded" />
                                <div className="vgn-skel h-2 w-4/5 rounded" />
                                <div className="vgn-skel h-2 w-2/3 rounded" />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-3">
                        <p className="text-xs text-[var(--text-secondary)] text-center max-w-md">
                            This usually takes 20&ndash;60 seconds. Keep this tab open while we finish reading the profile.
                        </p>
                        <button
                            onClick={() => { stopFetchTimers(); setStep("setup"); }}
                            className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--foreground)] underline underline-offset-4 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
                );
            })()}

            {step === "result" && result && (() => {
                // The AI rewrite only returns text, so fold each rewritten entry
                // back onto the scraped one — otherwise logos, employment type
                // and locations vanish the moment you switch to Optimized.
                const mergeByIndex = (scraped: any, rewritten: any) =>
                    Array.isArray(rewritten)
                        ? rewritten.map((entry: any, i: number) => ({
                              ...(Array.isArray(scraped) ? scraped[i] || {} : {}),
                              ...entry,
                          }))
                        : scraped;

                const currentProfile = result.rawProfileData;
                const optimizedProfile = aiReport
                    ? {
                          ...result.rawProfileData,
                          ...aiReport,
                          experience: mergeByIndex(result.rawProfileData?.experience, aiReport.experience),
                          education: mergeByIndex(result.rawProfileData?.education, aiReport.education),
                      }
                    : null;
                const profile = viewMode === "optimized" && optimizedProfile
                    ? optimizedProfile
                    : currentProfile;

                const hasMasterProfile = hasUsableMasterProfileData(selectedMasterProfileData);
                const normalizedCurrentScores = normalizeLinkedInScores(result.sectionScores, currentProfile, hasMasterProfile);
                const normalizedOptimizedScores = normalizeOptimizedScores(
                    normalizeLinkedInScores(aiReport?.optimizedSectionScores, optimizedProfile || currentProfile, hasMasterProfile),
                    normalizedCurrentScores,
                    currentProfile,
                    optimizedProfile || currentProfile
                );
                const optimizedBaseScore = typeof aiReport?.optimizedScore === "number"
                    ? aiReport.optimizedScore
                    : result.overallScore;
                const currentScore = calculateDisplayScoreFromSections(result.overallScore, normalizedCurrentScores);
                const optimizedScore = calculateDisplayScoreFromSections(optimizedBaseScore, normalizedOptimizedScores);
                const displayScore = viewMode === "optimized" ? Math.round(optimizedScore) : currentScore;
                const displayedSectionScores =
                    viewMode === "optimized" && aiReport?.optimizedSectionScores
                        ? normalizedOptimizedScores
                        : normalizedCurrentScores;
                const captured = summarizeProfile(result.rawProfileData);

                const scoreOrder = ["impact", "keyword", "headline", "semantic", "readability", "projects", "completeness"];
                const scoreLabel = (score: number) => score >= 80 ? "Strong" : score >= 50 ? "Needs polish" : "Weak";
                const scoreTone = (score: number) => score >= 80 ? "text-green-600 dark:text-green-500" : score >= 50 ? "text-yellow-600 dark:text-yellow-400" : "text-red-500";
                const scoreExplanation = (key: string, scoreProfile: any, isOptimized = false) => {
                    const prefix = isOptimized ? "After optimization, this predicted score uses the rewritten profile. " : "";
                    const skills = profileSkills(scoreProfile);
                    const about = String(scoreProfile?.about || "");
                    const aboutWords = about.split(/\s+/).filter(Boolean).length;
                    const paragraphs = about.split(/\n\s*\n/).filter((p) => p.trim()).length || (about ? 1 : 0);
                    const headline = String(scoreProfile?.headline || "");
                    const experience = Array.isArray(scoreProfile?.experience) ? scoreProfile.experience : [];
                    const experienceText = experience.map((exp: any) => exp?.description || "").join("\n");
                    const bulletCount = experienceText.split("\n").filter((line: string) => /^\s*[-•*]/.test(line.trim())).length;
                    const actionVerbs = ["achieved", "improved", "developed", "managed", "created", "designed", "implemented", "built", "led", "delivered", "optimized", "automated", "collaborated", "deployed"];
                    const actionCount = actionVerbs.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(experienceText)).length;
                    const metricCount = (experienceText.match(/\d+\s*%|\$[\d,]+|\b\d{2,}\b/g) || []).length;
                    const projects = Array.isArray(scoreProfile?.projects) ? scoreProfile.projects : [];
                    const projectWords = projects.map((project: any) => [project?.title, project?.description, project?.associatedWith, ...(Array.isArray(project?.skills) ? project.skills : [])].filter(Boolean).join(" ")).join(" ").split(/\s+/).filter(Boolean).length;
                    const presentSections = [
                        headline,
                        about,
                        experience.length,
                        Array.isArray(scoreProfile?.education) ? scoreProfile.education.length : 0,
                        skills.length,
                    ].filter(Boolean).length;

                    switch (key) {
                        case "keyword":
                            return hasMasterProfile
                                ? `${prefix}Compares LinkedIn wording against the selected Master Profile. Skills and phrases missing from the resume-to-LinkedIn match reduce this number.`
                                : `${prefix}No Master Profile is selected, so this uses LinkedIn-only keyword richness: ${skills.length} skills and keyword reuse across headline, About and experience.`;
                        case "semantic":
                            return hasMasterProfile
                                ? `${prefix}Measures whether LinkedIn describes the same work, tools and responsibilities as the selected Master Profile.`
                                : `${prefix}No Master Profile is selected, so this checks coherence inside LinkedIn itself: headline, About, experience and skills should point to the same professional direction.`;
                        case "impact":
                            return `${prefix}Based on ${experience.length} role(s), ${bulletCount} bullet line(s), ${actionCount} action verb signal(s), and ${metricCount} metric signal(s). Outcome language can help when real numbers are not available.`;
                        case "readability":
                            return `${prefix}Based on the About section length and structure: ${aboutWords} words across ${paragraphs} paragraph(s). Best range is 80-220 words in 2-4 short paragraphs.`;
                        case "projects":
                            return `${prefix}Based on project evidence: ${projects.length} project(s) and about ${projectWords} words of title, description and skill detail. More relevant, detailed projects score higher.`;
                        case "headline":
                            return `${prefix}Based on headline quality: ${headline.length} characters, keyword coverage and separators like |, - or commas. LinkedIn headlines should stay under 220 characters.`;
                        case "completeness":
                            return `${prefix}Based on core LinkedIn sections present: ${presentSections}/5 for headline, About, experience, education and skills.`;
                        default:
                            return `${prefix}This score reflects how well this part of the profile matches the optimizer rules.`;
                    }
                };
                const orderedScoreEntries = (scores: any) => {
                    const source = scores || {};
                    return [
                        ...scoreOrder.filter((key) => Object.prototype.hasOwnProperty.call(source, key)),
                        ...Object.keys(source).filter((key) => !scoreOrder.includes(key)),
                    ].map((key) => [key, source[key]]);
                };
                const renderScoreBreakdown = (scores: any, title = "Score breakdown", scoreProfile = profile, isOptimized = false) => (
                    <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
                        <h3 className="text-xs font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5" /> {title}
                        </h3>
                        <div className="space-y-2.5">
                            {orderedScoreEntries(scores).map(([key, val]) => {
                                const score = Number(val);
                                return (
                                    <div key={key} className="group/score relative">
                                        <div className="flex items-center justify-between text-[11px] mb-1">
                                            <span className="capitalize text-[var(--text-secondary)] flex items-center gap-1.5">
                                                {key}
                                                <HelpCircle className="w-3 h-3 cursor-help" />
                                            </span>
                                            <span className={`font-bold ${scoreTone(score)}`}>{Math.round(score)} · {scoreLabel(score)}</span>
                                        </div>
                                        <div className="h-1 rounded-full bg-[var(--border-color)] overflow-hidden">
                                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, score)}%`, background: getScoreColor(score) }} />
                                        </div>
                                        <div className="pointer-events-none absolute right-0 top-6 z-20 w-72 rounded-lg border border-[var(--border-color)] bg-[var(--background)] p-3 text-xs text-[var(--text-secondary)] shadow-xl opacity-0 translate-y-1 transition group-hover/score:opacity-100 group-hover/score:translate-y-0">
                                            <p className="font-semibold text-[var(--foreground)] capitalize mb-1">{key}: {scoreLabel(score)}</p>
                                            <p className="leading-relaxed">{scoreExplanation(String(key), scoreProfile, isOptimized)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

                if (viewMode === "optimized" && aiReport && optimizedProfile) {
                    const delta = Math.max(0, Math.round(optimizedScore - currentScore));
                    return (
                        <div className="rounded-2xl bg-[var(--background)] border border-emerald-200/70 dark:border-emerald-800/40 p-4 sm:p-5 space-y-4 shadow-sm">
                            <div className="bg-[var(--background)]/95 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-4 shadow-sm">
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#0a66c2] text-white flex items-center justify-center shrink-0">
                                            <Linkedin className="w-5 h-5" />
                                        </div>
                                        <div>
                                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#0a66c2]">AI profile transformation</p>
                                        <h2 className="text-xl font-bold text-[var(--foreground)] mt-1">Current profile vs optimized profile</h2>
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">Review every rewritten section side by side before applying changes on LinkedIn.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 rounded-xl bg-[#0a66c2]/5 p-2">
                                        <div className="hidden sm:block text-xs font-semibold text-[var(--text-secondary)] px-2">Profile score</div>
                                        <div className="text-center rounded-lg bg-black/5 dark:bg-white/5 px-4 py-2 min-w-[88px]">
                                            <p className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase">Before</p>
                                            <p className="text-2xl font-bold text-[var(--foreground)]">{Math.round(currentScore)}</p>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-[var(--text-secondary)]" />
                                        <div className="text-center rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-2 min-w-[88px]">
                                            <p className="text-[10px] text-green-700 dark:text-green-400 font-semibold uppercase">After</p>
                                            <p className="text-2xl font-bold text-green-600 dark:text-green-500">{Math.round(optimizedScore)}</p>
                                        </div>
                                        <div className="rounded-full bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1 text-xs font-bold">+{delta}</div>
                                    </div>
                                </div>
                            </div>

                            {captured.length > 0 && (
                                <div className="bg-[var(--background)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
                                    <h3 className="text-xs font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)]" /> Fetched from LinkedIn
                                    </h3>
                                    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                                        {captured.map((c) => (
                                            <div key={c.label} className="rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2 text-center">
                                                <p className="text-base font-bold text-[var(--foreground)] leading-none">{c.value}</p>
                                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">{c.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {renderScoreBreakdown(normalizedCurrentScores, "Before breakdown", currentProfile)}
                                {renderScoreBreakdown(normalizedOptimizedScores, "After breakdown", optimizedProfile, true)}
                            </div>

                            <div className="relative grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
                                <div className="space-y-3 min-w-0 rounded-xl bg-[var(--background)] p-3">
                                    <div className="sticky top-0 z-10 rounded-xl border border-[var(--border-color)] bg-[var(--background)]/95 backdrop-blur px-4 py-3 shadow-sm">
                                        <p className="text-xs font-bold text-[var(--foreground)]">Previous profile</p>
                                        <p className="text-[11px] text-[var(--text-secondary)]">What we fetched from LinkedIn</p>
                                    </div>
                                    <LinkedInProfileView
                                        profile={currentProfile}
                                        viewMode="current"
                                        copiedText={copiedText}
                                        onCopy={handleCopy}
                                    />
                                </div>

                                <div className="hidden xl:flex absolute left-1/2 top-36 -translate-x-1/2 z-20 w-12 h-12 rounded-full bg-[var(--background)] border border-[var(--border-color)] shadow-xl items-center justify-center">
                                    <ArrowRight className="w-5 h-5 text-[var(--primary)]" />
                                </div>

                                <div className="space-y-3 min-w-0 rounded-xl bg-green-50/80 dark:bg-emerald-950/20 border border-green-200/80 dark:border-emerald-800/50 p-3">
                                    <div className="sticky top-0 z-10 rounded-xl border border-green-500/20 bg-green-500/10 backdrop-blur px-4 py-3 shadow-sm flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-bold text-green-700 dark:text-green-400">Optimized profile</p>
                                            <p className="text-[11px] text-[var(--text-secondary)]">AI rewrite ready to copy section by section</p>
                                        </div>
                                        <button
                                            onClick={() => window.open(optimizedProfile.linkedinUrl || currentProfile.linkedinUrl || linkedinUrl, "_blank", "noopener,noreferrer")}
                                            className="shrink-0 rounded-lg bg-green-600 text-white px-3 py-2 text-xs font-bold shadow-sm hover:bg-green-700 transition"
                                        >
                                            Open LinkedIn to make changes
                                        </button>
                                    </div>
                                    <LinkedInProfileView
                                        profile={optimizedProfile}
                                        viewMode="optimized"
                                        optimizedSkills={aiReport?.skills || null}
                                        copiedText={copiedText}
                                        onCopy={handleCopy}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* ══ LEFT: the profile, drawn the way LinkedIn draws it ══ */}
                    <div className="lg:col-span-7 space-y-3 min-w-0">
                        <div className="bg-[var(--background)] rounded-xl shadow-sm border border-[var(--border-color)] p-1.5 flex items-center justify-center gap-1.5">
                            <button
                                onClick={() => setViewMode("current")}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${viewMode === "current" ? "bg-[var(--sidebar-bg)] text-[var(--foreground)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}
                            >
                                Current Profile
                            </button>
                            <button
                                onClick={() => { if (aiReport) setViewMode("optimized"); else handleOptimize(); }}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${viewMode === "optimized" ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400" : "text-[var(--text-secondary)] hover:text-indigo-500"}`}
                            >
                                {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                Optimized Profile
                            </button>
                        </div>

                        <LinkedInProfileView
                            profile={profile}
                            viewMode={viewMode}
                            optimizedSkills={aiReport?.skills || null}
                            copiedText={copiedText}
                            onCopy={handleCopy}
                        />
                    </div>

                    {/* ══ RIGHT: Vignova analysis — pinned while the profile scrolls ══ */}
                    <div className="lg:col-span-5 lg:sticky lg:top-0 space-y-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-2">

                        {/* Score */}
                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl flex flex-col items-center justify-center space-y-4">
                            <div className="relative flex items-center justify-center w-28 h-28">
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="44" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-[var(--border-color)]" />
                                    <circle cx="50" cy="50" r="44" fill="transparent" stroke={getScoreColor(displayScore)} strokeWidth="6"
                                        strokeDasharray={`${displayScore * 2.76} 276`} strokeLinecap="round" />
                                </svg>
                                <span className={`text-3xl font-bold ${getScoreTextColor(displayScore)}`}>{displayScore}</span>
                            </div>
                            <div className="text-center">
                                <h3 className="text-sm font-bold text-[var(--foreground)]">Profile Strength</h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    {viewMode === "optimized" ? "Predicted Post-Optimization Score" : "Compared to your Master Profile"}
                                </p>
                            </div>

                            <button onClick={handleOptimize} disabled={isOptimizing} className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--primary)] to-emerald-600 hover:opacity-90 text-white px-4 py-2.5 rounded-lg transition shadow-lg text-sm font-bold disabled:opacity-50">
                                {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Optimize with AI
                            </button>
                        </div>

                        {/* What the scrape actually brought back */}
                        {captured.length > 0 && (
                            <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-4 shadow-xl">
                                <h3 className="text-xs font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--primary)]" /> Fetched from LinkedIn
                                </h3>
                                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                                    {captured.map((c) => (
                                        <div key={c.label} className="rounded-lg bg-black/5 dark:bg-white/5 px-2 py-2 text-center">
                                            <p className="text-base font-bold text-[var(--foreground)] leading-none">{c.value}</p>
                                            <p className="text-[10px] text-[var(--text-secondary)] mt-1">{c.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Score breakdown */}
                        {displayedSectionScores && renderScoreBreakdown(displayedSectionScores, "Score breakdown", profile, viewMode === "optimized")}

                        {/* Recommendations */}
                        {viewMode === "current" ? (
                            <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-4 shadow-xl">
                                <h3 className="text-xs font-bold text-[var(--foreground)] mb-3 flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Recommendations</h3>
                                <div className="space-y-2.5">
                                    {result.recommendations.map((rec, i) => (
                                        <div key={i} className={`p-3 rounded-lg border flex gap-2.5 ${
                                            rec.severity === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                            rec.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                            'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                        }`}>
                                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase opacity-80 mb-0.5">{rec.category}</p>
                                                <p className="text-xs leading-relaxed">{rec.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 shadow-xl">
                                <h3 className="text-xs font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Optimization Complete</h3>
                                <div className="space-y-2.5">
                                    {[
                                        ["Keywords Matched", "Successfully integrated high-impact keywords from your Master Resume into your Headline and Skills."],
                                        ["Action Verbs Added", "Rewrote experience descriptions using strong action verbs to highlight measurable impact."],
                                        ["Readability Improved", "Your About section has been restructured for optimal readability and engaging professional storytelling."],
                                    ].map(([title, body]) => (
                                        <div key={title} className="p-3 rounded-lg border bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400 flex gap-2.5">
                                            <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase opacity-80 mb-0.5">{title}</p>
                                                <p className="text-xs leading-relaxed">{body}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}
        </div>
        </>
    );
}
