export const SITE_URL = 'https://vignova.io';
export const SITE_NAME = 'Vignova';

// The static export runs with trailingSlash: true, so canonicals must carry the
// slash too — otherwise every canonical points at a URL that 301s.
export function canonical(path = '/') {
  const clean = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}/`;
  return `${SITE_URL}${clean}`;
}
