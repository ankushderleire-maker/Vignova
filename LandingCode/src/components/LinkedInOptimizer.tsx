'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2, CheckCircle2, Sparkles, User,
  MapPin, TrendingUp, BarChart3,
} from 'lucide-react';

/* ─── Typing hook ─────────────────────────────────────────────────── */
function useTyping(text: string, active: boolean, delay = 0) {
  const [shown, setShown] = useState(0);
  const [wasActive, setWasActive] = useState(active);

  // Reset while rendering rather than from inside the effect — a synchronous
  // setState in an effect triggers a second render pass.
  if (wasActive !== active) {
    setWasActive(active);
    setShown(0);
  }

  useEffect(() => {
    if (!active) return;
    const start = setTimeout(() => {
      const t = setInterval(() => {
        setShown(s => {
          if (s >= text.length) { clearInterval(t); return s; }
          return s + 1;
        });
      }, 42);
      return () => clearInterval(t);
    }, delay);
    return () => clearTimeout(start);
  }, [active, text, delay]);
  return text.slice(0, shown);
}

/* ─── Score ring ──────────────────────────────────────────────────── */
function ScoreRing({ score, color, size = 96 }: { score: number; color: string; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#F3F4F6" strokeWidth={8} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={8} fill="none"
          strokeDasharray={circ} strokeLinecap="round"
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <motion.span
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
        className="font-extrabold text-gray-900"
        style={{ fontSize: size * 0.25 }}
      >
        {score}
      </motion.span>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────── */
type Phase = 'setup' | 'analyzing' | 'current' | 'optimized';

export default function LinkedInOptimizer() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 300, opacity: 0 });
  const [isClicking, setIsClicking] = useState(false);

  const urlTyped = useTyping('linkedin.com/in/captain-jack-sparrow', phase === 'setup', 600);

  const click = async () => {
    setIsClicking(true);
    await new Promise(r => setTimeout(r, 180));
    setIsClicking(false);
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      while (alive) {
        /* ── Setup ── */
        setPhase('setup');
        setCursorPos({ x: 50, y: 340, opacity: 0 });
        await new Promise(r => setTimeout(r, 900));
        if (!alive) break;

        // Cursor appears and glides onto Connect button
        setCursorPos({ x: 50, y: 340, opacity: 1 });
        await new Promise(r => setTimeout(r, 1400));
        if (!alive) break;
        setCursorPos({ x: 220, y: 360, opacity: 1 });
        await new Promise(r => setTimeout(r, 700));
        if (!alive) break;
        await click();

        /* ── Analyzing ── */
        setPhase('analyzing');
        setCursorPos(p => ({ ...p, opacity: 0 }));
        await new Promise(r => setTimeout(r, 2200));
        if (!alive) break;

        /* ── Current profile ── */
        setPhase('current');
        await new Promise(r => setTimeout(r, 2800));
        if (!alive) break;

        // Cursor clicks Optimize with AI
        setCursorPos({ x: 280, y: 280, opacity: 1 });
        await new Promise(r => setTimeout(r, 700));
        if (!alive) break;
        await click();

        /* ── Optimized profile ── */
        setPhase('optimized');
        setCursorPos(p => ({ ...p, opacity: 0 }));
        await new Promise(r => setTimeout(r, 4500));
        if (!alive) break;

        setCursorPos(p => ({ ...p, opacity: 0 }));
        await new Promise(r => setTimeout(r, 600));
      }
    };
    run();
    return () => { alive = false; };
  }, []);

  return (
    <section className="relative py-24 bg-white overflow-hidden border-t border-gray-100">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-blue-500/15 to-transparent blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-indigo-500/10 to-transparent blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          {/* ── Left: Text ── */}
          <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[#0A66C2] text-xs font-bold uppercase tracking-widest mb-6">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn Optimizer
              </div>

              <h2 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tighter text-[#0A192F] mb-6 leading-tight">
                From invisible<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A66C2] to-indigo-600">
                  to recruiters&apos; top pick.
                </span>
              </h2>

              <p className="text-xl text-slate-500 font-light leading-relaxed mb-8">
                Connect your LinkedIn profile, let our AI analyze every section against your Master Resume, and get an optimized version that ranks higher in recruiter searches.
              </p>

              <div className="space-y-5">
                {[
                  {
                    icon: <BarChart3 className="w-4 h-4 text-[#0A66C2]" />,
                    bg: 'bg-blue-50',
                    title: 'Deep Profile Scoring',
                    desc: 'Completeness, keywords, readability, impact and headline scored across 6 dimensions.',
                  },
                  {
                    icon: <Sparkles className="w-4 h-4 text-indigo-500" />,
                    bg: 'bg-indigo-50',
                    title: 'AI-Powered Rewrite',
                    desc: 'Headline, About, and Experience sections rewritten with high-impact keywords from your Master Resume.',
                  },
                  {
                    icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
                    bg: 'bg-emerald-50',
                    title: 'Predicted Score: 100',
                    desc: 'See exactly what your profile will score after applying AI optimizations — before you even publish.',
                  },
                ].map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-lg ${f.bg} flex items-center justify-center shrink-0`}>
                      {f.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0A192F] mb-0.5">{f.title}</p>
                      <p className="text-sm text-slate-500">{f.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Right: Animated mockup ── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            className="w-full lg:w-1/2 flex justify-center relative"
          >
            {/* Scaling wrapper */}
            <div className="transform scale-[0.75] min-[380px]:scale-[0.85] sm:scale-100 origin-top h-[390px] min-[380px]:h-[442px] sm:h-[520px] flex justify-center w-full">

              {/* Browser frame */}
              <div className="relative w-[400px] h-[520px] bg-white rounded-xl shadow-[0_0_50px_-12px_rgba(10,102,194,0.3)] flex flex-col overflow-hidden border border-slate-200 shrink-0">

                {/* Browser chrome */}
                <div className="h-11 bg-white border-b border-slate-200 flex items-center px-3 gap-2 shrink-0 shadow-sm">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex-1 h-6 bg-slate-100 rounded-md flex items-center px-2 gap-1.5 border border-slate-200">
                    <svg className="w-3 h-3 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    <span className="text-[9px] text-slate-400 font-medium">app.vignova.io/linkedin-optimizer</span>
                  </div>
                </div>

                {/* Content area */}
                <div className="flex-1 relative overflow-hidden bg-gray-50">
                  <AnimatePresence mode="wait">

                    {/* ── Setup phase ── */}
                    {phase === 'setup' && (
                      <motion.div
                        key="setup"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 p-5 flex flex-col gap-3 overflow-hidden"
                      >
                        {/* Vignova app mini header */}
                        <div className="flex items-center gap-2 pb-3 border-b border-gray-200 shrink-0">
                          <div className="w-7 h-7 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center">
                            <svg className="w-4 h-4 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                          </div>
                          <span className="text-xs font-bold text-gray-800">LinkedIn Optimizer</span>
                        </div>

                        {/* Step 1 — Master Profile */}
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm shrink-0"
                        >
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">1. Choose Master Profile</p>
                          <div className="flex items-center gap-2.5 p-2.5 rounded-lg border-2 border-[#0A66C2] bg-blue-50/40">
                            <div className="w-3.5 h-3.5 rounded-full border-[4px] border-[#0A66C2] bg-white shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-gray-900">Captain Jack Sparrow</p>
                              <p className="text-[9px] text-gray-500">Pirate Lord · Updated 2d ago</p>
                            </div>
                          </div>
                        </motion.div>

                        {/* Step 2 — Connect LinkedIn */}
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm flex-1"
                        >
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">2. Connect LinkedIn</p>
                          <p className="text-[9px] font-semibold text-gray-600 mb-1.5">LinkedIn Profile URL</p>
                          <div className="h-8 rounded-lg border border-gray-200 bg-gray-50 px-2.5 flex items-center mb-3">
                            <span className="text-[10px] font-mono text-gray-700">
                              {urlTyped}
                              {urlTyped.length < 'linkedin.com/in/captain-jack-sparrow'.length && (
                                <span className="border-r-2 border-[#0A66C2] ml-px animate-[blink_0.8s_step-end_infinite]" />
                              )}
                            </span>
                          </div>

                          {/* Connect button */}
                          <div className="relative">
                            <div
                              className={`h-9 rounded-xl flex items-center justify-center gap-2 font-bold text-xs text-white transition-transform shadow-md shadow-blue-500/20 ${isClicking ? 'scale-95 brightness-90' : 'scale-100'}`}
                              style={{ background: 'linear-gradient(135deg, #0A66C2, #1d4ed8)' }}
                            >
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                              </svg>
                              Connect &amp; Analyze
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}

                    {/* ── Analyzing phase ── */}
                    {phase === 'analyzing' && (
                      <motion.div
                        key="analyzing"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-white"
                      >
                        {/* Pulsing LinkedIn logo */}
                        <div className="relative">
                          <motion.div
                            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
                            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                            className="absolute inset-0 m-[-12px] rounded-full bg-[#0A66C2]/20 blur-lg"
                          />
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="w-16 h-16 rounded-full border-4 border-[#0A66C2]/20 border-t-[#0A66C2]"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-7 h-7 text-[#0A66C2]" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                            </svg>
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-gray-900 mb-1">Analyzing Profile…</p>
                          <p className="text-xs text-gray-400">Scanning 6 dimensions · Matching keywords</p>
                        </div>
                        {/* Animated scan bars */}
                        <div className="w-48 space-y-2">
                          {['Headlines', 'Skills', 'Experience', 'Keywords'].map((label, i) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="text-[9px] text-gray-400 w-16 text-right shrink-0">{label}</span>
                              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full bg-[#0A66C2] rounded-full"
                                  initial={{ width: '0%' }}
                                  animate={{ width: ['0%', '100%', '0%'] }}
                                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* ── Current profile phase ── */}
                    {phase === 'current' && (
                      <motion.div
                        key="current"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex overflow-hidden"
                      >
                        {/* Left: LinkedIn profile card */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                          {/* Toggle */}
                          <div className="flex gap-0.5 p-1.5 bg-white border-b border-gray-200 shrink-0">
                            <div className="flex-1 text-center py-1 bg-gray-100 rounded-md text-[9px] font-bold text-gray-700">Current Profile</div>
                            <div className="flex-1 text-center py-1 text-[9px] font-medium text-gray-400">Optimized</div>
                          </div>

                          {/* Profile scroll area */}
                          <div className="flex-1 overflow-hidden">
                            {/* Cover */}
                            <div className="h-[60px] bg-gradient-to-r from-slate-600 to-slate-700 relative">
                              <div className="absolute -bottom-5 left-3 w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <div className="pt-7 px-3 pb-2">
                              <p className="text-xs font-bold text-gray-900">Captain Jack Sparrow</p>
                              <p className="text-[9px] text-gray-500 mt-0.5 leading-tight">Looking for opportunities…</p>
                              <div className="flex items-center gap-1 mt-1 text-[9px] text-gray-400">
                                <MapPin className="w-2.5 h-2.5" /> Tortuga, Caribbean
                              </div>
                            </div>
                            {/* Fake sections */}
                            <div className="px-3 space-y-1.5">
                              {['About', 'Experience', 'Skills'].map(s => (
                                <div key={s} className="border border-dashed border-gray-200 rounded p-1.5">
                                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">{s}</p>
                                  <div className="h-1.5 bg-gray-100 rounded mt-1 w-4/5" />
                                  <div className="h-1.5 bg-gray-100 rounded mt-1 w-3/5" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: Score panel */}
                        <div className="w-[140px] shrink-0 border-l border-gray-200 bg-white flex flex-col p-3 gap-2 overflow-hidden">
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Profile Score</p>
                          <div className="flex justify-center">
                            <ScoreRing score={58} color="#F59E0B" size={80} />
                          </div>
                          <p className="text-[8px] text-center font-bold text-amber-500">Needs Work</p>

                          {/* Score bars */}
                          <div className="space-y-1 mt-1">
                            {[
                              { label: 'Keywords', pct: 42, c: '#EF4444' },
                              { label: 'Headline',  pct: 55, c: '#F59E0B' },
                              { label: 'Impact',    pct: 60, c: '#F59E0B' },
                            ].map(b => (
                              <div key={b.label}>
                                <div className="flex justify-between text-[8px] text-gray-500 mb-0.5">
                                  <span>{b.label}</span><span style={{ color: b.c }}>{b.pct}%</span>
                                </div>
                                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{ background: b.c }}
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${b.pct}%` }}
                                    transition={{ duration: 0.9, ease: 'easeOut', delay: 0.5 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Optimize button */}
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2 }}
                            className={`mt-1 h-8 rounded-lg flex items-center justify-center gap-1 text-[9px] font-bold text-white cursor-pointer transition-transform ${isClicking ? 'scale-95' : 'scale-100'}`}
                            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}
                          >
                            <Sparkles className="w-2.5 h-2.5" /> Optimize with AI
                          </motion.div>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Optimized profile phase ── */}
                    {phase === 'optimized' && (
                      <motion.div
                        key="optimized"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 flex overflow-hidden"
                      >
                        {/* Left: optimized LinkedIn profile */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                          {/* Toggle — Optimized active */}
                          <div className="flex gap-0.5 p-1.5 bg-white border-b border-gray-200 shrink-0">
                            <div className="flex-1 text-center py-1 text-[9px] font-medium text-gray-400">Current</div>
                            <div className="flex-1 text-center py-1 bg-indigo-50 border border-indigo-200 rounded-md text-[9px] font-bold text-indigo-700 flex items-center justify-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Optimized
                            </div>
                          </div>

                          {/* Optimized profile */}
                          <div className="flex-1 overflow-hidden">
                            {/* Cover — richer gradient */}
                            <div className="h-[60px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                              {/* Open to work */}
                              <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                                className="absolute -bottom-4 left-[30px] w-8 h-8 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center text-white font-extrabold text-[5px] text-center leading-tight"
                              >
                                OPEN TO WORK
                              </motion.div>
                              <div className="absolute -bottom-5 left-3 w-10 h-10 rounded-full border-2 border-white bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <div className="pt-7 px-3 pb-2">
                              <div className="flex items-center gap-1 mb-0.5">
                                <p className="text-xs font-bold text-gray-900">Captain Jack Sparrow</p>
                                <CheckCircle2 className="w-3 h-3 text-blue-600 fill-blue-100" />
                              </div>
                              <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="text-[9px] text-gray-700 mt-0.5 leading-tight font-medium"
                              >
                                Pirate Lord | Naval Commander | Escapology, Negotiation &amp; Strategic Treasure Acquisition Specialist
                              </motion.p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-gray-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />Tortuga</span>
                                <span className="text-[9px] font-bold text-blue-600">500+ connections</span>
                              </div>
                            </div>

                            {/* Optimized sections — glowing borders */}
                            <div className="px-3 space-y-1.5">
                              {[
                                { label: 'About', note: 'AI rewritten' },
                                { label: 'Experience', note: 'Impact verbs added' },
                                { label: 'Skills', note: '+12 keywords' },
                              ].map((s, i) => (
                                <motion.div
                                  key={s.label}
                                  initial={{ opacity: 0, x: -8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.5 + i * 0.15 }}
                                  className="border border-emerald-200 bg-emerald-50/60 rounded p-1.5 flex items-center justify-between"
                                >
                                  <p className="text-[8px] font-bold text-emerald-800 uppercase tracking-wider">{s.label}</p>
                                  <span className="text-[7px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">{s.note}</span>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Right: Perfect score panel */}
                        <div className="w-[140px] shrink-0 border-l border-gray-200 bg-white flex flex-col p-3 gap-2 overflow-hidden">
                          <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Profile Score</p>
                          <div className="flex justify-center">
                            <ScoreRing score={100} color="#10B981" size={80} />
                          </div>
                          <p className="text-[8px] text-center font-bold text-emerald-500">Perfect Score ✦</p>

                          {/* All green bars */}
                          <div className="space-y-1 mt-1">
                            {[
                              { label: 'Keywords', pct: 100 },
                              { label: 'Headline',  pct: 100 },
                              { label: 'Impact',    pct: 98 },
                            ].map((b, i) => (
                              <div key={b.label}>
                                <div className="flex justify-between text-[8px] text-gray-500 mb-0.5">
                                  <span>{b.label}</span>
                                  <span className="text-emerald-600">{b.pct}%</span>
                                </div>
                                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full bg-emerald-500 rounded-full"
                                    initial={{ width: '0%' }}
                                    animate={{ width: `${b.pct}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 + i * 0.1 }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Optimization complete */}
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.0 }}
                            className="mt-1 bg-emerald-50 border border-emerald-200 rounded-lg p-2"
                          >
                            <div className="flex items-center gap-1 mb-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <p className="text-[8px] font-bold text-emerald-800">Complete</p>
                            </div>
                            {['Keywords', 'Verbs', 'Readability'].map((item, i) => (
                              <motion.div
                                key={item}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 1.2 + i * 0.12 }}
                                className="flex items-center gap-1 mb-1 last:mb-0"
                              >
                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                <span className="text-[8px] text-emerald-700">{item} ✓</span>
                              </motion.div>
                            ))}
                          </motion.div>
                        </div>
                      </motion.div>
                    )}

                  </AnimatePresence>

                  {/* Global cursor */}
                  <motion.div
                    className="absolute z-50 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
                    animate={{
                      x: cursorPos.x,
                      y: cursorPos.y,
                      opacity: cursorPos.opacity,
                      scale: isClicking ? 0.8 : 1,
                    }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                  >
                    <MousePointer2 className="w-5 h-5 text-black fill-black -rotate-12" />
                  </motion.div>
                </div>
              </div>

            </div>

            {/* Glow behind frame */}
            <div className="absolute inset-0 bg-[#0A66C2] blur-[100px] rounded-full opacity-10 translate-x-10 translate-y-10 z-[-1]" />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
