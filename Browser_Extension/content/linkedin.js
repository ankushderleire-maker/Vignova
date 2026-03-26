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

    const BUTTON_ID = "vignova-linkedin-tailor-btn";
    const SAVE_BUTTON_ID = "vignova-linkedin-save-btn";
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

    let currentJobId = getJobIdFromUrl();

    // ─── Observe DOM Changes (LinkedIn is SPA) ───
    const observer = new MutationObserver(() => {
        const newJobId = getJobIdFromUrl();

        // If the user clicked a new job, remove the old badge container
        if (newJobId && newJobId !== currentJobId) {
            currentJobId = newJobId;
            const oldContainer = document.getElementById(CONTAINER_ID);
            if (oldContainer) {
                oldContainer.remove();
            }
        }

        if (!document.getElementById(BUTTON_ID)) {
            tryInjectButton();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    // Initial attempt
    setTimeout(tryInjectButton, 1500);

    // ─── Try to Inject Button ───
    function tryInjectButton() {
        // Only inject on job detail pages
        if (!window.location.pathname.includes("/jobs/") && !window.location.pathname.includes("/jobs/view")) return;

        // Injection Point: Below Title (User Request)
        // We look for the title container or the primary description container
        const titleSection =
            document.querySelector(".job-details-jobs-unified-top-card__primary-description-container") || // Best bet based on user HTML
            document.querySelector(".job-details-jobs-unified-top-card__title-container") ||
            document.querySelector(".t-24.job-details-jobs-unified-top-card__job-title");


        const fallbackArea =
            document.querySelector(".jobs-apply-button--top-card")?.parentElement ||
            document.querySelector(".jobs-s-apply")?.parentElement;

        let target = titleSection;
        let insertMethod = 'append'; // or 'after'

        if (titleSection) {
            target = titleSection;
            insertMethod = 'after';
        } else if (fallbackArea) {
            target = fallbackArea;
            insertMethod = 'append';
        } else {
            return;
        }

        // Don't inject if already exists
        if (document.getElementById(CONTAINER_ID)) return;

        // Create Container
        const container = document.createElement("div");
        container.id = CONTAINER_ID;
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.marginTop = "12px"; // Add some spacing
        container.style.marginBottom = "12px";

        if (insertMethod === 'after' && target.parentNode) {
            // Insert after the target element
            target.parentNode.insertBefore(container, target.nextSibling);
        } else {
            target.appendChild(container);
        }

        // Render UI based on auth
        renderExtensionUI();
    }

    // ─── Render Extension UI (Auth Aware) ───
    let isRenderingUI = false;

    async function renderExtensionUI() {
        if (isRenderingUI) return;
        isRenderingUI = true;

        // Check Auth
        const authStatus = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "GET_AUTH_STATUS" }, resolve);
        });

        const container = document.getElementById(CONTAINER_ID);
        if (!container) {
            isRenderingUI = false;
            return;
        }

        // Clear container AFTER await
        container.innerHTML = "";

        if (!authStatus?.isLoggedIn) {
            // Render Login Button
            const loginBtn = document.createElement("button");
            loginBtn.className = "vignova-tailor-btn vignova-btn-login";
            loginBtn.innerHTML = `<span class="vignova-btn-icon">🔑</span> Login to Vignova to View Options`;
            loginBtn.style.backgroundColor = "#333";
            loginBtn.onclick = () => {
                chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
            };
            container.appendChild(loginBtn);
        } else {
            // Render Action Buttons
            renderActionButtons(container);
        }

        isRenderingUI = false;
    }

    function renderActionButtons(container) {
        // 1. Tailor Button
        const tailorBtn = document.createElement("button");
        tailorBtn.id = BUTTON_ID;
        tailorBtn.className = "vignova-tailor-btn";
        tailorBtn.innerHTML = `<span class="vignova-btn-icon">⚡</span> Tailor Resume`;
        tailorBtn.addEventListener("click", handleTailorClick);

        // 2. Save Button
        const saveBtn = document.createElement("button");
        saveBtn.id = SAVE_BUTTON_ID;
        saveBtn.className = "vignova-save-btn";
        saveBtn.innerHTML = `<span class="vignova-btn-icon">💾</span> Save to Vignova Dashboard`;
        saveBtn.style.marginLeft = "8px";
        saveBtn.addEventListener("click", handleSaveClick);

        // Check stored state
        checkJobState(window.location.href, tailorBtn, saveBtn);

        // 0. Match Score Badge
        const scoreBadge = document.createElement("div");
        scoreBadge.className = "vignova-score-badge";
        scoreBadge.innerHTML = `<div class="vignova-score-loading"></div>`; // Loading spinner
        scoreBadge.title = "Calculating Match Score...";

        container.appendChild(scoreBadge);
        container.appendChild(tailorBtn);
        container.appendChild(saveBtn);

        // Fetch Score
        fetchAndDisplayScore(scoreBadge);
    }

    // ─── Fetch & Display Score ───
    async function fetchAndDisplayScore(badge, retries = 3) {
        let jobData = scrapeLinkedInJob();

        // Single Page Apps often inject the container before the text finishes loading.
        // If the description is suspiciously short (e.g. just whitespace or "Loading..."), wait and retry.
        if (!jobData.jobDescription || jobData.jobDescription.length < 50) {
            if (retries > 0) {
                setTimeout(() => fetchAndDisplayScore(badge, retries - 1), 1000);
                return;
            }
            badge.innerHTML = "?";
            badge.title = "Could not parse job description text";
            return;
        }

        try {
            const response = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    type: "API_GET_SCORE",
                    data: { jobDescription: jobData.jobDescription }
                }, resolve);
            });

            if (response && response.success) {
                const score = response.score;

                // Categorical Mapping User Request
                let categoryText = "";
                badge.classList.remove("high", "medium", "low", "very-high", "very-low");

                if (score > 40) {
                    categoryText = "Very High";
                    badge.classList.add("very-high");
                } else if (score >= 31) {
                    categoryText = "High";
                    badge.classList.add("high");
                } else if (score >= 21) {
                    categoryText = "Medium";
                    badge.classList.add("medium");
                } else if (score >= 11) {
                    categoryText = "Low";
                    badge.classList.add("low");
                } else {
                    categoryText = "Very Low";
                    badge.classList.add("very-low");
                }

                // Remove the word "Match" as requested
                badge.innerHTML = categoryText;

                // Add Matched Keywords
                let matchedKeywordsHtml = "";
                const matchedKws = response.breakdown.matching_keywords || [];
                if (matchedKws.length > 0) {
                    const kwPills = matchedKws.slice(0, 8).map(k => `<span class="vignova-kw-pill">${k}</span>`).join("");
                    matchedKeywordsHtml = `
                        <div class="vignova-tt-row" style="margin-top:12px; border-top:1px solid #3f3f46; padding-top:12px; display:block;">
                            <span class="vignova-tt-label" style="display:block; margin-bottom:6px;">Keyword Matches</span>
                            <div style="display:flex; flex-wrap:wrap; gap:6px;">${kwPills}</div>
                        </div>
                    `;
                }

                // Add Missing Keywords
                let missingKeywordsHtml = "";
                const missingKws = response.breakdown.missing_keywords || [];
                if (missingKws.length > 0) {
                    const missingPills = missingKws.slice(0, 8).map(k => `<span class="vignova-kw-pill vignova-kw-missing">${k}</span>`).join("");
                    missingKeywordsHtml = `
                        <div class="vignova-tt-row" style="margin-top:12px; border-top:1px solid #3f3f46; padding-top:12px; display:block;">
                            <span class="vignova-tt-label" style="display:block; margin-bottom:6px;">What's Missing</span>
                            <div style="display:flex; flex-wrap:wrap; gap:6px;">${missingPills}</div>
                        </div>
                    `;
                }

                // Create Advanced HTML Tooltip String
                const sem = response.breakdown.semantic;
                const kw = response.breakdown.keyword;
                const tooltipHTML = `
                    <div class="vignova-tt-header">Match Breakdown (${score}/100)</div>
                    <div class="vignova-tt-row">
                        <span class="vignova-tt-label">Vibe & Theory</span>
                        <div class="vignova-tt-bar-bg"><div class="vignova-tt-bar-fill" style="width: ${sem}%; background: #3b82f6;"></div></div>
                        <span class="vignova-tt-val">${sem}%</span>
                    </div>
                    <div class="vignova-tt-row">
                        <span class="vignova-tt-label">Keywords</span>
                        <div class="vignova-tt-bar-bg"><div class="vignova-tt-bar-fill" style="width: ${kw}%; background: #10b981;"></div></div>
                        <span class="vignova-tt-val">${kw}%</span>
                    </div>
                    ${matchedKeywordsHtml}
                    ${missingKeywordsHtml}
                `;

                // Store the HTML data
                badge.setAttribute("data-tooltip-html", tooltipHTML);
                badge.removeAttribute("data-tooltip");
                badge.title = "";

                // Add Hover Listeners for Global Tooltip
                badge.addEventListener("mouseenter", showGlobalTooltip);
                badge.addEventListener("mouseleave", hideGlobalTooltip);

            } else {
                badge.innerHTML = "!";
                badge.title = "Failed to calculate score";
            }
        } catch (e) {
            console.error(e);
            badge.innerHTML = "!";
        }
    }

    // ─── Global Tooltip Logic ───
    let globalTooltipEl = null;

    function showGlobalTooltip(e) {
        const badge = e.currentTarget;
        const html = badge.getAttribute("data-tooltip-html");
        if (!html) return;

        if (!globalTooltipEl) {
            globalTooltipEl = document.createElement("div");
            globalTooltipEl.className = "vignova-tooltip-content global-tooltip";
            document.body.appendChild(globalTooltipEl);
        }

        globalTooltipEl.innerHTML = html;

        // Show slightly to calculate dimensions
        globalTooltipEl.style.visibility = "hidden";
        globalTooltipEl.style.opacity = "0";
        globalTooltipEl.classList.add("show");

        // Calculate position
        const rect = badge.getBoundingClientRect();

        // Position to the right of the badge
        const top = rect.top + (rect.height / 2) - (globalTooltipEl.offsetHeight / 2);
        const left = rect.right + 12; // 12px gap

        globalTooltipEl.style.top = `${top}px`;
        globalTooltipEl.style.left = `${left}px`;

        // Render
        globalTooltipEl.style.visibility = "visible";
        globalTooltipEl.style.opacity = "1";
    }

    function hideGlobalTooltip() {
        if (globalTooltipEl) {
            globalTooltipEl.classList.remove("show");
            globalTooltipEl.style.opacity = "0";
            globalTooltipEl.style.visibility = "hidden";
        }
    }

    // ─── Check Stored State ───
    function checkJobState(url, tailorBtn, saveBtn) {
        chrome.storage.local.get([url], (result) => {
            const data = result[url];
            if (data?.tailored) {
                tailorBtn.innerHTML = `<span class="vignova-btn-icon">✅</span> Resume Created`;
                tailorBtn.classList.add("success");
                // Optional: Disable or change behavior? User wants "Resume Created button"
                // Maybe clicking it opens dashboard?
                tailorBtn.title = "You have already tailored a resume for this job.";
            }

            if (data?.saved) {
                saveBtn.innerHTML = `<span class="vignova-btn-icon">👁️</span> View in Dashboard`;
                saveBtn.classList.add("success");
                saveBtn.onclick = () => {
                    window.open(`${Vignova_API_BASE}/dashboard`, "_blank");
                };
            }
        });
    }

    // ─── Handle Save Click ───
    async function handleSaveClick() {
        const btn = document.getElementById(SAVE_BUTTON_ID);
        if (btn.classList.contains("success")) return; // Already saved/view mode

        btn.disabled = true;
        btn.innerHTML = `<span class="vignova-btn-spinner"></span> Saving...`;

        const jobData = scrapeLinkedInJob();
        // jobUrl might be complex, sanitize or use standard
        const currentUrl = window.location.href.split('?')[0]; // Removing query params usually safer for ID

        try {
            const result = await chrome.runtime.sendMessage({
                type: "API_SAVE_JOB",
                data: {
                    jobTitle: jobData.jobTitle,
                    company: jobData.company,
                    location: jobData.location,
                    jobUrl: currentUrl,
                    description: jobData.jobDescription,
                    source: "LINKEDIN"
                }
            });

            if (result.success) {
                // Save state
                const update = {};
                update[currentUrl] = { saved: true };
                // We need to merge with existing state (e.g. tailored)
                chrome.storage.local.get([currentUrl], (current) => {
                    const existing = current[currentUrl] || {};
                    chrome.storage.local.set({
                        [currentUrl]: { ...existing, saved: true, jobId: result.jobId }
                    });
                });

                btn.innerHTML = `<span class="vignova-btn-icon">👁️</span> View in Dashboard`;
                btn.classList.add("success");
                btn.disabled = false;
                btn.onclick = () => {
                    // Redirect to dashboard (maybe specific job page later?)
                    window.open("https://app.vignova.io/dashboard", "_blank");
                };
            } else {
                btn.innerHTML = "❌ Failed";
                setTimeout(() => {
                    btn.innerHTML = `<span class="vignova-btn-icon">💾</span> Save to Vignova Dashboard`;
                    btn.disabled = false;
                }, 2000);
                alert("Failed to save: " + result.error);
            }
        } catch (err) {
            console.error(err);
            btn.innerHTML = "❌ Error";
            btn.disabled = false;
        }
    }


    // ─── Handle Tailor Button Click ───
    async function handleTailorClick() {
        // ... (Logic mostly same, just adding state save)
        if (isProcessing) return;
        isProcessing = true;
        const btn = document.getElementById(BUTTON_ID);

        btn.disabled = true;
        btn.innerHTML = `<span class="vignova-btn-spinner"></span> Generating...`;
        Vignova_Overlay.showLoading();

        const jobData = scrapeLinkedInJob();
        if (!jobData.jobDescription) {
            Vignova_Overlay.showError("Could not find the job description. Refresh page.");
            resetButton();
            return;
        }

        const currentUrl = window.location.href.split('?')[0];

        try {
            const result = await chrome.runtime.sendMessage({
                type: "API_GENERATE_RESUME",
                data: {
                    jobDescription: jobData.jobDescription,
                    jobTitle: jobData.jobTitle,
                    company: jobData.company,
                    jobUrl: currentUrl,
                    source: "LINKEDIN",
                },
            });

            if (result.success) {
                const fileName = `${(jobData.company || "Resume").replace(/[^a-zA-Z0-9]/g, "_")}_Resume.pdf`;
                Vignova_Overlay.showSuccess(result.pdfBase64, fileName, result.credits_remaining);

                btn.innerHTML = `<span class="vignova-btn-icon">✅</span> Resume Created`;
                btn.classList.add("success");

                // Save state
                chrome.storage.local.get([currentUrl], (current) => {
                    const existing = current[currentUrl] || {};
                    chrome.storage.local.set({
                        [currentUrl]: { ...existing, tailored: true }
                    });
                });

            } else {
                Vignova_Overlay.showError(result.error || "Failed.", () => { resetButton(); handleTailorClick(); });
                resetButton();
            }
        } catch (err) {
            console.error(err);
            Vignova_Overlay.showError("Connection failed.", () => { resetButton(); handleTailorClick(); });
            resetButton();
        }
    }

    // ─── Scrape Job Data from LinkedIn DOM ───
    function scrapeLinkedInJob() {
        const jobTitle =
            document.querySelector(".t-24.t-bold.inline")?.innerText?.trim() ||
            document.querySelector(".job-details-jobs-unified-top-card__job-title")?.innerText?.trim() ||
            document.querySelector("h1.t-24")?.innerText?.trim() ||
            "Job Role";

        const company =
            document.querySelector(".job-details-jobs-unified-top-card__company-name")?.innerText?.trim() ||
            document.querySelector(".jobs-unified-top-card__company-name")?.innerText?.trim() ||
            "Company";

        const location =
            document.querySelector(".job-details-jobs-unified-top-card__bullet")?.innerText?.trim() ||
            "";

        const descriptionEl =
            document.querySelector("#job-details") ||
            document.querySelector(".jobs-description__content") ||
            document.querySelector(".jobs-box__html-content");

        const jobDescription = descriptionEl?.innerText?.trim() || "";

        return { jobTitle, company, jobDescription, location };
    }

    // ─── Reset Button State ───
    function resetButton() {
        isProcessing = false;
        const btn = document.getElementById(BUTTON_ID);
        if (btn && !btn.classList.contains("success")) {
            btn.disabled = false;
            btn.classList.remove("vignova-btn-login"); // This line is now redundant as login state is handled by renderExtensionUI
            btn.innerHTML = `<span class="vignova-btn-icon">⚡</span> Tailor Resume`;
        }
    }

    // ─── Listen for Auth Changes ───
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "AUTH_STATE_CHANGED") {
            // Re-render UI on auth change
            renderExtensionUI();
        }
    });
})();
