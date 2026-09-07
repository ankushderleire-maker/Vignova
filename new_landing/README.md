# Vignova — new landing page

An independent, static Hostinger website in the purple-blue Vignova theme. The original application and LandingCode files are unchanged.

## Current revision

- Side-by-side hero with compact typography, paired resume/Chrome buttons, and three assurances matching the supplied reference.
- Thin gradient frames: 8px on desktop and 6px on mobile, with a compact preview toolbar.
- White centre Master Profile card, with the six surrounding information cards restored to purple.
- Chrome extension featured immediately below the hero, using the supplied Vignova logo and a browser-extension badge.
- Alternating text and graphic sections for the Master Profile, ATS check, LinkedIn optimizer, and application tracker.
- Six unique animation placements, reduced from sixteen. Repeated tours, workflow sections, template animations, and feature explanations have been removed.
- Faster animation timing (1.6× for the adapted sequences and transitions). A scene begins when it enters view, pauses offscreen, and replays after leaving and re-entering the viewport.
- Master Profile cards and SVG connectors share the same coordinates; each connection meets the centre of its card. The diagram now shows six types of profile information.
- Plain headings, compact descriptions, plan comparison, FAQs, and the existing signup/checkout handoff.
- A global pause preference, system reduced-motion support, and hero replay/pause controls.
- Static fallback graphics remain if an animation cannot load.

## Blog and SEO migration

All eight source blog articles are included at their original URLs, with a purple/blue blog index, article navigation, breadcrumbs and related reading. About, contact and how-it-works pages are restored. All 17 original sitemap URLs remain available; the deployment also includes the checkout handoff and a custom 404 page.

Page metadata, structured data, sitemap, crawl rules and the original GA4 property are carried over or improved. Existing favicon and social image URLs now serve the purple-blue branding. Unused screenshots containing the retired green logo are excluded. See [SEO-MIGRATION.md](SEO-MIGRATION.md) for the preservation inventory, checks, deployment steps and next SEO priorities. Rankings cannot be guaranteed.

The current upload contains 58 public files, including 19 HTML pages. Source articles, obsolete product screenshots and build/verification tools are excluded.

## Preview

Visit http://127.0.0.1:4173/?v=11 while the preview server is running. Styles and scripts have versioned URLs.

From this folder, start a local preview with:

    python -m http.server 4173 --bind 127.0.0.1

Use the HTTP preview for the animations. Hosting needs no Node.js server, database, API key, package installation, or build step. Fonts, branding, scripts and styles are bundled locally.

## Upload to Hostinger

1. Back up the current website.
2. Open the website's public_html directory in Hostinger File Manager.
3. Upload hostinger-upload.zip and extract it.
4. Place index.html directly in public_html, alongside all included CSS/JavaScript files and the assets and visuals folders.
5. Include start, privacy, terms, refund and shipping. The policy text is preserved from the existing site.
6. Merge the included .htaccess with any hosting rules you already need.
7. Check signup, login, selected-plan checkout and the extension destination before launch.
8. If an earlier ZIP was already extracted, overwrite its files with this corrected package and remove its old `public_html/images/` folder (the 19 legacy product screenshots; the new site does not use it). Keep `assets/`, `visuals/`, `templates/` and all page folders. Back up first and preserve unrelated hosting files.
9. Clear the website/CDN cache and refresh the browser. Icon links and social metadata include a branding version to avoid requesting the old cached assets.

The ZIP is for Hostinger web/cloud hosting. All public assets use relative paths, so the page also supports a subfolder.

## Editing

| File | Purpose |
| --- | --- |
| index.html | Content, section order, headings, navigation, pricing and FAQs |
| live-demos.css | Split hero, alternating sections, extension branding and responsive sizing |
| styles.css, sections.css, responsive.css, conversion.css, cards.css | Existing base theme, shared controls, pricing and footer |
| script.js | Mobile menu, motion preference, scroll reveals and reading progress |
| visuals-src/index.tsx | Scene loading, viewport playback, hero controls and tracker loop |
| visuals-src/components/MasterProfile.tsx | Profile diagram with a shared coordinate system |
| visuals-src/runtime.tsx, visuals-src/motion.tsx | Animation tempo and pause handling |
| visuals-src/theme.css | Styles isolated to the animated previews |
| visuals/demo.js, visuals/demo.css | Compiled public animation assets |
| start/index.html, start.css, start.js | Selected-plan account and checkout handoff |
| assets/vignova-purple-blue.png | Latest supplied logo, used unchanged |
| build-branding.cjs | Exports favicons, device icons and a purple-blue social card from the supplied logo |
| assets/ats-analysis.png | Existing product screenshot behind the ATS report disclosure |

The site is configured for https://vignova.io/. For another domain, update canonical/Open Graph URLs, robots.txt and sitemap.xml. The app links still point to https://app.vignova.io/.

## Rebuild and package

If animation source changes, use the dependencies already installed in the adjacent LandingCode project:

    node visuals-src/verify.cjs
    node visuals-src/build.cjs

Verification renders the six used components in normal and paused states, checks the page's unique animation order, and checks that every profile connector ends at the corresponding card's centre. The build compiles and minifies React, Framer Motion and Tailwind for static hosting.

prepare.cjs refreshes adapted components from LandingCode. It preserves the locally maintained MasterProfile.tsx but overwrites the other adapted components. Preserve manual changes before running it. Some older source components remain available in the workspace; the four unbranded resume previews in `templates/` remain in the upload to preserve their existing URLs.

After editing any public file:

    python build.py

The helper regenerates branding with Node.js and the Sharp dependency already installed in the adjacent LandingCode project, then validates page structure, local links, assets, canonical and sitemap parity, metadata, JSON-LD, analytics inclusion and ZIP integrity. Hostinger needs none of these build dependencies. The ZIP contains only public website files, with index.html at the archive root.

## Pricing and checkout

The page shows reference defaults from resume-saas-v4/app/api/plans/route.ts: Free with 3 introductory credits, Pro at $13.99/month with 40 credits, and Premium at $29.99/month with 150 credits. The application's database can override these defaults. Visitors are told to confirm current prices and inclusions at checkout.

The live plans endpoint returned 502 Bad Gateway during verification on 5 September 2026. That historical result does not establish its current status. Verify the live app and payment flow before publishing; this landing page does not change the application backend.

Paid-plan buttons open start/?plan=PRO or start/?plan=PREMIUM. Registration/login opens the existing app. The visitor can return to the handoff page and continue to the chosen monthly checkout. This preserves plan selection despite the current auth form's dashboard redirect. Payments are handled by the real app.

## Content and assets

The previews use illustrative data and do not perform AI processing or submit applications. No fictional reviews, ratings, user counts or hiring outcomes are presented as real. The extension is prominently featured without claiming that no competitor offers one.

The animation source was adapted from the existing Vignova site and recolored. Geist's license is in assets/FONT-LICENSE.txt; dependency licenses are in visuals/LICENSES.txt. The original GA4 property G-Z5QX5FCT9J is preserved. Analytics loads only after acceptance on vignova.io; the existing consent key and conversion event names are retained. Cookie settings in the footer allow the visitor to change their choice. The local motion preference is stored separately.
