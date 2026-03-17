/**
 * Vignova Agent — Page Observer
 * Extracts structured page state from any job application form.
 * Returns serializable JSON with all inputs, buttons, selects, textareas.
 */

const PageObserver = (() => {
    "use strict";

    /**
     * Generate a unique, reliable CSS selector for an element.
     */
    function getSelector(el) {
        if (el.id) return `#${CSS.escape(el.id)}`;

        // Try name attribute
        if (el.name) {
            const tag = el.tagName.toLowerCase();
            const sel = `${tag}[name="${CSS.escape(el.name)}"]`;
            if (document.querySelectorAll(sel).length === 1) return sel;
        }

        // Try aria-label
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel) {
            const tag = el.tagName.toLowerCase();
            const sel = `${tag}[aria-label="${CSS.escape(ariaLabel)}"]`;
            if (document.querySelectorAll(sel).length === 1) return sel;
        }

        // Build path from ancestors
        const parts = [];
        let current = el;
        while (current && current !== document.body) {
            let part = current.tagName.toLowerCase();
            if (current.id) {
                part = `#${CSS.escape(current.id)}`;
                parts.unshift(part);
                break;
            }
            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(
                    (c) => c.tagName === current.tagName
                );
                if (siblings.length > 1) {
                    const idx = siblings.indexOf(current) + 1;
                    part += `:nth-of-type(${idx})`;
                }
            }
            parts.unshift(part);
            current = parent;
        }
        return parts.join(" > ");
    }

    /**
     * Resolve the label text for a form element.
     */
    function getLabel(el) {
        // 1. Explicit <label for="">
        if (el.id) {
            const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
            if (label) return label.innerText.trim();
        }

        // 2. aria-label
        const ariaLabel = el.getAttribute("aria-label");
        if (ariaLabel) return ariaLabel.trim();

        // 3. aria-labelledby
        const labelledBy = el.getAttribute("aria-labelledby");
        if (labelledBy) {
            const refEl = document.getElementById(labelledBy);
            if (refEl) return refEl.innerText.trim();
        }

        // 4. Wrapping <label>
        const parentLabel = el.closest("label");
        if (parentLabel) {
            const text = parentLabel.innerText.replace(el.value || "", "").trim();
            if (text) return text;
        }

        // 5. Previous sibling label
        const prev = el.previousElementSibling;
        if (prev && (prev.tagName === "LABEL" || prev.tagName === "SPAN" || prev.tagName === "DIV")) {
            const text = prev.innerText.trim();
            if (text && text.length < 100) return text;
        }

        // 6. Parent's text content (for inline labels)
        const parent = el.parentElement;
        if (parent) {
            const directText = Array.from(parent.childNodes)
                .filter((n) => n.nodeType === Node.TEXT_NODE)
                .map((n) => n.textContent.trim())
                .filter((t) => t.length > 0 && t.length < 80)
                .join(" ");
            if (directText) return directText;
        }

        // 7. Placeholder / title fallback
        return el.placeholder || el.title || "";
    }

    /**
     * Check if element is visible and interactable.
     * Uses a relaxed check to work inside iframes and with various CSS layouts.
     */
    function isVisible(el) {
        // Quick reject: zero dimensions
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;

        // Check computed style
        try {
            const style = getComputedStyle(el);
            if (style.display === "none" || style.visibility === "hidden") return false;
            if (parseFloat(style.opacity) === 0) return false;
        } catch (e) {
            // If getComputedStyle fails, assume visible
        }

        return true;
    }

    /**
     * Extract all form fields from the current page.
     */
    function extractFields() {
        const fields = [];

        // Inputs
        document.querySelectorAll("input").forEach((el) => {
            if (!isVisible(el)) return;
            const type = (el.type || "text").toLowerCase();
            if (["hidden", "submit", "button", "reset", "image"].includes(type)) return;

            fields.push({
                tag: "input",
                type,
                id: el.id || null,
                name: el.name || null,
                label: getLabel(el),
                placeholder: el.placeholder || null,
                selector: getSelector(el),
                currentValue: el.value || "",
                required: el.required || el.getAttribute("aria-required") === "true",
                options: null,
            });
        });

        // Textareas
        document.querySelectorAll("textarea").forEach((el) => {
            if (!isVisible(el)) return;
            fields.push({
                tag: "textarea",
                type: "textarea",
                id: el.id || null,
                name: el.name || null,
                label: getLabel(el),
                placeholder: el.placeholder || null,
                selector: getSelector(el),
                currentValue: el.value || "",
                required: el.required || el.getAttribute("aria-required") === "true",
                options: null,
            });
        });

        // Selects
        document.querySelectorAll("select").forEach((el) => {
            if (!isVisible(el)) return;
            const options = Array.from(el.options).map((opt) => ({
                value: opt.value,
                text: opt.text.trim(),
                selected: opt.selected,
            }));
            fields.push({
                tag: "select",
                type: "select",
                id: el.id || null,
                name: el.name || null,
                label: getLabel(el),
                placeholder: null,
                selector: getSelector(el),
                currentValue: el.value || "",
                required: el.required || el.getAttribute("aria-required") === "true",
                options,
            });
        });

        // Custom dropdowns (React-Select, MUI Select, Ant, any role="combobox")
        const reactSelectInputs = document.querySelectorAll(
            '[role="combobox"], .select__input, [class*="select__input"]'
        );
        const processedSelectors = new Set(fields.map((f) => f.selector));

        reactSelectInputs.forEach((el) => {
            if (!isVisible(el)) return;

            // Find the actual outermost clickable control container
            // This is what the user clicks to open the dropdown
            const control = el.closest('[class*="control"]')
                || el.closest('[class*="select"]')
                || el.closest('[class*="dropdown"]')
                || el.closest('[role="combobox"]')
                || el;

            const controlSel = getSelector(control);
            if (processedSelectors.has(controlSel)) return;
            // Also check if the input itself was already captured
            const inputSel = getSelector(el);
            if (processedSelectors.has(inputSel)) return;
            processedSelectors.add(controlSel);
            processedSelectors.add(inputSel);

            // Walk up to find the field container and its label
            let labelText = "";
            // Try multiple container patterns used by different ATS platforms
            let container = el.closest('[class*="field"], [class*="question"], [data-field]');
            if (!container) container = control.closest('[class*="field"], [class*="question"]');
            if (!container) {
                // Walk up a few levels to find a label
                let parent = control.parentElement;
                for (let i = 0; i < 4 && parent; i++) {
                    const lbl = parent.querySelector("label, legend, [class*='label']");
                    if (lbl) {
                        container = parent;
                        break;
                    }
                    parent = parent.parentElement;
                }
            }

            if (container) {
                const labelEl = container.querySelector("label, legend, [class*='label'], .field--label");
                if (labelEl) labelText = labelEl.innerText.trim();
            }
            if (!labelText) labelText = getLabel(el);
            if (!labelText) labelText = el.getAttribute("aria-label") || el.placeholder || "";

            // Check current selected value
            let currentValue = "";
            const singleValue = control.querySelector('[class*="single-value"], [class*="singleValue"], [class*="placeholder"]');
            if (singleValue) {
                const sv = singleValue.innerText.trim();
                if (sv !== "Select..." && sv !== "Choose..." && sv !== "Select") {
                    currentValue = sv;
                }
            }

            fields.push({
                tag: "react-select",
                type: "react-select",
                id: el.id || control.id || null,
                name: el.name || el.getAttribute("aria-label") || null,
                label: labelText,
                placeholder: el.placeholder || "Select...",
                selector: controlSel,  // Use the control container, not the tiny input
                inputSelector: inputSel, // Keep the input selector as backup
                currentValue,
                required: el.getAttribute("aria-required") === "true"
                    || (container && container.querySelector("[class*='required'], .required, [aria-required='true']") !== null),
                options: null,
            });
        });

        return fields;
    }

    /**
     * Extract navigation and action buttons.
     */
    function extractButtons() {
        const navKeywords = /next|continue|apply|submit|review|save|proceed|finish|done|upload|attach/i;
        const buttons = [];

        // <button> elements
        document.querySelectorAll("button").forEach((el) => {
            if (!isVisible(el)) return;
            const text = el.innerText.trim();
            const ariaLabel = el.getAttribute("aria-label") || "";
            if (navKeywords.test(text) || navKeywords.test(ariaLabel) || el.type === "submit") {
                buttons.push({
                    tag: "button",
                    type: el.type || "button",
                    text,
                    ariaLabel,
                    selector: getSelector(el),
                    disabled: el.disabled,
                });
            }
        });

        // <input type="submit"> and <input type="button">
        document.querySelectorAll('input[type="submit"], input[type="button"]').forEach((el) => {
            if (!isVisible(el)) return;
            const text = el.value || "";
            if (navKeywords.test(text)) {
                buttons.push({
                    tag: "input",
                    type: el.type,
                    text,
                    ariaLabel: el.getAttribute("aria-label") || "",
                    selector: getSelector(el),
                    disabled: el.disabled,
                });
            }
        });

        // <a> links that look like buttons
        document.querySelectorAll('a[role="button"], a.btn, a.button').forEach((el) => {
            if (!isVisible(el)) return;
            const text = el.innerText.trim();
            if (navKeywords.test(text)) {
                buttons.push({
                    tag: "a",
                    type: "link",
                    text,
                    ariaLabel: el.getAttribute("aria-label") || "",
                    selector: getSelector(el),
                    disabled: false,
                });
            }
        });

        return buttons;
    }

    /**
     * Main observe function — returns full page state.
     */
    function observe() {
        return {
            url: window.location.href,
            title: document.title,
            fields: extractFields(),
            buttons: extractButtons(),
            timestamp: Date.now(),
        };
    }

    return { observe, extractFields, extractButtons, getSelector, getLabel };
})();

// Export for use by other modules
if (typeof window !== "undefined") {
    window.Vignova_Observer = PageObserver;
}
