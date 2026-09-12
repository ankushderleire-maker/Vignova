# Vignova 2.0.0 release candidate

Updated September 12, 2026. **Ready for final QA as an update to the existing Chrome Web Store listing; backend deployment and production-account checks still need to pass before submitting.** Load `Browser_Extension` unpacked, use `VignovaExtension_v2.0.0_TEST_ONLY.zip` for test installs, or upload `VignovaExtension_v2.0.0.zip` as the version 2 update package after release checks pass. The old `VignovaExtension_Final.zip` is unchanged.

## Changes in this candidate

- All three redesigned tabs remain: Autofill, Keywords and Profile.
- Removed **Auto Apply** and **Job Alerts**, their extension handlers, alert backend prototype, alarms permission and optional notification permission.
- Renamed **Check ATS Score** to **Keyword Score**. The Keywords ring and LinkedIn/Indeed hover badges report matched keywords divided by detected keywords. Removed the hover panel's semantic/domain percentages. Scores describe keyword coverage, not an ATS outcome; different extractors may detect different keyword sets.
- Monster extraction reads the selected job through a content-script message, including when the dashboard reopens without an activeTab grant. It uses the live Monster job-view selectors and structured JobPosting data. Search results alone show guidance to open a posting or explicitly paste text. Errors no longer silently open blank editors. Saved jobs use the posting URL, not the search URL; equal job titles preserve the user's selected link. When a supported job board exposes an employer logo, the save request includes it and the backend stores the sanitized logo URL.
- LinkedIn extraction now expands/scrolls the selected job detail pane before reading the description, including `/jobs/search-results/?currentJobId=...` pages. Integrated save/status actions take the employer logo from the selected detail pane instead of the first result in the left list. The **Read the current page** button shows an inline reading state and keeps any failure message inside the Change Job dialog.
- Recent Jobs falls back to the deployed `/api/extension/recent-jobs` endpoint when `/overview` is unavailable. Weekly activity is hidden until valid statistics exist. The older list uses a neutral Tracked label because it does not provide a status. Loading failures have a retry action.
- Interview Prep and LinkedIn Optimizer open their existing dashboard workflows after checking current paid access. The extension no longer depends on an undeployed interview API.
- Autofill discovers an eligible application form in the top page or iframe, fills the current step and stops for user review. It rejects search-only pages, does not click Continue/Submit, and restricts remote responses to supported field actions on observed unmatched fields. Fixed completion status leaving the button stuck on Stop. Users continue and submit applications themselves.
- Removed the paid Autofill options for automatic cover-letter generation and automatic tailored-resume attachment. Autofill now fills detected form fields only; users generate paid documents from the explicit Tailor Resume and Cover Letter actions.
- Fixed screenshot-style name fields where "First Name" / "Last Name" appear below each input instead of as a proper label. The profile API also now prefers explicit stored first-name and last-name fields before splitting `fullName`, so a surname-only `fullName` cannot wipe out the first name.

## Free and paid features

| Free account | Pro / Premium with available credits |
| --- | --- |
| Keyword Score, job extraction and saving, job tracker, available activity, profile viewing/copy, owned document downloads | Resume tailoring, cover letters, LinkedIn optimization, interview prep, Autofill, recruiter-message and email drafts |

Keyword analysis compares the active profile with a selected or pasted description. Profile editing, full job tracking, LinkedIn optimization and interview prep use existing dashboard pages. Outreach tools create drafts only. Checking access and profile Autofill do not spend credits. Resume generation and cover-letter generation happen only from explicit user actions, reserve their credit before AI work and refund failures.

## Account switching

Vignova website cookie changes clear the previous identity and account caches, then redraw the extension and open LinkedIn/Indeed controls. Request-time reconciliation covers missed cookie events after service-worker suspension. Paid actions validate the current account; late old-account responses and profile requests cannot populate the new account. Local Autofill also checks entitlement and cancels on account change. Already-filled form fields are not undone.

When testing this replacement build, reload the unpacked extension and existing job tabs **once** to install the new content scripts. Subsequent premium/free account switching is tested without refreshing those tabs.

## Live evidence and its limits

The provided Monster URL was inspected live:
`https://www.monster.com/jobs/search?q=AI+Engineer&where=Dublin&page=1`

It initially showed search results without a selected description. Clicking its result overlay showed a signup dialog. A full Monster posting was separately inspected: Capital One Financial Corp, Lead AI Engineer (GenAI Platform, AI Foundations, LLM Core and Agentic AI), San Jose, CA. Observed selectors include `svx-job-view-wrapper`, `jobTitle`, `company`, `jobDetailLocation`, `description-clamp-wrapper` and a JobPosting JSON-LD script. These informed the browser fixtures; the extension was not installed into that live browsing session.

