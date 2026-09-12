/**
 * Vignova Agent — AI Planner
 * Sends unmatched fields to backend (Ollama) for intelligent action generation.
 * Falls back only when the rule engine and ATS detector can't handle a field.
 */

const AgentPlanner = (() => {
    "use strict";

    /**
     * Request next action from the AI planner via service worker → backend.
     * @param {Array} unmatchedFields — fields the rule engine couldn't fill
     * @param {Object} profile — user profile
     * @param {Array} buttons — navigation buttons on the page
     * @param {string} pageUrl — current page URL
     * @returns {Object|null} — { action, selector, value } or null
     */
    async function getNextAction(unmatchedFields, profile, buttons, pageUrl) {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        type: "API_AGENT_PLAN",
                        data: {
                            fields: unmatchedFields.slice(0, 15), // Limit to avoid token overflow
                            buttons: buttons.slice(0, 10),
                            profile: sanitizeProfile(profile),
                            url: pageUrl,
                        },
                    },
                    (result) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(result);
                        }
                    }
                );
            });

            if (response && response.success && response.action) {
                return {
                    action: response.action.action,
                    selector: response.action.selector,
                    value: response.action.value || "",
                    source: "ai_planner",
                };
            }

            return null;
        } catch (err) {
            console.error("[Vignova Agent] Planner error:", err);
            return null;
        }
    }

    /**
     * Request multiple actions at once (batch mode).
     */
    async function getBatchActions(unmatchedFields, profile, buttons, pageUrl) {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    {
                        type: "API_AGENT_PLAN_BATCH",
                        data: {
                            fields: unmatchedFields.slice(0, 15),
                            buttons: buttons.slice(0, 10),
                            profile: sanitizeProfile(profile),
                            url: pageUrl,
                        },
                    },
                    (result) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(result);
                        }
                    }
                );
            });

            if (response && response.success && Array.isArray(response.actions)) {
                return response.actions.map((a) => ({
                    ...a,
                    source: "ai_planner",
                }));
            }

            return [];
        } catch (err) {
            console.error("[Vignova Agent] Batch planner error:", err);
            return [];
        }
    }

    /**
     * Remove sensitive data before sending to backend.
     */
    function sanitizeProfile(profile) {
        if (!profile) return {};
        // Only send what the planner needs — no passwords, tokens, etc.
        return {
            first_name: profile.first_name || "",
            last_name: profile.last_name || "",
            email: profile.email || "",
            phone: profile.phone || "",
            linkedin: profile.linkedin || "",
            github: profile.github || "",
            portfolio: profile.portfolio || "",
            city: profile.city || "",
            state: profile.state || "",
            country: profile.country || "",
            years_experience: profile.years_experience || "",
            current_company: profile.current_company || "",
            current_title: profile.current_title || "",
            work_authorized: profile.work_authorized || "",
            needs_sponsorship: profile.needs_sponsorship || "",
        };
    }

    return { getNextAction, getBatchActions };
})();

if (typeof window !== "undefined") {
    window.Vignova_Planner = AgentPlanner;
}
