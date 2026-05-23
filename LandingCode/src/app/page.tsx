import Header from '@/components/Header';
import Hero from '@/components/Hero';
import SocialProof from '@/components/SocialProof';
import FeaturesGrid from '@/components/FeaturesGrid';
import MasterProfile from '@/components/MasterProfile';
import ExtensionFeature from '@/components/ExtensionFeature';
import ResumeAnalysis from '@/components/ResumeAnalysis';
import JobTracker from '@/components/JobTracker';
import CareerRoadmap from '@/components/CareerRoadmap';
import Testimonials from '@/components/Testimonials';
import FAQ from '@/components/FAQ';
import CTA from '@/components/CTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground font-sans selection:bg-brand-500/30">
      <Header />
      <Hero />
      <FeaturesGrid />
      <SocialProof />
      <MasterProfile />
      <ResumeAnalysis />
      <ExtensionFeature />
      <JobTracker />
      <CareerRoadmap />
      <Testimonials />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
