'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Building2, Star, MousePointer2, CheckCircle2 } from 'lucide-react';

const searchText = "Senior Frontend Engineer";
const jobs = [
  { company: 'Stripe', role: 'Sr. Frontend Engineer', loc: 'San Francisco', match: 98, tags: ['React', 'TS'] },
  { company: 'Vercel', role: 'Staff Frontend Dev', loc: 'Remote', match: 94, tags: ['Next.js', 'React'] },
  { company: 'Linear', role: 'Frontend Engineer', loc: 'Remote', match: 91, tags: ['GraphQL', 'Tailwind'] },
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

export default function JobsFlow() {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');
  
  useEffect(() => {
    let tid: NodeJS.Timeout;
    if (step === 0) {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setTyped(searchText.slice(0, i));
        if (i >= searchText.length) {
          clearInterval(iv);
          tid = setTimeout(() => setStep(1), 400); // Move to show list
        }
      }, 30);
      return () => clearInterval(iv);
    } 
    else if (step === 1) {
      tid = setTimeout(() => setStep(2), 1000); // Time for cursor to move and click
    }
    return () => clearTimeout(tid);
  }, [step]);
  
  return (
    <AnimatePresence mode="wait">
      {step === 0 && (
        <motion.div key="j0" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-20 inset-0 p-6 md:p-10 flex flex-col items-center justify-start overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-full max-w-3xl mt-2">
            <motion.div variants={item} className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Find Jobs</h2>
              <p className="text-sm text-gray-500">Search and discover matching roles.</p>
            </motion.div>
            <motion.div variants={item} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xl flex items-center gap-3">
              <Search className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
              <span className="text-gray-800 text-lg font-medium border-r-2 border-blue-500 animate-[blink_1s_step-end_infinite]">{typed}</span>
            </motion.div>
          </div>
        </motion.div>
      )}
      {(step === 1 || step === 2) && (
        <motion.div key="j1" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-30 inset-0 p-6 md:p-10 flex flex-col items-center justify-start overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Success Toast */}
          <AnimatePresence>
            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 p-5 flex items-center gap-4 w-max">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><CheckCircle2 className="w-6 h-6"/></div>
                <div>
                  <h4 className="text-base font-bold text-gray-900">Successfully Applied</h4>
                  <p className="text-sm text-gray-500">Your tailored resume was sent to Stripe.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="w-full max-w-4xl space-y-4 mt-2">
            {jobs.map((job, i) => (
              <motion.div key={i} variants={item} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{job.role}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-500 flex items-center gap-1.5"><Building2 className="w-4 h-4"/>{job.company}</span>
                      <span className="text-sm text-gray-400 flex items-center gap-1.5"><MapPin className="w-4 h-4"/>{job.loc}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-bold px-3 py-1 rounded-lg ${job.match>=95?'bg-emerald-50 text-emerald-600 border border-emerald-200':'bg-blue-50 text-blue-600 border border-blue-200'}`}>{job.match}% Match</div>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {job.tags.map(t=><span key={t} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md font-medium">{t}</span>)}
                </div>
                
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  {/* First job application toggle */}
                  {i === 0 && step === 2 ? (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-sm font-bold flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Applied
                    </motion.div>
                  ) : (
                    <div className="flex-1 h-11 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center relative hover:bg-blue-700 transition-colors cursor-pointer">
                      Quick Apply
                      {/* Cursor clicking the first job */}
                      {i === 0 && step === 1 && (
                        <motion.div
                          initial={{ opacity: 0, x: 100, y: 50 }}
                          animate={{ opacity: 1, x: 30, y: 15 }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                          className="absolute z-50 pointer-events-none"
                        >
                          <MousePointer2 className="w-6 h-6 text-black fill-white -rotate-12 drop-shadow-xl" />
                          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 2.5, 0], opacity: [0, 0.6, 0] }} transition={{ delay: 0.8, duration: 0.2 }} className="absolute -top-1 -left-1 w-8 h-8 bg-white/40 rounded-full blur-sm" />
                        </motion.div>
                      )}
                    </div>
                  )}
                  
                  <div className="h-11 px-5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium flex items-center gap-1.5 hover:bg-gray-50 cursor-pointer transition-colors"><Star className="w-4 h-4"/>Save</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
