"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Footer } from './Footer';
import { Chrome, ArrowLeft, Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const PageLayout = ({ children }: { children: React.ReactNode }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen text-slate-900 bg-white">
            {/* Navigation - Dark Blackish Blue */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-white/10">
                <div className="max-w-[1200px] mx-auto px-4 h-20 flex items-center justify-between">
                    <Link href="/" className="text-xl font-bold text-white flex items-end hover:opacity-80 transition">
                        <Image src="/logo.png" alt="Vignova Logo" width={64} height={64} className="w-16 h-16 object-contain" />
                        <span className="mb-1 -ml-3 z-10 text-3xl tracking-tight">VIGNOVA</span>
                    </Link>
                    <div className="hidden md:flex items-center gap-6">
                        <Link href="/product" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Product</Link>
                        <Link href="/contact" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">Contact</Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-3">
                            <Link href="/#extension" className="hidden sm:inline-flex text-gray-300 hover:text-white text-sm font-medium transition-colors">
                                <Chrome className="w-4 h-4 mr-1.5" />
                                Extension
                            </Link>
                            <button onClick={() => window.location.href = 'https://app.vignova.io/login'} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all cursor-pointer">
                                Start Free
                            </button>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button 
                            className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Navigation Menu - Dark Blackish Blue */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="fixed top-20 left-0 right-0 z-40 bg-[#0f172a] border-b border-white/10 overflow-hidden md:hidden"
                    >
                        <div className="px-4 py-6 flex flex-col gap-6 items-center">
                            <Link href="/product" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-medium text-gray-300 hover:text-white transition-colors">Product</Link>
                            <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-medium text-gray-300 hover:text-white transition-colors">Contact</Link>
                            <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-medium text-gray-300 hover:text-white transition-colors">About Us</Link>
                            <div className="w-full h-px bg-white/10 my-2" />
                            <button 
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    window.location.href = 'https://app.vignova.io/login';
                                }} 
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-all cursor-pointer"
                            >
                                Start Free
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Back to home */}
            <div className="pt-24 pb-4 max-w-[1200px] mx-auto px-4">
                <Link href="/" className="inline-flex items-center text-slate-500 hover:text-blue-600 text-sm transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1.5" />
                    Back to Home
                </Link>
            </div>

            {/* Content */}
            <main className="max-w-[1200px] mx-auto px-4 pb-24 flex flex-col items-center">
                {children}
            </main>

            <Footer />
        </div>
    );
};
