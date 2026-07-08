"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import {
    Loader2,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    ScanLine,
    Info,
    Wand2,
    Linkedin,
    Chrome,
    Shield,
    Target,
    Layers,
    UserCircle,
    Star,
    Briefcase,
    Sparkles,
    GraduationCap,
    BarChart3,
    Users,
    Eye,
    Search,
    Copy,
    Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
    };
    recommendations: { category: string; severity: string; message: string; }[];
    rawProfileData: any;
}

export default function LinkedInOptimizerPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" /></div>}>
            <LinkedInOptimizerContent />
        </Suspense>
    );
}

type ExtensionStatus = "detecting" | "not_installed" | "outdated" | "id_mismatch" | "ok";

type ExtensionConfig = {
    extensionId: string;
    extensionVersion: string;
    extensionName: string;
    installUrl: string;
};

function compareVersions(installed: string, required: string): number {
    const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
    const a = parse(installed);
    const b = parse(required);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const diff = (a[i] || 0) - (b[i] || 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

function LinkedInOptimizerContent() {
    const router = useRouter();
    const { data: session } = useSession();
    const [step, setStep] = useState<"setup" | "loading" | "result">("setup");
    const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>("detecting");
    const [installedVersion, setInstalledVersion] = useState<string | null>(null);
    const [extensionConfig, setExtensionConfig] = useState<ExtensionConfig | null>(null);
    const [linkedinUrl, setLinkedinUrl] = useState("");
    const [result, setResult] = useState<LinkedInAnalysisResult | null>(null);
    const [error, setError] = useState("");
    const [activeSection, setActiveSection] = useState("overview");
    const [viewMode, setViewMode] = useState<"current" | "optimized">("current");

    // Convenience derived booleans
    const isExtensionInstalled = extensionStatus === "ok" || extensionStatus === "outdated" || extensionStatus === "id_mismatch";
    
    const [copiedText, setCopiedText] = useState("");
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedText(text);
        setTimeout(() => setCopiedText(""), 2000);
    };

    const [isOptimizing, setIsOptimizing] = useState(false);
    const [aiReport, setAiReport] = useState<any>(null);
    const [showCreditModal, setShowCreditModal] = useState(false);
    
    // Master profiles
    const [masterProfiles, setMasterProfiles] = useState<any[]>([]);
    const [selectedMasterProfile, setSelectedMasterProfile] = useState<string>("");
    
    // Store latest session and selected master profile in refs for the event listener
    const sessionRef = useRef(session);
    const selectedProfileRef = useRef(selectedMasterProfile);
    
    useEffect(() => {
        sessionRef.current = session;
    }, [session]);
    
    useEffect(() => {
        selectedProfileRef.current = selectedMasterProfile;
    }, [selectedMasterProfile]);
    
    useEffect(() => {
        // Fetch previous analysis
        const fetchHistory = async () => {
            try {
                const res = await fetch("/api/linkedin/history");
                if (res.ok) {
                    const data = await res.json();
                    if (data.result) {
                        setResult(data.result);
                        if (data.result.optimizedContent) {
                            const parsedOptimized = typeof data.result.optimizedContent === 'string'
                                ? JSON.parse(data.result.optimizedContent)
                                : data.result.optimizedContent;
                            setAiReport(parsedOptimized);
                        }
                        setStep("result");
                    }
                }
            } catch (e) {}
        };
        fetchHistory();

        // Fetch extension config from admin settings
        let config: ExtensionConfig | null = null;
        const fetchConfig = async () => {
            try {
                const res = await fetch("/api/extension-config");
                if (res.ok) config = await res.json();
            } catch (e) {}
        };

        // Detect Extension
        const handleMessage = (event: MessageEvent) => {
            if (event.data && event.data.type === "VIGNOVA_EXTENSION_PONG") {
                const pongId: string      = event.data.extensionId      || "";
                const pongVer: string     = event.data.extensionVersion || "";
                setInstalledVersion(pongVer || null);

                if (!config) {
                    // Config not loaded yet — accept as ok
                    setExtensionStatus("ok");
                    return;
                }

                // ID check (only if admin configured an ID)
                if (config.extensionId && pongId && pongId !== config.extensionId) {
                    setExtensionStatus("id_mismatch");
                    return;
                }

                // Version check
                if (pongVer && config.extensionVersion) {
                    const cmp = compareVersions(pongVer, config.extensionVersion);
                    if (cmp < 0) {
                        setExtensionStatus("outdated");
                        return;
                    }
                }

                setExtensionStatus("ok");
            }
            if (event.data && event.data.type === "VIGNOVA_LINKEDIN_DATA") {
                handleIngestData(event.data.payload);
            }
            if (event.data && event.data.type === "VIGNOVA_LINKEDIN_ERROR") {
                setError(event.data.error || "Failed to extract LinkedIn profile.");
                setStep("setup");
            }
        };
        window.addEventListener("message", handleMessage);

        // Ping after config loads
        const init = async () => {
            await fetchConfig();
            if (config) setExtensionConfig(config);
            window.postMessage({ type: "VIGNOVA_EXTENSION_PING" }, "*");
            // If no pong within 1.5 s, assume not installed
            setTimeout(() => {
                setExtensionStatus((prev) => prev === "detecting" ? "not_installed" : prev);
            }, 1500);
        };
        const t = setTimeout(init, 300);

        fetchMasterProfiles();

        return () => {
            clearTimeout(t);
            window.removeEventListener("message", handleMessage);
        };
    }, []);

    const fetchMasterProfiles = async () => {
        try {
            const res = await fetch("/api/profiles");
            const data = await res.json();
            if (data.data) {
                setMasterProfiles(data.data);
                const def = data.data.find((p: any) => p.is_default);
                if (def) setSelectedMasterProfile(def.id);
                else if (data.data.length > 0) setSelectedMasterProfile(data.data[0].id);
            }
        } catch (e) { console.error("Failed to fetch master profiles", e); }
    };

    const handleConnect = () => {
        setError("");
        if (extensionStatus !== "ok" && extensionStatus !== "outdated") {
            setError("Please install the Vignova extension before connecting.");
            return;
        }
        if (!linkedinUrl.includes("linkedin.com/in/")) {
            setError("Please enter a valid LinkedIn profile URL.");
            return;
        }
        setStep("loading");
        
        // Send message to extension to start scraping
        window.postMessage({
            type: "VIGNOVA_ANALYZE_LINKEDIN",
            payload: { url: linkedinUrl }
        }, "*");
        
        // Fallback timeout in case extension fails silently
        setTimeout(() => {
            setStep(prev => {
                if (prev === "loading") {
                    setError("The LinkedIn scraping window did not respond. Please make sure the Vignova extension is installed and active, then try again.");
                    return "setup";
                }
                return prev;
            });
        }, 30000); // 30 seconds max
    };

    const handleIngestData = async (rawProfileData: any) => {
        try {
            const currentSession = sessionRef.current;
            const currentProfile = selectedProfileRef.current;
            
            const res = await fetch("/api/python/linkedin/ingest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: (currentSession?.user as any)?.id || "unknown",
                    linkedinUrl: linkedinUrl,
                    rawProfileData: rawProfileData,
                    masterProfileId: currentProfile
                })
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || "Failed to analyze profile on server.");
            }
            const data = await res.json();
            setResult(data);
            setStep("result");
        } catch (err: any) {
            setError(err.message || "Failed to analyze profile.");
            setStep("setup");
        }
    };

    const handleOptimize = () => {
        if (!result) return;
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

            const res = await fetch("/api/python/linkedin/optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: (session?.user as any)?.id || "unknown",
                    analysisId: result.id,
                    rawProfileData: result.rawProfileData,
                    sectionScores: result.sectionScores,
                    masterProfileId: selectedMasterProfile
                })
            });
            if (!res.ok) throw new Error("AI Optimization failed.");
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
                        
                        {/* ── Extension status banners ── */}
                        {extensionStatus === "detecting" && (
                            <div className="p-4 rounded-xl bg-[var(--border-color)]/30 border border-[var(--border-color)] flex items-center gap-3">
                                <Loader2 className="w-5 h-5 animate-spin text-[var(--text-secondary)] shrink-0" />
                                <p className="text-xs text-[var(--text-secondary)]">Detecting Vignova Extension...</p>
                            </div>
                        )}

                        {extensionStatus === "not_installed" && (
                            <div className="p-5 rounded-xl bg-blue-500/10 border border-blue-500/30 flex flex-col items-center text-center space-y-4">
                                <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Chrome className="w-8 h-8 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-blue-600 dark:text-blue-400 text-base">Extension Required</h3>
                                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                                        To securely analyze your LinkedIn profile without sharing your password, install the free {extensionConfig?.extensionName || "Vignova"} Chrome Extension.
                                    </p>
                                </div>
                                <a href={extensionConfig?.installUrl || "/dashboard/extension"} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2">
                                    <Chrome className="w-4 h-4" /> Install Extension
                                </a>
                                <p className="text-xs text-blue-500/70">After installing, refresh this page.</p>
                            </div>
                        )}

                        {extensionStatus === "id_mismatch" && (
                            <div className="p-5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col items-center text-center space-y-4">
                                <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-600 dark:text-amber-400 text-base">Wrong Extension Detected</h3>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                                        The extension installed in your browser doesn't match the official {extensionConfig?.extensionName || "Vignova"} extension. Please install the correct one.
                                    </p>
                                </div>
                                <a href={extensionConfig?.installUrl || "/dashboard/extension"} target="_blank" rel="noreferrer" className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center gap-2">
                                    <Chrome className="w-4 h-4" /> Install Official Extension
                                </a>
                            </div>
                        )}

                        {extensionStatus === "outdated" && (
                            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-yellow-600 dark:text-yellow-400">Extension update available</p>
                                    <p className="text-xs text-yellow-600/80 dark:text-yellow-400/80 mt-0.5">
                                        You have v{installedVersion} installed. Version {extensionConfig?.extensionVersion} is now available with improvements and bug fixes.
                                    </p>
                                    <a href={extensionConfig?.installUrl || "/dashboard/extension"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-yellow-600 dark:text-yellow-400 hover:underline">
                                        <Chrome className="w-3.5 h-3.5" /> Update now
                                    </a>
                                </div>
                            </div>
                        )}

                        {(extensionStatus === "ok" || extensionStatus === "outdated") && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">LinkedIn Profile URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://www.linkedin.com/in/username"
                                        value={linkedinUrl}
                                        onChange={(e) => setLinkedinUrl(e.target.value)}
                                        className="w-full bg-black/5 dark:bg-white/5 border border-[var(--border-color)] text-[var(--foreground)] text-sm rounded-lg px-4 py-2.5 focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all outline-none"
                                    />
                                </div>
                                <div className="mt-auto pt-4">
                                    <button onClick={handleConnect} disabled={!linkedinUrl} className="w-full flex items-center justify-center gap-2 bg-[#0a66c2] hover:bg-[#004182] text-white px-5 py-3 rounded-xl transition shadow-lg shadow-blue-500/20 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                                        <Linkedin className="h-4 w-4" /> Connect & Analyze
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {step === "loading" && (
                <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-6">
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 rounded-full border-4 border-[#0a66c2]/20" />
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#0a66c2] animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Linkedin className="w-8 h-8 text-[#0a66c2] animate-pulse" />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">Connecting to LinkedIn...</h3>
                        <p className="text-sm text-[var(--text-secondary)]">Please wait while we securely extract your profile data.</p>
                        <p className="text-xs text-[var(--primary)] animate-pulse">Do not close any new LinkedIn tab or window that opened.</p>
                        <p className="text-xs text-[var(--text-secondary)] opacity-60">This may take up to 30 seconds.</p>
                    </div>
                </div>
            )}

            {step === "result" && result && (() => {
                const activeProfileData = viewMode === "optimized" && aiReport 
                    ? { ...result.rawProfileData, ...aiReport } 
                    : result.rawProfileData;
                
                const displayScore = viewMode === "optimized" ? Math.min(100, Math.round(result.overallScore + 18)) : result.overallScore;

                return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: LinkedIn Profile Mock UI */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* View Toggle */}
                        <div className="bg-white dark:bg-[#1d2226] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-2 flex items-center justify-center gap-2">
                            <button 
                                onClick={() => setViewMode("current")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === "current" ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-900 dark:hover:text-white"}`}
                            >
                                Current Profile
                            </button>
                            <button 
                                onClick={() => { if (aiReport) setViewMode("optimized"); else handleOptimize(); }}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${viewMode === "optimized" ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" : "text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"}`}
                            >
                                {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Optimized Profile
                            </button>
                        </div>

                        {/* Top Card (Intro) */}
                        <div className="bg-white dark:bg-[#1d2226] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col relative pb-6">
                            <div className="h-[200px] relative overflow-hidden rounded-t-xl">
                                {/* Cover/Banner Image */}
                                {activeProfileData.coverImageUrl ? (
                                    <img src={activeProfileData.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-purple-500/30 dark:from-slate-700 dark:to-slate-800" />
                                )}
                            </div>
                            
                            {/* Profile Image Avatar */}
                            <div className="absolute top-[100px] left-6 w-[152px] h-[152px] rounded-full border-4 border-white dark:border-[#1d2226] bg-slate-200 dark:bg-slate-600 flex items-center justify-center overflow-hidden">
                                {activeProfileData.photoUrl ? (
                                    <img src={activeProfileData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <UserCircle className="w-[152px] h-[152px] text-slate-400" />
                                )}
                            </div>
                            
                            <div className="pt-20 px-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight flex items-center gap-1">
                                            {activeProfileData.name || "Your Name"}
                                            <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1.8 14.8L6 12.6l1.4-1.4 2.8 2.8 7.2-7.2 1.4 1.4-8.6 8.6z"/></svg>
                                        </h2>
                                        <p className="text-base text-gray-900 dark:text-gray-100 mt-1">{activeProfileData.headline || "Your Professional Headline"}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            {activeProfileData.location || "Location"} <span className="mx-1">·</span> <span className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer">Contact info</span>
                                        </p>
                                        <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer mt-1">500+ connections</p>
                                    </div>
                                    {/* Education quick link mock */}
                                    {activeProfileData.education && activeProfileData.education[0] && (
                                        <div className="hidden sm:flex items-center gap-2 max-w-[200px] cursor-pointer hover:underline text-gray-900 dark:text-white font-semibold text-sm">
                                            {activeProfileData.education[0].schoolLogoUrl ? (
                                                <img src={activeProfileData.education[0].schoolLogoUrl} alt="Edu" className="w-8 h-8 object-contain" />
                                            ) : (
                                                <GraduationCap className="w-8 h-8" />
                                            )}
                                            <span className="line-clamp-2">{activeProfileData.education[0].school}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap gap-2 mt-4">
                                    <button disabled className="opacity-50 cursor-not-allowed bg-[#0a66c2] text-white px-4 py-1.5 rounded-full font-semibold text-base transition">Open to</button>
                                    <button disabled className="opacity-50 cursor-not-allowed bg-transparent text-[#0a66c2] dark:text-blue-400 border border-[#0a66c2] dark:border-blue-400 px-4 py-1.5 rounded-full font-semibold text-base transition">Add profile section</button>
                                    <button disabled className="opacity-50 cursor-not-allowed bg-transparent text-[#0a66c2] dark:text-blue-400 border border-[#0a66c2] dark:border-blue-400 px-4 py-1.5 rounded-full font-semibold text-base transition">Enhance profile</button>
                                    <button disabled className="opacity-50 cursor-not-allowed bg-transparent text-gray-600 dark:text-gray-300 border border-gray-500 dark:border-gray-400 px-4 py-1.5 rounded-full font-semibold text-base transition">Resources</button>
                                </div>
                            </div>
                        </div>

                        {/* Analytics */}
                        {activeProfileData.analytics && (
                            <div className="bg-white dark:bg-[#1d2226] rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h3>
                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                                        <Eye className="w-4 h-4 mr-1" /> Private to you
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="flex gap-3">
                                            <Users className="w-6 h-6 text-gray-700 dark:text-gray-300 shrink-0" />
                                            <div>
                                                <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                                    {activeProfileData.analytics.profileViews || activeProfileData.analytics.profileViewers || "0"} profile views
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Discover who's viewed your profile.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <BarChart3 className="w-6 h-6 text-gray-700 dark:text-gray-300 shrink-0" />
                                            <div>
                                                <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                                    {activeProfileData.analytics.postImpressions || "0"} post impressions
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Check out who's engaging with your posts.</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Past 7 days</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <Search className="w-6 h-6 text-gray-700 dark:text-gray-300 shrink-0" />
                                            <div>
                                                <p className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1">
                                                    {activeProfileData.analytics.searchAppearances || "0"} search appearances
                                                </p>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">See how often you appear in search results.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="border-t border-gray-200 dark:border-gray-800 p-3 flex justify-center hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer rounded-b-xl transition">
                                    <span className="text-gray-600 dark:text-gray-300 font-semibold text-sm flex items-center gap-1">Show all analytics <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M14 12l-4.6 4.6 1.4 1.4L16.8 12l-6-6-1.4 1.4z"/></svg></span>
                                </div>
                            </div>
                        )}

                        {/* About */}
                        <div className="bg-white dark:bg-[#1d2226] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">About</h3>
                                {viewMode === "optimized" && (
                                    <button onClick={() => handleCopy(activeProfileData.about || "")} className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition font-semibold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded">
                                        {copiedText === activeProfileData.about ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                                {activeProfileData.about || "No About section found."}
                            </p>
                        </div>
                        
                        {/* Experience */}
                        <div className="bg-white dark:bg-[#1d2226] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Experience</h3>
                            <div className="space-y-6">
                                {activeProfileData.experience && activeProfileData.experience.length > 0 ? (
                                    activeProfileData.experience.map((exp: any, i: number) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                                                {exp.companyLogoUrl ? (
                                                    <img src={exp.companyLogoUrl} alt={exp.company} className="w-full h-full object-contain bg-white" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Briefcase className="w-6 h-6 text-slate-400" /></div>
                                                )}
                                            </div>
                                            <div className="min-w-0 border-b border-gray-100 dark:border-gray-800 pb-6 flex-1 last:border-0 last:pb-0">
                                                <h4 className="text-base font-bold text-gray-900 dark:text-white">{exp.title}</h4>
                                                <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{exp.company}</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{exp.dateRange}</p>
                                                {exp.location && <p className="text-sm text-gray-500 dark:text-gray-400">{exp.location}</p>}
                                                {exp.description && (
                                                    <div className="mt-3 relative group">
                                                        <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">{exp.description}</p>
                                                        {viewMode === "optimized" && (
                                                            <button onClick={() => handleCopy(exp.description)} className="absolute -top-3 right-0 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition font-semibold bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 rounded shadow-sm">
                                                                {copiedText === exp.description ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {exp.associatedSkills && (
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-3 flex items-start gap-2">
                                                        <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                                                        <span>{exp.associatedSkills}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No experience found.</p>
                                )}
                            </div>
                        </div>

                        {/* Education */}
                        <div className="bg-white dark:bg-[#1d2226] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Education</h3>
                            <div className="space-y-6">
                                {activeProfileData.education && activeProfileData.education.length > 0 ? (
                                    activeProfileData.education.map((edu: any, i: number) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                                                {edu.schoolLogoUrl ? (
                                                    <img src={edu.schoolLogoUrl} alt={edu.school} className="w-full h-full object-contain bg-white" />
                                                ) : (
                                                    <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><GraduationCap className="w-6 h-6 text-slate-400" /></div>
                                                )}
                                            </div>
                                            <div className="min-w-0 border-b border-gray-100 dark:border-gray-800 pb-6 flex-1 last:border-0 last:pb-0">
                                                <h4 className="text-base font-bold text-gray-900 dark:text-white">{edu.school}</h4>
                                                {edu.degree && <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{edu.degree}</p>}
                                                {edu.dateRange && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{edu.dateRange}</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No education found.</p>
                                )}
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="bg-white dark:bg-[#1d2226] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Skills</h3>
                            {activeProfileData.skills && activeProfileData.skills.length > 0 ? (
                                <div className="flex flex-col gap-4">
                                    {activeProfileData.skills.map((skill: string, i: number) => (
                                        <div key={i} className="border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
                                            <h4 className="text-base font-bold text-gray-900 dark:text-white">{skill}</h4>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400">No skills found.</p>
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Vignova Analysis */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* Overall Score */}
                        <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-6 shadow-xl flex flex-col items-center justify-center space-y-4">
                            <div className="relative flex items-center justify-center w-32 h-32">
                                <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="44" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-[var(--border-color)]" />
                                    <circle cx="50" cy="50" r="44" fill="transparent" stroke={getScoreColor(displayScore)} strokeWidth="6"
                                        strokeDasharray={`${displayScore * 2.76} 276`} strokeLinecap="round" />
                                </svg>
                                <span className={`text-3xl font-bold ${getScoreTextColor(displayScore)}`}>{displayScore}</span>
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-bold text-[var(--foreground)]">Profile Strength</h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                    {viewMode === "optimized" ? "Predicted Post-Optimization Score" : "Compared to your Master Profile"}
                                </p>
                            </div>
                            
                            <button onClick={handleOptimize} disabled={isOptimizing} className="w-full mt-4 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2.5 rounded-lg transition shadow-lg text-sm font-bold disabled:opacity-50">
                                {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Optimize with AI
                            </button>
                        </div>
                        
                        {/* AI optimizations now appear in the left column layout */}

                        {/* Recommendations / Success Metrics */}
                        {viewMode === "current" ? (
                            <div className="bg-[var(--sidebar-bg)]/50 border border-[var(--border-color)] rounded-xl p-5 shadow-xl">
                                <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2"><Target className="w-4 h-4" /> Recommendations</h3>
                                <div className="space-y-3">
                                    {result.recommendations.map((rec, i) => (
                                        <div key={i} className={`p-3 rounded-lg border flex gap-3 ${
                                            rec.severity === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-500' :
                                            rec.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                                            'bg-blue-500/10 border-blue-500/20 text-blue-500'
                                        }`}>
                                            <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold uppercase opacity-80 mb-0.5">{rec.category}</p>
                                                <p className="text-sm">{rec.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 shadow-xl">
                                <h3 className="font-bold text-green-700 dark:text-green-400 mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Optimization Complete</h3>
                                <div className="space-y-3">
                                    <div className="p-3 rounded-lg border bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400 flex gap-3">
                                        <Check className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold uppercase opacity-80 mb-0.5">Keywords Matched</p>
                                            <p className="text-sm">Successfully integrated high-impact keywords from your Master Resume into your Headline and Skills.</p>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400 flex gap-3">
                                        <Check className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold uppercase opacity-80 mb-0.5">Action Verbs Added</p>
                                            <p className="text-sm">Rewrote experience descriptions using strong action verbs to highlight measurable impact.</p>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400 flex gap-3">
                                        <Check className="w-4 h-4 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-bold uppercase opacity-80 mb-0.5">Readability Improved</p>
                                            <p className="text-sm">Your About section has been restructured for optimal readability and engaging professional storytelling.</p>
                                        </div>
                                    </div>
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
