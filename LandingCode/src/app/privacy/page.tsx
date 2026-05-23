import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-[#F5F8FA] overflow-hidden">
      <Header />
      <section className="pt-32 pb-24 px-4 md:px-8 max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-[#0A192F] tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-slate-500">Last updated: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl shadow-blue-500/5 p-8 md:p-12 text-slate-600 font-light leading-relaxed space-y-8">
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">1. Introduction</h2>
            <p>Welcome to Vignova. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">2. The Data We Collect About You</h2>
            <p className="mb-2">We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Identity Data</strong> includes first name, last name, username or similar identifier.</li>
              <li><strong>Contact Data</strong> includes email address and telephone numbers.</li>
              <li><strong>Career Data</strong> includes resumes, CVs, job history, skills, and cover letters provided by you.</li>
              <li><strong>Technical Data</strong> includes internet protocol (IP) address, browser type and version, time zone setting and location, operating system and platform.</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">3. How We Use Your Personal Data</h2>
            <p className="mb-2">We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Where we need to perform the contract we are about to enter into or have entered into with you (e.g., generating tailored resumes).</li>
              <li>Where it is necessary for our legitimate interests and your interests and fundamental rights do not override those interests.</li>
              <li>Where we need to comply with a legal obligation.</li>
            </ul>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">4. Data Security</h2>
            <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">5. Third-Party Links</h2>
            <p>This website and application may include links to third-party websites, plug-ins and applications. Clicking on those links or enabling those connections may allow third parties to collect or share data about you. We do not control these third-party websites and are not responsible for their privacy statements.</p>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-[#0A192F] mb-4">6. Contact Details</h2>
            <p>If you have any questions about this privacy policy or our privacy practices, please contact us in the following ways:</p>
            <p className="mt-2 font-medium text-blue-600">Email address: contact@vignova.io</p>
          </div>

        </div>
      </section>
      <Footer />
    </main>
  );
}
