"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, SkipForward, RotateCcw, CheckCircle,
  AlertCircle, Loader2, Camera, CameraOff, Volume2, VolumeX,
  TrendingUp, Target, Lightbulb, Trophy, BarChart3, Play,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface Job { id: string; jobTitle: string; company: string; description?: string; }
interface ConversationTurn { role: "interviewer" | "candidate"; content: string; }
interface PerQuestionResult {
  question: string; score: number;
  what_went_well: string; what_to_improve: string; better_answer_hint: string;
}
interface Analysis {
  overall_score: number; overall_grade: string; headline: string;
  strengths: string[]; improvements: string[];
  per_question: PerQuestionResult[];
  power_phrases: string[]; next_steps: string[];
  hiring_likelihood: string;
}
type Phase = "setup" | "camera_check" | "interviewing" | "analyzing" | "results";

// ── Score helpers ──────────────────────────────────────────────────────

function scoreColor(s: number) {
  if (s >= 80) return "text-emerald-500";
  if (s >= 60) return "text-blue-500";
  if (s >= 40) return "text-amber-500";
  return "text-red-500";
}
function scoreBg(s: number) {
  if (s >= 80) return "bg-emerald-500/10 border-emerald-500/30";
  if (s >= 60) return "bg-blue-500/10 border-blue-500/30";
  if (s >= 40) return "bg-amber-500/10 border-amber-500/30";
  return "bg-red-500/10 border-red-500/30";
}
function likelihoodColor(l: string) {
  return { "Very High": "text-emerald-500", High: "text-blue-500", Medium: "text-amber-500", Low: "text-red-500" }[l] || "text-[var(--text-secondary)]";
}
function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// ── Interviewer Avatar (SVG) ───────────────────────────────────────────

function InterviewerAvatar({ isSpeaking, isThinking, isBlinking }: {
  isSpeaking: boolean; isThinking: boolean; isBlinking: boolean;
}) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="iv-bg" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#1e2d50" />
          <stop offset="100%" stopColor="#080f1e" />
        </radialGradient>
        <radialGradient id="iv-skin" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f0c09a" />
          <stop offset="100%" stopColor="#c8845e" />
        </radialGradient>
        <radialGradient id="iv-suit" cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#1e3a6e" />
          <stop offset="100%" stopColor="#0a1628" />
        </radialGradient>
      </defs>

      {/* Background */}
      <circle cx="100" cy="100" r="98" fill="url(#iv-bg)" />

      {/* Suit body */}
      <ellipse cx="100" cy="195" rx="72" ry="50" fill="url(#iv-suit)" />
      <path d="M 38 158 L 100 186 L 162 158 L 155 134 L 100 154 L 45 134 Z" fill="#0a1628" />

      {/* Shirt */}
      <path d="M 83 144 L 100 166 L 117 144 L 111 130 L 100 138 L 89 130 Z" fill="#f0f4f8" />

      {/* Tie */}
      <polygon points="96,133 104,133 107,126 100,122 93,126" fill="#1d4ed8" />
      <path d="M 96 133 L 100 162 L 104 133" fill="#2563eb" />

      {/* Neck */}
      <rect x="87" y="118" width="26" height="26" rx="9" fill="url(#iv-skin)" />

      {/* Head */}
      <ellipse cx="100" cy="86" rx="42" ry="44" fill="url(#iv-skin)" />

      {/* Hair */}
      <path d="M 58 78 Q 60 48 100 42 Q 140 48 142 78 Q 138 50 100 46 Q 62 50 58 78 Z" fill="#1a0e06" />

      {/* Ears */}
      <ellipse cx="58" cy="88" rx="6" ry="8" fill="#c8845e" />
      <ellipse cx="142" cy="88" rx="6" ry="8" fill="#c8845e" />

      {/* Eyebrows */}
      <path d="M 70 63 Q 80 57 90 61" stroke="#1a0e06" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M 110 61 Q 120 57 130 63" stroke="#1a0e06" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Eye whites */}
      <ellipse cx="80" cy="76" rx="9.5" ry="9.5" fill="white" />
      <ellipse cx="120" cy="76" rx="9.5" ry="9.5" fill="white" />

      {/* Iris */}
      <circle cx="80" cy="76" r="6" fill="#193060" />
      <circle cx="120" cy="76" r="6" fill="#193060" />

      {/* Pupil */}
      <circle cx="80" cy="76" r="3" fill="#050a10" />
      <circle cx="120" cy="76" r="3" fill="#050a10" />

      {/* Eye shine */}
      <circle cx="82" cy="73" r="2" fill="rgba(255,255,255,0.85)" />
      <circle cx="122" cy="73" r="2" fill="rgba(255,255,255,0.85)" />

      {/* Blink overlay */}
      {isBlinking && (
        <>
          <ellipse cx="80" cy="76" rx="9.5" ry="9.5" fill="#c8845e" />
          <ellipse cx="120" cy="76" rx="9.5" ry="9.5" fill="#c8845e" />
        </>
      )}

      {/* Nose */}
      <path d="M 97 86 Q 94 95 97 100 Q 100 102 103 100 Q 106 95 103 86" stroke="#a0603a" strokeWidth="1.5" fill="none" />

      {/* Mouth */}
      {isSpeaking ? (
        <>
          <ellipse cx="100" cy="111" rx="11" ry="7" fill="#7a2a1a" />
          <ellipse cx="100" cy="108" rx="11" ry="4" fill="#c05040" />
          <rect x="93" y="106" width="14" height="4" rx="2" fill="#f8f0ec" />
        </>
      ) : isThinking ? (
        <path d="M 88 110 Q 100 115 112 110" stroke="#8b4530" strokeWidth="2" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M 87 110 Q 100 120 113 110" stroke="#8b4530" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
    </svg>
  );
}

