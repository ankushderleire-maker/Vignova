import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsAndConditions() {
  return (
    <main className="min-h-screen bg-[#F5F8FA] overflow-hidden">
      <Header />
      <section className="pt-32 pb-24 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-[#0A192F] tracking-tight mb-4">Terms and Conditions</h1>
          <p className="text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 p-8 md:p-12 text-slate-600 font-light leading-relaxed space-y-8">
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">1. Agreement to Terms</h2>
            <p>By viewing or using Vignova, you agree to be bound by these Terms and Conditions. If you do not agree with any of these terms, you are prohibited from using or accessing this site.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">2. Use License</h2>
            <p className="mb-2">Permission is granted to temporarily use the Vignova platform for personal, non-commercial use. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>modify or copy the materials;</li>
              <li>use the materials for any commercial purpose, or for any public display;</li>
              <li>attempt to decompile or reverse engineer any software contained on Vignova;</li>
              <li>transfer the materials to another person or "mirror" the materials on any other server.</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">3. Accounts & Subscriptions</h2>
            <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password. Certain aspects of the Service are provided for a fee or other charge. If you elect to use paid aspects of the Service, you agree to the pricing and payment terms.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">4. AI-Generated Content</h2>
            <p>Vignova uses Artificial Intelligence to generate and optimize resumes and cover letters. While we strive for high quality, we do not guarantee the accuracy, completeness, or usefulness of any AI-generated content. You are solely responsible for reviewing and verifying all generated documents before using them in any job application.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">5. Disclaimer</h2>
            <p>The materials on Vignova's website are provided on an 'as is' basis. Vignova makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">6. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at contact@vignova.io.</p>
          </div>

        </div>
      </section>
      <Footer />
    </main>
  );
}
