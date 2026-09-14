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

// Pages allowed to start a Naukri scan. This script runs on every site, and a
// scan opens a tab and sends the user's Naukri profile to their account.
const DASHBOARD_ORIGIN = "https://app.vignova.io";

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
                    // What this build can do for the page, so the dashboard
                    // only offers a feature the installed extension has.
                    features:         ["naukri-scan"],
                },
                window.location.origin   // tighter than "*"
            );
        }

        // "Scan Naukri profile" on the dashboard's Naukri Optimizer.
        if (event.data.type === "VIGNOVA_NAUKRI_SCAN" && window.location.origin === DASHBOARD_ORIGIN) {
            const requestId = String(event.data.requestId || "");
            chrome.runtime.sendMessage({ type: "NAUKRI_SCAN_START" }, (reply) => {
                const failed = chrome.runtime.lastError;
                window.postMessage(
                    {
                        type:          "VIGNOVA_NAUKRI_SCAN_RESULT",
                        requestId,
                        success:       !failed && !!(reply && reply.success),
                        authenticated: !reply || reply.authenticated !== false,
                        error:         failed
                            ? "The extension did not respond. Reload this page and try again."
                            : (reply && reply.error) || "",
                    },
                    window.location.origin
                );
            });
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
