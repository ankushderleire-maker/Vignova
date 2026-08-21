'use client';

import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CTA() {
  return (
    <section className="py-28 bg-[#0A192F] text-white relative overflow-hidden border-t border-white/5">
      {/* Background glow + grid */}
      <div className="absolute inset-0 bg-grid-dark pointer-events-none"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-500 rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
          className="max-w-4xl mx-auto text-center"
        >
          <h2 className="text-5xl md:text-8xl font-bold tracking-tighter mb-8 leading-[1.1]">
            Ready to accelerate <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">your trajectory?</span>
          </h2>
          <p className="text-xl md:text-2xl text-slate-400 mb-12 max-w-2xl mx-auto font-light tracking-tight">
            Join thousands of professionals who have already transformed their job search with Vignova&apos;s AI copilot.
          </p>
          <div className="flex flex-col items-center justify-center gap-5">
            <button onClick={() => window.location.href = 'https://app.vignova.io/login'} className="group h-16 px-10 rounded-full bg-white text-[#0A192F] font-bold text-lg hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 shadow-2xl shadow-blue-500/20 hover:shadow-blue-500/30">
              Start your free trial
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <p className="text-sm text-slate-500 font-light">Free tier included · No credit card required</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
