"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, ChevronRight, ChevronLeft, RotateCcw,
  CheckCircle, XCircle, AlertCircle, Loader2, Play,
  Trophy, TrendingUp, Target, Lightbulb, ArrowRight,
  Volume2, VolumeX, SkipForward, BarChart3
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface Job {
  id: string;
  jobTitle: string;
  company: string;
  description?: string;
}

interface Question {
  question: string;
  tip: string;
  type?: string;
}

interface PerQuestionResult {
  question: string;
  score: number;
  what_went_well: string;
  what_to_improve: string;
  better_answer_hint: string;
}

interface Analysis {
  overall_score: number;
  overall_grade: string;
  headline: string;
  strengths: string[];
  improvements: string[];
  per_question: PerQuestionResult[];
  power_phrases: string[];
  next_steps: string[];
  hiring_likelihood: string;
}

type Phase = "setup" | "loading_questions" | "intro" | "interviewing" | "analyzing" | "results";

// ── Helpers ────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 60) return "bg-blue-50 border-blue-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function likelihoodColor(l: string) {
  const m: Record<string, string> = { "Very High": "text-emerald-600", High: "text-blue-600", Medium: "text-amber-600", Low: "text-red-500" };
  return m[l] || "text-gray-600";
}

// ── Main Component ─────────────────────────────────────────────────────

