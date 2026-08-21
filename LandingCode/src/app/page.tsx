import type { Metadata } from 'next';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SocialProof from '@/components/SocialProof';
import FeaturesGrid from '@/components/FeaturesGrid';
import MasterProfile from '@/components/MasterProfile';
import ExtensionFeature from '@/components/ExtensionFeature';
import ResumeAnalysis from '@/components/ResumeAnalysis';
import LinkedInOptimizer from '@/components/LinkedInOptimizer';
import JobTracker from '@/components/JobTracker';
import CareerRoadmap from '@/components/CareerRoadmap';
import UseCases from '@/components/UseCases';
import FAQ from '@/components/FAQ';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { faqs } from '@/lib/faqs';
import { SITE_NAME, SITE_URL, canonical } from '@/lib/seo';

export const metadata: Metadata = {
  title: { absolute: 'AI Resume Tailoring That Beats the ATS | Vignova' },
  description:
    'Vignova tailors your resume to any job description in seconds. AI resume tailoring, ATS scoring, job tracking and a Chrome extension in one platform.',
  alternates: { canonical: canonical('/') },
};

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  '@id': `${SITE_URL}/#software`,
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Resume Builder',
  operatingSystem: 'Web, Chrome',
  url: canonical('/'),
  description:
    'AI resume tailoring platform that rewrites your resume for each job description, scores it against applicant tracking systems, optimizes your LinkedIn profile and tracks every application.',
  publisher: { '@id': `${SITE_URL}/#organization` },
  featureList: [
    'AI resume tailoring against any job description',
    'ATS score analysis across keywords, semantics, sections, impact, format and readability',
    'Master Profile as a single source of truth for every resume',
    'AI cover letter generation',
    'LinkedIn profile optimizer',
    'Kanban job application tracker',
    'Chrome extension for LinkedIn job postings',
  ],
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free tier with paid premium subscription available.',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${SITE_URL}/#faq`,
  mainEntity: faqs.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
};

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-brand-500/30">
      <JsonLd data={[softwareSchema, faqSchema]} />
      <Header />
      <Hero />
      <FeaturesGrid />
      <SocialProof />
      <MasterProfile />
      <ResumeAnalysis />
      <ExtensionFeature />
      <LinkedInOptimizer />
      <JobTracker />
      <CareerRoadmap />
      <UseCases />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
