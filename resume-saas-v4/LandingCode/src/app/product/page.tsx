"use client";

import React from 'react';
import { PageLayout } from '@/components/landing/PageLayout';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

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
        title: "AI Resume Generator",
        description: "Paste any job description and get a tailored resume in seconds. Vignova's AI analyzes the role, matches it with your master profile, and generates optimized content that highlights the most relevant experience.",
        image: "/hiw_img/3_resume_generator.png?v=2",
        highlights: ["Job description analysis", "Smart skill matching", "One-click generation", "Credit-based usage"],
    },
    {
        title: "ATS Score Optimization",
        description: "Get real-time ATS compatibility scoring with detailed breakdowns. See exactly which keywords you're matching, what's missing, and receive AI-powered suggestions to push your score higher.",
        image: "/hiw_img/5_ats_analysis.png?v=2",
        highlights: ["Keyword match scoring", "Theory & skills analysis", "Missing keyword alerts", "Improvement suggestions"],
    },
    {
        title: "Master Career Profile",
        description: "Build a comprehensive career profile once with all your experience, skills, education, and projects. This master profile becomes the foundation that Vignova uses to generate unlimited tailored resumes.",
        image: "/hiw_img/2_master_profile.png?v=2",
        highlights: ["Full work history", "Skills & certifications", "Education records", "Project portfolio"],
    },
    {
        title: "Visual Job Tracker",
        description: "Track every application through a Kanban-style pipeline. Move jobs between stages â€” saved, applied, interviewing, and offers. Get a bird's eye view of your entire job search with analytics.",
        image: "/hiw_img/4_job_tracker.png?v=2",
        highlights: ["Kanban board view", "Application stages", "Status tracking", "Search & filter"],
    },
    {
        title: "AI Resume Editor",
        description: "Fine-tune generated resumes with an intelligent editor. Get AI suggestions for improving bullet points, language impact, and content relevance â€” with a live preview side panel.",
        image: "/hiw_img/7_ai_resume_editor.png?v=2",
        highlights: ["Live preview", "AI suggestions", "Content refinement", "Format control"],
    },
    {
        title: "Professional Templates",
        description: "Export polished, ATS-friendly resumes using professional templates. Each template is designed for maximum readability by both humans and applicant tracking systems.",
        image: "/hiw_img/8_resume_templates.png?v=2",
        highlights: ["ATS-optimized", "Clean layouts", "PDF export", "Multiple styles"],
    },
    {
        title: "Chrome Extension",
        description: "Browse LinkedIn, Indeed, or any job board and use Vignova directly in your browser. One-click resume tailoring, autofill job applications, upload resumes, and match keywords â€” all without leaving the page.",
        image: "/hiw_img/ext_1_linkedin_panel.png?v=2",
        highlights: ["LinkedIn integration", "Auto-fill forms", "Keyword matching", "Resume upload"],
    },
    {
        title: "Smart Job Discovery",
        description: "Find relevant job opportunities faster with Vignova's aggregated job feed. Filter by role, location, remote options, and more â€” then save and apply directly from the platform.",
        image: "/hiw_img/6_job_finder.png?v=2",
        highlights: ["Aggregated listings", "Advanced filters", "Save & apply", "Remote options"],
    },
];

export default function ProductPage() {
    return (
        <PageLayout>
            <div className="max-w-4xl">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        The AI Career Platform Built for Job Seekers
                    </h1>
                    <p className="text-gray-400 text-lg mb-8 max-w-2xl">
                        Vignova combines AI resume generation, ATS optimization, job tracking, and browser automation
                        into one seamless platform â€” so you spend less time applying and more time interviewing.
                    </p>
                    <button
                        onClick={() => window.location.href = 'https://app.vignova.io/login'}
                        className="inline-flex items-center px-8 py-3 bg-[#00ff9c] text-black font-bold rounded-xl hover:bg-[#33ffb0] hover:shadow-[0_0_30px_rgba(0,255,156,0.2)] transition-all cursor-pointer"
                    >
                        Get Started Free
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                </motion.div>

                {/* Dashboard Screenshot */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="mb-20 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,255,156,0.08)]"
                >
                    <Image
                        src="/hiw_img/1_dashboard.png?v=2"
                        alt="Vignova Dashboard"
                        width={1200}
                        height={700}
                        loading="eager"
                        className="w-full h-auto"
                    />
                </motion.div>

                {/* Feature Sections with Images */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
                    }}
                    className="space-y-20"
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            className="space-y-6"
                        >
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                                    {feature.title}
                                </h2>
                                <p className="text-gray-400 leading-relaxed max-w-2xl">
                                    {feature.description}
                                </p>
                            </div>

                            {/* Highlight Tags */}
                            <div className="flex flex-wrap gap-2">
                                {feature.highlights.map((h, i) => (
                                    <span
                                        key={i}
                                        className="px-3 py-1 text-xs font-medium rounded-full bg-[#00ff9c]/5 border border-[#00ff9c]/15 text-[#00ff9c]"
                                    >
                                        {h}
                                    </span>
                                ))}
                            </div>

                            {/* Screenshot */}
                            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] group">
                                <Image
                                    src={feature.image}
                                    alt={feature.title}
                                    width={1200}
                                    height={700}
                                    loading="eager"
                                    className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.01]"
                                />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="mt-20 text-center p-10 rounded-2xl bg-gradient-to-b from-zinc-900/50 to-transparent border border-white/5"
                >
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to upgrade your job search?</h2>
                    <p className="text-gray-400 mb-6">Start generating tailored resumes and landing more interviews today.</p>
                    <button
                        onClick={() => window.location.href = 'https://app.vignova.io/login'}
                        className="inline-flex items-center px-8 py-3 bg-[#00ff9c] text-black font-bold rounded-xl hover:bg-[#33ffb0] transition-all cursor-pointer"
                    >
                        Start Free
                        <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                </motion.div>
            </div>
        </PageLayout>
    );
}
