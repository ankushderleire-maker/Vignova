/**
 * Vignova Extension — Overlay Manager
 * Manages the result/loading overlay shown on LinkedIn/Indeed.
 * Must be loaded BEFORE linkedin.js / indeed.js
 */

// ── JD Review Panel ────────────────────────────────────────────────────
// Shows an inline editable panel so the user can verify and correct the
// scraped job description before generation starts.
const Vignova_JDReview = {
    _panel: null,
    _highlightedEl: null,

    /**
     * @param {object} jobData         - scraped job data (jobDescription, jobTitle…)
     * @param {Element|null} descriptionEl - the DOM element that was scraped
     * @param {Element} anchorContainer  - the injected button bar (panel inserts after it)
     * @param {function} onConfirm      - called with the (possibly edited) JD string
     * @param {function} onCancel       - called when the user dismisses the panel
     */
    show(jobData, descriptionEl, anchorContainer, onConfirm, onCancel) {
        this.hide();

        // Highlight the source element so the user can see what was scraped
        if (descriptionEl) {
            this._highlightedEl = descriptionEl;
            descriptionEl.classList.add('vignova-jd-highlight');
            descriptionEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        // Build panel
        this._panel = document.createElement('div');
        this._panel.className = 'vignova-jdr-panel';
        this._panel.innerHTML = `
            <div class="vignova-jdr-header">
                <div class="vignova-jdr-header-left">
                    <span class="vignova-jdr-dot"></span>
                    <div>
                        <div class="vignova-jdr-title">Confirm Job Description</div>
                        <div class="vignova-jdr-subtitle">Highlighted below · Edit anything that's missing before generating</div>
                    </div>
                </div>
                <button class="vignova-jdr-cancel-x" id="vignova-jdr-cancel-x" title="Cancel">✕</button>
            </div>
            <textarea class="vignova-jdr-textarea" id="vignova-jdr-textarea" placeholder="Job description…" spellcheck="false"></textarea>
            <div class="vignova-jdr-footer">
                <span class="vignova-jdr-char-count" id="vignova-jdr-char-count">0 chars</span>
                <div class="vignova-jdr-actions">
                    <button class="vignova-jdr-btn-cancel" id="vignova-jdr-btn-cancel">Cancel</button>
                    <button class="vignova-jdr-btn-generate" id="vignova-jdr-btn-generate">⚡ Generate Resume</button>
                </div>
            </div>
        `;

        // Set textarea value safely (no innerHTML injection)
        const textarea = this._panel.querySelector('#vignova-jdr-textarea');
        textarea.value = jobData.jobDescription || '';

        // Char count
        const charCount = this._panel.querySelector('#vignova-jdr-char-count');
        charCount.textContent = `${textarea.value.length.toLocaleString()} chars`;
        textarea.addEventListener('input', () => {
            charCount.textContent = `${textarea.value.length.toLocaleString()} chars`;
        });

        // Insert right after the anchor container so it flows below the button bar
        if (anchorContainer && anchorContainer.parentNode) {
            anchorContainer.parentNode.insertBefore(this._panel, anchorContainer.nextSibling);
        } else {
            document.body.appendChild(this._panel);
        }

        // Cancel
        const cancelFn = () => { this.hide(); if (onCancel) onCancel(); };
        this._panel.querySelector('#vignova-jdr-cancel-x').addEventListener('click', cancelFn);
        this._panel.querySelector('#vignova-jdr-btn-cancel').addEventListener('click', cancelFn);

        // Confirm
        this._panel.querySelector('#vignova-jdr-btn-generate').addEventListener('click', () => {
            const confirmed = textarea.value.trim();
            this.hide();
            if (onConfirm) onConfirm(confirmed);
        });
    },

    hide() {
        if (this._highlightedEl) {
            this._highlightedEl.classList.remove('vignova-jd-highlight');
            this._highlightedEl = null;
        }
        if (this._panel) {
            this._panel.remove();
            this._panel = null;
        }
    },
};

/**
 * Line-art icons.
 *
 * Drawn here rather than pulled from an emoji font: emoji render differently
 * on every platform, carry their own colours, and read as decoration next to
 * a paid product. These inherit `currentColor` and scale with the box.
 */
const VG_ICON = {
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    person: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg>`,
    spark: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1c.9 5.6 4.5 9.2 10.1 10.1C16.5 12 12.9 15.6 12 21.2 11.1 15.6 7.5 12 1.9 11.1 7.5 10.2 11.1 6.6 12 1z"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/></svg>`,
    monitor: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="12.5" rx="2"/><path d="M9 20h6M12 16.5V20"/></svg>`,
    doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2.5H7.5A2 2 0 0 0 5.5 4.5v15a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z"/><path d="M14 2.5V7h4.5"/><path d="M9 13h6M9 16.5h4"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M3.5 7.5l7.3 5.4a2 2 0 0 0 2.4 0l7.3-5.4"/></svg>`,
    plane: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 3.5L2.5 10.4l7.1 2.9 2.9 7.2z"/><path d="M21.5 3.5L9.6 13.3"/></svg>`,
    download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v11"/><path d="M7.5 10L12 14.5 16.5 10"/><path d="M4 17.5v1.5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"/></svg>`,
    copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M15 6V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1"/></svg>`,
    check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5 10-11"/></svg>`,
    arrow: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15"/><path d="M13.5 6.5L20 12l-6.5 5.5"/></svg>`,
    coins: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="6.5" rx="7.5" ry="3.2"/><path d="M4.5 6.5v4c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2v-4"/><path d="M4.5 10.5v4c0 1.8 3.4 3.2 7.5 3.2s7.5-1.4 7.5-3.2v-4"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5L1.8 20.5h20.4z"/><path d="M12 9.5v5M12 17.8v.2"/></svg>`,
    history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 3.8V9h5.2"/><path d="M12 7.5V12l3 1.8"/></svg>`,
    retry: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3.5V9h-5.5"/></svg>`,

    /** The celebration illustration: a popper, its confetti and a soft halo. */
    popper: `<svg viewBox="0 0 260 160" fill="none">
        <path d="M76 158a56 56 0 0 1 112 0z" fill="#f2effc"/>
        <circle cx="208" cy="44" r="9" fill="#eeeafa"/>
        <circle cx="52" cy="134" r="10" fill="#f1eefb"/>

        <path d="M72 148 L111.7 68 A24 11 42 0 0 147.4 100.1 Z" fill="#4c2ae0"/>
        <path d="M83.9 124.0 L89.5 112.8 L105.2 126.9 L94.6 133.6 Z" fill="#8f7cf2"/>
        <path d="M94.2 103.2 L99.8 92.0 L124.8 114.5 L114.2 121.2 Z" fill="#8f7cf2"/>
        <path d="M104.6 82.4 L110.1 71.2 L144.4 102.1 L133.8 108.8 Z" fill="#8f7cf2"/>
        <ellipse cx="129.5" cy="84.1" rx="24" ry="11" transform="rotate(42 129.5 84.1)" fill="#6b4bf0"/>

        <path d="M99 52c8 5 11 13 9 21" stroke="#f5a623" stroke-width="6.5" stroke-linecap="round"/>
        <path d="M124 50c9-10 21-4 18 7-2 8-13 9-14 1" stroke="#2196f3" stroke-width="6.5" stroke-linecap="round"/>
        <path d="M152 44c5-9 11-9 13-2" stroke="#4c2ae0" stroke-width="6.5" stroke-linecap="round"/>
        <path d="M166 88c6-9 12-2 16 2s10 1 13-7" stroke="#7c2fd6" stroke-width="7" stroke-linecap="round"/>
        <path d="M156 126c9-9 18-6 23 1" stroke="#f5a623" stroke-width="6.5" stroke-linecap="round"/>
        <circle cx="97" cy="88" r="5.5" fill="#2196f3"/>
        <circle cx="168" cy="138" r="5.5" fill="#2196f3"/>
        <circle cx="172" cy="70" r="5.5" fill="#f5a623"/>
        <circle cx="146" cy="60" r="4" fill="#f5a623"/>

        <path d="M56 92c.8 5.2 4.2 8.6 9.4 9.4-5.2.8-8.6 4.2-9.4 9.4-.8-5.2-4.2-8.6-9.4-9.4 5.2-.8 8.6-4.2 9.4-9.4z" fill="#6d3ff5"/>
        <path d="M231 66c.8 5.2 4.2 8.6 9.4 9.4-5.2.8-8.6 4.2-9.4 9.4-.8-5.2-4.2-8.6-9.4-9.4 5.2-.8 8.6-4.2 9.4-9.4z" fill="#6d3ff5"/>
        <path d="M105 30c.5 3.4 2.7 5.6 6.1 6.1-3.4.5-5.6 2.7-6.1 6.1-.5-3.4-2.7-5.6-6.1-6.1 3.4-.5 5.6-2.7 6.1-6.1z" stroke="#8b6bf5" stroke-width="2.2"/>
        <circle cx="216" cy="112" r="3" fill="#c3b4f7"/>
        <circle cx="224" cy="120" r="3" fill="#c3b4f7"/>
        <circle cx="208" cy="120" r="3" fill="#c3b4f7"/>
        <circle cx="216" cy="128" r="3" fill="#c3b4f7"/>
    </svg>`,
};

const Vignova_Overlay = {
    backdrop: null,
    overlay: null,
    _currentJobData: null,
    _progressTimer: null,

    /** The brand row and close button, shared by every state. */
    _chrome() {
        return `
            <div class="vignova-overlay-header">
                <span class="vignova-overlay-brand">
                    <span class="vignova-overlay-logo">V</span>
                    <span class="vignova-overlay-wordmark">VIGNOVA</span>
                </span>
                <button class="vignova-overlay-close" id="vignova-close-overlay" aria-label="Close">${VG_ICON.close}</button>
            </div>
        `;
    },

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
            ${this._chrome()}
            <div class="vignova-overlay-body">
                <div class="vignova-loading">
                    <div class="vignova-loading-top">
                        <div class="vignova-loading-art" aria-hidden="true">
                            <span class="vignova-doc-stack s2"></span>
                            <span class="vignova-doc-stack s1"></span>

                            <span class="vignova-doc">
                                <span class="vignova-doc-head">
                                    <span class="vignova-doc-avatar">${VG_ICON.person}</span>
                                    <span class="vignova-doc-head-lines">
                                        <i class="vignova-doc-line accent w55"></i>
                                        <i class="vignova-doc-line w100"></i>
                                        <i class="vignova-doc-line w70"></i>
                                    </span>
                                </span>
                                <span class="vignova-doc-group">
                                    <i class="vignova-doc-line accent w45"></i>
                                    <i class="vignova-doc-line w100"></i>
                                    <i class="vignova-doc-line live w100"></i>
                                    <i class="vignova-doc-line w75"></i>
                                </span>
                                <span class="vignova-doc-group">
                                    <i class="vignova-doc-line accent w45"></i>
                                    <i class="vignova-doc-line w85"></i>
                                    <i class="vignova-doc-line live w70"></i>
                                    <i class="vignova-doc-line w90"></i>
                                </span>
                            </span>

                            <span class="vignova-doc-badge">
                                <span class="vignova-doc-badge-icon">${VG_ICON.spark}</span>
                                <span class="vignova-doc-badge-text">Crafting<br>Your Resume</span>
                            </span>

                            <span class="vignova-spark s1">${VG_ICON.spark}</span>
                            <span class="vignova-spark s2">${VG_ICON.spark}</span>
                            <span class="vignova-spark s3">${VG_ICON.spark}</span>
                        </div>

                        <div class="vignova-loading-main">
                            <div class="vignova-ring">
                                <svg viewBox="0 0 120 120">
                                    <circle cx="60" cy="60" r="52" fill="none" stroke="#eae6fb" stroke-width="11" />
                                    <circle id="vignova-ring-arc" cx="60" cy="60" r="52" fill="none" stroke="#5b2ef0"
                                            stroke-width="11" stroke-linecap="round" transform="rotate(-90 60 60)"
                                            stroke-dasharray="327" stroke-dashoffset="327" />
                                </svg>
                                <span class="vignova-ring-value" id="vignova-ring-value">0%</span>
                            </div>
                            <h3 class="vignova-loading-title" id="vignova-loading-title">Generating your tailored resume</h3>
                            <p class="vignova-loading-sub">We&rsquo;re analyzing the job description, matching it with your profile, and building an ATS-friendly draft.</p>

                            <ol class="vignova-steps">
                                <li class="vignova-step" data-step="0"><span class="vignova-step-dot"></span><span class="vignova-step-label">Reading<br>job post</span></li>
                                <li class="vignova-step" data-step="1"><span class="vignova-step-dot"></span><span class="vignova-step-label">Matching<br>profile</span></li>
                                <li class="vignova-step" data-step="2"><span class="vignova-step-dot"></span><span class="vignova-step-label">Building<br>resume</span></li>
                            </ol>
                        </div>
                    </div>

                    <div class="vignova-loading-foot">
                        <span class="vignova-foot-item">${VG_ICON.clock} Usually takes 15&ndash;30 seconds</span>
                        <span class="vignova-foot-item">${VG_ICON.monitor} You can keep browsing while we prepare your resume.</span>
                    </div>
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

        this._startProgress();
    },

    /**
     * Drives the ring and the three steps.
     *
     * There is no real progress to report — the request is one round trip — so
     * this eases toward 95% and stops, and only completes when the caller
     * swaps in the result. Better an honest "nearly there" than a bar that
     * claims 100% and then sits waiting.
     */
    _startProgress() {
        const arc = this.overlay.querySelector("#vignova-ring-arc");
        const label = this.overlay.querySelector("#vignova-ring-value");
        const steps = [...this.overlay.querySelectorAll(".vignova-step")];
        if (!arc || !label) return;

        const CIRC = 327;
        let value = 0;
        const started = Date.now();

        this._progressTimer = setInterval(() => {
            // Fast at first, asymptotic after — the shape of a wait you cannot measure.
            const seconds = (Date.now() - started) / 1000;
            value = Math.min(95, 95 * (1 - Math.exp(-seconds / 9)));
            arc.setAttribute("stroke-dashoffset", String(CIRC - (CIRC * value) / 100));
            label.textContent = Math.round(value) + "%";

            const reached = value < 33 ? 0 : value < 66 ? 1 : 2;
            steps.forEach((step, i) => {
                step.classList.toggle("done", i < reached);
                step.classList.toggle("active", i === reached);
            });
        }, 120);
    },

    _stopProgress() {
        if (this._progressTimer) {
            clearInterval(this._progressTimer);
            this._progressTimer = null;
        }
    },

    /**
     * Show success state with tabbed results for Resume, Cover Letter, and Email
     */
    showAllResults(pdfBase64, coverLetter, email, fileName, creditsRemaining, focusTab) {
        this._stopProgress();
        if (!this.overlay) return;

        const body = this.overlay.querySelector(".vignova-overlay-body");
        body.innerHTML = `
            <div class="vignova-done-hero" aria-hidden="true">${VG_ICON.popper}</div>
            <div class="vignova-overlay-success-title">Application Pack Ready!</div>
            <div class="vignova-overlay-success-sub">Your tailored resume, cover letter, and email draft are ready.</div>

            <div class="vignova-result-tabs">
                <button class="vignova-rtab active" data-tab="resume">
                    <span class="vignova-rtab-icon">${VG_ICON.doc}</span><span>Resume</span>
                </button>
                <button class="vignova-rtab" data-tab="coverletter">
                    <span class="vignova-rtab-icon">${VG_ICON.mail}</span><span>Cover<br>Letter</span>
                </button>
                <button class="vignova-rtab" data-tab="email">
                    <span class="vignova-rtab-icon">${VG_ICON.plane}</span><span>Email</span>
                </button>
            </div>

            <div class="vignova-rtab-content active" id="vignova-rtab-resume">
                ${pdfBase64 ? `
                    <button class="vignova-overlay-download-btn" id="vignova-download-pdf">
                        ${VG_ICON.download} Download PDF
                    </button>
                ` : `
                    <div class="vignova-overlay-inline-error">We couldn&rsquo;t build the PDF. Your resume data was saved.</div>
                `}
            </div>

            <div class="vignova-rtab-content" id="vignova-rtab-coverletter">
                ${coverLetter ? `
                    <div class="vignova-text-preview">${this._toHtml(coverLetter)}</div>
                    <button class="vignova-overlay-copy-btn" id="vignova-copy-cl">
                        ${VG_ICON.copy} Copy Cover Letter
                    </button>
                ` : `
                    <div class="vignova-overlay-inline-error">We couldn&rsquo;t write the cover letter.</div>
                `}
            </div>

            <div class="vignova-rtab-content" id="vignova-rtab-email">
                ${email ? `
                    <div class="vignova-text-preview">${this._toHtml(email)}</div>
                    <button class="vignova-overlay-copy-btn" id="vignova-copy-email">
                        ${VG_ICON.copy} Copy Email
                    </button>
                ` : `
                    <div class="vignova-overlay-inline-error">We couldn&rsquo;t write the email.</div>
                `}
            </div>

            <a href="https://app.vignova.io/dashboard" target="_blank" class="vignova-overlay-view-btn">
                View in Vignova Dashboard ${VG_ICON.arrow}
            </a>
            <div class="vignova-overlay-credits">
                ${VG_ICON.coins} Credits remaining: <strong>${creditsRemaining}</strong>
            </div>
        `;

        // Tab Switching Logic
        const tabs = body.querySelectorAll('.vignova-rtab');
        const contents = body.querySelectorAll('.vignova-rtab-content');

        // The Cover Letter button opens straight onto its own tab.
        if (focusTab) {
            const wanted = body.querySelector(`.vignova-rtab[data-tab="${focusTab}"]`);
            const wantedPane = body.querySelector(`#vignova-rtab-${focusTab}`);
            if (wanted && wantedPane) {
                tabs.forEach((t) => t.classList.remove('active'));
                contents.forEach((c) => c.classList.remove('active'));
                wanted.classList.add('active');
                wantedPane.classList.add('active');
            }
        }
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                body.querySelector(`#vignova-rtab-${tab.dataset.tab}`).classList.add('active');
            });
        });

        // PDF download handler
        if (pdfBase64) {
            body.querySelector("#vignova-download-pdf").addEventListener("click", () => {
                this._downloadPdf(pdfBase64, fileName);
            });
        }

        // Copy handlers
        const handleCopy = (btnId, text) => {
            const btn = body.querySelector(`#${btnId}`);
            if (btn) {
                btn.addEventListener("click", () => {
                    navigator.clipboard.writeText(text).then(() => {
                        const originalHtml = btn.innerHTML;
                        btn.innerHTML = `${VG_ICON.check} Copied`;
                        setTimeout(() => btn.innerHTML = originalHtml, 2000);
                    });
                });
            }
        };

        if (coverLetter) handleCopy("vignova-copy-cl", coverLetter);
        if (email) handleCopy("vignova-copy-email", email);
    },

    /**
     * Show success state (Legacy, kept for compatibility if needed elsewhere)
     */
    showSuccess(pdfBase64, fileName, creditsRemaining) {
        this._stopProgress();
        if (!this.overlay) return;

        const body = this.overlay.querySelector(".vignova-overlay-body");
        body.innerHTML = `
            <div class="vignova-done-hero" aria-hidden="true">${VG_ICON.popper}</div>
            <div class="vignova-overlay-success-title">Resume Ready!</div>
            <div class="vignova-overlay-success-sub">Your tailored resume has been generated and saved to your Vignova dashboard.</div>
            ${pdfBase64 ? `
                <button class="vignova-overlay-download-btn" id="vignova-download-pdf">
                    ${VG_ICON.download} Download PDF
                </button>
            ` : `
                <a href="https://app.vignova.io/dashboard" target="_blank" class="vignova-overlay-download-btn">
                    Open Dashboard
                </a>
            `}
            <a href="https://app.vignova.io/dashboard" target="_blank" class="vignova-overlay-view-btn">
                View in Vignova Dashboard ${VG_ICON.arrow}
            </a>
            <div class="vignova-overlay-credits">
                ${VG_ICON.coins} Credits remaining: <strong>${creditsRemaining}</strong>
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
     * "You already have one of these" — shown instead of generating when the
     * server finds earlier work for the same job URL.
     *
     * Resolves true to go ahead and spend another credit, false to stop. The
     * overlay stays open either way; the caller decides what to do next.
     */
    showDuplicate(info) {
        this._stopProgress();
        if (!this.overlay) return Promise.resolve(false);

        const made = [
            info.existing?.resume && { icon: VG_ICON.doc, label: "Tailored resume" },
            info.existing?.coverLetter && { icon: VG_ICON.mail, label: "Cover letter" },
            info.existing?.email && { icon: VG_ICON.plane, label: "Application email" },
        ].filter(Boolean);

        const when = info.existing?.generatedAt
            ? new Date(info.existing.generatedAt).toLocaleDateString(undefined, {
                day: "numeric", month: "short", year: "numeric",
            })
            : "";

        const body = this.overlay.querySelector(".vignova-overlay-body");
        body.innerHTML = `
            <span class="vignova-overlay-notice-icon">${VG_ICON.history}</span>
            <div class="vignova-overlay-success-title">Already generated</div>
            <div class="vignova-overlay-success-sub">
                You generated this for <strong>${this._toHtml(info.existing?.jobTitle || "this role")}</strong>
                at <strong>${this._toHtml(info.existing?.company || "this company")}</strong>${when ? ` on ${when}` : ""}.
            </div>

            <ul class="vignova-dup-list">
                ${made.map((m) => `<li class="vignova-dup-item"><span class="vignova-dup-icon">${m.icon}</span>${m.label}</li>`).join("")}
            </ul>

            <div class="vignova-dup-note">Generating again uses another credit and replaces what you have.</div>

            <button class="vignova-overlay-download-btn" id="vignova-dup-again">
                ${VG_ICON.retry} Generate Again
            </button>
            <a href="https://app.vignova.io/dashboard/jobs/${encodeURIComponent(info.existing?.jobId || "")}" target="_blank" class="vignova-overlay-view-btn">
                Open What I Have ${VG_ICON.arrow}
            </a>
            <button class="vignova-overlay-copy-btn" id="vignova-dup-cancel" style="margin-top:12px;">Cancel</button>
        `;

        return new Promise((resolve) => {
            body.querySelector("#vignova-dup-again").addEventListener("click", () => {
                this.showLoading();
                resolve(true);
            });
            body.querySelector("#vignova-dup-cancel").addEventListener("click", () => {
                this.remove();
                resolve(false);
            });
        });
    },

    /**
     * "This one needs a paid plan" — shown instead of an error when the server
     * answers 402.
     *
     * Deliberately not the red failure screen: nothing went wrong, the account
     * just does not include this yet. Says plainly what stays free so the
     * extension does not read as broken.
     */
    showUpgrade(info) {
        this._stopProgress();
        if (!this.overlay) this.showLoading();
        this._stopProgress();

        const feature = info?.feature || "This feature";
        const outOfCredits = !!info?.outOfCredits;

        const body = this.overlay.querySelector(".vignova-overlay-body");
        body.innerHTML = `
            <span class="vignova-overlay-notice-icon">${outOfCredits ? VG_ICON.coins : VG_ICON.spark}</span>
            <div class="vignova-overlay-success-title">${outOfCredits ? "Out of credits" : feature + " is a Pro feature"}</div>
            <div class="vignova-overlay-success-sub">${this._toHtml(info?.message || "")}</div>

            <ul class="vignova-dup-list">
                <li class="vignova-dup-item"><span class="vignova-dup-icon">${VG_ICON.doc}</span>Tailored resumes</li>
                <li class="vignova-dup-item"><span class="vignova-dup-icon">${VG_ICON.mail}</span>Cover letters</li>
                <li class="vignova-dup-item"><span class="vignova-dup-icon">${VG_ICON.plane}</span>Recruiter outreach</li>
            </ul>

            <div class="vignova-dup-note">Your match score, job tracking and status updates stay free on every plan.</div>

            <a href="https://app.vignova.io/dashboard/billing" target="_blank" class="vignova-overlay-download-btn">
                ${VG_ICON.spark} ${outOfCredits ? "Get More Credits" : "Upgrade to Pro"}
            </a>
            <button class="vignova-overlay-copy-btn" id="vignova-upgrade-close" style="margin-top:12px;">Not now</button>
        `;

        const close = body.querySelector("#vignova-upgrade-close");
        if (close) close.addEventListener("click", () => this.remove());
    },

    /**
     * Show error state
     */
    showError(errorMessage, retryCallback, title) {
        if (!this.overlay) {
            this.showLoading(); // Create overlay if not exists
        }
        this._stopProgress();

        // `title` matters: this screen is reached from the status dropdown and
        // the score badge too, and "Generation Failed" over a failed status
        // change told people the wrong thing about what had just gone wrong.
        const body = this.overlay.querySelector(".vignova-overlay-body");
        body.innerHTML = `
            <span class="vignova-overlay-error-icon">${VG_ICON.warning}</span>
            <div class="vignova-overlay-error-title">${this._toHtml(title || "Generation Failed")}</div>
            <div class="vignova-overlay-error-msg">${this._toHtml(errorMessage)}</div>
            ${retryCallback ? `<button class="vignova-overlay-retry-btn" id="vignova-retry-btn">${VG_ICON.retry} Try Again</button>` : ""}
        `;

        if (retryCallback) {
            body.querySelector("#vignova-retry-btn").addEventListener("click", () => {
                retryCallback();
            });
        }
    },

    /**
     * Generated text, as safe HTML.
     *
     * The letter is interpolated into innerHTML, so an angle bracket in the
     * body would otherwise be parsed as markup and swallow the rest of it.
     * Escaped first, then newlines become breaks.
     */
    _toHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\n/g, "<br>");
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
        this._stopProgress();
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

// Expose on window so consumer scripts (linkedin.js / indeed.js) can resolve
// the overlay defensively instead of crashing with a ReferenceError if this
// file ever fails to load (partial injection after an extension update, etc.)
window.Vignova_Overlay = Vignova_Overlay;

/**
 * Generation, with the "already generated" question in front of it.
 *
 * Both job-board scripts and both buttons (Tailor Resume, Cover Letter) run
 * the same call, so the duplicate handling lives here once rather than at
 * four call sites. The server answers `duplicate` instead of generating when
 * it finds earlier work for the same job URL; if the user says go ahead, the
 * request is repeated with `force` and the check is skipped.
 *
 * Returns the API result, or `{ cancelled: true }` when the user declines.
 */
const Vignova_Generate = {
    async run(data) {
        const first = await chrome.runtime.sendMessage({ type: "API_GENERATE_ALL", data });

        // Needs a paid plan, or the credits ran out. Not an error state.
        if (first && first.upgradeRequired) {
            Vignova_Overlay.showUpgrade(first);
            return { success: false, handled: true };
        }

        if (!first || !first.duplicate) return first;

        const goAhead = await Vignova_Overlay.showDuplicate(first);
        if (!goAhead) return { success: false, cancelled: true };

        const again = await chrome.runtime.sendMessage({
            type: "API_GENERATE_ALL",
            data: { ...data, force: true },
        });

        if (again && again.upgradeRequired) {
            Vignova_Overlay.showUpgrade(again);
            return { success: false, handled: true };
        }
        return again;
    },
};

window.Vignova_Generate = Vignova_Generate;

/**
 * What the signed-in account can do, from the cached login payload.
 *
 * Only used to decide how a button should look before it is pressed — the
 * server decides what actually runs, so a stale cache here can never grant
 * access, only mislabel a button until the next sign-in.
 */
const Vignova_Plan = {
    isPaid(user) {
        const plan = String((user && (user.plan || user.plan_type)) || "FREE").toUpperCase();
        return plan === "PRO" || plan === "PREMIUM";
    },
};

window.Vignova_Plan = Vignova_Plan;
