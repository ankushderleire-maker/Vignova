/**
 * Vignova Extension — Background Service Worker
 * ALL API calls are routed through here to avoid local network access prompts.
 * Content scripts send messages here; we make the actual fetch and return results.
 */

const Vignova_API_BASE = "https://app.vignova.io";

async function warmExtensionCache(token) {
    const headers = { "Authorization": `Bearer ${token}` };

    try {
        const profileResponse = await fetch(`${Vignova_API_BASE}/api/extension/agent-profile`, { headers });
        const profileData = await profileResponse.json();
        if (profileResponse.ok && profileData.profile) {
            await chrome.storage.local.set({ vignova_agent_profile: profileData.profile });
        }
    } catch (err) {
        // Best effort only
    }

    try {
        const jobsResponse = await fetch(`${Vignova_API_BASE}/api/extension/recent-jobs`, { headers });
        const jobsData = await jobsResponse.json();
        if (jobsResponse.ok && Array.isArray(jobsData.jobs)) {
            await chrome.storage.local.set({ vignova_recent_jobs: jobsData.jobs });
        }
    } catch (err) {
        // Best effort only
    }

    try {
        const configResponse = await fetch(`${Vignova_API_BASE}/api/extension/config`, { headers });
        const configData = await configResponse.json();
        if (configResponse.ok && configData.config) {
            await chrome.storage.local.set({ vignova_config: configData.config });
        }
    } catch (err) {
        // Best effort only
    }
}

// ═══════════════════════════════════════════
//  AUTH CORE — single source of truth
//  Every sign-in/sign-out path goes through these helpers so cached data
//  from a previous account can never leak into the next one.
// ═══════════════════════════════════════════

const USER_DATA_KEYS = [
    "vignova_token",
    "vignova_user",
    "vignova_agent_profile",
    "vignova_recent_jobs",
    "vignova_config",
];

function broadcastAuthChange() {
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach((tab) => {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type: "AUTH_STATE_CHANGED" }).catch(() => { });
            }
        });
    });
}

async function signInWithToken(token, user) {
    // Wipe the previous account's data first so nothing stale survives a switch
    await chrome.storage.local.remove([...USER_DATA_KEYS, "vignova_signed_out"]);
    await chrome.storage.local.set({ vignova_token: token, vignova_user: user });
    await warmExtensionCache(token);
    broadcastAuthChange();
}

async function signOut() {
    await chrome.storage.local.remove(USER_DATA_KEYS);
    // Remember the explicit sign-out so we don't silently log back in
    // from the website session on the next popup open
    await chrome.storage.local.set({ vignova_signed_out: true });
    broadcastAuthChange();
}

/**
 * Look up the website session (no side effects). This must run in the
 * service worker: fetches from the (possibly iframed) popup never carry the
 * SameSite=Lax NextAuth cookie, so the API would always answer 401 there.
 * The cookie is checked first so no request is fired at all when the user
 * is logged out of the website (no 401 console noise).
 */
async function probeWebSession() {
    const cookieNames = ["__Secure-next-auth.session-token", "next-auth.session-token"];
    let hasSession = false;
    for (const name of cookieNames) {
        const cookie = await chrome.cookies.get({ url: Vignova_API_BASE, name }).catch(() => null);
        if (cookie) { hasSession = true; break; }
    }
    if (!hasSession) return { loggedIn: false };

    try {
        const res = await fetch(`${Vignova_API_BASE}/api/extension/session-token`, { credentials: "include" });
        const data = await res.json();
        if (res.ok && data.token) {
            return { loggedIn: true, token: data.token, user: data.user };
        }
        return { loggedIn: false };
    } catch (err) {
        return { loggedIn: false, error: "Cannot connect to Vignova server." };
    }
}

