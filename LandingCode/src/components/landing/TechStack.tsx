"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Layers, Sparkles, Cloud } from 'lucide-react';

const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const techStack = [
    { icon: Server, name: "Next.js", description: "React framework for production" },
    { icon: Database, name: "PostgreSQL", description: "Enterprise-grade database" },
    { icon: Layers, name: "Prisma ORM", description: "Type-safe data access" },
    { icon: Sparkles, name: "Google Gemini AI", description: "Advanced AI language model" },
    { icon: Cloud, name: "Google Cloud", description: "Scalable infrastructure" },
];

export const TechStack = () => {
    return (
        <section className="py-24 relative overflow-hidden bg-white">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[500px] max-h-[500px] bg-blue-500/2 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-[1200px] mx-auto px-4 relative z-10">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-500 text-xs font-medium mb-6">
                        Infrastructure
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
                        Built with modern AI infrastructure
                    </h2>
                    <p className="text-slate-500 text-lg">
                        Vignova is designed to run on scalable cloud infrastructure including Google Cloud Run, Cloud SQL, and Vertex AI.
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-30px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
                    }}
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto"
                >
                    {techStack.map((tech, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            whileHover={{ y: -4 }}
                            className="flex flex-col items-center p-6 rounded-2xl bg-white border border-slate-200 group cursor-pointer hover:border-blue-200 transition-colors duration-300 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]"
                        >
                            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3 group-hover:border-blue-200 transition-colors duration-300">
                                <tech.icon className="w-5 h-5 text-blue-600 group-hover:drop-shadow-[0_0_8px_rgba(37,99,235,0.4)] transition-all duration-300" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 mb-0.5 text-center">{tech.name}</h3>
                            <p className="text-slate-500 text-[11px] text-center leading-relaxed">{tech.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
