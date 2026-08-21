'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CONSENT_STORAGE_KEY,
  gaEnabled,
  readConsent,
  updateConsent,
  writeConsent,
} from '@/lib/analytics';

const CONSENT_EVENT = 'vignova:consent';

// localStorage is an external store, so useSyncExternalStore is the right tool:
// it reads after hydration without a setState-in-effect, and React handles the
// server/client mismatch itself.
function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CONSENT_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

const getSnapshot = () => readConsent();
// Nothing is rendered into the static HTML — the banner appears after hydration.
const getServerSnapshot = () => 'denied' as const;

export default function CookieConsent() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function choose(choice: 'granted' | 'denied') {
    writeConsent(choice);
    updateConsent(choice);
    window.dispatchEvent(new Event(CONSENT_EVENT));
  }

  if (!gaEnabled) return null;

  return (
    <AnimatePresence>
      {consent === null && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-label="Cookie preferences"
          className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-sm p-5 shadow-2xl shadow-blue-900/10 md:left-6 md:right-6 md:p-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
            <p className="flex-1 text-sm leading-relaxed text-slate-600">
              We use analytics cookies to understand how people find and use Vignova.
              Nothing is collected unless you accept, and we never sell your data. See our{' '}
              <Link
                href="/privacy/"
                className="font-semibold text-blue-600 underline underline-offset-2 hover:text-blue-500"
              >
                privacy policy
              </Link>
              .
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => choose('denied')}
                className="h-11 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-[#0A192F] transition-colors duration-200 hover:border-gray-300 hover:bg-gray-50"
              >
                Reject
              </button>
              <button
                type="button"
                onClick={() => choose('granted')}
                className="h-11 rounded-xl bg-[#0A192F] px-6 text-sm font-semibold text-white shadow-lg shadow-blue-900/20 transition-all duration-200 hover:bg-[#0d2240] hover:shadow-xl"
              >
                Accept
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { CONSENT_STORAGE_KEY };
