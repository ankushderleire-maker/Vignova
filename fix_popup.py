import json
import os

path = r'h:\Ankush\RESUME PRO\FULL DEPLOYING CODE\Browser_Extension\popup\popup.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

bad_part = """                    <input
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

            <div id="ipResultState" style="display:none; padding: 0 16px 16px;">"""

good_part = """                    <input
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

            <div id="ipResultState" style="display:none; padding: 0 16px 16px;">"""

if bad_part in content:
    content = content.replace(bad_part, good_part)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed successfully!')
else:
    print('Bad part not found. Looking for similarities...')
    idx = content.find('<input')
    if idx != -1:
        print(repr(content[idx:idx+500]))
    else:
        print('Could not find input tag')