// ── Audio level bars ───────────────────────────────────────────────────

function AudioBars({ level }: { level: number }) {
  const bars = 5;
  const active = Math.round((level / 80) * bars);
  return (
    <div className="flex items-end gap-0.5 h-4">
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all duration-75"
          style={{
            height: `${40 + i * 15}%`,
            backgroundColor: i < active ? "var(--primary)" : "var(--border-color)",
          }}
        />
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function InterviewPrepPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [isFinalMessage, setIsFinalMessage] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");
  const [permissionError, setPermissionError] = useState("");
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [questionNum, setQuestionNum] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const TOTAL_QUESTIONS = 5;

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const audioFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const convRef = useRef<ConversationTurn[]>([]);

  // Keep convRef in sync
  useEffect(() => { convRef.current = conversation; }, [conversation]);

  // Load jobs
  useEffect(() => {
    fetch("/api/jobs")
      .then(r => r.json())
      .then(data => {
        const JUNK = [/^not found$/i, /^select which cookies/i, /^skip to main/i, /^accept all/i, /^privacy/i, /^cookie/i];
        const ok = (j: Job) => j.jobTitle?.trim().length >= 3 && !JUNK.some(r => r.test(j.jobTitle.trim()));
        const list = (data.data || data.jobs || data || []).filter(ok);
        setJobs(list);
        if (list.length) setSelectedJob(list[0]);
      })
      .catch(() => setJobs([]));
  }, []);

  // Speech synthesis init
  useEffect(() => {
    if (typeof window !== "undefined") synthRef.current = window.speechSynthesis;
    return () => stopAllMedia();
  }, []);

  // Interview timer
  useEffect(() => {
    if (phase === "interviewing") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Eye blinking
  useEffect(() => {
    if (phase !== "interviewing") return;
    const blink = () => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 130);
    };
    const id = setInterval(blink, 3200 + Math.random() * 1800);
    return () => clearInterval(id);
  }, [phase]);

  // After final AI message, transition to analysis
  useEffect(() => {
    if (!isFinalMessage || isAISpeaking || phase !== "interviewing") return;
    const t = setTimeout(() => analyzeConversation(), 2200);
    return () => clearTimeout(t);
  }, [isFinalMessage, isAISpeaking]);

  // ── Media helpers ────────────────────────────────────────────────────

  const stopAllMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioFrameRef.current) cancelAnimationFrame(audioFrameRef.current);
    audioContextRef.current?.close().catch(() => {});
    synthRef.current?.cancel();
    recognitionRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const startAudioMonitoring = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;
      setAudioLevel(avg);
      audioFrameRef.current = requestAnimationFrame(tick);
    };
    audioFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const requestPermissions = async () => {
    setPermissionError("");
    setPermissionBlocked(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      const ACtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new ACtx();
      audioContextRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      setPhase("camera_check");
    } catch (err: any) {
      if (err?.name === "NotFoundError" || err?.name === "DevicesNotFoundError") {
        setPermissionError("No camera or microphone found. Please connect a device and try again.");
        setPermissionBlocked(false);
      } else if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setPermissionBlocked(true);
        setPermissionError("blocked");
      } else {
        setPermissionError("Could not access camera or microphone. Please check your device settings.");
        setPermissionBlocked(false);
      }
    }
  };

  const skipToTextOnly = () => {
    setPermissionError("");
    setPermissionBlocked(false);
    setPhase("camera_check");
  };

  // ── TTS ──────────────────────────────────────────────────────────────

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!voiceEnabled || !synthRef.current) { onDone?.(); return; }
    synthRef.current.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-US";
    utt.rate = 0.92;
    utt.pitch = 1;
    utt.onstart = () => setIsAISpeaking(true);
    utt.onend = () => { setIsAISpeaking(false); onDone?.(); };
    utt.onerror = () => { setIsAISpeaking(false); onDone?.(); };
    synthRef.current.speak(utt);
  }, [voiceEnabled]);

  // ── Speech recognition ───────────────────────────────────────────────

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    let final = "";
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += (final ? " " : "") + t;
        else interim = t;
      }
      setTranscript(final + (interim ? " " + interim : ""));
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
    synthRef.current?.cancel();
    setIsAISpeaking(false);
  }, []);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  // ── Conversation ─────────────────────────────────────────────────────

  const fetchNextMessage = useCallback(async (history: ConversationTurn[]) => {
    setIsAIThinking(true);
    setError("");
    try {
      const res = await fetch("/api/interview/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: selectedJob!.jobTitle,
          company: selectedJob!.company,
          job_description: selectedJob?.description || "",
          conversation_history: history,
          total_questions: TOTAL_QUESTIONS,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to get interviewer response");

      const newHistory: ConversationTurn[] = [...history, { role: "interviewer", content: data.message }];
      setConversation(newHistory);
      setCurrentMessage(data.message);

      const final = Boolean(data.is_final);
      setIsFinalMessage(final);

      // Count questions asked (excluding the greeting)
      const qCount = newHistory.filter(t => t.role === "interviewer").length - 1;
      setQuestionNum(Math.max(0, qCount));

      speak(data.message, () => {
        if (!final) startRecording();
      });
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setIsAIThinking(false);
    }
  }, [selectedJob, speak, startRecording]);

  const startInterview = () => {
    setConversation([]);
    setTranscript("");
    setQuestionNum(0);
    setElapsed(0);
    setIsFinalMessage(false);
    setError("");
    setPhase("interviewing");
    startAudioMonitoring();
    setTimeout(() => fetchNextMessage([]), 500);
  };

  const submitAnswer = () => {
    stopRecording();
    synthRef.current?.cancel();
    setIsAISpeaking(false);
    const answer = transcript.trim() || "(no answer)";
    const updated: ConversationTurn[] = [...convRef.current, { role: "candidate", content: answer }];
    setConversation(updated);
    setTranscript("");
    fetchNextMessage(updated);
  };

  const skipAnswer = () => {
    stopRecording();
    synthRef.current?.cancel();
    setIsAISpeaking(false);
    const updated: ConversationTurn[] = [...convRef.current, { role: "candidate", content: "(skipped)" }];
    setConversation(updated);
    setTranscript("");
    fetchNextMessage(updated);
  };

  const analyzeConversation = async () => {
    setPhase("analyzing");
    const history = convRef.current;
    const pairs: { question: string; answer: string }[] = [];
    for (let i = 0; i < history.length - 1; i++) {
      if (history[i].role === "interviewer" && history[i + 1]?.role === "candidate") {
        pairs.push({ question: history[i].content, answer: history[i + 1].content });
      }
    }
    try {
      const res = await fetch("/api/interview/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_title: selectedJob?.jobTitle || "",
          company: selectedJob?.company || "",
          job_description: selectedJob?.description || "",
          answers: pairs,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Analysis failed");
      setAnalysis(data);
    } catch (e: any) {
      setError(e.message || "Analysis failed");
    } finally {
      setPhase("results");
    }
  };

  const restart = () => {
    stopAllMedia();
    streamRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    setPhase("setup");
    setConversation([]);
    setTranscript("");
    setCurrentMessage("");
    setAnalysis(null);
    setError("");
    setElapsed(0);
    setQuestionNum(0);
    setIsFinalMessage(false);
    setAudioLevel(0);
  };

  // ── RENDER ────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── FULL-SCREEN INTERVIEW ROOM ─────────────────────────────── */}
      {phase === "interviewing" && (
        <div className="h-screen flex flex-col" style={{ background: "#0a0a0a", backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)", backgroundSize: "32px 32px" }}>

          {/* ── Top bar ── */}
          <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b" style={{ background: "#111", borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Live Interview</span>
            </div>
            <div className="text-xs font-medium text-white/60 truncate max-w-xs">
              {selectedJob?.jobTitle} · {selectedJob?.company}
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setVoiceEnabled(v => !v)} className="p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/8 transition-all" title={voiceEnabled ? "Mute" : "Unmute"}>
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <span className="text-xs font-mono text-white/40 tabular-nums bg-white/5 px-2 py-1 rounded-md">{fmt(elapsed)}</span>
            </div>
          </div>

          {/* ── Main area ── */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center">

            {/* Centered content column */}
            <div className="flex flex-col items-center gap-5 w-full max-w-xl px-6 py-4">

              {/* Avatar container */}
              <div className="relative flex-shrink-0">
                {/* Outer ambient glow */}
                {isAISpeaking && (
                  <div className="absolute inset-[-40px] rounded-full opacity-20" style={{ background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)" }} />
                )}

                {/* Speaking rings */}
                {isAISpeaking && (
                  <>
                    <div className="absolute inset-[-14px] rounded-full border border-[var(--primary)]/40 animate-ping" style={{ animationDuration: "1.4s", animationDelay: "0ms" }} />
                    <div className="absolute inset-[-26px] rounded-full border border-[var(--primary)]/25 animate-ping" style={{ animationDuration: "1.4s", animationDelay: "400ms" }} />
                    <div className="absolute inset-[-38px] rounded-full border border-[var(--primary)]/12 animate-ping" style={{ animationDuration: "1.4s", animationDelay: "800ms" }} />
                  </>
                )}
                {isAIThinking && !isAISpeaking && (
                  <div className="absolute inset-[-10px] rounded-full border border-[var(--primary)]/30 animate-pulse" />
                )}

                {/* Avatar circle */}
                <div className="w-44 h-44 rounded-full overflow-hidden shadow-2xl" style={{ boxShadow: isAISpeaking ? "0 0 40px rgba(var(--primary-rgb, 34,197,94), 0.3), 0 0 80px rgba(var(--primary-rgb, 34,197,94), 0.1)" : "0 20px 60px rgba(0,0,0,0.6)" }}>
                  <InterviewerAvatar isSpeaking={isAISpeaking} isThinking={isAIThinking} isBlinking={isBlinking} />
                </div>
              </div>

              {/* Name + live status */}
              <div className="text-center flex-shrink-0">
                <p className="font-bold text-white text-lg tracking-tight">Alex</p>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  {isAIThinking ? (
                    <><Loader2 className="w-3 h-3 text-[var(--primary)] animate-spin" /><span className="text-xs text-white/50">Thinking…</span></>
                  ) : isAISpeaking ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" /><span className="text-xs text-[var(--primary)]">Speaking</span></>
                  ) : isRecording ? (
                    <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /><span className="text-xs text-red-400">Listening to you…</span></>
                  ) : (
                    <span className="text-xs text-white/40">Senior AI Interviewer</span>
                  )}
                </div>
              </div>

              {/* Speech bubble */}
              {currentMessage && !isAIThinking && (
                <div className="w-full rounded-2xl px-5 py-4 flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-sm text-white/85 leading-relaxed">{currentMessage}</p>
                </div>
              )}

              {/* Thinking dots */}
              {isAIThinking && (
                <div className="flex gap-2 items-center py-2">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2.5 h-2.5 rounded-full bg-[var(--primary)]" style={{ animation: "bounce 1s ease-in-out infinite", animationDelay: `${i * 180}ms` }} />
                  ))}
                </div>
              )}

              {/* Question progress */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
                  <div key={i} style={{ transition: "all 0.4s" }} className={`h-1 rounded-full ${i < questionNum ? "w-8 bg-[var(--primary)]" : i === questionNum ? "w-6 bg-[var(--primary)]/50" : "w-6 bg-white/10"}`} />
                ))}
                <span className="text-xs text-white/30 ml-1">{questionNum}/{TOTAL_QUESTIONS}</span>
              </div>

            </div>

            {/* User camera PiP — top right */}
            <div className="absolute top-4 right-4 w-40 h-32 rounded-2xl overflow-hidden shadow-2xl" style={{ border: "1.5px solid rgba(255,255,255,0.12)" }}>
              {streamRef.current ? (
                <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5" style={{ background: "#1a1a1a" }}>
                  <CameraOff className="w-6 h-6 text-white/20" />
                  <span className="text-[10px] text-white/25">No camera</span>
                </div>
              )}
              {/* Label */}
              <div className="absolute bottom-0 inset-x-0 px-2 py-1.5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/60 font-medium">You</span>
                  {isRecording && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
                  {isRecording && <AudioBars level={audioLevel} />}
                </div>
              </div>
            </div>

          </div>

          {/* ── Controls bar ── */}
          <div className="flex-shrink-0 border-t px-6 py-4" style={{ background: "#111", borderColor: "rgba(255,255,255,0.07)" }}>

            {/* Transcript / answer area */}
            <div className={`rounded-xl px-4 py-3 mb-4 min-h-[72px] transition-all ${isRecording ? "border border-red-500/50" : "border border-white/8"}`} style={{ background: isRecording ? "rgba(239,68,68,0.06)" : "rgba(255,255,255,0.04)" }}>
              <div className="flex items-center justify-between mb-1.5">
                {isRecording ? (
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
                    </span>
                    <span className="text-[11px] font-medium text-red-400 uppercase tracking-wider">Recording — speak now</span>
                  </div>
                ) : (
                  <span className="text-[11px] text-white/25 uppercase tracking-wider">Your answer</span>
                )}
                {transcript && (
                  <button onClick={() => setTranscript("")} className="text-[10px] text-white/25 hover:text-white/50 transition-colors">Clear</button>
                )}
              </div>
              {transcript ? (
                <p className="text-sm text-white/80 leading-relaxed">{transcript}</p>
              ) : (
                <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.22)" }}>
                  {isRecording ? "Listening…" : isAISpeaking ? "Interviewer is speaking…" : "Press the mic button and speak your answer"}
                </p>
              )}
            </div>


            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {/* Mic */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAIThinking || isFinalMessage}
                className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-30 ${
                  isRecording
                    ? "shadow-lg"
                    : "hover:bg-white/10"
                }`}
                style={isRecording ? { background: "#ef4444", boxShadow: "0 0 20px rgba(239,68,68,0.4)" } : { background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)" }}
              >
                {isRecording ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white/70" />}
              </button>

              {/* Skip */}
              <button
                onClick={skipAnswer}
                disabled={isAIThinking || isFinalMessage}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-30 flex items-center gap-1.5"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <SkipForward className="w-4 h-4" /> Skip
              </button>

              {/* Submit */}
              <button
                onClick={submitAnswer}
                disabled={isAIThinking || isFinalMessage}
                className="ml-auto px-7 py-2.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-30 flex items-center gap-2 text-white"
                style={{ background: "var(--primary)" }}
              >
                <CheckCircle className="w-4 h-4" />
                {questionNum >= TOTAL_QUESTIONS - 1 ? "Finish Interview" : "Next Question"}
              </button>
            </div>

            {error && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── STANDARD LAYOUT (all other phases) ────────────────────── */}
      {phase !== "interviewing" && (
        <div className="min-h-screen bg-[var(--background)]">
          {/* Mini top bar with back link */}
          <div className="border-b border-[var(--border-color)] px-6 py-3 flex items-center gap-4 bg-[var(--sidebar-bg)]">
            <a href="/dashboard" className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5">
              ← Dashboard
            </a>
            <span className="text-[var(--border-color)]">/</span>
            <span className="text-xs text-[var(--foreground)] font-medium">Interview Prep</span>
          </div>

          <div className="max-w-2xl mx-auto px-4 py-10">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-[var(--foreground)] flex items-center gap-3">
                <span>🎤</span> Interview Prep
                <span className="text-xs font-bold bg-[var(--primary)] text-white px-2 py-0.5 rounded ml-1">PRO</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                AI-powered live interview with a conversational interviewer and real-time feedback.
              </p>
            </div>

            {/* ── SETUP ── */}
            {phase === "setup" && (
              <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--border-color)] p-6 shadow-sm">
                <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">Select a job to interview for</h2>

                {jobs.length === 0 ? (
                  <div className="text-center py-10 text-[var(--text-secondary)]">
                    <p className="text-sm">No saved jobs found.</p>
                    <a href="/dashboard/jobs" className="text-sm text-[var(--primary)] hover:underline mt-1 inline-block">
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
                            ? "border-[var(--primary)] bg-[var(--primary)]/10"
                            : "border-[var(--border-color)] hover:border-[var(--primary)]/40"
                        }`}
                      >
                        <div className="font-medium text-sm text-[var(--foreground)]">{job.jobTitle}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{job.company}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* What to expect */}
                <div className="mb-6 p-4 bg-[var(--card-border-bg)] rounded-xl space-y-2">
                  <p className="text-xs font-semibold text-[var(--foreground)] mb-2">What to expect</p>
                  {[
                    "📹  Camera + microphone required — just like a real interview",
                    "🤖  Alex (AI Interviewer) will ask you 5 tailored questions",
                    "🗣️  Answers are captured by voice — you can also type",
                    "📊  Detailed AI feedback and score after the session",
                  ].map((t, i) => (
                    <p key={i} className="text-xs text-[var(--text-secondary)]">{t}</p>
                  ))}
                </div>

                {/* Permission blocked panel */}
                {permissionBlocked ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-red-500">Camera & microphone access blocked</p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          Your browser has blocked access. Follow the steps below to re-enable it.
                        </p>
                      </div>
                    </div>

                    {/* Browser instructions */}
                    <div className="bg-[var(--card-border-bg)] rounded-lg px-3 py-2.5 space-y-1.5 text-xs text-[var(--text-secondary)]">
                      <p className="font-semibold text-[var(--foreground)] mb-1">How to allow access:</p>
                      <p>🔒 <strong>Chrome / Edge:</strong> Click the lock icon in the address bar → Site settings → Allow Camera & Microphone</p>
                      <p>🦊 <strong>Firefox:</strong> Click the camera icon in the address bar → Remove the block → Reload</p>
                      <p>🧭 <strong>Safari:</strong> Safari menu → Settings for This Website → Allow Camera & Microphone</p>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={requestPermissions}
                        className="flex-1 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white font-semibold rounded-xl text-sm transition-opacity flex items-center justify-center gap-2"
                      >
                        <Camera className="w-4 h-4" /> Try Again
                      </button>
                      <button
                        onClick={skipToTextOnly}
                        className="flex-1 py-2.5 border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--card-border-bg)] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MicOff className="w-4 h-4" /> Continue Without Camera
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={requestPermissions}
                      disabled={!selectedJob}
                      className="w-full py-3 px-6 bg-[var(--primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-opacity flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" /> Set Up Camera & Mic
                    </button>
                    {permissionError && permissionError !== "blocked" && (
                      <p className="mt-3 text-xs text-red-500 flex items-center gap-1.5">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" /> {permissionError}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── CAMERA CHECK ── */}
            {phase === "camera_check" && (
              <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--border-color)] p-6 shadow-sm">
                <h2 className="text-base font-semibold text-[var(--foreground)] mb-1">Check your setup</h2>
                <p className="text-sm text-[var(--text-secondary)] mb-5">Make sure you look good and your mic is working.</p>

                {/* Camera preview */}
                <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden mb-5 border border-[var(--border-color)]">
                  {streamRef.current ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                        style={{ transform: "scaleX(-1)" }}
                      />
                      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 rounded-lg px-3 py-1.5">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-white font-medium">Camera active</span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--text-secondary)]">
                      <CameraOff className="w-8 h-8 opacity-40" />
                      <p className="text-xs opacity-60">No camera — text-only mode</p>
                    </div>
                  )}
                </div>

                {/* Mic level */}
                <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-[var(--card-border-bg)] rounded-xl border border-[var(--border-color)]">
                  <Mic className="w-4 h-4 text-[var(--primary)] flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-[var(--foreground)] mb-1">
                      {streamRef.current ? "Microphone — speak to test" : "No microphone detected"}
                    </p>
                    {streamRef.current ? (
                      <div className="h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--primary)] rounded-full transition-all duration-75"
                          style={{ width: `${Math.min(100, (audioLevel / 80) * 100)}%` }}
                        />
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-secondary)] opacity-70">Voice answers unavailable — please grant microphone access for the best experience</p>
                    )}
                  </div>
                  {streamRef.current && <AudioBars level={audioLevel} />}
                </div>

                {/* Job info */}
                <div className="mb-6 px-4 py-3 bg-[var(--primary)]/10 border border-[var(--primary)]/20 rounded-xl">
                  <p className="text-xs text-[var(--primary)] font-semibold">{selectedJob?.jobTitle} · {selectedJob?.company}</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Alex will interview you for this role — 5 questions, ~10 minutes</p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => { stopAllMedia(); setPhase("setup"); }}
                    className="px-4 py-2.5 border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--card-border-bg)] transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={startInterview}
                    className="flex-1 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white font-semibold rounded-xl text-sm transition-opacity flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Start Interview
                  </button>
                </div>
              </div>
            )}

            {/* ── ANALYZING ── */}
            {phase === "analyzing" && (
              <div className="bg-[var(--sidebar-bg)] rounded-2xl border border-[var(--border-color)] p-12 shadow-sm text-center">
                <BarChart3 className="w-10 h-10 animate-pulse text-[var(--primary)] mx-auto mb-4" />
                <p className="font-semibold text-[var(--foreground)] text-lg">Analysing your performance…</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">Alex is reviewing your answers and preparing detailed feedback</p>
              </div>
            )}

            {/* ── RESULTS ── */}
            {phase === "results" && (
              <div className="space-y-5">
                {error && !analysis && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-500">
                    <AlertCircle className="w-4 h-4 inline mr-2" />{error}
                  </div>
                )}

                {analysis && (
                  <>
                    {/* Score card */}
                    <div className={`rounded-2xl border p-6 ${scoreBg(analysis.overall_score)}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1">Overall Performance</div>
                          <div className={`text-5xl font-black ${scoreColor(analysis.overall_score)}`}>
                            {analysis.overall_score}<span className="text-2xl">/100</span>
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
                      <p className="mt-3 text-sm text-[var(--text-secondary)] border-t border-[var(--border-color)] pt-3">{analysis.headline}</p>
                    </div>

                    {/* Strengths + Improvements */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[var(--sidebar-bg)] rounded-xl border border-[var(--border-color)] p-4">
                        <h3 className="font-semibold text-sm text-emerald-500 flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4" /> Strengths
                        </h3>
                        <ul className="space-y-2">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5">
                              <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-[var(--sidebar-bg)] rounded-xl border border-[var(--border-color)] p-4">
                        <h3 className="font-semibold text-sm text-amber-500 flex items-center gap-2 mb-3">
                          <Target className="w-4 h-4" /> To Improve
                        </h3>
                        <ul className="space-y-2">
                          {analysis.improvements.map((s, i) => (
                            <li key={i} className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5">
                              <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Power phrases */}
                    {analysis.power_phrases?.length > 0 && (
                      <div className="bg-[var(--sidebar-bg)] rounded-xl border border-[var(--border-color)] p-4">
                        <h3 className="font-semibold text-sm text-[var(--primary)] flex items-center gap-2 mb-3">
                          <Lightbulb className="w-4 h-4" /> Power Phrases to Use More
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {analysis.power_phrases.map((p, i) => (
                            <span key={i} className="text-xs px-3 py-1.5 bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[var(--primary)] rounded-full">"{p}"</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Per-question breakdown */}
                    <div className="bg-[var(--sidebar-bg)] rounded-xl border border-[var(--border-color)] p-4">
                      <h3 className="font-semibold text-sm text-[var(--foreground)] mb-4">Question-by-Question Breakdown</h3>
                      <div className="space-y-3">
                        {analysis.per_question.map((q, i) => (
                          <div key={i} className={`rounded-xl border p-4 ${scoreBg(q.score * 10)}`}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <p className="text-sm font-medium text-[var(--foreground)] flex-1">{q.question}</p>
                              <span className={`text-sm font-black flex-shrink-0 ${scoreColor(q.score * 10)}`}>{q.score}/10</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 mt-2 text-xs">
                              {q.what_went_well && (
                                <div className="flex items-start gap-1.5 text-emerald-500">
                                  <CheckCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /><span>{q.what_went_well}</span>
                                </div>
                              )}
                              {q.what_to_improve && (
                                <div className="flex items-start gap-1.5 text-amber-500">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" /><span>{q.what_to_improve}</span>
                                </div>
                              )}
                              {q.better_answer_hint && (
                                <div className="flex items-start gap-1.5 text-[var(--primary)] mt-1 bg-[var(--primary)]/10 rounded-lg px-2 py-1.5">
                                  <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" /><span>{q.better_answer_hint}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Next steps */}
                    {analysis.next_steps?.length > 0 && (
                      <div className="bg-[var(--sidebar-bg)] rounded-xl border border-[var(--border-color)] p-4">
                        <h3 className="font-semibold text-sm text-[var(--foreground)] mb-3">🎯 Action Plan Before Your Next Interview</h3>
                        <ol className="space-y-2">
                          {analysis.next_steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] text-xs font-bold flex items-center justify-center">{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={restart}
                    className="flex-1 py-3 border border-[var(--border-color)] rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--card-border-bg)] transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" /> Try Another Job
                  </button>
                  <button
                    onClick={() => {
                      stopAllMedia();
                      setConversation([]);
                      setTranscript("");
                      setCurrentMessage("");
                      setAnalysis(null);
                      setError("");
                      setElapsed(0);
                      setQuestionNum(0);
                      setIsFinalMessage(false);
                      requestPermissions();
                    }}
                    className="flex-1 py-3 bg-[var(--primary)] hover:opacity-90 text-white font-semibold rounded-xl text-sm transition-opacity flex items-center justify-center gap-2"
                  >
                    <Mic className="w-4 h-4" /> Redo This Interview
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
