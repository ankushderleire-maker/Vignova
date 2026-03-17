"use client";

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const steps = [
    {
        image: "/hiw_img/2_master_profile.png?v=2",
        title: "Create Your Master Profile",
        description: "Create a master career profile containing your experience, skills, education, and achievements. This becomes the foundation for all your tailored resumes.",
    },
    {
        image: "/hiw_img/3_resume_generator.png?v=2",
        title: "Generate Tailored Resumes",
        description: "Select any job description and instantly generate a tailored resume optimized for that role. AI matches your profile to key requirements.",
    },
    {
        image: "/hiw_img/5_ats_analysis.png?v=2",
        title: "Analyze ATS Compatibility",
        description: "Analyze how well your resume matches the job using AI-powered ATS scoring. Get keyword insights and actionable improvement suggestions.",
    },
    {
        image: "/hiw_img/4_job_tracker.png?v=2",
        title: "Track Your Applications",
        description: "Track job applications in a visual pipeline from saved to interviewing and offers. Never lose track of your job search progress.",
    },
    {
        image: "/hiw_img/7_ai_resume_editor.png?v=2",
        title: "Edit with AI Assistance",
        description: "Edit resumes using an AI-powered editor with real-time preview. Get intelligent suggestions to improve impact and readability.",
    },
    {
        image: "/hiw_img/8_resume_templates.png?v=2",
        title: "Export Professional Resumes",
        description: "Export resumes using professional ATS-friendly templates. Clean, modern designs that pass through any applicant tracking system.",
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

export const HowItWorks = () => {
    return (
        <section id="how-it-works" className="py-24 bg-black relative overflow-hidden">
            {/* Subtle background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00ff9c]/3 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-[1200px] mx-auto px-4 relative z-10">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    className="text-center max-w-3xl mx-auto mb-20"
                >
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#00ff9c]/20 bg-[#00ff9c]/5 text-[#00ff9c] text-xs font-medium mb-6">
                        How It Works
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
                        Your AI-powered job search workflow
                    </h2>
                </motion.div>

                <div className="space-y-28 md:space-y-36">
                    {steps.map((step, index) => {
                        const isReversed = index % 2 !== 0;
                        return (
                            <motion.div
                                key={index}
                                initial="hidden"
                                whileInView="visible"
                                viewport={{ once: true, margin: "-30px" }}
                                variants={{
                                    hidden: { opacity: 0 },
                                    visible: {
                                        opacity: 1,
                                        transition: { staggerChildren: 0.15 }
                                    }
                                }}
                                className="space-y-6"
                            >
                                {/* Text */}
                                <motion.div
                                    variants={fadeUp}
                                    className={`flex ${isReversed ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className="max-w-xl space-y-3">
                                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#00ff9c]/10 border border-[#00ff9c]/20 text-[#00ff9c] font-bold text-sm">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                                            {step.title}
                                        </h3>
                                        <p className="text-gray-400 text-base md:text-lg leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </motion.div>

                                {/* Image - Full Width */}
                                <motion.div
                                    variants={fadeUp}
                                    className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#00ff9c]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10" />
                                    <Image
                                        src={step.image}
                                        alt={step.title}
                                        width={1200}
                                        height={700}
                                        loading="eager"
                                        className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.01]"
                                    />
                                </motion.div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
