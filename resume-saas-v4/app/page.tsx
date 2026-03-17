"use client";

import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { TemplateGallery } from "@/components/landing/TemplateGallery";
import { Testimonials } from "@/components/landing/Testimonials";
import { Footer } from "@/components/landing/Footer";
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white relative">

      {/* Nav Overlay (Simple for now) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="font-bold text-white flex items-end">
            <img src="/logo.png" alt="Vignova Logo" width={48} height={48} className="w-12 h-12 object-contain" />
            <span className="mb-0.5 -ml-2 z-10 text-2xl tracking-tight">VIGNOVA</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-300 hover:text-white text-sm font-medium">Log In</Link>
            <Link href="/register" className="px-4 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200">Get Started</Link>
          </div>
        </div>
      </nav>

      <Hero />
      <Features />
      <TemplateGallery />
      <Testimonials />

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-b from-zinc-900 to-black text-center">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Ready to Build Your Future?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Join thousands of professionals who have accelerated their careers with our AI-powered resume builder.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-black transition-all duration-200 bg-green-500 rounded-lg hover:bg-green-400 hover:scale-105 shadow-[0_0_30px_rgba(34,197,94,0.3)]"
          >
            Create My Resume Now
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
