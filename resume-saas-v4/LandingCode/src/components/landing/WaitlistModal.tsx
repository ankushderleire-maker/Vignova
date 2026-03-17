"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, CheckCircle, Sparkles } from 'lucide-react';

export const WaitlistModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('openWaitlist', handleOpen);
        return () => window.removeEventListener('openWaitlist', handleOpen);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        // Simulate API call to save email
        setTimeout(() => {
            setStatus('success');
            setTimeout(() => {
                setIsOpen(false);
                setTimeout(() => {
                    setStatus('idle');
                    setEmail('');
                }, 300);
            }, 3000);
        }, 800);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md p-6"
                    >
                        <div className="relative overflow-hidden bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] p-8">
                            {/* Abstract Glow Background */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[#00ff9c]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                            
                            <button
                                onClick={() => setIsOpen(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {status === 'success' ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-6"
                                >
                                    <div className="w-16 h-16 bg-[#00ff9c]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="w-8 h-8 text-[#00ff9c]" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-2">You're on the list!</h3>
                                    <p className="text-gray-400">
                                        We've secured your spot. Keep an eye on your inbox for early access.
                                    </p>
                                </motion.div>
                            ) : (
                                <div className="relative z-10">
                                    <div className="inline-flex items-center px-3 py-1 rounded-full border border-[#00ff9c]/30 bg-[#00ff9c]/10 text-[#00ff9c] text-xs font-medium mb-6">
                                        <Sparkles className="w-3 h-3 mr-1.5" />
                                        Early Access
                                    </div>
                                    
                                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">
                                        Join the Waitlist
                                    </h3>
                                    <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                                        Vignova is currently in private beta. Join the waitlist to secure your spot
                                        and get early access to the ultimate AI career platform.
                                    </p>

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                                <input
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="Enter your email address"
                                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-[#00ff9c]/50 focus:ring-1 focus:ring-[#00ff9c]/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        
                                        <button
                                            type="submit"
                                            disabled={status === 'loading'}
                                            className="w-full py-3.5 bg-[#00ff9c] text-black font-bold rounded-xl hover:bg-[#33ffb0] transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,255,156,0.15)] flex items-center justify-center"
                                        >
                                            {status === 'loading' ? (
                                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                'Secure My Spot'
                                            )}
                                        </button>
                                    </form>
                                    <p className="text-xs text-gray-500 text-center mt-6">
                                        No spam, ever. We'll only email you when it's ready.
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
