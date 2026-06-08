'use client';

import { motion } from 'framer-motion';

export default function CareerRoadmap() {
  const steps = [
    { year: "Step 01", title: "Master Profile", desc: "Import your existing resume or LinkedIn profile to build your comprehensive career database." },
    { year: "Step 02", title: "Find & Save Jobs", desc: "Browse our job board or save jobs directly from LinkedIn using the Vignova Extension." },
    { year: "Step 03", title: "Tailor with AI", desc: "Instantly generate tailored resumes that match job descriptions and pass enterprise ATS checks." },
    { year: "Step 04", title: "Track & Apply", desc: "Manage your pipeline with a visual Kanban board and track your status from Saved to Offer." }
  ];

  return (
    <section className="py-20 bg-[#0A192F] border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 20 }}
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", damping: 20, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector Line */}
              {index !== steps.length - 1 && (
                <div className="hidden md:block absolute top-4 left-full w-full h-[1px] bg-white/10 z-0 -ml-4"></div>
              )}
              
              <div className="relative z-10 flex flex-col">
                <div className="w-8 h-8 rounded-full bg-[#112240] border border-white/10 flex items-center justify-center mb-6 shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]"></div>
                </div>
                <div className="text-xs font-semibold text-slate-400 tracking-widest uppercase mb-3">{step.year}</div>
                <h4 className="text-lg font-bold text-white mb-2 tracking-tight">{step.title}</h4>
                <p className="text-slate-400 text-sm font-light leading-relaxed pr-4">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
