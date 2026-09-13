/**
 * Vignova Extension — Indeed Content Script
 * Detects job listing pages and injects "Tailor Resume" button.
 *
 * Indeed DOM structure (may change):
 * - Job title:       .jobsearch-JobInfoHeader-title / h1[data-testid="jobsearch-JobInfoHeader-title"]
 * - Company:         [data-testid="inlineHeader-companyName"] / .jobsearch-InlineCompanyRating-companyHeader
 * - Description:     #jobDescriptionText / .jobsearch-jobDescriptionText
 * - Actions area:    .jobsearch-JobInfoHeader-title-container / near the Apply button
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
        return typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;
    }


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

    /**
     * The posting's stable URL, whatever page it is being viewed from.
     *
     * Indeed keeps the job id in the query string (?vjk= on a search page,
     * ?jk= on a job page), so stripping the query — which one call site did
     * — threw the job away and left the search URL, collapsing every result
     * in that search into one tracked row. Everything that sends a jobUrl
     * uses this.
     */
    function getJobIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return params.get("vjk") || params.get("jk") || null;
    }

    function canonicalJobUrl() {
        const id = getJobIdFromUrl();
        return id
            ? `${window.location.origin}/viewjob?jk=${id}`
            : window.location.href.split("?")[0];
    }

    const BUTTON_ID = "vignova-indeed-tailor-btn";
    const LETTER_BUTTON_ID = "vignova-indeed-letter-btn";

    let isProcessing = false;

    // ─── Applied/Saved badges on Indeed job cards ───
    const CARD_BADGE_ATTR = "data-vignova-badge";

    async function stampJobListCards() {
        // Indeed job cards in the results list
        const cards = document.querySelectorAll(
            `.job_seen_beacon:not([${CARD_BADGE_ATTR}]), .tapItem:not([${CARD_BADGE_ATTR}])`
        );
        if (!cards.length) return;

        const storage = await chrome.storage.local.get(null);

        for (const card of cards) {
            const jobLink = card.querySelector("a[data-jk], a[id*='job_']");
            const jk = jobLink?.getAttribute("data-jk") || (jobLink?.href.match(/jk=([^&]+)/)?.[1]);
            card.setAttribute(CARD_BADGE_ATTR, "1");
            if (!jk) continue;

            const matchKey = Object.keys(storage).find(k => k.includes(jk));
            const state = matchKey ? storage[matchKey] : null;
            if (!state?.tailored && !state?.saved) continue;

            const existingBadge = card.querySelector(".vignova-card-badge");
            if (existingBadge) continue;

            const badge = document.createElement("span");
            badge.className = "vignova-card-badge";
            badge.style.cssText = `
                display:inline-block; margin-left:6px;
                background:${state.tailored ? "#166534" : "#1e3a5f"};
                color:${state.tailored ? "#bbf7d0" : "#bae6fd"};
                font-size:9px; font-weight:700; padding:2px 6px;
                border-radius:6px; letter-spacing:0.3px; vertical-align:middle;
            `;
            badge.textContent = state.tailored ? "✓ Tailored" : "Saved";

            const titleEl = card.querySelector("h2, .jobTitle");
            if (titleEl) titleEl.appendChild(badge);
        }
    }

    // ─── Observe DOM Changes (Indeed partially SPA) ───
    const observer = new MutationObserver(() => {
        if (!hasValidExtensionContext()) {
            observer.disconnect();
            return;
        }
        if (!document.getElementById(BUTTON_ID)) {
            tryInjectButton();
        }
        stampJobListCards();
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
        const CONTAINER_ID = "vignova-indeed-container";
        // Aggressive cleanup of old dead buttons
        document.querySelectorAll("#" + CONTAINER_ID + ", .vignova-injected-container").forEach(el => {
            if (!el.isConnected) el.remove();
        });
        if (document.getElementById(CONTAINER_ID)) return;

        // Injection Point 1: Native Indeed Sticky Action Bar (Next to Apply/Save)
        let targetContainer = document.getElementById("saveJobButtonContainer");

        // Formatter fallback: Look for modern sticky header container
        if (!targetContainer) {
            const stickyHeader = document.querySelector(".jobsearch-JobInfoHeader-actions");
            if (stickyHeader) targetContainer = stickyHeader;
        }

        // Final fallback: original title block
        if (!targetContainer) {
            targetContainer = document.querySelector(".jobsearch-JobInfoHeader-title-container") ||
                document.querySelector("[data-testid='jobsearch-JobInfoHeader-title']")?.closest("div");
        }

        if (!targetContainer) {
            // Ultimate fallback to description if nothing found
            const descriptionArea = document.querySelector("#jobDescriptionText");
            if (descriptionArea) {
                injectFallback(descriptionArea);
            }
            return;
        }

        // Wrapper for buttons
        let wrapper = document.getElementById("vignova-indeed-wrapper");
        if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.id = "vignova-indeed-wrapper";
            wrapper.style.display = "flex";
            wrapper.style.alignItems = "center";
            wrapper.style.gap = "8px";
            wrapper.style.marginLeft = "12px"; // Separate from Indeed's buttons

            // If injecting into the sticky bar, just append. If title bar, insert below.
            if (targetContainer.id === "saveJobButtonContainer" || targetContainer.classList.contains("jobsearch-JobInfoHeader-actions")) {
                targetContainer.appendChild(wrapper);
            } else {
                wrapper.style.marginTop = "12px";
                wrapper.style.marginBottom = "4px";
                targetContainer.parentElement.appendChild(wrapper);
            }

            ensureContainer(wrapper);
        }
    }

    function injectFallback(descriptionArea) {
        let wrapper = document.getElementById("vignova-indeed-wrapper");
        if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.id = "vignova-indeed-wrapper";
            wrapper.style.marginBottom = "15px";
            descriptionArea.parentElement.insertBefore(wrapper, descriptionArea);
            ensureContainer(wrapper);
        }
    }

    function ensureContainer(parent) {
        const CONTAINER_ID = "vignova-indeed-container";
        let container = document.getElementById(CONTAINER_ID);
        if (!container) {
            container = document.createElement("div");
            container.id = CONTAINER_ID;
            container.className = "vignova-injected-container";
            parent.appendChild(container);

            // Render UI only on creation
            renderExtensionUI();
        }
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

        const container = document.getElementById("vignova-indeed-container");
        if (!container) {
            finishAuthRender();
            return; // Should exist
        }

        // Clear container AFTER await to prevent async race conditions where multiple 
        // observer triggers clear an already-empty box and then all append.
        container.textContent = "";

        if (!authStatus?.isLoggedIn) {
            // Render Login Button
            const loginBtn = document.createElement("button");
            loginBtn.className = "vignova-tailor-btn vignova-btn-login";
            setBtnContent(loginBtn, "vignova-btn-icon", "🔑", "Login to Vignova to View Options");
            loginBtn.style.backgroundColor = "#333";
            loginBtn.onclick = () => {
                window.dispatchEvent(new CustomEvent("vignova:open-dashboard"));
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

        const logo = document.createElement("img");
        logo.src = chrome.runtime.getURL("icons/logo.png");
        logo.style.cssText = "height:34px;width:auto;object-fit:contain;margin-right:10px;flex:0 0 auto;";
        container.appendChild(logo);

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
        if (isPaid) {
            saveBtn.addEventListener("click", handleCoverLetterClick);
        } else {
            markUpgradeButton(saveBtn, "Cover Letter");
        }

        // Check stored state
        // Canonical, because that is the key the generate handlers write under.

        // Add Vignova Branding Logo
        const logoImg = document.createElement("img");
        logoImg.src = chrome.runtime.getURL("icons/logo.png");
        logoImg.style.height = "34px";
        logoImg.style.width = "auto";
        logoImg.style.objectFit = "contain";
        logoImg.style.marginLeft = "2px";
        logoImg.style.marginRight = "10px";
        logoImg.style.flex = "0 0 auto";
        logoImg.title = "Vignova AI";
        container.appendChild(logoImg);

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
            <option value="">Not saved</option>
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
                try { job = (await Vignova_Score.readJob(scrapeIndeedJob)) || {}; } catch { job = {}; }
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
                    // Cache it so a re-render restores the dropdown instead of
                    // snapping back to "Not saved" — and so it survives at all
                    // until GET /api/extension/job-status is deployed.
                    const cacheUrl = canonicalJobUrl();
                    chrome.storage.local.get([cacheUrl], (current) => {
                        chrome.storage.local.set({
                            [cacheUrl]: { ...(current[cacheUrl] || {}), saved: true, status },
                        });
                    });
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

        // After the select exists, so the tracker can preselect it.
        checkJobState(canonicalJobUrl(), tailorBtn, saveBtn, statusSelect);

        // Fetch Score
        fetchAndDisplayScore(scoreBadge);
    }

    // ─── Extract salary / deadline from JD text ───
    function extractJobMeta(text) {
        if (!text) return {};
        const result = {};
        const salaryRe = [
            /(?:\$|€|£|₹|USD|EUR|GBP)\s*[\d,]+(?:k)?(?:\s*[-–]\s*(?:\$|€|£|₹|USD|EUR|GBP)?\s*[\d,]+(?:k)?)?(?:\s*\/?\s*(?:yr|year|hour|hr|annum|month))?/i,
            /[\d,]+k?\s*[-–]\s*[\d,]+k?\s*(?:per year|per annum|annually|a year|\/yr|\/year)/i,
            /(?:salary|compensation|pay|package|tc|total comp)[:\s]+(?:up to\s+)?(?:\$|€|£|₹|USD|EUR|GBP)?\s*[\d,]+(?:k)?(?:\s*[-–]\s*(?:\$|€|£|₹|USD|EUR|GBP)?\s*[\d,]+(?:k)?)?/i,
        ];
        for (const re of salaryRe) {
            const m = text.match(re);
            if (m) { result.salary = m[0].trim(); break; }
        }
        const deadlineRe = /(?:apply\s+by|deadline|closing\s+date|applications?\s+close[sd]?|position\s+closes?)[:\s]+([A-Z][a-z]+ \d{1,2},?\s*\d{4}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})/i;
        const dm = text.match(deadlineRe);
        if (dm) result.deadline = dm[1].trim();
        return result;
    }

    // ─── Fetch & Display Score ───
    // Goes through Vignova_Score so this badge and the popup's Keywords tab
    // are the same number: same text (jobExtractor), same engine
    // (/api/extension/score), same dedup. It used to scrape its own DOM and
    // score locally, which is why one said 16% and the other 25%.
    let scoreToken = 0;
    async function fetchAndDisplayScore(badge, retries = 3) {
        const token = ++scoreToken;

        let result = null;
        try {
            result = await Vignova_Score.forCurrentJob({
                jobUrl: canonicalJobUrl(),
                fallbackScrape: scrapeIndeedJob,
            });
        } catch (_) {
            result = null;
        }

        // A newer render superseded us, or our badge was torn out of the DOM.
        // Without this the old retry chains kept running against detached nodes.
        if (token !== scoreToken || !badge.isConnected) return;

        if (!result) {
            // SPAs inject the container before the description finishes loading.
            if (retries > 0) {
                setTimeout(() => {
                    if (token === scoreToken && badge.isConnected) {
                        fetchAndDisplayScore(badge, retries - 1);
                    }
                }, 1000);
                return;
            }
            badge.textContent = "?";
            badge.title = "Could not parse job description text";
            return;
        }

        const { score, matched, missing, total } = result;
        const jobMeta = extractJobMeta(result.text);

        badge.classList.remove("high", "medium", "low", "very-high", "very-low");
        if (score >= 75) badge.classList.add("very-high");
        else if (score >= 55) badge.classList.add("high");
        else if (score >= 35) badge.classList.add("medium");
        else if (score >= 20) badge.classList.add("low");
        else badge.classList.add("very-low");

        badge.textContent = total ? `${score}% keywords` : "No keywords";
        badge.title = total
            ? `${matched.length} of ${total} keywords matched`
            : "No keywords detected in this posting";

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
    }

    // ─── Check Tracked State ───
    /**
     * Paints the bar from the job tracker.
     *
     * The server is the source of truth; chrome.storage.local is only a cache.
     * clearUserData() drops every http* key on each auth re-sync, which is why
     * "Resume Created" reverted to "Tailor Resume" whenever the tab was
     * reopened even though the resume still existed. The cached row is kept
     * for an instant first paint and as the offline answer.
     */
    async function checkJobState(url, tailorBtn, saveBtn, statusSelect) {
        // `authoritative` lets the server clear a stale cached flag; the cached
        // first paint must only ever add state, never take it away.
        const paint = (state, authoritative) => {
            if (state?.tailored) {
                setBtnContent(tailorBtn, "vignova-btn-icon", "✅", "Resume Created");
                tailorBtn.classList.add("success");
                tailorBtn.title = "You already tailored a resume for this job. Click to open it.";
            } else if (authoritative) {
                setBtnContent(tailorBtn, "vignova-btn-icon", "⚡", "Tailor Resume");
                tailorBtn.classList.remove("success");
                tailorBtn.title = "";
            }

            if (state?.coverLetter) {
                setBtnContent(saveBtn, "vignova-btn-icon", "✅", "Letter Created");
                saveBtn.classList.add("success");
                saveBtn.title = "You already wrote a cover letter for this job.";
            } else if (authoritative) {
                setBtnContent(saveBtn, "vignova-btn-icon", "✉️", "Cover Letter");
                saveBtn.classList.remove("success");
                saveBtn.title = "";
            }

            if (statusSelect && statusSelect.isConnected) {
                const status = state?.status || "";
                statusSelect.value = status;
                if (status) statusSelect.dataset.current = status;
                else delete statusSelect.dataset.current;
            }
        };

        try {
            const cached = await chrome.storage.local.get([url]);
            paint(cached[url], false);
        } catch (_) { /* storage unavailable — the server answer still lands */ }

        const reply = await chrome.runtime
            .sendMessage({ type: "API_GET_JOB_STATE", data: { jobUrl: url } })
            .catch(() => null);

        // Offline or signed out: keep whatever the cache painted rather than
        // wrongly telling the user nothing exists.
        if (!reply || !reply.success) return;

        const state = {
            saved: Boolean(reply.tracked),
            tailored: Boolean(reply.resume),
            coverLetter: Boolean(reply.coverLetter),
            status: reply.status || "",
        };
        paint(state, true);

        try {
            if (reply.tracked) await chrome.storage.local.set({ [url]: state });
            else await chrome.storage.local.remove([url]);
        } catch (_) { /* cache is best effort */ }
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

        const jobData = await Vignova_Score.readJob(scrapeIndeedJob);
        if (!jobData.jobDescription) {
            Vignova_Overlay.showError("Could not find the job description. Refresh page.");
            setBtnContent(btn, "vignova-btn-icon", "✉️", "Cover Letter");
            btn.disabled = false;
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
                source: "INDEED",
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
                chrome.storage.local.get([currentUrl], (current) => {
                    const existing = current[currentUrl] || {};
                    chrome.storage.local.set({ [currentUrl]: { ...existing, tailored: true } });
                });
            } else if (result.duplicate && result.existing) {
                markExistingWork(currentUrl, result.existing);
                if (!result.cancelled) Vignova_Overlay.showError(result.error || "Failed.");
            }
        } catch (err) {
            console.error(err);
            Vignova_Overlay.showError("Connection failed.");
        } finally {
            setBtnContent(btn, "vignova-btn-icon", "✉️", "Cover Letter");
            btn.disabled = false;
            isProcessing = false;
        }
    }

    // ─── Handle Button Click ───
    async function handleTailorClick(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (isProcessing) return;
        isProcessing = true;

        const btn = document.getElementById(BUTTON_ID);
        if (!btn) {
            isProcessing = false;
            return;
        }

        // Check if logged in (with timeout)
        let authStatus = null;
        try {
            authStatus = await Promise.race([
                new Promise((resolve) => chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, resolve)),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), 5000))
            ]);
        } catch (err) {
            console.error("Auth check failed:", err);
            alert("Connection to extension failed. Please reload the page.");
            isProcessing = false;
            return;
        }

        if (!authStatus?.isLoggedIn) {
            setBtnContent(btn, "vignova-btn-icon", "🔑", "Login Required");
            btn.classList.add("vignova-btn-login");
            isProcessing = false;
            window.dispatchEvent(new CustomEvent("vignova:open-dashboard"));
            return;
        }

        // Update button to loading
        btn.disabled = true;
        setBtnContent(btn, "vignova-btn-spinner", "", "Generating...");

        // Show overlay
        Vignova_Overlay.showLoading();

        // Scrape job data
        const jobData = await Vignova_Score.readJob(scrapeIndeedJob);

        if (!jobData.jobDescription) {
            Vignova_Overlay.showError("Could not find the job description. Please scroll down to load it and try again.");
            resetButton();
            return;
        }

        const currentUrl = canonicalJobUrl();

        // Call API via background service worker (avoids local network prompt)
        try {
            // Goes through Vignova_Generate so an earlier generation for
            // this posting asks "generate again?" instead of spending a
            // second credit without saying anything.
            const result = await Vignova_Generate.run({
                jobDescription: jobData.jobDescription,
                jobTitle: jobData.jobTitle,
                company: jobData.company,
                jobUrl: currentUrl,
                source: "INDEED",
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
                btn.disabled = false;
                isProcessing = false;

                // Save state
                chrome.storage.local.get([currentUrl], (current) => {
                    const existing = current[currentUrl] || {};
                    chrome.storage.local.set({
                        [currentUrl]: { ...existing, tailored: true }
                    });
                });

            } else if (result.duplicate && result.existing) {
                // Declined the prompt, or reopened the existing pack: either
                // way work exists, so the buttons say so.
                markExistingWork(currentUrl, result.existing);
                resetButton();
            } else {
                if (!result.cancelled) Vignova_Overlay.showError(
                    result.error || "Failed to generate resume.",
                    () => {
                        resetButton();
                    }
                );
                resetButton();
            }
        } catch (err) {
            console.error("[Vignova Indeed]", err);
            Vignova_Overlay.showError(
                "Could not connect to Vignova. Make sure the server is running.",
                () => {
                    resetButton();
                }
            );
            resetButton();
        }
    }

    // ─── Scrape Job Data from Indeed DOM ───
    /**
     * The employer's logo on this posting.
     *
     * Indeed serves employer logos from its own image hosts; anything else in
     * the header is chrome. Restricted to those hosts so a stray icon cannot
     * end up on the job card.
     */
    function scrapeCompanyLogo() {
        const images = Array.from(
            document.querySelectorAll(
                "[data-testid='jobsearch-CompanyAvatar-image'], img.jobsearch-JobInfoHeader-logo, " +
                "[data-company-name] img, .jobsearch-CompanyAvatar img, img"
            )
        );

        for (const img of images) {
            const src = img.currentSrc || img.src || "";
            if (/^https:\/\/(d2q79iu7y748jz\.cloudfront\.net|employer-logos\.indeed\.com)\//.test(src)) {
                return src;
            }
        }
        return "";
    }

    function scrapeIndeedJob() {
        // Job Title
        const jobTitle =
            document.querySelector("[data-testid='jobsearch-JobInfoHeader-title']")?.innerText?.trim() ||
            document.querySelector(".jobsearch-JobInfoHeader-title")?.innerText?.trim() ||
            document.querySelector("h1")?.innerText?.trim() ||
            "";

        // Company Name
        const company =
            document.querySelector("[data-testid='inlineHeader-companyName']")?.innerText?.trim() ||
            document.querySelector(".jobsearch-InlineCompanyRating-companyHeader a")?.innerText?.trim() ||
            document.querySelector("[data-company-name]")?.getAttribute("data-company-name") ||
            document.querySelector(".jobsearch-CompanyInfoWithoutHeaderImage a")?.innerText?.trim() ||
            "";

        const location =
            document.querySelector("[data-testid='job-location']")?.innerText?.trim() ||
            document.querySelector(".jobsearch-JobInfoHeader-subtitle div")?.innerText?.trim() ||
            "";

        // Job Description
        const descriptionEl =
            document.querySelector("#jobDescriptionText") ||
            document.querySelector(".jobsearch-jobDescriptionText") ||
            document.querySelector("[id='jobDescriptionText']");

        let jobDescription = descriptionEl?.innerText?.trim() || "";
        if (jobDescription) {
            // Remove common unnecessary words from Indeed scraping
            jobDescription = jobDescription
                .replace(/Report job\s*$/i, '')
                .replace(/Report this job\s*$/i, '')
                .trim();
            jobDescription = jobDescription.replace(/\n{3,}/g, '\n\n');
        }

        // descriptionEl returned so the review panel can highlight it
        return { jobTitle, company, jobDescription, location, companyLogo: scrapeCompanyLogo(), descriptionEl };
    }

    /**
     * Paints what the server says already exists for this posting.
     *
     * Reached when the duplicate prompt is declined: work exists, so the
     * buttons must say so rather than snapping back to "Tailor Resume" — and
     * certainly rather than sitting on "Generating...".
     */
    function markExistingWork(url, existing) {
        const tailorBtn = document.getElementById(BUTTON_ID);
        const letterBtn = document.getElementById(LETTER_BUTTON_ID);

        if (existing?.resume && tailorBtn) {
            setBtnContent(tailorBtn, "vignova-btn-icon", "\u2705", "Resume Created");
            tailorBtn.classList.add("success");
            tailorBtn.disabled = false;
            tailorBtn.title = "You already tailored a resume for this job.";
        }
        if (existing?.coverLetter && letterBtn) {
            setBtnContent(letterBtn, "vignova-btn-icon", "\u2705", "Letter Created");
            letterBtn.classList.add("success");
            letterBtn.disabled = false;
            letterBtn.title = "You already wrote a cover letter for this job.";
        }

        chrome.storage.local.get([url], (current) => {
            chrome.storage.local.set({
                [url]: {
                    ...(current[url] || {}),
                    saved: true,
                    tailored: Boolean(existing?.resume),
                    coverLetter: Boolean(existing?.coverLetter),
                },
            }, () => stampJobListCards());
        });
    }

    // ─── Reset Button State ───
    function resetButton() {
        isProcessing = false;
        if (pendingAccountRefresh) {
            pendingAccountRefresh = false;
            refreshAccountUI();
            return;
        }
        const btn = document.getElementById(BUTTON_ID);
        if (btn && !btn.classList.contains("success")) {
            btn.disabled = false;
            btn.classList.remove("vignova-btn-login");
            setBtnContent(btn, "vignova-btn-icon", "⚡", "Tailor Resume");
        }
    }

    // Clear visible account data before redrawing from the verified session.
    let pendingAccountRefresh = false;
    function refreshAccountUI() {
        // A generation in flight owns the overlay and the buttons. Finishing a
        // generation writes credits_remaining into vignova_user, and the
        // storage listener below turned that into a full redraw — tearing the
        // "Already generated" prompt out of the DOM mid-await. Its promise
        // never settled, so the button sat on "Generating..." forever and
        // isProcessing stayed true, deadening every later click. Defer instead.
        if (isProcessing) {
            pendingAccountRefresh = true;
            return;
        }
        ++authRenderVersion;
        document.getElementById("vignova-indeed-container")?.replaceChildren();
        // Keep a pack the user is reading; only clear transient overlays.
        if (!Vignova_Overlay._resultsOpen) Vignova_Overlay.remove();
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
