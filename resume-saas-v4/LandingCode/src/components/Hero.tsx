"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, CheckCircle, BrainCircuit, ScanLine } from "lucide-react";

export const Hero = () => {
    const [textIndex, setTextIndex] = useState(0);
    const [step, setStep] = useState(0);
    const words = ["AI-Powered", "Professional", "ATS-Friendly", "Beautiful"];

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % words.length);
        }, 3000); // Slightly slower for better readability
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (step === 0) {
            timeout = setTimeout(() => setStep(1), 2000);
        } else {
            timeout = setTimeout(() => setStep(0), 4000);
        }
        return () => clearTimeout(timeout);
    }, [step]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.3 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <section className="relative min-h-screen flex items-center pt-20 overflow-hidden bg-black">

            {/* --- BACKGROUND ANIMATION START --- */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Layer 1: Base Static Grey Grid */}
                <div
                    className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
                />

                {/* Layer 2: Green Glowing Grid with Moving Mask */}
                <motion.div
                    animate={{
                        maskPosition: ["0% 0%", "100% 100%"], // Moves the mask diagonally
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="absolute inset-0 bg-[linear-gradient(to_right,#22c55e_1px,transparent_1px),linear-gradient(to_bottom,#22c55e_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"
                    style={{
                        // This mask creates the "beam" effect
                        maskImage: "linear-gradient(135deg, transparent 40%, black 50%, transparent 60%)",
                        maskSize: "200% 200%",
                        maskRepeat: "no-repeat",
                    }}
                />

                {/* Ambient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/10 blur-[120px] rounded-full -z-10" />
            </div>
            {/* --- BACKGROUND ANIMATION END --- */}


            <div className="max-w-7xl mx-auto px-4 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10 w-full">

                {/* Left Content */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="space-y-6 lg:space-y-8 max-w-2xl"
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-green-500/30 bg-green-900/10 text-green-400 text-sm font-medium backdrop-blur-sm">
                        <Sparkles className="w-4 h-4 mr-2" />
                        <span>The Future of Resume Building</span>
                    </div>

                    {/* TEXT ANIMATION FIX */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                        Vignova â€”

                        {/* Container with slightly larger height to allow for descenders, but hidden vertically */}
                        <span className="block h-[1.25em] overflow-hidden relative my-2">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={words[textIndex]}
                                    // Vertical Reveal Animation
                                    initial={{ y: "100%" }}
                                    animate={{ y: "0%" }}
                                    exit={{ y: "-100%" }}
                                    transition={{ duration: 0.5, ease: "easeInOut" }}
                                    className="block text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 absolute top-0 left-0 w-full pt-1 pb-2 leading-none"
                                >
                                    {words[textIndex]}
                                </motion.span>
                            </AnimatePresence>
                            {/* Invisible placeholder to maintain width based on longest word */}
                            <span className="invisible pt-1 pb-2 leading-none block">{words[textIndex]}</span>
                        </span>

                        Resume.
                    </h1>

                    <p className="text-lg md:text-xl text-gray-400 max-w-xl leading-relaxed">
                        Create a professional, ATS-optimized resume in minutes with our AI-powered platform.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center px-8 py-3 text-base font-bold text-black transition-all duration-300 bg-green-500 rounded-xl hover:bg-green-400 hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                        >
                            Create My Resume
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                        <Link
                            href="#demo"
                            className="inline-flex items-center justify-center px-8 py-3 text-base font-bold text-white transition-all duration-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20"
                        >
                            View Examples
                        </Link>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500 pt-2">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>ATS Optimized</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>AI Writing Assistant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span>Skill Enhanced as per JD</span>
                        </div>
                    </div>
                </motion.div>

                {/* Right Animation (Same as before, sized for laptop) */}
                <div className="relative flex items-center justify-center h-[500px] lg:h-[600px] w-full">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                        className="relative w-full max-w-[400px] h-full max-h-[550px]"
                    >
                        {/* Glassmorphism Card Container */}
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/90 to-black/90 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">

                            {/* Animated Scanning Beam */}
                            <motion.div
                                animate={{
                                    top: step === 0 ? ["-10%", "120%"] : "120%",
                                    opacity: step === 0 ? 1 : 0
                                }}
                                transition={{ duration: 2, repeat: step === 0 ? Infinity : 0, ease: "linear" }}
                                className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-green-500/10 to-transparent z-20 pointer-events-none"
                            />
                            <motion.div
                                animate={{
                                    top: step === 0 ? ["-10%", "120%"] : "120%",
                                    opacity: step === 0 ? 1 : 0
                                }}
                                transition={{ duration: 2, repeat: step === 0 ? Infinity : 0, ease: "linear" }}
                                className="absolute left-0 right-0 h-[1px] bg-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.8)] z-30"
                            />

                            {/* Resume Content */}
                            <div className="p-6 md:p-8 space-y-6 md:space-y-8 relative z-10 h-full flex flex-col">
                                {/* Header */}
                                <div className="flex gap-4 items-center border-b border-white/10 pb-6">
                                    <div className="w-16 h-16 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 relative">
                                        {step === 0 ? (
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-green-500/20 to-blue-500/20" />
                                        ) : (
                                            <>
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    className="absolute inset-0 bg-gradient-to-br from-red-900 to-black flex items-center justify-center text-white font-bold text-xl"
                                                >
                                                    JS
                                                </motion.div>
                                                <motion.img
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    src="https://upload.wikimedia.org/wikipedia/en/a/a2/Jack_Sparrow_In_Pirates_of_the_Caribbean-_At_World%27s_End.JPG"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                    }}
                                                    alt="Profile"
                                                    className="w-full h-full object-cover relative z-10"
                                                />
                                            </>
                                        )}
                                    </div>
                                    <div className="space-y-2 flex-1">
                                        {step === 0 ? (
                                            <>
                                                <div className="h-5 bg-zinc-700 w-1/2 rounded animate-pulse" />
                                                <div className="h-3 bg-zinc-800 w-1/3 rounded" />
                                            </>
                                        ) : (
                                            <motion.div
                                                initial="hidden"
                                                animate="visible"
                                                variants={containerVariants}
                                                key="text-header"
                                            >
                                                <motion.div variants={itemVariants} className="text-xl font-bold text-white">Captain Jack Sparrow</motion.div>
                                                <motion.div variants={itemVariants} className="text-xs text-green-400 font-medium">Conqueror of the Seven Seas</motion.div>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>

                                {/* Body Content */}
                                <div className="space-y-4 md:space-y-6 flex-1">
                                    <div className="space-y-3">
                                        {step === 0 ? (
                                            <>
                                                <div className="h-3 bg-green-900/30 w-1/4 rounded border-l-2 border-green-500 pl-2" />
                                                <div className="space-y-2 pl-3 border-l border-white/5">
                                                    <div className="h-2 bg-zinc-700/50 w-full rounded" />
                                                    <div className="h-2 bg-zinc-700/50 w-5/6 rounded" />
                                                </div>
                                            </>
                                        ) : (
                                            <motion.div
                                                initial="hidden"
                                                animate="visible"
                                                variants={containerVariants}
                                                key="text-body-1"
                                                className="space-y-2"
                                            >
                                                <motion.h3 variants={itemVariants} className="text-xs font-bold text-gray-300 border-l-2 border-green-500 pl-2 uppercase tracking-wide">Summary</motion.h3>
                                                <motion.p variants={itemVariants} className="text-[10px] text-gray-500 leading-relaxed pl-3 border-l border-white/5">
                                                    Infamous pirate with a knack for escaping impossible situations. Seeking a position that involves significantly more rum.
                                                </motion.p>
                                            </motion.div>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        {step === 0 ? (
                                            <>
                                                <div className="h-3 bg-green-900/30 w-1/4 rounded border-l-2 border-green-500 pl-2" />
                                                <div className="space-y-2 pl-3 border-l border-white/5">
                                                    <div className="h-2 bg-zinc-700/50 w-full rounded" />
                                                    <div className="h-2 bg-zinc-700/50 w-5/6 rounded" />
                                                </div>
                                            </>
                                        ) : (
                                            <motion.div
                                                initial="hidden"
                                                animate="visible"
                                                variants={containerVariants}
                                                key="text-body-2"
                                                className="space-y-2"
                                            >
                                                <motion.h3 variants={itemVariants} className="text-xs font-bold text-gray-300 border-l-2 border-green-500 pl-2 uppercase tracking-wide">Experience</motion.h3>
                                                <motion.div variants={itemVariants} className="pl-3 border-l border-white/5 space-y-1">
                                                    <div className="flex justify-between text-[10px] text-white">
                                                        <span>The Black Pearl</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                                        Managed a diverse crew. Successfully retrieved the Pearl from Barbossa.
                                                    </p>
                                                    <div className="flex justify-between text-[10px] text-white mt-3">
                                                        <span>East India Trading Co.</span>
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed">
                                                        Contractor. Liberated cargo. Acquired the Wicked Wench.
                                                    </p>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Additional Skills Section to fill space */}
                                    <div className="space-y-3">
                                        {step === 0 ? (
                                            <>
                                                <div className="h-3 bg-green-900/30 w-1/4 rounded border-l-2 border-green-500 pl-2" />
                                                <div className="space-y-2 pl-3 border-l border-white/5 flex gap-2">
                                                    <div className="h-2 bg-zinc-700/50 w-8 rounded" />
                                                    <div className="h-2 bg-zinc-700/50 w-12 rounded" />
                                                    <div className="h-2 bg-zinc-700/50 w-10 rounded" />
                                                    <div className="h-2 bg-zinc-700/50 w-14 rounded" />
                                                </div>
                                            </>
                                        ) : (
                                            <motion.div
                                                initial="hidden"
                                                animate="visible"
                                                variants={containerVariants}
                                                key="text-body-3"
                                                className="space-y-2"
                                            >
                                                <motion.h3 variants={itemVariants} className="text-xs font-bold text-gray-300 border-l-2 border-green-500 pl-2 uppercase tracking-wide">Skills</motion.h3>
                                                <motion.div variants={itemVariants} className="pl-3 border-l border-white/5 flex flex-wrap gap-2 text-[9px] text-green-400 font-mono">
                                                    <span className="bg-green-500/10 px-1.5 py-0.5 rounded">Navigation</span>
                                                    <span className="bg-green-500/10 px-1.5 py-0.5 rounded">Sword Fighting</span>
                                                    <span className="bg-green-500/10 px-1.5 py-0.5 rounded">Negotiation</span>
                                                    <span className="bg-green-500/10 px-1.5 py-0.5 rounded">Leadership</span>
                                                    <span className="bg-green-500/10 px-1.5 py-0.5 rounded">Escapology</span>
                                                    <span className="bg-green-500/10 px-1.5 py-0.5 rounded">Seamanship</span>
                                                    <span className="bg-green-500/10 px-1.5 py-0.5 rounded">Treasure Hunting</span>
                                                    <span className="bg-green-500/10 px-1.5 py-0.5 rounded">Charisma</span>
                                                </motion.div>
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating Badges */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: step === 0 ? 1 : 0,
                                scale: step === 0 ? 1 : 0.8,
                                y: step === 0 ? 0 : 10
                            }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 border border-blue-500/30 p-3 md:p-4 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md z-40 whitespace-nowrap"
                        >
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <BrainCircuit className="w-5 h-5 md:w-6 md:h-6 text-blue-500 animate-pulse" />
                            </div>
                            <div>
                                <div className="text-white font-bold text-xs md:text-sm">AI Analysis</div>
                                <div className="text-[10px] md:text-xs text-blue-400 font-mono">Processing...</div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{
                                opacity: step === 1 ? 1 : 0,
                                scale: step === 1 ? 1 : 0.8,
                                y: step === 1 ? 0 : 10
                            }}
                            transition={{ delay: step === 1 ? 0.5 : 0 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/90 border border-green-500/30 p-3 md:p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center gap-3 backdrop-blur-md z-40 whitespace-nowrap"
                        >
                            <div className="p-2 bg-green-500/10 rounded-lg">
                                <ScanLine className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                            </div>
                            <div>
                                <div className="text-white font-bold text-xs md:text-sm">ATS Check</div>
                                <div className="text-[10px] md:text-xs text-green-400 font-mono">98% Match</div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

            </div>
        </section>
    );
};
