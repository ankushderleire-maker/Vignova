import Header from '@/components/Header';
import Footer from '@/components/Footer';

import type { Metadata } from 'next';
import { canonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'Vignova refund and cancellation policy — eligibility windows, how to request a refund, and how subscription cancellations are processed.',
  alternates: { canonical: canonical('/refund') },
  openGraph: {
    title: 'Refund Policy | Vignova',
    description:
      'Vignova refund and cancellation policy — eligibility windows, how to request a refund, and how subscription cancellations are processed.',
    url: canonical('/refund'),
  },
};

export default function RefundPolicy() {
  return (
    <main className="min-h-screen bg-[#F5F8FA] overflow-hidden">
      <Header />
      <section className="pt-32 pb-24 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-[#0A192F] tracking-tight mb-4">Refund & Cancellation Policy</h1>
          <p className="text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 p-8 md:p-12 text-slate-600 font-light leading-relaxed space-y-8">
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">1. Subscriptions and Cancellations</h2>
            <p>Vignova offers premium subscription plans and credit-based purchases for AI generation. You may cancel your subscription at any time. Your cancellation will take effect at the end of the current paid term. If you cancel, you will retain access to premium features until your paid period ends.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">2. Refund Eligibility</h2>
            <p className="mb-2">We strive to ensure satisfaction with our product, but due to the costs associated with AI processing, our standard policy is non-refundable. However, we may offer refunds in the following exceptional circumstances:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>If you were charged incorrectly due to a technical error on our platform.</li>
              <li>If the service experiences a prolonged outage directly impacting your ability to use the credits/subscription within your first 3 days of purchase.</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">3. Requesting a Refund</h2>
            <p>To request a refund under the exceptional circumstances listed above, please contact our support team at contact@vignova.io within 7 days of the charge. Please include your account email and a detailed explanation of the issue. We review all requests on a case-by-case basis.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">4. Changes to Plans</h2>
            <p>We reserve the right to modify our pricing and subscription plans at any time. Any price changes will apply to subsequent billing cycles following notice of the change(s) to you.</p>
          </div>
          
        </div>
      </section>
      <Footer />
    </main>
  );
}
