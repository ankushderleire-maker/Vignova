"use client";

import React from 'react';
import { PageLayout } from '@/components/landing/PageLayout';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MousePointerClick, Search, Zap, Upload, Copy, ArrowRight, Chrome, User, CheckCircle2, FileCheck2, Send, Database, FileText } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const KeywordAnalysisVisual = () => (
    <div className="w-full h-full bg-zinc-950 rounded-3xl flex items-center justify-center p-4 sm:p-8 relative overflow-hidden ring-1 ring-white/5">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
        
        <motion.div 
            className="w-full max-w-[340px] bg-zinc-900 border border-white/10 rounded-xl p-5 shadow-2xl relative z-10 flex flex-col"
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
        >
            <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-[#00ff9c]" />
                    <span className="text-white font-medium">Scanning JD...</span>
                </div>
                <motion.div 
                    className="text-[#00ff9c] font-bold text-sm bg-[#00ff9c]/10 px-2 py-1 rounded"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                >
                    98% Rank
                </motion.div>
            </div>

            <div className="space-y-4">
                <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-zinc-700 w-3/4" />
                </div>
                <div className="flex gap-2">
                    <motion.div className="h-6 px-3 rounded text-xs flex items-center bg-[#00ff9c]/20 text-[#00ff9c] border border-[#00ff9c]/30 font-medium"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.5 }}
                    >
                        React.js
                    </motion.div>
                    <motion.div className="h-3 w-1/2 bg-zinc-800 rounded-full mt-1.5" />
                </div>
                <div className="h-3 w-5/6 bg-zinc-800 rounded-full" />
                <div className="flex gap-2">
                    <motion.div className="h-3 w-1/3 bg-zinc-800 rounded-full mt-1.5" />
                    <motion.div className="h-6 px-3 rounded text-xs flex items-center bg-[#00ff9c]/20 text-[#00ff9c] border border-[#00ff9c]/30 font-medium"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.5 }}
                    >
                        TypeScript
                    </motion.div>
                </div>
                <div className="h-3 w-2/3 bg-zinc-800 rounded-full" />
            </div>
        </motion.div>
        
        {/* scanning laser line */}
        <motion.div 
            className="absolute top-0 left-0 w-full h-[2px] bg-[#00ff9c] shadow-[0_0_20px_#00ff9c] z-20"
            animate={{ top: ["10%", "90%", "10%"] }}
            transition={{ duration: 3, ease: "linear", repeat: Infinity }}
        />
    </div>
);

