"use client";

import React, { useState, useEffect } from "react";
import { Loader2, UploadCloud, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";

interface JD {
    id: string;
    title: string;
    description_text: string;
}

interface ATSResult {
    overall_ats_score: number;
    semantic_match_score: number;
    keyword_score: number;
    found_skills: string[];
    missing_skills: string[];
    improvements: string[];
}

interface AtsScoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    siteResumeText?: string;
}

export function AtsScoreModal({ isOpen, onClose, siteResumeText }: AtsScoreModalProps) {
    const [step, setStep] = useState<"setup" | "loading" | "result">("setup");

    // Setup State
    const [jds, setJds] = useState<JD[]>([]);
    const [selectedJdId, setSelectedJdId] = useState<string>("");
    const [resumeSource, setResumeSource] = useState<"site" | "upload">("site");
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isFetchingJds, setIsFetchingJds] = useState(false);

    // Result State
    const [result, setResult] = useState<ATSResult | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (isOpen && jds.length === 0) {
            fetchJds();
        }
        if (!isOpen) {
            // Reset state on close
            setTimeout(() => {
                setStep("setup");
                setSelectedJdId("");
                setResumeSource("site");
                setUploadFile(null);
                setResult(null);
                setError("");
            }, 300);
        }
    }, [isOpen]);

    const fetchJds = async () => {
        setIsFetchingJds(true);
        try {
            const res = await fetch("http://localhost:8000/api/saved-jds");
            if (res.ok) {
                const data = await res.json();
                setJds(data.data || []);
            }
        } catch (err) {
            console.error("Failed to fetch JDs:", err);
        } finally {
            setIsFetchingJds(false);
        }
    };

    const handleRunAnalysis = async () => {
        setError("");
        if (!selectedJdId) {
            setError("Please select a Job Description.");
            return;
        }
        if (resumeSource === "site" && !siteResumeText) {
            setError("Site resume is empty. Please upload a PDF instead.");
            return;
        }
        if (resumeSource === "upload" && !uploadFile) {
            setError("Please upload a PDF file.");
            return;
        }

        const selectedJd = jds.find(jd => jd.id === selectedJdId);
        if (!selectedJd) return;

        setStep("loading");

        try {
            const formData = new FormData();
            formData.append("jd_text", selectedJd.description_text);
            if (resumeSource === "site") {
                formData.append("resume_text", siteResumeText || "");
            } else if (uploadFile) {
                formData.append("resume_file", uploadFile);
            }

            const response = await fetch("http://localhost:8000/api/calculate-ats", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const data = await response.json();
            setResult(data);
            setStep("result");
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Something went wrong during analysis.");
            setStep("setup");
        }
    };

    const getScoreColor = (score: number) => {
        if (score < 50) return "text-red-500";
        if (score < 75) return "text-yellow-500";
        return "text-green-500";
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl mx-auto rounded-xl bg-slate-900 border border-slate-800 text-slate-100 shadow-2xl">
                {/* Header */}
                <div className="flex flex-col space-y-1.5 p-6 pb-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold tracking-tight">Advanced ATS Analysis</h2>
                        <button
                            onClick={onClose}
                            className="rounded-full p-1.5 hover:bg-slate-800 text-slate-400 transition-colors"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-slate-400">
                        Compare your resume against a job description using local AI models.
                    </p>
                </div>

                <div className="p-6 pt-0">
                    {/* SETUP STEP */}
                    {step === "setup" && (
                        <div className="space-y-6">
                            {error && (
                                <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    1. Select Job Description
                                </label>
                                <select
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={isFetchingJds}
                                    value={selectedJdId}
                                    onChange={(e) => setSelectedJdId(e.target.value)}
                                >
                                    <option value="" disabled className="bg-slate-900 text-slate-400">
                                        {isFetchingJds ? "Loading JDs..." : "Select a saved JD"}
                                    </option>
                                    {jds.map((jd) => (
                                        <option key={jd.id} value={jd.id} className="bg-slate-900 text-slate-200">
                                            {jd.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-medium leading-none">2. Choose Resume Source</label>
                                <div className="flex flex-col gap-3">
                                    <label className={`flex items-center space-x-2 border border-slate-800 rounded-lg p-3 cursor-pointer transition-colors ${resumeSource === 'site' ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-950/30 hover:bg-slate-900'}`}>
                                        <input
                                            type="radio"
                                            name="resumeSource"
                                            value="site"
                                            checked={resumeSource === "site"}
                                            onChange={() => setResumeSource("site")}
                                            className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-600 focus:ring-offset-slate-900"
                                        />
                                        <span className="cursor-pointer text-sm font-normal flex-1">Use Existing Site Resume</span>
                                    </label>

                                    <label className={`flex items-center space-x-2 border border-slate-800 rounded-lg p-3 cursor-pointer transition-colors ${resumeSource === 'upload' ? 'bg-slate-800/50 border-slate-600' : 'bg-slate-950/30 hover:bg-slate-900'}`}>
                                        <input
                                            type="radio"
                                            name="resumeSource"
                                            value="upload"
                                            checked={resumeSource === "upload"}
                                            onChange={() => setResumeSource("upload")}
                                            className="w-4 h-4 text-blue-600 bg-slate-900 border-slate-700 focus:ring-blue-600 focus:ring-offset-slate-900"
                                        />
                                        <span className="cursor-pointer text-sm font-normal flex-1">Upload New Resume (PDF)</span>
                                    </label>
                                </div>
                            </div>

                            {resumeSource === "upload" && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-sm font-medium leading-none">Upload PDF</label>
                                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-900/50 text-slate-400 hover:bg-slate-800/50 transition-colors cursor-pointer relative group">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                        />
                                        <UploadCloud className="w-10 h-10 mb-2 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                        <span className="text-sm font-medium text-center">
                                            {uploadFile ? uploadFile.name : "Click or drag to upload PDF"}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleRunAnalysis}
                                className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Run Analysis
                            </button>
                        </div>
                    )}

                    {/* LOADING STEP */}
                    {step === "loading" && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 rounded-full blur-xl bg-blue-500/20 animate-pulse" />
                                <Loader2 className="w-16 h-16 animate-spin text-blue-500 relative" />
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-medium text-slate-200">Analyzing compatibility...</h3>
                                <p className="text-sm text-slate-400">Extracting semantic meaning and processing keyword matches.</p>
                            </div>
                        </div>
                    )}

                    {/* RESULT STEP */}
                    {step === "result" && result && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            {/* Score header */}
                            <div className="flex flex-col items-center justify-center space-y-2 pt-4">
                                <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-4 border-slate-800 bg-slate-900 shadow-xl">
                                    <span className={`text-4xl font-bold ${getScoreColor(result.overall_ats_score)}`}>
                                        {result.overall_ats_score}%
                                    </span>
                                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="48" fill="transparent" stroke="currentColor" strokeWidth="4"
                                            className={`opacity-20 ${getScoreColor(result.overall_ats_score)}`} />
                                        <circle cx="50" cy="50" r="48" fill="transparent" stroke="currentColor" strokeWidth="4"
                                            strokeDasharray={`${result.overall_ats_score * 3.01} 301`}
                                            strokeLinecap="round"
                                            className={`${getScoreColor(result.overall_ats_score)} transition-all duration-1000 ease-in-out`} />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-semibold tracking-tight">Overall Match</h3>
                            </div>

                            {/* Subscores */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
                                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Keywords</span>
                                    <span className="text-2xl font-semibold text-slate-200">{result.keyword_score}%</span>
                                </div>
                                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
                                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Semantics</span>
                                    <span className="text-2xl font-semibold text-slate-200">{result.semantic_match_score}%</span>
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-green-500" /> Found Skills
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {result.found_skills.length > 0 ? result.found_skills.map((skill, i) => (
                                            <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                                {skill}
                                            </span>
                                        )) : <span className="text-sm text-slate-500">No key skills matched.</span>}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                                        <XCircle className="w-4 h-4 text-red-500" /> Missing Skills
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        {result.missing_skills.length > 0 ? result.missing_skills.map((skill, i) => (
                                            <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                                                {skill}
                                            </span>
                                        )) : <span className="text-sm text-slate-500">Great! All key skills are present.</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Improvements */}
                            {result.improvements.length > 0 && (
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 space-y-3">
                                    <h4 className="text-sm font-medium text-orange-400 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4" /> Actionable Feedback
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-300">
                                        {result.improvements.map((imp, i) => (
                                            <li key={i} className="flex gap-2">
                                                <span className="text-orange-500 mt-0.5">•</span>
                                                <span>{imp}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={() => setStep("setup")}
                                className="inline-flex items-center justify-center w-full border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white font-medium py-2.5 px-4 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" /> Start Over
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
