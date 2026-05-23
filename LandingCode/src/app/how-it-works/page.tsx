'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, XCircle, Sparkles, UserCircle, Bookmark, Wand2, Pencil, ShieldCheck, LayoutDashboard, Search, Puzzle } from 'lucide-react';

const features = [
  {
    step: 1,
    icon: <UserCircle className="w-6 h-6" />,
    tag: 'Foundation',
    title: 'Create Your Master Profile',
    description: 'Build your comprehensive career database — every skill, project, certification, and metric in one place. Import from LinkedIn or an existing PDF in seconds. This becomes the AI\'s source of truth for every tailored resume it generates.',
    image: '/images/2_master_profile.png',
    color: 'from-blue-500 to-indigo-600',
    glowColor: 'bg-blue-500/30',
    bullets: ['Import from LinkedIn or PDF', 'Unlimited entries — no page limits', 'AI reads your full history for context'],
  },
  {
    step: 2,
    icon: <Bookmark className="w-6 h-6" />,
    tag: 'Discovery',
    title: 'Save Jobs You Want',
    description: 'Browse jobs from our built-in job board or save them directly from LinkedIn using the Vignova Extension. Every saved job lands in your personal pipeline, ready for tailoring.',
    image: '/images/4_job_tracker.png',
    color: 'from-emerald-500 to-teal-600',
    glowColor: 'bg-emerald-500/30',
    bullets: ['Save from LinkedIn with 1 click', 'Kanban board: Saved → Applied → Offer', 'Track status, dates, and notes'],
  },
  {
    step: 3,
    icon: <Wand2 className="w-6 h-6" />,
    tag: 'AI Power',
    title: 'Tailor Your Resume with AI',
    description: 'Select a saved job, hit "AI Studio", and Vignova generates a perfectly tailored resume. It cross-references the job description against your Master Profile, rewrites bullet points, and injects the exact keywords the ATS is scanning for.',
    image: '/images/3_resume_generator.png',
    color: 'from-violet-500 to-purple-600',
    glowColor: 'bg-violet-500/30',
    bullets: ['AI matches JD keywords to your experience', 'Summary, skills, and bullets all tailored', 'Choose from multiple professional templates'],
  },
  {
    step: 4,
    icon: <Pencil className="w-6 h-6" />,
    tag: 'Full Control',
    title: 'Edit & Perfect Your Resume',
    description: 'You\'re always in control. The AI Studio gives you a side-by-side editor: AI-generated content on the left, live resume preview on the right. Click any section to edit, re-order, or regenerate it.',
    image: '/images/7_ai_resume_editor.png',
    color: 'from-amber-500 to-orange-600',
    glowColor: 'bg-amber-500/30',
    bullets: ['Live preview as you edit', 'Click any section to customize', 'Bold, italic, and regenerate inline'],
  },
  {
    step: 5,
    icon: <ShieldCheck className="w-6 h-6" />,
    tag: 'Validation',
    title: 'Check Your ATS Score',
    description: 'Before you hit apply, run a deep ATS analysis. Vignova scores your resume across 6 dimensions — Keywords, Semantics, Sections, Impact, Format, and Readability — and gives you an exact percentage with actionable insights.',
    image: '/images/5_ats_analysis.png',
    color: 'from-yellow-500 to-amber-600',
    glowColor: 'bg-yellow-500/30',
    bullets: ['6-dimension scoring breakdown', 'Resume Insights: word count, action verbs, metrics', 'Refine with AI in one click'],
  },
  {
    step: 6,
    icon: <LayoutDashboard className="w-6 h-6" />,
    tag: 'Organization',
    title: 'Track Every Application',
    description: 'Your full-featured job tracker with a Kanban board and list view. See every application at a glance — Saved, Tailoring, Applied, Interviewing, and Offer. Never lose track of where you stand.',
    image: '/images/4_job_tracker.png',
    color: 'from-cyan-500 to-blue-600',
    glowColor: 'bg-cyan-500/30',
    bullets: ['Visual Kanban board & list toggle', 'Filter by status, company, or date', 'Direct link to AI Studio from any job'],
  },
  {
    step: 7,
    icon: <Search className="w-6 h-6" />,
    tag: 'Discovery',
    title: 'Find Jobs & Easy Apply',
    description: 'Vignova aggregates thousands of live job postings from top companies. Search by title, company, or location. Save any job, tailor your CV, and apply — all without leaving the platform.',
    image: '/images/6_job_finder.png',
    color: 'from-green-500 to-emerald-600',
    glowColor: 'bg-green-500/30',
    bullets: ['1,800+ live jobs from Greenhouse, Lever & more', 'One-click Save, Tailor CV, or Apply Now', 'Filter by location and company'],
  },
  {
    step: 8,
    icon: <Puzzle className="w-6 h-6" />,
    tag: 'Superpower',
    title: 'The Chrome Extension',
    description: 'Install the Vignova Chrome Extension and supercharge your LinkedIn experience. It overlays directly on job postings — showing match scores, one-click autofill, and letting you save jobs or tailor resumes without ever leaving LinkedIn.',
    image: '/images/ext_1_linkedin_panel.png',
    color: 'from-rose-500 to-pink-600',
    glowColor: 'bg-rose-500/30',
    bullets: ['Overlays on LinkedIn job pages', 'Autofill applications in 1 click', 'Save to dashboard & tailor instantly'],
  },
];