Unauthenticated GET checks on September 11 are recorded in `ops/artifacts/extension-v2/live-routes.json`:

- Overview, extension interview-prep and job-alerts returned **404**.
- Recent-jobs, agent-profile, profiles and documents returned **401**.
- Score, generate, generate-all, cover-letter, outreach, plan-batch and save-job returned **405**, consistent with their POST-only routes.

401/405 establishes route availability only. It does not establish successful authenticated database, AI or PDF operation. The candidate handles the missing overview route and does not call the other two missing routes.

## Verification

- `node --test ops/extension-auth.test.cjs ops/extension-backend.test.cjs`: **40 passed** (17 extension/auth tests and 23 backend tests). Covers identity changes, late responses, free and exhausted accounts, resume and cover-letter reservations/refunds, existing cover-letter reuse without charging, concurrent last-credit requests, per-user data, extraction/pasted-job persistence, legacy job-list fallback, and rejecting remote submit/navigation commands.
- `node ops/extension-browser-smoke.cjs`: actual unpacked extension in isolated Chrome for Testing 145, with synthetic accounts, intercepted API responses and job-page fixtures. Covers all three tabs, 380/326 px layout, keyword filters/badge, profile switching and copy, documents, extraction/save with company logo, generation/draft UI, existing dashboard links, legacy and new overview responses, Monster search/selected posting/duplicate titles/JSON-LD, screenshot-style first/last-name helper labels, top-page and iframe Autofill, no automatic paid document generation, no automatic submission, and premium-to-free/logout across open LinkedIn/Indeed pages without navigation.
- Whole Next.js `tsc --noEmit`: passed.
- JavaScript syntax, manifest/resources, popup IDs, Python syntax and final ZIP integrity are checked while packaging. Screenshots in `ops/artifacts/extension-v2/` contain synthetic fixture data, not production accounts.

Current test package: `VignovaExtension_v2.0.0_TEST_ONLY.zip`, 39 files, SHA-256 `fbe7ca610665841c276000a930292edaa692315ca432ecdf88139caa47e69116`.

Chrome Web Store update package for the existing listing: `VignovaExtension_v2.0.0.zip`, 39 files, SHA-256 `fbe7ca610665841c276000a930292edaa692315ca432ecdf88139caa47e69116`.

These tests do **not** prove real paid AI generation or a production PDF download. No production deployment, real account writes, application submission or store upload occurred.

## Backend delivery and remaining release checks

The ZIP contains extension code only. Deploy the prepared Next.js and FastAPI changes separately to obtain their improved entitlement, credit reservation, profile normalization, cover-letter credit refunds, score-list and generation behavior. `/api/extension/overview` is optional for basic operation and enables weekly activity when deployed. The implemented local `/api/extension/interview-prep` route remains tested but is not called by this candidate; the visible button uses the existing dashboard instead. The job-alerts prototype has been removed.

Before a production upload:

1. Deploy the intended backend revision and test real free/paid/exhausted accounts, both directions of switching, OAuth/password sign-in, generation and actual PDFs, and supported live job-board/application forms. Synthetic API responses cannot certify the production AI provider, database or PDF runtime.
2. Review the existing broad all-sites/all-frames injection and file-input interception against the minimum access needed for supported application sites. Retained access needs an accurate store justification. See [Chrome's minimum-permission guidance](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
3. Complete/verify extension-specific privacy disclosures and store declarations for profile/form/job data, session cookies, local caches, AI processors and retention/deletion. Chrome requires disclosure even for locally handled data; see [Chrome's user-data guidance](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
4. Review the bounded remote field planner against [Manifest V3 requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements/). This candidate rejects remote navigation/submission and unknown selectors; a production review should still establish that externally supplied data cannot introduce unreviewable behavior. This is a review consideration, not an assertion of a Google rejection.

The root `.gitignore` excludes `Browser_Extension/`; include new modules explicitly in any Git-based release. The ZIP includes actual source files despite that ignore rule. No staging, commit or push was performed; unrelated workspace edits were preserved.

## Release notes

Redesigned Autofill, Keywords and Profile. Added clear keyword coverage, improved Monster extraction and current job selection, saved supported company logos with job descriptions, restored Recent Jobs compatibility, and removed unavailable Auto Apply/Job Alerts. Improved screenshot-style name detection, form detection, review-based Autofill, profile switching, document access and automatic free/premium account synchronization.
