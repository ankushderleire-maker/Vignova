'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { MousePointer2, CheckCircle2, Sparkles, User, MapPin, Link2 } from 'lucide-react';

const container: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
  exit:   { opacity: 0, transition: { duration: 0.2 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 110, damping: 16 } },
};

// Simulated typing for the URL field
function TypedUrl() {
  const full = 'linkedin.com/in/ankush-derle';
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= full.length) return;
    const t = setTimeout(() => setShown(s => s + 1), 45);
    return () => clearTimeout(t);
  }, [shown]);
  return (
    <span className="text-gray-700 font-mono text-xs">
      {full.slice(0, shown)}
      <span className="border-r-2 border-blue-500 ml-px animate-[blink_0.8s_step-end_infinite]" />
    </span>
  );
}

export default function LinkedInFlow() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step === 0) {
      const t = setTimeout(() => setStep(1), 2400);
      return () => clearTimeout(t);
    }
  }, [step]);

  return (
    <AnimatePresence mode="wait">

      {/* ── Step 0: Setup ─────────────────────────────────────────────── */}
      {step === 0 && (
        <motion.div
          key="li0"
          variants={container} initial="hidden" animate="show" exit="exit"
          className="absolute inset-0 z-20 p-8 flex flex-col justify-center bg-gray-50/50 overflow-hidden"
        >
          <div className="w-full max-w-5xl mx-auto flex gap-6">

            {/* Left: Choose master profile */}
            <motion.div variants={item} className="flex-1 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wider">
                1. Choose Master Profile
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                We will compare your LinkedIn against this profile.
              </p>
              <div className="space-y-3">
                {/* Selected profile */}
                <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50/30 cursor-pointer">
                  <div className="flex gap-3 items-center">
                    <div className="w-4 h-4 rounded-full border-[5px] border-blue-500 bg-white shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Ankush Derle</p>
                      <p className="text-xs text-gray-500">AI Engineer · Updated 2d ago</p>
                    </div>
                  </div>
                </div>
                {/* Inactive */}
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 opacity-50">
                  <div className="flex gap-3 items-center">
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-gray-700">Backend Profile</p>
                      <p className="text-xs text-gray-400">Node.js · Updated 1w ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: Connect LinkedIn */}
            <motion.div variants={item} className="flex-1 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
              <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wider">
                2. Connect LinkedIn
              </h3>
              <p className="text-xs text-gray-500 mb-5">
                Enter your profile URL to begin securely syncing data.
              </p>

              {/* URL input with typing animation */}
              <div className="mb-2">
                <p className="text-xs font-bold text-gray-700 mb-1.5">LinkedIn Profile URL</p>
                <div className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 flex items-center">
                  <TypedUrl />
                </div>
              </div>

              <div className="mt-auto pt-4 relative">
                {/* Connect button — slightly faded (cursor hasn't clicked yet) */}
                <div className="w-full h-12 rounded-xl bg-[#0A66C2] text-white flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-blue-500/20">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  Connect &amp; Analyze
                </div>

                {/* Animated cursor moving onto button */}
                <motion.div
                  initial={{ opacity: 0, x: -60, y: 60 }}
                  animate={{ opacity: 1, x: 160, y: 14 }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.9 }}
                  className="absolute top-0 left-0 z-50 pointer-events-none"
                >
                  <MousePointer2 className="w-6 h-6 text-black fill-white -rotate-12 drop-shadow-xl" />
                  {/* Click ripple */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 2.5, 0], opacity: [0, 0.5, 0] }}
                    transition={{ delay: 1.8, duration: 0.25 }}
                    className="absolute -top-1 -left-1 w-8 h-8 bg-white/50 rounded-full blur-sm"
                  />
                </motion.div>
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}

      {/* ── Step 1: Results ───────────────────────────────────────────── */}
      {step === 1 && (
        <motion.div
          key="li1"
          variants={container} initial="hidden" animate="show" exit="exit"
          className="absolute inset-0 z-30 flex bg-gray-50/50 overflow-hidden"
        >
          {/* Left: LinkedIn profile mock */}
          <motion.div variants={item} className="flex-1 flex flex-col gap-0 overflow-hidden p-5 pr-2.5">

            {/* Current / Optimized toggle */}
            <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl mb-3 shadow-sm shrink-0">
              <div className="flex-1 text-center py-1.5 text-xs font-semibold text-gray-500 cursor-pointer">Current Profile</div>
              <div className="flex-1 text-center py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                <Sparkles className="w-3 h-3" /> Optimized Profile
              </div>
            </div>

            {/* LinkedIn card mock */}
            <motion.div variants={item} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex-1">
              {/* Cover */}
              <div className="h-[88px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                {/* Avatar */}
                <div className="absolute -bottom-7 left-4 w-14 h-14 rounded-full border-4 border-white bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg">
                  <User className="w-7 h-7 text-white" />
                </div>
                {/* Open to work badge */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 200 }}
                  className="absolute -bottom-5 left-[46px] w-[52px] h-[52px] rounded-full border-4 border-white bg-emerald-500 flex items-center justify-center text-white font-extrabold text-[6px] text-center leading-tight"
                >
                  #OPEN<br/>TO<br/>WORK
                </motion.div>
              </div>

              <div className="pt-10 px-4 pb-4">
                {/* Name + headline */}
                <div className="flex items-start justify-between mb-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-bold text-gray-900">Ankush Derle</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 fill-blue-100 shrink-0" />
                    </div>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-[10px] text-gray-700 leading-snug max-w-[320px]"
                    >
                      Generative AI &amp; Machine Learning Engineer | LLM &amp; MLOps Specialist | Python, FastAPI, Docker | Driving AI Innovation &amp; Automation
                    </motion.p>
                  </div>
                  <div className="shrink-0 text-right ml-2">
                    <p className="text-[8px] font-bold text-gray-500">National</p>
                    <p className="text-[8px] text-gray-400">College of…</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <MapPin className="w-3 h-3 shrink-0" /> Dublin, Ireland
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold cursor-pointer">
                    <Link2 className="w-3 h-3" /> Contact info
                  </div>
                </div>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-[10px] font-bold text-blue-600 mt-1"
                >
                  500+ connections
                </motion.p>

                {/* Action buttons */}
                <div className="flex gap-2 mt-3">
                  {['Open to', 'Add section', 'Enhance'].map((label, i) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.1 }}
                      className={`px-3 py-1 rounded-full text-[10px] font-semibold border cursor-pointer ${i === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                    >
                      {label}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Score + results */}
          <motion.div variants={item} className="w-[310px] shrink-0 flex flex-col gap-3 p-5 pl-2.5 overflow-y-auto [&::-webkit-scrollbar]:hidden">

            {/* Score card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col items-center">
              {/* SVG circle */}
              <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="#F3F4F6" strokeWidth="8" fill="none" />
                  <motion.circle
                    cx="48" cy="48" r="40"
                    stroke="#10B981" strokeWidth="8" fill="none"
                    strokeDasharray="251" strokeLinecap="round"
                    initial={{ strokeDashoffset: 251 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
                  />
                </svg>
                <motion.span
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, type: 'spring', stiffness: 180 }}
                  className="text-3xl font-extrabold text-gray-900"
                >
                  100
                </motion.span>
              </div>
              <p className="text-sm font-bold text-gray-900">Profile Strength</p>
              <p className="text-[10px] text-gray-500 mb-3">Predicted Post-Optimization Score</p>

              {/* Optimize button */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0 }}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Optimize with AI
              </motion.div>
            </div>

            {/* Optimization complete badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-800">Optimization Complete</p>
              </div>

              {[
                { label: 'KEYWORDS MATCHED',    desc: 'High-impact keywords from your Master Resume integrated into Headline and Skills.' },
                { label: 'ACTION VERBS ADDED',  desc: 'Experience rewrote with strong action verbs to highlight measurable impact.' },
                { label: 'READABILITY IMPROVED', desc: 'About section restructured for optimal readability and professional storytelling.' },
              ].map((item_, i) => (
                <motion.div
                  key={item_.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 + i * 0.12 }}
                  className="flex gap-2 mb-2 last:mb-0"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-bold text-emerald-700 tracking-wider">{item_.label}</p>
                    <p className="text-[9px] text-emerald-600/80 leading-snug">{item_.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>

          </motion.div>
        </motion.div>
      )}

    </AnimatePresence>
  );
}
