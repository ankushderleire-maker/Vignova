import Link from 'next/link';
import { Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0A192F] pt-24 pb-12 border-t border-white/10 text-slate-300">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-1.5 mb-6 group w-fit">
              <img
                src="/logo.png"
                alt="Vignova Logo"
                width={40}
                height={40}
                className="object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <span className="text-xl font-extrabold tracking-[0.08em] text-white uppercase">Vignova</span>
            </Link>
            <p className="text-sm font-light leading-relaxed mb-6 max-w-[280px]">
              AI-powered career platform. Create tailored resumes, optimize for ATS systems, and apply to jobs faster.
            </p>
            <a href="mailto:contact@vignova.io" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
              <Mail className="w-4 h-4" />
              contact@vignova.io
            </a>
          </div>
          
          <div className="md:ml-auto">
            <h4 className="font-semibold text-white tracking-tight mb-6">Product</h4>
            <ul className="space-y-4 text-sm font-light">
              <li><Link href="/#features" className="hover:text-white transition-colors">Features</Link></li>
              <li><Link href="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><a href="https://app.vignova.io/login" className="hover:text-white transition-colors">Get Started</a></li>
            </ul>
          </div>
          
          <div className="md:ml-auto">
            <h4 className="font-semibold text-white tracking-tight mb-6">Company</h4>
            <ul className="space-y-4 text-sm font-light">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          <div className="md:ml-auto">
            <h4 className="font-semibold text-white tracking-tight mb-6">Legal</h4>
            <ul className="space-y-4 text-sm font-light">
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms</Link></li>
              <li><Link href="/refund" className="hover:text-white transition-colors">Refund Policy</Link></li>
              <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Policy</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm font-light text-slate-500">
            &copy; {currentYear} Vignova. All rights reserved.
          </p>
          <p className="text-sm font-light text-slate-500">
            Built with AI. Designed for job seekers.
          </p>
        </div>
      </div>
    </footer>
  );
}
