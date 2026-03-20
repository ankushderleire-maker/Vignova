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
  title: "Vignova | Job Copilot",
  description: "Tailor resumes, track job applications, and autofill job forms automatically using AI. Generate optimized resumes, improve ATS scores, and apply faster with Vignova.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white relative text-slate-900 overflow-x-hidden`}
      >
        {/* Persistent Global Ambient Background */}
        <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-white">
          {/* Left Edge Glow - Soft Blue */}
          <div className="absolute top-1/2 left-0 w-[600px] h-[800px] bg-blue-500/5 blur-[150px] rounded-full -translate-x-1/2 -translate-y-1/2 opacity-80" />

          {/* Right Edge Glow - Soft Blue */}
          <div className="absolute top-1/2 right-0 w-[600px] h-[800px] bg-blue-500/4 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2 opacity-80" />
        </div>

        {children}
      </body>
    </html>
  );
}
