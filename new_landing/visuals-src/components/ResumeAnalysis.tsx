import { demoTimeout as setTimeout, demoInterval as setInterval } from '../runtime';
'use client';

import { useState, useEffect } from '../runtime';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from '../motion';
import { X, Check, TrendingUp } from 'lucide-react';

export default function ResumeAnalysis() {
  const [phase, setPhase] = useState(0);
  const count = useMotionValue(42);
  const rounded = useTransform(count, Math.round);
  const pathLength = useTransform(count, [0, 100], [0, 1]);

  useEffect(() => {
    let isSubscribed = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (duration: number) => new Promise<void>(resolve => {
      const timer = setTimeout(() => { timers.delete(timer); resolve(); }, duration);
      timers.add(timer);
    });
    let currentAnimation: ReturnType<typeof animate> | undefined;
    const tween = (target: number, options: any) => {
      currentAnimation = animate(count, target, { ...options, duration: options.duration / 1.6 });
      return currentAnimation;
    };

    const runSequence = async () => {
      while (isSubscribed) {
        // Phase 0: Baseline Scan
        setPhase(0);
        count.set(0);
        await tween(42, { duration: 1, ease: "easeOut" });
        if (!isSubscribed) break;
        await wait(1500);
        
        if (!isSubscribed) break;

        // Phase 1: Identifying Gaps
        setPhase(1);
        if (!isSubscribed) break;
        await wait(2000);
        
        if (!isSubscribed) break;

        // Phase 2: Optimizing & Adding Keywords
        setPhase(2);
        await tween(75, { duration: 1.5, ease: "easeInOut" });
        if (!isSubscribed) break;
        await wait(1500);

        if (!isSubscribed) break;

        // Phase 3: Match improved
        setPhase(3);
        await tween(98, { duration: 1.5, ease: "easeOut" });
        if (!isSubscribed) break;
        await wait(4000);
      }
    };

    runSequence();
    return () => { isSubscribed = false; currentAnimation?.stop(); timers.forEach(clearTimeout); };
  }, [count]);

  return (<div className="radar-scene"><div className="relative w-[320px] h-[320px] flex items-center justify-center shrink-0">
              {/* Radar Sweep Background */}
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-violet-500/20"
                style={{ background: 'conic-gradient(from 0deg, transparent 70%, rgba(139,92,246,0.05) 100%)' }}
              />

              {/* Inner animated dashed rings */}
              <motion.div 
                animate={{ rotate: -360 }} 
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-4 rounded-full border-[2px] border-dashed transition-colors duration-500 ${
                  phase === 0 ? 'border-red-500/40' : 
                  phase === 1 ? 'border-amber-500/40' : 
                  phase === 2 ? 'border-violet-500/40' : 
                  'border-violet-500/40'
                }`}
              />
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className={`absolute inset-8 rounded-full border transition-colors duration-500 ${
                  phase === 0 ? 'border-red-200' : 
                  phase === 1 ? 'border-amber-200' : 
                  phase === 2 ? 'border-violet-200' : 
                  'border-violet-200'
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
                    phase === 2 ? '#8b5cf6' : 
                    '#8b5cf6'
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
                    phase === 2 ? 'text-violet-500' : 
                    'text-violet-500'
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
                        <motion.div key="p2" initial={{ opacity:0, y: 5 }} animate={{ opacity:1, y: 0 }} exit={{ opacity:0, y:-5 }} className="text-[10px] font-bold uppercase tracking-widest text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full">Optimizing...</motion.div>
                      )}
                      {phase === 3 && (
                        <motion.div key="p3" initial={{ opacity:0, y: 5 }} animate={{ opacity:1, y: 0 }} exit={{ opacity:0, y:-5 }} className="text-[10px] font-bold uppercase tracking-widest text-violet-500 bg-violet-50 px-2 py-0.5 rounded-full flex items-center gap-1"><TrendingUp className="w-3 h-3"/> Match improved</motion.div>
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
                    <motion.div key="add1" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring" }} className="absolute -top-2 -right-4 bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> React.js
                    </motion.div>
                    <motion.div key="add2" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.1 }} className="absolute bottom-6 -left-8 bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> System Design
                    </motion.div>
                    <motion.div key="add3" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.2 }} className="absolute top-1/2 -right-16 bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Leadership
                    </motion.div>
                    
                    {/* Extra Keywords for Optimization Phase */}
                    <motion.div key="add4" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.3 }} className="absolute top-10 -left-12 bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> TypeScript
                    </motion.div>
                    <motion.div key="add5" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.4 }} className="absolute -bottom-6 right-8 bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Next.js
                    </motion.div>
                    <motion.div key="add6" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} transition={{ type: "spring", delay: 0.5 }} className="absolute -top-10 left-1/2 -translate-x-1/2 bg-violet-50 text-violet-600 border border-violet-100 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-sm z-20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Tailwind
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div></div>);
}
