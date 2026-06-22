'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap } from 'lucide-react';
import ResumeFlow from './hero/ResumeFlow';
import TrackerFlow from './hero/TrackerFlow';
import JobsFlow from './hero/JobsFlow';
import SavedFlow from './hero/SavedFlow';
import ProfileFlow from './hero/ProfileFlow';
import AtsFlow from './hero/AtsFlow';
import LinkedInFlow from './hero/LinkedInFlow';

type Feature = 'profile' | 'resume' | 'ats' | 'saved' | 'tracker' | 'jobs' | 'linkedin';
const featureOrder: Feature[] = ['profile', 'resume', 'ats', 'saved', 'tracker', 'jobs', 'linkedin'];

export default function Hero() {
  const [active, setActive] = useState<Feature>('resume');
  const [cycleKey, setCycleKey] = useState(0);

  // Smooth, fast continuous cycle matching the UI animation durations
  useEffect(() => {
    let tid: NodeJS.Timeout;
    const duration = (active === 'resume' || active === 'ats') ? 4500 : (active === 'profile') ? 2500 : (active === 'linkedin') ? 5000 : 3500;
    tid = setTimeout(() => {
      const next = featureOrder[(featureOrder.indexOf(active) + 1) % featureOrder.length];
      setActive(next);
      setCycleKey(k => k + 1);
    }, duration);
    return () => clearTimeout(tid);
  }, [active, cycleKey]);

  return (
    <section className="relative bg-[#F5F8FA] overflow-hidden min-h-[95vh] flex items-center pt-32 pb-12 lg:pt-40 lg:pb-20">
      {/* Abstract Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-blue-500/25 to-transparent blur-[100px] animate-orb"></div>
        <div className="absolute top-[20%] -right-[20%] w-[80%] h-[80%] rounded-full bg-gradient-to-tl from-indigo-500/20 to-transparent blur-[120px] animate-orb-slow"></div>
        <div className="absolute -bottom-[30%] left-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tr from-violet-500/20 to-transparent blur-[120px] animate-orb"></div>
      </div>
      <div className="w-full px-4 md:px-8 xl:px-12 2xl:px-20 max-w-[1700px] mx-auto relative z-10 pointer-events-none">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 xl:gap-16">

          {/* Left Column (Dynamic Hero Info & CTA) */}
          <div className="w-full lg:w-[480px] xl:w-[500px] flex flex-col justify-center items-center text-center shrink-0 z-20 pointer-events-auto mt-4 lg:mt-8">

            {/* Catchy Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-blue-200/60 text-blue-700 text-[11px] font-bold tracking-[0.18em] uppercase mb-4 shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-60"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              The #1 AI Career Copilot
            </motion.div>

            {/* Dynamic Text synced with animations */}
            <div className="flex-1 flex flex-col justify-center relative min-h-[260px] w-full mb-6">
              <AnimatePresence mode="wait">
                {active === 'profile' && (
                  <motion.div key="text-profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex flex-col justify-center items-center w-full">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-[#0A192F] tracking-tight leading-tight mb-6">
                      Master Profile, <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A192F] to-[#2563EB]">in One Place.</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-light leading-relaxed max-w-lg mx-auto">
                      Build a comprehensive master profile that our AI uses to instantly tailor every application.
                    </p>
                  </motion.div>
                )}
                {active === 'resume' && (
                  <motion.div key="text-resume" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex flex-col justify-center items-center w-full">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-[#0A192F] tracking-tight leading-tight mb-6">
                      Think Fast, <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A192F] to-[#2563EB]">Build Faster.</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-light leading-relaxed max-w-lg mx-auto">
                      Our AI engine analyzes your master profile and the job description to generate a tailored, ATS-optimized resume in seconds.
                    </p>
                  </motion.div>
                )}
                {active === 'ats' && (
                  <motion.div key="text-ats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex flex-col justify-center items-center w-full">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-[#0A192F] tracking-tight leading-tight mb-6">
                      Beat the Bots, <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A192F] to-[#2563EB]">Every Time.</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-light leading-relaxed max-w-lg mx-auto">
                      Deep resume analysis powered by local AI models to ensure you pass ATS screening before you apply.
                    </p>
                  </motion.div>
                )}
                {active === 'saved' && (
                  <motion.div key="text-saved" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex flex-col justify-center items-center w-full">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-[#0A192F] tracking-tight leading-tight mb-6">Your Perfect <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A192F] to-[#2563EB]">Resume Hub.</span></h1>
                    <p className="text-lg lg:text-xl text-gray-500 font-light tracking-tight leading-relaxed max-w-md mx-auto">Keep all your targeted resumes organized in one place. Download or preview them instantly.</p>
                  </motion.div>
                )}
                {active === 'tracker' && (
                  <motion.div key="text-tracker" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex flex-col justify-center items-center w-full">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-[#0A192F] tracking-tight leading-tight mb-6">Never Lose <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A192F] to-[#2563EB]">Track Again.</span></h1>
                    <p className="text-lg lg:text-xl text-gray-500 font-light tracking-tight leading-relaxed max-w-md mx-auto">A beautiful Kanban board to track every application, interview, and offer automatically.</p>
                  </motion.div>
                )}
                {active === 'jobs' && (
                  <motion.div key="text-jobs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex flex-col justify-center items-center w-full">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-[#0A192F] tracking-tight leading-tight mb-6">Find Roles that <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A192F] to-[#2563EB]">match You.</span></h1>
                    <p className="text-lg lg:text-xl text-gray-500 font-light tracking-tight leading-relaxed max-w-md mx-auto">Search and discover high-matching positions based on your exact skillset and preferences.</p>
                  </motion.div>
                )}
                {active === 'linkedin' && (
                  <motion.div key="text-linkedin" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex flex-col justify-center items-center w-full">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-[#0A192F] tracking-tight leading-tight mb-6">
                      LinkedIn Score,<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A66C2] to-[#7C3AED]">100 out of 100.</span>
                    </h1>
                    <p className="text-lg text-slate-500 font-light leading-relaxed max-w-lg mx-auto">
                      AI analyzes your LinkedIn profile, matches it against your Master Resume, and rewrites it to maximize recruiter visibility and keyword ranking.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA Buttons */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
              className="flex flex-col items-center gap-4">
              {/* Social Proof Badge */}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2.5">
                  {[
                    'https://randomuser.me/api/portraits/women/44.jpg',
                    'https://randomuser.me/api/portraits/men/32.jpg',
                    'https://randomuser.me/api/portraits/women/68.jpg',
                    'https://randomuser.me/api/portraits/men/46.jpg',
                    'https://randomuser.me/api/portraits/women/90.jpg'
                  ].map((src, i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100">
                      <img src={src} alt="User" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-[#0A192F]">4.9</span>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">Trusted by 10,000+ job seekers</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => window.location.href = 'https://app.vignova.io/login'} className="group h-13 px-8 rounded-xl bg-[#0A192F] text-white font-semibold text-sm hover:bg-[#0d2240] transition-all duration-300 shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/25 hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                  Get started free <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
                <button onClick={() => window.location.href = 'https://app.vignova.io/login'} className="h-13 px-6 rounded-xl bg-white/80 backdrop-blur-sm border border-gray-200 text-[#0A192F] font-semibold text-sm hover:bg-white hover:border-gray-300 transition-all duration-300 shadow-sm hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Watch demo
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right Column: UI Showcase Block */}
          <div className="w-full lg:w-[50%] xl:w-[60%] flex flex-col justify-start items-center min-w-0 mt-10 lg:mt-0">
            {/* Scaling Wrapper for Mockup */}
            <div className="transform scale-[0.35] min-[380px]:scale-[0.4] sm:scale-[0.55] md:scale-[0.75] lg:scale-[0.85] xl:scale-100 origin-top h-[210px] min-[380px]:h-[240px] sm:h-[330px] md:h-[450px] lg:h-[510px] xl:h-[600px] flex justify-center w-full">
              
              {/* Permanent Dashboard Frame */}
              <div className="relative w-[960px] h-[600px] bg-white rounded-2xl shadow-[0_30px_100px_-15px_rgba(0,0,0,0.15)] border-8 border-gray-100 flex flex-col overflow-hidden pointer-events-none shrink-0">
                {/* Mock App Header */}
              <div className="h-12 bg-[#0A0A0A] w-full flex items-center justify-between px-5 z-20 shrink-0 border-b border-gray-800 relative">
                <div className="flex items-center gap-2"><span className="text-green-500 font-extrabold text-lg">V</span><span className="text-white font-bold text-xs tracking-widest uppercase">Vignova</span></div>

                {/* Dynamic Feature Text in Header */}
                <div className="absolute left-1/2 -translate-x-1/2 text-gray-400 font-bold text-[10px] tracking-[0.2em] uppercase flex items-center overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.span key={active} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      {active === 'profile' && 'Master Profile Sync'}
                      {active === 'resume' && 'AI Resume Studio'}
                      {active === 'ats' && 'ATS Score Analysis'}
                      {active === 'saved' && 'Resume Vault'}
                      {active === 'tracker' && 'Application Tracker'}
                      {active === 'jobs' && 'AI Job Matching'}
                      {active === 'linkedin' && 'LinkedIn Optimizer'}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-500/20"><Zap className="w-3 h-3" /> 3 Credits</div>
                  <div className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs">A</div>
                </div>
              </div>

              {/* Dynamic Feature Content Canvas */}
              <div className="flex-1 relative bg-gray-50/50 overflow-hidden">
                <AnimatePresence mode="wait">
                  {active === 'profile' && <ProfileFlow key={`pf-${cycleKey}`} />}
                  {active === 'resume' && <ResumeFlow key={`rf-${cycleKey}`} />}
                  {active === 'ats' && <AtsFlow key={`af-${cycleKey}`} />}
                  {active === 'saved' && <SavedFlow key={`sf-${cycleKey}`} />}
                  {active === 'tracker' && <TrackerFlow key={`tf-${cycleKey}`} />}
                  {active === 'jobs' && <JobsFlow key={`jf-${cycleKey}`} />}
                  {active === 'linkedin' && <LinkedInFlow key={`lf-${cycleKey}`} />}
                </AnimatePresence>
              </div>
              </div>
            </div>

            {/* Feature Indicators Below Animation */}
            {/* Labeled chips on md+ screens */}
            <div className="hidden md:flex items-center justify-center flex-wrap gap-2 mt-8 max-w-[1200px] w-full pointer-events-auto">
              {([
                { id: 'profile', label: 'Master Profile' },
                { id: 'resume', label: 'AI Resume' },
                { id: 'ats', label: 'ATS Score' },
                { id: 'saved', label: 'Resume Vault' },
                { id: 'tracker', label: 'Job Tracker' },
                { id: 'jobs', label: 'Job Matching' },
                { id: 'linkedin', label: 'LinkedIn' },
              ] as { id: Feature; label: string }[]).map((f) => (
                <button
                  key={f.id}
                  onClick={() => { setActive(f.id); setCycleKey(k => k + 1); }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 border ${
                    active === f.id
                      ? 'bg-[#0A192F] text-white border-[#0A192F] shadow-md shadow-blue-900/15'
                      : 'bg-white/70 text-slate-500 border-gray-200 hover:text-[#0A192F] hover:border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {/* Compact dots on small screens */}
            <div className="flex md:hidden items-center justify-center gap-2.5 mt-6 w-full pointer-events-auto">
              {featureOrder.map((f) => (
                <button
                  key={f}
                  onClick={() => { setActive(f); setCycleKey(k => k + 1); }}
                  aria-label={f}
                  className={`h-1.5 rounded-full transition-all duration-300 ${active === f ? 'w-7 bg-blue-600' : 'w-2 bg-gray-300'}`}
                />
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
