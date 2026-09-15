"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle, ArrowLeft, ArrowRight, BarChart3, CheckCircle2, Chrome, ExternalLink, IdCard, Info, Loader2, RefreshCw, ScanLine, Sparkles, Target, Wand2,
} from "lucide-react";
import NaukriProfileView from "@/components/naukri/NaukriProfileView";
import NaukriSideBySide from "@/components/naukri/NaukriSideBySide";
import { copyText } from "@/lib/clipboard";
import { useVignovaExtension } from "@/lib/useVignovaExtension";
import { applyNaukriRewrite, sanitizeNaukriProfile, summarizeNaukriProfile } from "@/lib/naukri-profile";
import { CREDIT_COSTS, describeCost } from "@/lib/planCatalog";

const NAUKRI_PROFILE_URL = "https://www.naukri.com/mnjuser/profile";
/** How long the page watches for a scan's result before giving up. */
const SCAN_WAIT_MS = 5 * 60 * 1000;

type Recommendation = { category: string; severity: string; message: string };
type Optimization = {
    optimized?: Record<string, unknown>;
    currentScore?: number;
    optimizedScore?: number;
    currentSectionScores?: Record<string, number>;
    optimizedSectionScores?: Record<string, number>;
    createdAt?: string;
};
type Analysis = {
    id: string;
    overallScore: number | null;
    sectionScores: Record<string, number> | null;
    recommendations: Recommendation[] | null;
    rawProfileData: unknown;
    optimizedContent: Optimization | null;
    masterProfileId: string | null;
    createdAt: string;
};
type MasterProfile = { id: string; name: string; is_default?: boolean };
type ScanSummary = { id: string; createdAt: string; overallScore: number | null; optimized: boolean };

const SCORE_LABELS: Record<string, { label: string; help: string }> = {
    keyword: { label: "Keyword match", help: "How much of your Master Profile's vocabulary appears on Naukri." },
    semantic: { label: "Role alignment", help: "Whether Naukri describes the same work as your Master Profile." },
    impact: { label: "Impact", help: "Action verbs, results and numbers in your job profiles and projects." },
    completeness: { label: "Completeness", help: "Headline, key skills, employment, job profiles, education, summary, IT skills, projects and career profile." },
    skills: { label: "Key skills", help: "How many key skills you list, and how many match your Master Profile." },
    headline: { label: "Resume headline", help: "Within Naukri's 250 characters, role first, core skills named." },
    readability: { label: "Summary readability", help: "Profile summary length and sentence structure." },
};
const SCORE_ORDER = Object.keys(SCORE_LABELS);

const scoreColor = (score: number) => (score < 50 ? "#ef4444" : score < 80 ? "#eab308" : "#22c55e");
const round = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 0);
const scanLabel = (item: ScanSummary) =>
    [
        `Scan of ${new Date(item.createdAt).toLocaleString()}`,
        typeof item.overallScore === "number" ? `${Math.round(item.overallScore)}/100` : "",
        item.optimized ? "Optimized" : "",
    ]
        .filter(Boolean)
        .join(" \u00B7 ");

function ScoreRing({ score, label }: { score: number; label: string }) {
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative flex h-28 w-28 items-center justify-center">
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-[var(--border-color)]" />
                    <circle cx="50" cy="50" r="44" fill="transparent" stroke={scoreColor(score)} strokeWidth="6" strokeDasharray={`${score * 2.76} 276`} strokeLinecap="round" />
                </svg>
                <span className="text-3xl font-bold text-[var(--foreground)]">{score}</span>
            </div>
            <p className="text-xs font-semibold text-[var(--text-secondary)]">{label}</p>
        </div>
    );
}

