/**
 * dashboard_bridge.js
 * Runs on the Vignova dashboard (app.vignova.io) and answers the
 * page's extension-detection ping over window.postMessage.
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
    } catch (err) {
        // Most likely "Extension context invalidated" — clean up and move on
        if (err.message && err.message.includes("Extension context invalidated")) {
            window.removeEventListener("message", onWindowMessage);
        }
        // All other errors are silently ignored to avoid cluttering the console
    }
}

window.addEventListener("message", onWindowMessage);
