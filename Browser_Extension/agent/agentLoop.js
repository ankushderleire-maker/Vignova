/**
 * Vignova Agent — Agent Loop Controller
 * Main observe → plan → act loop.
 * Coordinates Observer, RuleEngine, ATSDetector, Planner, and Executor.
 */

const AgentLoop = (() => {
    "use strict";

    // State
    let isRunning = false;
    let isPaused = false;
    let iteration = 0;
    const MAX_ITERATIONS = 20; // Safety guard against infinite loops
    const SETTLE_DELAY = 1500; // Wait for DOM to settle after actions
    let statusCallback = null; // UI callback
    const filledSelectors = new Set(); // Track selectors already filled — never re-fill

    /**
     * Get user profile from Master Profile API (via service worker).
     * Falls back to cached version in chrome.storage for speed.
     */
    async function getProfile() {
        try {
            // Try fetching fresh from Master Profile API
            const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({ type: "API_AGENT_GET_PROFILE" }, (response) => {
                    resolve(response);
                });
            });

            if (result && result.success && result.profile) {
                return result.profile;
            }

            // Fallback to cached version
            const cached = await new Promise((resolve) => {
                chrome.storage.local.get(["vignova_agent_profile"], (data) => {
                    resolve(data.vignova_agent_profile || null);
                });
            });

            return cached;
        } catch (err) {
            // Last resort: cached storage
            return new Promise((resolve) => {
                chrome.storage.local.get(["vignova_agent_profile"], (data) => {
                    resolve(data.vignova_agent_profile || null);
                });
            });
        }
    }

    /**
     * Emit status to the UI panel.
     */
    function emitStatus(status, detail = {}) {
        const event = { status, iteration, ...detail, timestamp: Date.now() };
        console.log(`[Vignova Agent] ${status}`, detail);
        if (statusCallback) statusCallback(event);
    }

    /**
     * Wait for DOM to settle (new elements appearing after navigation).
     */
    function waitForDOMSettle(timeoutMs = SETTLE_DELAY) {
        return new Promise((resolve) => {
            let settled = false;
            let timer = null;

            const observer = new MutationObserver(() => {
                // Reset timer on each mutation
                if (timer) clearTimeout(timer);
                timer = setTimeout(() => {
                    settled = true;
                    observer.disconnect();
                    resolve();
                }, 500);
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
            });

            // Fallback timeout
            setTimeout(() => {
                if (!settled) {
                    observer.disconnect();
                    resolve();
                }
            }, timeoutMs);

            // Start the settle timer
            timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    observer.disconnect();
                    resolve();
                }
            }, 500);
        });
    }

    /**
     * Run one iteration of the observe → plan → act cycle.
     * @returns {string} — "continue" | "done" | "error" | "paused"
     */
    async function runIteration() {
        if (!isRunning) return "done";
        if (isPaused) return "paused";

        iteration++;
        const profile = await getProfile();

        if (!profile) {
            emitStatus("error", { message: "No profile found. Please fill your profile in the extension popup." });
            return "error";
        }

        // ── STEP 1: Observe (with retry for dynamic forms) ──
        emitStatus("observing");
        const Observer = window.Vignova_Observer;
        let pageState = Observer.observe();

        // Retry if no fields found — forms may load dynamically
        if (pageState.fields.length === 0) {
            emitStatus("waiting_for_form", { message: "Waiting for form to load..." });
            let retries = 0;
            const maxRetries = 5;
            while (retries < maxRetries && pageState.fields.length === 0) {
                await new Promise((r) => setTimeout(r, 1000));
                pageState = Observer.observe();
                retries++;
            }
        }

        if (pageState.fields.length === 0 && pageState.buttons.length === 0) {
            emitStatus("done", { message: "No form fields detected on this page." });
            return "done";
        }

        emitStatus("observed", {
            fields: pageState.fields.length,
            buttons: pageState.buttons.length,
        });

        // ── STEP 2: ATS Detection ──
        const ATSDetector = window.Vignova_ATSDetector;
        const atsResult = ATSDetector.detect();
        let atsActions = [];

        if (atsResult) {
            emitStatus("ats_detected", { platform: atsResult.config.name });
            atsActions = ATSDetector.getATSActions(atsResult, profile);
        }

        // ── STEP 3: Rule Engine ──
        const RuleEngine = window.Vignova_RuleEngine;
        const { matched: ruleActions, unmatched } = RuleEngine.match(pageState.fields, profile);

        // Merge ATS + rule actions (ATS takes priority via selector dedup)
        const allLocalActions = [...atsActions];
        const atsSelectors = new Set(atsActions.map((a) => a.selector));
        for (const action of ruleActions) {
            if (!atsSelectors.has(action.selector)) {
                allLocalActions.push(action);
            }
        }

        // Convert actions targeting react-select fields to use select_react
        const reactSelectSelectors = new Set(
            pageState.fields.filter((f) => f.type === "react-select").map((f) => f.selector)
        );
        for (const action of allLocalActions) {
            if (reactSelectSelectors.has(action.selector) && action.action === "fill_input") {
                action.action = "select_react";
            }
        }

        // ── STEP 4: Execute local actions (instant fill) ──
        // Filter out fields already filled in previous iterations
        const newLocalActions = allLocalActions.filter((a) => !filledSelectors.has(a.selector));

        if (newLocalActions.length > 0) {
            const fieldNames = newLocalActions.map(a => {
                let name = a.profileKey || a.name || "Field";
                return name.replace(/_/g, " ").replace(" _", " ");
            });
            const fieldsText = fieldNames.slice(0, 3).join(", ") + (fieldNames.length > 3 ? "..." : "");

            emitStatus("filling", {
                count: newLocalActions.length,
                fieldsText: fieldsText,
                source: atsResult ? `ATS (${atsResult.config.name}) + Rules` : "Rules",
            });

            const Executor = window.Vignova_Executor;
            const result = await Executor.executeAll(newLocalActions, 100);

            // Mark successfully filled selectors so they won't be re-filled
            for (const action of newLocalActions) {
                filledSelectors.add(action.selector);
            }

            emitStatus("filled", {
                success: result.success,
                failed: result.failed,
            });
        }

        // ── STEP 5: AI Planner for remaining fields ──
        if (unmatched.length > 0) {
            // Filter out fields that were already handled by ATS
            const stillUnmatched = unmatched.filter(
                (f) => !atsSelectors.has(f.selector)
            );

            // Also filter out already-filled selectors
            const reallyUnmatched = stillUnmatched.filter(
                (f) => !filledSelectors.has(f.selector)
            );

            if (reallyUnmatched.length > 0) {
                emitStatus("ai_thinking", { unmatchedCount: reallyUnmatched.length });

                const Planner = window.Vignova_Planner;
                const batchActions = await Planner.getBatchActions(
                    reallyUnmatched,
                    profile,
                    pageState.buttons,
                    pageState.url
                );

                if (batchActions.length > 0) {
                    // Filter AI actions through filled tracker too
                    const newAIActions = batchActions.filter((a) => !filledSelectors.has(a.selector));
                    if (newAIActions.length > 0) {
                        const aiFieldNames = newAIActions.map(a => a.label || a.name || "Field");
                        const aiFieldsText = aiFieldNames.slice(0, 3).join(", ") + (aiFieldNames.length > 3 ? "..." : "");

                        emitStatus("ai_filling", {
                            count: newAIActions.length,
                            fieldsText: aiFieldsText
                        });
                        const Executor = window.Vignova_Executor;
                        const result = await Executor.executeAll(newAIActions, 200);

                        for (const action of newAIActions) {
                            filledSelectors.add(action.selector);
                        }

                        emitStatus("ai_filled", {
                            success: result.success,
                            failed: result.failed,
                        });
                    }
                } else {
                    emitStatus("ai_no_actions", {
                        message: `${stillUnmatched.length} fields could not be filled.`,
                    });
                }
            }
        }

        // ── STEP 6: Check for navigation buttons ──
        // Look for "Next", "Continue", etc. to advance multi-step forms
        const navButton = pageState.buttons.find(
            (b) => /next|continue|proceed/i.test(b.text) && !b.disabled
        );

        const submitButton = pageState.buttons.find(
            (b) => /submit|apply|finish|done/i.test(b.text) && !b.disabled
        );

        if (submitButton && !navButton) {
            // Final step — notify user before submitting
            emitStatus("ready_to_submit", {
                message: "Form is ready. Click Submit when you're ready.",
                submitSelector: submitButton.selector,
            });
            return "done"; // Don't auto-submit — let user review
        }

        if (navButton) {
            emitStatus("navigating", { button: navButton.text });
            const Executor = window.Vignova_Executor;
            Executor.clickButton(navButton.selector);

            // Wait for new page/step to load
            await waitForDOMSettle(2000);
            return "continue";
        }

        emitStatus("done", { message: "All fields processed." });
        return "done";
    }

    /**
     * Start the agent loop.
     * @param {Function} onStatus — callback for status updates
     */
    async function start(onStatus) {
        if (isRunning) {
            console.warn("[Vignova Agent] Already running.");
            return;
        }

        isRunning = true;
        isPaused = false;
        iteration = 0;
        filledSelectors.clear(); // Reset tracking on new run
        statusCallback = onStatus || null;

        emitStatus("started");

        while (isRunning && iteration < MAX_ITERATIONS) {
            if (isPaused) {
                await new Promise((r) => setTimeout(r, 500));
                continue;
            }

            const result = await runIteration();

            if (result === "done" || result === "error") {
                break;
            }

            // Brief pause between iterations
            await new Promise((r) => setTimeout(r, 300));
        }

        if (iteration >= MAX_ITERATIONS) {
            emitStatus("max_iterations", { message: "Safety limit reached." });
        }

        isRunning = false;
        emitStatus("stopped");
    }

    /**
     * Pause the agent loop.
     */
    function pause() {
        isPaused = true;
        emitStatus("paused");
    }

    /**
     * Resume from pause.
     */
    function resume() {
        isPaused = false;
        emitStatus("resumed");
    }

    /**
     * Stop the agent loop.
     */
    function stop() {
        isRunning = false;
        isPaused = false;
        emitStatus("stopped");
    }

    /**
     * Get current state.
     */
    function getState() {
        return { isRunning, isPaused, iteration };
    }

    return { start, pause, resume, stop, getState };
})();

if (typeof window !== "undefined") {
    window.Vignova_AgentLoop = AgentLoop;
}
