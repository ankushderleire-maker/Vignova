'use client';

import { motion } from 'framer-motion';
import { Target, Search, Zap, LineChart, MessageSquare, Briefcase } from 'lucide-react';

const features = [
  {
    icon: <Search className="w-5 h-5" />,
    title: "AI Job Matching",
    description: "Our algorithm finds roles that perfectly align with your skills and career trajectory.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "group-hover:border-blue-500/30",
    shadow: "group-hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)]"
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: "Smart ATS Targeting",
    description: "Automatically tailor your resume to pass Applicant Tracking Systems with absolute confidence.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "group-hover:border-emerald-500/30",
    shadow: "group-hover:shadow-[0_8px_30px_rgb(16,185,129,0.15)]"
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Mock Interviews",
    description: "Practice with an AI interviewer that adapts to the specific role and company you are applying for.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "group-hover:border-purple-500/30",
    shadow: "group-hover:shadow-[0_8px_30px_rgb(168,85,247,0.15)]"
  },
  {
    icon: <LineChart className="w-5 h-5" />,
    title: "Career Roadmap",
    description: "Visualize your trajectory with personalized milestones and skill-building suggestions.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "group-hover:border-amber-500/30",
    shadow: "group-hover:shadow-[0_8px_30px_rgb(245,158,11,0.15)]"
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Instant Feedback",
    description: "Get real-time feedback on your cover letters, emails, and portfolio presentations.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "group-hover:border-rose-500/30",
    shadow: "group-hover:shadow-[0_8px_30px_rgb(244,63,94,0.15)]"
  },
  {
    icon: <Briefcase className="w-5 h-5" />,
    title: "Salary Insights",
    description: "Negotiate better with AI-driven salary expectations based on real-time market data.",
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "group-hover:border-indigo-500/30",
    shadow: "group-hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)]"
  }
];

export default function FeaturesGrid() {
  return (
    <section className="py-24 relative bg-[#0A192F] overflow-hidden" id="features">
      {/* Dark background grid decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* Subtle radial glow in the center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 md:px-6 max-w-7xl relative z-10">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-16 mb-20 items-center">
          <div className="md:w-1/2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", damping: 20, stiffness: 100 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-semibold mb-6 shadow-sm"
            >
              <Zap className="w-4 h-4" /> Powering Your Career
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white"
            >
              Everything you need. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Nothing you don't.</span>
            </motion.h2>
          </div>
          <div className="md:w-1/2 flex items-center md:items-end md:pl-10 border-l-0 md:border-l border-white/10">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ type: "spring", damping: 20, stiffness: 100, delay: 0.2 }}
              className="text-lg lg:text-xl text-slate-400 font-light leading-relaxed tracking-tight"
            >
              Vignova combines powerful AI with intuitive, minimalist design to give you the ultimate edge in your career development. Stop jumping between tools.
            </motion.p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ type: "spring", damping: 25, stiffness: 120, delay: index * 0.1 }}
              className={`group relative p-8 bg-[#112240]/80 backdrop-blur-sm rounded-3xl border border-white/5 shadow-lg ${feature.shadow} transition-all duration-300 hover:-translate-y-1 overflow-hidden ${feature.border}`}
            >
              {/* Subtle gradient glow in the corner on hover */}
              <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${feature.bg}`} />

              <div className={`w-12 h-12 rounded-2xl ${feature.bg} ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 ease-out relative z-10 border border-white/5`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight text-white relative z-10">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed font-light relative z-10">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