// ─── Message Router ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    // Website-session lookup, read-only (login view uses this for "Continue as…")
    if (message.type === "WEB_SESSION_PROBE") {
        probeWebSession().then(sendResponse);
        return true;
    }

    // Sign the extension in from the active website session
    if (message.type === "WEB_SESSION_ADOPT") {
        (async () => {
            const session = await probeWebSession();
            if (session.token) {
                await signInWithToken(session.token, session.user);
                sendResponse({ success: true, user: session.user });
            } else {
                sendResponse({ success: false, ...session });
            }
        })();
        return true;
    }

    // Sign in with a token the popup obtained itself (OAuth tab-injection fallback)
    if (message.type === "ADOPT_TOKEN") {
        (async () => {
            await signInWithToken(message.data.token, message.data.user);
            sendResponse({ success: true });
        })();
        return true;
    }

    // Explicit sign-out (from popup)
    if (message.type === "SIGN_OUT") {
        signOut().then(() => sendResponse({ success: true }));
        return true;
    }

    // Auth status check (from content scripts)
    if (message.type === "GET_AUTH_STATUS") {
        chrome.storage.local.get(["vignova_token", "vignova_user"], (result) => {
            sendResponse({
                isLoggedIn: !!result.vignova_token,
                user: result.vignova_user || null,
            });
        });
        return true;
    }

    // Token updated notification (from popup)
    if (message.type === "TOKEN_UPDATED") {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach((tab) => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, { type: "AUTH_STATE_CHANGED" }).catch(() => { });
                }
            });
        });
        sendResponse({ success: true });
        return true;
    }

    // ─── API Proxy: Generate Resume ───
    if (message.type === "API_GENERATE_RESUME") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/generate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${result.vignova_token}`,
                    },
                    body: JSON.stringify(message.data),
                });

                const data = await response.json();

                if (response.ok) {
                    // Update cached credits
                    chrome.storage.local.get(["vignova_user"], (stored) => {
                        if (stored.vignova_user) {
                            stored.vignova_user.credits_remaining = data.credits_remaining;
                            chrome.storage.local.set({ vignova_user: stored.vignova_user });
                        }
                    });
                    sendResponse({ success: true, ...data });
                } else {
                    sendResponse({ success: false, error: data.error || "Generation failed" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to Vignova server." });
            }
        });
        return true; // Keep channel open for async
    }

    // ─── API Proxy: Generate All (Resume + Cover Letter + Email) ───
    if (message.type === "API_GENERATE_ALL") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/generate-all`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${result.vignova_token}`,
                    },
                    body: JSON.stringify(message.data),
                });

                const data = await response.json();

                if (response.ok) {
                    // Update cached credits
                    chrome.storage.local.get(["vignova_user"], (stored) => {
                        if (stored.vignova_user) {
                            stored.vignova_user.credits_remaining = data.credits_remaining;
                            chrome.storage.local.set({ vignova_user: stored.vignova_user });
                        }
                    });
                    sendResponse({ success: true, ...data });
                } else {
                    sendResponse({ success: false, error: data.error || "Generation failed" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to Vignova server." });
            }
        });
        return true; // Keep channel open for async
    }

    // ─── API Proxy: Save Job ───
    if (message.type === "API_SAVE_JOB") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/save-job`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${result.vignova_token}`,
                    },
                    body: JSON.stringify(message.data),
                });

                const data = await response.json();

                if (response.ok) {
                    sendResponse({ success: true, ...data });
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to save job" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to Vignova server." });
            }
        });
        return true;
    }

    // ─── API Proxy: List Profiles ───
    if (message.type === "API_GET_PROFILES") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/profiles`, {
                    headers: { "Authorization": `Bearer ${result.vignova_token}` },
                });

                const data = await response.json();

                if (response.ok) {
                    sendResponse({ success: true, profiles: data.profiles || [] });
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to load profiles" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to Vignova server." });
            }
        });
        return true;
    }

    // ─── API Proxy: Set Profile ───
    if (message.type === "API_SET_PROFILE") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/set-profile`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${result.vignova_token}`,
                    },
                    body: JSON.stringify(message.data),
                });

                const data = await response.json();

                if (response.ok) {
                    sendResponse({ success: true, ...data });
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to set profile" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to Vignova server." });
            }
        });
        return true;
    }

    // ─── API Proxy: Login ───
    if (message.type === "API_LOGIN") {
        (async () => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/auth`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(message.data),
                });

                const data = await response.json();

                if (response.ok && data.token) {
                    await signInWithToken(data.token, data.user);
                    sendResponse({ success: true, user: data.user });
                } else {
                    sendResponse({
                        success: false,
                        error: data.error || "Login failed",
                        upgrade_required: data.upgrade_required || false,
                    });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Not able to connect to server. Please try again later." });
            }
        })();
        return true;
    }

    // ─── API Proxy: Get Status ───
    if (message.type === "API_GET_STATUS") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            if (!result.vignova_token) {
                sendResponse({ authenticated: false });
                return;
            }
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/status`, {
                    headers: { "Authorization": `Bearer ${result.vignova_token}` },
                });

                if (response.status === 401) {
                    await chrome.storage.local.remove(USER_DATA_KEYS);
                    sendResponse({ authenticated: false, expired: true });
                    return;
                }

                if (response.status === 403) {
                    sendResponse({ authenticated: true, accessDenied: true });
                    return;
                }

                const data = await response.json();
                const cached = await chrome.storage.local.get(["vignova_agent_profile", "vignova_recent_jobs"]);

                if (!cached.vignova_agent_profile || !Array.isArray(cached.vignova_recent_jobs)) {
                    await warmExtensionCache(result.vignova_token);
                }

                const refreshedCache = await chrome.storage.local.get(["vignova_agent_profile", "vignova_recent_jobs"]);
                sendResponse({
                    authenticated: true,
                    ...data,
                    cached_profile: refreshedCache.vignova_agent_profile || null,
                    cached_recent_jobs: refreshedCache.vignova_recent_jobs || [],
                });
            } catch (err) {
                sendResponse({ authenticated: false, error: "Cannot connect to server" });
            }
        });
        return true;
    }

    // ─── API Proxy: Get Profile ───
    if (message.type === "API_AGENT_GET_PROFILE") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            if (!result.vignova_token) {
                sendResponse({ success: false, error: "Not authenticated" });
                return;
            }
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/agent-profile`, {
                    headers: { "Authorization": `Bearer ${result.vignova_token}` },
                });
                const data = await response.json();
                if (response.ok && data.profile) {
                    await chrome.storage.local.set({ vignova_agent_profile: data.profile });
                    sendResponse({ success: true, profile: data.profile, profileName: data.profileName });
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to fetch profile" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to server" });
            }
        });
        return true;
    }

    // ─── API Proxy: Get Match Score ───
    if (message.type === "API_GET_SCORE") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/score`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${result.vignova_token}`,
                    },
                    body: JSON.stringify(message.data),
                });

                const data = await response.json();

                if (response.ok) {
                    sendResponse({ success: true, ...data });
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to calculate score" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to server" });
            }
        });
        return true;
    }

    // ─── API Proxy: Agent Plan (Single Action) ───
    if (message.type === "API_AGENT_PLAN") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            if (!result.vignova_token) {
                sendResponse({ success: false, error: "Not authenticated" });
                return;
            }
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/plan`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${result.vignova_token}` },
                    body: JSON.stringify(message.data),
                });
                const data = await response.json();
                sendResponse(data);
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to backend. Is it running?" });
            }
        });
        return true;
    }

    // ─── API Proxy: Agent Plan Batch (Multiple Actions) ───
    if (message.type === "API_AGENT_PLAN_BATCH") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            if (!result.vignova_token) {
                sendResponse({ success: false, error: "Not authenticated" });
                return;
            }
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/plan-batch`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${result.vignova_token}` },
                    body: JSON.stringify(message.data),
                });
                const data = await response.json();
                sendResponse(data);
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to backend." });
            }
        });
        return true;
    }

    // ─── API Proxy: Get Recent Jobs ───
    if (message.type === "API_GET_RECENT_JOBS") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            if (!result.vignova_token) {
                sendResponse({ success: false, error: "Not authenticated" });
                return;
            }
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/recent-jobs`, {
                    headers: { "Authorization": `Bearer ${result.vignova_token}` },
                });
                const data = await response.json();
                if (response.ok) {
                    sendResponse(data);
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to fetch jobs" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to server" });
            }
        });
        return true;
    }

    // ─── API Proxy: Get Documents ───
    if (message.type === "API_GET_DOCUMENTS") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            if (!result.vignova_token) {
                sendResponse({ success: false, error: "Not authenticated" });
                return;
            }
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/documents`, {
                    headers: { "Authorization": `Bearer ${result.vignova_token}` },
                });
                const data = await response.json();
                if (response.ok) {
                    sendResponse(data);
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to fetch documents" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to server" });
            }
        });
        return true;
    }

    // ─── API Proxy: Download Document PDF ───
    if (message.type === "API_DOWNLOAD_DOCUMENT") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            if (!result.vignova_token) {
                sendResponse({ success: false, error: "Not authenticated" });
                return;
            }
            try {
                const { documentId, docType } = message.data;
                const response = await fetch(`${Vignova_API_BASE}/api/extension/documents/download?id=${documentId}&type=${docType}`, {
                    headers: { "Authorization": `Bearer ${result.vignova_token}` },
                });
                const data = await response.json();
                if (response.ok) {
                    sendResponse(data);
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to download document" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to server" });
            }
        });
        return true;
    }

    // ─── Agent: Start on Active Tab ───
    if (message.type === "START_AGENT_ON_TAB") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "START_AGENT" }, (response) => {
                    sendResponse(response || { success: false, error: "Could not start agent" });
                });
            } else {
                sendResponse({ success: false, error: "No active tab" });
            }
        });
        return true;
    }

    // ─── Agent: Stop on Active Tab ───
    if (message.type === "STOP_AGENT_ON_TAB") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, { type: "STOP_AGENT" }, (response) => {
                    sendResponse(response || { success: false });
                });
            }
        });
        return true;
    }

    // ─── Agent UI Relay (Cross-Frame Pub-Sub) ───
    if (message.type === "AGENT_UPDATE_STATUS" || message.type === "AGENT_CONTROL_COMMAND") {
        if (sender.tab && sender.tab.id) {
            // Broadcast to all frames in the tab
            chrome.tabs.sendMessage(sender.tab.id, message).catch(() => { });
        }
        sendResponse({ success: true });
        return true;
    }

    // ─── API Proxy: Generate Cover Letter ───
    if (message.type === "API_GENERATE_COVER_LETTER") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/cover-letter`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${result.vignova_token}`,
                    },
                    body: JSON.stringify(message.data),
                });

                const data = await response.json();

                if (response.ok) {
                    sendResponse({ success: true, ...data });
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to generate cover letter" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to server." });
            }
        });
        return true;
    }

    // ─── API Proxy: Interview Prep ───
    if (message.type === "API_INTERVIEW_PREP") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/interview-prep`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${result.vignova_token}`,
                    },
                    body: JSON.stringify(message.data),
                });
                const data = await response.json();
                if (response.ok) {
                    sendResponse({ success: true, questions: data.questions || [] });
                } else {
                    sendResponse({ success: false, error: data.error || "Failed to generate interview questions" });
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to server." });
            }
        });
        return true;
    }

    // ─── Forward iframe mount request to top frame ───
    if (message.type === "SHOULD_MOUNT_DASHBOARD") {
        if (sender.tab && sender.tab.id) {
            // Tell the top-level tab to evaluate mounting the dashboard in whatever state it was saved in
            chrome.tabs.sendMessage(sender.tab.id, { type: "EVALUATE_MOUNT_DASHBOARD" }).catch(() => { });
        }
        sendResponse({ success: true });
        return true;
    }

    // ─── LinkedIn Scraper Trigger (Multi-Page Orchestration) ───
    if (message.action === "SCRAPE_LINKEDIN_PROFILE") {
        const senderTabId = sender.tab ? sender.tab.id : null;
        
        let profileData = null;

        const sendError = (errorMsg) => {
            if (senderTabId) {
                chrome.tabs.sendMessage(senderTabId, {
                    type: "LINKEDIN_SCRAPE_ERROR",
                    error: errorMsg
                }).catch(() => {});
            }
        };

        const sendSuccess = (data) => {
            if (senderTabId) {
                chrome.tabs.sendMessage(senderTabId, {
                    type: "LINKEDIN_PROFILE_DATA",
                    payload: data
                }).catch(() => {});
            }
        };

        // Wait for a tab to finish loading
        const waitForTabLoad = (tabId) => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(listener);
                    reject("Tab load timed out after 30s");
                }, 30000);

                const listener = (tid, changeInfo) => {
                    if (tid === tabId && changeInfo.status === 'complete') {
                        chrome.tabs.onUpdated.removeListener(listener);
                        clearTimeout(timeout);
                        resolve();
                    }
                };
                chrome.tabs.onUpdated.addListener(listener);
            });
        };

        // ── Helpers ──────────────────────────────────────────────────────
        // True when the error is a transient messaging failure that is worth retrying
        const isRetryableError = (msg) => {
            if (!msg) return true;
            const s = String(msg).toLowerCase();
            return s.includes("port closed")
                || s.includes("message port")
                || s.includes("receiving end does not exist")
                || s.includes("could not establish connection")
                || s.includes("no response");
        };

        // Inject the content script and send a message, with retries
        const injectAndScrape = async (tabId, actionMsg, delayMs) => {
            // Wait for initial delay (let page render and LinkedIn JS settle)
            await new Promise(r => setTimeout(r, delayMs));

            // Programmatically inject the scraper script to guarantee a fresh context
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ["content/linkedin_scraper.js"],
                });
            } catch (injectErr) {
                console.warn("[Vignova] Script injection warning:", injectErr.message);
                // Script may already be injected via manifest — continue anyway
            }

            // Give the injected script extra time to fully initialize
            await new Promise(r => setTimeout(r, 2000));

            const MAX_ATTEMPTS = 4;
            let lastError = "";

            for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                try {
                    const response = await new Promise((resolve, reject) => {
                        chrome.tabs.sendMessage(tabId, { action: actionMsg }, (resp) => {
                            const runtimeErr = chrome.runtime.lastError;
                            if (runtimeErr) {
                                reject(runtimeErr.message);
                            } else if (!resp || !resp.success) {
                                reject(resp?.error || "No response from content script");
                            } else {
                                resolve(resp.data);
                            }
                        });
                    });
                    return response; // ✓ success
                } catch (err) {
                    lastError = err;
                    const errStr = String(err);
                    console.log(`[Vignova] ${actionMsg} attempt ${attempt}/${MAX_ATTEMPTS}: ${errStr}`);

                    if (attempt >= MAX_ATTEMPTS) break;

                    // For port-closed errors, re-inject and wait longer before retry
                    if (isRetryableError(errStr)) {
                        try {
                            await chrome.scripting.executeScript({
                                target: { tabId: tabId },
                                files: ["content/linkedin_scraper.js"],
                            });
                        } catch (_) { /* script may already be present */ }
                        // Exponential-ish back-off: 2s, 3s, 4s
                        await new Promise(r => setTimeout(r, 1000 + attempt * 1000));
                    } else {
                        // Non-retryable error — fail fast
                        break;
                    }
                }
            }
            throw new Error(`${actionMsg} failed after ${MAX_ATTEMPTS} attempts: ${lastError}`);
        };

        // ── Main orchestration ──
        chrome.windows.create({ url: message.url, type: "popup", width: 1000, height: 800, focused: true }, async (newWindow) => {
            if (!newWindow || !newWindow.tabs || !newWindow.tabs[0]) {
                sendError("Failed to open scraping window");
                return;
            }
            const tabId = newWindow.tabs[0].id;
            const windowId = newWindow.id;

            try {
                // 1. Wait for main profile page to load, then scrape
                await waitForTabLoad(tabId);
                profileData = await injectAndScrape(tabId, "EXTRACT_LINKEDIN_PROFILE", 4000);
                console.log("[Vignova] ✓ Profile scraped successfully");

                // 2. Navigate to Skills page and scrape
                let baseUrl = message.url.split('?')[0];
                if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
                const skillsUrl = `${baseUrl}/details/skills/`;
                
                try {
                    await chrome.tabs.update(tabId, { url: skillsUrl });
                    await waitForTabLoad(tabId);
                    const skillsData = await injectAndScrape(tabId, "EXTRACT_LINKEDIN_SKILLS", 3000);
                    if (skillsData && skillsData.length > 0) {
                        profileData.skills = skillsData;
                        console.log("[Vignova] ✓ Skills scraped:", skillsData.length);
                    }
                } catch (skillsErr) {
                    console.warn("[Vignova] Skills scrape failed (non-fatal):", skillsErr);
                }

                // 3. Navigate to Analytics dashboard and scrape
                try {
                    await chrome.tabs.update(tabId, { url: "https://www.linkedin.com/dashboard/" });
                    await waitForTabLoad(tabId);
                    const analyticsData = await injectAndScrape(tabId, "EXTRACT_LINKEDIN_ANALYTICS", 3000);
                    if (analyticsData) {
                        profileData.analytics = analyticsData;
                        console.log("[Vignova] ✓ Analytics scraped");
                    }
                } catch (analyticsErr) {
                    console.warn("[Vignova] Analytics scrape failed (non-fatal):", analyticsErr);
                }

                // Final: Send combined data back to the Vignova dashboard tab
                sendSuccess(profileData);
                console.log("[Vignova] ✓ All data sent to dashboard");
                
            } catch (err) {
                console.error("[Vignova] Scrape orchestration error:", err);
                // If we got partial profile data, send it anyway
                if (profileData && profileData.name) {
                    sendSuccess(profileData);
                } else {
                    sendError(err.toString());
                }
            } finally {
                // Always close the scraping window
                try { chrome.windows.remove(windowId); } catch(e) {}
            }
        });
        
        sendResponse({ success: true, pending: true });
        return true;
    }

});

// Extension install handler
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        console.log("[Vignova] Extension installed successfully");
    }
});

// Broadcast TOGGLE_DASHBOARD to the active tab when the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
    if (!tab.id) return;

    // Prevent injection attempts on restricted browser URLs.
    // Chrome blocks content scripts on its own pages, the Web Store, and
    // built-in viewers — opening the web dashboard is the graceful fallback.
    const restrictedPrefixes = [
        "chrome://", "edge://", "about:", "chrome-extension://",
        "devtools://", "view-source:",
        "https://chromewebstore.google.com",
        "https://chrome.google.com/webstore",
        "https://microsoftedge.microsoft.com/addons",
    ];
    if (!tab.url || restrictedPrefixes.some(prefix => tab.url.startsWith(prefix))) {
        // Fallback: Instead of failing to inject, open the Vignova web dashboard
        chrome.tabs.create({ url: "https://app.vignova.io/dashboard" });
        return;
    }

    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_DASHBOARD" }).catch(() => {
        console.log("[Vignova] Content script missing (likely due to extension reload). Auto-injecting...");
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
                "agent/observer.js",
                "agent/ruleEngine.js",
                "agent/atsDetector.js",
                "agent/planner.js",
                "agent/executor.js",
                "agent/agentLoop.js",
                "content/autoapply.js"
            ]
        }).then(() => {
            // Small delay to let scripts initialize, then send the toggle command again
            setTimeout(() => {
                chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_DASHBOARD" }).catch(() => { });
            }, 300);
        }).catch(err => {
            // Injection denied (page CSP sandbox, file:// without access, etc.)
            // — never leave the user with a dead button.
            console.warn("[Vignova] Could not inject dashboard, opening web dashboard instead:", err?.message || err);
            chrome.tabs.create({ url: "https://app.vignova.io/dashboard" });
        });
    });
});
