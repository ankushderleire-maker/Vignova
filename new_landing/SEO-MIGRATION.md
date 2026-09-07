# SEO migration and release notes

The new static site preserves all 17 public page URLs listed in the supplied
`LandingCode/out/sitemap.xml`. The website remains on `https://vignova.io/`;
the application remains on `https://app.vignova.io/`. This is a design and hosting
replacement, not a domain migration. No production upload, DNS change, or Search
Console submission has been performed.

## Preserved

- All eight blog articles: full article copy, citations, internal links,
  titles, descriptions, and original publication dates. The copied MDX source
  is retained in `content/blog/` for editing reference, outside the upload ZIP.
- `/blog/`, `/how-it-works/`, `/about/`, `/contact/`, `/privacy/`, `/terms/`,
  `/refund/`, `/shipping/`, and the home page, with their trailing-slash URLs.
- The existing GA4 measurement ID **G-Z5QX5FCT9J**, consent storage key
  **vignova.consent.analytics**, and the events **sign_up_click** and
  **extension_install_click**, including their **location** parameter.
- Existing `/templates/`, `/og-image.png`, `/logo.png`, and icon URLs.
  Favicons, Apple/Android icons and the social card are rebuilt from the supplied
  purple/blue logo. Page icon and social URLs have a branding cache version;
  their original unversioned URLs also serve the new files. The manifest uses
  correctly sized 192px and 512px icons, and the social card is 1200 x 630px.
- Organization and website schema identities: `https://vignova.io/#organization`
  and `https://vignova.io/#website`.
- Crawl access, the original `/dashboard` and `/api/` exclusions, and the public
  sitemap location. No blanket crawler block has been added.

## Improvements included

The 19 unused legacy screenshots in `/images/` contained retired branding and
are excluded from this corrected release. No current page or blog links to them.
Their original copies remain in LandingCode. All HTML page URLs are preserved;
direct links to these retired image files will return 404 after they are removed
from the host. Resume template image URLs remain available.

1. Every indexable page has its own canonical, title, description, Open Graph
   and Twitter metadata. Child pages no longer inherit the home page's social
   title. The homepage description explicitly covers resume tailoring, ATS
   matching, the extension, and application tracking.
2. The home page links to the blog in desktop/mobile navigation, its footer,
   and a short three-guide section. Articles have a table of contents,
   breadcrumbs, related reading selected by topic, visible dates and a Vignova
   byline linked to the founder/about page.
3. All article text is present in static HTML. Reading and following links
   requires no React/Next.js runtime or JavaScript execution.
4. BlogPosting, BreadcrumbList, Organization and WebSite structured data is
   included. Article publication and modification dates retain source values.
   No invented ratings, reviews, user counts, or obsolete HowTo markup is added.
5. Sitemap entries use canonical URLs. Article lastmod dates are preserved;
   static pages omit unknown modification dates instead of resetting them on
   every build. Checkout handoff and error pages use `noindex, follow`.
6. Apache/LiteSpeed rules normalize legacy `index.html` and supported `.html`
   forms, keep the HTTPS apex host, and serve a real 404 for missing routes.
   There is no catch-all redirect to the homepage. Query strings are preserved.
7. The original analytics implementation loaded Google's library before
   acceptance despite contrary privacy copy. The replacement uses basic consent
   mode: no Google script or analytics events until acceptance. Advertising
   consent remains denied. Existing saved choices are recognized, and a footer
   Cookie settings control allows changes. Local/staging hosts do not load GA.

