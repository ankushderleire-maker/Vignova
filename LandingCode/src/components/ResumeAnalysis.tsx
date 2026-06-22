'use client';

import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { X, Check, TrendingUp } from 'lucide-react';

export default function ResumeAnalysis() {
  const [phase, setPhase] = useState(0);
  const count = useMotionValue(0);
  const rounded = useTransform(count, Math.round);
  const pathLength = useTransform(count, [0, 100], [0, 1]);

  useEffect(() => {
    let isSubscribed = true;

    const runSequence = async () => {
      while (isSubscribed) {
        // Phase 0: Baseline Scan
        setPhase(0);
        count.set(0);
        await animate(count, 42, { duration: 1, ease: "easeOut" });
        await new Promise(r => setTimeout(r, 1500));
        
        if (!isSubscribed) break;

        // Phase 1: Identifying Gaps
        setPhase(1);
        await new Promise(r => setTimeout(r, 2000));
        
        if (!isSubscribed) break;

        // Phase 2: Optimizing & Adding Keywords
        setPhase(2);
        await animate(count, 75, { duration: 1.5, ease: "easeInOut" });
        await new Promise(r => setTimeout(r, 1500));

        if (!isSubscribed) break;

        // Phase 3: ATS Passed
        setPhase(3);
        await animate(count, 98, { duration: 1.5, ease: "easeOut" });
        await new Promise(r => setTimeout(r, 4000));
      }
    };

    runSequence();
    return () => { isSubscribed = false; };
  }, [count]);

  return (
    <section className="relative py-20 bg-[#F5F8FA] overflow-hidden border-t border-border/50">
      {/* Abstract Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] -left-[20%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-indigo-500/30 to-transparent blur-[100px] animate-orb"></div>
        <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-tl from-blue-500/40 to-transparent blur-[120px] animate-orb-slow"></div>
      </div>
      <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="w-full lg:w-1/2 flex justify-center overflow-hidden sm:overflow-visible"
          >
            {/* Scaling Wrapper */}
            <div className="transform scale-[0.8] min-[380px]:scale-[0.9] sm:scale-100 origin-center h-[260px] min-[380px]:h-[290px] sm:h-[320px] flex justify-center items-center w-full">
              <div className="relative w-[320px] h-[320px] flex items-center justify-center shrink-0">
              {/* Radar Sweep Background */}
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-blue-500/20"
                style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(37,99,235,0.05) 100%)' }}
              />

              {/* Inner animated dashed rings */}
              <motion.div 
                animate={{ rotate: -360 }} 
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-4 rounded-full border-[2px] border-dashed transition-colors duration-500 ${
                  phase === 0 ? 'border-red-500/40' : 
                  phase === 1 ? 'border-amber-500/40' : 
                  phase === 2 ? 'border-blue-500/40' : 
                  'border-emerald-500/40'
                }`}
              />
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-8 rounded-full border transition-colors duration-500 ${
                  phase === 0 ? 'border-red-200' : 
                  phase === 1 ? 'border-amber-200' : 
                  phase === 2 ? 'border-blue-200' : 
                  'border-emerald-200'
                }`}
              />

              {/* Glowing SVG Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_15px_rgba(0,0,0,0.1)]">
                <circle cx="160" cy="160" r="150" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="4" />
                <motion.circle 
                  cx="160" cy="160" r="150" fill="none" 
                  stroke={
                    phase === 0 ? '#EF4444' : 
                    phase === 1 ? '#F59E0B' : 
                    phase === 2 ? '#3B82F6' : 
                    '#10B981'
                  } 
                  strokeWidth="6"
                  strokeLinecap="round"
                  style={{ pathLength }}
                  className="transition-colors duration-500"
                />
              </svg>

              {/* Center Glass Card */}
              <div className="relative w-48 h-48 rounded-full bg-white/90 backdrop-blur-xl border border-white flex items-center justify-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] z-10">
                <div className="text-center">
                  <motion.span className={`text-7xl font-bold tracking-tighter transition-colors duration-500 ${
                    phase === 0 ? 'text-red-500' : 
                    phase === 1 ? 'text-amber-500' : 
                    phase === 2 ? 'text-blue-500' : 
                    'text-emerald-500'
                  }`}>
                    {rounded}
                  </motion.span>
                  <div className="h-6 mt-1 flex justify-center items-center">
                    <AnimatePresence mode="wait">
                      {phase === 0 && (
                        <motion.div key="p0" initial={{ opacity:0, y: 5 }} animate={{ opacity:1, y: 0 }} exit={{ opacity:0, y:-5 }} className="text-[10px] font-bold uppercase tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Baseline</motion.div>
                      )}
                      {phase === 1 && (
                        <motion.div key="p1" initial={{ opacity:0, y: 5 }} animate={{ opacity:1, y: 0 }} exit={{ opacity:0, y:-5 }} className="text-[10px] font-bold uppercase tracking-widest text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">Scanning Gaps...</motion.div>
                      )}
                      {phase === 2 && (
                        <motion.div key="p2" initial={{ opacity:0, y: 5 }} animate={{ opacity:1, y: 0 }} exit={{ opacity:0, y:-5 }} className="text-[10px] font-bold uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Optimizing...</motion.div>
                      )}
                      {phase === 3 && (
                        <motion.div key="p3" initial={{ opacity:0, y: 5 }} animate={{ opacity:1, y: 0 }} exit={{ opacity:0, y:-5 }} className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><TrendingUp className="w-3 h-3"/> ATS Passed</motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Orbiting keyword chips */}
              <AnimatePresence>
                {phase === 1 && (
                  <>
                    <motion.div key="miss1" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring" }} className="absolute -top-2 -right-4 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <X className="w-3 h-3" /> React.js
                    </motion.div>
                    <motion.div key="miss2" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.1 }} className="absolute bottom-6 -left-8 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <X className="w-3 h-3" /> System Design
                    </motion.div>
                    <motion.div key="miss3" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.2 }} className="absolute top-1/2 -right-16 bg-red-50 text-red-600 border border-red-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <X className="w-3 h-3" /> Leadership
                    </motion.div>
                  </>
                )}
                {phase >= 2 && (
                  <>
                    <motion.div key="add1" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring" }} className="absolute -top-2 -right-4 bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> React.js
                    </motion.div>
                    <motion.div key="add2" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.1 }} className="absolute bottom-6 -left-8 bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> System Design
                    </motion.div>
                    <motion.div key="add3" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.2 }} className="absolute top-1/2 -right-16 bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Leadership
                    </motion.div>
                    
                    {/* Extra Keywords for Optimization Phase */}
                    <motion.div key="add4" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.3 }} className="absolute top-10 -left-12 bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> TypeScript
                    </motion.div>
                    <motion.div key="add5" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.4 }} className="absolute -bottom-6 right-8 bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Next.js
                    </motion.div>
                    <motion.div key="add6" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.5 }} className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Tailwind
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            </div>
          </motion.div>

          <div className="w-full lg:w-1/2 space-y-10 text-center lg:text-left z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest mb-6 mx-auto lg:mx-0">
                Parse Engine
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-[#0A192F] mb-6 leading-tight">
                Beat the ATS. <br className="hidden lg:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A192F] to-[#2563EB]">Bypass the filter.</span>
              </h2>
              
              <p className="text-lg md:text-xl text-muted font-light leading-relaxed">
                Enterprise HR software reduces your experience to raw data. Our engine pre-parses your resume precisely how they do, highlighting fatal errors before you hit submit.
              </p>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
