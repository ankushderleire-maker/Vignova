'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { faqs } from '@/lib/faqs';


export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-32 bg-[#0A192F] border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="mb-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 20 }}
            className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6"
          >
            FAQ
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", damping: 20, delay: 0.05 }}
            className="text-4xl md:text-5xl font-bold tracking-tighter text-white mb-4"
          >
            Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Questions</span>
          </motion.h2>
        </div>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {faqs.map((faq, index) => (
            <div key={index} className="py-1">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between py-5 text-left focus:outline-none group"
              >
                <span className="text-base font-medium tracking-tight text-white group-hover:text-blue-400 transition-colors duration-200">{faq.q}</span>
                <div className={`ml-4 flex-shrink-0 w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-all duration-300 ${openIndex === index ? 'rotate-45 bg-blue-500/10 border-blue-500/30 text-blue-400' : ''}`}>
                  <Plus className="w-3.5 h-3.5" />
                </div>
              </button>
              
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="pb-8 pr-12 text-slate-400 font-light leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
