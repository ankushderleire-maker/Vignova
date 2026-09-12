/**
 * Vignova Extension — LinkedIn Content Script
 * Detects job listing pages and injects "Tailor Resume" button.
 *
 * LinkedIn DOM structure (may change):
 * - Job title:       .t-24.t-bold / .job-details-jobs-unified-top-card__job-title
 * - Company:         .job-details-jobs-unified-top-card__company-name
 * - Description:     .jobs-description__content / #job-details
 * - Actions area:    .jobs-apply-button--top-card / .jobs-s-apply
 */

(function () {
    "use strict";

    // ─── Overlay manager (defensive) ───
    // If overlay.js failed to load (partial injection after an extension
    // update / reload), fall back to a no-op stub instead of crashing the
    // whole content script with "Vignova_Overlay is not defined".
    const Vignova_Overlay = window.Vignova_Overlay || {
        showLoading() {},
        showError(msg) { console.warn("[Vignova] Overlay unavailable:", msg); },
        showAllResults() {},
        remove() {},
    };

    // ─── Extension Context Validation ───
    function hasValidExtensionContext() {
        try {
            return typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
        } catch (_) {
            return false;
        }
    }

    function removeInjectedLinkedInUI() {
        document.getElementById(CONTAINER_ID)?.remove();
        document.querySelectorAll(".vignova-score-badge,.vg-match-panel,.vignova-card-badge").forEach(el => el.remove());
    }

    const _contextHeartbeat = setInterval(() => {
        if (hasValidExtensionContext()) return;
        clearInterval(_contextHeartbeat);
        removeInjectedLinkedInUI();
    }, 3000);


    function setBtnContent(btn, iconClass, iconStr, text) {
        btn.textContent = "";
        if (iconClass) {
            const span = document.createElement("span");
            span.className = iconClass;
            span.textContent = iconStr;
            btn.appendChild(span);
        }
        if (text) btn.appendChild(document.createTextNode(" " + text.trim()));
    }

    function createInlineLogo(size = 34) {
        const logo = document.createElement("span");
        logo.className = "vignova-inline-logo";
        logo.textContent = "V";
        logo.title = "Vignova AI";
        logo.style.cssText = `width:${size}px;height:${size}px;display:grid;place-items:center;flex:0 0 auto;border-radius:${Math.max(7, Math.round(size * 0.28))}px;background:linear-gradient(135deg,#861cf6 0%,#5141f5 48%,#15a9ff 100%);color:#fff;font-weight:900;font-size:${Math.max(14, Math.round(size * 0.62))}px;line-height:1;font-family:Inter,Arial,sans-serif;margin-left:2px;margin-right:10px;`;
        return logo;
    }

    const BUTTON_ID = "vignova-linkedin-tailor-btn";
    const LETTER_BUTTON_ID = "vignova-linkedin-letter-btn";
    const CONTAINER_ID = "vignova-linkedin-container";

    let isProcessing = false;

    // ─── Detect URL Job ID Changes ───
    function getJobIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        let jobId = urlParams.get('currentJobId');
        if (!jobId) {
            const match = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
            if (match) jobId = match[1];
        }
        return jobId;
    }

    /**
     * The posting's stable URL, whatever page it is being viewed from.
     *
     * On the search view the address bar says /jobs/search/?currentJobId=123,
     * so sending window.location.href tracked the search page instead of the
     * job — every posting in one search collapsed to a single row, and the
     * status dropdown could never find the job the generate buttons had
     * created. Everything that sends a jobUrl uses this.
     */
    function canonicalJobUrl() {
        const id = getJobIdFromUrl();
        return id
            ? `https://www.linkedin.com/jobs/view/${id}/`
            : window.location.href.split("?")[0];
    }

    let currentJobId = getJobIdFromUrl();

    // ─── Applied/Saved badges on job list cards ───
    const CARD_BADGE_ATTR = "data-vignova-badge";

    let isStamping = false;
    async function stampJobListCards() {
        if (isStamping) return;

        // LinkedIn job cards in the list panel
        const cards = document.querySelectorAll(
            `.jobs-search-results__list-item[data-occludable-job-id]:not([${CARD_BADGE_ATTR}])`
        );
        if (!cards.length) return;

        isStamping = true;
        try {
            const storage = await chrome.storage.local.get(null);

            for (const card of cards) {
                const jobId = card.getAttribute("data-occludable-job-id");
                if (!jobId) continue;

                // Try to find a matching storage key (keys are full URLs or job IDs)
                const matchKey = Object.keys(storage).find(k => k.includes(jobId));
                const state = matchKey ? storage[matchKey] : null;
                card.setAttribute(CARD_BADGE_ATTR, "1");

                if (!state?.tailored && !state?.saved) continue;

                const existingBadge = card.querySelector(".vignova-card-badge");
                if (existingBadge) continue;

                const badge = document.createElement("span");
                badge.className = "vignova-card-badge";
                badge.style.cssText = `
                    position:absolute; top:8px; right:8px; z-index:10;
                    background:${state.tailored ? "#166534" : "#1e3a5f"};
                    color:${state.tailored ? "#bbf7d0" : "#bae6fd"};
                    font-size:9px; font-weight:700; padding:2px 6px;
                    border-radius:6px; letter-spacing:0.3px; pointer-events:none;
                `;
                badge.textContent = state.tailored ? "✓ Tailored" : "Saved";

                // Cards need relative positioning for the badge
                card.style.position = "relative";
                card.appendChild(badge);
            }
        } finally {
            isStamping = false;
        }
    }

    // ─── Observe DOM Changes (LinkedIn is SPA) ───
    let _mutationTimer = null;
    const observer = new MutationObserver((mutations) => {
        if (!hasValidExtensionContext()) {
            observer.disconnect();
            return;
        }

        // Ignore mutations caused by our own controls. LinkedIn fires telemetry
        // for repeated third-party DOM churn, so only rescan when its job UI
        // changes or our bar is missing.
        const fromVignova = mutations.every(m => {
            const target = m.target instanceof Element ? m.target : m.target?.parentElement;
            return target?.closest?.("#vignova-linkedin-container,.vignova-score-badge,.vg-match-panel,.vignova-card-badge");
        });
        if (fromVignova) return;

        if (_mutationTimer) return;
        _mutationTimer = setTimeout(() => {
            _mutationTimer = null;

            const newJobId = getJobIdFromUrl();

            // If the user clicked a new job, remove the old badge container
            if (newJobId && newJobId !== currentJobId) {
                currentJobId = newJobId;
                removeInjectedLinkedInUI();
            }

            if (!document.getElementById(BUTTON_ID)) {
                tryInjectButton();
            }

            stampJobListCards();
        }, 1200);
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Initial attempt
    setTimeout(tryInjectButton, 1500);
    setTimeout(stampJobListCards, 2000);

    // ─── Try to Inject Button ───
    function tryInjectButton() {
        // Only inject on job detail pages
        if (!window.location.pathname.includes("/jobs/") && !window.location.pathname.includes("/jobs/view")) return;

        // Injection Point: Below Title (User Request)
        // We look for the title container or the primary description container
        let target = document.querySelector(".job-details-jobs-unified-top-card__primary-description-container") || 
                     document.querySelector(".job-details-jobs-unified-top-card__title-container") ||
                     document.querySelector(".t-24.job-details-jobs-unified-top-card__job-title");

        let insertMethod = 'after';

        if (!target) {
            // Fallback 1: Look for standard apply button area
            const applyBtn = document.querySelector(".jobs-apply-button--top-card") || 
                             document.querySelector(".jobs-s-apply");
            if (applyBtn && applyBtn.parentElement) {
                // The row itself, so we insert after it rather than inside it.
                target = applyBtn.parentElement;
                insertMethod = 'after';
            }
        }

        if (!target) {
            // Fallback 2: Look for the new obfuscated DOM (Search Results View)
            // It has buttons like aria-label="Save the job" or "Apply" or "Apply on company website"
            const actionBtn = document.querySelector('button[aria-label="Save the job"]') ||
                              document.querySelector('button[aria-label="Save"]') ||
                              document.querySelector('a[aria-label*="Apply"]') ||
                              document.querySelector('button[aria-label*="Apply"]');
            
            if (actionBtn) {
                // Walk up to the row that holds all the action buttons, then sit
                // below it. Never inside — that is what squeezed Apply and Save.
                target = actionBtn.closest("div");
                if (target && target.parentElement && target.children.length === 1) {
                    target = target.parentElement;
                }
                insertMethod = 'after';
            }
        }

        if (!target) return;

        // Inserting "after" a node that is itself a flex item still leaves us
        // inside that row — and a 100%-wide item in a nowrap row overflows and
        // draws over Apply/Save instead of wrapping. Climb out to the first
        // ancestor whose parent lays out normally, and insert after that.
        target = escapeFlexContext(target);

        // Don't inject if already exists
        if (document.getElementById(CONTAINER_ID)) return;

        // Create Container
        // Create Container
        const container = document.createElement("div");
        container.id = CONTAINER_ID;
        container.className = "vignova-injected-container";

        if (insertMethod === 'after' && target.parentNode) {
            target.parentNode.insertBefore(container, target.nextSibling);
        } else {
            target.appendChild(container);
        }

        // Render UI based on auth
        renderExtensionUI();
    }

    // ─── Render Extension UI (Auth Aware) ───
    let isRenderingUI = false;
    let authRenderVersion = 0;
    let authRefreshPending = false;
    function finishAuthRender() {
        isRenderingUI = false;
        if (authRefreshPending) {
            authRefreshPending = false;
            queueMicrotask(renderExtensionUI);
        }
    }

    async function renderExtensionUI() {
        if (isRenderingUI) { authRefreshPending = true; return; }
        const renderVersion = authRenderVersion;
        if (!hasValidExtensionContext()) return;
        isRenderingUI = true;

        // A build the admin has retired stops offering its features. The
        // check fails open, so an unreachable server changes nothing.
        const updateState = await chrome.runtime
            .sendMessage({ type: "GET_UPDATE_STATE" })
            .catch(() => null);
        if (updateState && updateState.blocked) {
            renderUpdateRequired();
            finishAuthRender();
            return;
        }

        // Check Auth
        const authStatus = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, resolve);
        });

        if (renderVersion !== authRenderVersion) { finishAuthRender(); return; }

        const container = document.getElementById(CONTAINER_ID);
        if (!container) {
            finishAuthRender();
            return;
        }

        // Clear container AFTER await
        container.textContent = "";

        if (!authStatus?.isLoggedIn) {
            // Render Login Button
            const loginBtn = document.createElement("button");
            loginBtn.className = "vignova-tailor-btn vignova-btn-login";
            setBtnContent(loginBtn, "vignova-btn-icon", "🔑", "Login to Vignova to View Options");
            loginBtn.style.backgroundColor = "#333";
            loginBtn.onclick = () => {
                chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
            };
            container.appendChild(loginBtn);
        } else {
            // Render Action Buttons
            renderActionButtons(container, Vignova_Plan.isPaid(authStatus.user));
        }

        finishAuthRender();
    }

    /**
     * Replaces the bar with an update notice.
     *
     * A retired build should not keep offering buttons that will fail, but
     * silently vanishing looks like the extension broke, so it says why.
     */
    function renderUpdateRequired() {
        const container = document.getElementById(CONTAINER_ID);
        if (!container) return;
        container.textContent = "";

        container.appendChild(createInlineLogo());

        const note = document.createElement("span");
        note.className = "vignova-update-note";
        note.textContent = "Vignova needs updating to keep working.";
        container.appendChild(note);

        const btn = document.createElement("button");
        btn.className = "vignova-tailor-btn";
        btn.textContent = "Update";
        btn.addEventListener("click", () => {
            chrome.runtime.sendMessage({ type: "GET_UPDATE_STATE" }, (state) => {
                window.open(state?.installUrl || "https://chromewebstore.google.com/search/vignova", "_blank");
            });
        });
        container.appendChild(btn);
    }

    /**
     * Briefly confirms a status change on the dropdown itself.
     *
     * Opening the whole overlay to say "Saved" would be heavier than the
     * action deserves, but with no feedback at all people press it twice.
     */
    function flashStatusSaved(select, created) {
        const note = document.createElement("span");
        note.className = "vignova-status-flash";
        note.textContent = created ? "Saved to tracker" : "Status updated";
        select.insertAdjacentElement("afterend", note);
        setTimeout(() => note.remove(), 2600);
    }

    /**
     * Turns an AI button into an upgrade prompt.
     *
     * The lock is only cosmetic — the server refuses these routes on a
     * free plan regardless. This just stops the button lying about what
     * pressing it will do.
     */
    function markUpgradeButton(btn, feature) {
        btn.classList.add("vignova-btn-locked");
        btn.title = feature + " needs a Pro plan. Your match score and job tracking stay free.";
        btn.addEventListener("click", () => {
            Vignova_Overlay.showLoading();
            Vignova_Overlay.showUpgrade({
                feature,
                message: feature + " needs a Pro or Premium plan. Upgrade to use it \u2014 the match score, job tracking and status updates stay free.",
            });
        });
    }

    /**
     * @param {boolean} isPaid  Pro or Premium. Free accounts keep the match
     *   score and the status dropdown; the two AI buttons become an invite
     *   to upgrade rather than buttons that fail when pressed.
     */
    function renderActionButtons(container, isPaid) {
        // 1. Tailor Button
        const tailorBtn = document.createElement("button");
        tailorBtn.id = BUTTON_ID;
        tailorBtn.className = "vignova-tailor-btn";
        setBtnContent(tailorBtn, "vignova-btn-icon", "⚡", "Tailor Resume");
        if (isPaid) {
            tailorBtn.addEventListener("click", handleTailorClick);
        } else {
            markUpgradeButton(tailorBtn, "Tailor Resume");
        }

        // 2. Cover Letter Button
        const saveBtn = document.createElement("button");
        saveBtn.id = LETTER_BUTTON_ID;
        saveBtn.className = "vignova-save-btn";
        setBtnContent(saveBtn, "vignova-btn-icon", "✉️", "Cover Letter");
        saveBtn.style.marginLeft = "8px";
        if (isPaid) {
            saveBtn.addEventListener("click", handleCoverLetterClick);
        } else {
            markUpgradeButton(saveBtn, "Cover Letter");
        }

        // Check stored state
        // Canonical, because that is the key the generate handlers write under.
        checkJobState(canonicalJobUrl(), tailorBtn, saveBtn);

        // Add Vignova Branding Logo without a chrome-extension:// image URL.
        container.appendChild(createInlineLogo());

        // 0. Match Score Badge
        const scoreBadge = document.createElement("div");
        scoreBadge.className = "vignova-score-badge";
        scoreBadge.textContent = "";
        const spinner = document.createElement("div");
        spinner.className = "vignova-score-loading";
        scoreBadge.appendChild(spinner); // Loading spinner
        scoreBadge.title = "Calculating Keyword Score...";

        container.appendChild(scoreBadge);

        // ─── Application status ───
        // Lives here rather than in the popup: the status only means something
        // when there is a job on screen, and only once that job is tracked.
        const statusSelect = document.createElement("select");
        statusSelect.className = "vignova-status-select";
        statusSelect.title = "Set application status";
        statusSelect.innerHTML = `
            <option value="">Status…</option>
            <option value="SAVED">Saved</option>
            <option value="APPLIED">Applied</option>
            <option value="INTERVIEW">Interviewing</option>
            <option value="OFFER">Offer</option>
            <option value="REJECTED">Rejected</option>`;
        statusSelect.addEventListener("change", async () => {
            const status = statusSelect.value;
            if (!status) return;
            const previous = statusSelect.dataset.current || "";
            statusSelect.disabled = true;
            try {
                // The job details go with the status so an untracked posting
                // is saved rather than refused — picking "Saved" on a job you
                // have not tailored is the obvious way to add it.
                let job = {};
                try { job = (await scrapeLinkedInJob()) || {}; } catch { job = {}; }
                const res = await chrome.runtime.sendMessage({
                    type: "API_SET_STATUS",
                    data: {
                        jobUrl: canonicalJobUrl(),
                        status,
                        jobTitle: job.jobTitle,
                        company: job.company,
                        location: job.location,
                        description: job.jobDescription,
                        companyLogo: job.companyLogo,
                    },
                });
                if (res?.success) {
                    statusSelect.dataset.current = status;
                    flashStatusSaved(statusSelect, res.created);
                } else {
                    Vignova_Overlay.showError(
                        res?.error || "Could not set status.",
                        null,
                        "Couldn't update status"
                    );
                    statusSelect.value = previous;
                }
            } catch {
                statusSelect.value = previous;
            } finally {
                statusSelect.disabled = false;
            }
        });

        container.appendChild(tailorBtn);
        container.appendChild(saveBtn);
        container.appendChild(statusSelect);

        // Fetch Score
        fetchAndDisplayScore(scoreBadge);
    }

    /**
     * The employer's logo on this posting, as a CDN URL.
     *
     * LinkedIn serves company logos and people's profile photos from the same
     * host, and the hiring-manager card sits inside the same top card, so the
     * URL itself is the discriminator: company marks carry "company-logo" in
     * the path, faces carry "profile-displayphoto".
     */
    function selectedJobDetailRoot() {
        const selectors = [
            ".jobs-search__job-details--container",
            ".jobs-details__main-content",
            ".jobs-search__job-details",
            ".scaffold-layout__detail",
            ".job-view-layout",
            ".jobs-details",
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el && el.getClientRects().length > 0) return el;
        }
        const topCard =
            document.querySelector(".job-details-jobs-unified-top-card__container--two-pane") ||
            document.querySelector(".job-details-jobs-unified-top-card") ||
            document.querySelector(".jobs-unified-top-card");
        return topCard?.closest(".jobs-search__job-details--container, .jobs-details__main-content, .jobs-search__job-details, .scaffold-layout__detail, main") || topCard || null;
    }

    function scrapeCompanyLogo() {
        const scope = selectedJobDetailRoot();
        if (!scope) return "";

        const images = Array.from(
            scope.querySelectorAll(
                'a[href*="/company/"] img, .jobs-unified-top-card__company-logo img, img.ivm-view-attr__img--centered, img'
            )
        );

        for (const img of images) {
            const src = img.currentSrc || img.src || "";
            if (!/^https:\/\/(media|static)[\w-]*\.licdn\.com\//.test(src)) continue;
            // Only an image LinkedIn itself labels as a company logo. Taking
            // the next licdn image along would sooner or later put someone's
            // post picture on the card, and a wrong logo is worse than none.
            // The scope is the selected detail pane, not the left results list.
            if (/company-logo/.test(src)) return src;
        }
        return "";
    }

    function cleanScrapedTitle(value) {
        return String(value || "")
            .replace(/\s+/g, " ")
            .replace(/\s+·\s+.*$/, "")
            .trim();
    }

    function isBadJobTitle(value) {
        const text = cleanScrapedTitle(value).toLowerCase();
        return !text || text.length < 3 || /^\d+\s+notifications?$/.test(text) || text === "jobs based on your preferences" || text === "job role";
    }

    function titleFromCurrentJobLink(jobId, root) {
        const selectors = jobId
            ? [`a[href*="/jobs/view/${jobId}"]`, `a[href*="currentJobId=${jobId}"]`]
            : ['a[href*="/jobs/view/"]'];
        const scopeList = [root, document].filter(Boolean);
        for (const scope of scopeList) {
            for (const selector of selectors) {
                const links = Array.from(scope.querySelectorAll(selector));
                for (const link of links) {
                    const text = cleanScrapedTitle(link.innerText || link.textContent || link.getAttribute("aria-label"));
                    if (!isBadJobTitle(text)) return text;
                }
            }
        }
        return "";
    }

    // ─── Extract salary / deadline from JD text ───
    function extractJobMeta(text) {
        if (!text) return {};
        const result = {};

        // Salary — match $X, €X, £X, Xk ranges, or "salary: X" patterns
        const salaryRe = [
            /(?:\$|€|£|₹|USD|EUR|GBP)\s*[\d,]+(?:k)?(?:\s*[-–]\s*(?:\$|€|£|₹|USD|EUR|GBP)?\s*[\d,]+(?:k)?)?(?:\s*\/?\s*(?:yr|year|hour|hr|annum|month))?/i,
            /[\d,]+k?\s*[-–]\s*[\d,]+k?\s*(?:per year|per annum|annually|a year|\/yr|\/year)/i,
            /(?:salary|compensation|pay|package|tc|total comp)[:\s]+(?:up to\s+)?(?:\$|€|£|₹|USD|EUR|GBP)?\s*[\d,]+(?:k)?(?:\s*[-–]\s*(?:\$|€|£|₹|USD|EUR|GBP)?\s*[\d,]+(?:k)?)?/i,
        ];
        for (const re of salaryRe) {
            const m = text.match(re);
            if (m) { result.salary = m[0].trim(); break; }
        }

        // Deadline — "Apply by", "Closing date", "Applications close" etc.
        const deadlineRe = /(?:apply\s+by|deadline|closing\s+date|applications?\s+close[sd]?|position\s+closes?)[:\s]+([A-Z][a-z]+ \d{1,2},?\s*\d{4}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i;
        const dm = text.match(deadlineRe);
        if (dm) result.deadline = dm[1].trim();

        return result;
    }

    // ─── Fetch & Display Score ───
    async function fetchAndDisplayScore(badge, retries = 3) {
        let jobData = await scrapeLinkedInJob();

        // Single Page Apps often inject the container before the text finishes loading.
        // If the description is suspiciously short (e.g. just whitespace or "Loading..."), wait and retry.
        if (!jobData.jobDescription || jobData.jobDescription.length < 50) {
            if (retries > 0) {
                setTimeout(() => fetchAndDisplayScore(badge, retries - 1), 1000);
                return;
            }
            badge.textContent = "?";
            badge.title = "Could not parse job description text";
            return;
        }

        try {
            const { vignova_agent_profile: profile } = await chrome.storage.local.get(['vignova_agent_profile']);
            const response = VignovaLocalScorer.score(jobData.jobDescription, profile || null);

            const jobMeta = extractJobMeta(jobData.jobDescription);

            if (response && response.success) {
                const matched = response.breakdown.matching_keywords || [];
                const missing = response.breakdown.missing_keywords || [];
                const total = matched.length + missing.length;
                const score = total ? Math.round(100 * matched.length / total) : 0;

                // Categorical Mapping — realistic thresholds
                let categoryText = "";
                badge.classList.remove("high", "medium", "low", "very-high", "very-low");

                if (score >= 75) {
                    categoryText = "Very High";
                    badge.classList.add("very-high");
                } else if (score >= 55) {
                    categoryText = "High";
                    badge.classList.add("high");
                } else if (score >= 35) {
                    categoryText = "Medium";
                    badge.classList.add("medium");
                } else if (score >= 20) {
                    categoryText = "Low";
                    badge.classList.add("low");
                } else {
                    categoryText = "Very Low";
                    badge.classList.add("very-low");
                }

                badge.textContent = total ? `${score}% keywords` : "No keywords";

                // The badge opens the Keyword Score panel on hover. Everything
                // it shows comes from the local scorer that already ran.
                VignovaMatchPanel.attach(
                    badge,
                    {
                        score,
                        matched,
                        missing,
                        salary: jobMeta.salary || "",
                        deadline: jobMeta.deadline || "",
                    },
                    {
                        onImprove: () => {
                            const tailor = document.getElementById(BUTTON_ID) ||
                                document.querySelector(".vignova-tailor-btn");
                            if (tailor) tailor.click();
                        },
                        onSettings: () => {
                            chrome.runtime.sendMessage({
                                type: "OPEN_TAB",
                                url: "https://app.vignova.io/dashboard/extension",
                            });
                        },
                    }
                );


            } else {
                badge.textContent = "!";
                badge.title = "Failed to calculate score";
            }
        } catch (e) {
            console.error(e);
            badge.textContent = "!";
        }
    }

    // ─── Check Stored State ───
    function checkJobState(url, tailorBtn, saveBtn) {
        chrome.storage.local.get([url], (result) => {
            const data = result[url];
            if (data?.tailored) {
                setBtnContent(tailorBtn, "vignova-btn-icon", "✅", "Resume Created");
                tailorBtn.classList.add("success");
                // Optional: Disable or change behavior? User wants "Resume Created button"
                // Maybe clicking it opens dashboard?
                tailorBtn.title = "You have already tailored a resume for this job.";
            }

            if (data?.tailored) {
                setBtnContent(saveBtn, "vignova-btn-icon", "✉️", "Cover Letter");
            }
        });
    }

    /** Walks up until the node's parent is not a flex/grid container. */
    function escapeFlexContext(node) {
        let el = node;
        let hops = 0;
        while (el && el.parentElement && hops < 6) {
            const display = getComputedStyle(el.parentElement).display;
            if (!/(^|inline-)(flex|grid)$/.test(display)) return el;
            el = el.parentElement;
            hops += 1;
        }
        return el || node;
    }

    // ─── Handle Cover Letter Click ───
    // Runs the same application-pack generation as Tailor Resume (which is what
    // creates the job row server-side) and opens the overlay on the letter.
    async function handleCoverLetterClick() {
        if (isProcessing) return;
        isProcessing = true;
        const btn = document.getElementById(LETTER_BUTTON_ID);

        btn.disabled = true;
        setBtnContent(btn, "vignova-btn-spinner", "", "Writing...");
        Vignova_Overlay.showLoading();

        const jobData = await scrapeLinkedInJob();
        if (!jobData.jobDescription) {
            Vignova_Overlay.showError("Could not find the job description. Refresh page.");
            resetButton();
            isProcessing = false;
            return;
        }

        const currentUrl = canonicalJobUrl();

        try {
            // Goes through Vignova_Generate so an earlier generation for
            // this posting asks "generate again?" instead of spending a
            // second credit without saying anything.
            const result = await Vignova_Generate.run({
                jobDescription: jobData.jobDescription,
                jobTitle: jobData.jobTitle,
                company: jobData.company,
                jobUrl: currentUrl,
                source: "LINKEDIN",
            });

            if (result.success) {
                const fileName = `${(jobData.company || "Resume").replace(/[^a-zA-Z0-9]/g, "_")}_Resume.pdf`;
                Vignova_Overlay.showAllResults(
                    result.pdfBase64,
                    result.coverLetter,
                    result.draftEmail,
                    fileName,
                    result.credits_remaining,
                    "coverletter"
                );

                setBtnContent(btn, "vignova-btn-icon", "✉️", "Cover Letter");
                btn.disabled = false;

                chrome.storage.local.get([currentUrl], (current) => {
                    const existing = current[currentUrl] || {};
                    chrome.storage.local.set({
                        [currentUrl]: { ...existing, tailored: true }
                    }, () => stampJobListCards());
                });
            } else {
                if (!result.cancelled) Vignova_Overlay.showError(result.error || "Failed.");
                setBtnContent(btn, "vignova-btn-icon", "✉️", "Cover Letter");
                btn.disabled = false;
            }
        } catch (err) {
            console.error(err);
            Vignova_Overlay.showError("Connection failed.");
            setBtnContent(btn, "vignova-btn-icon", "✉️", "Cover Letter");
            btn.disabled = false;
        } finally {
            isProcessing = false;
        }
    }

    // ─── Handle Tailor Button Click ───
    async function handleTailorClick() {
        if (isProcessing) return;
        isProcessing = true;
        const btn = document.getElementById(BUTTON_ID);

        btn.disabled = true;
        setBtnContent(btn, "vignova-btn-spinner", "", "Generating...");
        Vignova_Overlay.showLoading();

        const jobData = await scrapeLinkedInJob();
        if (!jobData.jobDescription) {
            Vignova_Overlay.showError("Could not find the job description. Refresh page.");
            resetButton();
            return;
        }

        const currentUrl = canonicalJobUrl();

        try {
            // Goes through Vignova_Generate so an earlier generation for
            // this posting asks "generate again?" instead of spending a
            // second credit without saying anything.
            const result = await Vignova_Generate.run({
                jobDescription: jobData.jobDescription,
                jobTitle: jobData.jobTitle,
                company: jobData.company,
                jobUrl: currentUrl,
                source: "LINKEDIN",
            });

            if (result.success) {
                const fileName = `${(jobData.company || "Resume").replace(/[^a-zA-Z0-9]/g, "_")}_Resume.pdf`;
                Vignova_Overlay.showAllResults(
                    result.pdfBase64,
                    result.coverLetter,
                    result.draftEmail,
                    fileName,
                    result.credits_remaining
                );

                setBtnContent(btn, "vignova-btn-icon", "✅", "Resume Created");
                btn.classList.add("success");

                chrome.storage.local.get([currentUrl], (current) => {
                    const existing = current[currentUrl] || {};
                    chrome.storage.local.set({
                        [currentUrl]: { ...existing, tailored: true }
                    }, () => stampJobListCards());
                });

            } else {
                if (!result.cancelled) Vignova_Overlay.showError(result.error || "Failed.", () => { resetButton(); handleTailorClick(); });
                resetButton();
            }
        } catch (err) {
            console.error(err);
            Vignova_Overlay.showError("Connection failed.", () => { resetButton(); handleTailorClick(); });
            resetButton();
        }
    }

    // ─── Scrape Job Data from LinkedIn DOM ───
    async function scrapeLinkedInJob() {
        const jobId = getJobIdFromUrl();
        const root = selectedJobDetailRoot() || document;

        let jobTitleEl =
            root.querySelector(".t-24.t-bold.inline") ||
            root.querySelector(".job-details-jobs-unified-top-card__job-title") ||
            root.querySelector('.job-details-jobs-unified-top-card__job-title-link') ||
            root.querySelector("h2.t-24") ||
            root.querySelector("h1.t-24") ||
            root.querySelector(".job-details-jobs-unified-top-card__title-container h1") ||
            root.querySelector(".job-details-jobs-unified-top-card__title-container h2") ||
            root.querySelector("[class*='job-title']") ||
            document.querySelector(".job-details-jobs-unified-top-card__container--two-pane h2");

        if ((!jobTitleEl || isBadJobTitle(jobTitleEl.innerText || jobTitleEl.textContent)) && jobId) {
            // Fallback: Find links containing the /jobs/view/jobId in href to avoid matching "Hybrid" badges
            const anchors = Array.from(document.querySelectorAll(`a[href*="/jobs/view/${jobId}"]`)).filter(a => a.innerText?.trim());
            if (anchors.length > 0) {
                jobTitleEl = anchors[0];
            }
        }
        const jobTitle = !isBadJobTitle(jobTitleEl?.innerText || jobTitleEl?.textContent)
            ? cleanScrapedTitle(jobTitleEl.innerText || jobTitleEl.textContent)
            : titleFromCurrentJobLink(jobId, root) || "Job Role";

        let companyEl = root.querySelector('.job-details-jobs-unified-top-card__company-name') ||
                        root.querySelector('.jobs-unified-top-card__company-name') ||
                        root.querySelector('.job-details-jobs-unified-top-card__primary-description a[href*="/company/"]') ||
                        root.querySelector('.jobs-unified-top-card__subtitle-primary-grouping a[href*="/company/"]') ||
                        root.querySelector('a[href*="/company/"]');
        
        if (!companyEl && jobTitleEl) {
            // Traverse up from jobTitleEl to find a container that also has a company link
            let container = jobTitleEl.parentElement;
            while (container && container !== document.body) {
                const compLinks = Array.from(container.querySelectorAll('a[href*="/company/"]')).filter(a => a.innerText?.trim());
                if (compLinks.length > 0) {
                    companyEl = compLinks[0];
                    break;
                }
                container = container.parentElement;
            }
        }
        
        const company = companyEl?.innerText?.trim() || "Company";

        const location =
            root.querySelector(".job-details-jobs-unified-top-card__bullet")?.innerText?.trim() ||
            root.querySelector(".job-details-jobs-unified-top-card__primary-description-container")?.innerText?.trim() ||
            "";

        let descriptionEl =
            root.querySelector("#job-details") ||
            root.querySelector(".jobs-description__content") ||
            root.querySelector(".jobs-description") ||
            root.querySelector(".jobs-box__html-content") ||
            root.querySelector("article.jobs-description__container") ||
            root.querySelector("[class*='jobs-description']") ||
            root.querySelector("article") ||
            root.querySelector('div[class*="description"]') ||
            root.querySelector("#job-details-content") ||
            root.querySelector('div.job-details-module__content');

        // Fallback for extreme obfuscation: look for the "About the job" heading
        if (!descriptionEl) {
            const headings = Array.from(root.querySelectorAll("h2"));
            const aboutHeading = headings.find(h => h.textContent.toLowerCase().includes("about the job"));
            if (aboutHeading) {
                // The description is usually the next sibling <p> or wrapped in the parent's parent
                const nextSib = aboutHeading.parentElement.nextElementSibling;
                if (nextSib && nextSib.textContent.length > 50) {
                    descriptionEl = nextSib;
                } else if (aboutHeading.parentElement.parentElement) {
                    descriptionEl = aboutHeading.parentElement.parentElement;
                }
            }
        }

        if (descriptionEl) {
            // Attempt to expand
            const buttons = Array.from(root.querySelectorAll('button'));
            const moreBtn = buttons.find(b => {
                const text = b.innerText?.trim().toLowerCase() || b.textContent?.trim().toLowerCase();
                return (text === "see more" || text === "show more" || text.includes("more")) &&
                       (descriptionEl.contains(b) || (descriptionEl.parentElement && descriptionEl.parentElement.contains(b)));
            });

            if (moreBtn && (moreBtn.offsetHeight > 0 || moreBtn.getClientRects().length > 0)) {
                moreBtn.click();
                await new Promise(r => setTimeout(r, 300));
            }
        }

        let jobDescription = descriptionEl?.innerText?.trim() || descriptionEl?.textContent?.trim() || "";
        if (jobDescription) {
            // Remove common unnecessary words from LinkedIn scraping
            jobDescription = jobDescription
                .replace(/Show more\s*$/i, '')
                .replace(/Show less\s*$/i, '')
                .replace(/See more\s*$/i, '')
                .replace(/Report this job\s*$/i, '')
                .trim();
            // Clean up excessive newlines
            jobDescription = jobDescription.replace(/\n{3,}/g, '\n\n');
        }

        return { jobTitle, company, jobDescription, location, companyLogo: scrapeCompanyLogo(), descriptionEl };
    }

    // ─── Reset Button State ───
    function resetButton() {
        isProcessing = false;
        const btn = document.getElementById(BUTTON_ID);
        if (btn && !btn.classList.contains("success")) {
            btn.disabled = false;
            btn.classList.remove("vignova-btn-login"); // This line is now redundant as login state is handled by renderExtensionUI
            setBtnContent(btn, "vignova-btn-icon", "⚡", "Tailor Resume");
        }
    }

    // Clear visible account data before redrawing from the verified session.
    function refreshAccountUI() {
        ++authRenderVersion;
        isProcessing = false;
        document.getElementById("vignova-linkedin-container")?.replaceChildren();
        Vignova_Overlay.remove();
        window.VignovaMatchPanel?.hide();
        document.querySelectorAll(".vignova-card-badge").forEach(el => el.remove());
        document.querySelectorAll("[data-vignova-badge]").forEach(el => el.removeAttribute("data-vignova-badge"));
        renderExtensionUI();
    }
    chrome.runtime.onMessage.addListener(message => {
        if (message.type === "AUTH_STATE_CHANGED") refreshAccountUI();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && (changes.vignova_token || changes.vignova_user || changes.vignova_agent_profile)) refreshAccountUI();
    });
})();
