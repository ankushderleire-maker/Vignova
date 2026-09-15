# SEO release notes

## 15 September 2026: product pages, guides and technical fixes

vignova.io stays the only host for public pages, and app.vignova.io stays the signed-in product. This release changes no domain, DNS or Search Console setting.

### In the upload package

- **Product and tool pages (12):** `/ai-resume-builder/`, `/ats-resume-checker/`, `/resume-tailor/`, `/linkedin-profile-optimizer/`, `/naukri-profile-optimizer/`, `/job-application-tracker/`, `/resume-keyword-scanner/`, `/chrome-extension/`, `/job-application-autofill/`, `/cover-letter-generator/`, `/interview-preparation/` and `/tools/`. Each has its own title, H1, search intent, FAQs, breadcrumbs, application data and related guides. Every claim was checked against the app and extension code and the live plan settings. The LinkedIn and Naukri pages carry trademark and independence notices.
- **Free tool:** `/resume-keyword-scanner/` compares a resume with a job description entirely in the browser. Nothing is uploaded or stored, and analytics receives only counts of terms found and matched.
- **Career guides:** four new guides (what a good ATS score is, ATS-friendly resume format for India, Naukri headline examples, LinkedIn headline examples) and seven updated ones. Unsupported claims were removed or attributed, and links point to the relevant product page instead of the homepage. `/blog/` groups guides by topic.
- **Redirects:** `/blog/sample-post/` to `/blog/how-ai-is-changing-the-job-search/` and `/blog/how-vignova-works/` to `/how-it-works/`, both permanent and single-hop.
- **Navigation:** one header with Product, Tools and Resources menus that work without JavaScript, one footer listing every hub, and visible breadcrumbs on every page except the homepage.
- **Homepage:** positioned as an AI career copilot for resumes, ATS checks, LinkedIn and Naukri profiles and applications, with links to each product page. The plan table's Chrome extension row now matches the live plan settings.
- **Structured data:** one JSON-LD graph per page with stable `#organization` and `#website` identities, WebPage, BreadcrumbList, BlogPosting, FAQPage for visible FAQs, and application data whose only offer is the free plan. No ratings, reviews or invented authors.
- **Images:** 1200 x 630 social cards for every page and guide, and product screenshots captured from the real app and extension with fictional example data.
- **Crawl files:** robots.txt allows crawling and lists the sitemap. The sitemap holds 32 canonical URLs, with last-modified dates for the rendered pages.

### With the app deploy (resume-saas-v4)

- `X-Robots-Tag: noindex, follow` on every response, and a `noindex` robots meta tag from the root layout.
- `app/robots.ts` allows crawling so that Google can see the noindex. Nothing is blocked.
- `/` redirects to `/login` on the server instead of rendering an empty page.
- The interview preparation loading text no longer says it searches the internet, which the backend does not do.

### After upload

1. Delete `public_html/blog/how-vignova-works/`, `public_html/blog/sample-post/` and any old `public_html/images/` folder.
2. Purge caches and run `python verify-live.py`.
3. **HTTPS hops:** before this release, `http://www.vignova.io/` took two redirects. The `.htaccess` rules send every variant straight to `https://vignova.io/`, but Hostinger's Force HTTPS setting runs first. If verify-live.py still reports two hops, turn off Force HTTPS for the domain in hPanel (the `.htaccess` already forces HTTPS) and run it again.
4. **Search Console, vignova.io:** submit `https://vignova.io/sitemap.xml`; inspect and request indexing for the homepage, `/tools/` and the product pages; then open Pages and choose Validate fix for Not found (404), Duplicate without user-selected canonical, Crawled - currently not indexed and Discovered - currently not indexed. Page with redirect and Alternate page with proper canonical tag are expected for `http`, `www`, slashless and `index.html` variants; check that none of the URLs in those lists appear in the sitemap.
5. **Search Console, app.vignova.io:** once the app is deployed, inspect `/login` and confirm Google reports the noindex. Use Removals only if an app URL has to leave results urgently. Do not block `/login` or `/register` in robots.txt until they have dropped out of the index.
6. Accept analytics on the live site and confirm page views plus `sign_up_click`, `extension_install_click`, `seo_tool_started` and `keyword_scan_completed` in GA4 DebugView.

