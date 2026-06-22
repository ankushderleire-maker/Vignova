/**
 * Vignova Extension — File Input Interceptor
 * 
 * Silently intercepts clicks on native file upload inputs to prevent the OS 
 * file dialog from opening. Shows the Vignova server document picker instead,
 * with an elegant fallback to open the native OS file picker.
 */

(function () {
    "use strict";

    // Skip on sites that have their own dedicated Vignova content scripts.
    // The generic file interceptor adds a modal overlay + MutationObserver
    // that conflicts with LinkedIn's/Indeed's SPA rendering.
    const hostname = window.location.hostname;
    if (hostname.includes("linkedin.com") || hostname.includes("indeed.com")) {
        return;
    }

    let documentsCache = null;

    // Inject CSS for the UI
    const style = document.createElement("style");
    style.textContent = `
        /* Modal Overlay */
        .vignova-doc-modal-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            backdrop-filter: blur(2px);
            z-index: 2147483647 !important;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: none;
        }
        .vignova-doc-modal-overlay.vignova-visible {
            opacity: 1 !important;
            pointer-events: auto !important;
        }
        
        /* Modal Box */
        .vignova-doc-modal {
            background: #fff;
            border-radius: 12px;
            width: 480px;
            max-width: 90vw;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            transform: scale(0.95);
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .vignova-doc-modal-overlay.vignova-visible .vignova-doc-modal {
            transform: scale(1);
        }

        .vignova-modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8fafc;
        }
        .vignova-modal-header h3 {
            margin: 0;
            font-size: 16px;
            color: #111827;
            font-weight: 600;
        }
        .vignova-modal-close {
            background: none;
            border: none;
            font-size: 20px;
            color: #94a3b8;
            cursor: pointer;
            padding: 4px;
            line-height: 1;
        }
        .vignova-modal-close:hover { color: #ef4444; }

        .vignova-doc-list {
            padding: 12px;
            overflow-y: auto;
            flex: 1;
            background: #fff;
            min-height: 150px;
        }
        
        .vignova-doc-item {
            display: flex;
            align-items: center;
            padding: 12px 14px;
            border: 1px solid #f1f5f9;
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.15s;
        }
        .vignova-doc-item:hover {
            border-color: #bae6fd;
            background: #f0f9ff;
        }
        
        .vignova-doc-icon {
            font-size: 24px;
            margin-right: 12px;
        }
        .vignova-doc-info {
            flex: 1;
        }
        .vignova-doc-title {
            font-size: 14px;
            font-weight: 600;
            color: #1e293b;
            margin-bottom: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 320px;
        }
        .vignova-doc-meta {
            font-size: 12px;
            color: #64748b;
        }
        
        .vignova-loading {
            padding: 40px;
            text-align: center;
            color: #64748b;
            font-size: 14px;
        }
        
        .vignova-download-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }

        .vignova-modal-footer {
            padding: 12px 20px;
            border-top: 1px solid #eee;
            background: #f8fafc;
        }

        .vignova-local-upload-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 10px;
            background: #fff;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            color: #475569;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }
        .vignova-local-upload-btn:hover {
            background: #f1f5f9;
            color: #0f172a;
        }
        .vignova-local-upload-btn svg {
            width: 16px; height: 16px; margin-right: 8px; fill: currentColor;
        }

        .vignova-spinner {
            width: 30px;
            height: 30px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #0ea5e9;
            border-radius: 50%;
            animation: vignova-spin 1s linear infinite;
            margin-bottom: 12px;
        }
        @keyframes vignova-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);

    // Create Modal UI
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'vignova-doc-modal-overlay';

    let activeFileInput = null; // Stored target

    modalOverlay.innerHTML = `
        <div class="vignova-doc-modal">
            <div class="vignova-modal-header">
                <h3>Select Document to Upload</h3>
                <button class="vignova-modal-close">&times;</button>
            </div>
            <div class="vignova-doc-list" id="vignova-doc-list">
                <div class="vignova-loading">
                    <div class="vignova-spinner" style="margin: 0 auto 12px;"></div>
                    Loading your generated documents...
                </div>
            </div>
            <div class="vignova-modal-footer">
                <button class="vignova-local-upload-btn" id="vignova-local-upload-btn">
                    <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
                    Or upload from your computer
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modalOverlay);

    // Event Listeners for Modal
    modalOverlay.querySelector('.vignova-modal-close').addEventListener('click', () => {
        modalOverlay.classList.remove('vignova-visible');
    });
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.classList.remove('vignova-visible');
    });

    document.getElementById('vignova-local-upload-btn').addEventListener('click', () => {
        modalOverlay.classList.remove('vignova-visible');
        if (activeFileInput) {
            // Set flag so our interceptor ignores the next click event
            activeFileInput.dataset.vignovaAllowNative = 'true';
            activeFileInput.click();
        }
    });

    /**
     * Converts a base64 string directly to a Blob 
     */
    function base64ToBlob(base64, mimeType = 'application/pdf') {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    /**
     * Simulate file upload on the native input
     */
    function attachBlobToInput(inputElement, blob, filename) {
        try {
            const dataTransfer = new DataTransfer();
            const file = new File([blob], filename, { type: blob.type });
            dataTransfer.items.add(file);

            inputElement.files = dataTransfer.files;

            // Dispatch events
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));

            // Bypass React virtual DOM setter if present
            const tracker = inputElement._valueTracker;
            if (tracker) tracker.setValue("");

            console.log(`[Vignova File Interceptor] Attached ${filename} successfully!`);
            modalOverlay.classList.remove('vignova-visible');
        } catch (e) {
            console.error("[Vignova File Interceptor] Failed to attach file blob", e);
            alert("Failed to inject document.");
        }
    }

    /**
     * Handle document selection
     */
    async function handleDocumentSelect(docId, docType) {
        const listContainer = document.getElementById("vignova-doc-list");

        const downloadOverlay = document.createElement('div');
        downloadOverlay.className = 'vignova-download-overlay';
        downloadOverlay.innerHTML = `
            <div class="vignova-spinner"></div>
            <div style="font-weight:600; color:#0ea5e9;">Generating PDF...</div>
            <div style="font-size:12px; color:#64748b; margin-top:4px;">Fetching directly from server</div>
        `;
        listContainer.appendChild(downloadOverlay);

        try {
            const result = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    type: "API_DOWNLOAD_DOCUMENT",
                    data: { documentId: docId, docType }
                }, resolve);
            });

            if (result && result.success && result.pdfBase64) {
                const blob = base64ToBlob(result.pdfBase64, result.mimeType || 'application/pdf');
                attachBlobToInput(activeFileInput, blob, result.filename);
                if (downloadOverlay.parentNode) downloadOverlay.remove();
            } else {
                alert("Failed to download PDF: " + (result?.error || "Unknown error"));
                if (downloadOverlay.parentNode) downloadOverlay.remove();
            }
        } catch (err) {
            console.error(err);
            alert("Error communicating with background worker.");
            if (downloadOverlay.parentNode) downloadOverlay.remove();
        }
    }

    /**
     * Render documents into modal
     */
    function renderDocuments(documents) {
        const listContainer = document.getElementById("vignova-doc-list");

        if (!documents || documents.length === 0) {
            listContainer.innerHTML = `
                <div class="vignova-loading">
                    <div style="font-size:24px; margin-bottom:8px;">📄</div>
                    No documents found.<br>
                    <span style="font-size:12px;">Generate a resume or cover letter inside the dashboard first.</span>
                </div>
            `;
            return;
        }

        const formatDate = (ds) => {
            const d = new Date(ds);
            return d.toLocaleDateString() + ' at ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        const html = documents.map(doc => `
            <div class="vignova-doc-item" data-id="${doc.id}" data-type="${doc.type}">
                <div class="vignova-doc-icon">${doc.type === 'resume' ? '📝' : '✉️'}</div>
                <div class="vignova-doc-info">
                    <div class="vignova-doc-title" title="${doc.name}">${doc.name}</div>
                    <div class="vignova-doc-meta">${doc.type === 'resume' ? 'Resume' : 'Cover Letter'} • Generated ${formatDate(doc.createdAt)}</div>
                </div>
            </div>
        `).join('');

        listContainer.innerHTML = html;

        listContainer.querySelectorAll('.vignova-doc-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const type = e.currentTarget.getAttribute('data-type');
                handleDocumentSelect(id, type);
            });
        });
    }

    /**
     * Load documents from API and show modal
     */
    function openDocumentModal(inputElement) {
        activeFileInput = inputElement;
        modalOverlay.classList.add('vignova-visible');

        const listContainer = document.getElementById("vignova-doc-list");

        if (documentsCache && documentsCache.timestamp > Date.now() - (5 * 60 * 1000)) {
            renderDocuments(documentsCache.data);
            return;
        }

        listContainer.innerHTML = `
            <div class="vignova-loading">
                <div class="vignova-spinner" style="margin: 0 auto 12px;"></div>
                Loading your generated documents...
            </div>
        `;

        chrome.runtime.sendMessage({ type: "API_GET_DOCUMENTS" }, (result) => {
            if (result && result.success) {
                documentsCache = { data: result.documents, timestamp: Date.now() };
                renderDocuments(result.documents);
            } else {
                listContainer.innerHTML = `
                    <div class="vignova-loading" style="color:#ef4444;">
                        Failed to fetch documents.<br>
                        ${result?.error || "Are you logged in?"}
                    </div>
                `;
            }
        });
    }

    /**
     * Scan the DOM for uninstrumented file inputs and silently intercept clicks
     */
    function interceptFileInputs() {
        const fileInputs = document.querySelectorAll('input[type="file"]:not([data-vignova-intercepted])');

        fileInputs.forEach(input => {
            const accept = input.getAttribute('accept') || "";
            if (accept.includes('image') && !accept.includes('pdf')) return; // Ignore profile photo uploads

            input.setAttribute('data-vignova-intercepted', 'true');

            // Intercept the click natively
            input.addEventListener('click', (e) => {
                // If the user deliberately clicked "Upload from computer" in our modal, let it pass
                if (input.dataset.vignovaAllowNative === 'true') {
                    // Reset flag for next time
                    input.dataset.vignovaAllowNative = 'false';
                    return;
                }

                // Otherwise, abort the native OS file picker and show Vignova Selector instead
                e.preventDefault();
                openDocumentModal(input);
            });
        });
    }

    // Run automatically
    interceptFileInputs();

    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        for (const mut of mutations) {
            if (mut.addedNodes.length > 0) {
                shouldCheck = true;
                break;
            }
        }
        if (shouldCheck) {
            clearTimeout(window._vignovaUploadTimer);
            window._vignovaUploadTimer = setTimeout(interceptFileInputs, 300);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    console.log("[Vignova] File Interceptor Active — Silently monitoring file inputs.");
})();
