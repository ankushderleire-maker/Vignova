import React from 'react';
import { PageLayout } from '@/components/landing/PageLayout';

export const metadata = {
    title: 'Privacy Policy – Vignova',
    description: 'Vignova privacy policy. Learn how we handle your data securely and responsibly.',
};

export default function PrivacyPage() {
    return (
        <PageLayout>
            <article className="max-w-3xl">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
                    Privacy Policy
                </h1>
                <p className="text-slate-500 text-lg mb-12">
                    Last updated: March 14, 2026
                </p>

                <div className="space-y-10 text-slate-600 leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">1. Introduction</h2>
                        <p>
                            Vignova (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
                            This Privacy Policy explains how we collect, use, and safeguard your personal information
                            when you use our AI-powered career platform, browser extension, and associated services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">2. Information We Collect</h2>
                        <p className="mb-4">We collect the following types of information:</p>
                        <ul className="list-disc list-inside space-y-2 pl-4 text-slate-500">
                            <li><span className="text-slate-900 font-medium">Account Information:</span> Name, email address, and authentication credentials when you create an account.</li>
                            <li><span className="text-slate-900 font-medium">Career Profile Data:</span> Resume content, work experience, education, skills, and career preferences you provide to generate tailored resumes.</li>
                            <li><span className="text-slate-900 font-medium">Job Application Data:</span> Job descriptions, application statuses, and tracking information you store in our platform.</li>
                            <li><span className="text-slate-900 font-medium">Usage Data:</span> Analytics such as pages visited, features used, and session duration to improve our services.</li>
                            <li><span className="text-slate-900 font-medium">Extension Data:</span> Job listing information processed by our Chrome extension for autofill and matching features.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">3. How We Use Your Information</h2>
                        <ul className="list-disc list-inside space-y-2 pl-4 text-slate-500">
                            <li>Generate AI-tailored resumes optimized for specific job descriptions.</li>
                            <li>Provide ATS compatibility scoring and keyword analysis.</li>
                            <li>Track and manage your job applications.</li>
                            <li>Autofill job application forms via our browser extension.</li>
                            <li>Improve our AI models and platform features.</li>
                            <li>Communicate service updates and important announcements.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">4. Browser Extension & URL Tracking</h2>
                        <p className="mb-4">
                            Our browser extension requests access to your browsing context (the &lt;all_urls&gt; permission) to function effectively across the web.
                        </p>
                        <ul className="list-disc list-inside space-y-2 pl-4 text-slate-500 mb-4">
                            <li><span className="text-slate-900 font-medium">Why we need it:</span> Job applications are hosted on thousands of different domains (e.g., Workday, Greenhouse, LinkedIn). The extension must activate universally to detect form fields on any job board you visit.</li>
                            <li><span className="text-slate-900 font-medium">What we collect:</span> We only scan the Document Object Model (DOM) of active job application forms to extract field labels (e.g., &quot;First Name&quot;, &quot;Resume&quot;).</li>
                            <li><span className="text-slate-900 font-medium">Privacy guarantee:</span> We <strong>do not</strong> read, track, or scrape your web browsing history outside of an active job application. This data is only transmitted to generate your tailored applications and is never sold to third parties.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">5. Data Security</h2>
                        <p>
                            We implement industry-standard security measures including encryption at rest and in transit,
                            secure cloud infrastructure (Google Cloud), and regular security audits. Your career data is
                            stored in encrypted databases and is never shared with third parties for advertising purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">6. AI Processing</h2>
                        <p>
                            Vignova uses Google Gemini AI to process your career information and generate tailored resumes.
                            Your data is processed securely and is not used to train external AI models.
                            All AI-generated content is created specifically for your use and is not stored beyond your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">7. Data Retention</h2>
                        <p>
                            We retain your personal data for as long as your account is active. You can request deletion
                            of your account and all associated data at any time by contacting us at{' '}
                            <a href="mailto:hello@vignova.io" className="text-blue-600 hover:underline">hello@vignova.io</a>.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">8. Your Rights</h2>
                        <p className="mb-4">You have the right to:</p>
                        <ul className="list-disc list-inside space-y-2 pl-4 text-slate-500">
                            <li>Access and download your personal data.</li>
                            <li>Request correction of inaccurate information.</li>
                            <li>Request deletion of your account and data.</li>
                            <li>Opt out of non-essential communications.</li>
                            <li>Export your resumes and career profile.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">9. Contact Us</h2>
                        <p>
                            For privacy-related questions or requests, contact us at{' '}
                            <a href="mailto:hello@vignova.io" className="text-blue-600 hover:underline">hello@vignova.io</a>.
                        </p>
                    </section>
                </div>
            </article>
        </PageLayout>
    );
}
