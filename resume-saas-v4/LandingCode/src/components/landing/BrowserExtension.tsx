"use client";

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MousePointerClick, Search, Zap, Upload, Copy } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const extensionFeatures = [
    {
        icon: MousePointerClick,
        title: "One-click resume tailoring",
        description: "Generate tailored resumes directly from LinkedIn or Indeed with a single click.",
    },
    {
        icon: Search,
        title: "Keyword match insights",
        description: "See how well your profile matches the job description in real-time.",
    },
    {
        icon: Zap,
        title: "Auto-fill job applications",
        description: "Automatically populate job application forms with your profile data.",
    },
    {
        icon: Upload,
        title: "Resume attachment automation",
        description: "Select and upload resumes from your Vignova dashboard directly.",
    },
    {
        icon: Copy,
        title: "Profile quick copy",
        description: "Copy personal details instantly during job applications.",
    },
];

const extensionScreenshots = [
    { src: "/hiw_img/ext_1_linkedin_panel.png?v=2", alt: "LinkedIn Job Panel", label: "LinkedIn Integration" },
    { src: "/hiw_img/ext_2_keyword_match.png?v=2", alt: "Keyword Matching", label: "Keyword Analysis" },
    { src: "/hiw_img/ext_3_autofill_form.png?v=2", alt: "Auto-fill Forms", label: "Auto-fill Forms" },
    { src: "/hiw_img/ext_4_resume_upload.png?v=2", alt: "Resume Upload", label: "Resume Upload" },
    { src: "/hiw_img/ext_5_extension_profile.png?v=2", alt: "Extension Profile", label: "Quick Profile" },
];

export const BrowserExtension = () => {
    return (
        <section id="extension" className="py-24 bg-zinc-950 relative overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-full h-[500px] max-w-[500px] bg-[#00ff9c]/3 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-[1200px] mx-auto px-4 relative z-10">
                {/* Header */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#00ff9c]/20 bg-[#00ff9c]/5 text-[#00ff9c] text-xs font-medium mb-6">
                        Chrome Extension
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        Your AI job assistant inside your browser
                    </h2>
                    <p className="text-gray-400 text-lg">
                        The Vignova browser extension integrates directly with job boards to help you apply faster.
                    </p>
                </motion.div>

                {/* Extension Screenshots - Uniform Grid */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-30px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                    }}
                    className="mb-16"
                >
                    {/* Top row: 3 screenshots */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {extensionScreenshots.slice(0, 3).map((screenshot, index) => (
                            <motion.div
                                key={index}
                                variants={fadeUp}
                                className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 group"
                            >
                                <div className="aspect-[4/3] relative overflow-hidden">
                                    <Image
                                        src={screenshot.src}
                                        alt={screenshot.alt}
                                        fill
                                        loading="eager"
                                        className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                                    />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
                                    <span className="text-white text-xs font-medium">{screenshot.label}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    {/* Bottom row: 2 screenshots */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {extensionScreenshots.slice(3, 5).map((screenshot, index) => (
                            <motion.div
                                key={index + 3}
                                variants={fadeUp}
                                className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 group"
                            >
                                <div className="aspect-[16/9] relative overflow-hidden">
                                    <Image
                                        src={screenshot.src}
                                        alt={screenshot.alt}
                                        fill
                                        loading="eager"
                                        className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                                    />
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10">
                                    <span className="text-white text-xs font-medium">{screenshot.label}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Feature Cards */}
                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-30px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.06 } }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
                >
                    {extensionFeatures.map((feature, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            whileHover={{ y: -4 }}
                            className="relative p-5 rounded-2xl bg-[#0c0c0e] border border-white/5 overflow-hidden group cursor-pointer"
                        >
                            <div className="absolute -bottom-[30%] left-0 right-0 h-[60%] bg-[#00ff9c]/5 blur-[40px] group-hover:bg-[#00ff9c]/15 transition-all duration-500 pointer-events-none z-0" />

                            <div className="relative z-10">
                                <div className="w-10 h-10 rounded-lg bg-zinc-900/80 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <feature.icon className="w-4 h-4 text-[#00ff9c]" />
                                </div>
                                <h3 className="text-sm font-bold text-white mb-1.5">{feature.title}</h3>
                                <p className="text-gray-500 text-xs leading-relaxed">{feature.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
