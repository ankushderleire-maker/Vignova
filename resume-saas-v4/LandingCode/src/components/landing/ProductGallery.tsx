"use client";

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const galleryImages = [
    { src: "/hiw_img/1_dashboard.png?v=2", alt: "Vignova Dashboard" },
    { src: "/hiw_img/3_resume_generator.png?v=2", alt: "Resume Generator" },
    { src: "/hiw_img/5_ats_analysis.png?v=2", alt: "ATS Analysis" },
    { src: "/hiw_img/7_ai_resume_editor.png?v=2", alt: "AI Resume Editor" },
];

export const ProductGallery = () => {
    return (
        <section className="py-24 bg-zinc-950 overflow-hidden">
            <div className="max-w-[1200px] mx-auto px-4 mb-12">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    className="text-center"
                >
                    <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        See Vignova in action
                    </h2>
                    <p className="text-gray-400 text-lg">
                        A closer look at the tools powering your job search.
                    </p>
                </motion.div>
            </div>

            {/* Horizontal Gallery */}
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-30px" }}
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
                }}
                className="overflow-x-auto pb-6 -mx-4 px-4"
            >
                <div className="flex gap-6 min-w-max px-4">
                    {galleryImages.map((image, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            whileHover={{ scale: 1.03 }}
                            className="relative w-[500px] shrink-0 rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] group cursor-pointer"
                        >
                            <div className="absolute inset-0 rounded-2xl border-2 border-[#00ff9c]/0 group-hover:border-[#00ff9c]/20 transition-all duration-500 z-20 pointer-events-none" />
                            <div className="absolute inset-0 bg-[#00ff9c]/0 group-hover:bg-[#00ff9c]/3 transition-all duration-500 z-10 pointer-events-none" />

                            <Image
                                src={image.src}
                                alt={image.alt}
                                width={500}
                                height={320}
                                loading="eager"
                                className="w-full h-auto transition-transform duration-700 group-hover:scale-[1.05]"
                            />

                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                                <span className="text-white text-sm font-medium">{image.alt}</span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </section>
    );
};
