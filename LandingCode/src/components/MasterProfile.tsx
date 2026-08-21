'use client';

import { motion } from 'framer-motion';
import { User, Zap, Target, FileText, Search, Send, BarChart3, Briefcase } from 'lucide-react';

const features = [
  { icon: User, label: 'Master Profile', desc: 'One profile, infinite resumes', angle: 0, color: 'bg-blue-500', glow: 'shadow-blue-500/30', dotColor: '#3b82f6' },
  { icon: Zap, label: 'One-Click Apply', desc: 'Apply instantly anywhere', angle: 45, color: 'bg-amber-500', glow: 'shadow-amber-500/30', dotColor: '#f59e0b' },
  { icon: Target, label: 'Profile Match', desc: '98% role alignment', angle: 90, color: 'bg-emerald-500', glow: 'shadow-emerald-500/30', dotColor: '#10b981' },
  { icon: Send, label: 'Auto Apply', desc: 'Bulk apply in seconds', angle: 135, color: 'bg-purple-500', glow: 'shadow-purple-500/30', dotColor: '#a855f7' },
  { icon: FileText, label: 'Resume Tailor', desc: 'AI-optimized per role', angle: 180, color: 'bg-rose-500', glow: 'shadow-rose-500/30', dotColor: '#f43f5e' },
  { icon: BarChart3, label: 'ATS Optimize', desc: 'Beat tracking systems', angle: 225, color: 'bg-cyan-500', glow: 'shadow-cyan-500/30', dotColor: '#06b6d4' },
  { icon: Search, label: 'Job Discovery', desc: 'Smart role matching', angle: 270, color: 'bg-indigo-500', glow: 'shadow-indigo-500/30', dotColor: '#6366f1' },
  { icon: Briefcase, label: 'Job Tracker', desc: 'Visual pipeline view', angle: 315, color: 'bg-orange-500', glow: 'shadow-orange-500/30', dotColor: '#f97316' },
];

export default function MasterProfile() {

  return (
    <section className="py-20 bg-[#0A192F] overflow-hidden border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
        
          {/* Left: Text */}
          <div className="w-full lg:w-1/2 space-y-10 text-center lg:text-left z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6 mx-auto lg:mx-0">
                Data Architecture
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-white mb-6 leading-tight">
                One truth source. <br className="hidden lg:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Infinite permutations.</span>
              </h2>
              <p className="text-lg md:text-xl text-slate-400 font-light leading-relaxed">
                Construct a comprehensive structural profile. Our intelligence engine compiles tailored, high-converting resumes for specific roles in milliseconds.
              </p>
            </motion.div>
          </div>

          {/* Right: Orbital Diagram */}
          <div className="w-full lg:w-1/2 flex justify-center overflow-hidden sm:overflow-visible">
            {/* Scaling Wrapper */}
            <div className="transform scale-[0.55] min-[380px]:scale-[0.65] sm:scale-[0.8] lg:scale-100 origin-center h-[300px] min-[380px]:h-[350px] sm:h-[450px] lg:h-[540px] flex justify-center items-center w-full">
              <div className="relative w-[540px] h-[540px] flex items-center justify-center shrink-0">
              
              {/* Orbit ring */}
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute w-[400px] h-[400px] rounded-full border border-dashed border-white/20"
              />
              
              {/* Subtle rotating ring */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                className="absolute w-[400px] h-[400px] rounded-full border border-white/5"
              />

              {/* Center Hub */}
              <motion.div 
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
                className="absolute z-30 w-32 h-32 rounded-[1.75rem] bg-gradient-to-br from-[#112240] to-[#1a3a5c] shadow-2xl shadow-black/40 flex flex-col items-center justify-center text-white gap-1 border border-white/10"
              >
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center mb-1">
                  <User className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="font-bold text-[10px] tracking-[0.15em] uppercase">Master</span>
                <span className="font-bold text-[10px] tracking-[0.15em] uppercase">Profile</span>
              </motion.div>

              {/* Pulsing glow behind center */}
              <motion.div 
                animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute z-20 w-32 h-32 rounded-[1.75rem] bg-blue-500 blur-2xl"
              />

              {/* Feature Nodes */}
              {features.map((feat, i) => {
                const nodeRadius = 195;
                const rad = (feat.angle * Math.PI) / 180;
                const x = Math.cos(rad) * nodeRadius;
                const y = Math.sin(rad) * nodeRadius;
                const Icon = feat.icon;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    whileInView={{ opacity: 1, scale: 1, x, y }}
                    viewport={{ once: true }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 120, 
                      damping: 12, 
                      delay: 0.4 + i * 0.08 
                    }}
                    className="absolute z-20 flex flex-col items-center group"
                  >
                    {/* Connector line + flowing dots */}
                    <svg className="absolute pointer-events-none" style={{ width: '1px', height: '1px', overflow: 'visible' }}>
                      <motion.line
                        x1={0} y1={0}
                        x2={-x} y2={-y}
                        stroke="rgba(255,255,255,0.15)"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
                      />
                      <circle r="3" fill={feat.dotColor} opacity="0.9">
                        <animateMotion
                          dur={`${2 + i * 0.2}s`}
                          repeatCount="indefinite"
                          begin={`${i * 0.3}s`}
                          path={`M${-x},${-y} L0,0`}
                        />
                        <animate attributeName="opacity" values="0;0.9;0.9;0" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
                        <animate attributeName="r" values="2;3.5;2" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.3}s`} />
                      </circle>
                      <circle r="2.5" fill={feat.dotColor} opacity="0.6">
                        <animateMotion
                          dur={`${2 + i * 0.2}s`}
                          repeatCount="indefinite"
                          begin={`${i * 0.3 + 1}s`}
                          path={`M${-x},${-y} L0,0`}
                        />
                        <animate attributeName="opacity" values="0;0.6;0.6;0" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.3 + 1}s`} />
                        <animate attributeName="r" values="1.5;3;1.5" dur={`${2 + i * 0.2}s`} repeatCount="indefinite" begin={`${i * 0.3 + 1}s`} />
                      </circle>
                    </svg>

                    {/* Node card */}
                    <motion.div 
                      whileHover={{ scale: 1.08, y: -2 }}
                      className={`w-[110px] bg-[#112240] rounded-2xl border border-white/10 shadow-lg ${feat.glow} p-2.5 flex flex-col items-center gap-1.5 cursor-default transition-shadow hover:shadow-xl`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${feat.color} flex items-center justify-center shadow-md`}>
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-white text-center leading-tight">{feat.label}</span>
                      <span className="text-[8px] text-slate-400 text-center leading-tight font-medium">{feat.desc}</span>
                    </motion.div>
                  </motion.div>
                );
              })}

              {/* Background glow */}
              <div className="absolute inset-0 bg-blue-500/10 blur-[80px] opacity-40 rounded-full z-0 pointer-events-none" />
            </div>
          </div>
          </div>

        </div>
      </div>
    </section>
  );
}
