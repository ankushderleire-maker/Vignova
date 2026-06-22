'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const testimonials = [
  {
    quote: "Vignova completely transformed my job search. The AI resume analyzer caught things I'd missed for months. I landed a senior role at a top tech company within 3 weeks.",
    author: "Sarah J.",
    role: "Senior Software Engineer",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg"
  },
  {
    quote: "The mock interviews were frighteningly realistic. By the time I had my actual interviews, I felt like I had already done them. It changed everything.",
    author: "Michael T.",
    role: "Product Manager",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg"
  },
  {
    quote: "As an international grad, navigating the tech market was overwhelming. The career roadmap and targeted skill suggestions gave me the exact focus I needed.",
    author: "David L.",
    role: "Data Scientist",
    avatar: "https://randomuser.me/api/portraits/men/46.jpg"
  },
  {
    quote: "The ATS scanner is incredibly precise. It highlighted exactly which keywords I was missing for a specific role, and my interview rate skyrocketed.",
    author: "Emily C.",
    role: "Marketing Director",
    avatar: "https://randomuser.me/api/portraits/women/68.jpg"
  },
  {
    quote: "I used the master profile to autofill dozens of applications in minutes. What used to take my whole weekend now takes me less than an hour.",
    author: "James P.",
    role: "UX Designer",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg"
  },
  {
    quote: "Vignova isn't just a resume builder; it's a complete career strategist. The tailored suggestions made me realize my true worth in the current market.",
    author: "Priya R.",
    role: "Cloud Architect",
    avatar: "https://randomuser.me/api/portraits/women/90.jpg"
  }
];

export default function Testimonials() {
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPage((prev) => (prev === 0 ? 1 : 0));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative py-20 bg-[#F5F8FA] border-t border-border/50 overflow-hidden">
      {/* Abstract Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-500/30 to-transparent blur-[100px] animate-orb"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-indigo-500/40 to-transparent blur-[120px] animate-orb-slow"></div>
      </div>
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 20 }}
            className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-widest mb-6"
          >
            Success Stories
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 20, delay: 0.05 }}
            className="text-4xl md:text-5xl font-bold tracking-tighter text-[#0A192F]"
          >
            Loved by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">ambitious professionals.</span>
          </motion.h2>
        </div>

        {/* Carousel Container */}
        <div className="w-full max-w-6xl mx-auto overflow-hidden px-2 py-4 relative min-h-[440px] sm:min-h-[400px] md:min-h-[330px]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={page}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
              className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 px-2"
            >
              {(page === 0 ? testimonials.slice(0, 3) : testimonials.slice(3, 6)).map((t, index) => (
                <div
                  key={`t-${page}-${index}`}
                  className="flex flex-col justify-between h-full p-7 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/80 shadow-[0_8px_30px_-12px_rgba(10,25,47,0.08)] hover:shadow-[0_16px_40px_-12px_rgba(10,25,47,0.12)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="mb-8">
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      ))}
                    </div>
                    <p className="text-base text-slate-600 leading-relaxed">"{t.quote}"</p>
                  </div>
                  <div className="flex items-center gap-4 mt-auto pt-5 border-t border-gray-100">
                    {t.avatar ? (
                      <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border border-gray-200 shadow-sm relative">
                        <img src={t.avatar} alt={t.author} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold text-gray-500 border border-gray-100 shrink-0">
                        {t.author.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h5 className="font-semibold text-[#0A192F] tracking-tight text-sm">{t.author}</h5>
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators */}
        <div className="flex justify-center items-center gap-3 mt-12">
          <button 
            onClick={() => setPage(0)}
            className={`h-1.5 rounded-full transition-all duration-300 ${page === 0 ? 'w-8 bg-blue-500' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
            aria-label="View first 3 testimonials"
          />
          <button 
            onClick={() => setPage(1)}
            className={`h-1.5 rounded-full transition-all duration-300 ${page === 1 ? 'w-8 bg-blue-500' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
            aria-label="View next 3 testimonials"
          />
        </div>

      </div>
    </section>
  );
}
