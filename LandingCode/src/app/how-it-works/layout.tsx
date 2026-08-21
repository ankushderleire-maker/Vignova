import type { Metadata } from 'next';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, canonical } from '@/lib/seo';

// page.tsx is a client component, so its metadata has to live here.
export const metadata: Metadata = {
  title: 'How Vignova Tailors Your Resume With AI',
  description:
    'A step-by-step walkthrough: build your Master Profile, save a job, let AI tailor your resume to the job description, check the ATS score, and track the application.',
  alternates: { canonical: canonical('/how-it-works') },
  openGraph: {
    title: 'How Vignova Tailors Your Resume With AI',
    description:
      'Build a Master Profile, save a job, tailor your resume with AI, check the ATS score, and track every application.',
    url: canonical('/how-it-works'),
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: canonical('/') },
    { '@type': 'ListItem', position: 2, name: 'How It Works', item: canonical('/how-it-works') },
  ],
};

const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  '@id': `${SITE_URL}/how-it-works/#howto`,
  name: 'How to tailor your resume to a job description with AI',
  description:
    'Use Vignova to turn one Master Profile into a resume tailored to any job description, verified against an ATS score before you apply.',
  totalTime: 'PT5M',
  step: [
    { '@type': 'HowToStep', position: 1, name: 'Create your Master Profile', text: 'Import your LinkedIn profile or an existing PDF resume to build one career database of every skill, project, certification and metric.', url: `${SITE_URL}/how-it-works/#step-1` },
    { '@type': 'HowToStep', position: 2, name: 'Save the jobs you want', text: 'Save jobs from the built-in job board or straight from LinkedIn with the Vignova Chrome extension.', url: `${SITE_URL}/how-it-works/#step-2` },
    { '@type': 'HowToStep', position: 3, name: 'Tailor your resume with AI', text: 'Vignova cross-references the job description against your Master Profile, rewrites your bullet points and injects the keywords the ATS scans for.', url: `${SITE_URL}/how-it-works/#step-3` },
    { '@type': 'HowToStep', position: 4, name: 'Edit and perfect the draft', text: 'Review the AI draft in a side-by-side editor and edit, reorder or regenerate any section.', url: `${SITE_URL}/how-it-works/#step-4` },
    { '@type': 'HowToStep', position: 5, name: 'Check your ATS score', text: 'Run a deep ATS analysis scored across keywords, semantics, sections, impact, format and readability before you apply.', url: `${SITE_URL}/how-it-works/#step-5` },
    { '@type': 'HowToStep', position: 6, name: 'Track every application', text: 'Follow each application on a Kanban board from Saved through Tailoring, Applied, Interviewing and Offer.', url: `${SITE_URL}/how-it-works/#step-6` },
  ],
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={[breadcrumbSchema, howToSchema]} />
      {children}
    </>
  );
}
