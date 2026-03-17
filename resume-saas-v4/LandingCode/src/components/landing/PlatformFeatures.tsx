"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Layout, BarChart3, Kanban, Search, PenTool, Compass, Chrome } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const platformFeatures = [
    { icon: FileText, title: "AI Resume Generator", description: "Generate tailored resumes from any job description" },
    { icon: Layout, title: "Resume Templates", description: "Professional ATS-friendly templates" },
    { icon: BarChart3, title: "ATS Score Analysis", description: "Real-time compatibility scoring" },
    { icon: Kanban, title: "Job Tracker", description: "Visual pipeline for all applications" },
    { icon: Search, title: "Keyword Match Analysis", description: "Deep keyword gap analysis" },
    { icon: PenTool, title: "AI Resume Editor", description: "Intelligent editing with live preview" },
    { icon: Compass, title: "Job Discovery", description: "Find relevant opportunities faster" },
    { icon: Chrome, title: "Browser Autofill Extension", description: "One-click form completion" },
];

export const PlatformFeatures = () => {
    return (
        <section id="platform" className="py-24 relative overflow-hidden">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[400px] max-w-[600px] bg-[#00ff9c]/3 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-[1200px] mx-auto px-4 relative z-10">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        Powerful AI tools for modern job seekers
                    </h2>
                    <p className="text-gray-400 text-lg">
                        Everything you need to accelerate your job search, all in one platform.
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-30px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {platformFeatures.map((feature, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="relative p-6 rounded-2xl bg-zinc-900/50 border border-white/5 overflow-hidden group cursor-pointer backdrop-blur-sm"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#00ff9c]/0 to-[#00ff9c]/0 group-hover:from-[#00ff9c]/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center mb-4 group-hover:border-[#00ff9c]/20 transition-colors duration-300">
                                    <feature.icon className="w-5 h-5 text-[#00ff9c] group-hover:drop-shadow-[0_0_8px_rgba(0,255,156,0.5)] transition-all duration-300" />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1">{feature.title}</h3>
                                <p className="text-gray-500 text-xs leading-relaxed">{feature.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
