// ---------------------------------------------------------------------------
// Google Analytics 4
//
// Paste your Measurement ID here (Admin -> Data streams -> Web -> "G-XXXXXXXXXX").
// This is a public identifier — it is visible in the page source of every site
// that uses GA4 — so it is not a secret and does not belong in .env (which
// .dockerignore excludes from the image anyway).
//
// While this is left as the placeholder, no analytics script is loaded at all.
// ---------------------------------------------------------------------------
export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID || 'G-Z5QX5FCT9J';

export const gaEnabled =
  /^G-[A-Z0-9]{6,}$/.test(GA_MEASUREMENT_ID) &&
  GA_MEASUREMENT_ID !== 'G-XXXXXXXXXX';

export const CONSENT_STORAGE_KEY = 'vignova.consent.analytics';

type ConsentChoice = 'granted' | 'denied';

export function readConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    // localStorage can throw in private mode or when cookies are blocked.
    return null;
  }
}

export function writeConsent(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Non-fatal: the banner just reappears next visit.
  }
}

type GtagArgs =
  | ['js', Date]
  | ['config', string, Record<string, unknown>?]
  | ['event', string, Record<string, unknown>?]
  | ['consent', 'default' | 'update', Record<string, string | number>];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

function gtag(...args: GtagArgs) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

/** Called when the visitor accepts or rejects analytics cookies. */
export function updateConsent(choice: ConsentChoice) {
  // Only analytics storage is granted. Ad storage stays denied — we do not run
  // ads or build advertising audiences. Revisit if that ever changes.
  gtag('consent', 'update', {
    analytics_storage: choice,
  });
}

/** Fires a page_view. Automatic page_view is disabled so SPA navigation counts. */
export function trackPageView(url: string) {
  if (!gaEnabled) return;
  gtag('event', 'page_view', {
    page_path: url,
    page_location: window.location.href,
    page_title: document.title,
  });
}

/**
 * Fires a GA4 event. `location` should say where on the page the click came
 * from (hero, cta, footer...) so conversions can be attributed to a placement.
 */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!gaEnabled) return;
  gtag('event', name, params);
}
