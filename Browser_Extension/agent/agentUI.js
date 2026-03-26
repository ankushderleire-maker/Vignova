/**
 * Vignova Agent — Floating UI Panel
 * Shows agent status, progress, and controls (pause/resume/stop).
 * Injected into the page as a floating panel.
 */

const AgentUI = (() => {
    "use strict";

    const PANEL_ID = "vignova-agent-panel";
    let panelEl = null;
    let logEntries = [];
    const MAX_LOG = 15;

    /**
     * Create and inject the floating panel.
     */
    function create() {
        if (document.getElementById(PANEL_ID)) return;

        panelEl = document.createElement("div");
        panelEl.id = PANEL_ID;
        panelEl.innerHTML = `
            <div class="vignova-agent-minimal-body">
                <div class="vignova-agent-header">
                    <span class="vignova-agent-icon">🤖</span>
                    <span class="vignova-agent-title">Vignova Auto-Apply</span>
                    <div class="vignova-agent-controls">
                        <button id="vignova-agent-pause" class="vignova-agent-ctrl-btn" title="Pause">⏸️</button>
                        <button id="vignova-agent-stop" class="vignova-agent-ctrl-btn vignova-agent-ctrl-stop" title="Stop">⏹️</button>
                    </div>
                </div>
                <div class="vignova-agent-status-container">
                    <div class="vignova-agent-status-dot"></div>
                    <span id="vignova-agent-status-text">Initializing...</span>
                    <span id="vignova-agent-progress" class="vignova-agent-progress-pill"></span>
                </div>
            </div>
        `;

        document.body.appendChild(panelEl);

        // Make draggable
        makeDraggable(panelEl);

        // Button handlers
        document.getElementById("vignova-agent-pause").addEventListener("click", handlePause);
        document.getElementById("vignova-agent-stop").addEventListener("click", handleStop);
    }

    /**
     * Make the panel draggable.
     */
    function makeDraggable(el) {
        const header = el.querySelector(".vignova-agent-header");
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        header.addEventListener("mousedown", (e) => {
            if (e.target.tagName === "BUTTON") return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = el.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            el.style.left = `${startLeft + dx}px`;
            el.style.top = `${startTop + dy}px`;
            el.style.right = "auto";
            el.style.bottom = "auto";
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
        });
    }

    /**
     * Update the status display.
     */
    function updateStatus(event) {
        if (!panelEl) return;

        const statusTextEl = document.getElementById("vignova-agent-status-text");
        const progressEl = document.getElementById("vignova-agent-progress");
        const dot = panelEl.querySelector(".vignova-agent-status-dot");

        if (!statusTextEl) return;

        // Map status to display text + color
        const statusMap = {
            started: { text: "Starting Agent...", color: "#3b82f6", animate: true },
            observing: { text: "Observing form...", color: "#f59e0b", animate: true },
            waiting_for_form: { text: "Waiting for form...", color: "#f59e0b", animate: true },
            observed: { text: `Found ${event.fields || 0} fields`, color: "#3b82f6" },
            ats_detected: { text: `ATS: ${event.platform}`, color: "#10b981" },
            filling: { text: `Filling fields...`, color: "#8b5cf6", animate: true },
            filled: { text: `Filled ${event.success} fields`, color: "#10b981" },
            ai_thinking: { text: `AI analyzing fields...`, color: "#f59e0b", animate: true },
            ai_filling: { text: `AI filling fields...`, color: "#8b5cf6", animate: true },
            ai_filled: { text: `AI filled ${event.success} fields`, color: "#10b981" },
            ai_no_actions: { text: "AI check complete", color: "#6b7280" },
            navigating: { text: `Navigating...`, color: "#f59e0b", animate: true },
            ready_to_submit: { text: "Form filled successfully! ✅", color: "#10b981" },
            paused: { text: "Paused ⏸", color: "#f59e0b" },
            resumed: { text: "Resuming ▶", color: "#3b82f6" },
            stopped: { text: "Stopped ⏹", color: "#6b7280" },
            done: { text: "Form filled successfully! ✅", color: "#10b981" },
            error: { text: `Error: ${event.message || "Failed"}`, color: "#ef4444" },
            max_iterations: { text: "Safety limit reached", color: "#f59e0b" },
        };

        const info = statusMap[event.status] || { text: event.status, color: "#6b7280" };

        statusTextEl.textContent = info.text;
        statusTextEl.style.color = info.color;

        if (dot) {
            dot.style.backgroundColor = info.color;
            dot.classList.toggle("vignova-agent-pulse", !!info.animate);
        }

        // Update progress
        if (event.iteration) {
            progressEl.textContent = `Step ${event.iteration}`;
            progressEl.style.display = "inline-block";
        } else {
            progressEl.style.display = "none";
        }
    }

    /**
     * Remove the panel.
     */
    function handlePause() {
        const btn = document.getElementById("vignova-agent-pause");
        const loop = window.Vignova_AgentLoop;

        // If the agent hasn't started yet, use this button to start it.
        if (!loop || !window.vignova_agent_running) {
            if (typeof window.vignova_start_agent === "function") {
                window.vignova_start_agent();
                btn.textContent = "⏸️";
                btn.title = "Pause";
            }
            return;
        }

        const state = loop.getState();
        if (state.isPaused) {
            loop.resume();
            btn.textContent = "⏸️";
            btn.title = "Pause";
        } else {
            loop.pause();
            btn.textContent = "▶️";
            btn.title = "Resume";
        }
    }

    /**
     * Handle stop.
     */
    function handleStop() {
        const loop = window.Vignova_AgentLoop;
        if (loop) loop.stop();
        setTimeout(destroy, 1000);
    }


    function destroy() {
        const el = document.getElementById(PANEL_ID);
        if (el) el.remove();
        panelEl = null;
        logEntries = [];
    }

    return { create, updateStatus, destroy };
})();

if (typeof window !== "undefined") {
    window.Vignova_AgentUI = AgentUI;
}