The article schema helps describe the content to search engines; it does not
guarantee a special search appearance. See [Google's Article guidance](https://developers.google.com/search/docs/appearance/structured-data/article).

## Validation completed

- 19 static HTML pages and all 17 indexable sitemap URLs validated.
- 735 local references checked against files included in the upload package.
- All eight final article bodies match the original rendered export; normalized
  text also matches the freshly rendered MDX source.
- Unique titles, self-canonicals, indexability, JSON-LD, social tags and analytics
  inclusion checked by `build.py` before it creates the ZIP.
- Offline JavaScript behavior tests verify accept/reject, returning consent,
  revocation, cross-tab changes, storage failures, conversion event names,
  one page view per page, and production-only loading. No test events were sent
  to your actual GA property.
- Local HTTP responses checked for all 19 pages and the key shared resources.
  A nonexistent path returned 404. HTML5 parsing and new CSS syntax checks passed.
- Existing six animation scenes still pass their rendering and connector checks.

The Python preview server does not execute `.htaccess`. Its redirects and custom
error document must be checked on Apache/LiteSpeed after upload. The live sitemap
could not be retrieved by the browsing tool; route parity is verified against the
existing project you supplied, not Search Console or production access logs.

## Hostinger release

1. Back up the current `public_html`, including any existing `.htaccess` and
   verification files. Preserve host-specific proxy/security rules when merging
   the supplied `.htaccess`; don't replace unrelated application configuration.
2. Extract `hostinger-upload.zip` into the landing site's `public_html` so that
   `index.html`, `blog/`, `.htaccess`, `sitemap.xml`, and `robots.txt` are directly
   inside it. The app subdomain uses its existing deployment.
3. Keep existing DNS, SSL, and Search Console verification. No GTM, Google Ads,
   Search Console HTML/meta verification, or Bing verification ID was found in
   LandingCode. DNS verification records and GA account settings are not stored
   in this repository and cannot be copied from it.
4. Purge Hostinger/CDN caches, then check the homepage, `/blog/`, an article,
   and `/how-it-works/`. Confirm these return 200 with their own canonicals.
   Check `/blog/index.html` redirects to `/blog/`, HTTP/www resolve to the HTTPS
   apex host, and a nonexistent URL returns status 404 rather than 200.
   If an earlier ZIP was extracted, overwrite the branding files and remove its
   old `public_html/images/` folder of unused product screenshots. Keep `assets/`,
   `visuals/`, `templates/`, page folders and unrelated hosting files.
5. Accept analytics on the production site and confirm a page view in GA4
   Realtime/DebugView. Check a signup click and a Chrome Store click. Rejecting
   analytics should produce no Google script request on a fresh page load.
6. Submit `https://vignova.io/sitemap.xml` in the existing Search Console property.
   Inspect the home page and one article. There is no need to use Change of
   Address for this same-domain replacement.

Google recommends preserving URL mappings, checking canonicals and redirects,
submitting the sitemap, and monitoring crawl errors during site changes:
[site migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

## Next steps for search growth

Technical fixes make the pages easier to crawl and understand. Top positions are
not guaranteed. Search Console impressions, queries and conversions are needed
to choose the next improvements based on actual demand.

| Existing page | Primary topic | Next editorial improvement |
|---|---|---|
| Home | AI resume tailoring and ATS resume checking | Keep benefits and extension functionality accurate as the product changes |
| How to tailor your resume | Tailor a resume to a job description | Add a real, anonymized before/after example and explain each change |
| ATS scoring guide | What an ATS resume checker measures | Add current product screenshots with explanations of the six dimensions |
| Resume keywords guide | Find and use resume keywords | Add role-specific examples based on actual job descriptions |
| Application tracking guide | How many jobs to apply to and how to track them | Add a worked weekly application routine with the tracker |
| How Vignova works | Vignova workflow and Chrome extension | Update screenshots and supported features whenever the product changes |

After publishing, review indexing/crawl errors and GA acquisition continuity.
Compare Search Console clicks, impressions and average position for matching
periods; prioritize existing pages gaining impressions but few clicks. Publish
original examples and obtain genuine customer feedback as it becomes available.
Do not add fictional social proof or mass-produce near-identical keyword pages.

## Local rebuild

From `new_landing`, run the migration generators only when importing content:

```powershell
python migrate-blog.py
python migrate-pages.py
python prepare-seo.py
node verify-analytics.cjs
python build.py
```

The two migration generators recreate their page files. Edit their source
templates or the original content if you need changes to survive regeneration.
`prepare-seo.py` applies shared metadata and regenerates current branding. Both
it and `build.py` run `build-branding.cjs`, using Node.js and Sharp from the adjacent
LandingCode dependencies. After an ordinary direct HTML/CSS edit, `python build.py`
regenerates branding, validates and repackages the site. Old icons and branded
screenshots are never copied back from LandingCode.
The upload ZIP contains public files only; Python scripts, MDX, temporary
verification data, and this document are excluded.
