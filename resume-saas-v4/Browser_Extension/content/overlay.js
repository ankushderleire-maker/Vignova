/**
 * Vignova Extension — Overlay Manager
 * Manages the result/loading overlay shown on LinkedIn/Indeed.
 * Must be loaded BEFORE linkedin.js / indeed.js
 */

const Vignova_Overlay = {
    backdrop: null,
    overlay: null,
    _currentJobData: null,

    /**
     * Show loading state
     */
    showLoading() {
        this.remove(); // Clear any existing overlay

        // Backdrop
        this.backdrop = document.createElement("div");
        this.backdrop.className = "vignova-overlay-backdrop";
        document.body.appendChild(this.backdrop);

        // Overlay
        this.overlay = document.createElement("div");
        this.overlay.className = "vignova-overlay";
        this.overlay.innerHTML = `
            <div class="vignova-overlay-header">
                <span class="vignova-overlay-brand"><img src="${chrome.runtime.getURL('icons/logo.png')}" style="width:22px;height:22px;object-fit:contain;vertical-align:middle;margin-right:4px;"> VIGNOVA</span>
                <button class="vignova-overlay-close" id="vignova-close-overlay">✕</button>
            </div>
            <div class="vignova-overlay-body">
                <div class="vignova-overlay-loading">
                    <div style="width: 160px; height: 160px; margin: 0 auto -20px auto; filter: drop-shadow(0 0 15px var(--primary)) hue-rotate(15deg) contrast(1.2);">
                        <iframe src="${chrome.runtime.getURL('assets/lottie.html')}" style="width: 100%; height: 100%; border: none;" allowtransparency="true"></iframe>
                    </div>
                    <div class="vignova-overlay-loading-text">Generating Tailored Resume...</div>
                    <div class="vignova-overlay-loading-sub">AI is analyzing the job description and your profile</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Close handler
        this.overlay.querySelector("#vignova-close-overlay").addEventListener("click", () => {
            this.remove();
        });

        // Click backdrop to close
        this.backdrop.addEventListener("click", () => {
            this.remove();
        });
    },

    /**
     * Show success state with PDF download
     */
    showSuccess(pdfBase64, fileName, creditsRemaining) {
        if (!this.overlay) return;

        const body = this.overlay.querySelector(".vignova-overlay-body");
        body.innerHTML = `
            <span class="vignova-overlay-success-icon">🎉</span>
            <div class="vignova-overlay-success-title">Resume Ready!</div>
            <div class="vignova-overlay-success-sub">Your tailored resume has been generated and saved to your Vignova dashboard.</div>
            ${pdfBase64 ? `
                <button class="vignova-overlay-download-btn" id="vignova-download-pdf">
                    📥 Download PDF
                </button>
            ` : `
                <a href="http://localhost:3000/dashboard" target="_blank" class="vignova-overlay-download-btn">
                    Open Dashboard
                </a>
            `}
            <a href="http://localhost:3000/dashboard" target="_blank" class="vignova-overlay-view-btn">
                View in Vignova Dashboard →
            </a>
            <div class="vignova-overlay-credits">
                Credits remaining: <strong>${creditsRemaining}</strong>
            </div>
        `;

        // PDF download handler
        if (pdfBase64) {
            body.querySelector("#vignova-download-pdf").addEventListener("click", () => {
                this._downloadPdf(pdfBase64, fileName);
            });
        }
    },

    /**
     * Show error state
     */
    showError(errorMessage, retryCallback) {
        if (!this.overlay) {
            this.showLoading(); // Create overlay if not exists
        }

        const body = this.overlay.querySelector(".vignova-overlay-body");
        body.innerHTML = `
            <span class="vignova-overlay-error-icon">⚠️</span>
            <div class="vignova-overlay-error-title">Generation Failed</div>
            <div class="vignova-overlay-error-msg">${errorMessage}</div>
            ${retryCallback ? '<button class="vignova-overlay-retry-btn" id="vignova-retry-btn">🔄 Try Again</button>' : ""}
        `;

        if (retryCallback) {
            body.querySelector("#vignova-retry-btn").addEventListener("click", () => {
                retryCallback();
            });
        }
    },

    /**
     * Download PDF from base64
     */
    _downloadPdf(base64, fileName = "resume.pdf") {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Remove overlay from DOM
     */
    remove() {
        if (this.backdrop) {
            this.backdrop.remove();
            this.backdrop = null;
        }
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    },
};
