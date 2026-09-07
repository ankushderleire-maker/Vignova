/* Existing Vignova GA4 property and consent key, shared by every static page. */
(() => {
  'use strict';
  if (window.vignovaAnalytics) return;
  const measurementId = 'G-Z5QX5FCT9J';
  const consentKey = 'vignova.consent.analytics';
  const production = ['vignova.io', 'www.vignova.io'].includes(window.location.hostname);
  let choice = readConsent();
  let initialized = false;
  let sentPageView = false;
  let returnFocus = null;

  function readConsent() {
    try {
      const value = localStorage.getItem(consentKey);
      return ['granted', 'denied'].includes(value) ? value : null;
    } catch { return null; }
  }

  function gtag() {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(arguments);
  }

  function initialize() {
    // Local and staging previews never send data to the live property.
    // Basic consent mode: no Google requests until analytics is accepted.
    if (!production || choice !== 'granted') return;
    window['ga-disable-' + measurementId] = false;
    if (!initialized) {
      initialized = true;
      window.gtag = gtag;
      gtag('consent', 'default', {
        analytics_storage: 'denied', ad_storage: 'denied',
        ad_user_data: 'denied', ad_personalization: 'denied'
      });
      gtag('consent', 'update', { analytics_storage: 'granted' });
      gtag('js', new Date());
      gtag('config', measurementId, { send_page_view: false });
      const library = document.createElement('script');
      library.async = true;
      library.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
      document.head.append(library);
    } else {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
    if (!sentPageView) {
      sentPageView = true;
      gtag('event', 'page_view', {
        page_path: window.location.pathname,
        page_location: window.location.href,
        page_title: document.title
      });
    }
  }

  function applyChoice(value, persist = true) {
    choice = value;
    if (persist) {
      try { localStorage.setItem(consentKey, value); } catch { /* Choice lasts for this page. */ }
    }
    if (choice === 'granted') initialize();
    else if (initialized) {
      window['ga-disable-' + measurementId] = true;
      gtag('consent', 'update', { analytics_storage: 'denied' });
    }
    banner.hidden = value !== null;
    if (returnFocus && banner.hidden) { returnFocus.focus(); returnFocus = null; }
  }

  const banner = document.createElement('section');
  banner.className = 'analytics-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Analytics cookie preferences');
  banner.innerHTML = '<div><strong>Your privacy, your choice.</strong><p>Allow analytics cookies to help us understand how people use Vignova. Analytics stays off until you accept. <a href="/privacy/">Privacy policy</a></p></div><div class="analytics-actions"><button type="button" data-consent="denied">Reject</button><button type="button" data-consent="granted">Accept analytics</button></div>';
  banner.hidden = choice !== null;
  banner.querySelectorAll('[data-consent]').forEach(button => {
    button.addEventListener('click', () => applyChoice(button.dataset.consent));
  });
  document.body.append(banner);

  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'analytics-settings';
  settings.textContent = 'Cookie settings';
  settings.addEventListener('click', () => {
    returnFocus = settings;
    banner.hidden = false;
    banner.querySelector('button').focus();
  });
  const footer = document.querySelector('footer');
  (document.querySelector('.footer-bottom') || footer || document.body).append(settings);

  window.addEventListener('storage', event => {
    if (event.key === consentKey || event.key === null) applyChoice(readConsent(), false);
  });

  function trackEvent(name, params = {}) {
    if (production && choice === 'granted' && initialized) gtag('event', name, params);
  }
  function placement(link) {
    if (link.closest('footer')) return 'footer';
    if (link.closest('header')) return 'header';
    if (link.closest('.hero')) return 'hero';
    if (link.closest('#extension')) return 'extension_section';
    if (link.closest('.closing-section')) return 'bottom_cta';
    const pricing = link.closest('.pricing-card');
    if (pricing) return 'pricing_' + (pricing.querySelector('h3')?.textContent || 'plan').toLowerCase();
    return link.closest('section[id]')?.id || window.location.pathname;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.href, window.location.href);
    const location = placement(link);
    if (url.hostname === 'chromewebstore.google.com') {
      trackEvent('extension_install_click', { location });
    } else if ((url.hostname === 'app.vignova.io' && ['/register', '/login'].includes(url.pathname.replace(/\/$/, ''))) ||
      (url.origin === window.location.origin && url.pathname === '/start/')) {
      trackEvent('sign_up_click', { location });
    }
  });
  window.vignovaAnalytics = { trackEvent };
  initialize();
})();
