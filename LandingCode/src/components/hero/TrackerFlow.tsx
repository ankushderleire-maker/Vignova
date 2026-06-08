'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Plus, Building2, MousePointer2 } from 'lucide-react';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};
const item: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

export default function TrackerFlow() {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');
  
  useEffect(() => {
    let tid: NodeJS.Timeout;
    
    if (step === 0) { 
      tid = setTimeout(() => setStep(1), 400); 
    }
    else if (step === 1) {
      tid = setTimeout(() => setStep(2), 700);
    }
    else if (step === 2) {
      const text = "OpenAI";
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setTyped(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(iv);
          tid = setTimeout(() => setStep(3), 500); 
        }
      }, 40);
      return () => clearInterval(iv);
    }
    
    return () => clearTimeout(tid);
  }, [step]);
  
  return (
    <AnimatePresence mode="wait">
      {/* State 0 & 1: Empty state and cursor moving to Add Job */}
      {(step === 0 || step === 1) && (
        <motion.div key="t0" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-20 inset-0 p-6 md:p-10 flex flex-col items-center justify-start overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-full max-w-4xl mt-2">
            <motion.div variants={item} className="flex items-center justify-between mb-8">
              <div><h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Jobs</h2><p className="text-sm text-gray-500">Track applications and saved positions.</p></div>
              <div className="px-5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 relative">
                <Plus className="w-4 h-4" /> Add Job
                {/* Internal cursor for TrackerFlow */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 100, y: 50 }}
                    animate={{ opacity: 1, x: 20, y: 15 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute z-50 pointer-events-none"
                  >
                    <MousePointer2 className="w-6 h-6 text-black fill-white -rotate-12 drop-shadow-md" />
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 2.5, 0], opacity: [0, 0.5, 0] }} transition={{ delay: 0.4, duration: 0.2 }} className="absolute -top-1 -left-1 w-8 h-8 bg-white/40 rounded-full blur-sm" />
                  </motion.div>
                )}
              </div>
            </motion.div>
            <motion.div variants={item} className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden min-h-[300px] flex items-center justify-center">
              <div className="p-8 flex flex-col items-center text-gray-400"><Building2 className="w-10 h-10 mb-2 text-gray-300" /><span className="text-sm font-medium">No jobs found.</span></div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* State 2: Add Job Popup Modal */}
      {step === 2 && (
        <motion.div key="t2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute z-40 inset-0 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 font-bold text-sm text-gray-800">Add New Job</div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Company</label>
                <div className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 flex items-center text-sm font-medium text-gray-900">
                  <span className="border-r-2 border-blue-500 animate-[blink_1s_step-end_infinite]">{typed}</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Role</label>
                <div className="h-10 rounded-xl border border-gray-200 bg-gray-50 px-3 flex items-center text-sm font-medium text-gray-400">Software Engineer</div>
              </div>
              <div className="mt-4 h-11 rounded-xl bg-blue-600 text-white text-sm font-bold flex items-center justify-center relative">
                Save Job
                {typed === "OpenAI" && (
                  <motion.div
                    initial={{ opacity: 0, x: 50, y: 20 }}
                    animate={{ opacity: 1, x: 40, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute z-50 pointer-events-none"
                  >
                    <MousePointer2 className="w-6 h-6 text-black fill-white -rotate-12 drop-shadow-md" />
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 2.5, 0], opacity: [0, 0.5, 0] }} transition={{ delay: 0.2, duration: 0.2 }} className="absolute -top-1 -left-1 w-8 h-8 bg-white/40 rounded-full blur-sm" />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* State 3: Final Kanban Board View */}
      {step === 3 && (
        <motion.div key="t3" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-30 inset-0 p-6 md:p-10 flex flex-col justify-start overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="w-full max-w-5xl mx-auto h-full flex flex-col mt-2">
            <motion.div variants={item} className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Jobs</h2>
            </motion.div>
            <div className="w-full flex-1 flex gap-4 min-h-0">
              {['Saved', 'Applied', 'Interviewing', 'Offer'].map((col, ci) => (
                <motion.div key={col} variants={item} className="flex-1 flex flex-col min-w-0">
                  <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${ci===0?'text-gray-500':ci===1?'text-blue-600':ci===2?'text-amber-600':'text-emerald-600'}`}>{col}</div>
                  <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3 flex-1 space-y-3 overflow-y-auto shadow-inner [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {ci===0&&<>
                      <motion.div initial={{opacity:0,scale:0.9,y:10}} animate={{opacity:1,scale:1,y:0}} transition={{type:"spring"}} className="bg-white rounded-xl border border-blue-200 p-3.5 shadow-sm ring-2 ring-blue-100"><div className="text-sm font-bold text-gray-800 mb-1">Software Engineer</div><div className="text-xs text-gray-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>OpenAI</div></motion.div>
                      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm"><div className="text-sm font-bold text-gray-800 mb-1">Backend Dev</div><div className="text-xs text-gray-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>Discord</div></div>
                      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm"><div className="text-sm font-bold text-gray-800 mb-1">Fullstack Eng</div><div className="text-xs text-gray-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>Notion</div></div>
                    </>}
                    {ci===1&&<>
                      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm"><div className="text-sm font-bold text-gray-800 mb-1">Sr. Frontend</div><div className="text-xs text-gray-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>Stripe</div></div>
                      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm"><div className="text-sm font-bold text-gray-800 mb-1">React Native Dev</div><div className="text-xs text-gray-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>Spotify</div></div>
                    </>}
                    {ci===2&&<>
                      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm"><div className="text-sm font-bold text-gray-800 mb-1">React Dev</div><div className="text-xs text-gray-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>Vercel</div></div>
                      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm"><div className="text-sm font-bold text-gray-800 mb-1">Product Engineer</div><div className="text-xs text-gray-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5"/>Figma</div></div>
                    </>}
                    {ci===3&&<>
                      <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-sm"><div className="text-sm font-bold text-gray-800 mb-1">Full Stack</div><div className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded w-fit mt-1.5">🎉 Offer!</div></div>
                      <div className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-sm"><div className="text-sm font-bold text-gray-800 mb-1">SWE L4</div><div className="text-xs text-gray-500 flex items-center gap-1.5 mb-1.5"><Building2 className="w-3.5 h-3.5"/>Google</div><div className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded w-fit">🎉 Offer!</div></div>
                    </>}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
