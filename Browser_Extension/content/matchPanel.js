/** Keyword coverage panel for the locally detected job skills. */

(function () {
    "use strict";

    if (window.VignovaMatchPanel) return;

    // ── Icons ────────────────────────────────────────────────────────────
    // Stroke icons at 24px, sized down by CSS. Static markup, no page data.
    const ICON = {
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
        doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>',
        layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>',
        alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v5"/><circle cx="12" cy="16.3" r="1" fill="currentColor" stroke="none"/></svg>',
        bulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3z"/></svg>',
        spark: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.6l1.7 4.6 4.6 1.7-4.6 1.7L12 15.2l-1.7-4.6L5.7 8.9l4.6-1.7z"/><path d="M18.6 14.2l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z"/></svg>',
        arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13"/><path d="m13 6 6 6-6 6"/></svg>',
        gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
        close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    };

    /** The tier a score sits in: the words on the pill and the colour of it. */
    function tierOf(score) {
        if (score >= 75) return { label: "Excellent match", tone: "good" };
        if (score >= 55) return { label: "Strong match", tone: "good" };
        if (score >= 35) return { label: "Fair match", tone: "fair" };
        if (score >= 20) return { label: "Low match", tone: "poor" };
        return { label: "Very low match", tone: "poor" };
    }

    function suggestionFor(model) {
        const missing = model.missing || [];
        if (missing.length) return `Add ${missing.slice(0, 2).join(" and ")} to your profile only where they reflect your experience.`;
        return (model.matched || []).length ? "Your profile contains all the detected keywords. Review the full requirements before applying." : "No skills were detected. Open a more detailed job description.";
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function icon(name, className) {
        const span = el("span", className || "vg-mp-icon");
        span.innerHTML = ICON[name] || "";
        return span;
    }

    function metricRow(name, label, value) {
        const row = el("div", "vg-mp-metric");

        const tile = el("div", "vg-mp-metric-icon");
        tile.appendChild(icon(name));
        row.appendChild(tile);

        const body = el("div", "vg-mp-metric-body");
        body.appendChild(el("div", "vg-mp-metric-label", label));

        const track = el("div", "vg-mp-track");
        const fill = el("div", "vg-mp-fill");
        fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
        track.appendChild(fill);
        body.appendChild(track);
        row.appendChild(body);

        row.appendChild(el("div", "vg-mp-metric-value", `${Math.round(value)}%`));
        return row;
    }

    function pillGroup(iconName, tone, title, words) {
        const wrap = el("div", "vg-mp-group");

        const head = el("div", `vg-mp-group-head vg-mp-${tone}`);
        head.appendChild(icon(iconName, "vg-mp-group-icon"));
        head.appendChild(el("span", "vg-mp-group-title", `${title} (${words.length})`));
        wrap.appendChild(head);

        const pills = el("div", "vg-mp-pills");
        words.slice(0, 12).forEach((word) => pills.appendChild(el("span", `vg-mp-pill vg-mp-pill-${tone}`, word)));
        if (words.length > 12) pills.appendChild(el("span", "vg-mp-pill vg-mp-pill-more", `+${words.length - 12} more`));
        wrap.appendChild(pills);

        return wrap;
    }

    // ── The panel ────────────────────────────────────────────────────────

    let panel = null;
    let hideTimer = null;
    let anchor = null;

    function ensurePanel() {
        if (panel) return panel;

        panel = el("div", "vg-match-panel");
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", "Keyword score");

        panel.addEventListener("mouseenter", () => clearTimeout(hideTimer));
        panel.addEventListener("mouseleave", () => scheduleHide());

        document.body.appendChild(panel);
        return panel;
    }

    function build(model, handlers) {
        const node = ensurePanel();
        node.textContent = "";

        const tier = tierOf(model.score);

        // ── Brand row ──
        const brand = el("div", "vg-mp-brand");
        const mark = el("div", "vg-mp-brand-left");
        const logo = document.createElement("img");
        try {
            logo.src = chrome.runtime.getURL("icons/logo.png");
        } catch {
            logo.remove();
        }
        logo.className = "vg-mp-logo";
        logo.alt = "";
        mark.appendChild(logo);
        mark.appendChild(el("span", "vg-mp-wordmark", "VIGNOVA"));
        brand.appendChild(mark);

        const tools = el("div", "vg-mp-tools");
        const gear = el("button", "vg-mp-tool");
        gear.type = "button";
        gear.title = "Extension settings";
        gear.appendChild(icon("gear"));
        gear.addEventListener("click", () => handlers.onSettings && handlers.onSettings());
        const close = el("button", "vg-mp-tool");
        close.type = "button";
        close.title = "Close";
        close.appendChild(icon("close"));
        close.addEventListener("click", hide);
        tools.appendChild(gear);
        tools.appendChild(close);
        brand.appendChild(tools);
        node.appendChild(brand);

        // ── Title and score ──
        const head = el("div", "vg-mp-head");
        const heading = el("div", "vg-mp-heading");
        heading.appendChild(el("h2", "vg-mp-title", "Keyword Score"));
        heading.appendChild(el("p", "vg-mp-sub", "Detected job keywords found in your profile. This is not an ATS score."));
        head.appendChild(heading);

        const scoreBox = el("div", "vg-mp-scorebox");
        const score = el("div", "vg-mp-score");
        score.appendChild(el("span", "vg-mp-score-value", (model.matched.length + model.missing.length) ? String(Math.round(model.score)) : "—"));
        score.appendChild(el("span", "vg-mp-score-max", "/100"));
        scoreBox.appendChild(score);

        const pill = el("div", `vg-mp-tier vg-mp-tier-${tier.tone}`);
        pill.appendChild(el("span", "vg-mp-dot"));
        pill.appendChild(el("span", null, tier.label.toUpperCase()));
        scoreBox.appendChild(pill);
        head.appendChild(scoreBox);
        node.appendChild(head);

        // ── What the posting says about money and dates, when it says it ──
        if (model.salary || model.deadline) {
            const meta = el("div", "vg-mp-meta");
            if (model.salary) meta.appendChild(el("span", "vg-mp-chip vg-mp-chip-pay", model.salary));
            if (model.deadline) meta.appendChild(el("span", "vg-mp-chip vg-mp-chip-due", `Apply by ${model.deadline}`));
            node.appendChild(meta);
        }

        // ── Coverage of detected skills ──
        const metrics = el("div", "vg-mp-metrics");
        metrics.appendChild(metricRow("doc", "Keyword Coverage", model.score));
        node.appendChild(metrics);

        // ── Keywords ──
        if ((model.matched || []).length) {
            node.appendChild(pillGroup("check", "good", "Keyword matches", model.matched));
        }
        if ((model.missing || []).length) {
            node.appendChild(pillGroup("alert", "poor", "Missing keywords", model.missing));
        }

        // ── What to do about it ──
        const tip = el("div", "vg-mp-tip");
        const tipHead = el("div", "vg-mp-tip-head");
        tipHead.appendChild(icon("bulb", "vg-mp-tip-icon"));
        tipHead.appendChild(el("span", "vg-mp-tip-title", "Quick suggestion"));
        tip.appendChild(tipHead);
        tip.appendChild(el("p", "vg-mp-tip-body", suggestionFor(model)));
        node.appendChild(tip);

        // ── Actions ──
        const cta = el("button", "vg-mp-cta");
        cta.type = "button";
        cta.appendChild(icon("spark", "vg-mp-cta-spark"));
        cta.appendChild(el("span", null, "Improve with Vignova"));
        cta.appendChild(icon("arrow", "vg-mp-cta-arrow"));
        cta.addEventListener("click", () => {
            hide();
            handlers.onImprove && handlers.onImprove();
        });
        node.appendChild(cta);

        if (handlers.onAnalysis) {
            const link = el("button", "vg-mp-link", "View full analysis");
            link.type = "button";
            link.addEventListener("click", () => {
                hide();
                handlers.onAnalysis();
            });
            node.appendChild(link);
        }

        return node;
    }

    /** Beside the badge, flipped or clamped so it always fits on screen. */
    function place(node, badge) {
        const gap = 12;
        const margin = 12;
        const rect = badge.getBoundingClientRect();
        const width = node.offsetWidth;
        const height = node.offsetHeight;

        let left = rect.right + gap;
        if (left + width + margin > window.innerWidth) {
            left = rect.left - gap - width;
        }
        if (left < margin) left = margin;

        let top = rect.top + rect.height / 2 - height / 2;
        top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

        node.style.left = `${Math.round(left)}px`;
        node.style.top = `${Math.round(top)}px`;
    }

    function scheduleHide() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hide, 180);
    }

    function hide() {
        clearTimeout(hideTimer);
        if (panel) panel.classList.remove("vg-mp-open");
        anchor = null;
    }

    function show(badge, model, handlers) {
        clearTimeout(hideTimer);
        anchor = badge;

        const node = build(model, handlers || {});
        // Measured while invisible, so the flip and the clamp use real numbers.
        node.style.visibility = "hidden";
        node.classList.add("vg-mp-open");
        place(node, badge);
        node.style.visibility = "";
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && panel && panel.classList.contains("vg-mp-open")) hide();
    });

    window.addEventListener("scroll", () => { if (anchor) place(panel, anchor); }, { passive: true });

    /**
     * Wires a score badge to the panel.
     *
     * `model` is { score, matched[], missing[] };
     * `handlers` is { onImprove, onAnalysis, onSettings }.
     */
    function attach(badge, model, handlers) {
        badge.removeAttribute("data-tooltip-html");
        badge.title = "";

        if (badge._vgMatchHandlers) {
            badge.removeEventListener("mouseenter", badge._vgMatchHandlers.enter);
            badge.removeEventListener("mouseleave", badge._vgMatchHandlers.leave);
        }

        const enter = () => show(badge, model, handlers);
        const leave = () => scheduleHide();
        badge._vgMatchHandlers = { enter, leave };

        badge.addEventListener("mouseenter", enter);
        badge.addEventListener("mouseleave", leave);
        badge.style.cursor = "pointer";
    }

    window.VignovaMatchPanel = { attach, show, hide, tierOf, suggestionFor };
})();
