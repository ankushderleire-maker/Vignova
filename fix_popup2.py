import json
import os

path = r'h:\Ankush\RESUME PRO\FULL DEPLOYING CODE\Browser_Extension\popup\popup.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

bad_part = """                <textarea
        <div id="copyToast" class="vignova-copy-toast">Copied!</div>"""

good_part = """                <textarea
                    id="jdReviewTextarea"
                    class="vignova-jdrv-textarea"
                    placeholder="Paste or edit the job description here…"
                    spellcheck="false"
                ></textarea>
                <div class="vignova-jdrv-meta">
                    <span id="jdReviewCharCount">0 chars</span>
                </div>
                <div class="vignova-jdrv-hint-section">
                    <div class="vignova-jdrv-label" style="margin-top:10px;">
                        <span class="vignova-jdrv-dot" style="background:#a78bfa;"></span>
                        Anything specific to highlight?
                        <span class="vignova-jdrv-hint">Optional</span>
                    </div>
                    <input
                        id="jdReviewHintInput"
                        class="vignova-jdrv-hint-input"
                        type="text"
                        placeholder="e.g. Emphasise backend leadership and AWS experience"
                        maxlength="200"
                    />
                </div>
            </div>

            <div class="vignova-jdrv-footer">
                <button id="jdReviewCancelBtn" class="vignova-btn-secondary">Cancel</button>
                <button id="jdReviewGenerateBtn" class="vignova-btn-primary" style="flex:1;">
                    <span id="jdReviewGenBtnText">🚀 Generate All</span>
                    <span id="jdReviewGenSpinner" class="vignova-spinner" style="display: none;"></span>
                </button>
            </div>
        </div>

        <!-- INTERVIEW PREP VIEW (PREMIUM) -->
        <div id="interviewPrepView" class="vignova-view" style="display: none;">
            <div class="vignova-jdrv-header">
                <button id="interviewPrepBackBtn" class="vignova-icon-btn" title="Back">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <div class="vignova-jdrv-job-info">
                    <div class="vignova-jdrv-job-title" id="ipJobTitle">Interview Prep</div>
                    <div class="vignova-jdrv-job-company" id="ipJobCompany">AI-powered questions</div>
                </div>
                <span class="vignova-qa-pro-badge" style="margin-left:auto;">PRO</span>
            </div>

            <div id="ipLoadingState" class="vignova-ip-loading">
                <div class="vignova-spinner" style="width:24px;height:24px;border-width:3px;margin:0 auto 12px;"></div>
                <p style="color:#9ca3af;font-size:13px;text-align:center;">Generating interview questions…</p>
            </div>

            <div id="ipResultState" style="display:none; padding: 0 16px 16px;">
                <div id="ipQuestionsList" class="vignova-ip-questions"></div>
                <a href="https://app.vignova.io/dashboard" target="_blank" class="vignova-link-row" style="margin-top:12px;">
                    <span style="display:flex;align-items:center;gap:6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        Practice in full on Vignova
                    </span>
                    <span class="vignova-arrow">→</span>
                </a>
            </div>

            <div id="ipErrorState" style="display:none; padding:16px;">
                <p style="color:#f87171;font-size:13px;text-align:center;" id="ipErrorMsg">Failed to generate questions.</p>
                <button id="ipRetryBtn" class="vignova-btn-secondary" style="width:100%;margin-top:8px;">Try Again</button>
                <button id="ipErrorBackBtn" class="vignova-btn-secondary" style="width:100%;margin-top:8px;">← Back to Dashboard</button>
            </div>
        </div>

        <!-- PREMIUM GATE MODAL (overlay, not a view) -->
        <div id="premiumModal" class="vignova-premium-modal" style="display:none;">
            <div class="vignova-premium-modal-card">
                <button id="premiumModalClose" class="vignova-premium-modal-close">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <div class="vignova-premium-modal-star">⭐</div>
                <h3 class="vignova-premium-modal-title">Premium Feature</h3>
                <p class="vignova-premium-modal-feature-name" id="premiumModalFeatureName">Tailor Resume</p>
                <p class="vignova-premium-modal-desc">Unlock this and all premium features with a Pro or Premium plan.</p>
                <ul class="vignova-premium-modal-benefits">
                    <li>✓ Unlimited resume tailoring</li>
                    <li>✓ AI-powered cover letters</li>
                    <li>✓ One-click auto-apply</li>
                    <li>✓ Interview prep questions</li>
                </ul>
                <a href="https://app.vignova.io/dashboard/billing" target="_blank" class="vignova-btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:12px;">
                    🚀 Upgrade Now
                </a>
            </div>
        </div>

        <!-- Copy Toast -->
        <div id="copyToast" class="vignova-copy-toast">Copied!</div>"""

if bad_part in content:
    content = content.replace(bad_part, good_part)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed successfully!')
else:
    print('Bad part not found')
