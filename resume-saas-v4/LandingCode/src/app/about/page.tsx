"use client";

import React from 'react';
import { PageLayout } from '@/components/landing/PageLayout';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles, Linkedin, Github, Globe } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

export default function AboutPage() {
    return (
        <PageLayout>
            <div className="max-w-4xl w-full">
                
                {/* Header Section */}
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="text-center mb-16 md:mb-24"
                >
                    <div className="inline-flex items-center px-4 py-2 rounded-full border border-[#00ff9c]/30 bg-[#00ff9c]/5 text-[#00ff9c] text-sm font-medium mb-6">
                        <Sparkles className="w-4 h-4 mr-2" />
                        <span>The Story Behind Vignova</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
                        Built for job seekers, <br className="hidden md:block" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00ff9c] to-emerald-400">
                            by a job seeker.
                        </span>
                    </h1>
                </motion.div>

                {/* Main Content Grid */}
                <div className="relative grid md:grid-cols-12 gap-12 items-center">
                    {/* Massive Background Logo Watermark */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-[40%] -translate-y-[45%] w-[120%] h-[120%] opacity-[0.15] z-0 mix-blend-plus-lighter pointer-events-none transition-opacity duration-1000">
                        <Image 
                            src="/logo.png" 
                            alt="Background Logo" 
                            fill 
                            className="object-contain"
                        />
                    </div>
                    
                    {/* Left: Founder Image */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        className="md:col-span-5 relative"
                    >
                        {/* Decorative Background Elements */}
                        <div className="absolute -inset-4 bg-gradient-to-br from-[#00ff9c]/20 to-transparent rounded-[2rem] blur-2xl z-0" />
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black rounded-[2rem] transform -rotate-3 z-0 border border-white/5" />
                        
                        {/* Image Container */}
                        <div className="relative z-10 aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
                            <Image
                                src="/Dev_img.jpeg"
                                alt="Ankush Derle - Founder of Vignova"
                                fill
                                className="object-cover transition-transform duration-700 hover:scale-105"
                                sizes="(max-w-768px) 100vw, 400px"
                            />
                            
                            {/* Overlay Gradient for Text Readability */}
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
                            
                            {/* Details over image */}
                            <div className="absolute bottom-6 left-6 right-6">
                                <h3 className="text-xl font-bold text-white">Ankush Derle</h3>
                                <p className="text-[#00ff9c] text-sm font-medium mb-3">Founder & Developer</p>
                                
                                {/* Social Links */}
                                <div className="flex gap-3">
                                    <a href="https://www.linkedin.com/in/ankushderle/" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10 text-white hover:bg-[#00ff9c]/20 hover:text-[#00ff9c] cursor-pointer transition-all">
                                        <Linkedin className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: Story Text */}
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={{
                            hidden: { opacity: 0 },
                            visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
                        }}
                        className="md:col-span-7 space-y-6"
                    >
                        <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white tracking-tight mb-2">
                            Hi, I'm Ankush.
                        </motion.h2>

                        <motion.div variants={fadeUp} className="space-y-6 text-gray-400 leading-relaxed text-lg">
                            <p>
                                I've always loved building projects, but Vignova is incredibly close to my heart because it solves a very real, very frustrating problem that I experienced firsthand.
                            </p>
                            
                            <p>
                                When I was applying for jobs, I constantly ran into the same roadblocks: struggling to format my resume properly, wondering if it was actually ATS-friendly, and never knowing if my keywords actually matched what recruiters were looking for. I couldn't figure out which roles I actually had a high chance of landing.
                            </p>

                            <p>
                                And then there were the application forms—the ones so painfully long that I'd just quit halfway through. On top of that, keeping track of all the relevant jobs for my skill set was a nightmare.
                            </p>

                            <p>
                                I realized job hunting shouldn't be this broken. So, I built <span className="text-white font-semibold">Vignova</span> to fix it. 
                            </p>

                            <p className="border-l-2 border-[#00ff9c] pl-4 italic text-gray-300">
                                "I wanted to create a single platform that strips away the tedious work, automates the formatting and keyword matching, and gives job seekers their time back so they can focus on what actually matters—preparing for interviews and landing the job."
                            </p>
                            
                            <p className="font-medium text-white pt-4">
                                Welcome to Vignova. Let's get you hired.
                            </p>
                        </motion.div>
                    </motion.div>

                </div>
            </div>
        </PageLayout>
    );
}