export default function InterviewPrepPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [autoRecord, setAutoRecord] = useState(true);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // ── Load saved jobs ──────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/jobs")
      .then(r => r.json())
      .then(data => {
        const GARBAGE_PATTERNS = [
          /^not found$/i,
          /^select which cookies/i,
          /^skip to main content/i,
          /^accept all cookies/i,
          /^privacy policy/i,
          /^cookie/i,
        ];
        const isGarbage = (j: Job) => {
          if (!j.jobTitle || j.jobTitle.trim().length < 3) return true;
          if (GARBAGE_PATTERNS.some(r => r.test(j.jobTitle.trim()))) return true;
          const desc = (j.description || "").trim();
          if (desc && GARBAGE_PATTERNS.some(r => r.test(desc.slice(0, 80)))) return true;
          return false;
        };
        const list = (data.data || data.jobs || data || []).filter((j: Job) => !isGarbage(j));
        setJobs(list);
        if (list.length > 0) setSelectedJob(list[0]);
      })
      .catch(() => setJobs([]));
  }, []);

  // ── Speech init ──────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      stopRecording();
      synthRef.current?.cancel();
    };
  }, []);

  // ── TTS ──────────────────────────────────────────────────────────────
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!voiceEnabled || !synthRef.current) {
      onDone?.();
      return;
    }
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-US";
    utt.rate = 0.95;
    utt.pitch = 1;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => { setIsSpeaking(false); onDone?.(); };
    utt.onerror = () => { setIsSpeaking(false); onDone?.(); };
    synthRef.current.speak(utt);
  }, [voiceEnabled]);

  const stopSpeaking = () => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  };

  // ── Speech Recognition ───────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support voice input. Please type your answer.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = currentTranscript;

    recognition.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + t;
        } else {
          interim = t;
        }
      }
      setCurrentTranscript(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    stopSpeaking();
  }, [currentTranscript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  // ── Generate Questions ───────────────────────────────────────────────
  const loadQuestions = async () => {
    if (!selectedJob) return;
    setPhase("loading_questions");
    setError("");

    try {
      const res = await fetch("/api/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: selectedJob.jobTitle,
          company: selectedJob.company,
          job_description: selectedJob.description || "",
          num_questions: 7,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.questions?.length) throw new Error(data.detail || "Failed to generate questions");
      setQuestions(data.questions);
      setAnswers(new Array(data.questions.length).fill(""));
      setCurrentQ(0);
      setPhase("intro");
    } catch (e: any) {
      setError(e.message || "Could not generate questions. Please try again.");
      setPhase("setup");
    }
  };

  // ── Start Interview ──────────────────────────────────────────────────
  const startInterview = () => {
    setCurrentTranscript("");
    setPhase("interviewing");
    setTimeout(() => {
      speak(questions[0]?.question || "", () => {
        if (autoRecord) startRecording();
      });
    }, 600);
  };

  // ── Submit Answer ────────────────────────────────────────────────────
  const submitAnswer = () => {
    stopRecording();
    stopSpeaking();
    const updated = [...answers];
    updated[currentQ] = currentTranscript.trim() || "(no answer)";
    setAnswers(updated);

    if (currentQ < questions.length - 1) {
      const nextQ = currentQ + 1;
      setCurrentQ(nextQ);
      setCurrentTranscript("");
      setTimeout(() => {
        speak(questions[nextQ]?.question || "", () => {
          if (autoRecord) startRecording();
        });
      }, 400);
    } else {
      // All answered — analyze
      analyzeInterview(updated);
    }
  };

  const skipQuestion = () => {
    const updated = [...answers];
    updated[currentQ] = "(skipped)";
    setAnswers(updated);
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
      setCurrentTranscript("");
    } else {
      analyzeInterview(updated);
    }
  };

  // ── Analyze ──────────────────────────────────────────────────────────
  const analyzeInterview = async (finalAnswers: string[]) => {
    stopSpeaking();
    setPhase("analyzing");
    try {
      const res = await fetch("/api/interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: selectedJob?.jobTitle || "",
          company: selectedJob?.company || "",
          job_description: selectedJob?.description || "",
          answers: questions.map((q, i) => ({ question: q.question, answer: finalAnswers[i] || "" })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setAnalysis(data);
      setPhase("results");
    } catch (e: any) {
      setError(e.message || "Analysis failed. Please try again.");
      setPhase("results"); // still show results page with error
    }
  };

  const restart = () => {
    stopRecording();
    stopSpeaking();
    setPhase("setup");
    setQuestions([]);
    setAnswers([]);
    setCurrentQ(0);
    setCurrentTranscript("");
    setAnalysis(null);
    setError("");
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="text-2xl">🎤</span> Interview Prep
            <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded ml-1">PRO</span>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            AI-powered mock interview with voice — get detailed feedback on your answers.
          </p>
        </div>

        {/* ── SETUP ── */}
        {phase === "setup" && (
          <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Select a job to practise for</h2>

            {error && (
              <div className="mb-4 flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {jobs.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">No saved jobs found.</p>
                <a href="/dashboard/jobs" className="text-sm text-blue-500 hover:underline mt-1 inline-block">
                  Save a job first →
                </a>
              </div>
            ) : (
              <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1">
                {jobs.map(job => (
                  <button
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      selectedJob?.id === job.id
                        ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20"
                        : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-white">{job.jobTitle}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{job.company}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Voice toggle */}
            <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
              <button
                onClick={() => setVoiceEnabled(v => !v)}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  voiceEnabled ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                }`}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {voiceEnabled ? "Read aloud" : "Muted"}
              </button>
              <button
                onClick={() => setAutoRecord(v => !v)}
                className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  autoRecord ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-200 text-gray-500 dark:bg-white/10 dark:text-gray-400"
                }`}
              >
                <Mic className="w-4 h-4" />
                {autoRecord ? "Auto-record on" : "Auto-record off"}
              </button>
              <span className="text-xs text-gray-400">Auto-record starts mic automatically after each question</span>
            </div>

            <button
              onClick={loadQuestions}
              disabled={!selectedJob}
              className="w-full py-3 px-6 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Generate Interview Questions
            </button>
          </div>
        )}

        {/* ── LOADING QUESTIONS ── */}
        {phase === "loading_questions" && (
          <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 p-12 shadow-sm text-center">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
            <p className="font-semibold text-gray-900 dark:text-white">Preparing your interview…</p>
            <p className="text-sm text-gray-400 mt-1">AI is crafting questions specific to this role</p>
          </div>
        )}

        {/* ── INTRO ── */}
        {phase === "intro" && (
          <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-3xl">📋</span>
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white text-base">{selectedJob?.jobTitle}</h2>
                <p className="text-xs text-gray-500">{selectedJob?.company}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              <strong>{questions.length} questions</strong> prepared. Answer by voice or type. Click the question to see a coaching tip.
            </p>

            <div className="space-y-2 mb-6">
              {questions.map((q, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                  onClick={() => setExpandedQ(expandedQ === i ? null : i)}
                >
                  <span className="text-xs font-bold text-orange-500 mt-0.5 flex-shrink-0">Q{i + 1}</span>
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-200">{q.question}</p>
                    {expandedQ === i && (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-3 py-2">
                        💡 {q.tip}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={restart} className="flex-1 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                ← Change Job
              </button>
              <button onClick={startInterview} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
                <Mic className="w-4 h-4" /> Start Interview
              </button>
            </div>
          </div>
        )}

        {/* ── INTERVIEWING ── */}
        {phase === "interviewing" && (
          <div className="space-y-4">
            {/* Progress */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Question {currentQ + 1} of {questions.length}
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
                <div
                  className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setVoiceEnabled(v => !v)}
                  title={voiceEnabled ? "Mute questions" : "Unmute questions"}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setAutoRecord(v => !v)}
                  title={autoRecord ? "Disable auto-record" : "Enable auto-record"}
                  className={`p-1.5 rounded-lg transition-colors ${autoRecord ? "text-red-400 hover:text-red-600" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"}`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <span className="text-xs font-bold text-orange-500 uppercase tracking-wide">
                    {questions[currentQ]?.type || "Question"}
                  </span>
                  <p className="text-base font-semibold text-gray-900 dark:text-white mt-1 leading-snug">
                    {questions[currentQ]?.question}
                  </p>
                </div>
                {isSpeaking && (
                  <button onClick={stopSpeaking} className="flex-shrink-0 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 hover:bg-blue-100 transition-colors">
                    <VolumeX className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Tip */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl px-4 py-3 mb-5">
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  <span className="font-bold">💡 Tip:</span> {questions[currentQ]?.tip}
                </p>
              </div>

              {/* Recording area */}
              <div className={`rounded-xl border-2 p-4 mb-4 min-h-24 transition-colors relative ${
                isRecording
                  ? "border-red-400 bg-red-50 dark:bg-red-900/10"
                  : isSpeaking
                  ? "border-blue-300 bg-blue-50 dark:bg-blue-900/10"
                  : "border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5"
              }`}>
                {isRecording && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                    </span>
                    <span className="text-xs font-medium text-red-500">Listening…</span>
                  </div>
                )}
                {isSpeaking && !isRecording && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
                    </span>
                    <span className="text-xs font-medium text-blue-500">Reading question aloud…</span>
                  </div>
                )}
                {currentTranscript ? (
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{currentTranscript}</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">
                    {isRecording ? "Speak your answer now" : isSpeaking ? "Recording will start automatically after" : "Click the mic to start recording, or type below"}
                  </p>
                )}
              </div>

              {/* Type fallback */}
              <textarea
                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-sm text-gray-800 dark:text-gray-200 px-3 py-2 mb-4 resize-none focus:outline-none focus:border-orange-400 transition-colors placeholder-gray-400"
                rows={2}
                placeholder="Or type your answer here…"
                value={currentTranscript}
                onChange={e => setCurrentTranscript(e.target.value)}
              />

              {/* Controls */}
              <div className="flex gap-3">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900"
                  }`}
                >
                  {isRecording ? <><MicOff className="w-4 h-4" /> Stop</> : <><Mic className="w-4 h-4" /> Record</>}
                </button>

                <button
                  onClick={skipQuestion}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" /> Skip
                </button>

                <button
                  onClick={submitAnswer}
                  className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {currentQ < questions.length - 1 ? (
                    <><ChevronRight className="w-4 h-4" /> Next</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> Finish</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYZING ── */}
        {phase === "analyzing" && (
          <div className="bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 p-12 shadow-sm text-center">
            <BarChart3 className="w-10 h-10 animate-pulse text-orange-500 mx-auto mb-4" />
            <p className="font-semibold text-gray-900 dark:text-white text-lg">Analysing your performance…</p>
            <p className="text-sm text-gray-400 mt-1">AI is reviewing your answers and preparing detailed feedback</p>
          </div>
        )}

        {/* ── RESULTS ── */}
        {phase === "results" && (
          <div className="space-y-5">
            {/* Error fallback */}
            {error && !analysis && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                {error}
              </div>
            )}

            {analysis && (
              <>
                {/* Score card */}
                <div className={`rounded-2xl border p-6 ${scoreBg(analysis.overall_score)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">Overall Performance</div>
                      <div className={`text-5xl font-black ${scoreColor(analysis.overall_score)}`}>
                        {analysis.overall_score}
                        <span className="text-2xl">/100</span>
                      </div>
                      <div className={`text-lg font-bold mt-1 ${scoreColor(analysis.overall_score)}`}>Grade: {analysis.overall_grade}</div>
                    </div>
                    <div className="text-right">
                      <Trophy className={`w-12 h-12 mx-auto mb-1 ${scoreColor(analysis.overall_score)}`} />
                      <div className={`text-sm font-semibold ${likelihoodColor(analysis.hiring_likelihood)}`}>
                        Hiring Likelihood: {analysis.hiring_likelihood}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300 border-t border-current/10 pt-3">
                    {analysis.headline}
                  </p>
                </div>

                {/* Strengths + Improvements */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-4">
                    <h3 className="font-semibold text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-3">
                      <TrendingUp className="w-4 h-4" /> Strengths
                    </h3>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s, i) => (
                        <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                          <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-4">
                    <h3 className="font-semibold text-sm text-orange-600 dark:text-orange-400 flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4" /> To Improve
                    </h3>
                    <ul className="space-y-2">
                      {analysis.improvements.map((s, i) => (
                        <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5">
                          <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Power phrases */}
                {analysis.power_phrases?.length > 0 && (
                  <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-4">
                    <h3 className="font-semibold text-sm text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4" /> Power Phrases to Use More
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.power_phrases.map((p, i) => (
                        <span key={i} className="text-xs px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full">
                          "{p}"
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-question breakdown */}
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-4">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">Question-by-Question Breakdown</h3>
                  <div className="space-y-3">
                    {analysis.per_question.map((q, i) => (
                      <div key={i} className={`rounded-xl border p-4 ${scoreBg(q.score * 10)}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{q.question}</p>
                          <span className={`text-sm font-black flex-shrink-0 ${scoreColor(q.score * 10)}`}>
                            {q.score}/10
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 mt-2 text-xs">
                          {q.what_went_well && (
                            <div className="flex items-start gap-1.5 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span>{q.what_went_well}</span>
                            </div>
                          )}
                          {q.what_to_improve && (
                            <div className="flex items-start gap-1.5 text-orange-700 dark:text-orange-400">
                              <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span>{q.what_to_improve}</span>
                            </div>
                          )}
                          {q.better_answer_hint && (
                            <div className="flex items-start gap-1.5 text-indigo-700 dark:text-indigo-400 mt-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg px-2 py-1.5">
                              <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              <span>{q.better_answer_hint}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Next steps */}
                {analysis.next_steps?.length > 0 && (
                  <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-4">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">
                      🎯 Action Plan Before Your Next Interview
                    </h3>
                    <ol className="space-y-2">
                      {analysis.next_steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}

            {/* Retry / New */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={restart}
                className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Try Another Job
              </button>
              <button
                onClick={() => {
                  setPhase("intro");
                  setCurrentQ(0);
                  setAnswers(new Array(questions.length).fill(""));
                  setCurrentTranscript("");
                  setAnalysis(null);
                }}
                className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Mic className="w-4 h-4" /> Redo This Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
