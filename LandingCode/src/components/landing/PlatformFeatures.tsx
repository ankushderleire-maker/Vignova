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
        <section id="platform" className="py-24 relative overflow-hidden bg-slate-50">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[400px] max-w-[600px] bg-blue-500/3 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-[1200px] mx-auto px-4 relative z-10">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
                        Powerful AI tools for modern job seekers
                    </h2>
                    <p className="text-slate-500 text-lg">
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
                            className="relative p-6 rounded-2xl bg-white border border-slate-200 overflow-hidden group cursor-pointer shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

                            <div className="relative z-10">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 group-hover:border-blue-200 transition-colors duration-300">
                                    <feature.icon className="w-5 h-5 text-blue-600 group-hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-all duration-300" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-900 mb-1">{feature.title}</h3>
                                <p className="text-slate-500 text-xs leading-relaxed">{feature.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
