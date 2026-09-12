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
            // Phrased every way a form can ask it. "which country" and
            // "country in which" are Greenhouse's wording and matched nothing.
            keywords: [
                "country of residence", "home country", "current country", "country where",
                "country in which", "which country", "your country", "country you are located",
                "country you reside", "country of employment",
            ],
            profileKey: "country",
            priority: 6,
        },
        {
            keywords: [
                "preferred name", "preferred first name", "name you prefer", "name you d prefer",
                "nickname", "what would you like us to call you", "name to use",
            ],
            profileKey: "_preferred_name",
            priority: 8,
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
        {
            keywords: ["applied position", "position applied", "position you are applying", "role applied", "applying for", "desired position", "position applying"],
            profileKey: "current_title",
            priority: 6,
        },
        {
            keywords: ["notice period"],
            profileKey: "_notice_period",
            priority: 5,
        },
        {
            keywords: ["earliest possible start", "earliest start", "available start date", "date available", "when can you start", "availability to start", "available from", "joining date"],
            profileKey: "_earliest_start",
            priority: 5,
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
            keywords: [
                "previously employed", "been employed", "former employee", "worked here before",
                "previously worked at", "previously worked for", "worked at or consulted",
                "ever worked for", "ever been employed",
            ],
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
     * What an ATS calls its inputs.
     *
     * A label can be anything a recruiter typed; a `name` attribute is written
     * by the platform and follows a convention. Matching those directly is the
     * difference between filling a Lever form and staring at it: Lever's
     * LinkedIn field is labelled nothing at all and named `urls[LinkedIn]`.
     *
     * Tested against the name and the id, both reduced to plain words, so
     * `candidate[first_name]`, `firstName` and `applicant.first-name` all read
     * as "candidate first name", "first name" and "applicant first name".
     */
    const NAME_PATTERNS = [
        ["first_name", /\bfirst ?name\b|\bfname\b|\bgiven ?name\b|\bforename\b/],
        ["last_name", /\blast ?name\b|\blname\b|\bsurname\b|\bfamily ?name\b/],
        ["_full_name", /(^|\b)(full ?name|candidate name|applicant name|your name)(\b|$)/],
        ["email", /\be ?mail\b|\bemailaddress\b/],
        ["phone", /\bphone\b|\bmobile\b|\btelephone\b|\bcell\b|(^|\s)tel(\s|$)/],
        ["linkedin", /\blinked ?in\b/],
        ["github", /\bgit ?hub\b/],
        ["portfolio", /\bportfolio\b|\bpersonal ?(web)?site\b|\bwebsite\b|\burls other\b|\bhomepage\b/],
        ["city", /\bcity\b|\btown\b|\bcurrent location\b|(^|\b)location(\b|$)/],
        ["state", /\bstate\b|\bprovince\b|\bcounty\b/],
        ["country", /\bcountry\b/],
        ["zip_code", /\bzip ?code\b|\bpostal ?code\b|\bpostcode\b|\bpincode\b|(^|\b)zip(\b|$)/],
        ["address", /\baddress\b|\bstreet\b/],
        ["current_company", /\bcurrent (company|employer)\b|\bemployer\b|(^|\b)(company|org|organisation|organization)(\b|$)/],
        ["current_title", /\bcurrent (title|role|position)\b|\bjob ?title\b|\bheadline\b|(^|\b)title(\b|$)/],
        ["years_experience", /\byears? of experience\b|\byears? experience\b|\byoe\b/],
        ["_resume", /\bresume\b|(^|\b)cv(\b|$)/],
        ["_cover_letter", /\bcover ?letter\b/],
        ["summary", /\bsummary\b|\bbio\b|\babout ?you\b/],
    ];

    /** Inputs that are page furniture, whatever they are called. */
    const IGNORE = /\b(search|filter|query|keyword|coupon|promo|captcha|password|confirm|csrf|token|honeypot)\b/;

    /**
     * Fields that describe the job rather than the applicant.
     *
     * Lever's office picker is `opportunityLocationId`, which reads as a
     * location and is not the candidate's: filling it writes the applicant's
     * city into the field that says which office the role sits in.
     */
    const ABOUT_THE_JOB = /\b(opportunity|requisition|posting|vacancy|job) ?(location|id|title|city)\b/;

    /**
     * A name ending in "id" holds a reference, not a value — except for the
     * "emailId" / "loginId" spelling, where the id is the value.
     */
    const IDENTIFIER_SAFE = new Set(["email", "phone"]);

    /** Label text, reduced for comparison: lower case, punctuation dropped. */
    function normalize(text) {
        if (!text) return "";
        return text.toLowerCase().replace(/[^a-z0-9\s_]/g, " ").replace(/\s+/g, " ").trim();
    }

    /**
     * Normalised name/id: camel case split into words, punctuation to spaces.
     *
     * The split matters: `linkedInProfileUrl` without it is one long token and
     * no pattern that ends at a word boundary can see the "linkedin" in it.
     */
    function normalizeName(value) {
        return String(value || "")
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    /** Whole-word containment, so "state" does not match "real estate agent". */
    function containsPhrase(haystack, phrase) {
        if (!haystack || !phrase) return false;
        const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(haystack);
    }

    /**
     * How well a rule fits a field, 0 to 100.
     *
     * The scores are ordered by how much the signal can be trusted: a name
     * written by the platform beats a label written by a recruiter, an exact
     * label beats a phrase inside one, and a loose substring counts for
     * something only when the keyword is long enough to be meaningful on its
     * own.
     */
    function scoreField(field, rule) {
        const label = normalize(field.label);
        const name = normalizeName(field.name);
        const id = normalizeName(field.id);
        const placeholder = normalize(field.placeholder);

        let best = 0;

        for (const keyword of rule.keywords) {
            const key = normalize(keyword);
            if (!key) continue;

            if (label && label === key) best = Math.max(best, 92);
            if (name === key || id === key) best = Math.max(best, 88);
            if (containsPhrase(label, key)) best = Math.max(best, 76);
            if (containsPhrase(name, key) || containsPhrase(id, key)) best = Math.max(best, 70);
            if (containsPhrase(placeholder, key)) best = Math.max(best, 62);
            if (key.length >= 8 && label.includes(key)) best = Math.max(best, 48);
        }

        return best;
    }

    /** The profile key the name attribute itself gives away, or null. */
    function keyFromName(field) {
        const name = normalizeName(field.name);
        const id = normalizeName(field.id);
        if (!name && !id) return null;
        if ((name && IGNORE.test(name)) || (id && IGNORE.test(id))) return null;
        if (ABOUT_THE_JOB.test(name) || ABOUT_THE_JOB.test(id)) return null;

        for (const [profileKey, pattern] of NAME_PATTERNS) {
            if ((name && pattern.test(name)) || (id && pattern.test(id))) {
                const isIdentifier = /\bid$/.test(name) || /\bid$/.test(id);
                if (isIdentifier && !IDENTIFIER_SAFE.has(profileKey)) return null;
                return profileKey;
            }
        }
        return null;
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
        if (key === "_notice_period") return profile.notice_period || "Immediately available";
        if (key === "_pronouns") return profile.pronouns || null;
        if (key === "_preferred_name") return profile.preferred_name || profile.first_name || null;
        // The resume and the cover letter are files, not text: the executor
        // uploads them, so there is nothing here to type into a text box.
        if (key === "_resume" || key === "_cover_letter") return null;
        if (key === "_earliest_start") {
            if (profile.earliest_start) return profile.earliest_start;
            // Default: two weeks from today (ISO — executor formats for date inputs)
            const d = new Date();
            d.setDate(d.getDate() + 14);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        }

        return profile[key] || null;
    }

    /**
     * Run the rule engine against page fields.
     *
     * Three passes, in order of how much each signal can be trusted:
     *   1. the ATS's own field names, when the platform is one we know
     *   2. the name attribute, read against the conventions every ATS shares
     *   3. the label, placeholder and id, scored
     *
     * @param {Array} fields — from PageObserver.extractFields()
     * @param {Object} profile — user profile from chrome.storage
     * @param {Object} [options] — { hostname } to override platform detection
     * @returns {{ matched: Array, unmatched: Array, platform: string|null }}
     */
    function match(fields, profile, options) {
        if (!profile || !fields || fields.length === 0) {
            return { matched: [], unmatched: fields || [], platform: null };
        }

        const ats = (typeof window !== "undefined" && window.Vignova_AtsProfiles) || null;
        const site = ats
            ? ats.detect((options && options.hostname) || (typeof location !== "undefined" ? location.hostname : ""))
            : null;

        const matched = [];
        const unmatched = [];

        for (const field of fields) {
            // Skip already-filled fields
            if (field.currentValue && field.currentValue.trim().length > 0) {
                continue;
            }

            // Skip file inputs (handled by executor)
            if (field.type === "file") continue;

            const fieldName = normalizeName(field.name);
            const fieldId = normalizeName(field.id);
            const haystack = `${fieldName} ${fieldId} ${normalize(field.label)}`;

            // Furniture, and fields that describe the job rather than the
            // person. Checked before any matcher runs, so no path can reach
            // them: the keyword rules read "opportunityLocationId" as a
            // location just as readily as the name patterns did.
            if (IGNORE.test(haystack) || ABOUT_THE_JOB.test(fieldName) || ABOUT_THE_JOB.test(fieldId)) {
                unmatched.push(field);
                continue;
            }

            let profileKey = null;
            let source = "rule_engine";
            let confidence = 0;

            // 1. What this platform calls it.
            if (site && ats) {
                profileKey = ats.keyForField(site, field.name, field.id);
                if (profileKey) {
                    source = `ats:${site.id}`;
                    confidence = 100;
                }
            }

            // 2. What every platform calls it.
            if (!profileKey) {
                profileKey = keyFromName(field);
                if (profileKey) {
                    source = "field_name";
                    confidence = 90;
                }
            }

            // 3. What the recruiter wrote on it.
            if (!profileKey) {
                let bestRule = null;
                let bestScore = 0;
                for (const rule of RULES) {
                    const score = scoreField(field, rule);
                    if (score > bestScore) {
                        bestScore = score;
                        bestRule = rule;
                    }
                }
                if (bestRule && bestScore >= 48) {
                    profileKey = bestRule.profileKey;
                    confidence = bestScore;
                }
            }

            const value = profileKey ? getProfileValue(profile, profileKey) : null;
            if (value) {
                matched.push({
                    action: "fill_input",
                    selector: field.selector,
                    value,
                    field: field.label || field.name || field.placeholder,
                    source,
                    confidence,
                    ruleKey: profileKey,
                });
            } else {
                unmatched.push(field);
            }
        }

        return { matched, unmatched, platform: site ? site.id : null };
    }

    return { match, RULES, normalize, normalizeName, keyFromName, scoreField, NAME_PATTERNS };
})();

if (typeof window !== "undefined") {
    window.Vignova_RuleEngine = RuleEngine;
}
