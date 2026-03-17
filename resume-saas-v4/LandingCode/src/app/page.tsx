"use client";

import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { PlatformFeatures } from "@/components/landing/PlatformFeatures";
import { TemplateGallery } from "@/components/landing/TemplateGallery";
import { TechStack } from "@/components/landing/TechStack";
import { Footer } from "@/components/landing/Footer";
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Chrome, Menu, X } from 'lucide-react';
import React, { useState } from 'react';

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }
  },
};

export default function Home() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <main className="min-h-screen text-white relative overflow-hidden">

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 h-20 flex items-center justify-between">
          <div className="font-bold text-white flex items-end">
            <Image src="/logo.png" alt="Vignova Logo" width={64} height={64} className="w-16 h-16 object-contain" />
            <span className="mb-1 -ml-3 z-10 text-3xl tracking-tight">VIGNOVA</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Features</Link>
            <Link href="/how-it-works" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">How It Works</Link>
            <Link href="/extension" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Extension</Link>
            <Link href="/product" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Product</Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/extension" className="hidden sm:inline-flex text-gray-300 hover:text-white text-sm font-medium transition-colors">
              <Chrome className="w-4 h-4 mr-1.5" />
              Extension
            </Link>
            <button onClick={() => window.dispatchEvent(new Event('openWaitlist'))} className="px-4 py-2 bg-[#00ff9c] text-black text-sm font-bold rounded-lg hover:bg-[#33ffb0] hover:shadow-[0_0_20px_rgba(0,255,156,0.3)] transition-all cursor-pointer">
              Start Free
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
          {isMobileMenuOpen && (
              <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="fixed top-20 left-0 right-0 z-40 bg-zinc-950 border-b border-white/10 overflow-hidden md:hidden"
              >
                  <div className="px-4 py-6 flex flex-col gap-6 items-center">
                      <Link href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-medium text-gray-300 hover:text-white transition-colors">Features</Link>
                      <Link href="/how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-medium text-gray-300 hover:text-white transition-colors">How It Works</Link>
                      <Link href="/extension" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-medium text-gray-300 hover:text-white transition-colors">Extension</Link>
                      <Link href="/product" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-medium text-gray-300 hover:text-white transition-colors">Product</Link>
                      <Link href="/about" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-medium text-gray-300 hover:text-white transition-colors">About Us</Link>
                      <div className="w-full h-px bg-white/10 my-2" />
                      <button 
                          onClick={() => {
                              setIsMobileMenuOpen(false);
                              window.dispatchEvent(new Event('openWaitlist'));
                          }} 
                          className="w-full py-3 bg-[#00ff9c] text-black font-bold rounded-xl hover:bg-[#33ffb0] transition-all cursor-pointer"
                      >
                          Start Free
                      </button>
                  </div>
              </motion.div>
          )}
      </AnimatePresence>

      {/* Section 1: Hero */}
      <Hero />

      {/* Section 2: Features / Trust */}
      <Features />

      {/* Section 5: Platform Features */}
      <PlatformFeatures />

      {/* Section 6: Raw Data to Masterpiece Animation */}
      <TemplateGallery />

      {/* Section 7: Tech Stack */}
      <TechStack />

      {/* Section 8: Final CTA */}
      <section className="py-24 text-center relative overflow-hidden bg-white/[0.02] border-t border-white/5">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-[300px] max-w-[500px] bg-[#00ff9c]/5 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={fadeUp}
          className="max-w-[1200px] mx-auto px-4 relative z-10"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Start landing more interviews with AI
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Create tailored resumes, optimize for ATS systems, and apply to jobs faster with Vignova.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.dispatchEvent(new Event('openWaitlist'))}
              className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-black transition-all duration-300 bg-[#00ff9c] rounded-xl hover:bg-[#33ffb0] hover:scale-105 shadow-[0_0_40px_rgba(0,255,156,0.2)] hover:shadow-[0_0_60px_rgba(0,255,156,0.3)] cursor-pointer"
            >
              Start Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <Link
              href="#extension"
              className="inline-flex items-center justify-center px-10 py-4 text-lg font-bold text-white transition-all duration-300 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 hover:border-white/20"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Install Chrome Extension
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