### Decisions and reviews outside the code

| Item | Why it needs a person | Action |
| --- | --- | --- |
| Homepage credit numbers | The homepage shows 40 and 150 AI credits; the live plans list 50/50/15 and 200/200/60 by type | Choose the wording, then update index.html |
| INR pricing | Prices exist only in USD, although Razorpay accepts cards, UPI and net banking | Add INR prices only if the business sets them |
| Author bylines | Guides are credited to Vignova; no named authors or reviewers exist | Add a named author only for a real person who writes or reviews |
| Naukri profile reading | The extension reads the user's own Naukri profile page when they start a scan | Legal review against Naukri's terms |
| LinkedIn import | Public profiles are fetched through a scraping service | Review the provider's and LinkedIn's terms |
| Contact page | Lists Dublin, Ireland and 9am to 5pm EST support hours for an India-first audience | Confirm the address and hours |
| Free plan label | The plan catalogue says "5 templates"; Resume Studio offers every template not marked PRO | Confirm which is right |

### Validation on 15 September 2026

- `python build.py`: 34 HTML pages, 32 indexable URLs and 3,244 local references pass; 109 files packaged (4.9 MB).
- Local server: all 32 sitemap URLs return 200 with their own canonical, and an unknown path returns 404.
- No horizontal overflow on 23 pages at 320, 360, 390, 414 and 768 px.
- The keyword scanner's example returns 30% coverage (5 of 14 terms) in the browser.
- `node verify-analytics.cjs` passes.
- App: `tsc --noEmit` passes. The changed files lint clean; the interview preparation page still has the seven lint problems it had before this release.

### Local rebuild

```powershell
python build-pages.py
python build.py
node verify-analytics.cjs
```

`migrate-blog.py`, `migrate-pages.py` and `prepare-seo.py` are retired and exit immediately, because running them would overwrite the current pages. The ZIP contains public files only; Python scripts, content sources, verification tools and this document are excluded.

## 7 September 2026: static site migration

The new static site preserved all 17 public page URLs listed in the supplied `LandingCode/out/sitemap.xml`. The website remained on `https://vignova.io/` and the application on `https://app.vignova.io/`. It was a design and hosting replacement, not a domain migration.

### Preserved

- All eight blog articles: full article copy, citations, internal links, titles, descriptions and original publication dates.
- `/blog/`, `/how-it-works/`, `/about/`, `/contact/`, `/privacy/`, `/terms/`, `/refund/`, `/shipping/` and the home page, with their trailing-slash URLs.
- The GA4 measurement ID **G-Z5QX5FCT9J**, consent storage key **vignova.consent.analytics**, and the events **sign_up_click** and **extension_install_click**, including their **location** parameter.
- Existing `/templates/`, `/og-image.png`, `/logo.png` and icon URLs, rebuilt from the purple-blue logo with a branding cache version.
- Organization and website schema identities: `https://vignova.io/#organization` and `https://vignova.io/#website`.

### Improvements then

1. Every indexable page got its own canonical, title, description, Open Graph and Twitter metadata.
2. The home page linked to the blog, and articles gained a table of contents, breadcrumbs, related reading and visible dates.
3. All article text is static HTML that needs no JavaScript to read.
4. BlogPosting, BreadcrumbList, Organization and WebSite structured data, with no ratings, reviews, user counts or HowTo markup.
5. Sitemap entries use canonical URLs; checkout handoff and error pages use `noindex, follow`.
6. Apache/LiteSpeed rules normalize `index.html` and `.html` forms, keep the HTTPS apex host and serve a real 404 for missing routes.
7. Analytics uses basic consent mode: no Google script or events until acceptance, with Cookie settings in the footer.

The 19 legacy screenshots in `/images/` contained retired branding and were excluded; their originals remain in LandingCode.

Google recommends preserving URL mappings, checking canonicals and redirects, submitting the sitemap and monitoring crawl errors during site changes: [site migration guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes). Top positions are never guaranteed; use Search Console impressions, queries and conversions to choose the next improvements, and do not add fictional social proof or mass-produced keyword pages.
