'use client';


import { Search, Menu } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Premium Glassmorphic Navy Background */}
      <div className="absolute inset-0 bg-[#0A192F]/90 backdrop-blur-md border-b border-white/10 shadow-sm h-20 -z-10 pointer-events-none" />
      
      <div className="w-full px-4 md:px-8 xl:px-12 2xl:px-20 max-w-[1800px] mx-auto pt-5 pb-5 pointer-events-auto h-20 flex items-center">
        <div className="flex items-center justify-between w-full">
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-1 cursor-pointer group w-auto">
            <img 
              src="/logo.png" 
              alt="Vignova Logo" 
              width={56} 
              height={56} 
              className="object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-[32px] font-extrabold tracking-normal text-white uppercase" style={{ fontFamily: "'Inter', 'Helvetica Neue', sans-serif" }}>VIGNOVA</span>
          </Link>
          
          {/* Navigation - Centered */}
          <nav className="hidden lg:flex items-center justify-center gap-10 text-[15px] font-medium text-white/90 flex-1">
            <a href="/how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="/blog" className="hover:text-white transition-colors">Blog</a>
            <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
          </nav>

          {/* CTA & Icons - Right aligned */}
          <div className="flex items-center justify-end gap-6 w-auto lg:w-72">
            <button onClick={() => window.location.href = 'https://app.vignova.io/login'} className="hidden md:block text-[15px] font-bold text-white/80 hover:text-white transition-colors">Log in</button>
            <button onClick={() => window.location.href = 'https://app.vignova.io/login'} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[15px] font-bold rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95">
              Start testing
            </button>
            <button className="text-slate-400 hover:text-white transition-colors">
              <Search className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
