export const SITE_URL = 'https://vignova.io';
export const SITE_NAME = 'Vignova';

// The static export runs with trailingSlash: true, so canonicals must carry the
// slash too — otherwise every canonical points at a URL that 301s.
export function canonical(path = '/') {
  const clean = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}/`;
  return `${SITE_URL}${clean}`;
}

export const APP_URL = 'https://app.vignova.io/login';

// utm params let the Chrome Web Store developer dashboard attribute installs
// back to the website. The placement is tracked separately as a GA4 event.
export const EXTENSION_URL =
  'https://chromewebstore.google.com/detail/oalpfkabaipgcjimbcapeeaoipeikkha?utm_source=vignova.io&utm_medium=website';
