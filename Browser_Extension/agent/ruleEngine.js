/**
 * Vignova Agent — Rule Engine
 * Maps common form field keywords to user profile data for instant fill.
 * Runs locally (no API calls) — target: < 100ms.
 */

const RuleEngine = (() => {
    "use strict";

    /**
     * Keyword → profile field mapping rules.
     * Each rule: { keywords: [...], profileKey: "key", priority: number }
     * Higher priority = checked first.
     */
    const RULES = [
        // Name fields
        {
            keywords: ["first name", "first_name", "firstname", "fname", "given name", "given_name", "givenname"],
            profileKey: "first_name",
            priority: 10,
        },
        {
            keywords: ["last name", "last_name", "lastname", "lname", "surname", "family name", "family_name", "familyname"],
            profileKey: "last_name",
            priority: 10,
        },
        {
            keywords: ["full name", "full_name", "fullname", "your name", "candidate name", "applicant name"],
            profileKey: "_full_name", // Computed: first_name + last_name
            priority: 9,
        },

        // Contact
        {
            keywords: ["email", "e-mail", "email address", "email_address", "emailaddress"],
            profileKey: "email",
            priority: 10,
        },
        {
            keywords: ["phone", "phone number", "phone_number", "phonenumber", "mobile", "mobile number", "telephone", "tel", "cell", "contact number"],
            profileKey: "phone",
            priority: 10,
        },
        {
            keywords: ["country code", "dial code", "phone code", "calling code", "phone prefix", "country extension"],
            profileKey: "_phone_country_code",
            priority: 10,
        },

        // Links
        {
            keywords: ["linkedin", "linkedin url", "linkedin profile", "linkedin_url"],
            profileKey: "linkedin",
            priority: 8,
        },
        {
            keywords: ["github", "github url", "github profile", "github_url"],
            profileKey: "github",
            priority: 8,
        },
        {
            keywords: ["portfolio", "portfolio url", "website", "personal website", "personal site", "personal_website", "web url", "homepage"],
            profileKey: "portfolio",
            priority: 7,
        },

        // Location
        {
            keywords: ["location", "current location", "where are you located", "city", "current city"],
            profileKey: "_location",
            priority: 6,
        },
        {
            keywords: ["state", "province"],
            profileKey: "state",
            priority: 6,
        },
        {
            keywords: ["country of residence", "home country", "current country", "country where"],
            profileKey: "country",
            priority: 6,
        },
        {
            keywords: ["address", "street address", "mailing address"],
            profileKey: "address",
            priority: 5,
        },
        {
            keywords: ["zip", "zip code", "zipcode", "postal code", "postal_code", "postalcode", "pincode"],
            profileKey: "zip_code",
            priority: 5,
        },

        // Professional
        {
            keywords: ["years of experience", "years_of_experience", "total experience", "work experience years", "experience years"],
            profileKey: "years_experience",
            priority: 6,
        },
        {
            keywords: ["current company", "current employer", "current_company"],
            profileKey: "current_company",
            priority: 5,
        },
        {
            keywords: ["current title", "current job title", "current_title", "current position", "job title"],
            profileKey: "current_title",
            priority: 5,
        },
        {
            keywords: ["salary", "expected salary", "salary expectation", "desired salary", "compensation"],
            profileKey: "expected_salary",
            priority: 4,
        },

        // Authorization
        {
            keywords: ["authorized to work", "work authorization", "legally authorized", "eligible to work"],
            profileKey: "work_authorized",
            priority: 6,
        },
        {
            keywords: ["sponsorship", "visa sponsorship", "require sponsorship", "need sponsorship"],
            profileKey: "needs_sponsorship",
            priority: 6,
        },

        // Common dropdown questions (default answers)
        {
            keywords: ["gender", "identify your gender", "sex"],
            profileKey: "_gender",
            priority: 4,
        },
        {
            keywords: ["how did you hear", "where did you hear", "how did you find", "referral source", "source of application"],
            profileKey: "_hear_about",
            priority: 4,
        },
        {
            keywords: ["race", "ethnicity", "ethnic"],
            profileKey: "_race_ethnicity",
            priority: 3,
        },
        {
            keywords: ["veteran", "military"],
            profileKey: "_veteran",
            priority: 3,
        },
        {
            keywords: ["disability", "disabled"],
            profileKey: "_disability",
            priority: 3,
        },
        {
            keywords: ["previously employed", "been employed", "former employee", "worked here before"],
            profileKey: "_previously_employed",
            priority: 4,
        },
        {
            keywords: ["blood relative", "immediate relative", "family member", "related to"],
            profileKey: "_blood_relative",
            priority: 4,
        },
        {
            keywords: ["legally authorized", "authorized to work", "work authorization", "right to work", "eligible to work"],
            profileKey: "_work_authorized",
            priority: 6,
        },
        {
            keywords: ["authorisation", "work authorisation", "visa status", "current visa", "what is your current visa", "visa type"],
            profileKey: "_visa_status",
            priority: 7,
        },
        {
            keywords: ["require sponsorship", "need sponsorship", "visa sponsorship", "immigration sponsorship"],
            profileKey: "_sponsorship_needed",
            priority: 6,
        },
        {
            keywords: ["relocating", "relocate", "open to relocating", "willing to relocate", "relocation"],
            profileKey: "_relocate",
            priority: 6,
        },
    ];

    // Sort rules by priority (highest first)
    RULES.sort((a, b) => b.priority - a.priority);

    /**
     * Normalize text for matching — lowercase, remove special chars.
     */
    function normalize(text) {
        if (!text) return "";
        return text.toLowerCase().replace(/[^a-z0-9\s_]/g, " ").replace(/\s+/g, " ").trim();
    }

    /**
     * Check if a field's label/name/placeholder matches a rule.
     */
    function matchField(field, rule) {
        const searchTexts = [
            normalize(field.label),
            normalize(field.name),
            normalize(field.placeholder),
            normalize(field.id),
        ].filter(Boolean);

        for (const text of searchTexts) {
            for (const keyword of rule.keywords) {
                if (text.includes(keyword) || text === keyword) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Resolve the profile value for a given key.
     */
    function getProfileValue(profile, key) {
        if (key === "_full_name") {
            const first = profile.first_name || "";
            const last = profile.last_name || "";
            return `${first} ${last}`.trim();
        }
        if (key === "_phone_country_code") {
            const phone = profile.phone || "";
            const match = phone.match(/^(\+\d{1,4})/);
            if (match) return match[1];
            if (profile.country) return profile.country;
            return null;
        }
        if (key === "_location") {
            const city = profile.city || "";
            const country = profile.country || "";
            return city && country ? `${country} - ${city}` : city || country || "Yes";
        }
        // Default answers for common dropdown questions
        if (key === "_gender") return profile.gender || "Decline To Self Identify";
        if (key === "_hear_about") return profile.hear_about || "LinkedIn";
        if (key === "_race_ethnicity") return profile.race_ethnicity || "Decline To Self Identify";
        if (key === "_veteran") return profile.veteran_status || "I am not a protected veteran";
        if (key === "_disability") return profile.disability_status || "I do not wish to answer";
        if (key === "_previously_employed") return profile.previously_employed || "No";
        if (key === "_blood_relative") return profile.blood_relative || "No";
        if (key === "_work_authorized") return profile.work_authorized || "Yes";
        if (key === "_visa_status") return profile.visa_status || null; // Return actual string (e.g. 'Stamp 1G'), or remain blank
        if (key === "_sponsorship_needed") return profile.needs_sponsorship || "No";
        if (key === "_relocate") return "Yes"; // Default to Yes for relocating

        return profile[key] || null;
    }

    /**
     * Run the rule engine against page fields.
     * @param {Array} fields — from PageObserver.extractFields()
     * @param {Object} profile — user profile from chrome.storage
     * @returns {{ matched: Array, unmatched: Array }}
     */
    function match(fields, profile) {
        if (!profile || !fields || fields.length === 0) {
            return { matched: [], unmatched: fields || [] };
        }

        const matched = [];
        const unmatched = [];
        const usedFields = new Set();

        for (const field of fields) {
            // Skip already-filled fields
            if (field.currentValue && field.currentValue.trim().length > 0) {
                continue;
            }

            // Skip file inputs (handled by executor)
            if (field.type === "file") continue;

            let wasMatched = false;

            for (const rule of RULES) {
                if (matchField(field, rule)) {
                    const value = getProfileValue(profile, rule.profileKey);
                    if (value) {
                        matched.push({
                            action: "fill_input",
                            selector: field.selector,
                            value,
                            field: field.label || field.name || field.placeholder,
                            source: "rule_engine",
                            ruleKey: rule.profileKey,
                        });
                        wasMatched = true;
                        break; // First matching rule wins
                    }
                }
            }

            if (!wasMatched) {
                unmatched.push(field);
            }
        }

        return { matched, unmatched };
    }

    return { match, RULES, normalize };
})();

if (typeof window !== "undefined") {
    window.Vignova_RuleEngine = RuleEngine;
}
