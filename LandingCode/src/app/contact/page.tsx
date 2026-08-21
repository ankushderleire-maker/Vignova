import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Mail, MapPin } from 'lucide-react';

import type { Metadata } from 'next';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Contact & Support',
  description:
    'Get in touch with the Vignova team. Questions about AI resume tailoring, billing, the Chrome extension or partnerships — we reply within one business day.',
  alternates: { canonical: canonical('/contact') },
  openGraph: {
    title: 'Contact & Support | Vignova',
    description:
      'Get in touch with the Vignova team. Questions about AI resume tailoring, billing, the Chrome extension or partnerships — we reply within one business day.',
    url: canonical('/contact'),
  },
};

export default function ContactUs() {
  return (
    <main className="min-h-screen bg-[#F5F8FA] overflow-hidden">
      <Header />
      <section className="pt-32 pb-24 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-[#0A192F] tracking-tight mb-4">Contact Us</h1>
          <p className="text-xl text-slate-500">We&apos;d love to hear from you. Here&apos;s how you can reach us.</p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-[#0A192F] mb-6">Get in Touch</h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Whether you have a question about features, pricing, need a demo, or anything else, our team is ready to answer all your questions.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0A192F]">Email Support</p>
                    <a href="mailto:contact@vignova.io" className="text-blue-600 hover:underline">contact@vignova.io</a>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0A192F]">Location</p>
                    <p className="text-slate-600">Dublin, Ireland</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-[#F8FAFC] p-8 rounded-2xl border border-slate-100">
               <h3 className="text-xl font-bold text-[#0A192F] mb-4">Response Time</h3>
               <p className="text-slate-600 leading-relaxed mb-4">
                 Our standard support hours are Monday through Friday, 9am to 5pm EST. 
               </p>
               <p className="text-slate-600 leading-relaxed">
                 We aim to respond to all inquiries within 24-48 hours. For urgent billing issues, please include &quot;URGENT&quot; in your email subject line.
               </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
