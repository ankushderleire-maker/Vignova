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
    const observer = new MutationObserver(() => {
        if (!hasValidExtensionContext()) {
            observer.disconnect();
            return;
        }
        // Debounce: coalesce rapid DOM mutations into a single callback
        if (_mutationTimer) clearTimeout(_mutationTimer);
        _mutationTimer = setTimeout(() => {
            _mutationTimer = null;

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

            stampJobListCards();
        }, 300);
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
                target = applyBtn.parentElement;
                insertMethod = 'append';
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
                // Find a common container. Usually they are flex containers.
                target = actionBtn.closest("div");
                insertMethod = 'append';
                
                // If it's a wrapper with just the button, go up one level to be alongside other buttons
                if (target && target.parentElement && target.children.length === 1) {
                    target = target.parentElement;
                }
            }
        }

        if (!target) return;

        // Don't inject if already exists
        if (document.getElementById(CONTAINER_ID)) return;

        // Create Container
        // Create Container
        const container = document.createElement("div");
        container.id = CONTAINER_ID;
        container.className = "vignova-injected-container";

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
        if (!hasValidExtensionContext()) return;
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
            renderActionButtons(container);
        }

        isRenderingUI = false;
    }

    function renderActionButtons(container) {
        // 1. Tailor Button
        const tailorBtn = document.createElement("button");
        tailorBtn.id = BUTTON_ID;
        tailorBtn.className = "vignova-tailor-btn";
        setBtnContent(tailorBtn, "vignova-btn-icon", "⚡", "Tailor Resume");
        tailorBtn.addEventListener("click", handleTailorClick);

        // 2. Save Button
        const saveBtn = document.createElement("button");
        saveBtn.id = SAVE_BUTTON_ID;
        saveBtn.className = "vignova-save-btn";
        setBtnContent(saveBtn, "vignova-btn-icon", "💾", "Save to Dashboard");
        saveBtn.style.marginLeft = "8px";
        saveBtn.addEventListener("click", handleSaveClick);

        // Check stored state
        checkJobState(window.location.href, tailorBtn, saveBtn);

        // Add Vignova Branding Logo
        const logoImg = document.createElement("img");
        logoImg.src = chrome.runtime.getURL("icons/logo.png");
        logoImg.style.height = "24px";
        logoImg.style.width = "auto";
        logoImg.style.objectFit = "contain";
        logoImg.style.marginLeft = "4px";
        logoImg.style.marginRight = "8px";
        logoImg.style.borderRadius = "2px";
        logoImg.title = "Vignova AI";
        container.appendChild(logoImg);

        // 0. Match Score Badge
        const scoreBadge = document.createElement("div");
        scoreBadge.className = "vignova-score-badge";
        scoreBadge.textContent = "";
        const spinner = document.createElement("div");
        spinner.className = "vignova-score-loading";
        scoreBadge.appendChild(spinner); // Loading spinner
        scoreBadge.title = "Calculating Match Score...";

        container.appendChild(scoreBadge);
        container.appendChild(tailorBtn);
        container.appendChild(saveBtn);

        // Fetch Score
        fetchAndDisplayScore(scoreBadge);
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
                const score = response.score;

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

                badge.textContent = categoryText;

                // Add Matched Keywords
                let matchedKeywordsHtml = "";
                const matchedKws = response.breakdown.matching_keywords || [];
                if (matchedKws.length > 0) {
                    const kwPills = matchedKws.slice(0, 25).map(k => `<span class="vignova-kw-pill">${k}</span>`).join("");
                    matchedKeywordsHtml = `
                        <div class="vignova-tt-row" style="margin-top:12px; border-top:1px solid #3f3f46; padding-top:12px; display:block;">
                            <span class="vignova-tt-label" style="display:block; margin-bottom:6px;">Keyword Matches (${matchedKws.length})</span>
                            <div style="display:flex; flex-wrap:wrap; gap:6px;">${kwPills}</div>
                        </div>
                    `;
                }

                // Add Missing Keywords
                let missingKeywordsHtml = "";
                const missingKws = response.breakdown.missing_keywords || [];
                if (missingKws.length > 0) {
                    const missingPills = missingKws.slice(0, 25).map(k => `<span class="vignova-kw-pill vignova-kw-missing">${k}</span>`).join("");
                    missingKeywordsHtml = `
                        <div class="vignova-tt-row" style="margin-top:12px; border-top:1px solid #3f3f46; padding-top:12px; display:block;">
                            <span class="vignova-tt-label" style="display:block; margin-bottom:6px;">What's Missing (${missingKws.length})</span>
                            <div style="display:flex; flex-wrap:wrap; gap:6px;">${missingPills}</div>
                        </div>
                    `;
                }

                // Create Advanced HTML Tooltip String
                const sem = response.breakdown.semantic;
                const kw = response.breakdown.keyword;
                const domainRel = response.breakdown.domain_relevance || 100;
                const metaHtml = (jobMeta.salary || jobMeta.deadline) ? `
                    <div class="vignova-tt-row" style="margin-top:10px; border-top:1px solid #3f3f46; padding-top:10px; gap:8px; flex-wrap:wrap;">
                        ${jobMeta.salary ? `<span style="background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#6ee7b7;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;">💰 ${jobMeta.salary}</span>` : ""}
                        ${jobMeta.deadline ? `<span style="background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.3);color:#fde68a;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;">📅 Apply by ${jobMeta.deadline}</span>` : ""}
                    </div>` : "";

                const tooltipHTML = `
                    <div class="vignova-tt-header">Match Breakdown (${score}/100)</div>
                    ${metaHtml}
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
                    <div class="vignova-tt-row">
                        <span class="vignova-tt-label">Domain Fit</span>
                        <div class="vignova-tt-bar-bg"><div class="vignova-tt-bar-fill" style="width: ${domainRel}%; background: ${domainRel >= 80 ? '#10b981' : domainRel >= 50 ? '#f59e0b' : '#ef4444'};"></div></div>
                        <span class="vignova-tt-val">${domainRel}%</span>
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
                badge.textContent = "!";
                badge.title = "Failed to calculate score";
            }
        } catch (e) {
            console.error(e);
            badge.textContent = "!";
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

        const doc = new DOMParser().parseFromString(html, "text/html");
        globalTooltipEl.textContent = "";
        while (doc.body.firstChild) {
            globalTooltipEl.appendChild(doc.body.firstChild);
        }

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
                setBtnContent(tailorBtn, "vignova-btn-icon", "✅", "Resume Created");
                tailorBtn.classList.add("success");
                // Optional: Disable or change behavior? User wants "Resume Created button"
                // Maybe clicking it opens dashboard?
                tailorBtn.title = "You have already tailored a resume for this job.";
            }

            if (data?.saved) {
                setBtnContent(saveBtn, "vignova-btn-icon", "👁️", "View in Dashboard");
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
        setBtnContent(btn, "vignova-btn-spinner", "", "Saving...");

        const jobData = await scrapeLinkedInJob();
        // jobUrl might be complex, sanitize or use standard
        const jobId = getJobIdFromUrl();
        const currentUrl = jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : window.location.href.split('?')[0]; // Removing query params usually safer for ID

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
                    }, () => stampJobListCards());
                });

                setBtnContent(btn, "vignova-btn-icon", "👁️", "View in Dashboard");
                btn.classList.add("success");
                btn.disabled = false;
                btn.onclick = () => {
                    // Redirect to dashboard (maybe specific job page later?)
                    window.open("https://app.vignova.io/dashboard", "_blank");
                };
            } else {
                setBtnContent(btn, null, null, "❌ Failed");
                setTimeout(() => {
                    setBtnContent(btn, "vignova-btn-icon", "💾", "Save to Vignova Dashboard");
                    btn.disabled = false;
                }, 2000);
                alert("Failed to save: " + result.error);
            }
        } catch (err) {
            console.error(err);
            setBtnContent(btn, null, null, "❌ Error");
            btn.disabled = false;
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

        const jobId = getJobIdFromUrl();
        const currentUrl = jobId ? `https://www.linkedin.com/jobs/view/${jobId}/` : window.location.href.split('?')[0];

        try {
            const result = await chrome.runtime.sendMessage({
                type: "API_GENERATE_ALL",
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
    async function scrapeLinkedInJob() {
        const jobId = getJobIdFromUrl();

        let jobTitleEl =
            document.querySelector(".t-24.t-bold.inline") ||
            document.querySelector(".job-details-jobs-unified-top-card__job-title") ||
            document.querySelector('.job-details-jobs-unified-top-card__job-title-link') ||
            document.querySelector("h2.t-24") ||
            document.querySelector("h1.t-24") ||
            document.querySelector(".jobs-search__job-details--container h2") ||
            document.querySelector(".job-details-jobs-unified-top-card__container--two-pane h2");

        if (!jobTitleEl && jobId) {
            // Fallback: Find links containing the /jobs/view/jobId in href to avoid matching "Hybrid" badges
            const anchors = Array.from(document.querySelectorAll(`a[href*="/jobs/view/${jobId}"]`)).filter(a => a.innerText?.trim());
            if (anchors.length > 0) {
                jobTitleEl = anchors[0];
            }
        }
        const jobTitle = jobTitleEl?.innerText?.trim() || "Job Role";

        let companyEl = document.querySelector('.job-details-jobs-unified-top-card__company-name') ||
                        document.querySelector('.jobs-unified-top-card__company-name') ||
                        document.querySelector('.job-details-jobs-unified-top-card__primary-description a') ||
                        document.querySelector('.job-details-jobs-unified-top-card__container--two-pane a[href*="/company/"]');
        
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
            document.querySelector(".job-details-jobs-unified-top-card__bullet")?.innerText?.trim() ||
            "";

        let descriptionEl =
            document.querySelector("#job-details") ||
            document.querySelector(".jobs-description__content") ||
            document.querySelector(".jobs-box__html-content") ||
            document.querySelector("article.jobs-description__container") ||
            document.querySelector("article") ||
            document.querySelector('div[class*="description"]') ||
            document.getElementById("job-details-content") ||
            document.querySelector('div.job-details-module__content');

        // Fallback for extreme obfuscation: look for the "About the job" heading
        if (!descriptionEl) {
            const headings = Array.from(document.querySelectorAll("h2"));
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
            const buttons = Array.from(document.querySelectorAll('button'));
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

        const jobDescription = descriptionEl?.textContent?.trim() || descriptionEl?.innerText?.trim() || "";

        return { jobTitle, company, jobDescription, location, descriptionEl };
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

    // ─── Listen for Auth Changes ───
    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === "AUTH_STATE_CHANGED") {
            // Re-render UI on auth change
            renderExtensionUI();
        }
    });
})();
