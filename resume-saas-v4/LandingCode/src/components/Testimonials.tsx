"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const reviews = [
    {
        name: "Sarah Jenkins",
        role: "UX Designer",
        content: "I landed my dream job at Spotify within a week of using Vignova. The AI suggestions were spot on!",
        rating: 5
    },
    {
        name: "Michael Chen",
        role: "Software Engineer",
        content: "The ATS optimization feature is a game changer. My application response rate went from 5% to 40%.",
        rating: 5
    },
    {
        name: "Emily Rodriguez",
        role: "Marketing Manager",
        content: "Beautiful templates and super easy to use. I love how I can switch designs with one click.",
        rating: 5
    },
    {
        name: "David Kim",
        role: "Data Analyst",
        content: "Finally, a resume builder that actually works. The AI writing assistant saved me hours of struggle.",
        rating: 5
    },
    {
        name: "Jessica Lee",
        role: "Product Manager",
        content: "Highly recommend! The premium features are worth every penny. The analytics dashboard is also a nice touch.",
        rating: 4
    }
];

export const Testimonials = () => {
    return (
        <section className="py-24 bg-zinc-900 border-y border-white/5">
            <div className="max-w-7xl mx-auto px-4">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Loved by Professionals
                    </h2>
                    <p className="text-gray-400 text-lg">
                        Join thousands of job seekers who found success with our platform.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reviews.slice(0, 3).map((review, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-zinc-800/50 p-6 rounded-2xl border border-white/5 relative"
                        >
                            <div className="flex gap-1 mb-4 text-yellow-500">
                                {[...Array(review.rating)].map((_, i) => (
                                    <Star key={i} className="w-4 h-4 fill-current" />
                                ))}
                            </div>
                            <p className="text-gray-300 mb-6 italic">"{review.content}"</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white font-bold text-sm">
                                    {review.name.charAt(0)}
                                </div>
                                <div>
                                    <h4 className="text-white font-medium text-sm">{review.name}</h4>
                                    <p className="text-gray-500 text-xs text-sm">{review.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};
