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

const steps = [
    {
        image: "/hiw_img/2_master_profile.png?v=2",
        title: "Create Your Master Profile",
        description: "Start by building a comprehensive career profile with all your work experience, skills, education, certifications, and project history. This master profile serves as Vignova's knowledge base about you â€” it's the foundation for generating unlimited tailored resumes.",
    },
    {
        image: "/hiw_img/3_resume_generator.png?v=2",
        title: "Generate Tailored Resumes",
        description: "Paste any job description into the Resume Generator and Vignova's AI will instantly create a tailored resume. The AI analyzes the role requirements, matches them against your master profile, and highlights the most relevant qualifications, skills, and achievements.",
    },
    {
        image: "/hiw_img/5_ats_analysis.png?v=2",
        title: "Analyze ATS Compatibility",
        description: "Run your resume through the ATS Score analyzer to see how well it matches the job description. Get detailed keyword match breakdowns, missing keyword alerts, theory vs skills scoring, and actionable suggestions to boost your compatibility score.",
    },
    {
        image: "/hiw_img/4_job_tracker.png?v=2",
        title: "Track Your Applications",
        description: "Organize your entire job search with the visual Job Tracker. Move applications through stages â€” saved, applied, interviewing, and offers â€” using a Kanban-style board. Filter, search, and never lose track of where you stand.",
    },
    {
        image: "/hiw_img/7_ai_resume_editor.png?v=2",
        title: "Refine with AI Editor",
        description: "Fine-tune any generated resume with the AI-powered editor. Get intelligent suggestions for bullet points, impact language, and formatting. See changes in real-time with the live preview panel before exporting.",
    },
    {
        image: "/hiw_img/8_resume_templates.png?v=2",
        title: "Export Professional Resumes",
        description: "Choose from professionally designed, ATS-friendly templates and export your finalized resume as a polished PDF. Every template is optimized for maximum readability by both humans and applicant tracking systems.",
    },
];

export default function HowItWorksPage() {
    return (
        <PageLayout>
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#00ff9c]/20 bg-[#00ff9c]/5 text-[#00ff9c] text-xs font-medium mb-6">
                        How It Works
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        Your AI-powered job search workflow
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                        From building your career profile to landing interviews â€” here&apos;s how Vignova streamlines every step of your job search.
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
                    }}
                    className="space-y-24"
                >
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            className="space-y-6"
                        >
                            {/* Step number + text */}
                            <div className="space-y-3 flex flex-col items-center text-center">
                                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#00ff9c]/10 border border-[#00ff9c]/20 text-[#00ff9c] font-bold text-sm">
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                                    {step.title}
                                </h2>
                                <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
                                    {step.description}
                                </p>
                            </div>

                            {/* Screenshot */}
                            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] group">
                                <Image
                                    src={step.image}
                                    alt={step.title}
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
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to get started?</h2>
                    <p className="text-gray-400 mb-6">Create your master profile and generate your first tailored resume in minutes.</p>
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
