/**
 * Vignova Agent — Action Executor
 * Executes actions returned by the Rule Engine, ATS Detector, or AI Planner.
 * Dispatches proper events to trigger React/Angular/Vue handlers.
 */

const ActionExecutor = (() => {
    "use strict";

    /**
     * Dispatch synthetic events that frameworks rely on.
     */
    function dispatchEvents(el, eventNames) {
        for (const name of eventNames) {
            el.dispatchEvent(new Event(name, { bubbles: true, cancelable: true }));
        }
    }

    /**
     * Dispatch keyboard-level input events (for React controlled inputs).
     */
    function dispatchInputEvents(el, value) {
        // React uses a special setter on the prototype
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, "value"
        )?.set || Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, "value"
        )?.set;

        if (nativeInputValueSetter) {
            nativeInputValueSetter.call(el, value);
        } else {
            el.value = value;
        }

        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        el.dispatchEvent(new Event("blur", { bubbles: true }));
    }

    /**
     * Fill an input or textarea field.
     */
    function fillInput(selector, value) {
        const el = document.querySelector(selector);
        if (!el) {
            console.warn(`[Vignova Executor] Element not found: ${selector}`);
            return false;
        }

        // Focus the element first
        el.focus();
        el.click();

        // Small delay to let focus handlers run
        dispatchInputEvents(el, value);

        // Visual feedback: brief highlight
        const origBg = el.style.backgroundColor;
        el.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
        el.style.transition = "background-color 0.5s";
        setTimeout(() => {
            el.style.backgroundColor = origBg;
        }, 1500);

        return true;
    }

    /**
     * Click a button or link element.
     */
    function clickButton(selector) {
        const el = document.querySelector(selector);
        if (!el) {
            console.warn(`[Vignova Executor] Button not found: ${selector}`);
            return false;
        }

        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // Brief delay after scroll
        setTimeout(() => {
            el.click();
        }, 200);

        return true;
    }

    /**
     * Select an option in a dropdown.
     */
    function selectOption(selector, value) {
        const el = document.querySelector(selector);
        if (!el || el.tagName !== "SELECT") {
            console.warn(`[Vignova Executor] Select not found: ${selector}`);
            return false;
        }

        // Try matching by value first, then by text
        let found = false;
        const valueLower = value.toLowerCase().trim();

        for (const opt of el.options) {
            if (opt.value.toLowerCase() === valueLower || opt.text.toLowerCase().includes(valueLower)) {
                el.value = opt.value;
                found = true;
                break;
            }
        }

        if (!found) {
            // Fuzzy match — find closest option
            let bestMatch = null;
            let bestScore = 0;
            for (const opt of el.options) {
                const text = opt.text.toLowerCase();
                const score = valueLower.split(" ").filter((w) => text.includes(w)).length;
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = opt;
                }
            }
            if (bestMatch) {
                el.value = bestMatch.value;
                found = true;
            }
        }

        if (found) {
            dispatchEvents(el, ["input", "change", "blur"]);

            // Visual feedback
            const origBg = el.style.backgroundColor;
            el.style.backgroundColor = "rgba(59, 130, 246, 0.1)";
            setTimeout(() => { el.style.backgroundColor = origBg; }, 1500);
        }

        return found;
    }

    /**
     * Handle file upload — click the input to open file picker.
     * Note: Can't programmatically set file inputs due to security.
     */
    function uploadFile(selector) {
        const el = document.querySelector(selector);
        if (!el) {
            console.warn(`[Vignova Executor] File input not found: ${selector}`);
            return false;
        }

        el.click();
        return true; // User must manually select file
    }

    /**
     * Answer a question (fill a textarea).
     */
    function answerQuestion(selector, value) {
        return fillInput(selector, value); // Same as fill_input
    }

    /**
     * Submit the form.
     */
    function submitForm(selector) {
        return clickButton(selector);
    }

    /**
     * Select an option in any custom dropdown (React-Select, MUI, custom, etc.)
     * Uses multiple universal strategies to open the dropdown and select options.
     */
    async function selectReact(selector, value) {
        const el = document.querySelector(selector);
        if (!el) {
            console.warn(`[Vignova Executor] Dropdown element not found: ${selector}`);
            return false;
        }

        console.log(`[Vignova Executor] selectReact: trying to select "${value}"`);

        // ── Strategy: Try multiple ways to open the dropdown ──
        let options = [];

        // Attempt 1: Full mouse event sequence on the nearest clickable wrapper
        const wrapper = el.closest('[class*="control"]')
            || el.closest('[class*="select"]')
            || el.closest('[class*="dropdown"]')
            || el.parentElement?.parentElement
            || el.parentElement;

        options = await tryOpenDropdown(wrapper || el);

        // Attempt 2: Focus input + ArrowDown (universal keyboard open)
        if (options.length === 0) {
            el.focus();
            await fireKey(el, "ArrowDown", 40);
            await sleep(400);
            options = await gatherOptions();
        }

        // Attempt 3: Full mouse event on the input itself
        if (options.length === 0) {
            fireFullClick(el);
            await sleep(400);
            options = await gatherOptions();
        }

        // Attempt 4: Focus + Space (some dropdowns use Space to open)
        if (options.length === 0) {
            el.focus();
            await fireKey(el, " ", 32);
            await sleep(400);
            options = await gatherOptions();
        }

        // Attempt 5: mousedown only on wrapper (some React components need just mousedown)
        if (options.length === 0 && wrapper && wrapper !== el) {
            fireFullClick(wrapper);
            await sleep(500);
            options = await gatherOptions();
        }

        if (options.length === 0) {
            console.warn(`[Vignova Executor] Could not open dropdown for: ${selector}`);
            return false;
        }

        console.log(`[Vignova Executor] Dropdown opened — ${options.length} options found`);

        // ── Find and click the best matching option ──
        const success = clickBestOption(options, value);

        // Close dropdown if selection failed (press Escape)
        if (!success) {
            await fireKey(el, "Escape", 27);
        }

        return success;
    }

    /**
     * Try to open a dropdown by firing full mouse event sequence on an element.
     * Returns any options found after the click.
     */
    async function tryOpenDropdown(target) {
        if (!target) return [];
        fireFullClick(target);
        await sleep(500);
        return gatherOptions();
    }

    /**
     * Fire a complete mouse click sequence: mousedown → mouseup → click.
     * Many frameworks (React, Angular Material, etc.) listen to mousedown, not click.
     */
    function fireFullClick(el) {
        const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
        el.dispatchEvent(new MouseEvent("mousedown", opts));
        el.dispatchEvent(new MouseEvent("mouseup", opts));
        el.dispatchEvent(new MouseEvent("click", opts));
    }

    /**
     * Fire a keyboard event (keydown + keyup).
     */
    async function fireKey(el, key, keyCode) {
        const opts = { key, code: key, keyCode, which: keyCode, bubbles: true, cancelable: true };
        el.dispatchEvent(new KeyboardEvent("keydown", opts));
        el.dispatchEvent(new KeyboardEvent("keyup", opts));
    }

    /**
     * Gather all visible dropdown option elements from the DOM.
     * Searches for multiple common patterns used by different UI frameworks.
     */
    function gatherOptions() {
        // Priority order: most specific → most general
        const selectors = [
            '[role="option"]',                          // WAI-ARIA standard
            '[role="listbox"] > *',                     // Listbox children
            '[class*="select__option"]',                // React-Select
            '[class*="option--is"]',                    // React-Select variants
            '[class*="MuiMenuItem"]',                   // Material UI
            '[class*="ant-select-item-option"]',        // Ant Design
            '[class*="dropdown-item"]',                 // Bootstrap
            '[class*="option"]:not([class*="options"])', // Generic
            'li[id*="option"]',                         // ID-based options
            'ul[role="listbox"] li',                    // Accessible listbox
        ];

        for (const sel of selectors) {
            try {
                const items = document.querySelectorAll(sel);
                // Filter to only visible items
                const visible = Array.from(items).filter((item) => {
                    const rect = item.getBoundingClientRect();
                    return rect.width > 0 && rect.height > 0;
                });
                if (visible.length > 0) return visible;
            } catch (e) {
                // Skip invalid selectors
            }
        }
        return [];
    }

    /**
     * Sleep utility.
     */
    function sleep(ms) {
        return new Promise((r) => setTimeout(r, ms));
    }

    /**
     * Find and click the best matching option from a visible dropdown list.
     * Uses fuzzy scoring to find the closest match.
     */
    function clickBestOption(options, value) {
        const valueLower = value.toLowerCase().trim();
        let bestMatch = null;
        let bestScore = -1;
        const optionTexts = [];

        for (const opt of options) {
            const text = (opt.innerText || opt.textContent || "").trim();
            const textLower = text.toLowerCase();
            if (!text) continue;
            optionTexts.push(text);

            // Exact match — immediate select
            if (textLower === valueLower) {
                console.log(`[Vignova Executor] Exact match: "${text}"`);
                selectOptionElement(opt);
                return true;
            }

            // Score-based matching
            let score = 0;

            // Full containment
            if (textLower.includes(valueLower)) score += 15;
            if (valueLower.includes(textLower)) score += 12;

            // Starts with
            if (textLower.startsWith(valueLower.substring(0, Math.min(4, valueLower.length)))) score += 5;

            // Word overlap
            const valueWords = valueLower.split(/[\s,]+/).filter(Boolean);
            const textWords = textLower.split(/[\s,]+/).filter(Boolean);
            for (const vw of valueWords) {
                for (const tw of textWords) {
                    if (tw === vw) score += 6;
                    else if (tw.includes(vw) || vw.includes(tw)) score += 3;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = opt;
            }
        }

        console.log(`[Vignova Executor] Options: [${optionTexts.slice(0, 6).join(" | ")}]`);
        console.log(`[Vignova Executor] Best: "${bestMatch?.innerText?.trim()}" (score: ${bestScore})`);

        if (bestMatch && bestScore >= 3) {
            selectOptionElement(bestMatch);
            return true;
        }

        // Fallback: pick first non-placeholder option
        for (const opt of options) {
            const t = (opt.innerText || "").trim().toLowerCase();
            if (t && !["select...", "select", "choose...", "choose", "--", ""].includes(t)) {
                selectOptionElement(opt);
                return true;
            }
        }

        return false;
    }

    /**
     * Click a dropdown option element using full mouse event sequence.
     */
    function selectOptionElement(opt) {
        opt.scrollIntoView({ block: "nearest" });
        fireFullClick(opt);

        // Visual feedback
        try {
            const origBg = opt.style.backgroundColor;
            opt.style.backgroundColor = "rgba(59, 130, 246, 0.2)";
            setTimeout(() => { opt.style.backgroundColor = origBg; }, 800);
        } catch (e) { /* ignore */ }
    }

    /**
     * Execute a single action.
     * @param {Object} action — { action, selector, value }
     * @returns {boolean|Promise<boolean>} success
     */
    function execute(action) {
        if (!action || !action.action) return false;

        console.log(`[Vignova Executor] ${action.action}: ${action.selector} = "${action.value || ""}"`);

        switch (action.action) {
            case "fill_input":
                return fillInput(action.selector, action.value);
            case "click_button":
                return clickButton(action.selector);
            case "select_option":
                return selectOption(action.selector, action.value);
            case "select_react":
                return selectReact(action.selector, action.value);
            case "upload_file":
                return uploadFile(action.selector);
            case "answer_question":
                return answerQuestion(action.selector, action.value);
            case "submit_form":
                return submitForm(action.selector);
            default:
                console.warn(`[Vignova Executor] Unknown action: ${action.action}`);
                return false;
        }
    }

    /**
     * Execute multiple actions sequentially with delays.
     * @param {Array} actions
     * @param {number} delayMs — delay between actions
     * @returns {Promise<{ success: number, failed: number }>}
     */
    async function executeAll(actions, delayMs = 150) {
        let success = 0;
        let failed = 0;

        for (const action of actions) {
            const result = await execute(action);
            if (result) {
                success++;
            } else {
                failed++;
            }
            // Longer delay for React-Select actions (needs DOM update time)
            const wait = (action.action === "select_react") ? 600 : delayMs;
            await new Promise((r) => setTimeout(r, wait));
        }

        return { success, failed };
    }

    return { execute, executeAll, fillInput, clickButton, selectOption, selectReact, uploadFile };
})();

if (typeof window !== "undefined") {
    window.Vignova_Executor = ActionExecutor;
}
