# Vignova marketing website

The static website for https://vignova.io, hosted on Hostinger. The signed-in product at https://app.vignova.io is deployed separately from `resume-saas-v4`. `LandingCode` is the previous Next.js site, kept for reference and for its Node dependencies.

## How the site is built

| Pages | Source | Rendered by |
| --- | --- | --- |
| 12 product and tool pages | `content/pages/*.html` | `build-pages.py` |
| 11 career guides and the `/blog/` index | `content/articles/*.html` | `build-pages.py` |
| Homepage, about, contact, how it works, legal pages, 404 and the plan handoff | the HTML files themselves | edited directly; `sync-layout.py` applies the shared layout |

Source files begin with JSON front matter inside an HTML comment: path, title, H1, description, breadcrumbs, FAQs, related guides and images. `seo_site.py` defines the navigation, footer, canonical rules, redirects and structured data for every page.

The product and tool pages are `/ai-resume-builder/`, `/ats-resume-checker/`, `/resume-tailor/`, `/linkedin-profile-optimizer/`, `/naukri-profile-optimizer/`, `/job-application-tracker/`, `/resume-keyword-scanner/`, `/chrome-extension/`, `/job-application-autofill/`, `/cover-letter-generator/`, `/interview-preparation/` and `/tools/`.

## Build and package

From this folder:

    python build-pages.py
    python build.py

`build-pages.py` generates the social cards (`build-og.cjs`), renders the pages, guides, blog index and sitemap, writes the redirect block in `.htaccess` and runs `sync-layout.py`. `build.py` regenerates the favicons and default social card, validates the whole site and writes `hostinger-upload.zip`. Both use Node.js and Sharp from the adjacent LandingCode project; Hostinger needs none of this.

`build.py` stops at the first problem it finds, including:

- a page without exactly one H1, duplicate IDs or titles, or broken local links and anchors
- missing or mismatched title, description and social tags, or an Open Graph image that is not in the package
- a page without exactly one JSON-LD graph or the Organization identity, a page other than the homepage without breadcrumbs, or any rating or review data
- a canonical that is not the page's own URL, an indexable page missing from the sitemap, or a sitemap URL without a page
- links to redirected URLs or to `www` or `http` Vignova addresses, and pages that nothing links to
- images without alt text, width and height
- a robots.txt or `.htaccess` redirect rule that has gone missing

`migrate-blog.py`, `migrate-pages.py` and `prepare-seo.py` are retired and exit straight away. They built an earlier version of the site and would overwrite the current pages.

## Preview

    python -m http.server 4173 --bind 127.0.0.1

Then open http://127.0.0.1:4173/. The Python server ignores `.htaccess`, so check redirects after upload.

## Upload to Hostinger

1. Back up `public_html`, including `.htaccess` and any verification files.
2. Upload `hostinger-upload.zip` to `public_html` and extract it, so that `index.html`, `.htaccess`, `robots.txt` and `sitemap.xml` sit directly inside `public_html`. Keep any host-specific rules when merging `.htaccess`.
3. Delete the folders this release replaces with redirects, if they exist: `public_html/blog/how-vignova-works/` and `public_html/blog/sample-post/`. Delete `public_html/images/` as well if an earlier release left it behind.
4. Purge the Hostinger or CDN cache.
5. Run `python verify-live.py` and fix anything it reports. SEO-MIGRATION.md lists the Search Console steps.

## Editing

| File | Purpose |
| --- | --- |
| content/pages, content/articles | Product, tool and guide copy with front matter |
| seo_site.py | Navigation, footer, canonical URLs, redirects and structured data |
| build-pages.py, sync-layout.py, build-og.cjs | Rendering, shared layout and social cards |
| site.css, site.js | Shared header, footer and page components, including dropdown menus that work without JavaScript |
| keyword-scanner.js | The free resume keyword scanner, which runs entirely in the browser |
| assets/screens, assets/og | Product screenshots with fictional example data, and social cards |
| index.html | Homepage content, pricing and FAQs |
| styles.css, sections.css, responsive.css, conversion.css, cards.css, live-demos.css | Homepage and legal page styles |
| script.js | Homepage motion preference, scroll reveals and reading progress |
| visuals-src, visuals | Homepage animations |
| start/index.html, start.css, start.js | Selected-plan account and checkout handoff |
| analytics.js, analytics.css | GA4 (G-Z5QX5FCT9J), loaded only after consent |
| build-branding.cjs | Favicons, device icons and the default social card |
| verify-live.py | Post-release checks for redirects, sitemap URLs, canonicals and app noindex |

## Homepage animations

If animation source changes, use the dependencies already installed in LandingCode:

    node visuals-src/verify.cjs
    node visuals-src/build.cjs

Verification renders the six used components in normal and paused states, checks the page's unique animation order, and checks that every profile connector ends at the centre of its card. The build compiles and minifies React, Framer Motion and Tailwind for static hosting. `prepare.cjs` refreshes adapted components from LandingCode; it keeps `MasterProfile.tsx` but overwrites the other adapted components.

## Pricing and checkout

The homepage shows Free with 3 introductory AI credits, Pro at $13.99 a month with 40 and Premium at $29.99 a month with 150. On 15 September 2026, `https://app.vignova.io/api/plans` returned the same prices with separate monthly allowances: Pro with 50 tailoring, 50 writing and 15 interview credits, and Premium with 200, 200 and 60. The credit copy is unchanged until the business decides how to present it. The same response shows that the Free plan includes the Chrome extension but not interview preparation, and the homepage comparison table now says so.

Paid-plan buttons open `start/?plan=PRO` or `start/?plan=PREMIUM`. Registration and login open the app, and the visitor can return to the handoff page to continue to the chosen monthly checkout. Payments are handled in the app.

## Content and assets

Product screenshots were captured from the real app and extension with fictional people and companies. Illustrative examples on the pages are labelled as such. There are no reviews, ratings, user counts or hiring outcomes. Geist's licence is in `assets/FONT-LICENSE.txt`, and animation dependency licences are in `visuals/LICENSES.txt`. Analytics loads only after acceptance, and the footer's Cookie settings let visitors change their choice.
