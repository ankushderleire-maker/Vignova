"use client";

import React from 'react';
import { PageLayout } from '@/components/landing/PageLayout';
import { Mail, MapPin, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
    },
};

const contactMethods = [
    {
        icon: Mail,
        title: "Email Us",
        description: "For general inquiries, support, or partnership opportunities.",
        value: "hello@vignova.io",
        href: "mailto:hello@vignova.io",
    },
    {
        icon: MessageCircle,
        title: "Support",
        description: "Get help with your account, billing, or technical issues.",
        value: "support@vignova.io",
        href: "mailto:support@vignova.io",
    },
    {
        icon: MapPin,
        title: "Location",
        description: "We are a remote-first team building the future of job search.",
        value: "Global / Remote",
        href: null,
    },
];

export default function ContactPage() {
    return (
        <PageLayout>
            <div className="max-w-3xl">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                >
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
                        Get in Touch
                    </h1>
                    <p className="text-gray-400 text-lg mb-12">
                        Have questions about Vignova? We&apos;d love to hear from you. Reach out and our team
                        will get back to you as soon as possible.
                    </p>
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
                    }}
                    className="grid md:grid-cols-3 gap-6 mb-16"
                >
                    {contactMethods.map((method, index) => (
                        <motion.div
                            key={index}
                            variants={fadeUp}
                            className="p-6 rounded-2xl bg-zinc-900/50 border border-white/5 group hover:border-[#00ff9c]/10 transition-colors duration-300"
                        >
                            <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center mb-4 group-hover:border-[#00ff9c]/20 transition-colors">
                                <method.icon className="w-5 h-5 text-[#00ff9c]" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">{method.title}</h3>
                            <p className="text-gray-500 text-sm mb-3">{method.description}</p>
                            {method.href ? (
                                <a href={method.href} className="text-[#00ff9c] text-sm font-medium hover:underline">
                                    {method.value}
                                </a>
                            ) : (
                                <span className="text-gray-300 text-sm font-medium">{method.value}</span>
                            )}
                        </motion.div>
                    ))}
                </motion.div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="p-8 rounded-2xl bg-zinc-900/30 border border-white/5"
                >
                    <h2 className="text-2xl font-bold text-white mb-2">Frequently Asked</h2>
                    <p className="text-gray-400 mb-8">Quick answers to common questions.</p>

                    <div className="space-y-6">
                        {[
                            {
                                q: "Is Vignova free to use?",
                                a: "Vignova offers a free tier with limited credits. Premium plans unlock unlimited resume generation, advanced ATS analysis, and priority support."
                            },
                            {
                                q: "How does the Chrome extension work?",
                                a: "The Vignova Chrome extension detects job listings on LinkedIn, Indeed, and other job boards. It enables one-click resume tailoring, keyword matching, and autofill for applications."
                            },
                            {
                                q: "Is my data secure?",
                                a: "Yes. We use end-to-end encryption, secure cloud infrastructure on Google Cloud, and never share your data with third parties for advertising."
                            },
                            {
                                q: "Can I export my resumes?",
                                a: "Absolutely. Resumes can be exported as PDF using our professional ATS-friendly templates at any time."
                            },
                        ].map((faq, i) => (
                            <div key={i} className="border-b border-white/5 pb-6 last:border-0 last:pb-0">
                                <h3 className="text-white font-semibold mb-2">{faq.q}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </PageLayout>
    );
}
