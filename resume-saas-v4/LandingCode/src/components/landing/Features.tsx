"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Search, BarChart3 } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const features = [
    {
        icon: FileText,
        title: "AI Resume Generator",
        description: "Generate tailored resumes instantly from job descriptions. Our AI analyzes each role and creates optimized content that highlights your most relevant experience.",
    },
    {
        icon: Search,
        title: "ATS Optimization",
        description: "Analyze resume keyword matches and improve compatibility with Applicant Tracking Systems. Get real-time scoring and actionable suggestions.",
    },
    {
        icon: BarChart3,
        title: "Job Application Tracker",
        description: "Manage every job application in one intelligent dashboard. Track your pipeline from saved to interviewing to offers with visual analytics.",
    }
];

export const Features = () => {
    return (
        <section id="features" className="py-24 relative">
            <div className="max-w-[1200px] mx-auto px-4 z-10 relative">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                        Everything you need to land more interviews
                    </h2>
                    <p className="text-gray-400 text-lg">
                        AI-powered tools designed to give you the competitive edge in today&apos;s job market.
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-30px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
                    }}
                    className="grid md:grid-cols-3 gap-6"
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            whileHover={{ y: -5 }}
                            className="relative flex flex-col p-6 md:p-8 rounded-3xl bg-[#0c0c0e] border border-white/5 overflow-hidden group cursor-pointer h-full"
                        >
                            {/* Bottom Green Glow Layer */}
                            <div className="absolute -bottom-[20%] left-0 right-0 h-[60%] bg-[#00ff9c]/10 blur-[60px] group-hover:bg-[#00ff9c]/20 transition-all duration-500 pointer-events-none z-0" />

                            {/* Icon Container */}
                            <div className="w-12 h-12 rounded-xl bg-zinc-900/80 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(255,255,255,0.03)] relative z-10 group-hover:scale-110 transition-transform duration-300">
                                <feature.icon className="w-5 h-5 text-[#00ff9c] drop-shadow-[0_0_6px_rgba(0,255,156,0.4)]" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-3 tracking-tight leading-snug">{feature.title}</h3>
                                <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-6">
                                    {feature.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
