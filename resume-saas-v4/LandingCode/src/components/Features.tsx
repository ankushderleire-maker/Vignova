"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, FileCheck, Layout, Zap, Shield, Search } from 'lucide-react';

const features = [
    {
        icon: Bot,
        title: "AI Writing Assistant",
        description: "Generate professional summaries and bullet points tailored to your job role with a single click.",
        gradient: "from-emerald-600 to-teal-800"
    },
    {
        icon: Layout,
        title: "Smart Formatting",
        description: "Change templates instantly without losing content. Automatic layout adjustments for perfect spacing.",
        gradient: "from-teal-600 to-cyan-800"
    },
    {
        icon: Search,
        title: "ATS Optimization",
        description: "Built-in keywords and formatting rules ensure your resume passes Applicant Tracking Systems.",
        gradient: "from-green-600 to-emerald-900"
    },
    {
        icon: FileCheck,
        title: "Real-time Preview",
        description: "See changes instantly as you type with our split-screen editor. No constant refreshing needed.",
        gradient: "from-slate-700 to-zinc-900"
    },
    {
        icon: Shield,
        title: "Private & Secure",
        description: "Your data is encrypted and secure. We never sell your personal information to third parties.",
        gradient: "from-indigo-900 to-slate-900"
    },
    {
        icon: Zap,
        title: "Instant PDF Download",
        description: "Export high-quality PDFs ready for application. No watermarks on our premium plans.",
        gradient: "from-cyan-700 to-blue-900"
    }
];

export const Features = () => {
    return (
        <section id="features" className="py-24 bg-zinc-950">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Everything You Need to Get Hired
                    </h2>
                    <p className="text-gray-400 text-lg">
                        Our AI-powered platform gives you the competitive edge in today's job market.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="flex flex-col rounded-2xl bg-[#1a1a24] overflow-hidden shadow-2xl border border-white/5 transition-all duration-300 group cursor-pointer hover:shadow-green-500/10"
                        >
                            {/* Top Angled Image/Gradient Header */}
                            <div
                                className={`relative h-48 w-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center overflow-hidden`}
                                style={{
                                    clipPath: "polygon(0 0, 100% 0, 100% 88%, 0 100%)"
                                }}
                            >
                                {/* Abstract pattern overlay */}
                                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />

                                {/* Large background icon */}
                                <feature.icon className="absolute w-40 h-40 text-white/10 -right-8 -bottom-8 transform rotate-12 group-hover:rotate-0 transition-transform duration-500" />

                                {/* Center icon */}
                                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 z-10 relative">
                                    <feature.icon className="w-8 h-8" />
                                </div>
                            </div>

                            {/* Bottom Content Area */}
                            <div className="p-8 pt-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-white mb-3 tracking-wide">{feature.title}</h3>
                                <p className="text-gray-400 leading-relaxed text-sm">
                                    {feature.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
