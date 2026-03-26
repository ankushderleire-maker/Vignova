/**
 * Vignova Extension — Background Service Worker
 * ALL API calls are routed through here to avoid local network access prompts.
 * Content scripts send messages here; we make the actual fetch and return results.
 */

const Vignova_API_BASE = "https://app.vignova.io";

// ─── Message Router ───
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

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
                    await chrome.storage.local.set({
                        vignova_token: data.token,
                        vignova_user: data.user,
                    });
                    // Notify content scripts
                    chrome.tabs.query({}, (tabs) => {
                        tabs.forEach((tab) => {
                            if (tab.id) {
                                chrome.tabs.sendMessage(tab.id, { type: "AUTH_STATE_CHANGED" }).catch(() => { });
                            }
                        });
                    });
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
                    await chrome.storage.local.remove(["vignova_token", "vignova_user"]);
                    sendResponse({ authenticated: false, expired: true });
                    return;
                }

                if (response.status === 403) {
                    sendResponse({ authenticated: true, accessDenied: true });
                    return;
                }

                const data = await response.json();
                sendResponse({ authenticated: true, ...data });
            } catch (err) {
                sendResponse({ authenticated: false, error: "Cannot connect to server" });
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
        (async () => {
            try {
                const response = await fetch("https://api.vignova.io/api/agent/plan", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(message.data),
                });
                const data = await response.json();
                sendResponse(data);
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to backend. Is it running?" });
            }
        })();
        return true;
    }

    // ─── API Proxy: Agent Plan Batch (Multiple Actions) ───
    if (message.type === "API_AGENT_PLAN_BATCH") {
        (async () => {
            try {
                const response = await fetch("https://api.vignova.io/api/agent/plan-batch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(message.data),
                });
                const data = await response.json();
                sendResponse(data);
            } catch (err) {
                sendResponse({ success: false, error: "Cannot connect to backend." });
            }
        })();
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

    // ─── Agent: Get Profile from Master Profile API ───
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
                    // Cache in storage for quick access
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
    if (tab.id) {
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
            }).catch(err => console.error("[Vignova] Could not inject dashboard:", err));
        });
    }
});
