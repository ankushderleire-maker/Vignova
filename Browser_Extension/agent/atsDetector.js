/**
 * Vignova Agent — ATS Detector
 * Detects major ATS platforms and provides predefined field mappings
 * for instant autofill without AI.
 */

const ATSDetector = (() => {
    "use strict";

    /**
     * ATS platform definitions.
     * Each has URL patterns, DOM markers, and field mappings.
     */
    const PLATFORMS = {
        greenhouse: {
            name: "Greenhouse",
            urlPatterns: [
                /boards\.greenhouse\.io/i,
                /greenhouse\.io\/embed\/job_app/i,
            ],
            domMarkers: [
                "#application_form",
                'meta[content*="greenhouse"]',
                ".application--field",
            ],
            fieldMappings: {
                "#first_name": "first_name",
                "#last_name": "last_name",
                "#email": "email",
                "#phone": "phone",
                'input[name="job_application[first_name]"]': "first_name",
                'input[name="job_application[last_name]"]': "last_name",
                'input[name="job_application[email]"]': "email",
                'input[name="job_application[phone]"]': "phone",
                'input[name="job_application[location]"]': "city",
                'input[autocomplete="url"]': "linkedin",
            },
            resumeSelector: "#resume_upload input[type='file'], input[data-field='resume']",
            submitSelector: "#submit_app, button[type='submit']",
        },

        lever: {
            name: "Lever",
            urlPatterns: [
                /jobs\.lever\.co/i,
                /lever\.co\/.*\/apply/i,
            ],
            domMarkers: [
                ".application-form",
                ".postings-btn-wrapper",
                'form[action*="lever"]',
            ],
            fieldMappings: {
                'input[name="name"]': "_full_name",
                'input[name="email"]': "email",
                'input[name="phone"]': "phone",
                'input[name="org"]': "current_company",
                'input[name="urls[LinkedIn]"]': "linkedin",
                'input[name="urls[GitHub]"]': "github",
                'input[name="urls[Portfolio]"]': "portfolio",
                'input[name="urls[Twitter]"]': "twitter",
            },
            resumeSelector: 'input[name="resume"], .resume-upload input[type="file"]',
            submitSelector: 'button[type="submit"], .postings-btn',
        },

        workday: {
            name: "Workday",
            urlPatterns: [
                /myworkdayjobs\.com/i,
                /myworkday\.com/i,
                /wd\d+\.myworkdaysite/i,
            ],
            domMarkers: [
                '[data-automation-id]',
                '[data-automation-id="legalNameSection_firstName"]',
                ".css-1q6letk", // Workday form container
            ],
            fieldMappings: {
                '[data-automation-id="legalNameSection_firstName"]': "first_name",
                '[data-automation-id="legalNameSection_lastName"]': "last_name",
                '[data-automation-id="email"]': "email",
                '[data-automation-id="phone-number"]': "phone",
                '[data-automation-id="addressSection_addressLine1"]': "address",
                '[data-automation-id="addressSection_city"]': "city",
                '[data-automation-id="addressSection_postalCode"]': "zip_code",
            },
            resumeSelector: '[data-automation-id="file-upload-input-ref"]',
            submitSelector: '[data-automation-id="bottom-navigation-next-button"], [data-automation-id="submit-button"]',
        },

        ashby: {
            name: "Ashby",
            urlPatterns: [
                /jobs\.ashbyhq\.com/i,
            ],
            domMarkers: [
                "._form_",
                '[class*="ashby"]',
                'form[data-test="application-form"]',
            ],
            fieldMappings: {
                'input[name="name"]': "_full_name",
                'input[name="_systemfield_name"]': "_full_name",
                'input[name="email"]': "email",
                'input[name="_systemfield_email"]': "email",
                'input[name="phone"]': "phone",
                'input[name="_systemfield_phone"]': "phone",
                'input[name="org"]': "current_company",
                'input[name="linkedin"]': "linkedin",
            },
            resumeSelector: 'input[type="file"]',
            submitSelector: 'button[type="submit"]',
        },

        smartrecruiters: {
            name: "SmartRecruiters",
            urlPatterns: [
                /jobs\.smartrecruiters\.com/i,
                /smartrecruiters\.com/i,
            ],
            domMarkers: [
                ".st-apply-form",
                '[class*="smart-recruiters"]',
                "#st-apply",
            ],
            fieldMappings: {
                'input[name="firstName"]': "first_name",
                'input[name="lastName"]': "last_name",
                'input[name="email"]': "email",
                'input[name="phoneNumber"]': "phone",
                'input[name="location"]': "city",
            },
            resumeSelector: 'input[type="file"][name="resume"]',
            submitSelector: 'button[type="submit"]',
        },

        icims: {
            name: "iCIMS",
            urlPatterns: [
                /icims\.com/i,
                /jobs-.*\.icims\.com/i,
            ],
            domMarkers: [
                "#iCIMS_MainWrapper",
                ".iCIMS_JobsTable",
            ],
            fieldMappings: {
                'input[id*="FirstName"]': "first_name",
                'input[id*="LastName"]': "last_name",
                'input[id*="Email"]': "email",
                'input[id*="Phone"]': "phone",
            },
            resumeSelector: 'input[type="file"]',
            submitSelector: 'input[type="submit"], button[type="submit"]',
        },
    };

    /**
     * Detect which ATS platform the current page belongs to.
     * @returns {{ platform: string, config: Object } | null}
     */
    function detect() {
        const url = window.location.href;

        // Check URL patterns first (fastest)
        for (const [key, config] of Object.entries(PLATFORMS)) {
            for (const pattern of config.urlPatterns) {
                if (pattern.test(url)) {
                    return { platform: key, config };
                }
            }
        }

        // Check DOM markers (fallback for embedded forms)
        for (const [key, config] of Object.entries(PLATFORMS)) {
            for (const marker of config.domMarkers) {
                if (document.querySelector(marker)) {
                    return { platform: key, config };
                }
            }
        }

        return null;
    }

    /**
     * Generate fill actions for a detected ATS platform.
     * @param {Object} atsResult — from detect()
     * @param {Object} profile — user profile
     * @returns {Array} actions — [{ action, selector, value, source }]
     */
    function getATSActions(atsResult, profile) {
        if (!atsResult || !profile) return [];

        const actions = [];
        const { config } = atsResult;

        for (const [selector, profileKey] of Object.entries(config.fieldMappings)) {
            const el = document.querySelector(selector);
            if (!el) continue;
            if (el.value && el.value.trim().length > 0) continue; // Already filled

            let value = profile[profileKey];

            // Computed fields
            if (profileKey === "_full_name") {
                value = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
            }

            if (value) {
                actions.push({
                    action: "fill_input",
                    selector,
                    value,
                    source: "ats_mapping",
                    platform: atsResult.platform,
                });
            }
        }

        return actions;
    }

    return { detect, getATSActions, PLATFORMS };
})();

if (typeof window !== "undefined") {
    window.Vignova_ATSDetector = ATSDetector;
}