const AutoFillVisual = () => (
    <div className="w-full h-full bg-zinc-950 rounded-3xl flex items-center justify-center p-4 sm:p-8 relative overflow-hidden ring-1 ring-white/5">
        
        {/* Mock Browser Extension Bar */}
        <div className="absolute top-6 right-6 flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-full px-3 py-1.5 shadow-lg z-20">
            <motion.div 
                className="w-5 h-5 bg-[#00ff9c] rounded flex items-center justify-center shadow-[0_0_10px_rgba(0,255,156,0.2)]"
                animate={{ scale: [1, 1, 0.9, 1.2, 1, 1], boxShadow: ["0 0 10px rgba(0,255,156,0.2)", "0 0 10px rgba(0,255,156,0.2)", "0 0 10px rgba(0,255,156,0.2)", "0 0 25px rgba(0,255,156,0.8)", "0 0 10px rgba(0,255,156,0.2)", "0 0 10px rgba(0,255,156,0.2)"] }}
                transition={{ duration: 6, repeat: Infinity, times: [0, 0.25, 0.28, 0.35, 0.5, 1] }}
            >
                <span className="text-black text-[10px] font-bold">V</span>
            </motion.div>
            <span className="text-white text-xs font-medium pr-1">Auto-fill</span>
        </div>

        <motion.div 
            className="w-full max-w-[340px] bg-zinc-900 border border-white/10 rounded-xl p-6 shadow-2xl relative z-10 flex flex-col"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
        >
            <div className="flex items-center gap-3 mb-6 text-white pb-4 border-b border-white/5 bg-zinc-900">
                <CheckCircle2 className="w-5 h-5 text-[#00ff9c]" />
                <span className="font-medium">Application Form</span>
            </div>

            <div className="space-y-5">
                <div className="space-y-2">
                    <span className="text-xs text-zinc-500 font-medium pl-1">Full Name</span>
                    <div className="h-10 w-full bg-zinc-950 border border-zinc-800 rounded-lg flex items-center px-3 relative overflow-hidden">
                        <motion.div 
                            className="absolute left-0 top-0 bottom-0 bg-[#00ff9c]/5"
                            animate={{ opacity: [0, 0, 1, 1, 0] }}
                            transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.5, 0.85, 1] }}
                        />
                        <motion.div 
                            className="text-[#00ff9c] text-sm font-medium tracking-wide whitespace-nowrap"
                            animate={{ clipPath: ["inset(0 100% 0 0)", "inset(0 100% 0 0)", "inset(0 0% 0 0)", "inset(0 0% 0 0)", "inset(0 100% 0 0)"] }}
                            transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.5, 0.85, 1], ease: "easeInOut" }}
                        >
                            Alexander Wright
                        </motion.div>
                        <motion.div 
                            className="absolute left-3 w-[2px] h-5 bg-[#00ff9c]"
                            animate={{ 
                                left: ["0.75rem", "0.75rem", "8.5rem", "8.5rem", "0.75rem"],
                                opacity: [0, 1, 1, 0, 0]
                            }}
                            transition={{ duration: 6, repeat: Infinity, times: [0, 0.4, 0.5, 0.85, 1], ease: "linear" }}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <span className="text-xs text-zinc-500 font-medium pl-1">Email Address</span>
                    <div className="h-10 w-full bg-zinc-950 border border-zinc-800 rounded-lg flex items-center px-3 relative overflow-hidden">
                        <motion.div 
                            className="absolute left-0 top-0 bottom-0 bg-[#00ff9c]/5"
                            animate={{ opacity: [0, 0, 1, 1, 0] }}
                            transition={{ duration: 6, repeat: Infinity, times: [0, 0.5, 0.6, 0.85, 1] }}
                        />
                        <motion.div 
                            className="text-[#00ff9c] text-sm font-medium tracking-wide whitespace-nowrap"
                            animate={{ clipPath: ["inset(0 100% 0 0)", "inset(0 100% 0 0)", "inset(0 0% 0 0)", "inset(0 0% 0 0)", "inset(0 100% 0 0)"] }}
                            transition={{ duration: 6, repeat: Infinity, times: [0, 0.5, 0.6, 0.85, 1], ease: "easeInOut" }}
                        >
                            alex.wright@example.com
                        </motion.div>
                        <motion.div 
                            className="absolute left-3 w-[2px] h-5 bg-[#00ff9c]"
                            animate={{ 
                                left: ["0.75rem", "0.75rem", "13.5rem", "13.5rem", "0.75rem"],
                                opacity: [0, 0, 1, 0, 0]
                            }}
                            transition={{ duration: 6, repeat: Infinity, times: [0, 0.5, 0.6, 0.85, 1], ease: "linear" }}
                        />
                    </div>
                </div>
                <motion.div 
                    className="h-10 w-full bg-[#00ff9c] rounded-lg mt-4 flex items-center justify-center opacity-50 relative overflow-hidden"
                    animate={{ opacity: [0.3, 0.3, 1, 0.3, 0.3], scale: [1, 1, 1.05, 1, 1] }}
                    transition={{ duration: 6, repeat: Infinity, times: [0, 0.65, 0.75, 0.85, 1] }}
                >
                     <div className="absolute inset-0 bg-white/20" />
                    <div className="h-2 w-16 bg-zinc-900/80 rounded z-10" />
                </motion.div>
            </div>
        </motion.div>

        {/* Animated Cursor */}
        <motion.div
            className="absolute z-30 pointer-events-none"
            animate={{ 
                top: ["80%", "36px", "36px", "80%"],
                right: ["20%", "72px", "72px", "20%"],
                scale: [1, 1, 0.8, 1, 1]
            }}
            transition={{ duration: 6, repeat: Infinity, times: [0, 0.25, 0.28, 0.35, 1], ease: "easeInOut" }}
        >
            <div className="relative">
                <MousePointerClick className="w-8 h-8 text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)] fill-zinc-900/80" />
                <motion.div 
                    className="absolute top-1 left-1 w-6 h-6 bg-white/50 rounded-full blur-[4px]"
                    animate={{ scale: [0, 0, 1.5, 0, 0], opacity: [0, 0, 1, 0, 0] }}
                    transition={{ duration: 6, repeat: Infinity, times: [0, 0.25, 0.28, 0.35, 1] }}
                />
            </div>
        </motion.div>
    </div>
);

