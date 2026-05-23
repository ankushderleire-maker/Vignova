'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2, Zap, MousePointer2, Download } from 'lucide-react';

const fullText = "Tailor resume for given Job Descriptions.";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};
const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

export default function ResumeFlow() {
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    let tid: NodeJS.Timeout;
    if (step === 0) {
      let i = 0;
      const iv = setInterval(() => {
        i++;
        setTyped(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(iv);
          tid = setTimeout(() => setStep(1), 300); // Move to click step
        }
      }, 30);
      return () => clearInterval(iv);
    } else if (step === 1) {
      tid = setTimeout(() => setStep(2), 800); // Wait for click animation, then show PDF
    }
    return () => clearTimeout(tid);
  }, [step]);

  return (
    <AnimatePresence mode="wait">
      {(step === 0 || step === 1) && (
        <motion.div key="r0" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-20 inset-0 p-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-2xl">
            <motion.div variants={item} className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">Resume Generator</h2>
              <p className="text-sm text-gray-500">Instruct our AI to compile a tailored resume.</p>
            </motion.div>
            <motion.div variants={item} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-4 shadow-xl relative">
              <div className="bg-gray-50/50 rounded-xl px-4 py-4 border border-gray-100 min-h-[80px] flex items-center">
                <span className="text-gray-800 text-base font-medium border-r-2 border-blue-500 animate-[blink_1s_step-end_infinite]">{typed}</span>
              </div>
              <div className="flex justify-end">
                <div className="relative px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-600/30 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Generate
                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 50, y: 50 }}
                      animate={{ opacity: 1, x: 20, y: 15 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute z-50 pointer-events-none"
                    >
                      <MousePointer2 className="w-6 h-6 text-black fill-white -rotate-12 drop-shadow-md" />
                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 2.5, 0], opacity: [0, 0.5, 0] }} transition={{ delay: 0.5, duration: 0.3 }} className="absolute -top-1 -left-1 w-8 h-8 bg-white/40 rounded-full blur-sm" />
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
      {step === 2 && (
        <motion.div key="r1" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-30 inset-0 flex flex-col bg-white overflow-hidden">
          {/* Header */}
          <div className="h-14 border-b border-gray-200 px-4 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Zap className="w-4 h-4" /></div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 leading-tight">AI Studio</h3>
                <p className="text-[10px] text-gray-500">Data Analyst - Job post</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center transition-colors cursor-pointer shadow-sm shadow-emerald-500/20">Check ATS Score</div>
              <div className="h-8 px-4 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold flex items-center hover:bg-gray-50 transition-colors cursor-pointer">Save</div>
              <div className="h-8 px-4 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1.5 hover:bg-gray-50 transition-colors cursor-pointer"><Download className="w-3.5 h-3.5" /> Download PDF</div>
            </div>
          </div>

          {/* Main Layout */}
          <div className="flex-1 flex min-h-0">
            {/* Left Panel */}
            <div className="w-[45%] flex flex-col border-r border-gray-200 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="flex border-b border-gray-200 bg-[#111] text-white shrink-0">
                <div className="flex-1 py-3 text-xs font-bold text-center border-b-[3px] border-blue-500">Content</div>
                <div className="flex-1 py-3 text-xs font-bold text-center text-gray-400">Templates</div>
              </div>
              <div className="p-5 space-y-5 pb-10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-blue-600 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> AI Generated Content</h4>
                </div>

                <h5 className="text-[10px] font-bold text-blue-600 tracking-wider">HEADER & CONTACT</h5>

                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 mb-1.5 block uppercase">Full Name</label>
                    <div className="h-9 rounded border border-gray-200 bg-gray-50/50 px-3 flex items-center text-xs font-medium text-gray-800">Captain Jack Sparrow</div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-600 mb-1.5 block uppercase">Job Title</label>
                    <div className="h-9 rounded border border-gray-200 bg-gray-50/50 px-3 flex items-center text-xs font-medium text-gray-800">Data Analyst</div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-600 mb-1.5 block uppercase">Email</label>
                      <div className="h-9 rounded border border-gray-200 bg-gray-50/50 px-3 flex items-center text-xs font-medium text-gray-800">captain@mail.com</div>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-gray-600 mb-1.5 block uppercase">Phone</label>
                      <div className="h-9 rounded border border-gray-200 bg-gray-50/50 px-3 flex items-center text-xs font-medium text-gray-800">+353 000 000000</div>
                    </div>
                  </div>
                </div>

                <h5 className="text-[10px] font-bold text-blue-600 tracking-wider mt-6">SUMMARY</h5>
                <div className="p-3 rounded border border-gray-200 bg-white text-[11px] text-gray-600 leading-relaxed font-medium">
                  Highly analytical Data Analyst with 2+ years of experience in data processing and workflow optimization, keen to join Rathchart Limited. Proven ability to establish and refine processes for capturing, cleaning, and reviewing data to increase efficiency and identify costs savings across pricing, stock, and logistics for the business group.
                </div>
              </div>
            </div>

            {/* Right Panel (PDF Preview) */}
            <div className="flex-1 bg-gray-50 p-6 overflow-y-auto flex justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-[450px] h-max bg-white shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] p-8 border border-gray-100">
                <h1 className="text-2xl font-serif font-bold text-center tracking-widest text-gray-900 mb-1.5 uppercase">Captain Jack Sparrow</h1>
                <p className="text-[9px] font-medium text-center text-gray-500 mb-6">Tortuga | +353 000 00000 | captain@email.com</p>

                <div className="border-b-[1.5px] border-gray-800 pb-1.5 mb-3 mt-4">
                  <h2 className="text-[11px] font-bold tracking-widest text-gray-900 uppercase">Professional Summary</h2>
                </div>
                <p className="text-[9px] text-gray-800 leading-[1.6] mb-5 text-justify font-medium">
                  Highly analytical Data Analyst with 2+ years of experience in data processing and workflow optimization, keen to join Rathchart Limited. Proven ability to establish and refine processes for capturing, cleaning, and reviewing data to increase efficiency and identify costs savings across pricing, stock, and logistics for the business group.
                </p>

                <div className="border-b-[1.5px] border-gray-800 pb-1.5 mb-3">
                  <h2 className="text-[11px] font-bold tracking-widest text-gray-900 uppercase">Professional Experience</h2>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-[10px] font-bold text-gray-900 uppercase">Adeptia</h3>
                    <span className="text-[9px] text-gray-500 font-medium">April 2023 - July 2025</span>
                  </div>
                  <p className="text-[9px] italic text-gray-700 mb-2 font-medium">SOFTWARE ENGINEER (GEN-AI)</p>
                  <ul className="list-disc pl-3 text-[9px] text-gray-800 space-y-1.5 leading-[1.6]">
                    <li>Designed and deployed data mapping and knowledge retrieval systems, enhancing processes for capturing and reviewing data.</li>
                    <li>Engineered dynamic Python-based rule engines for flexible JSON data extraction and transformation.</li>
                    <li>Developed and maintained production-grade backend APIs using FastAPI for workflow orchestration.</li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
