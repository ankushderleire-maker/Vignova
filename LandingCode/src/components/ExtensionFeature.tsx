'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, BarChart2, User, CheckCircle2, FileText, Settings, ChevronRight, MousePointer2, Copy, Mail, Phone, LinkIcon, Briefcase, Building2, Globe2, UploadCloud, X, Sparkles } from 'lucide-react';

export default function ExtensionFeature() {
  const [phase, setPhase] = useState('job-board-idle');
  const [cursorPos, setCursorPos] = useState({ x: 250, y: 480, opacity: 0 });
  const [isClicking, setIsClicking] = useState(false);
  const [copied, setCopied] = useState(false);

  const click = async () => {
    setIsClicking(true);
    await new Promise(r => setTimeout(r, 200));
    setIsClicking(false);
  };

  useEffect(() => {
    let alive = true;
    const run = async () => {
      while (alive) {
        // Reset
        setPhase('job-board-idle');
        setCopied(false);
        setCursorPos({ x: 250, y: 480, opacity: 0 });
        await new Promise(r => setTimeout(r, 1000));
        if (!alive) break;

        // Phase 1: Move cursor to "HIGH" button on job board
        setCursorPos({ x: 95, y: 160, opacity: 1 });
        await new Promise(r => setTimeout(r, 800));
        if (!alive) break;

        setPhase('job-board-hover'); // Show Match Breakdown popup
        await new Promise(r => setTimeout(r, 2000));
        if (!alive) break;

        // Phase 2: Click Tailor Resume
        setCursorPos({ x: 180, y: 160, opacity: 1 });
        await new Promise(r => setTimeout(r, 600));
        if (!alive) break;
        await click();
        setPhase('job-board-tailored');
        await new Promise(r => setTimeout(r, 1800));
        if (!alive) break;

        // Phase 3: Move to Form
        setPhase('form-idle');
        setCursorPos({ x: 200, y: 155, opacity: 1 }); // Move cursor to Attach CV button
        await new Promise(r => setTimeout(r, 1000));
        if (!alive) break;
        await click();
        
        // Phase 4: Upload Modal
        setPhase('form-upload-modal');
        await new Promise(r => setTimeout(r, 800));
        if (!alive) break;
        
        // Click the tailored resume
        setCursorPos({ x: 200, y: 250, opacity: 1 }); 
        await new Promise(r => setTimeout(r, 800));
        if (!alive) break;
        await click();
        
        // Phase 5: CV Attached
        setPhase('form-resume-attached');
        await new Promise(r => setTimeout(r, 1000));
        if (!alive) break;

        // Phase 6: Move cursor to extension icon
        setCursorPos({ x: 360, y: 25, opacity: 1 });
        await new Promise(r => setTimeout(r, 1000));
        if (!alive) break;
        await click();
        setPhase('extension-profile');
        await new Promise(r => setTimeout(r, 1200));
        if (!alive) break;

        // Click copy email
        setCursorPos({ x: 330, y: 215, opacity: 1 });
        await new Promise(r => setTimeout(r, 800));
        if (!alive) break;
        await click();
        setCopied(true);
        await new Promise(r => setTimeout(r, 1000));
        if (!alive) break;

        // Click Autofill tab
        setCursorPos({ x: 170, y: 106, opacity: 1 });
        await new Promise(r => setTimeout(r, 800));
        if (!alive) break;
        await click();
        setPhase('extension-autofill');
        await new Promise(r => setTimeout(r, 1000));
        if (!alive) break;

        // Click Autofill Application button
        setCursorPos({ x: 254, y: 202, opacity: 1 });
        await new Promise(r => setTimeout(r, 800));
        if (!alive) break;
        await click();
        
        setPhase('form-autofilled'); // Popup closes, form shows filled data
        await new Promise(r => setTimeout(r, 3000));
        if (!alive) break;

        // Fade out
        setCursorPos(p => ({ ...p, opacity: 0 }));
        await new Promise(r => setTimeout(r, 1000));
      }
    };
    run();
    return () => { alive = false; };
  }, []);

  return (
    <section className="py-20 bg-[#0A192F] overflow-hidden border-t border-white/5">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <div className="flex flex-col-reverse md:flex-row items-center gap-24">

          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 50, damping: 20 }}
            className="w-full lg:w-1/2 flex justify-center relative perspective-[1000px] overflow-hidden sm:overflow-visible"
          >
            {/* Scaling Wrapper */}
            <div className="transform scale-[0.75] min-[380px]:scale-[0.85] sm:scale-100 origin-top h-[390px] min-[380px]:h-[442px] sm:h-[520px] flex justify-center w-full">
              {/* Animated Browser & Extension Simulation */}
              <div className="relative w-[400px] h-[520px] bg-slate-50 rounded-xl shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)] flex flex-col overflow-hidden font-sans border border-slate-200 shrink-0">
              
              {/* Browser Toolbar */}
              <div className="bg-white border-b border-slate-200 h-12 flex items-center px-4 shrink-0 z-20 shadow-sm relative">
                <div className="flex gap-1.5 mr-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                </div>
                <div className="flex-1 bg-slate-100 rounded-md h-7 px-3 flex items-center text-[10px] text-slate-400 font-medium border border-slate-200">
                  <Globe2 className="w-3 h-3 mr-1.5" /> linkedin.com/jobs/view
                </div>
                <div className="w-7 h-7 ml-3 bg-slate-800 rounded flex items-center justify-center border border-slate-700 shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-emerald-400" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 relative overflow-hidden bg-white">
                
                <AnimatePresence>
                  {phase.startsWith('form-') || phase.startsWith('extension-') ? (
                    <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 p-6 bg-slate-50 z-0">
                      <div className="font-bold text-slate-800 mb-5 text-lg">Apply to TechCorp</div>
                      <div className="space-y-4">
                        {/* Resume Field */}
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 mb-1">Resume / CV</div>
                          {phase === 'form-idle' || phase === 'form-upload-modal' ? (
                            <div className={`h-9 bg-white border border-dashed rounded-md flex items-center justify-center text-[10px] transition-colors ${phase === 'form-upload-modal' ? 'border-blue-400 text-blue-600 bg-blue-50/50' : 'border-slate-300 text-slate-500 hover:bg-slate-50'}`}>
                              <UploadCloud className="w-3.5 h-3.5 mr-1.5" /> Attach CV from Vignova
                            </div>
                          ) : (
                            <div className="h-9 bg-emerald-50 border border-emerald-200 rounded-md flex items-center px-3 text-[10px] text-emerald-700 font-bold">
                              <FileText className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Software_Engineer_TechCorp.pdf
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="text-[10px] font-bold text-slate-500 mb-1">First Name</div>
                          <div className={`h-9 bg-white border rounded-md flex items-center px-3 text-sm text-slate-800 transition-all ${phase === 'form-autofilled' ? 'border-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.1)]' : 'border-slate-200'}`}>
                            {phase === 'form-autofilled' ? 'Ankush' : ''}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 mb-1">Email Address</div>
                          <div className={`h-9 bg-white border rounded-md flex items-center px-3 text-sm text-slate-800 transition-all ${phase === 'form-autofilled' ? 'border-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.1)]' : 'border-slate-200'}`}>
                            {phase === 'form-autofilled' ? 'ankush@email.com' : ''}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 mb-1">LinkedIn Profile</div>
                          <div className={`h-9 bg-white border rounded-md flex items-center px-3 text-sm text-slate-800 transition-all ${phase === 'form-autofilled' ? 'border-emerald-300 shadow-[0_0_0_2px_rgba(16,185,129,0.1)]' : 'border-slate-200'}`}>
                            {phase === 'form-autofilled' ? 'linkedin.com/in/ankush' : ''}
                          </div>
                        </div>
                        <div className="mt-6 h-9 bg-blue-600 rounded-md flex items-center justify-center text-white font-bold text-sm">Submit Application</div>
                      </div>
                      
                      {phase === 'form-autofilled' && <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} className="absolute inset-0 bg-emerald-400/20 pointer-events-none" />}

                      {/* Upload Modal Overlay */}
                      <AnimatePresence>
                        {phase === 'form-upload-modal' && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#2b2b52]/80 z-10 flex items-center justify-center p-4">
                            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-xl shadow-2xl w-full overflow-hidden flex flex-col">
                              {/* Modal Header */}
                              <div className="px-5 py-4 flex justify-between items-center border-b border-slate-50">
                                <span className="font-bold text-[13px] text-slate-900">Select Document to Upload</span>
                                <X className="w-4 h-4 text-slate-400" />
                              </div>
                              
                              {/* Resumes List (Middle) */}
                              <div className="p-4 space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 bg-blue-50/50 cursor-pointer shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                                    <div>
                                      <div className="text-[11px] font-bold text-slate-800">Software_Engineer_TechCorp.pdf</div>
                                      <div className="text-[9px] text-slate-500">Tailored 1 min ago</div>
                                    </div>
                                  </div>
                                  <div className="text-[9px] font-bold bg-[#10b981] text-white px-2 py-1 rounded-md flex items-center gap-1 shadow-sm"><Sparkles className="w-3 h-3" /> AI TAILORED</div>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                                    <div>
                                      <div className="text-[11px] font-bold text-slate-700">Ankush_Master_Resume.pdf</div>
                                      <div className="text-[9px] text-slate-400">Updated 2 weeks ago</div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Modal Footer */}
                              <div className="p-4 border-t border-slate-100 bg-white">
                                <div className="w-full py-2.5 rounded-lg border border-slate-200 text-slate-700 flex justify-center items-center gap-2 text-[11px] font-bold cursor-pointer hover:bg-slate-50">
                                  <UploadCloud className="w-4 h-4" /> Or upload from your computer
                                </div>
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.div key="job" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 p-6 bg-white z-0">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center"><Building2 className="w-6 h-6 text-white"/></div>
                        <div>
                          <div className="font-bold text-xl text-slate-900">Software engineer, intern</div>
                          <div className="text-sm text-slate-500 mt-1">TechCorp • Dublin, Ireland • 1 day ago</div>
                        </div>
                      </div>

                      {/* Vignova Injected Bar */}
                      <div className="mt-6 bg-black rounded-md p-1.5 flex items-center gap-2 border border-slate-800 w-max shadow-lg relative">
                        <div className="px-2 border-r border-slate-700">
                          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-emerald-400" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                        </div>
                        <div className={`px-3 py-1.5 rounded bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-[10px] font-bold tracking-wider cursor-pointer transition-colors ${(phase === 'job-board-hover' || phase === 'job-board-tailored') ? 'bg-emerald-800 border-emerald-500' : ''}`}>
                          HIGH
                        </div>
                        <div className="px-3 py-1.5 rounded bg-[#e2eaf4] text-slate-800 text-[10px] font-bold tracking-wider border border-[#d1dce8]">
                          TAILOR RESUME
                        </div>
                        <div className="px-3 py-1.5 rounded bg-[#e8f3e8] text-emerald-900 text-[10px] font-bold tracking-wider border border-[#d1e8d1]">
                          SAVE JOB
                        </div>

                        {/* Match Breakdown Popup */}
                        <AnimatePresence>
                          {phase === 'job-board-hover' && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute top-full left-10 mt-2 w-[260px] bg-[#0a100d] border border-emerald-900/50 rounded-xl shadow-2xl p-4 z-10 overflow-hidden"
                            >
                              <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b9811a_1px,transparent_1px),linear-gradient(to_bottom,#10b9811a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none opacity-20"></div>
                              <div className="relative z-10">
                                <div className="text-white font-bold text-xs border-b border-emerald-900/50 pb-2 mb-3">Match Breakdown (40/100)</div>
                                
                                <div className="space-y-3">
                                  <div>
                                    <div className="text-[9px] text-slate-400 font-bold mb-1 tracking-widest">KEYWORDS (4)</div>
                                    <div className="flex flex-wrap gap-1">
                                      <span className="px-2 py-0.5 rounded-full border border-emerald-800 bg-emerald-900/30 text-emerald-400 text-[9px]">Teams</span>
                                      <span className="px-2 py-0.5 rounded-full border border-emerald-800 bg-emerald-900/30 text-emerald-400 text-[9px]">Docker</span>
                                      <span className="px-2 py-0.5 rounded-full border border-emerald-800 bg-emerald-900/30 text-emerald-400 text-[9px]">Python</span>
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[9px] text-slate-400 font-bold mb-1 tracking-widest mt-2">MISSING (6)</div>
                                    <div className="flex flex-wrap gap-1">
                                      <span className="px-2 py-0.5 rounded-full border border-red-900/50 bg-red-950/30 text-red-400 text-[9px]">Go</span>
                                      <span className="px-2 py-0.5 rounded-full border border-red-900/50 bg-red-950/30 text-red-400 text-[9px]">Grpc</span>
                                      <span className="px-2 py-0.5 rounded-full border border-red-900/50 bg-red-950/30 text-red-400 text-[9px]">Rust</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Fake job listing text body */}
                      <div className="mt-8 space-y-3 opacity-60">
                        <div className="w-full h-3 bg-slate-200 rounded"></div>
                        <div className="w-5/6 h-3 bg-slate-200 rounded"></div>
                        <div className="w-4/6 h-3 bg-slate-200 rounded"></div>
                        <div className="w-full h-3 bg-slate-200 rounded mt-4"></div>
                        <div className="w-2/3 h-3 bg-slate-200 rounded"></div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Extension Dropdown UI */}
                <AnimatePresence>
                  {(phase === 'extension-profile' || phase === 'extension-autofill') && (
                    <motion.div 
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-0 right-4 w-[260px] bg-white border border-slate-200 rounded-b-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] z-30 flex flex-col"
                    >
                      {/* Extension Header */}
                      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-emerald-400" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>
                          <span className="font-bold text-[11px] tracking-widest">VIGNOVA</span>
                        </div>
                      </div>
                      
                      {/* Tabs */}
                      <div className="flex border-b border-slate-100 bg-slate-50">
                        <div className={`flex-1 py-2.5 flex justify-center items-center gap-1.5 text-[10px] font-bold transition-colors ${phase === 'extension-autofill' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-white' : 'text-slate-500'}`}>
                          <Zap className="w-3 h-3" /> Autofill
                        </div>
                        <div className="flex-1 py-2.5 flex justify-center items-center gap-1.5 text-[10px] font-bold text-slate-500">
                          <BarChart2 className="w-3 h-3" /> Keywords
                        </div>
                        <div className={`flex-1 py-2.5 flex justify-center items-center gap-1.5 text-[10px] font-bold transition-colors ${phase === 'extension-profile' ? 'text-emerald-600 border-b-2 border-emerald-500 bg-white' : 'text-slate-500'}`}>
                          <User className="w-3 h-3" /> Profile
                        </div>
                      </div>

                      {/* Extension Content */}
                      <div className="p-4 bg-white">
                        {phase === 'extension-profile' && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">AD</div>
                              <div>
                                <div className="font-bold text-slate-800 text-xs">Ankush Derle</div>
                                <div className="text-[9px] text-slate-400">Software Engineer</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-2 border border-slate-200 rounded-md bg-slate-50">
                              <div className="flex items-center gap-2 text-[10px] text-slate-600"><Mail className="w-3 h-3 text-slate-400"/> ankush@...</div>
                              <div className={`text-[9px] font-bold px-2 py-0.5 rounded flex items-center gap-1 ${copied ? 'bg-emerald-100 text-emerald-600' : 'bg-white border border-slate-200 text-slate-500'}`}>
                                {copied ? <><CheckCircle2 className="w-3 h-3"/> Copied</> : <><Copy className="w-3 h-3"/> Copy</>}
                              </div>
                            </div>
                            <div className="flex items-center justify-between p-2 border border-slate-200 rounded-md bg-slate-50">
                              <div className="flex items-center gap-2 text-[10px] text-slate-600"><Phone className="w-3 h-3 text-slate-400"/> +353 89...</div>
                              <div className="text-[9px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500 flex items-center gap-1"><Copy className="w-3 h-3"/> Copy</div>
                            </div>
                          </div>
                        )}
                        {phase === 'extension-autofill' && (
                          <div className="flex flex-col gap-3">
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-2.5 rounded-md flex justify-center items-center text-[10px] font-bold gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Context Ready
                            </div>
                            <div className={`mt-2 py-2.5 rounded-md flex justify-center items-center text-[11px] font-bold text-white transition-colors shadow-md ${isClicking ? 'bg-emerald-700' : 'bg-emerald-600'}`}>
                              <Zap className="w-3.5 h-3.5 mr-1.5" /> Autofill Application
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Animated Cursor */}
              <motion.div
                className="absolute z-50 pointer-events-none drop-shadow-[0_5px_10px_rgba(0,0,0,0.3)]"
                animate={{ 
                  x: cursorPos.x, 
                  y: cursorPos.y, 
                  opacity: cursorPos.opacity,
                  scale: isClicking ? 0.8 : 1 
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <MousePointer2 className="w-6 h-6 text-black fill-black -rotate-12" />
              </motion.div>
            </div>
            </div>
            
            <div className="absolute inset-0 bg-blue-500 blur-[120px] rounded-full opacity-20 transform -translate-x-10 translate-y-10 z-[-1]"></div>
          </motion.div>

          <div className="w-full lg:w-1/2 space-y-8 lg:space-y-10 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", damping: 20 }}
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-widest mb-6 mx-auto md:mx-0">
                Chrome Extension
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-white mb-6 leading-tight">
                One click. <br className="hidden lg:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 whitespace-nowrap">Apply, tailor & copy.</span>
              </h2>

              <p className="text-xl text-slate-400 font-light leading-relaxed mb-8">
                Your AI career copilot lives inside your browser. Tailor resumes to any JD, auto-fill application forms on LinkedIn, Indeed & Workday.
              </p>

              <div className="space-y-4">
                <motion.div initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="flex items-start gap-3">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0"><Zap className="w-4 h-4 text-blue-400" /></div>
                  <div><div className="text-sm font-bold text-white mb-0.5">One-Click Autofill</div><div className="text-sm text-slate-500">Fill entire job applications instantly with context-aware data from your profile.</div></div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="flex items-start gap-3">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-indigo-400" /></div>
                  <div><div className="text-sm font-bold text-white mb-0.5">AI Resume Tailoring</div><div className="text-sm text-slate-500">Rewrite your resume for each role. Match keywords, tone, and requirements automatically.</div></div>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex items-start gap-3">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><Copy className="w-4 h-4 text-emerald-400" /></div>
                  <div><div className="text-sm font-bold text-white mb-0.5">Copy & Paste Profile</div><div className="text-sm text-slate-500">Instantly copy email, phone, LinkedIn and more from your profile into any form field.</div></div>
                </motion.div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
