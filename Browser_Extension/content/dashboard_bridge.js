/**
 * dashboard_bridge.js
 * Runs on the Vignova dashboard (app.vignova.io) and bridges
 * window.postMessage ↔ chrome.runtime messaging.
 *
 * The extension context can become invalid when the extension is
 * reloaded or updated while the dashboard tab is open. Every
 * chrome.runtime access is therefore guarded so the page never
 * throws an uncaught error.
 */

// ── Context guard ────────────────────────────────────────────────────
function isContextValid() {
    try {
        // chrome.runtime.id is undefined (not throws) when context is dead
        // in some builds; accessing getManifest() is more reliable.
        return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (_) {
        return false;
    }
}

// ── window → extension bridge ────────────────────────────────────────
function onWindowMessage(event) {
    // Only accept messages originating from this window (not iframes, not other tabs)
    if (event.source !== window) return;
    if (!event.data || typeof event.data.type !== "string") return;

    // Check context validity before every chrome.runtime call
    if (!isContextValid()) {
        // Extension was reloaded; remove stale listener and bail out silently
        window.removeEventListener("message", onWindowMessage);
        return;
    }

    try {
        if (event.data.type === "VIGNOVA_EXTENSION_PING") {
            const manifest = chrome.runtime.getManifest();
            window.postMessage(
                {
                    type:             "VIGNOVA_EXTENSION_PONG",
                    extensionId:      chrome.runtime.id,
                    extensionVersion: manifest.version,
                },
                window.location.origin   // tighter than "*"
            );
        }

        if (event.data.type === "VIGNOVA_ANALYZE_LINKEDIN") {
            const url = event.data.payload?.url;
            if (url && typeof url === "string" && url.includes("linkedin.com/in/")) {
                chrome.runtime.sendMessage(
                    { action: "SCRAPE_LINKEDIN_PROFILE", url },
                    // Optional response callback — swallow any error
                    () => { if (chrome.runtime.lastError) { /* expected when bg not ready */ } }
                );
            }
        }
    } catch (err) {
        // Most likely "Extension context invalidated" — clean up and move on
        if (err.message && err.message.includes("Extension context invalidated")) {
            window.removeEventListener("message", onWindowMessage);
        }
        // All other errors are silently ignored to avoid cluttering the console
    }
}

window.addEventListener("message", onWindowMessage);

// ── extension → window bridge ────────────────────────────────────────
// onMessage listener automatically becomes no-op when context is invalid,
// but we still wrap to be safe.
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
    if (!isContextValid()) return;

    try {
        if (message.type === "LINKEDIN_PROFILE_DATA") {
            window.postMessage(
                { type: "VIGNOVA_LINKEDIN_DATA", payload: message.payload },
                window.location.origin
            );
        }
        if (message.type === "LINKEDIN_SCRAPE_ERROR") {
            window.postMessage(
                { type: "VIGNOVA_LINKEDIN_ERROR", error: message.error },
                window.location.origin
            );
        }
    } catch (err) {
        // Swallow — page may have navigated
    }
});
