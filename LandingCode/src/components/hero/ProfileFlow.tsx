'use client';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { User, Briefcase, GraduationCap, Code2, FolderGit2, Award, Languages, Save, UploadCloud, MapPin, Mail, Phone, Link, FileText } from 'lucide-react';

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.2 } }
};
const item: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};

export default function ProfileFlow() {
  return (
    <AnimatePresence mode="wait">
      <motion.div key="p0" variants={container} initial="hidden" animate="show" exit="exit" className="absolute z-20 inset-0 flex bg-gray-50/50">

        {/* Left Sidebar */}
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col p-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-xs relative">
              <User className="w-4 h-4" /> Personal Info
              <div className="absolute right-3 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
            </div>
            {[
              [Briefcase, 'Experience'],
              [GraduationCap, 'Education'],
              [Code2, 'Skills'],
              [FolderGit2, 'Projects'],
              [Award, 'Certifications'],
              [Languages, 'Languages']
            ].map(([Icon, label], i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 text-gray-500 hover:bg-gray-50 rounded-lg font-medium text-xs">
                <Icon className="w-4 h-4" /> {label as string}
                {i < 3 && <div className="absolute right-7 w-1.5 h-1.5 bg-blue-600 rounded-full"></div>}
              </div>
            ))}
          </div>
          <div className="mt-auto">
            <button className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"><Save className="w-4 h-4" /> SAVE PROFILE</button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="max-w-4xl mx-auto scale-[0.95] origin-top">

            <motion.div variants={item} className="flex items-start justify-between mb-6">
              <div className="flex gap-4 items-center">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><User className="w-5 h-5" /></div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Personal Details</h2>
                  <p className="text-xs text-gray-500">Basic information that makes up your resume header.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"><UploadCloud className="w-4 h-4" /> Overwrite from PDF</button>
                <select className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-lg text-xs font-bold outline-none shadow-sm"><option>Primary Profile</option></select>
              </div>
            </motion.div>

            <motion.div variants={item} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="grid grid-cols-2 gap-5 mb-5">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 truncate"><User className="w-3 h-3 shrink-0" /> Full Name</label>
                  <div className="h-10 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-sm font-medium text-gray-900 shadow-sm shadow-black/5 truncate">Captain Jack Sparrow</div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 truncate"><Briefcase className="w-3 h-3 shrink-0" /> Professional Title</label>
                  <div className="h-10 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-sm font-medium text-gray-900 shadow-sm shadow-black/5 truncate">Conqueror of the Seven Seas</div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 truncate"><Mail className="w-3 h-3 shrink-0" /> Email Address</label>
                  <div className="h-10 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-sm font-medium text-gray-900 shadow-sm shadow-black/5 truncate">Captain Sparrow@email.com</div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 truncate"><Phone className="w-3 h-3 shrink-0" /> Phone Number</label>
                  <div className="h-10 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-sm font-medium text-gray-900 shadow-sm shadow-black/5 truncate">+353 000 00000</div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 truncate"><MapPin className="w-3 h-3 shrink-0" /> Location</label>
                  <div className="h-10 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-sm font-medium text-gray-900 shadow-sm shadow-black/5 truncate">Dublin</div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 truncate"><Link className="w-3 h-3 shrink-0" /> LinkedIn URL</label>
                  <div className="h-10 rounded-lg border border-gray-200 bg-white px-3 flex items-center text-sm font-medium text-gray-900 shadow-sm shadow-black/5 truncate">Captain Jack Sparrow - LinkedIn</div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 truncate"><Link className="w-3 h-3 shrink-0" /> Personal Website</label>
                  <div className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center text-sm font-medium text-gray-900 shadow-inner truncate"></div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 truncate"><Link className="w-3 h-3 shrink-0" /> Github URL</label>
                  <div className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 flex items-center text-sm font-medium text-gray-900 shadow-inner truncate"></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider"><FileText className="w-3 h-3" /> Professional Summary</label>
                  <span className="text-[10px] text-gray-400 font-medium">414 / 900</span>
                </div>
                <div className="p-3 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-800 leading-relaxed shadow-sm shadow-black/5">
                  Applied AI Engineer with 2+ years of experience building production-ready Generative AI systems, including LLM-powered applications, agentic workflows, and retrieval-based pipelines. Strong expertise in Python, FastAPI, and scalable backend systems. Proven ability to design and deploy real-world AI products, including a full-stack AI SaaS platform (Vignova) with autonomous workflows and multi-LLM orchestration.
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
