'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, MousePointer2, CheckCircle2, RotateCcw, PenLine, FileText, User } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};
const item = {
  hidden: { opacity: 0, scale: 0.95, y: 15 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function AtsFlow() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let tid: NodeJS.Timeout;
    if (step === 0) {
      tid = setTimeout(() => setStep(1), 2000); // Wait 2s then click and transition
    }
    return () => clearTimeout(tid);
  }, [step]);

  return (
    <AnimatePresence mode="wait">
      {step === 0 && (
        <motion.div key="ats0" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-20 inset-0 p-8 flex flex-col justify-start overflow-y-auto bg-gray-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-full max-w-5xl mx-auto flex gap-6">
            <motion.div variants={item} className="flex-1 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wider">1. Select Job Description</h3>
              <p className="text-xs text-gray-500 mb-4">Choose from your saved jobs in the Job Tracker.</p>
              <div className="space-y-3">
                <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50/30 cursor-pointer">
                  <div className="flex gap-3">
                    <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-[5px] border-blue-500 bg-white"></div></div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Data Analyst - job post</h4>
                      <p className="text-xs font-medium text-gray-600 mb-1.5">Rathchart Limited</p>
                      <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">Rathchart Limited is recruiting for a Data Analyst to work at its registered business premises at 19-22 Dame Street, Dub...</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 opacity-60">
                  <div className="flex gap-3">
                    <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-2 border-gray-300 bg-white"></div></div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Senior Applied AI Engineer</h4>
                      <p className="text-xs font-medium text-gray-600">Clients</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            
            <motion.div variants={item} className="flex-1 bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col">
              <h3 className="text-sm font-bold text-gray-900 mb-1 uppercase tracking-wider">2. Choose Resume</h3>
              <p className="text-xs text-gray-500 mb-4">Select a saved resume or upload a new PDF.</p>
              
              <div className="flex p-1 bg-gray-100 rounded-lg mb-4">
                <div className="flex-1 text-center py-1.5 bg-white shadow-sm rounded-md text-xs font-bold text-blue-600">Saved Resumes</div>
                <div className="flex-1 text-center py-1.5 text-xs font-medium text-gray-600">Upload PDF</div>
              </div>

              <div className="space-y-3 flex-1">
                <div className="p-4 rounded-xl border-2 border-blue-500 bg-blue-50/30 cursor-pointer">
                  <div className="flex gap-3">
                    <div className="mt-0.5"><div className="w-4 h-4 rounded-full border-[5px] border-blue-500 bg-white"></div></div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Resume V2</h4>
                      <p className="text-xs font-medium text-gray-600 mb-1">Data Analyst - job post — Rathchart Limited</p>
                      <p className="text-[10px] text-gray-400">17/4/2026</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 relative">
                <div className="w-full h-12 bg-[#93B1F8] text-white rounded-xl flex items-center justify-center font-bold shadow-lg shadow-blue-500/20 gap-2"><Scan className="w-5 h-5"/> Run ATS Analysis</div>
                <motion.div
                  initial={{ opacity: 0, x: 50, y: 80 }}
                  animate={{ opacity: 1, x: 200, y: 15 }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.8 }}
                  className="absolute top-0 left-0 z-50 pointer-events-none"
                >
                  <MousePointer2 className="w-6 h-6 text-black fill-white -rotate-12 drop-shadow-xl" />
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 2.5, 0], opacity: [0, 0.6, 0] }} transition={{ delay: 1.6, duration: 0.2 }} className="absolute -top-1 -left-1 w-8 h-8 bg-white/40 rounded-full blur-sm" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div key="ats1" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-30 inset-0 p-4 flex flex-col justify-start overflow-y-auto bg-gray-50/50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-full max-w-[1100px] mx-auto">
            {/* Header */}
            <motion.div variants={item} className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600"><Scan className="w-6 h-6"/></div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">ATS Score Analysis</h2>
                  <p className="text-sm font-medium text-gray-500">Deep resume analysis powered by local AI models</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="h-10 px-4 bg-purple-600 text-white rounded-lg text-sm font-bold flex items-center gap-2"><PenLine className="w-4 h-4"/> Refine with AI</button>
                <button className="h-10 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center gap-2"><RotateCcw className="w-4 h-4"/> New Analysis</button>
              </div>
            </motion.div>

            <div className="flex gap-4 h-[350px]">
              {/* Left Sidebar */}
              <motion.div variants={item} className="w-48 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col h-full shrink-0">
                <div className="mb-4 px-1">
                  <motion.h3 initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: "spring" }} className="text-3xl font-extrabold text-emerald-500 tracking-tighter">92.7%</motion.h3>
                  <p className="text-[10px] font-bold text-gray-900 uppercase">ATS SCORE</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-2.5 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold"><span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> Overview</span></div>
                  {['Keywords', 'Sections & Format', 'Improvements', 'Content Quality'].map((t,i) => (
                    <div key={t} className="flex items-center justify-between px-2.5 py-2 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50"><span className="flex items-center gap-2 truncate pr-2"><FileText className="w-4 h-4 shrink-0"/> <span className="truncate">{t}</span></span>{i===2||i===3?<span className="bg-gray-100 px-1.5 py-0.5 rounded-sm text-[9px] font-bold text-gray-500 shrink-0">2</span>:null}</div>
                  ))}
                </div>
              </motion.div>

              {/* Center Main Score */}
              <motion.div variants={item} className="w-56 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex flex-col items-center justify-center shrink-0">
                <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#f3f4f6" strokeWidth="10" fill="none" />
                    <motion.circle 
                      cx="64" cy="64" r="56" stroke="#10b981" strokeWidth="10" fill="none" strokeDasharray="352" strokeLinecap="round"
                      initial={{ strokeDashoffset: 352 }} 
                      animate={{ strokeDashoffset: 26 }} 
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }} 
                    />
                  </svg>
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-4xl font-extrabold text-gray-900">92.7</motion.span>
                </div>
                <h3 className="text-sm font-bold text-gray-900">Overall ATS Score</h3>
                <p className="text-xs font-bold text-emerald-500 mb-4">Excellent</p>
                <div className="w-full pt-3 border-t border-gray-100 text-center">
                  <p className="text-xs font-bold text-blue-600 flex items-center justify-center gap-1.5"><User className="w-3 h-3"/> Entry-Level</p>
                  <p className="text-[9px] text-gray-400 mt-1 truncate">~0 yrs detected • Medium conf.</p>
                </div>
              </motion.div>

              {/* Score Breakdown & Insights */}
              <div className="flex-1 flex gap-4 min-w-0">
                <motion.div variants={item} className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm min-w-0 flex flex-col">
                  <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-4 uppercase">Score Breakdown</h4>
                  <div className="flex-1 flex flex-col justify-between">
                    {[
                      {label: 'Keywords (25%)', score: '80%', w: '80%', c: 'bg-emerald-500', d: 0.6},
                      {label: 'Semantics (20%)', score: '98.6%', w: '98%', c: 'bg-emerald-500', d: 0.7},
                      {label: 'Sections (15%)', score: '100%', w: '100%', c: 'bg-emerald-500', d: 0.8},
                      {label: 'Impact (15%)', score: '91.7%', w: '91%', c: 'bg-emerald-500', d: 0.9},
                      {label: 'Format (15%)', score: '100%', w: '100%', c: 'bg-emerald-500', d: 1.0},
                      {label: 'Readability (10%)', score: '91.8%', w: '91%', c: 'bg-emerald-500', d: 1.1}
                    ].map(bar => (
                      <div key={bar.label}>
                        <div className="flex justify-between text-[11px] font-bold text-gray-700 mb-1.5"><span className="truncate pr-1">{bar.label}</span><span className="text-emerald-600 shrink-0">{bar.score}</span></div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div className={`h-full ${bar.c} rounded-full`} initial={{ width: "0%" }} animate={{ width: bar.w }} transition={{ duration: 1, delay: bar.d, ease: "easeOut" }}></motion.div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div variants={item} className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm min-w-0 flex flex-col">
                   <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-4 uppercase">Resume Insights</h4>
                   <div className="grid grid-cols-2 gap-3 flex-1">
                     <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, type: "spring" }} className="bg-gray-50 border border-gray-100 rounded-xl p-2 flex flex-col items-center justify-center">
                       <span className="text-2xl font-bold text-gray-900 mb-0.5">510</span><span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center leading-tight">Total<br/>Words</span>
                     </motion.div>
                     <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: "spring" }} className="bg-gray-50 border border-gray-100 rounded-xl p-2 flex flex-col items-center justify-center">
                       <span className="text-2xl font-bold text-gray-900 mb-0.5">20</span><span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center leading-tight">Sentences</span>
                     </motion.div>
                     <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.0, type: "spring" }} className="bg-gray-50 border border-gray-100 rounded-xl p-2 flex flex-col items-center justify-center">
                       <span className="text-2xl font-bold text-gray-900 mb-0.5">8</span><span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center leading-tight">Action<br/>Verbs</span>
                     </motion.div>
                     <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.1, type: "spring" }} className="bg-gray-50 border border-gray-100 rounded-xl p-2 flex flex-col items-center justify-center">
                       <span className="text-2xl font-bold text-gray-900 mb-0.5">5</span><span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center leading-tight">Metrics<br/>Found</span>
                     </motion.div>
                   </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
