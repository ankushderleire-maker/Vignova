import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

import type { Metadata } from 'next';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Vignova was built by a job seeker who got tired of rewriting the same resume fifty times. Meet the founder and the story behind the AI career platform.',
  alternates: { canonical: canonical('/about') },
  openGraph: {
    title: 'About Us | Vignova',
    description:
      'Vignova was built by a job seeker who got tired of rewriting the same resume fifty times. Meet the founder and the story behind the AI career platform.',
    url: canonical('/about'),
  },
};

export default function About() {
  return (
    <main className="min-h-screen bg-[#F5F8FA] overflow-hidden">
      <Header />
      
      <section className="pt-32 pb-24 px-4 md:px-8 max-w-4xl mx-auto relative z-10">
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-full max-w-2xl h-[400px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="text-center mb-16 relative">
           <h1 className="text-5xl md:text-6xl font-black text-[#0A192F] tracking-tight mb-6 leading-tight">
             Built for job seekers,<br/>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">by a job seeker.</span>
           </h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 border border-slate-100 p-8 md:p-12 relative overflow-hidden">
          {/* Background Logo Watermark */}
          <div className="absolute -right-20 -bottom-20 opacity-[0.03] pointer-events-none">
            <Image src="/logo.png" alt="" width={400} height={400} />
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start mb-10 relative z-10">
            <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-3xl shrink-0 border-4 border-white shadow-sm">
              AD
            </div>
            <div>
              <h3 className="text-3xl font-bold text-[#0A192F] mb-1">Ankush Derle</h3>
              <p className="text-blue-600 font-semibold mb-8 tracking-wide">Founder & Developer of Vignova</p>
              
              <div className="space-y-6 text-lg text-slate-600 leading-relaxed font-light">
                <p>
                  <strong className="font-semibold text-slate-800 text-xl">Hi, I&apos;m Ankush.</strong><br/>
                  I&apos;ve always loved building projects, but Vignova is incredibly close to my heart because it solves a very real, very frustrating problem that I experienced firsthand.
                </p>
                <p>
                  When I was applying for jobs, I constantly ran into the same roadblocks: struggling to format my resume properly, wondering if it was actually ATS-friendly, and never knowing if my keywords actually matched what recruiters were looking for. I couldn&apos;t figure out which roles I actually had a high chance of landing.
                </p>
                <p>
                  And then there were the application forms—the ones so painfully long that I&apos;d just quit halfway through. On top of that, keeping track of all the relevant jobs for my skill set was a nightmare.
                </p>
                <p>
                  I realized job hunting shouldn&apos;t be this broken. So, I built Vignova to fix it.
                </p>
                <blockquote className="border-l-4 border-blue-500 pl-6 py-4 my-10 text-xl font-medium text-slate-800 italic bg-blue-50/50 rounded-r-lg">
                  &quot;I wanted to create a single platform that strips away the tedious work, automates the formatting and keyword matching, and gives job seekers their time back so they can focus on what actually matters—preparing for interviews and landing the job.&quot;
                </blockquote>
                <p className="font-bold text-[#0A192F] text-2xl mt-8">
                  Welcome to Vignova. Let&apos;s get you hired.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
