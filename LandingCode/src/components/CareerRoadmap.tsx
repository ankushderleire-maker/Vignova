'use client';

import { motion } from 'framer-motion';
import { User, Search, Sparkles, KanbanSquare } from 'lucide-react';

const steps = [
  { icon: User, step: "Step 01", title: "Master Profile", desc: "Import your existing resume or LinkedIn profile to build your comprehensive career database." },
  { icon: Search, step: "Step 02", title: "Find & Save Jobs", desc: "Browse our job board or save jobs directly from LinkedIn using the Vignova Extension." },
  { icon: Sparkles, step: "Step 03", title: "Tailor with AI", desc: "Instantly generate tailored resumes that match job descriptions and pass enterprise ATS checks." },
  { icon: KanbanSquare, step: "Step 04", title: "Track & Apply", desc: "Manage your pipeline with a visual Kanban board and track your status from Saved to Offer." }
];

export default function CareerRoadmap() {
  return (
    <section className="relative py-24 bg-[#0A192F] border-t border-white/5 overflow-hidden">
      {/* Subtle grid + glow */}
      <div className="absolute inset-0 bg-grid-dark pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 max-w-6xl relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 20 }}
            className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6"
          >
            Your Workflow
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 20, delay: 0.05 }}
            className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-6"
          >
            How <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Vignova works.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 20, delay: 0.1 }}
            className="text-xl text-slate-400 font-light max-w-2xl mx-auto"
          >
            A seamless, AI-powered workflow designed to take you from building a profile to landing the offer.
          </motion.p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 lg:gap-8">
          {/* Animated connector line behind the cards */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.4 }}
            className="hidden md:block absolute top-[52px] left-[12%] right-[12%] h-[2px] bg-gradient-to-r from-blue-500/40 via-indigo-500/40 to-blue-500/40 origin-left z-0"
          />

          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", damping: 20, delay: index * 0.12 }}
                className="group relative z-10 p-6 rounded-2xl bg-[#112240]/60 border border-white/5 backdrop-blur-sm hover:border-blue-500/25 hover:bg-[#112240] hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-400/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(59,130,246,0.12)] group-hover:scale-105 transition-transform duration-300">
                  <Icon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-[11px] font-bold text-blue-400/80 tracking-[0.2em] uppercase mb-2">{step.step}</div>
                <h4 className="text-lg font-bold text-white mb-2 tracking-tight">{step.title}</h4>
                <p className="text-slate-400 text-sm font-light leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
