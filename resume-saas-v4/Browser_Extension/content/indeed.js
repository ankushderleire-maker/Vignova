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

    const BUTTON_ID = "vignova-indeed-tailor-btn";
    const SAVE_BUTTON_ID = "vignova-indeed-save-btn";

    let isProcessing = false;

    // ─── Observe DOM Changes (Indeed partially SPA) ───
    const observer = new MutationObserver(() => {
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
            container.style.display = "flex";
            container.style.alignItems = "center";
            container.style.gap = "10px";
            container.style.flexWrap = "wrap";
            parent.appendChild(container);

            // Render UI only on creation
            renderExtensionUI();
        }
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

        const container = document.getElementById("vignova-indeed-container");
        if (!container) {
            isRenderingUI = false;
            return; // Should exist
        }

        // Clear container AFTER await to prevent async race conditions where multiple 
        // observer triggers clear an already-empty box and then all append.
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
    async function fetchAndDisplayScore(badge) {
        const jobData = scrapeIndeedJob();
        if (!jobData.jobDescription) {
            // Indeed sometimes lazy loads description
            badge.innerHTML = "?";
            badge.title = "Scroll down to load description";
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
        if (btn.classList.contains("success")) return;

        btn.disabled = true;
        btn.innerHTML = `<span class="vignova-btn-spinner"></span> Saving...`;

        const jobData = scrapeIndeedJob();
        // Use full URL to preserve 'vjk' or 'jk' parameters which are crucial for Indeed
        const currentUrl = window.location.href;

        try {
            const result = await chrome.runtime.sendMessage({
                type: "API_SAVE_JOB",
                data: {
                    jobTitle: jobData.jobTitle,
                    company: jobData.company,
                    location: jobData.location,
                    jobUrl: currentUrl,
                    description: jobData.jobDescription,
                    source: "INDEED"
                }
            });

            if (result.success) {
                // Save state
                const update = {};
                update[currentUrl] = { saved: true };
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
                    window.open("http://localhost:3000/dashboard", "_blank");
                };
            } else {
                btn.innerHTML = "❌ Failed";
                setTimeout(() => {
                    btn.innerHTML = `<span class="vignova-btn-icon">💾</span> Save to Vignova Dashboard`;
                    btn.disabled = false;
                }, 2000);
                alert("Failed to save: " + (result.error || "Unknown error"));
            }
        } catch (err) {
            console.error(err);
            btn.innerHTML = "❌ Error";
            btn.disabled = false;
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
            btn.innerHTML = `<span class="vignova-btn-icon">🔑</span> Login Required`;
            btn.classList.add("vignova-btn-login");
            isProcessing = false;
            chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
            return;
        }

        // Update button to loading
        btn.disabled = true;
        btn.innerHTML = `<span class="vignova-btn-spinner"></span> Generating...`;

        // Show overlay
        Vignova_Overlay.showLoading();

        // Scrape job data
        const jobData = scrapeIndeedJob();

        if (!jobData.jobDescription) {
            Vignova_Overlay.showError("Could not find the job description. Please scroll down to load it and try again.");
            resetButton();
            return;
        }

        const currentUrl = window.location.href;

        // Call API via background service worker (avoids local network prompt)
        try {
            const result = await chrome.runtime.sendMessage({
                type: "API_GENERATE_RESUME",
                data: {
                    jobDescription: jobData.jobDescription,
                    jobTitle: jobData.jobTitle,
                    company: jobData.company,
                    jobUrl: currentUrl,
                    source: "INDEED",
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
                Vignova_Overlay.showError(
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

        const jobDescription = descriptionEl?.innerText?.trim() || "";

        return { jobTitle, company, jobDescription, location };
    }

    // ─── Reset Button State ───
    function resetButton() {
        isProcessing = false;
        const btn = document.getElementById(BUTTON_ID);
        if (btn && !btn.classList.contains("success")) {
            btn.disabled = false;
            btn.classList.remove("vignova-btn-login");
            btn.innerHTML = `<span class="vignova-btn-icon">⚡</span> Tailor Resume`;
        }
    }

    // ─── Listen for Auth Changes ───
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "AUTH_STATE_CHANGED") {
            renderExtensionUI();
        }
    });
})();
