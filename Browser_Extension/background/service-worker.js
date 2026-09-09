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

// ─── Force-update check ────────────────────────────────────────────────
/**
 * Asks the server whether this build is still allowed to run.
 *
 * The Chrome Web Store updates on its own schedule and gives us no way to
 * retire a build, so an extension with a broken API contract can keep calling
 * us for days. The admin sets a minimum version; anything below it stops
 * offering its features and shows an update screen instead.
 *
 * Checked lazily — when the popup opens or a content script starts — rather
 * than on an alarm, so the extension does not need the "alarms" permission
 * just for this. Cached for six hours, and every failure fails open: a server
 * we cannot reach must never lock a working extension.
 */
const UPDATE_CHECK_TTL_MS = 6 * 60 * 60 * 1000;

async function getUpdateState({ force = false } = {}) {
    const version = chrome.runtime.getManifest().version;
    const cached = await chrome.storage.local.get(["vignova_update_state"]);
    const state = cached.vignova_update_state;

    if (
        !force &&
        state &&
        state.version === version &&
        Date.now() - (state.checkedAt || 0) < UPDATE_CHECK_TTL_MS
    ) {
        return state;
    }

    try {
        const res = await fetch(
            `${Vignova_API_BASE}/api/extension/version?v=${encodeURIComponent(version)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const fresh = {
            version,
            blocked: !!data.blocked,
            updateAvailable: !!data.updateAvailable,
            latest: data.latest || null,
            installUrl: data.installUrl || "https://chromewebstore.google.com/search/vignova",
            message: data.message || "",
            checkedAt: Date.now(),
        };
        await chrome.storage.local.set({ vignova_update_state: fresh });
        return fresh;
    } catch (err) {
        // Fail open, and keep any previous answer rather than inventing one.
        return (
            state || {
                version,
                blocked: false,
                updateAvailable: false,
                latest: null,
                installUrl: "https://chromewebstore.google.com/search/vignova",
                message: "",
                checkedAt: 0,
            }
        );
    }
}

/**
 * Turns a non-ok API response into the shape the popup and content scripts
 * expect.
 *
 * Two of these are not really errors and must not be shown as one:
 * `upgradeRequired` means the account needs a paid plan or is out of
 * credits, and `duplicate` means the job already has this generated. Both
 * get their own prompt instead of a red failure message.
 */
function apiFailure(data, fallback) {
    if (data && data.upgradeRequired) {
        return {
            success: false,
            upgradeRequired: true,
            outOfCredits: !!data.outOfCredits,
            plan: data.plan || null,
            feature: data.feature || null,
            message: data.message || data.error || fallback,
            error: data.error || fallback,
        };
    }
    if (data && data.duplicate) {
        return { success: false, duplicate: true, existing: data.existing, message: data.message };
    }
    return { success: false, error: (data && data.error) || fallback };
}

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
    if (message.type === "GET_UPDATE_STATE") {
        getUpdateState({ force: !!message.force }).then(sendResponse);
        return true;
    }

    // The injected bar's login button sends this. There was no listener, so
    // pressing it did nothing; MV3 has no API to open the toolbar popup, and
    // the panel is in-page anyway, so this toggles it the way the icon does.
    if (message.type === "OPEN_POPUP") {
        const tabId = sender?.tab?.id;
        if (tabId) {
            chrome.tabs.sendMessage(tabId, { type: "TOGGLE_DASHBOARD" }).catch(() => {
                chrome.tabs.create({ url: "https://app.vignova.io/dashboard" });
            });
        } else {
            chrome.tabs.create({ url: "https://app.vignova.io/dashboard" });
        }
        sendResponse({ success: true });
        return true;
    }

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
                    sendResponse(apiFailure(data, "Generation failed"));
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
                    sendResponse(apiFailure(data, "Generation failed"));
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
                    sendResponse(apiFailure(data, "Failed to save job"));
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to Vignova server." });
            }
        });
        return true;
    }

    // ─── API Proxy: Outreach (recruiter message / application email) ───
    // The dashboard route holds the master profile and the internal key; the
    // extension only says which job it is looking at.
    if (message.type === "API_OUTREACH") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/outreach`, {
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
                    sendResponse(apiFailure(data, "Could not write that."));
                }
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to Vignova server." });
            }
        });
        return true;
    }

    // ─── API Proxy: Set application status ───
    if (message.type === "API_SET_STATUS") {
        chrome.storage.local.get(["vignova_token"], async (result) => {
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/job-status`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${result.vignova_token}`,
                    },
                    body: JSON.stringify(message.data),
                });

                const data = await response.json();
                sendResponse(response.ok
                    ? { success: true, ...data }
                    : apiFailure(data, "Could not set status."));
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
                    sendResponse(apiFailure(data, "Failed to load profiles"));
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
                    sendResponse(apiFailure(data, "Failed to set profile"));
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
                    sendResponse(apiFailure(data, "Failed to fetch profile"));
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
                    sendResponse(apiFailure(data, "Failed to calculate score"));
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
                    sendResponse(apiFailure(data, "Failed to fetch jobs"));
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
                    sendResponse(apiFailure(data, "Failed to fetch documents"));
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
                    sendResponse(apiFailure(data, "Failed to download document"));
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
                    sendResponse(apiFailure(data, "Failed to generate cover letter"));
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
                    sendResponse(apiFailure(data, "Failed to generate interview questions"));
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
