'use client';

import Script from 'next/script';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { GA_MEASUREMENT_ID, gaEnabled, trackPageView } from '@/lib/analytics';

/**
 * Loads gtag.js and fires page views.
 *
 * The Consent Mode v2 defaults are emitted separately in the root layout, as a
 * plain inline script in the static HTML, so they are guaranteed to run before
 * this library loads. Automatic page_view is disabled in that bootstrap and
 * fired here instead, because App Router client-side navigation does not
 * reload the page.
 */
export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!gaEnabled || !pathname) return;
    trackPageView(pathname);
  }, [pathname]);

  if (!gaEnabled) return null;

  return (
    <Script
      id="ga-lib"
      strategy="afterInteractive"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
    />
  );
}
