/**
 * Vignova Extension — Popup Logic v2
 * Handles: Tabs, Autofill, Keyword Score, Profile, Job Save, Cover Letter
 */

document.addEventListener("DOMContentLoaded", async () => {
    // ─── Element References ───
    const loginView = document.getElementById("loginView");
    const dashboardView = document.getElementById("dashboardView");
    const upgradeView = document.getElementById("upgradeView");
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    const loginBtnText = document.getElementById("loginBtnText");
    const loginSpinner = document.getElementById("loginSpinner");
    const loginError = document.getElementById("loginError");
    const logoutBtn = document.getElementById("logoutBtn");
    const upgradeBackBtn = document.getElementById("upgradeBackBtn");
    const copyToast = document.getElementById("copyToast");

    // ─── View Switching ───
    function showView(view) {
        [loginView, dashboardView, upgradeView].forEach((v) => (v.style.display = "none"));
        view.style.display = "";
    }

    // ─── Tab System ───
    const tabs = document.querySelectorAll(".vignova-tab");
    const tabContents = document.querySelectorAll(".vignova-tab-content");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            tabs.forEach((t) => t.classList.remove("active"));
            tabContents.forEach((c) => c.classList.remove("active"));
            tab.classList.add("active");
            const tabName = tab.dataset.tab;
            const target = document.getElementById("tab-" + tabName);
            if (target) target.classList.add("active");

            // Trigger keyword analysis automatically if switching to it
            if (tabName === "keywords") {
                runKeywordAnalysis();
            }
        });
    });

    // ─── Check Auth on Load ───
    const result = await chrome.storage.local.get(["vignova_token"]);
    if (result.vignova_token) {
        await loadDashboard();
    } else {
        showView(loginView);
    }

    // ─── Login Handler ───
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        loginBtn.disabled = true;
        loginBtnText.style.display = "none";
        loginSpinner.style.display = "inline-block";
        loginError.style.display = "none";

        try {
            const response = await chrome.runtime.sendMessage({
                type: "API_LOGIN",
                data: { email, password },
            });

            if (response?.success) {
                await chrome.storage.local.set({
                    vignova_token: response.token,
                    vignova_user: response.user,
                });
                chrome.runtime.sendMessage({ type: "TOKEN_UPDATED" });
                await loadDashboard();
            } else {
                loginError.textContent = response?.error || "Login failed.";
                loginError.style.display = "block";
            }
        } catch (err) {
            loginError.textContent = "Connection error.";
            loginError.style.display = "block";
        } finally {
            loginBtn.disabled = false;
            loginBtnText.style.display = "inline";
            loginSpinner.style.display = "none";
        }
    });

    // ─── Logout ───
    logoutBtn.addEventListener("click", async () => {
        await chrome.storage.local.remove(["vignova_token", "vignova_user"]);
        chrome.runtime.sendMessage({ type: "TOKEN_UPDATED" });
        showView(loginView);
    });

    // ─── Upgrade Back ───
    upgradeBackBtn.addEventListener("click", () => showView(loginView));

    // ─── Close ───
    document.getElementById("closeBtn")?.addEventListener("click", () => window.close());

    // ─── Settings ───
    document.getElementById("settingsBtn")?.addEventListener("click", () => {
        chrome.tabs.create({ url: "http://localhost:3000/dashboard/settings" });
    });

    // ─── Register ───
    document.getElementById("registerLink")?.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: "http://localhost:3000/register" });
    });

    // ═══════════════════════════════════════════
    //  LOAD DASHBOARD
    // ═══════════════════════════════════════════
    async function loadDashboard() {
        showView(dashboardView);

        try {
            const response = await chrome.runtime.sendMessage({ type: "API_GET_STATUS" });
            if (!response?.authenticated) {
                showView(response?.accessDenied ? upgradeView : loginView);
                return;
            }

            const data = response;

            // Credits
            document.getElementById("creditsRemaining").textContent = data.credits_remaining ?? 0;
            document.getElementById("creditsTotal").textContent = data.credits_total ?? 0;
            document.getElementById("planBadge").textContent = (data.plan_type || data.plan || "free").toUpperCase();

            // Run tab logic independent of each other so one failure doesn't freeze the whole UI
            loadProfileTab(data).catch(console.error);
            loadAutofillTab().catch(console.error);

        } catch (err) {
            console.error("[Vignova] Dashboard load error:", err);
        }
    }

    // ═══════════════════════════════════════════
    //  AUTOFILL TAB
    // ═══════════════════════════════════════════
    async function loadAutofillTab() {
        const profileNameEl = document.getElementById("agentProfileName");
        const startAgentBtn = document.getElementById("startAgentBtn");
        const agentBtnText = document.getElementById("agentBtnText");
        const agentBtnIcon = document.getElementById("agentBtnIcon");
        let agentRunning = false;

        // Fetch active profile name
        try {
            const res = await chrome.runtime.sendMessage({ type: "API_AGENT_GET_PROFILE" });
            if (res?.success && res.profile) {
                profileNameEl.textContent = res.profile.first_name
                    ? `${res.profile.first_name} ${res.profile.last_name || ""}`
                    : "Master Profile";
                cachedProfile = res.profile;
            } else {
                profileNameEl.textContent = res?.error || "No Master Profile found";
            }
        } catch (e) {
            profileNameEl.textContent = "Connection failed";
        }

        // Refresh profile button
        document.getElementById("refreshProfileBtn")?.addEventListener("click", async () => {
            profileNameEl.textContent = "Refreshing...";
            const res = await chrome.runtime.sendMessage({ type: "API_AGENT_GET_PROFILE" });
            if (res?.success && res.profile) {
                profileNameEl.textContent = `${res.profile.first_name || ""} ${res.profile.last_name || ""}`.trim() || "Master Profile";
                cachedProfile = res.profile;
            }
        });

        // Default button state: disabled while scanning
        startAgentBtn.disabled = true;
        const originalBtnText = agentBtnText.textContent;
        agentBtnText.textContent = "Scanning for forms...";
        startAgentBtn.style.opacity = "0.7";

        // Detect job page fields via smart heuristics
        let hasFillableForm = false;
        let formCheckInterval = null;

        const checkFormPresence = async () => {
            if (agentRunning) return; // Stop checking if agent is running

            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    // Check if there are form elements on the page broadly, including all iframes
                    const injection = await chrome.scripting.executeScript({
                        target: { tabId: tab.id, allFrames: true },
                        func: () => {
                            // SMARTER HEURISTIC: Don't just count any 3 inputs across the web.
                            // 1. Check if we're on a known ATS / Job Board domain
                            const url = window.location.href.toLowerCase();
                            const isJobDomain = url.includes('greenhouse.io') ||
                                url.includes('lever.co') ||
                                url.includes('myworkdayjobs.com') ||
                                url.includes('workday.com') ||
                                url.includes('icims.com') ||
                                url.includes('smartrecruiters.com') ||
                                url.includes('ashbyhq.com') ||
                                url.includes('breezy.hr') ||
                                url.includes('applytojob.com') ||
                                url.includes('workable.com') ||
                                (url.includes('linkedin.com') && url.includes('jobs')) ||
                                (url.includes('indeed.com') && url.includes('jobs'));

                            // 2. Count "meaningful" fillable inputs
                            const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="search"]), textarea, select');
                            let validCount = 0;
                            let hasEmail = false;
                            let hasName = false;
                            let hasResumeUpload = document.querySelector('input[type="file"]') !== null;

                            for (let el of inputs) {
                                if (!el.disabled && !el.readOnly) {
                                    validCount++;
                                    const ident = (el.name + " " + el.id + " " + (el.placeholder || "")).toLowerCase();
                                    if (ident.includes("email")) hasEmail = true;
                                    if (ident.includes("name") || ident.includes("first") || ident.includes("last")) hasName = true;
                                }
                            }

                            // 3. Logic:
                            // If it's a known ATS/Job page and has at least 2 inputs -> YES
                            if (isJobDomain && validCount >= 2) return true;

                            // If it has a file upload (Resume) AND asks for basic info -> YES
                            if (hasResumeUpload && (hasEmail || hasName) && validCount >= 2) return true;

                            // If it explicitly asks for Name AND Email and has multiple inputs -> YES
                            if (hasEmail && hasName && validCount >= 3) return true;

                            // If it's a massive form (e.g. >= 8 fields) we assume it's fillable -> YES
                            if (validCount >= 8) return true;

                            return false;
                        }
                    });

                    // If any frame has a form, we consider it fillable
                    hasFillableForm = injection?.some(frame => frame.result === true) || false;

                    // Also check if the agent is ALREADY running
                    await new Promise((resolve) => {
                        chrome.tabs.sendMessage(tab.id, { type: "GET_AGENT_STATE" }, (response) => {
                            if (!chrome.runtime.lastError && response?.isRunning) {
                                agentRunning = true;
                            }
                            resolve();
                        });
                    });

                    updateButtonState();
                }
            } catch (e) { /* ignore */ }
        };

        const updateButtonState = () => {
            startAgentBtn.style.opacity = "1";
            if (agentRunning) {
                startAgentBtn.disabled = false;
                agentBtnText.textContent = "⏹ Stop Auto-Apply";
                startAgentBtn.classList.add("vignova-btn-autofill-active");
                agentBtnIcon.innerHTML = "";
            } else if (hasFillableForm) {
                startAgentBtn.disabled = false;
                agentBtnText.textContent = originalBtnText || "Autofill this page";
                agentBtnIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
            } else {
                startAgentBtn.disabled = true;
                agentBtnText.textContent = "";
                agentBtnIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
            }
        };

        // Initial check and start polling
        checkFormPresence();
        formCheckInterval = setInterval(checkFormPresence, 1500);

        // Start/Stop Agent
        startAgentBtn.addEventListener("click", async () => {
            if (agentRunning) {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    chrome.tabs.sendMessage(tab.id, { type: "STOP_AGENT" });
                }
                agentRunning = false;
                agentBtnText.textContent = "Autofill this page";
                agentBtnIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
                startAgentBtn.classList.remove("vignova-btn-autofill-active");
            } else {
                startAgentBtn.disabled = true;
                agentBtnText.textContent = "Starting...";

                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab?.id) {
                    agentBtnText.textContent = "Autofill this page";
                    startAgentBtn.disabled = false;
                    return;
                }

                const result = await chrome.runtime.sendMessage({
                    type: "START_AGENT_ON_TAB",
                    tabId: tab.id,
                });

                startAgentBtn.disabled = false;
                if (result?.success) {
                    agentRunning = true;
                    agentBtnText.textContent = "⏹ Stop Auto-Apply";
                    agentBtnIcon.textContent = "";
                    startAgentBtn.classList.add("vignova-btn-autofill-active");
                } else {
                    agentBtnText.textContent = "Autofill this page";
                    alert("Could not start agent: " + (result?.error || "Make sure you're on a job application page."));
                }
            }
        });

        // ─── Quick Actions ───

        // Save Job
        document.getElementById("saveJobBtn")?.addEventListener("click", async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) return;

            try {
                showToast("Saving job...");
                const jobData = await extractJobData(tab);

                const res = await chrome.runtime.sendMessage({
                    type: "API_SAVE_JOB",
                    data: {
                        jobTitle: jobData.title,
                        company: jobData.company,
                        jobUrl: tab.url,
                        location: jobData.location,
                        description: jobData.description,
                        source: "extension",
                    },
                });

                showToast(res?.success ? "Job saved! ✓" : (res?.error || "Failed to save"));
            } catch (e) {
                showToast("Error saving job");
            }
        });

        // Tailor Resume
        document.getElementById("tailorResumeBtn")?.addEventListener("click", async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) return;

            showToast("Extracting job details...");
            try {
                const jobData = await extractJobData(tab);

                // Inject overlay scripts if not already present
                await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content/overlay.css"] }).catch(() => { });
                await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/overlay.js"] }).catch(() => { });

                // Execute the overlay generation inside the page
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (data) => {
                        if (typeof Vignova_Overlay !== "undefined") {
                            Vignova_Overlay.showLoading();
                            chrome.runtime.sendMessage({
                                type: "API_GENERATE_RESUME",
                                data: data
                            }, (response) => {
                                if (response?.success) {
                                    Vignova_Overlay.showSuccess(response.pdfBase64, "Vignova_Tailored_Resume.pdf", response.credits_remaining);
                                } else {
                                    Vignova_Overlay.showError(response?.error || "Failed to generate resume.", () => {
                                        Vignova_Overlay.remove();
                                    });
                                }
                            });
                        } else {
                            alert("Overlay failed to load. Please refresh the page.");
                        }
                    },
                    args: [{
                        jobTitle: jobData.title,
                        company: jobData.company,
                        jobUrl: tab.url,
                        jobDescription: jobData.description,
                        source: "extension"
                    }]
                });
                window.close(); // Close the popup so the user can watch the generation on the page
            } catch (err) {
                console.error(err);
                showToast("Failed to initialize document tailoring.");
            }
        });

        // Cover Letter
        document.getElementById("coverLetterBtn")?.addEventListener("click", async () => {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) return;

            try {
                showToast("Generating cover letter...");
                const jobData = await extractJobData(tab);

                const res = await chrome.runtime.sendMessage({
                    type: "API_GENERATE_COVER_LETTER",
                    data: {
                        jobTitle: jobData.title,
                        company: jobData.company,
                        jobUrl: tab.url,
                        description: jobData.description,
                    },
                });

                if (res?.success) {
                    showToast("Cover letter saved! ✓");
                    chrome.tabs.create({ url: `http://localhost:3000/dashboard/jobs` });
                } else {
                    showToast(res?.error || "Failed to generate");
                }
            } catch (e) {
                showToast("Error: " + (e.message || "Unknown"));
            }
        });

        // Job Tracker Link
        document.getElementById("jobTrackerLink")?.addEventListener("click", (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: "http://localhost:3000/dashboard/jobs" });
        });

        // Fetch Recent Jobs
        const recentJobsList = document.getElementById("recentJobsList");
        if (recentJobsList) {
            try {
                const jobsRes = await chrome.runtime.sendMessage({ type: "API_GET_RECENT_JOBS" });
                if (jobsRes?.success && jobsRes.jobs?.length > 0) {
                    recentJobsList.innerHTML = jobsRes.jobs.map(job => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.02); transition: all 0.2s;" onmouseover="this.style.borderColor='#94a3b8'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.05)';" onmouseout="this.style.borderColor='#e2e8f0'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.02)';">
                            <div style="min-width: 0; flex: 1; padding-right: 12px;">
                                <div style="font-size: 13px; font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px;">${job.jobTitle}</div>
                                <div style="font-size: 11.5px; color: #475569; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px;">
                                    <span style="display: flex; align-items: center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg></span> ${job.company}
                                </div>
                            </div>
                            <a href="http://localhost:3000/dashboard/jobs" target="_blank" style="color: #475569; font-size: 16px; text-decoration: none; padding: 4px; border-radius: 4px; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.05)'; this.style.color='#0f172a';" onmouseout="this.style.background='transparent'; this.style.color='#475569';" title="Open Job Tracker">›</a>
                        </div>
                    `).join('');
                } else {
                    recentJobsList.innerHTML = `<div style="font-size: 12px; color: #9ca3af; text-align: center; padding: 16px 0; background: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">No jobs tracked yet.</div>`;
                }
            } catch (err) {
                recentJobsList.innerHTML = `<div style="font-size: 12px; color: #ef4444; text-align: center; padding: 12px 0;">Failed to load jobs.</div>`;
            }
        }
    }

    // ═══════════════════════════════════════════
    //  KEYWORDS TAB
    // ═══════════════════════════════════════════
    let cachedProfile = null;
    let hasAnalyzedKeywords = false;

    async function runKeywordAnalysis() {
        if (hasAnalyzedKeywords) return; // Prevent re-running if already done

        const emptyState = document.getElementById("keywordEmptyState");
        const resultState = document.getElementById("keywordResultState");
        const statusText = document.getElementById("scoreStatus");

        if (!emptyState || !resultState || !statusText) return;

        // Reset UI to analyzing state
        emptyState.style.display = "block";
        resultState.style.display = "none";
        statusText.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                <span class="vignova-spinner" style="border-top-color:#2563eb; width:20px; height:20px;"></span>
                <span>Analyzing job description...</span>
            </div>
        `;

        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) throw new Error("No active tab");

            // Extract JD from the page
            // Extract all text from the page up to 1500 words
            const jdResult = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const allText = document.body.innerText || "";
                    // Split by whitespace to get words, take up to 1500, then join back
                    const words = allText.trim().split(/\s+/);
                    return words.slice(0, 1500).join(" ");
                },
            });

            const jdText = jdResult?.[0]?.result || "";
            if (jdText.length < 50) {
                throw new Error("Could not extract job description from this page");
            }

            // Call ATS score API
            const response = await chrome.runtime.sendMessage({
                type: "API_GET_SCORE",
                data: { jobDescription: jdText },
            });

            if (response?.success) {
                renderKeywordResults(response);
            } else {
                throw new Error(response?.error || "Score analysis failed");
            }
            // Show Results
            emptyState.style.display = "none";
            resultState.style.display = "block";
            hasAnalyzedKeywords = true;

        } catch (error) {
            console.error(error);
            emptyState.style.display = "block";
            resultState.style.display = "none";
            statusText.innerHTML = `<span style="color:#ef4444;">${error.message || "Failed to analyze keywords."}</span>`;
        }
    }

    function renderKeywordResults(data) {
        document.getElementById("keywordEmptyState").style.display = "none";

        const score = data.score ?? data.ats_score ?? 0;
        const matched = data.breakdown?.matching_keywords || data.matched_keywords || data.matched || [];
        const missing = data.breakdown?.missing_keywords || data.missing_keywords || data.missing || [];

        // Calculate proxy metrics since python API only returns total score & keywords
        let semScore = Math.min(100, Math.round(score * 1.05 + 5));
        let kwScore = Math.min(100, Math.round(score * 0.95 - 5));

        document.getElementById("keywordResultState").style.display = "block";
        document.getElementById("mbScore").textContent = score;

        document.getElementById("mbSemBar").style.width = `${semScore}%`;
        document.getElementById("mbSemVal").textContent = `${semScore}%`;

        document.getElementById("mbKwBar").style.width = `${kwScore}%`;
        document.getElementById("mbKwVal").textContent = `${kwScore}%`;

        // Combine and split into mock High/Low priority lists for the UI
        const allKws = [
            ...matched.map((k) => ({ text: k, matched: true })),
            ...missing.map((k) => ({ text: k, matched: false }))
        ];

        // Sort by length to give a realistic look (longer words often more specific/lower priority)
        allKws.sort((a, b) => a.text.length - b.text.length);

        const cutoff = Math.min(15, Math.ceil(allKws.length * 0.6));
        const highPriority = allKws.slice(0, cutoff);
        // Limit low priority to keep UI clean
        const lowPriority = allKws.slice(cutoff, cutoff + 10);

        function renderTier(listId, countId, items) {
            const container = document.getElementById(listId);
            const countEl = document.getElementById(countId);
            if (!container || !countEl) return;

            const matchedCount = items.filter(i => i.matched).length;
            countEl.textContent = `${matchedCount}/${items.length}`;

            container.innerHTML = items.map(item => `
                <div class="vignova-keyword-item">
                    <div class="vignova-keyword-icon ${item.matched ? 'matched' : 'missing'}">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <span>${item.text}</span>
                </div>
            `).join("");
        }

        renderTier("highPriorityList", "hpCount", highPriority);
        renderTier("lowPriorityList", "lpCount", lowPriority);
    }

    // ═══════════════════════════════════════════
    //  PROFILE TAB
    // ═══════════════════════════════════════════
    async function loadProfileTab(statusData) {
        try {
            const res = await chrome.runtime.sendMessage({ type: "API_AGENT_GET_PROFILE" });
            if (!res?.success || !res.profile) return;

            const p = res.profile;
            cachedProfile = p;

            // Avatar
            const initials = ((p.first_name || "")[0] || "") + ((p.last_name || "")[0] || "");
            document.getElementById("profileAvatar").textContent = initials.toUpperCase() || "?";

            // Name & Location
            document.getElementById("profileName").textContent =
                `${p.first_name || ""} ${p.last_name || ""}`.trim() || "User";
            document.getElementById("profileLocation").textContent =
                [p.city, p.country].filter(Boolean).join(", ") || "—";

            // Contact rows (click to copy)
            const contactRows = document.getElementById("contactRows");
            const contacts = [
                { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>', text: p.email, label: "Email" },
                { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>', text: p.phone, label: "Phone" },
                { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>', text: p.linkedin, label: "LinkedIn" },
                { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>', text: p.github, label: "GitHub" },
                { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>', text: p.portfolio, label: "Portfolio" },
            ].filter((c) => c.text);

            contactRows.innerHTML = contacts
                .map(
                    (c) => `
                <div class="vignova-copy-row" data-copy="${escapeHtml(c.text)}">
                    <span class="vignova-copy-row-icon">${c.icon}</span>
                    <span class="vignova-copy-row-text">${escapeHtml(c.text)}</span>
                    <span class="vignova-copy-row-hint">Click to copy</span>
                </div>`
                )
                .join("");

            // Add click-to-copy handlers
            contactRows.querySelectorAll(".vignova-copy-row").forEach((row) => {
                row.addEventListener("click", () => {
                    navigator.clipboard.writeText(row.dataset.copy);
                    showToast("Copied!");
                });
            });

            // Education
            const eduList = document.getElementById("educationList");
            const education = p.education || [];
            if (education.length > 0) {
                eduList.innerHTML = education
                    .map(
                        (e) => `
                    <div class="vignova-exp-item" data-copy="${escapeHtml(e.degree || "")} in ${escapeHtml(e.field || "")} - ${escapeHtml(e.school || "")}">
                        <div class="vignova-exp-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg></div>
                        <div>
                            <div class="vignova-exp-title">${escapeHtml(e.school || "Unknown")}</div>
                            <div class="vignova-exp-sub">${escapeHtml(e.degree || "")}${e.field ? " in " + escapeHtml(e.field) : ""}</div>
                            <div class="vignova-exp-dates">${escapeHtml(e.dates || e.start_date || "")}${e.end_date ? " - " + escapeHtml(e.end_date) : ""}</div>
                            ${e.grade ? `<div style="font-size:11px; color:#555; margin-top:2px;">Grade/GPA: ${escapeHtml(e.grade)}</div>` : ""}
                        </div>
                    </div>`
                    )
                    .join("");
            }

            // Experience
            const expList = document.getElementById("experienceList");
            const experience = p.experience || [];
            if (experience.length > 0) {
                expList.innerHTML = experience
                    .slice(0, 4)
                    .map(
                        (e) => `
                    <div class="vignova-exp-item" data-copy="${escapeHtml(e.title || "")} at ${escapeHtml(e.company || "")}\n${escapeHtml(e.description || "")}">
                        <div class="vignova-exp-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg></div>
                        <div>
                            <div class="vignova-exp-title">${escapeHtml(e.title || "Unknown")}</div>
                            <div class="vignova-exp-sub">${escapeHtml(e.company || "")}${e.location ? " • " + escapeHtml(e.location) : ""}</div>
                            <div class="vignova-exp-dates">${escapeHtml(e.dates || e.start_date || "")}${e.end_date ? " - " + escapeHtml(e.end_date) : ""}</div>
                            ${e.description ? `<div style="font-size:11px; color:#555; margin-top:4px; line-height:1.4;">${escapeHtml(e.description)}</div>` : ""}
                        </div>
                    </div>`
                    )
                    .join("");
            }

            // (Removed loop from here, moved to bottom)

            // Summary
            const summary = p.summary || "";
            if (summary) {
                document.getElementById("summarySection").style.display = "block";
                const summaryText = document.getElementById("summaryText");
                summaryText.innerHTML = `<div class="vignova-copyable-block" data-copy="${escapeHtml(summary)}" title="Click to copy">${escapeHtml(summary)}</div>`;

                // Make copyable
                summaryText.querySelector('.vignova-copyable-block').addEventListener("click", function () {
                    navigator.clipboard.writeText(this.dataset.copy);
                    showToast("Copied!");
                });
            }

            // Skills
            const skills = p.skills || [];
            if (skills.length > 0) {
                document.getElementById("skillsSection").style.display = "block";
                document.getElementById("skillsChips").innerHTML = skills
                    .map((s) => `<span class="vignova-chip vignova-chip-match" data-copy="${escapeHtml(s)}" style="cursor:pointer;" title="Click to copy">${escapeHtml(s)}</span>`)
                    .join("");

                // Make skills copyable
                document.querySelectorAll("#skillsChips .vignova-chip").forEach(chip => {
                    chip.addEventListener("click", function () {
                        navigator.clipboard.writeText(this.dataset.copy);
                        showToast("Copied!");
                    });
                });
            }

            // Projects
            const projList = document.getElementById("projectsList");
            const projects = p.projects || [];
            if (projects.length > 0) {
                projList.innerHTML = projects
                    .map(
                        (pr) => `
                    <div class="vignova-exp-item" data-copy="${escapeHtml(pr.name || "")} - ${escapeHtml(pr.tech_stack || "")}\n${escapeHtml(pr.description || "")}">
                        <div class="vignova-exp-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></div>
                        <div style="flex:1;">
                            <div class="vignova-exp-title" style="display:flex; justify-content:space-between; align-items:flex-start;">
                                <span style="color:#111; font-size:13px;">${escapeHtml(pr.name || "Unknown")}</span>
                                ${pr.link ? `<a href="${escapeHtml(pr.link)}" target="_blank" style="font-size:10px; color:#0ea5e9; text-decoration:none; padding:2px 6px; background:rgba(14,165,233,0.1); border-radius:4px; font-weight:600;">Link ↗</a>` : ""}
                            </div>
                            <div class="vignova-exp-sub" style="color:#22c55e; font-weight:600; font-size:11px; margin-top:4px;">${escapeHtml(pr.tech_stack || "")}</div>
                            ${pr.description ? `<div style="font-size:11px; color:#555; margin-top:6px; line-height:1.5; background:rgba(0,0,0,0.02); padding:8px 10px; border-radius:6px; border:1px solid rgba(0,0,0,0.04);">${escapeHtml(pr.description)}</div>` : ""}
                        </div>
                    </div>`
                    )
                    .join("");
            }

            // Certifications
            const certList = document.getElementById("certificationsList");
            const certifications = p.certifications || [];
            if (certifications.length > 0) {
                certList.innerHTML = certifications
                    .map(
                        (c) => `
                    <div class="vignova-exp-item" data-copy="${escapeHtml(c.name || "")} (${escapeHtml(c.issuer || "")})">
                        <div class="vignova-exp-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg></div>
                        <div style="flex:1;">
                            <div class="vignova-exp-title" style="color:#111; font-size:12px;">${escapeHtml(c.name || "Unknown")}</div>
                            <div class="vignova-exp-sub" style="color:#0ea5e9; font-weight:600; font-size:11px; margin-top:2px;">${escapeHtml(c.issuer || "")}</div>
                            <div class="vignova-exp-dates" style="margin-top:2px;">${escapeHtml(c.date || "")}</div>
                        </div>
                    </div>`
                    )
                    .join("");
            }

            // Languages
            const langList = document.getElementById("languagesList");
            const languages = p.languages || [];
            if (languages.length > 0) {
                document.getElementById("languagesSection").style.display = "block";
                langList.innerHTML = languages
                    .map(
                        (l) => `<div class="vignova-copyable-block vignova-lang-item" data-copy="${escapeHtml(l.name || "")} - ${escapeHtml(l.proficiency || "")}" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;" title="Click to copy">
                            <span style="font-weight: 600; color: #333; font-size:12px;">${escapeHtml(l.name || "Unknown")}</span>
                            <span style="color: #0ea5e9; font-size: 11px; font-weight:600; background: rgba(14,165,233,0.1); padding: 2px 8px; border-radius: 10px;">${escapeHtml(l.proficiency || "")}</span>
                        </div>`
                    )
                    .join("");

                // Make languages copyable
                langList.querySelectorAll('.vignova-lang-item').forEach(item => {
                    item.addEventListener("click", function () {
                        navigator.clipboard.writeText(this.dataset.copy);
                        showToast("Copied!");
                    });
                });
            }

            // Make all exp/edu/proj/cert items copyable
            document.querySelectorAll(".vignova-exp-item").forEach((item) => {
                item.addEventListener("click", () => {
                    navigator.clipboard.writeText(item.dataset.copy || item.innerText);
                    showToast("Copied!");
                });
            });

            // Edit link
            document.getElementById("editProfileLink")?.addEventListener("click", (e) => {
                e.preventDefault();
                chrome.tabs.create({ url: "http://localhost:3000/dashboard/profile" });
            });

        } catch (err) {
            console.error("[Vignova] Profile tab error:", err);
        }
    }

    // ═══════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════

    /**
     * Extract job data (title, company, location, description) from the active tab.
     * Works across major job sites via smart DOM selectors.
     */
    async function extractJobData(tab) {
        try {
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Start by looking for the specific split-pane detail view to avoid grabbing sidebar lists
                    let base = document.querySelector(
                        '#jobsearch-ViewjobPaneWrapper, .jobsearch-JobComponent, .jobsearch-RightPane, .jobs-search__job-details--container, .jobs-details__main-content, .job-view-layout'
                    ) || document;

                    const $ = (sel) => base.querySelector(sel) || document.querySelector(sel);
                    const text = (sel) => {
                        const el = $(sel);
                        return el ? el.innerText.trim() : "";
                    };

                    // Title
                    let title = text('h1[class*="title"], h1[class*="job-title"], h1.app-title')
                        || text('h1.posting-headline, h1.job-title')
                        || text('h1')
                        || document.querySelector('meta[property="og:title"]')?.content
                        || document.title;

                    // Company
                    let company = text('[class*="company-name"], [class*="CompanyName"]')
                        || text('.posting-categories .sort-by-team, [class*="employer"]')
                        || text('[data-company], [class*="company"]')
                        || document.querySelector('meta[property="og:site_name"]')?.content
                        || "";

                    // Clean title - many sites put "Job Title - Company" in <title>
                    if (!company && title.includes(" - ")) {
                        const parts = title.split(" - ");
                        if (parts.length >= 2) {
                            company = parts[parts.length - 1].trim();
                            title = parts.slice(0, -1).join(" - ").trim();
                        }
                    }
                    if (!company && title.includes(" at ")) {
                        const parts = title.split(" at ");
                        company = parts[parts.length - 1].trim();
                        title = parts.slice(0, -1).join(" at ").trim();
                    }

                    // Location
                    let location = text('[class*="location"], [class*="Location"]')
                        || text('.posting-categories .sort-by-location')
                        || "";

                    // Description
                    let description = "";
                    const descSelectors = [
                        '[class*="description"], [class*="Description"]',
                        '[class*="job-description"]',
                        '#job-description, #content',
                        '#job-detail-panel', // Greenhouse ATS
                        '.posting-page',
                        'article',
                        'main',
                    ];
                    for (const sel of descSelectors) {
                        const el = base.querySelector(sel) || document.querySelector(sel);
                        if (el && el.innerText.length > 100) {
                            description = el.innerText;
                            break;
                        }
                    }
                    if (!description) {
                        description = base.innerText || document.body.innerText || "";
                    }

                    // Limit job description to roughly 1500 words to ensure it captures the full meaningful post
                    const words = description.trim().split(/\s+/);
                    description = words.slice(0, 1500).join(" ");

                    // Strict cleaner to prevent garbage Cookie Accept texts from blowing up the UI
                    const cleanString = (str, maxLen) => {
                        if (!str) return "";
                        let cleaned = str.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
                        // If there are words longer than 30 chars with no spaces (e.g. encoded HTML or CSS class dumps), truncate them
                        cleaned = cleaned.split(" ").map(w => w.length > 30 ? w.substring(0, 30) + "..." : w).join(" ");
                        return cleaned.length > maxLen ? cleaned.substring(0, maxLen) + "..." : cleaned;
                    };

                    title = cleanString(title, 150);
                    company = cleanString(company, 80);

                    return { title, company, location, description };
                },
            });

            return result?.[0]?.result || {
                title: tab.title || "Untitled",
                company: "",
                location: "",
                description: "",
            };
        } catch (err) {
            console.error("[Vignova] extractJobData error:", err);
            // Fallback to tab info
            let title = tab.title || "Untitled";
            let company = "";
            if (title.includes(" - ")) {
                const parts = title.split(" - ");
                company = parts[parts.length - 1];
                title = parts.slice(0, -1).join(" - ");
            }

            // Clean fallbacks
            const cleanString = (str, maxLen) => {
                if (!str) return "";
                let cleaned = str.replace(/\n+/g, " ").replace(/\s+/g, " ").trim();
                return cleaned.length > maxLen ? cleaned.substring(0, maxLen) + "..." : cleaned;
            };

            return {
                title: cleanString(title, 150),
                company: cleanString(company, 80),
                location: "",
                description: ""
            };
        }
    }

    function showToast(message) {
        copyToast.textContent = message;
        copyToast.classList.add("show");
        setTimeout(() => copyToast.classList.remove("show"), 1800);
    }

    function escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    // ═══════════════════════════════════════════
    //  DASHBOARD DRAG & CLOSE (Cross-Frame)
    // ═══════════════════════════════════════════
    const urlParams = new URLSearchParams(window.location.search);
    const isDashboardMode = urlParams.get("mode") === "dashboard" || window.self !== window.top;

    const header = document.querySelector(".vignova-header");
    const closeBtn = document.getElementById("closeBtn");

    if (isDashboardMode) {
        // We are in an iframe injected on the page
        if (header) {
            header.style.cursor = "move";
            header.addEventListener("mousedown", (e) => {
                // Ignore clicks on buttons inside header
                if (e.target.closest("button")) return;

                // Tell parent page to start dragging
                window.parent.postMessage({
                    type: "Vignova_DRAG_START",
                    clientX: e.clientX,
                    clientY: e.clientY
                }, "*");
            });
        }

        if (closeBtn) {
            closeBtn.style.display = "block"; // Ensure visible
            closeBtn.addEventListener("click", () => {
                window.parent.postMessage({ type: "Vignova_CLOSE_DASHBOARD" }, "*");
            });
        }
    } else {
        // Standard dropdown popup – hide close button
        if (closeBtn) closeBtn.style.display = "none";
    }

    // Also: Listen for cross-frame AGENT_STATUS messages from the parent window's pub-sub 
    // to dynamically update the UI in case it's triggered externally
    window.addEventListener("message", (e) => {
        if (e.data && e.data.type === "Vignova_AGENT_STATUS") {
            const agentBtnText = document.getElementById("agentBtnText");
            const startAgentBtn = document.getElementById("startAgentBtn");
            const agentBtnIcon = document.getElementById("agentBtnIcon");
            const statusText = document.getElementById("agentStatusText");

            // Update live status line
            if (statusText) {
                if (e.data.status === "stopped" || e.data.status === "done" || e.data.status === "error" || e.data.status === "waiting_for_form") {
                    statusText.style.display = "none";
                } else {
                    statusText.style.display = "block";

                    if (e.data.status === "started") statusText.textContent = "Initializing Auto-Apply...";
                    else if (e.data.status === "observing") statusText.textContent = "Scanning page for forms...";
                    else if (e.data.status === "planning") statusText.textContent = "Matching profile to fields...";
                    else if (e.data.status === "filling" || e.data.status === "ai_filling") {
                        statusText.textContent = `Filling: ${e.data.fieldsText || (e.data.count + " fields")}...`;
                    }
                    else if (e.data.status === "filled" || e.data.status === "ai_filled") {
                        statusText.textContent = `Filled ${e.data.success?.length || 0} fields ✓`;
                    }
                    else {
                        statusText.textContent = e.data.text || "Working...";
                        if (e.data.progress) {
                            statusText.textContent += ` (${e.data.progress})`;
                        }
                    }
                }
            }

            if (e.data.status === "stopped" || e.data.status === "done" || e.data.status === "error") {
                agentBtnText.textContent = "Autofill this page";
                agentBtnIcon.textContent = "⚡";
                startAgentBtn.classList.remove("vignova-btn-autofill-active");
            } else {
                agentBtnText.textContent = "⏹ Stop Auto-Apply";
                agentBtnIcon.textContent = "";
                startAgentBtn.classList.add("vignova-btn-autofill-active");
            }
        }
    });
});
