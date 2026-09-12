/**
 * Vignova Extension — Background Service Worker
 * ALL API calls are routed through here to avoid local network access prompts.
 * Content scripts send messages here; we make the actual fetch and return results.
 */

const Vignova_API_BASE = "https://app.vignova.io";

importScripts("auth.js", "dashboard.js");

async function warmExtensionCache(token, epoch = authEpoch) {
    const profileVersion = profileCacheVersion;
    if (epoch !== authEpoch) return;
    const headers = { "Authorization": `Bearer ${token}` };

    try {
        const profileResponse = await fetch(`${Vignova_API_BASE}/api/extension/agent-profile`, { headers });
        const profileData = await profileResponse.json();
        if (profileResponse.ok && profileData.profile) {
            await writeUserCache({ vignova_agent_profile: profileData.profile }, token, epoch, profileVersion);
        }
    } catch (err) {
        // Best effort only
    }

    if (epoch !== authEpoch) return;
    try {
        const jobsResponse = await fetch(`${Vignova_API_BASE}/api/extension/recent-jobs`, { headers });
        const jobsData = await jobsResponse.json();
        if (jobsResponse.ok && Array.isArray(jobsData.jobs)) {
            await writeUserCache({ vignova_recent_jobs: jobsData.jobs }, token, epoch);
        }
    } catch (err) {
        // Best effort only
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

// Discover eligible application frames through content scripts, without requesting more host permissions.
const applicationProbes = new Map();
async function findApplicationFrame(tabId) {
    const requestId = crypto.randomUUID();
    const frames = new Set();
    applicationProbes.set(requestId, { tabId, frames });
    try {
        await chrome.tabs.sendMessage(tabId, { type: 'PROBE_APPLICATION_FORMS', requestId });
        await new Promise(resolve => setTimeout(resolve, 400));
        return frames.has(0) ? 0 : [...frames].sort((a, b) => a - b)[0];
    } finally { applicationProbes.delete(requestId); }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const needsAuth = (message.type?.startsWith("API_") && message.type !== "API_LOGIN") ||
        ["GET_AUTH_STATUS", "START_AGENT_ON_TAB", "CHECK_AUTOFILL_ACCESS", "CHECK_PAID_ACCESS", "SYNC_AUTH"].includes(message.type);
    if (!needsAuth) return routeMessage(message, sender, sendResponse, authEpoch);
    (async () => {
        try {
            const epoch = await syncWebSession({ refreshStatus: message.type !== "API_GET_STATUS",
                statusMaxAge: ["CHECK_AUTOFILL_ACCESS", "CHECK_PAID_ACCESS"].includes(message.type) ? 0 : 60000 });
            if (epoch !== authEpoch) throw new Error("Your Vignova account changed. Please try again.");
            const reply = data => sendResponse(epoch === authEpoch ? data : {
                success: false, authenticated: false, isLoggedIn: false, authChanged: true,
                error: "Your Vignova account changed. Please try again.",
            });
            if (message.type === "SYNC_AUTH") {
                const stored = await chrome.storage.local.get("vignova_token");
                reply({ isLoggedIn: !!stored.vignova_token });
                return;
            }
            routeMessage(message, sender, reply, epoch);
        } catch (error) {
            sendResponse({ success: false, authenticated: false, isLoggedIn: false, error: error.message });
        }
    })();
    return true;
});

function routeMessage(message, sender, sendResponse, requestEpoch) {
    if (message.type === 'APPLICATION_FORM_FOUND') {
        const probe = applicationProbes.get(message.requestId);
        if (probe && sender.tab?.id === probe.tabId && Number.isInteger(sender.frameId)) probe.frames.add(sender.frameId);
        sendResponse({ success: true });
        return;
    }
    if (routeDashboardMessage(message, sender, sendResponse, requestEpoch)) return true;

    // Website-session lookup, read-only (login view uses this for "Continue as…")
    if (message.type === "WEB_SESSION_PROBE") {
        probeWebSession().then(sendResponse);
        return true;
    }

    // Sign the extension in from the active website session
    if (message.type === "WEB_SESSION_ADOPT") {
        (async () => {
            await syncWebSession({ adopt: true });
            const stored = await chrome.storage.local.get(["vignova_token", "vignova_user"]);
            sendResponse({ success: !!stored.vignova_token, user: stored.vignova_user });
        })().catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }

    // Sign in with a token the popup obtained itself (OAuth tab-injection fallback)
    if (message.type === "ADOPT_TOKEN") {
        (async () => {
            const success = await signInWithToken(message.data.token, message.data.user, "website", requestEpoch);
            sendResponse({ success });
        })().catch(error => sendResponse({ success: false, error: error.message }));
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

    // The match panel's "View full analysis" and settings links. Content
    // scripts cannot open tabs themselves, and the URL is checked here rather
    // than trusted: a page-injected script is the one asking.
    if (message.type === "OPEN_TAB") {
        const url = String(message.url || "");
        if (/^https:\/\/app\.vignova\.io\//.test(url)) {
            chrome.tabs.create({ url });
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: "Refused to open that URL." });
        }
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
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
                            void writeUserCache({ vignova_user: stored.vignova_user }, result.vignova_token, requestEpoch);
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
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
                            void writeUserCache({ vignova_user: stored.vignova_user }, result.vignova_token, requestEpoch);
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
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
        ++profileCacheVersion;
        chrome.storage.local.get(["vignova_token"], async (result) => {
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
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
                    await warmExtensionCache(result.vignova_token, requestEpoch);
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
                    const success = await signInWithToken(data.token, data.user, "password", requestEpoch);
                    sendResponse({ success, user: success ? data.user : null });
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/status`, {
                    headers: { "Authorization": `Bearer ${result.vignova_token}` },
                });

                if (response.status === 401) {
                    if (requestEpoch === authEpoch) await signOut();
                    sendResponse({ authenticated: false, expired: true });
                    return;
                }

                if (response.status === 403) {
                    sendResponse({ authenticated: true, accessDenied: true });
                    return;
                }

                if (!response.ok) throw new Error("Account status unavailable");
                const data = await response.json();
                if (!await writeUserCache({ vignova_user: statusUser(data) }, result.vignova_token, requestEpoch)) {
                    sendResponse({ authenticated: false, authChanged: true });
                    return;
                }
                lastStatusCheck = Date.now();
                const cached = await chrome.storage.local.get(["vignova_agent_profile", "vignova_recent_jobs"]);

                if (!cached.vignova_agent_profile || !Array.isArray(cached.vignova_recent_jobs)) {
                    await warmExtensionCache(result.vignova_token, requestEpoch);
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
        const profileVersion = profileCacheVersion;
        chrome.storage.local.get(["vignova_token"], async (result) => {
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
            try {
                const response = await fetch(`${Vignova_API_BASE}/api/extension/agent-profile`, {
                    headers: { "Authorization": `Bearer ${result.vignova_token}` },
                });
                const data = await response.json();
                if (response.ok && data.profile) {
                    if (!await writeUserCache({ vignova_agent_profile: data.profile }, result.vignova_token, requestEpoch, profileVersion)) {
                        sendResponse({ success: false, error: "Your profile changed. Please try again." }); return;
                    }
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
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
                    if (Number.isFinite(data.credits_remaining)) {
                        chrome.storage.local.get(["vignova_user"], (stored) => {
                            if (stored.vignova_user) {
                                stored.vignova_user.credits_remaining = data.credits_remaining;
                                void writeUserCache({ vignova_user: stored.vignova_user }, result.vignova_token, requestEpoch);
                            }
                        });
                    }
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
            try {
                const { documentId, docType } = message.data;
                const response = await fetch(`${Vignova_API_BASE}/api/extension/documents/download?id=${encodeURIComponent(documentId)}&type=${encodeURIComponent(docType)}`, {
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

    // Local autofill also requires a verified paid account; it may never call the AI routes.
    if (message.type === "CHECK_AUTOFILL_ACCESS" || message.type === "CHECK_PAID_ACCESS") {
        chrome.storage.local.get(["vignova_token", "vignova_user"], stored => {
            const user = stored.vignova_user;
            const allowed = !!stored.vignova_token && ["PRO", "PREMIUM"].includes(user?.plan) &&
                (user?.credits_remaining ?? 0) > 0;
            sendResponse({ success: allowed, upgradeRequired: !allowed, error: allowed ? null : "This feature requires a paid plan with available credits." });
        });
        return true;
    }

    if (["START_AGENT_ON_TAB", "STOP_AGENT_ON_TAB"].includes(message.type)) {
        (async () => {
            const tab = sender.tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
            if (!tab?.id) throw new Error("Open an application page first.");
            let response;
            if (message.type === 'START_AGENT_ON_TAB') {
                const { vignova_user: user, vignova_token: token } = await chrome.storage.local.get(['vignova_user', 'vignova_token']);
                if (!token || !['PRO', 'PREMIUM'].includes(user?.plan) || !(user?.credits_remaining > 0)) {
                    sendResponse({ success: false, upgradeRequired: true, error: 'Autofill requires a paid plan with available credits.' });
                    return;
                }
                const frameId = await findApplicationFrame(tab.id);
                if (requestEpoch !== authEpoch) throw new Error('Your account changed. Try again.');
                if (frameId === undefined) {
                    sendResponse({ success: false, error: 'Open an application form first, then use Autofill.' });
                    return;
                }
                response = await chrome.tabs.sendMessage(tab.id, { type: 'START_AGENT' }, { frameId });
            } else response = await chrome.tabs.sendMessage(tab.id, { type: 'STOP_AGENT' });
            sendResponse(response || { success: false, error: "No application form was found on this page." });
        })().catch(() => sendResponse({ success: false, error: "Could not reach the application form. Open it and try again." }));
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
            if (requestEpoch !== authEpoch || !result.vignova_token) {
                sendResponse({ success: false, authenticated: false, error: "Please sign in to Vignova." });
                return;
            }
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
                    if (Number.isFinite(data.credits_remaining)) {
                        chrome.storage.local.get(["vignova_user"], (stored) => {
                            if (stored.vignova_user) {
                                stored.vignova_user.credits_remaining = data.credits_remaining;
                                void writeUserCache({ vignova_user: stored.vignova_user }, result.vignova_token, requestEpoch);
                            }
                        });
                    }
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

    // ─── Forward iframe mount request to top frame ───
    if (message.type === "SHOULD_MOUNT_DASHBOARD") {
        if (sender.tab && sender.tab.id) {
            // Tell the top-level tab to evaluate mounting the dashboard in whatever state it was saved in
            chrome.tabs.sendMessage(sender.tab.id, { type: "EVALUATE_MOUNT_DASHBOARD" }).catch(() => { });
        }
        sendResponse({ success: true });
        return true;
    }

}

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
                "content/jobExtractor.js",
                "agent/observer.js",
                "agent/atsProfiles.js",
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