const ResumeUploadVisual = () => (
    <div className="w-full h-full bg-zinc-950 rounded-3xl flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-hidden ring-1 ring-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,156,0.05)_0,transparent_50%)]" />
         <div className="flex items-center justify-center gap-8 w-full mt-4">
            {/* Dropzone */}
            <motion.div 
                className="w-36 h-36 border-2 border-dashed border-[#00ff9c]/30 rounded-2xl bg-[#00ff9c]/5 flex flex-col items-center justify-center gap-3 relative"
                animate={{ borderColor: ["rgba(0,255,156,0.2)", "rgba(0,255,156,0.6)", "rgba(0,255,156,0.2)"] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                <Upload className="w-8 h-8 text-[#00ff9c]/40" />
                <span className="text-xs text-[#00ff9c]/60 font-medium tracking-wider uppercase">Drop Target</span>
                
                <motion.div 
                    className="absolute inset-0 bg-[#00ff9c]/20 rounded-2xl"
                    animate={{ scale: [1, 1.3, 1], opacity: [0, 0.8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, times: [0, 0.5, 1], delay: 1 }}
                />
            </motion.div>

            {/* File stack */}
            <div className="relative w-28 h-36 border border-white/5 rounded-xl bg-zinc-900/50 flex items-center justify-center shadow-2xl">
                {/* The active file moving */}
                <motion.div 
                    className="absolute w-24 h-32 bg-zinc-800 border border-[#00ff9c]/50 rounded-lg shadow-[0_0_20px_rgba(0,255,156,0.15)] flex flex-col items-center justify-center gap-3 z-10"
                    animate={{ 
                        x: [0, -140, -140, 0], 
                        scale: [1, 0.8, 0.8, 1],
                        opacity: [1, 0.8, 0, 1]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                    <FileText className="w-10 h-10 text-[#00ff9c]" />
                    <div className="h-1.5 w-12 bg-[#00ff9c]/30 rounded-full" />
                    <div className="h-1.5 w-8 bg-[#00ff9c]/30 rounded-full" />
                </motion.div>
            </div>
         </div>
    </div>
);

const QuickProfileVisual = () => (
    <div className="w-full h-full bg-zinc-950 rounded-3xl flex items-center justify-center p-8 relative overflow-hidden ring-1 ring-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,156,0.1)_0,transparent_60%)] pointer-events-none" />

        {/* Center Profile */}
        <motion.div 
            className="w-24 h-24 bg-zinc-900 border-2 border-[#00ff9c] rounded-full shadow-[0_0_40px_rgba(0,255,156,0.2)] flex items-center justify-center relative z-20"
            animate={{ y: [-10, 10, -10] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            <User className="w-10 h-10 text-[#00ff9c]" />

            {/* Satellite Nodes */}
            <motion.div className="absolute -top-16 -left-16 w-14 h-14 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center shadow-xl">
                <FileCheck2 className="w-6 h-6 text-zinc-500" />
            </motion.div>
            
            <motion.div className="absolute top-4 -right-20 w-16 h-12 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center shadow-xl">
                <Send className="w-6 h-6 text-zinc-500" />
            </motion.div>

            <motion.div className="absolute -bottom-14 left-4 w-14 h-14 bg-zinc-900 border border-white/10 rounded-xl flex items-center justify-center shadow-xl">
                <Database className="w-6 h-6 text-zinc-500" />
            </motion.div>

            {/* Animated connectors / Data packets */}
            <motion.div 
                className="absolute w-3 h-3 bg-[#00ff9c] rounded-full shadow-[0_0_12px_#00ff9c]"
                animate={{ x: [0, -60], y: [0, -60], opacity: [1, 0], scale: [1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
            />
            <motion.div 
                className="absolute w-3 h-3 bg-[#00ff9c] rounded-full shadow-[0_0_12px_#00ff9c]"
                animate={{ x: [0, 80], y: [0, 16], opacity: [1, 0], scale: [1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.div 
                className="absolute w-3 h-3 bg-[#00ff9c] rounded-full shadow-[0_0_12px_#00ff9c]"
                animate={{ x: [0, 16], y: [0, 56], opacity: [1, 0], scale: [1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
            />
        </motion.div>
    </div>
);

type ScreenshotContent = {
    label: string;
    description: string;
    src?: string;
    alt?: string;
    visual?: React.ReactNode;
};

const extensionScreenshots: ScreenshotContent[] = [
    { 
        src: "/hiw_img/ext_1_linkedin_panel.png?v=2", 
        alt: "LinkedIn Job Panel", 
        label: "LinkedIn Integration", 
        description: "Vignova integrates directly into LinkedIn job listings with a floating panel, bringing AI tailoring directly to where you search for jobs." 
    },
    { 
        visual: <KeywordAnalysisVisual />,
        label: "Intelligent keyword analysis", 
        description: "Don't guess what the ATS is looking for. Vignova instantly analyzes the job description against your master profile to provide real-time compatibility scoring and highlight exact keyword matches."
    },
    { 
        visual: <AutoFillVisual />,
        label: "Populate forms instantly", 
        description: "Stop typing the same information over and over. Reclaim hours of your time with intelligent form autofill that logically maps your profile data to complex application fields."
    },
    { 
        visual: <ResumeUploadVisual />,
        label: "Direct resume access", 
        description: "Never dig through local folders looking for the right PDF again. Access and attach your entire tailored resume library directly into the active application window."
    },
    { 
        visual: <QuickProfileVisual />,
        label: "Your profile, everywhere", 
        description: "Your entire professional history is always just one click away. Easily fast-copy phone numbers, links, and specific work experience bullet points to paste into any stubborn form."
    },
];

export default function ExtensionPage() {
    return (
        <PageLayout>
            <div className="w-full max-w-4xl">
                {/* Header */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#00ff9c]/20 bg-[#00ff9c]/5 text-[#00ff9c] text-xs font-medium mb-6">
                        <Chrome className="w-3.5 h-3.5 mr-1.5" />
                        Chrome Extension
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        Your AI job assistant inside your browser
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
                        The Vignova Chrome extension brings AI-powered resume tailoring, keyword matching, and autofill directly to LinkedIn, Indeed, and every major job board.
                    </p>
                    <Link
                        href="#"
                        className="inline-flex items-center px-8 py-3 bg-[#00ff9c] text-black font-bold rounded-xl hover:bg-[#33ffb0] hover:shadow-[0_0_30px_rgba(0,255,156,0.2)] transition-all"
                    >
                        <Chrome className="w-5 h-5 mr-2" />
                        Install Chrome Extension
                    </Link>
                </motion.div>

                {/* Screenshot Gallery */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
                    }}
                    onViewportEnter={() => {}}
                    className="space-y-24 md:space-y-40 mb-24 md:mb-40 relative"
                >
                    {/* Connecting Zigzag Line */}
                    <div className="hidden md:block absolute top-[15%] bottom-[5%] left-1/2 -translate-x-1/2 w-full max-w-5xl pointer-events-none z-0 opacity-60">
                        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                            <path 
                                d="M 50 0 C 50 10, 15 15, 15 25 C 15 40, 85 45, 85 58 C 85 75, 15 80, 15 90 C 15 97, 85 100, 85 100" 
                                fill="none" 
                                stroke="#00ff9c" 
                                strokeWidth="2" 
                                strokeDasharray="10 10"
                                vectorEffect="non-scaling-stroke"
                            />
                        </svg>
                    </div>

                    {extensionScreenshots.map((screenshot, index) => {
                        const isFirst = index === 0;
                        const isEven = index % 2 === 0;

                        if (isFirst) {
                            // First item: Full width, text above image (unchanged as requested)
                            return (
                                <motion.div
                                    key={index}
                                    variants={fadeUp}
                                    className="space-y-6"
                                >
                                    <div className="text-center md:text-left">
                                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{screenshot.label}</h2>
                                        <p className="text-gray-400 text-lg">{screenshot.description}</p>
                                    </div>
                                    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.5)] group">
                                        <Image
                                            src={screenshot.src || ''}
                                            alt={screenshot.alt || ''}
                                            width={1200}
                                            height={700}
                                            loading="eager"
                                            className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.01]"
                                        />
                                    </div>
                                </motion.div>
                            );
                        }

                        // Remaining items: Reference-style Zig-Zag layout (Step tag, big header, floating canvas image)
                        return (
                            <motion.div
                                key={index}
                                variants={fadeUp}
                                className={`flex flex-col gap-12 lg:gap-24 items-center ${
                                    isEven ? 'md:flex-row' : 'md:flex-row-reverse'
                                }`}
                            >
                                {/* Original First Layout logic remains untouched */}
                                {/* Text Side */}
                                <div className="w-full md:w-5/12 space-y-6 z-10">
                                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-[1.2]">
                                        {screenshot.label}
                                    </h2>
                                    <p className="text-gray-400 text-lg leading-relaxed">
                                        {screenshot.description}
                                    </p>
                                </div>

                                {/* Animated Vector Side */}
                                <div className="w-full md:w-1/2 relative z-10">
                                    <div className={`absolute top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#00ff9c]/5 blur-[100px] rounded-full pointer-events-none -z-10 ${isEven ? '-left-20' : '-right-20'}`} />

                                    <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                         {screenshot.visual}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>

                {/* Bottom CTA */}
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    className="text-center p-10 rounded-2xl bg-gradient-to-b from-zinc-900/50 to-transparent border border-white/5"
                >
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Apply to jobs faster</h2>
                    <p className="text-gray-400 mb-6">Install the Vignova extension and start tailoring resumes from any job listing.</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="#"
                            className="inline-flex items-center justify-center px-8 py-3 bg-[#00ff9c] text-black font-bold rounded-xl hover:bg-[#33ffb0] transition-all"
                        >
                            <Chrome className="w-5 h-5 mr-2" />
                            Install Extension
                        </Link>
                        <button
                            onClick={() => window.dispatchEvent(new Event('openWaitlist'))}
                            className="inline-flex items-center justify-center px-8 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                        >
                            Start Free
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </PageLayout>
    );
}
