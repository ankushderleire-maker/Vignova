"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const fadeInLeft = {
    hidden: { opacity: 0, x: -40 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const fadeInRight = {
    hidden: { opacity: 0, x: 40 },
    visible: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const features = [
    {
        title: "AI Resume Generator",
        description: "Land more interviews by tailoring your resume for every job in seconds. Paste any job description and Vignova's AI instantly analyzes the role requirements, matches them against your full career history, and generates a professionally optimized resume that highlights exactly what recruiters are looking for.",
        image: "/hiw_img/3_resume_generator.png",
        highlights: ["Job description analysis", "Smart skill matching", "One-click generation", "Instant tailoring"],
    },
    {
        title: "ATS Score Optimization",
        description: "Stop getting filtered out by applicant tracking systems. Get real-time ATS compatibility scoring with detailed keyword breakdowns — see exactly which skills and phrases you're matching, identify critical gaps, and receive AI-powered rewording suggestions to push your resume score above the threshold.",
        image: "/hiw_img/5_ats_analysis.png",
        highlights: ["Keyword match scoring", "Gap identification", "AI rewrite suggestions", "Score improvement tips"],
    },
    {
        title: "AI Resume Editor",
        description: "Perfect every bullet point with an intelligent editing experience. Vignova's AI editor helps you strengthen weak language, quantify achievements, and improve content relevance — all with a live side-by-side preview so you see changes instantly before exporting.",
        image: "/hiw_img/7_ai_resume_editor.png",
        highlights: ["Live side preview", "AI-powered rewrites", "Impact scoring", "One-click improvements"],
    },
    {
        title: "Master Career Profile",
        description: "Build your complete career profile once and never write a resume from scratch again. Add all your work experience, skills, education, certifications, and projects into one centralized profile — Vignova uses this as your personal knowledge base to generate unlimited tailored resumes for any role.",
        image: "/hiw_img/2_master_profile.png",
        highlights: ["One-time setup", "Unlimited resumes", "Skills & certifications", "Project portfolio"],
    },
    {
        title: "Chrome Extension",
        description: "Apply to jobs without ever leaving the page. Vignova's browser extension works directly on LinkedIn, Indeed, and all major job boards — letting you tailor resumes, auto-fill application forms, match keywords, and upload documents in one seamless workflow.",
        image: "/hiw_img/ext_1_linkedin_panel.png",
        highlights: ["LinkedIn integration", "Auto-fill forms", "Keyword matching", "One-click apply"],
    },
    {
        title: "Visual Job Tracker",
        description: "Stay organized throughout your job search with a Kanban-style pipeline. Drag and drop applications between stages — saved, applied, interviewing, and offers — and get a clear bird's-eye view of every opportunity you're pursuing.",
        image: "/hiw_img/4_job_tracker.png",
        highlights: ["Kanban board view", "Drag & drop stages", "Status tracking", "Search & filter"],
    },
    {
        title: "Professional Templates",
        description: "Export polished, recruiter-ready resumes with templates designed for both human readability and ATS compatibility. Choose from multiple clean, modern layouts and download as PDF instantly.",
        image: "/hiw_img/8_resume_templates.png",
        highlights: ["ATS-friendly formats", "Modern layouts", "PDF export", "Multiple styles"],
    },
    {
        title: "Smart Job Discovery",
        description: "Discover relevant opportunities faster with Vignova's aggregated job feed. Filter listings by role, location, and remote options — then save interesting positions or apply directly from the platform.",
        image: "/hiw_img/6_job_finder.png",
        highlights: ["Aggregated listings", "Advanced filters", "Save & apply", "Remote options"],
    },
];

export const ProductShowcase = () => {
    return (
        <section className="relative py-24 md:py-32 overflow-hidden">
            {/* Subtle background effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-white pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/3 blur-[150px] rounded-full pointer-events-none" />

            <div className="relative z-10 max-w-[1200px] mx-auto px-4">
                {/* Section Header */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={fadeUp}
                    className="text-center mb-16"
                >
                    <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase text-blue-600 bg-blue-50 border border-blue-100 mb-6">
                        Platform Overview
                    </span>
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
                        Everything You Need to Land
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400"> Your Dream Job</span>
                    </h2>
                    <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                        From AI-powered resume generation to job tracking and browser automation — Vignova is your complete career toolkit.
                    </p>
                </motion.div>

                {/* Dashboard Screenshot */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-80px" }}
                    variants={fadeUp}
                    className="mb-24 md:mb-32 rounded-2xl overflow-hidden border border-slate-200 shadow-[0_0_80px_rgba(37,99,235,0.06)] group"
                >
                    <Image
                        src="/hiw_img/1_dashboard.png"
                        alt="Vignova Dashboard Overview"
                        width={1400}
                        height={800}
                        loading="eager"
                        className="w-full h-auto transition-transform duration-700 group-hover:scale-[1.01]"
                    />
                </motion.div>

                {/* Zig-Zag Feature Sections */}
                <div className="space-y-24 md:space-y-32">
                    {features.map((feature, index) => {
                        const isEven = index % 2 === 0;
                        return (
                            <div
                                key={index}
                                className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-10 lg:gap-16`}
                            >
                                {/* Image Side */}
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-80px" }}
                                    variants={isEven ? fadeInLeft : fadeInRight}
                                    className="w-full lg:w-[55%] flex-shrink-0"
                                >
                                    <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-[0_0_40px_rgba(0,0,0,0.08)] group relative">
                                        {/* Subtle glow behind image on hover */}
                                        <div className="absolute -inset-1 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-400/3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
                                        <Image
                                            src={feature.image}
                                            alt={feature.title}
                                            width={1200}
                                            height={700}
                                            loading="lazy"
                                            className="w-full h-auto relative z-10 transition-transform duration-500 group-hover:scale-[1.02]"
                                        />
                                    </div>
                                </motion.div>

                                {/* Text Side */}
                                <motion.div
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, margin: "-80px" }}
                                    variants={isEven ? fadeInRight : fadeInLeft}
                                    className="w-full lg:w-[45%] space-y-5"
                                >
                                    {/* Feature number badge */}
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 text-sm font-bold">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <div className="h-px flex-1 bg-gradient-to-r from-blue-200 to-transparent" />
                                    </div>

                                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                                        {feature.title}
                                    </h3>

                                    <p className="text-slate-500 leading-relaxed text-base md:text-lg">
                                        {feature.description}
                                    </p>

                                    {/* Highlight Tags */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {feature.highlights.map((h, i) => (
                                            <span
                                                key={i}
                                                className="px-3 py-1.5 text-xs font-medium rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 transition-colors duration-300"
                                            >
                                                {h}
                                            </span>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};
