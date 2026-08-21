import Header from '@/components/Header';
import Footer from '@/components/Footer';

import type { Metadata } from 'next';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Shipping & Delivery Policy',
  description:
    'Vignova is a digital service. How and when access to your subscription and generated documents is delivered after purchase.',
  alternates: { canonical: canonical('/shipping') },
  openGraph: {
    title: 'Shipping & Delivery Policy | Vignova',
    description:
      'Vignova is a digital service. How and when access to your subscription and generated documents is delivered after purchase.',
    url: canonical('/shipping'),
  },
};

export default function ShippingPolicy() {
  return (
    <main className="min-h-screen bg-[#F5F8FA] overflow-hidden">
      <Header />
      <section className="pt-32 pb-24 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-[#0A192F] tracking-tight mb-4">Shipping & Delivery Policy</h1>
          <p className="text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 p-8 md:p-12 text-slate-600 font-light leading-relaxed space-y-8">
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">1. Digital Product — No Physical Shipping</h2>
            <p>Vignova is a fully digital, cloud-based Software-as-a-Service (SaaS) platform. All products and services offered — including AI-generated resumes, cover letters, ATS optimization tools, interview preparation, and job tracking — are delivered electronically through our web application.</p>
            <p className="mt-3 font-medium text-slate-800">No physical goods are sold, shipped, or delivered. Therefore, no shipping or postal delivery is involved in any transaction.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">2. How You Access Your Purchase</h2>
            <p className="mb-2">Upon successful payment, your purchase is delivered instantly and digitally:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Subscription Plans:</strong> Your account is upgraded immediately. Premium features are unlocked and accessible right away from your dashboard at <a href="https://app.vignova.io" className="text-blue-600 hover:underline">app.vignova.io</a>.</li>
              <li><strong>AI Credits:</strong> Credits are added to your account balance instantly and can be used immediately for resume generation, cover letter creation, and other AI-powered services.</li>
              <li><strong>Generated Documents:</strong> All AI-generated resumes, cover letters, and reports are available for instant download in PDF format directly from your dashboard.</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">3. Delivery Timeframe</h2>
            <p>All digital services are delivered <strong>instantly</strong> upon successful payment confirmation. In rare cases of payment processing delays, delivery may take up to <strong>5–10 minutes</strong>. If you do not receive access within 30 minutes of payment, please contact our support team.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">4. Service Availability</h2>
            <p>Our platform is accessible 24/7 from any device with an internet connection and a modern web browser. We strive to maintain 99.9% uptime, though occasional maintenance windows may occur with prior notice.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">5. Issues with Delivery</h2>
            <p className="mb-2">If you experience any issues accessing your purchased services or credits, please reach out to us. Common issues and resolutions include:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Payment confirmed but features not unlocked:</strong> Try logging out and back in, or wait a few minutes for the system to sync.</li>
              <li><strong>Credits not reflected:</strong> Contact support with your payment receipt and we will resolve it promptly.</li>
              <li><strong>Unable to download generated documents:</strong> Ensure you are using a supported browser (Chrome, Firefox, Safari, or Edge).</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">6. Contact Us</h2>
            <p>If you have any questions about this Shipping & Delivery Policy or face any delivery-related issues, please contact us:</p>
            <p className="mt-2 font-medium text-blue-600">Email: contact@vignova.io</p>
          </div>

        </div>
      </section>
      <Footer />
    </main>
  );
}
