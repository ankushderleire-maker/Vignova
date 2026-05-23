'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Eye } from 'lucide-react';

const resumes = [
  { name: 'Stripe_Sr_Frontend.pdf', date: 'May 12', score: 98 },
  { name: 'Google_SWE_III.pdf', date: 'May 10', score: 94 },
  { name: 'Vercel_Staff_Dev.pdf', date: 'May 8', score: 91 },
  { name: 'Linear_Fullstack.pdf', date: 'May 5', score: 88 },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

export default function SavedFlow() {
  return (
    <AnimatePresence mode="wait">
      <motion.div key="s0" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-20 inset-0 p-6 md:p-10 flex flex-col items-center justify-start overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="w-full max-w-4xl mt-2">
          <motion.div variants={item} className="flex items-center justify-between mb-8">
            <div><h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Saved Resumes</h2><p className="text-sm text-gray-500">Your AI-generated resumes.</p></div>
          </motion.div>
          <motion.div variants={item} className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            <div className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider"><span>Name</span><span>Created</span><span>Score</span><span>Actions</span></div>
            {resumes.map((r, i) => (
              <motion.div key={i} variants={item} className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-50 items-center hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-500" /><span className="text-sm font-medium text-gray-800 truncate">{r.name}</span></div>
                <span className="text-xs text-gray-400">{r.date}</span>
                <div className={`text-xs font-bold px-2 py-1 rounded w-fit ${r.score >= 95 ? 'bg-emerald-50 text-emerald-600' : r.score >= 90 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{r.score}%</div>
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"><Download className="w-4 h-4" /></div><div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 cursor-pointer transition-colors"><Eye className="w-4 h-4" /></div></div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
