/**
 * Vignova Agent — Content Script Entry Point (Auto-Apply)
 * 
 * With all_frames: true, this script loads in BOTH the parent page
 * and any iframes. The logic:
 *   - Parent page: Listens for START_AGENT, checks for iframes, forwards message
 *   - Iframe: Listens for START_AGENT, runs the agent loop
 */

(function () {
    "use strict";

    let agentStarted = false;
    const isInIframe = (window !== window.top);

    // Listen for cross-frame messages via background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "START_AGENT") {
            if (agentStarted) {
                sendResponse({ success: false, error: "Agent already running" });
                return;
            }

            if (isInIframe) {
                startAgent();
                sendResponse({ success: true, context: "iframe" });
            } else {
                const hasFields = document.querySelectorAll("input, textarea, select").length > 3;
                if (hasFields) {
                    startAgent();
                    sendResponse({ success: true, context: "parent" });
                } else {
                    sendResponse({ success: true, context: "delegated_to_iframe" });
                }
            }
            return true;
        }

        if (message.type === "STOP_AGENT") {
            if (agentStarted) stopAgent();
            sendResponse({ success: true });
            return true;
        }

        if (message.type === "GET_AGENT_STATE") {
            const loop = window.Vignova_AgentLoop;
            sendResponse(loop ? loop.getState() : { isRunning: false });
            return true;
        }

        // Pub-Sub UI State (Received by TOP frame to render UI)
        if (message.type === "AGENT_UPDATE_STATUS") {
            if (!isInIframe) {
                // If dashboard is open, forward status to the iframe popup
                const iframe = document.getElementById("vignova-dashboard-iframe");
                if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: "Vignova_AGENT_STATUS",
                        status: message.event.status,
                        text: message.event.text,
                        progress: message.event.progress
                    }, "*");
                }
            }
            sendResponse({ success: true });
            return true;
        }

        // Dashboard Toggle (From Background Script)
        if (message.type === "TOGGLE_DASHBOARD") {
            if (!isInIframe) {
                const container = document.getElementById("vignova-dashboard-container");
                const currentlyHidden = !container || container.style.display === "none";
                const newState = currentlyHidden;
                toggleDashboard(newState);
                chrome.storage.local.set({ vignova_ui_state: newState ? "maximized" : "minimized" });
            }
            sendResponse({ success: true });
            return true;
        }

        // Dashboard Mount Evaluation (From Iframe via Background)
        if (message.type === "EVALUATE_MOUNT_DASHBOARD") {
            if (!isInIframe) {
                chrome.storage.local.get(["vignova_ui_state"], (result) => {
                    const shouldMaximize = result.vignova_ui_state === "maximized";
                    toggleDashboard(shouldMaximize);
                });
            }
            sendResponse({ success: true });
            return true;
        }

        // Pub-Sub Button Controls (Received by all frames, acted on by execution frame)
        if (message.type === "AGENT_CONTROL_COMMAND") {
            if (message.command === "pause_or_start") {
                const Loop = window.Vignova_AgentLoop;
                const ats = window.Vignova_ATSDetector ? window.Vignova_ATSDetector.detect() : null;
                const hasFields = document.querySelectorAll("input, textarea, select").length > 3;

                if (agentStarted && Loop) {
                    if (Loop.getState().isPaused) Loop.resume(); else Loop.pause();
                } else if (!agentStarted && (ats || hasFields || isInIframe)) {
                    // This frame is qualified to run the agent
                    startAgent();
                }
            } else if (message.command === "stop") {
                if (agentStarted) stopAgent();
            }
            sendResponse({ success: true });
            return true;
        }
    });

    /**
     * Start the agent.
     */
    function startAgent() {
        agentStarted = true;
        window.vignova_agent_running = true;

        const Loop = window.Vignova_AgentLoop;
        if (!Loop) {
            console.error("[Vignova Agent] Modules not loaded.");
            return;
        }

        sendUIStatus({ status: "started", text: "Starting Agent..." });

        Loop.start((event) => {
            sendUIStatus(event);

            if (event.status === "stopped" || event.status === "done" || event.status === "error") {
                agentStarted = false;
                window.vignova_agent_running = false;
            }
        });
    }

    /**
     * Dispatch status centrally so top frame renders it
     */
    function sendUIStatus(event) {
        if (!isInIframe) {
            const iframe = document.getElementById("vignova-dashboard-iframe");
            if (iframe && iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    type: "Vignova_AGENT_STATUS",
                    status: event.status,
                    text: event.text,
                    progress: event.progress
                }, "*");
            }
        } else {
            chrome.runtime.sendMessage({ type: "AGENT_UPDATE_STATUS", event: event });
        }
    }

    /**
     * Stop the agent.
     */
    function stopAgent() {
        const Loop = window.Vignova_AgentLoop;
        if (Loop) Loop.stop();
        sendUIStatus({ status: "stopped", text: "Agent stopped." });
        agentStarted = false;
        window.vignova_agent_running = false;
    }

    // Expose start function for the UI Play button
    window.vignova_start_agent = startAgent;

    // Log where we loaded
    if (isInIframe) {
        console.log("[Vignova] Auto-Apply agent loaded in iframe:", window.location.hostname);
    } else {
        console.log("[Vignova] Auto-Apply agent loaded in parent page.");
    }

    // Cross-Frame Dashboard Drag Logic
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let startLeft = 0;
    let startTop = 0;

    window.addEventListener("message", (e) => {
        // Must come from our own extension URL
        if (!e.origin.startsWith("chrome-extension://")) return;

        if (e.data.type === "Vignova_DRAG_START") {
            const container = document.getElementById("vignova-dashboard-container");
            const iframe = document.getElementById("vignova-dashboard-iframe");
            if (!container || !iframe) return;

            isDragging = true;
            dragStartX = e.data.clientX;
            dragStartY = e.data.clientY;

            const rect = container.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            // Important: disable pointer events on iframe so mousemove fires on parent document
            iframe.style.pointerEvents = "none";
        }

        if (e.data.type === "Vignova_CLOSE_DASHBOARD") {
            toggleDashboard(false);
            chrome.storage.local.set({ vignova_ui_state: "minimized" });
        }
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        const container = document.getElementById("vignova-dashboard-container");
        if (!container) return;

        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;

        container.style.left = `${startLeft + dx}px`;
        container.style.top = `${startTop + dy}px`;
        container.style.right = "auto";
        container.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
        if (!isDragging) return;
        isDragging = false;
        const iframe = document.getElementById("vignova-dashboard-iframe");
        if (iframe) iframe.style.pointerEvents = "auto"; // Restore interaction
    });

    // Helper to get or create minimize pill
    function getMinimizeButton() {
        let btn = document.getElementById("vignova-minimized-btn");
        if (!btn) {
            btn = document.createElement("div");
            btn.id = "vignova-minimized-btn";
            btn.style.position = "fixed";
            btn.style.top = "50%";
            btn.style.right = "0";
            btn.style.transform = "translateY(-50%)";
            btn.style.zIndex = "2147483647";
            btn.style.background = "#ffffff";
            btn.style.display = "none";
            btn.style.border = "1px solid #e2e8f0";
            btn.style.borderRight = "none";
            btn.style.boxShadow = "-4px 0 16px rgba(0,0,0,0.1)";
            btn.style.padding = "5px";
            btn.style.paddingRight = "4px";
            btn.style.borderRadius = "12px 0 0 12px";
            btn.style.cursor = "pointer";
            btn.style.transition = "transform 0.2s, box-shadow 0.2s";

            // Hover effect
            btn.addEventListener("mouseenter", () => {
                if (!btn.isDragging) {
                    btn.style.boxShadow = "-6px 0 20px rgba(0,0,0,0.15)";
                    btn.style.transform = "translateY(-50%) translateX(-2px)";
                }
            });
            btn.addEventListener("mouseleave", () => {
                if (!btn.isDragging) {
                    btn.style.boxShadow = "-4px 0 16px rgba(0,0,0,0.1)";
                    btn.style.transform = "translateY(-50%)";
                }
            });

            btn.title = "Open Vignova (Drag to move)";

            // Vignova logo on black background
            btn.innerHTML = `<div style="background:#0f0f0f;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:center;"><img src="${chrome.runtime.getURL('icons/logo.png')}" style="width:32px;height:32px;object-fit:contain;"></div>`;

            // Drag logic
            let isDraggingBtn = false;
            let startY = 0;
            let startTopBtn = 0;
            let hasMoved = false;

            btn.addEventListener("mousedown", (e) => {
                isDraggingBtn = true;
                hasMoved = false;
                startY = e.clientY;
                btn.isDragging = true;

                // Get current top in px
                const rect = btn.getBoundingClientRect();
                // Because transform: translateY(-50%) is active, rect.top is the visual top.
                // We want to track the center of the button (which corresponds to 'top' CSS prop with translateY(-50%))
                startTopBtn = rect.top + (rect.height / 2);

                btn.style.transition = "none"; // Disable CSS transition while dragging
                e.preventDefault(); // Prevent text selection
            });

            window.addEventListener("mousemove", (e) => {
                if (!isDraggingBtn) return;

                const dy = e.clientY - startY;
                if (Math.abs(dy) > 3) hasMoved = true; // Threshold to differenciate click vs drag

                let newTop = startTopBtn + dy;
                // Constrain to viewport
                newTop = Math.max(20, Math.min(window.innerHeight - 20, newTop));

                btn.style.top = `${newTop}px`;
            });

            window.addEventListener("mouseup", (e) => {
                if (!isDraggingBtn) return;
                isDraggingBtn = false;
                btn.isDragging = false;
                btn.style.transition = "transform 0.2s, background 0.2s"; // Restore

                if (hasMoved) {
                    // Save position
                    chrome.storage.local.set({ vignova_ui_y: btn.style.top });
                } else {
                    // It was a click
                    toggleDashboard(true);
                    chrome.storage.local.set({ vignova_ui_state: "maximized" });
                }
            });

            // Load saved position
            chrome.storage.local.get(["vignova_ui_y"], (result) => {
                if (result.vignova_ui_y) {
                    btn.style.top = result.vignova_ui_y;
                }
            });

            document.body.appendChild(btn);
        }
        return btn;
    }

    /**
     * Inject or toggle the full popup.html dashboard
     * @param {boolean} [forceShow]
     */
    function toggleDashboard(forceShow = undefined) {
        if (isInIframe) return; // Only top window mounts dashboard

        let container = document.getElementById("vignova-dashboard-container");
        const minBtn = getMinimizeButton();

        if (container) {
            const isHidden = container.style.display === "none" || container.style.opacity === "0";
            const willShow = forceShow !== undefined ? forceShow : isHidden;

            if (willShow) {
                container.style.display = "block";
                // Slight delay to allow display:block to apply before animating
                requestAnimationFrame(() => {
                    container.style.opacity = "1";
                    container.style.transform = "translateX(0)";
                });
                minBtn.style.display = "none";
            } else {
                container.style.opacity = "0";
                container.style.transform = "translateX(20px)";
                minBtn.style.display = "flex";
                setTimeout(() => {
                    if (container.style.opacity === "0") container.style.display = "none";
                }, 200); // Wait for transition
            }
            return;
        }

        // Create Container
        container = document.createElement("div");
        container.id = "vignova-dashboard-container";

        // Initial Styles - Aligned to right edge, full vertical height
        container.style.position = "fixed";
        container.style.top = "12px";
        container.style.bottom = "12px";
        container.style.right = "12px";
        container.style.width = "380px";
        container.style.height = "calc(100vh - 24px)";
        container.style.zIndex = "2147483647";
        container.style.borderRadius = "12px";
        container.style.boxShadow = "0 12px 40px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)";
        container.style.border = "1px solid #e2e8f0";
        container.style.overflow = "hidden";
        container.style.background = "#ffffff";
        container.style.transition = "opacity 0.2s, transform 0.2s";

        const willShow = forceShow !== undefined ? forceShow : true;
        container.style.display = willShow ? "block" : "none";
        if (willShow) {
            container.style.opacity = "1";
            container.style.transform = "translateX(0)";
        } else {
            container.style.opacity = "0";
            container.style.transform = "translateX(20px)";
        }

        // Create Iframe pointing to popup
        const iframe = document.createElement("iframe");
        iframe.id = "vignova-dashboard-iframe";
        iframe.src = chrome.runtime.getURL("popup/popup.html") + "?mode=dashboard";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.style.display = "block";
        iframe.allow = "clipboard-write";

        container.appendChild(iframe);
        document.body.appendChild(container);

        // Make sure minimize button state matches the initial state
        minBtn.style.display = willShow ? "none" : "flex";
    }

    // Auto-inject UI if ATS is detected
    setTimeout(() => {
        const ats = window.Vignova_ATSDetector ? window.Vignova_ATSDetector.detect() : null;
        const hasFields = document.querySelectorAll("input, textarea, select").length > 3;

        if (ats || hasFields) {
            if (!isInIframe && !agentStarted) {
                chrome.storage.local.get(["vignova_ui_state"], (result) => {
                    const shouldMaximize = result.vignova_ui_state === "maximized";
                    toggleDashboard(shouldMaximize);
                });
            } else if (isInIframe && !agentStarted) {
                // Iframe tells the top window it should show the dashboard (in its saved state)
                chrome.runtime.sendMessage({ type: "SHOULD_MOUNT_DASHBOARD" });
            }
        }
    }, 1500);
})();
