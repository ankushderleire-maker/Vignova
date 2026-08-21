import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL, canonical } from "@/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// NOTE: no `alternates` here on purpose. An absolute canonical set on the root
// layout is inherited by every child route, which pointed all pages at the
// homepage. Each page declares its own canonical instead.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Resume Tailoring That Beats the ATS | Vignova",
    template: "%s | Vignova",
  },
  description:
    "Vignova tailors your resume to any job description in seconds. AI resume tailoring, ATS scoring, job tracking and a Chrome extension in one platform.",
  keywords: [
    "AI resume tailoring",
    "AI resume builder",
    "tailor resume to job description",
    "ATS resume checker",
    "ATS score",
    "resume optimizer",
    "job application tracker",
    "LinkedIn profile optimizer",
  ],
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: canonical("/"),
    title: "AI Resume Tailoring That Beats the ATS | Vignova",
    description:
      "Tailor your resume to any job description in seconds, score it against the ATS, and track every application — all in one platform.",
    siteName: SITE_NAME,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Vignova — AI resume tailoring and ATS optimization",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Resume Tailoring That Beats the ATS | Vignova",
    description:
      "Tailor your resume to any job description in seconds, score it against the ATS, and track every application.",
    creator: "@vignova",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: canonical("/"),
  logo: `${SITE_URL}/logo.png`,
  description:
    "Vignova is an AI career platform that tailors resumes to job descriptions, scores them against applicant tracking systems, and tracks every application.",
  founder: {
    "@type": "Person",
    name: "Ankush Derle",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "contact@vignova.io",
    url: canonical("/contact"),
  },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: canonical("/"),
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "en-US",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${geistSans.className} h-full antialiased`}
    >
      <body className={`${geistSans.className} min-h-full flex flex-col`}>
        <JsonLd data={[organizationSchema, websiteSchema]} />
        {children}
      </body>
    </html>
  );
}
