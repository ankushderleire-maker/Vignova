'use client';

import { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Blog', href: '/blog' },
  { label: 'About Us', href: '/about' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Glassmorphic navy background */}
      <div
        className={`absolute inset-0 -z-10 transition-all duration-300 border-b ${
          scrolled
            ? 'bg-[#0A192F]/95 backdrop-blur-xl border-white/10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.45)]'
            : 'bg-[#0A192F]/80 backdrop-blur-md border-white/5'
        }`}
      />

      <div className="w-full px-4 md:px-8 xl:px-12 2xl:px-20 max-w-[1800px] mx-auto h-[72px] flex items-center">
        <div className="flex items-center justify-between w-full">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 cursor-pointer group w-auto">
            <Image
              src="/logo.png"
              alt="Vignova logo"
              width={40}
              height={40}
              className="object-contain group-hover:scale-105 transition-transform duration-300"
            />
            <span className="text-xl font-extrabold tracking-[0.08em] text-white uppercase">
              Vignova
            </span>
          </Link>

          {/* Navigation - Centered */}
          <nav className="hidden lg:flex items-center justify-center gap-2 flex-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-4 py-2 rounded-lg text-[14px] font-medium text-white/75 hover:text-white hover:bg-white/5 transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA - Right */}
          <div className="flex items-center justify-end gap-3 lg:gap-5">
            <a
              href="https://app.vignova.io/login"
              className="hidden md:block text-[14px] font-semibold text-white/75 hover:text-white transition-colors"
            >
              Log in
            </a>
            <a
              href="https://app.vignova.io/login"
              className="group hidden sm:inline-flex items-center gap-1.5 pl-5 pr-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[14px] font-semibold rounded-full shadow-[0_0_20px_rgba(37,99,235,0.35)] transition-all duration-300 hover:shadow-[0_0_28px_rgba(37,99,235,0.5)] active:scale-95"
            >
              Get started
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </a>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="lg:hidden p-2 -mr-2 text-white/80 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="lg:hidden overflow-hidden bg-[#0A192F]/98 backdrop-blur-xl border-b border-white/10"
          >
            <nav className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-xl text-[15px] font-medium text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <div className="flex items-center gap-3 px-4 pt-3 pb-2">
                <a
                  href="https://app.vignova.io/login"
                  className="flex-1 text-center py-3 rounded-xl border border-white/15 text-white/85 text-[14px] font-semibold hover:bg-white/5 transition-colors"
                >
                  Log in
                </a>
                <a
                  href="https://app.vignova.io/login"
                  className="flex-1 text-center py-3 rounded-xl bg-blue-600 text-white text-[14px] font-semibold hover:bg-blue-500 transition-colors"
                >
                  Get started
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
