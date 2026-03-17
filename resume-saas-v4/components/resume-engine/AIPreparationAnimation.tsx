import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, ScanLine } from 'lucide-react';

const PREPARATION_STEPS = [
    "Analyzing Master Profile...",
    "Checking Job Description...",
    "Writing Summary...",
    "Preparing Skills...",
    "Writing Projects...",
    "Checking for ATS Compatibility...",
    "Refining Resume..."
];

export const AIPreparationAnimation = () => {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentStep((prev) => (prev + 1) % PREPARATION_STEPS.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);
    return (
        <div className="relative flex items-center justify-center w-full h-[400px]">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative w-full max-w-[320px] h-full max-h-[420px]"
            >
                {/* Glassmorphism Card Container */}
                <motion.div
                    animate={{
                        boxShadow: [
                            "0 0 10px 2px rgba(249,115,22,0.1)",
                            "0 0 40px 5px rgba(249,115,22,0.4)",
                            "0 0 10px 2px rgba(249,115,22,0.1)"
                        ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-br from-[var(--sidebar-bg)]/90 to-[var(--background)]/90 rounded-2xl border-2 border-[var(--primary)]/50 backdrop-blur-xl overflow-hidden"
                >

                    {/* Animated Scanning Beam */}
                    <motion.div
                        animate={{
                            top: ["-10%", "120%"],
                            opacity: 1
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-[var(--primary)]/10 to-transparent z-20 pointer-events-none"
                    />
                    <motion.div
                        animate={{
                            top: ["-10%", "120%"],
                            opacity: 1
                        }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-[2px] bg-[var(--primary)]/50 shadow-[0_0_15px_var(--primary)] z-30"
                    />

                    {/* Resume Skeleton Content */}
                    <div className="p-6 space-y-6 relative z-10 h-full flex flex-col">
                        {/* Header Skeleton */}
                        <div className="flex gap-4 items-center border-b border-black/5 dark:border-white/5 pb-4">
                            <div className="w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--primary)]/30 to-[var(--primary)]/10" />
                            </div>
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-black/10 dark:bg-white/10 w-2/3 rounded animate-pulse" />
                                <div className="h-2 bg-black/5 dark:bg-white/5 w-1/3 rounded" />
                            </div>
                        </div>

                        {/* Body Content Skeleton */}
                        <div className="space-y-6 flex-1">
                            {/* Summary Box */}
                            <div className="space-y-3">
                                <div className="h-2.5 bg-[var(--primary)]/20 w-1/4 rounded border-l-2 border-[var(--primary)] pl-2" />
                                <div className="space-y-2 pl-3 border-l border-black/5 dark:border-white/5">
                                    <div className="h-1.5 bg-black/10 dark:bg-white/10 w-full rounded animate-pulse" />
                                    <div className="h-1.5 bg-black/10 dark:bg-white/10 w-5/6 rounded animate-pulse" style={{ animationDelay: '100ms' }} />
                                    <div className="h-1.5 bg-black/10 dark:bg-white/10 w-4/6 rounded animate-pulse" style={{ animationDelay: '200ms' }} />
                                </div>
                            </div>

                            {/* Experience Box */}
                            <div className="space-y-3">
                                <div className="h-2.5 bg-[var(--primary)]/20 w-1/3 rounded border-l-2 border-[var(--primary)] pl-2" />
                                <div className="space-y-2 pl-3 border-l border-black/5 dark:border-white/5">
                                    <div className="flex justify-between items-center mb-1">
                                        <div className="h-2 bg-black/20 dark:bg-white/20 w-1/3 rounded" />
                                        <div className="h-1.5 bg-black/5 dark:bg-white/5 w-1/5 rounded" />
                                    </div>
                                    <div className="h-1.5 bg-black/10 dark:bg-white/10 w-11/12 rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                                    <div className="h-1.5 bg-black/10 dark:bg-white/10 w-full rounded animate-pulse" style={{ animationDelay: '400ms' }} />
                                </div>
                            </div>

                            {/* Skills Box */}
                            <div className="space-y-3">
                                <div className="h-2.5 bg-[var(--primary)]/20 w-1/4 rounded border-l-2 border-[var(--primary)] pl-2" />
                                <div className="flex flex-wrap gap-2 pl-3 border-l border-black/5 dark:border-white/5">
                                    <div className="h-4 w-12 bg-black/5 dark:bg-white/5 rounded block" />
                                    <div className="h-4 w-16 bg-[var(--primary)]/10 rounded block animate-pulse" />
                                    <div className="h-4 w-10 bg-black/5 dark:bg-white/5 rounded block" />
                                    <div className="h-4 w-14 bg-black/5 dark:bg-white/5 rounded block" />
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Central Floating Badge with Dynamic Text */}
                <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--sidebar-bg)] border border-[var(--border-color)] p-4 rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.1)] flex flex-col items-center gap-3 backdrop-blur-xl z-50 min-w-[320px]"
                >
                    <div className="p-3 bg-[var(--primary)]/10 rounded-xl relative">
                        <div className="absolute inset-0 bg-[var(--primary)]/20 rounded-xl blur-md animate-pulse"></div>
                        <BrainCircuit className="w-8 h-8 text-[var(--primary)] relative z-10" />
                    </div>
                    <div className="text-center w-full overflow-visible">
                        <div className="text-[var(--foreground)] font-bold text-sm mb-1">AI Preparation</div>
                        <div className="h-4 relative w-full flex justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ y: 10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -10, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-xs text-[var(--primary)] font-mono whitespace-nowrap absolute"
                                >
                                    {PREPARATION_STEPS[currentStep]}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
};
