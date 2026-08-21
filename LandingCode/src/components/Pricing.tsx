'use client';

import { Check } from 'lucide-react';
import { APP_URL } from '@/lib/seo';
import { trackEvent } from '@/lib/analytics';

export default function Pricing() {
  return (
    <section className="relative py-20 bg-[#F5F8FA] overflow-hidden">
      {/* Abstract Ambient Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -right-[10%] w-[60%] h-[60%] rounded-full bg-gradient-to-tl from-indigo-500/30 to-transparent blur-[100px] animate-orb-slow"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-blue-500/40 to-transparent blur-[120px] animate-orb"></div>
      </div>
      <div className="container mx-auto px-4 md:px-6 max-w-5xl relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-[#0A192F] mb-6">
            Transparent pricing. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0A192F] to-[#2563EB]">Infinite ROI.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border/50 border border-border/50 rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5">
          {/* Free Tier */}
          <div className="p-12 bg-white">
            <h3 className="text-2xl font-bold tracking-tight text-foreground mb-2">Hobby</h3>
            <p className="text-muted text-sm font-light mb-12">Essential tools to audit your baseline resume.</p>
            <div className="mb-12">
              <span className="text-6xl font-bold tracking-tighter text-foreground">$0</span>
              <span className="text-muted font-medium ml-2">/forever</span>
            </div>
            <ul className="space-y-5 mb-12">
              {['1 Resume ATS Scan per month', 'Basic formatting checks', 'Limited Job matches', 'Community support'].map((item, i) => (
                <li key={i} className="flex items-start gap-4 text-sm text-muted font-light">
                  <Check className="w-5 h-5 text-gray-300 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button onClick={() => { trackEvent('sign_up_click', { location: 'pricing_free' }); window.location.href = APP_URL; }} className="w-full h-14 rounded-full border border-gray-200 text-foreground font-medium hover:bg-gray-50 transition-colors shadow-sm">
              Start Building
            </button>
          </div>

          {/* Pro Tier */}
          <div className="p-12 bg-black text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-600 rounded-full blur-[120px] opacity-20 transform translate-x-1/2 -translate-y-1/2"></div>
            
            <div className="inline-flex px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold tracking-widest uppercase mb-6 border border-white/10 backdrop-blur-md">
              Most Popular
            </div>
            <h3 className="text-2xl font-bold tracking-tight mb-2">Pro</h3>
            <p className="text-gray-400 text-sm font-light mb-8">Full access to the intelligence engine.</p>
            <div className="mb-12">
              <span className="text-6xl font-bold tracking-tighter">$19</span>
              <span className="text-gray-400 font-medium ml-2">/month</span>
            </div>
            <ul className="space-y-5 mb-12 relative z-10">
              {[
                'Unlimited ATS Resume Scans',
                'Advanced Keyword & Impact Optimization',
                'Unlimited AI Mock Interviews',
                'Personalized Career Roadmap',
                'Priority Support'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-4 text-sm text-gray-300 font-light">
                  <Check className="w-5 h-5 text-brand-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <button onClick={() => { trackEvent('sign_up_click', { location: 'pricing_premium' }); window.location.href = APP_URL; }} className="w-full h-14 rounded-full bg-white text-black font-medium hover:bg-gray-100 transition-colors relative z-10 shadow-xl shadow-white/10">
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
