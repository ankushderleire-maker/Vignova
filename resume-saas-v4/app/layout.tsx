import { Providers } from "./providers";
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
  title: { default: "Vignova", template: "%s | Vignova" },
  description: "Sign in to Vignova, the AI career workspace for resumes, ATS checks, LinkedIn and Naukri profiles, and job applications.",
  // The marketing site at vignova.io is what belongs in search results. App
  // pages are also noindexed by the X-Robots-Tag header in next.config.ts.
  robots: { index: false, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} ${geistMono.variable} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('vignova-theme');
                  var theme = savedTheme || 'dark';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark' || theme === 'wine-dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}