import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vignova.io"),
  title: "Vignova - The #1 AI Career Copilot",
  description: "Navigate your career with precision. AI-driven resume analysis, intelligent job matching, and personalized interview prep to help you land your dream role faster.",
  keywords: ["AI Resume Builder", "ATS Scanner", "Career Copilot", "Mock Interviews", "Job Tracker"],
  authors: [{ name: "Vignova" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://vignova.io",
    title: "Vignova - The #1 AI Career Copilot",
    description: "AI-driven resume analysis, intelligent job matching, and personalized interview prep.",
    siteName: "Vignova",
    images: [
      {
        url: "/og-image.jpg", // Assuming an image exists or will be added
        width: 1200,
        height: 630,
        alt: "Vignova Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vignova - The #1 AI Career Copilot",
    description: "AI-driven resume analysis, intelligent job matching, and personalized interview prep.",
    creator: "@vignova",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://vignova.io",
  },
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
      <body className={`${geistSans.className} min-h-full flex flex-col`}>{children}</body>
    </html>
  );
}