export default function HowItWorks() {
  return (
    <main className="min-h-screen bg-[#F5F8FA] overflow-hidden">
      <Header />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 md:px-8 max-w-5xl mx-auto relative z-10 text-center mt-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-sm font-bold tracking-wide uppercase mb-8 shadow-sm"
        >
          <Sparkles className="w-4 h-4" /> Trusted by 10,000+ job seekers
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-black text-[#0A192F] tracking-tight mb-8 leading-[1.1]"
        >
          Your entire job search,<br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">one AI-powered platform.</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl text-slate-500 max-w-3xl mx-auto font-light leading-relaxed mb-12"
        >
          From building your master profile to landing the offer — Vignova handles resume tailoring, ATS scoring, job tracking, and applications in one seamless workflow.
        </motion.p>
        
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.3 }}
           className="flex flex-col sm:flex-row gap-4 items-center justify-center"
        >
           <button onClick={() => window.location.href = 'https://app.vignova.io/login'} className="h-14 px-10 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/30 flex items-center gap-2 hover:-translate-y-1">
             Start Building Free <ArrowRight className="w-5 h-5" />
           </button>
           <span className="text-sm text-slate-400">No credit card required</span>
        </motion.div>
      </section>

      {/* Dashboard Preview */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="max-w-[1400px] mx-auto px-4 md:px-8 pb-20 perspective-1000"
      >
        <div className="relative group w-full flex justify-center transform-gpu transition-transform duration-700 hover:scale-[1.01] hover:rotate-y-[-1deg] hover:rotate-x-[1deg]">
          <div className="absolute -inset-10 bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-emerald-500/30 rounded-[3rem] blur-3xl opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="relative w-full max-w-[1200px] bg-white rounded-2xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[6px] border-white ring-1 ring-black/5">
            <div className="h-14 bg-[#0A0A0A] flex items-center justify-between px-6 border-b border-white/5 rounded-t-xl">
              {/* Left: Logo */}
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-black text-xl leading-none">V</span>
                <span className="text-white font-bold text-sm tracking-widest">VIGNOVA</span>
              </div>
              
              {/* Center: Title */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400">DASHBOARD</span>
              </div>

              {/* Right: Credits & Avatar */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 text-amber-500 text-xs font-medium bg-amber-500/5">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  3 Credits
                </div>
                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold">A</div>
              </div>
            </div>
            <Image 
              src="/images/1_dashboard.png" 
              alt="Vignova Dashboard" 
              width={1920} 
              height={1080} 
              className="w-full h-auto object-cover border-t border-gray-100" 
              priority 
              quality={100}
            />
          </div>
        </div>
      </motion.section>

      {/* Before & After Showcase */}
      <section className="py-24 bg-white relative border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-5xl font-black text-[#0A192F] tracking-tight">See the Difference</h2>
             <p className="text-lg text-slate-500 mt-4 max-w-2xl mx-auto">Here's what happens when you tailor a generic bullet point to a "Software Engineer at Stripe" job description.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-red-50/50 border border-red-100 p-8 rounded-3xl relative">
              <div className="absolute top-0 right-0 p-6 opacity-20"><XCircle className="w-24 h-24 text-red-500" /></div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 text-sm font-bold rounded-lg mb-6 uppercase tracking-wider">Before Tailoring</div>
              <div className="text-xl text-slate-700 font-medium leading-relaxed italic border-l-4 border-red-200 pl-4 mb-6">
                "Built backend services for the main product and worked on API improvements with the team."
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                <strong className="text-red-700">Why it fails:</strong> Vague, generic, no metrics. Doesn't mention scale or technologies that Stripe is scanning for.
              </p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="bg-emerald-50/50 border border-emerald-100 p-8 rounded-3xl shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10"><CheckCircle2 className="w-32 h-32 text-emerald-500" /></div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-bold rounded-lg mb-6 uppercase tracking-wider"><Sparkles className="w-4 h-4"/> Vignova Tailored</div>
              <div className="text-xl text-[#0A192F] font-bold leading-relaxed border-l-4 border-emerald-400 pl-4 mb-6 bg-white/50 py-2 relative z-10">
                "Architected distributed payment-processing services handling <span className="bg-emerald-200/50 px-1 rounded">50M+ daily transactions</span>, cutting partner API integration time from <span className="bg-emerald-200/50 px-1 rounded">3 days to 4 hours</span>."
              </div>
              <p className="text-sm text-slate-600 leading-relaxed relative z-10">
                <strong className="text-emerald-700">Why it gets the interview:</strong> Stripe's JD calls out distributed systems & high throughput. Vignova surfaced your exact metrics to match.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Sections — 8 steps */}
      {features.map((feature, idx) => (
        <section 
          key={feature.step} 
          className={`py-32 ${idx % 2 === 0 ? 'bg-[#F5F8FA]' : 'bg-white'} relative overflow-hidden`}
        >
          <div className="max-w-[1400px] mx-auto px-4 md:px-8">
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className={`flex flex-col ${idx % 2 !== 0 ? 'xl:flex-row-reverse' : 'xl:flex-row'} items-center gap-12 xl:gap-24`}
            >
              {/* Text Side */}
              <div className="flex-1 space-y-6 text-center xl:text-left max-w-2xl mx-auto">
                <div className="flex items-center justify-center xl:justify-start gap-3 mb-6">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-xl shadow-${feature.color.split('-')[1]}-500/30 border border-white/20`}>
                    {feature.icon}
                  </div>
                  <div className={`text-sm font-black uppercase tracking-widest bg-gradient-to-r ${feature.color} text-transparent bg-clip-text`}>
                    Step {feature.step} · {feature.tag}
                  </div>
                </div>
                
                <h2 className="text-3xl md:text-5xl font-black text-[#0A192F] leading-tight tracking-tight">
                  {feature.title}
                </h2>
                
                <p className="text-xl text-slate-500 leading-relaxed font-light">
                  {feature.description}
                </p>
                
                <ul className="space-y-4 pt-4 text-left inline-block xl:block">
                  {feature.bullets.map((bullet, bi) => (
                    <li key={bi} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-6 h-6 text-emerald-500 mt-0.5 shrink-0`} />
                      <span className="text-slate-600 font-medium text-lg">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Image Side - Big, 3D, Gradient Backed */}
              <div className="flex-1 w-full flex justify-center perspective-1000">
                <div className="relative w-[340px] sm:w-[500px] md:w-[650px] lg:w-[750px] xl:w-[850px] flex items-center justify-center transform-gpu transition-transform duration-700 hover:scale-[1.02] hover:rotate-y-[-2deg] hover:rotate-x-[2deg]">
                  
                  {/* Glowing ambient background behind the mockup */}
                  <div className={`absolute inset-0 blur-[80px] rounded-full scale-110 -z-10 opacity-50 bg-gradient-to-tr ${feature.color}`}></div>
                  
                  {/* Browser frame */}
                  <div className="relative w-full bg-white rounded-2xl shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[6px] border-white flex flex-col overflow-hidden ring-1 ring-black/5">
                    <div className="h-12 sm:h-14 bg-[#0A0A0A] w-full flex items-center justify-between px-4 sm:px-6 border-b border-white/5 shrink-0 rounded-t-xl">
                      {/* Left: Logo */}
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-500 font-black text-lg sm:text-xl leading-none">V</span>
                        <span className="text-white font-bold text-xs sm:text-sm tracking-widest hidden sm:block">VIGNOVA</span>
                      </div>
                      
                      {/* Center: Title */}
                      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 hidden sm:block"></div>
                        <span className="text-[9px] sm:text-[11px] font-bold tracking-[0.15em] sm:tracking-[0.2em] uppercase text-gray-400 whitespace-nowrap">{feature.title}</span>
                      </div>

                      {/* Right: Credits & Avatar */}
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="hidden sm:flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-amber-500/30 text-amber-500 text-[10px] sm:text-xs font-medium bg-amber-500/5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          3 Credits
                        </div>
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white text-black flex items-center justify-center text-xs sm:text-sm font-bold shrink-0">A</div>
                      </div>
                    </div>
                    <div className="relative w-full bg-[#0A0A0A] overflow-hidden">
                      <Image 
                        src={feature.image} 
                        alt={feature.title} 
                        width={1600} 
                        height={1000} 
                        className="w-full h-auto object-cover object-top border-t border-white/5" 
                        quality={100}
                      />
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </div>
        </section>
      ))}

      {/* Comparison Table */}
      <section className="py-20 bg-[#0A192F] relative border-t border-white/5 overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10">
          <div className="text-center mb-12">
             <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight mb-4">Vignova vs. The Alternatives</h2>
             <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">Why standard resume builders and generic chatbots fall short of a dedicated career copilot.</p>
          </div>
          
          <div className="relative mt-8 max-w-5xl mx-auto">
            {/* The Dedicated Highlight Column for Vignova */}
            <div className="absolute top-[-15px] bottom-[-15px] left-[25%] w-[25%] bg-gradient-to-b from-blue-600/20 via-indigo-600/5 to-transparent rounded-2xl border-t border-x border-blue-400/30 shadow-[0_0_50px_rgba(59,130,246,0.15)] -z-10 hidden md:block backdrop-blur-sm"></div>
            
            <div className="grid grid-cols-3 md:grid-cols-4 gap-0 w-full relative">
              
              {/* Header Row */}
              <div className="col-span-3 md:col-span-1 border-b border-white/10 pb-4 hidden md:block"></div>
              
              <div className="col-span-1 border-b border-blue-500/30 pb-4 text-center relative">
                <div className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-full bg-blue-500/20 border border-blue-400/50 text-blue-300 font-bold text-xs tracking-widest shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                   <Sparkles className="w-3.5 h-3.5 text-blue-400"/> VIGNOVA
                </div>
              </div>
              
              <div className="col-span-1 border-b border-white/10 pb-4 flex items-end justify-center">
                <span className="font-semibold text-slate-300 text-base md:text-lg tracking-wide">Claude</span>
              </div>
              
              <div className="col-span-1 border-b border-white/10 pb-4 flex items-end justify-center">
                <span className="font-semibold text-slate-500 text-base md:text-lg tracking-wide">Manual</span>
              </div>

              {/* Rows */}
              {[
                { 
                  label: 'Time per Application', 
                  v: 'Under 5 mins', 
                  c: '15-20 mins', 
                  m: '45-60 mins' 
                },
                { 
                  label: 'ATS Score Analysis', 
                  v: '6-Dimension Scoring', 
                  c: <span className="flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4 opacity-40"/> None</span>, 
                  m: <span className="flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4 opacity-40"/> None</span>
                },
                { 
                  label: 'Context Memory', 
                  v: 'Full Career History', 
                  c: 'Per-Chat Only', 
                  m: 'Mental Effort' 
                },
                { 
                  label: 'Built-in Job Tracker', 
                  v: 'Kanban + List View', 
                  c: <span className="flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4 opacity-40"/> No</span>, 
                  m: 'Spreadsheets' 
                },
                { 
                  label: 'Browser Extension', 
                  v: 'LinkedIn Overlay', 
                  c: <span className="flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4 opacity-40"/> No</span>, 
                  m: <span className="flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4 opacity-40"/> No</span> 
                },
                { 
                  label: 'Resume Output', 
                  v: '6+ Pro Templates', 
                  c: 'Plain Text Only', 
                  m: 'DIY Formatting' 
                },
              ].map((row, i) => (
                <div key={i} className="contents group">
                  {/* Label */}
                  <div className="col-span-3 md:col-span-1 border-b border-white/5 py-4 text-left font-medium text-slate-200 text-sm md:text-base flex flex-col justify-center pl-2 md:pl-6 group-hover:bg-white/[0.02] transition-colors rounded-l-xl mt-4 md:mt-0">
                    <span className="md:hidden text-blue-400 text-xs font-bold tracking-wider uppercase mb-1">Feature</span>
                    {row.label}
                  </div>
                  
                  {/* Vignova */}
                  <div className="col-span-1 md:col-span-1 border-b border-white/5 py-4 text-center font-bold text-white text-xs md:text-base flex items-center justify-center gap-2 relative z-10 px-2 group-hover:bg-blue-500/[0.02] transition-colors">
                     <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0"/> {row.v}
                  </div>
                  
                  {/* Claude */}
                  <div className="col-span-1 md:col-span-1 border-b border-white/5 py-4 text-center text-slate-400 flex items-center justify-center font-medium text-xs md:text-sm px-2 group-hover:bg-white/[0.02] transition-colors">
                     {row.c}
                  </div>
                  
                  {/* Manual */}
                  <div className="col-span-1 md:col-span-1 border-b border-white/5 py-4 text-center text-slate-500 flex items-center justify-center font-medium text-xs md:text-sm px-2 group-hover:bg-white/[0.02] transition-colors rounded-r-xl">
                     {row.m}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* FAQ */}
      <FAQ />

      {/* Final CTA */}
      <section className="py-32 bg-[#060D18] relative overflow-hidden">
        {/* Soft background glow exactly like the image */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight leading-[1.1]">
            Stop sending resumes<br/>
            <span className="bg-gradient-to-r from-[#4AA5FF] via-[#7B8BFF] to-[#A288FF] text-transparent bg-clip-text">
              into the void.
            </span>
          </h2>
          <p className="text-xl text-slate-400 mb-12 max-w-2xl mx-auto font-light">
            Join thousands of job seekers who are bypassing the ATS, doubling their interviews, and landing offers faster.
          </p>
          <button 
            onClick={() => window.location.href = 'https://app.vignova.io/login'} 
            className="group h-14 px-8 rounded-full bg-white text-[#0A192F] font-bold text-lg hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] flex items-center gap-3 mx-auto"
          >
            Start your free trial 
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