function ScoreBars({ scores, before }: { scores: Record<string, number>; before?: Record<string, number> }) {
    const keys = [...SCORE_ORDER.filter((key) => key in scores), ...Object.keys(scores).filter((key) => !SCORE_ORDER.includes(key))];
    return (
        <div className="space-y-2.5">
            {keys.map((key) => {
                const score = round(scores[key]);
                const was = before ? round(before[key]) : null;
                const meta = SCORE_LABELS[key] || { label: key, help: "" };
                return (
                    <div key={key} title={meta.help}>
                        <div className="mb-1 flex items-center justify-between text-[11px]">
                            <span className="text-[var(--text-secondary)]">{meta.label}</span>
                            <span className="font-bold text-[var(--foreground)]">
                                {was !== null && was !== score && <span className="mr-1.5 font-medium text-[var(--text-secondary)] line-through">{was}</span>}
                                {score}
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-color)]">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, score)}%`, background: scoreColor(score) }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function Recommendations({ items }: { items: Recommendation[] }) {
    const tone = (severity: string) =>
        severity === "high"
            ? "bg-red-500/10 border-red-500/20 text-red-500"
            : severity === "medium"
              ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-500";
    return (
        <div className="space-y-2.5">
            {items.map((rec, i) => (
                <div key={i} className={`flex gap-2.5 rounded-lg border p-3 ${tone(rec.severity)}`}>
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div>
                        <p className="mb-0.5 text-[10px] font-bold uppercase opacity-80">{rec.category}</p>
                        <p className="text-xs leading-relaxed">{rec.message}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
        </div>
    );
}

type Loaded = { result: Analysis | null; analyses: ScanSummary[]; error: string };

async function fetchAnalysis(id: string | null): Promise<Loaded> {
    try {
        const res = await fetch(`/api/naukri/history${id ? `?id=${encodeURIComponent(id)}` : ""}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return { result: null, analyses: [], error: data?.error || "Could not load your Naukri analysis." };
        return { result: data.result || null, analyses: Array.isArray(data.analyses) ? data.analyses : [], error: "" };
    } catch {
        return { result: null, analyses: [], error: "Could not load your Naukri analysis." };
    }
}

const postJson = async (url: string, body: unknown) => {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || data?.error || "Something went wrong. Please try again.");
    return data;
};

function NaukriOptimizerContent() {
    const requestedId = useSearchParams().get("analysis");
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [profiles, setProfiles] = useState<MasterProfile[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState("");
    const [isRescoring, setIsRescoring] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [compareMode, setCompareMode] = useState<"full" | "side">("full");
    const [copiedText, setCopiedText] = useState("");
    const [copyFailed, setCopyFailed] = useState(false);
    const extension = useVignovaExtension();
    const [scan, setScan] = useState<{ startedAt: number; previousId: string | null } | null>(null);
    const [analyses, setAnalyses] = useState<ScanSummary[]>([]);
    /** The start screen, opened over existing results by "New Analysis". */
    const [startingOver, setStartingOver] = useState(false);
    // The analysis on screen, so putting its id in the URL does not load it again.
    const shownIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (requestedId && requestedId === shownIdRef.current) return;
        let cancelled = false;
        Promise.all([
            fetchAnalysis(requestedId),
            fetch("/api/profiles").then((res) => res.json()).catch(() => ({})),
        ]).then(([{ result, analyses: scans, error: message }, profileData]) => {
            if (cancelled) return;
            const list: MasterProfile[] = profileData?.data || profileData?.profiles || [];
            setAnalysis(result);
            setAnalyses(scans);
            setError(message);
            setProfiles(list);
            const stored = result?.masterProfileId && list.some((p) => p.id === result.masterProfileId) ? result.masterProfileId : "";
            setSelectedProfileId(stored || list.find((p) => p.is_default)?.id || list[0]?.id || "");
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [requestedId]);

    // Keep the URL on the analysis being shown. A reload used to reopen the scan
    // named in the link, which after "Scan again" or loading another import was
    // not the one optimized, so a saved optimization looked lost.
    useEffect(() => {
        shownIdRef.current = analysis?.id ?? null;
        if (!analysis?.id) return;
        const url = new URL(window.location.href);
        if (url.searchParams.get("analysis") === analysis.id) return;
        url.searchParams.set("analysis", analysis.id);
        window.history.replaceState(window.history.state, "", url);
    }, [analysis?.id]);

    // While a scan runs in the Naukri tab, watch for the analysis it creates.
    // The extension also sends this tab to the results; polling covers a tab
    // that was closed or a scan finished from the Naukri page's own button.
    useEffect(() => {
        if (!scan) return;
        const timer = setInterval(async () => {
            if (Date.now() - scan.startedAt > SCAN_WAIT_MS) {
                setScan(null);
                setError("The scan is taking too long. Check the Naukri tab, then load the latest import.");
                return;
            }
            const { result, analyses: scans } = await fetchAnalysis(null);
            if (result && result.id !== scan.previousId) {
                setAnalysis(result);
                setAnalyses(scans);
                setScan(null);
                setStartingOver(false);
            }
        }, 4000);
        return () => clearInterval(timer);
    }, [scan]);

    const startScan = async () => {
        setError("");
        const reply = await extension.requestNaukriScan();
        if (!reply.success) {
            setError(
                reply.authenticated
                    ? reply.error || "Could not start the scan."
                    : "Sign in to the Vignova extension (click its icon in Chrome), then scan again."
            );
            return;
        }
        setScan({ startedAt: Date.now(), previousId: analysis?.id ?? null });
    };

    const handleCopy = useCallback(async (text: string) => {
        if (await copyText(text)) {
            setCopyFailed(false);
            setCopiedText(text);
            setTimeout(() => setCopiedText((current) => (current === text ? "" : current)), 2000);
        } else {
            setCopiedText("");
            setCopyFailed(true);
            setTimeout(() => setCopyFailed(false), 4000);
        }
    }, []);

    const showLoaded = ({ result, analyses: scans, error: message }: Loaded) => {
        setAnalysis(result);
        setAnalyses(scans);
        setError(message);
        setStartingOver(false);
        setLoading(false);
    };

    const refresh = async () => {
        setLoading(true);
        showLoaded(await fetchAnalysis(null));
    };

    const openScan = async (id: string) => {
        if (!id || id === analysis?.id) return;
        setLoading(true);
        showLoaded(await fetchAnalysis(id));
    };

    const rescore = async () => {
        if (!analysis) return;
        setIsRescoring(true);
        setError("");
        try {
            const data = await postJson("/api/naukri/analyze", { analysisId: analysis.id, masterProfileId: selectedProfileId || null });
            setAnalysis(data.result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not re-score the profile.");
        } finally {
            setIsRescoring(false);
        }
    };

    const optimize = async () => {
        if (!analysis) return;
        setShowCreditModal(false);
        setIsOptimizing(true);
        setError("");
        try {
            const data = await postJson("/api/naukri/optimize", { analysisId: analysis.id, masterProfileId: selectedProfileId || null });
            const { saved, ...rest } = data;
            const optimizedContent: Optimization = { ...rest };
            delete (optimizedContent as Record<string, unknown>).credits_remaining;
            setAnalysis((current) => (current ? { ...current, optimizedContent } : current));
            setAnalyses((scans) => scans.map((item) => (item.id === analysis.id ? { ...item, optimized: saved !== false } : item)));
            setCompareMode("full");
            if (saved === false) {
                setError("Your optimization is below, but it couldn't be saved. Copy what you need before leaving this page.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "AI optimization failed.");
        } finally {
            setIsOptimizing(false);
        }
    };

    const spinner = (
        <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
        </div>
    );
    if (loading) return spinner;

    const profile = analysis ? sanitizeNaukriProfile(analysis.rawProfileData) : null;
    const button = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50";
    const secondary = `${button} border border-[var(--border-color)] bg-[var(--sidebar-bg)] text-[var(--foreground)] hover:bg-black/5 dark:hover:bg-white/5`;
    const primary = `${button} bg-[var(--primary)] text-white hover:opacity-90`;
    const scanBanner = scan ? (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-3 text-sm text-[var(--foreground)]">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" />
            Scanning your Naukri profile in the new tab. Sign in to Naukri there if it asks; the results appear here on their own.
        </div>
    ) : null;
    const scanButton = (label: string, className: string) => (
        <button type="button" onClick={startScan} disabled={Boolean(scan)} className={className}>
            {scan ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />} {label}
        </button>
    );

    if (!analysis || !profile || startingOver) {
        const steps: [string, string, ReactNode][] = extension.supportsNaukriScan
            ? [
                  ["Click \u201CScan Naukri profile\u201D", "Your Naukri profile opens in a new tab.", <ScanLine key="s" className="h-4 w-4" />],
                  ["Let the extension read it", "Sign in to Naukri there if it asks. Every section is read for you.", <ExternalLink key="e" className="h-4 w-4" />],
                  ["Review the results here", "Scores, recommendations and an AI rewrite to copy back into Naukri.", <Sparkles key="r" className="h-4 w-4" />],
              ]
            : [
                  ["Install the extension", "Or update it to the latest version, which reads Naukri profiles.", <Chrome key="c" className="h-4 w-4" />],
                  ["Reload this page", "The extension is found on its own once it is installed.", <RefreshCw key="r" className="h-4 w-4" />],
                  ["Scan your Naukri profile", "It opens in a new tab, and your results appear here.", <ScanLine key="s" className="h-4 w-4" />],
              ];
        const extensionNote = {
            checking: "Looking for the Vignova extension\u2026",
            installed: extension.supportsNaukriScan
                ? `Vignova extension ${extension.version} found.`
                : `Your Vignova extension (${extension.version}) can't scan Naukri yet. Update it to the latest version.`,
            mismatch: "This browser has a different build of the Vignova extension. Install the official one to scan from here.",
            missing: "Install the Vignova extension to scan your Naukri profile. Already installed? Reload this page.",
        }[extension.status];
        const installLabel = extension.status === "installed" ? "Update the extension" : "Install the extension";
        return (
            <div className="mx-auto w-full max-w-4xl space-y-6 animate-slide-down">
                {analysis && profile && (
                    <button type="button" onClick={() => setStartingOver(false)} className={secondary}>
                        <ArrowLeft className="h-4 w-4" /> Back to your analysis
                    </button>
                )}
                {error && <ErrorBanner message={error} />}
                {scanBanner}
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/50 p-6 shadow-xl sm:p-8">
                    <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#275df5]/10 text-[#275df5]">
                            <IdCard className="h-6 w-6" />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--foreground)]">Optimize your Naukri profile</h2>
                            <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
                                Naukri has no public API, so the Vignova Chrome extension reads your profile straight from naukri.com. We score it
                                against your Master Profile, then rewrite your resume headline, key skills, job profiles and summary to fit
                                Naukri&apos;s field limits.
                            </p>
                        </div>
                    </div>
                    <ol className="mt-6 grid gap-3 sm:grid-cols-3">
                        {steps.map(([title, detail, icon], i) => (
                            <li key={title} className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] p-4">
                                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">
                                    {icon} Step {i + 1}
                                </span>
                                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{title}</p>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{detail}</p>
                            </li>
                        ))}
                    </ol>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        {extension.supportsNaukriScan ? (
                            scanButton("Scan Naukri profile", primary)
                        ) : (
                            <>
                                {extension.status !== "checking" &&
                                    (extension.installUrl.startsWith("http") ? (
                                        <a href={extension.installUrl} target="_blank" rel="noopener noreferrer" className={primary}>
                                            <Chrome className="h-4 w-4" /> {installLabel}
                                        </a>
                                    ) : (
                                        <Link href={extension.installUrl} className={primary}>
                                            <Chrome className="h-4 w-4" /> {installLabel}
                                        </Link>
                                    ))}
                            </>
                        )}
                        <button type="button" onClick={refresh} className={secondary}>
                            <RefreshCw className="h-4 w-4" /> Load latest import
                        </button>
                    </div>
                    <p className="mt-3 text-xs text-[var(--text-secondary)]">{extensionNote}</p>
                </div>
            </div>
        );
    }

    const optimization = analysis.optimizedContent;
    const optimized = optimization?.optimized ? applyNaukriRewrite(profile, optimization.optimized) : null;
    const had = new Set(profile.keySkills.map((skill) => skill.toLowerCase()));
    const addedSkills = optimized ? new Set(optimized.keySkills.map((skill) => skill.toLowerCase()).filter((skill) => !had.has(skill))) : undefined;
    const currentScore = round(optimization?.currentScore ?? analysis.overallScore);
    const optimizedScore = round(optimization?.optimizedScore ?? analysis.overallScore);
    const masterChanged = Boolean(selectedProfileId) && selectedProfileId !== (analysis.masterProfileId || "");
    const captured = summarizeNaukriProfile(profile);
    const cost = describeCost(CREDIT_COSTS.naukriOptimization);

    return (
        <>
            {showCreditModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div role="dialog" aria-modal="true" aria-labelledby="naukri-credit-title" className="relative w-full max-w-sm rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <h3 id="naukri-credit-title" className="text-xl font-bold text-[var(--foreground)]">Use {cost}?</h3>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Naukri profile optimization uses {cost}. If the rewrite fails, it is returned automatically.
                            </p>
                            <div className="flex w-full items-center gap-3 pt-2">
                                <button type="button" onClick={() => setShowCreditModal(false)} className="flex-1 rounded-lg bg-[var(--card-border-bg)] px-4 py-2.5 font-medium text-[var(--foreground)] transition hover:bg-[var(--border-color)]">
                                    Cancel
                                </button>
                                <button type="button" onClick={optimize} className="flex-1 rounded-lg bg-[var(--primary)] px-4 py-2.5 font-medium text-white transition hover:opacity-90">
                                    Continue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {copyFailed && (
                <div role="status" className="fixed bottom-6 right-6 z-[120] max-w-xs rounded-xl border border-red-500/30 bg-[var(--sidebar-bg)] px-4 py-3 text-sm text-[var(--foreground)] shadow-2xl">
                    Couldn&apos;t copy automatically. Select the text and press Ctrl+C.
                </div>
            )}

            <div className="mx-auto w-full max-w-[1700px] space-y-5 animate-slide-down">
                {error && <ErrorBanner message={error} />}
                {scanBanner}

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/50 p-3">
                    {analyses.length > 1 ? (
                        <select
                            value={analysis.id}
                            onChange={(e) => openScan(e.target.value)}
                            aria-label="Naukri scan to show"
                            className="max-w-full rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-xs font-medium text-[var(--foreground)]"
                        >
                            {analyses.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {scanLabel(item)}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <p className="px-1 text-xs text-[var(--text-secondary)]">
                            Imported from Naukri on {new Date(analysis.createdAt).toLocaleDateString()}
                        </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                        {profiles.length > 0 && (
                            <select
                                value={selectedProfileId}
                                onChange={(e) => setSelectedProfileId(e.target.value)}
                                aria-label="Master Profile to compare with"
                                className="rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-3 py-2.5 text-xs font-medium text-[var(--foreground)]"
                            >
                                {profiles.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        )}
                        {masterChanged && (
                            <button type="button" onClick={rescore} disabled={isRescoring} className={secondary}>
                                {isRescoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Re-score
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setError("");
                                setStartingOver(true);
                            }}
                            className={secondary}
                        >
                            <RefreshCw className="h-4 w-4" /> New Analysis
                        </button>
                    </div>
                </div>

                {isOptimizing && (
                    <div role="status" className="flex items-center gap-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-4 py-3 text-sm text-[var(--foreground)]">
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                        Rewriting your Naukri profile. This can take up to a minute.
                    </div>
                )}

                {optimized ? (
                    <div className="space-y-4 rounded-2xl border border-emerald-200/70 bg-[var(--background)] p-4 shadow-sm dark:border-emerald-800/40 sm:p-5">
                        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#275df5] text-white">
                                    <IdCard className="h-6 w-6" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">Naukri Profile Optimizer</p>
                                    <h2 className="mt-0.5 text-xl font-bold text-[var(--foreground)]">Current profile vs optimized profile</h2>
                                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                                        Copy each section into the matching part of your Naukri profile. Every rewrite fits Naukri&apos;s field limits.
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                                <div className="min-w-[76px] rounded-lg border border-[var(--border-color)] bg-[var(--background)] px-4 py-1.5 text-center">
                                    <p className="text-[10px] font-semibold text-[var(--text-secondary)]">Before</p>
                                    <p className="text-2xl font-bold leading-tight text-[var(--foreground)]">{currentScore}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                                <div className="min-w-[76px] rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-center">
                                    <p className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">After</p>
                                    <p className="text-2xl font-bold leading-tight text-emerald-600 dark:text-emerald-500">{optimizedScore}</p>
                                </div>
                                <button type="button" onClick={() => setShowCreditModal(true)} disabled={isOptimizing} className={secondary}>
                                    <Wand2 className="h-4 w-4" /> Optimize again
                                </button>
                            </div>
                        </div>

                        {optimization?.optimizedSectionScores && (
                            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/50 p-4">
                                <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
                                    <BarChart3 className="h-3.5 w-3.5" /> Score breakdown after optimization
                                </h3>
                                <ScoreBars scores={optimization.optimizedSectionScores} before={optimization.currentSectionScores} />
                            </div>
                        )}

                        <div className="flex flex-col items-center gap-1.5 text-center">
                            <div className="inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--sidebar-bg)] p-1">
                                {([["full", "Full profiles"], ["side", "Side by side"]] as const).map(([mode, label]) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setCompareMode(mode)}
                                        className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${compareMode === mode ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--foreground)]"}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-[var(--text-secondary)]">Compare each section, then copy the new version into Naukri.</p>
                        </div>

                        {compareMode === "side" ? (
                            <NaukriSideBySide current={profile} optimized={optimized} copiedText={copiedText} onCopy={handleCopy} />
                        ) : (
                            <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
                                <div className="min-w-0 space-y-3 rounded-xl bg-[var(--sidebar-bg)]/40 p-3">
                                    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--background)] px-4 py-3 shadow-sm">
                                        <p className="text-xs font-bold text-[var(--foreground)]">Current profile</p>
                                        <p className="text-[11px] text-[var(--text-secondary)]">What the extension read from Naukri</p>
                                    </div>
                                    <NaukriProfileView profile={profile} quickLinks={false} idPrefix="before" copiedText={copiedText} onCopy={handleCopy} />
                                </div>
                                <div className="min-w-0 space-y-3 rounded-xl border border-green-200/80 bg-green-50/80 p-3 dark:border-emerald-800/50 dark:bg-emerald-950/20">
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 shadow-sm">
                                        <div>
                                            <p className="text-xs font-bold text-green-700 dark:text-green-400">Optimized profile</p>
                                            <p className="text-[11px] text-[var(--text-secondary)]">Ready to copy section by section</p>
                                        </div>
                                        <a href={NAUKRI_PROFILE_URL} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-green-700">
                                            Open Naukri to make changes
                                        </a>
                                    </div>
                                    <NaukriProfileView profile={optimized} editable addedSkills={addedSkills} quickLinks={false} idPrefix="after" newProjectsFrom={profile.projects.length} copiedText={copiedText} onCopy={handleCopy} />
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <div className="min-w-0">
                            <NaukriProfileView profile={profile} copiedText={copiedText} onCopy={handleCopy} />
                        </div>
                        <div className="space-y-4 xl:sticky xl:top-0 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pb-2">
                            <div className="flex flex-col items-center gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/50 p-6 shadow-xl">
                                <ScoreRing score={currentScore} label="Naukri profile strength" />
                                <p className="text-center text-xs text-[var(--text-secondary)]">
                                    {analysis.masterProfileId
                                        ? "Compared with your Master Profile"
                                        : "No Master Profile to compare with, so this scores the profile on its own"}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setShowCreditModal(true)}
                                    disabled={isOptimizing}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--primary)] to-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90 disabled:opacity-50"
                                >
                                    {isOptimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Optimize with AI
                                </button>
                            </div>

                            {captured.length > 0 && (
                                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/50 p-4 shadow-xl">
                                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--primary)]" /> Read from Naukri
                                    </h3>
                                    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
                                        {captured.map((item) => (
                                            <div key={item.label} className="rounded-lg bg-black/5 px-2 py-2 text-center dark:bg-white/5">
                                                <p className="text-base font-bold leading-none text-[var(--foreground)]">{item.value}</p>
                                                <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{item.label}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {analysis.sectionScores && (
                                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/50 p-4 shadow-xl">
                                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
                                        <BarChart3 className="h-3.5 w-3.5" /> Score breakdown
                                    </h3>
                                    <ScoreBars scores={analysis.sectionScores} />
                                </div>
                            )}

                            {analysis.recommendations && analysis.recommendations.length > 0 && (
                                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--sidebar-bg)]/50 p-4 shadow-xl">
                                    <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
                                        <Target className="h-3.5 w-3.5" /> Recommendations
                                    </h3>
                                    <Recommendations items={analysis.recommendations} />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default function NaukriOptimizerPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[50vh] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
                </div>
            }
        >
            <NaukriOptimizerContent />
        </Suspense>
    );
}
