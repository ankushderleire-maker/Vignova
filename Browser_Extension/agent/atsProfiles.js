/**
 * Vignova Agent — ATS platforms
 * =============================
 * Which applicant tracking system a page belongs to, and the field names that
 * system is known to use.
 *
 * The generic matcher reads labels and guesses. That works, but it guesses
 * hardest on exactly the forms people apply through most, because an ATS names
 * its inputs by convention: Lever posts a candidate's LinkedIn as
 * `urls[LinkedIn]`, Ashby as `_systemfield_linkedin`, Greenhouse as
 * `job_application[first_name]`. Where the convention is known there is
 * nothing to guess, so it is written down here and checked first.
 *
 * SITES is also the list the extension shows as "sites autofill supports" —
 * the same data, so the list cannot drift from what the code actually knows.
 */

const AtsProfiles = (() => {
    "use strict";

    /**
     * One entry per platform.
     *
     * `hosts` are matched against the hostname as suffixes or substrings.
     * `fields` maps a profile key to the input names/ids that platform uses,
     * lower-cased and stripped of punctuation the same way a page's own names
     * are before comparison.
     */
    const SITES = [
        {
            id: "greenhouse",
            name: "Greenhouse",
            hosts: ["greenhouse.io", "job-boards.greenhouse.io", "boards.greenhouse.io"],
            fields: {
                first_name: ["first name", "job application first name"],
                last_name: ["last name", "job application last name"],
                email: ["email", "job application email"],
                phone: ["phone", "job application phone"],
                _resume: ["resume", "resume text", "s3 file"],
                _cover_letter: ["cover letter", "cover letter text"],
            },
        },
        {
            id: "lever",
            name: "Lever",
            hosts: ["jobs.lever.co", "lever.co"],
            fields: {
                _full_name: ["name"],
                email: ["email"],
                phone: ["phone"],
                current_company: ["org"],
                linkedin: ["urls linkedin"],
                github: ["urls github"],
                portfolio: ["urls portfolio", "urls other"],
                city: ["location"],
                _resume: ["resume"],
            },
        },
        {
            id: "ashby",
            name: "Ashby",
            hosts: ["jobs.ashbyhq.com", "ashbyhq.com"],
            fields: {
                _full_name: ["systemfield name", "name"],
                email: ["systemfield email", "email"],
                phone: ["systemfield phone", "phone"],
                linkedin: ["systemfield linkedin"],
                github: ["systemfield github"],
                portfolio: ["systemfield website"],
                city: ["systemfield location"],
                _resume: ["systemfield resume", "resume"],
            },
        },
        {
            id: "workable",
            name: "Workable",
            hosts: ["apply.workable.com", "workable.com"],
            fields: {
                first_name: ["firstname", "candidate firstname"],
                last_name: ["lastname", "candidate lastname"],
                email: ["email", "candidate email"],
                phone: ["phone", "candidate phone"],
                address: ["address", "candidate address"],
                current_title: ["headline"],
                summary: ["summary"],
                _resume: ["resume", "cv"],
            },
        },
        {
            id: "smartrecruiters",
            name: "SmartRecruiters",
            hosts: ["jobs.smartrecruiters.com", "smartrecruiters.com"],
            fields: {
                first_name: ["firstname"],
                last_name: ["lastname"],
                email: ["email"],
                phone: ["phonenumber", "phone number"],
                city: ["location input", "location"],
                linkedin: ["web linkedin", "linkedin"],
                _resume: ["resume", "attachment"],
            },
        },
        {
            id: "jazzhr",
            name: "JazzHR",
            hosts: ["applytojob.com", "jazz.co", "jazzhr.com"],
            fields: {
                first_name: ["first name"],
                last_name: ["last name"],
                email: ["email"],
                phone: ["phone"],
                _resume: ["resume", "file"],
            },
        },
        {
            id: "jobvite",
            name: "Jobvite",
            hosts: ["jobs.jobvite.com", "jobvite.com"],
            fields: {
                first_name: ["firstname", "first name"],
                last_name: ["lastname", "last name"],
                email: ["email"],
                phone: ["phone"],
                _resume: ["resume", "resumefile"],
            },
        },
        {
            id: "breezy",
            name: "Breezy",
            hosts: ["breezy.hr"],
            fields: {
                _full_name: ["name"],
                email: ["email"],
                phone: ["phone number", "phone"],
                linkedin: ["linkedin"],
                _resume: ["resume"],
            },
        },
        {
            id: "rippling",
            name: "Rippling",
            hosts: ["ats.rippling.com", "rippling.com", "rippling-ats.com"],
            fields: {
                first_name: ["firstname", "first name"],
                last_name: ["lastname", "last name"],
                email: ["email"],
                phone: ["phone", "phonenumber"],
                linkedin: ["linkedin", "linkedinurl"],
                _resume: ["resume"],
            },
        },
        {
            id: "freshteam",
            name: "Freshteam",
            hosts: ["freshteam.com"],
            fields: {
                first_name: ["applicant first name", "first name"],
                last_name: ["applicant last name", "last name"],
                email: ["applicant email", "email"],
                phone: ["applicant phone", "phone"],
                _resume: ["applicant resume", "resume"],
            },
        },
        {
            id: "jobscore",
            name: "JobScore",
            hosts: ["jobscore.com"],
            fields: {
                first_name: ["first name", "candidate first name"],
                last_name: ["last name", "candidate last name"],
                email: ["email", "candidate email"],
                phone: ["phone", "candidate phone"],
                _resume: ["resume", "candidate resume"],
            },
        },
        {
            id: "pinpoint",
            name: "Pinpoint",
            hosts: ["pinpointhq.com", "pinpoint.jobs"],
            fields: {
                first_name: ["first name"],
                last_name: ["last name"],
                email: ["email"],
                phone: ["phone", "phone number"],
                linkedin: ["linkedin", "linkedin url"],
                _resume: ["resume", "cv"],
            },
        },
        {
            id: "okta",
            name: "Okta",
            hosts: ["okta.com"],
            fields: {},
        },
        {
            id: "workday",
            name: "Workday",
            hosts: ["myworkdayjobs.com", "workday.com"],
            fields: {
                first_name: ["legalnamesection firstname", "firstname"],
                last_name: ["legalnamesection lastname", "lastname"],
                email: ["email", "emailaddress"],
                phone: ["phone number", "phonenumber"],
            },
        },
        {
            id: "icims",
            name: "iCIMS",
            hosts: ["icims.com"],
            fields: {
                first_name: ["firstname"],
                last_name: ["lastname"],
                email: ["email"],
                phone: ["phone"],
            },
        },
        {
            id: "teamtailor",
            name: "Teamtailor",
            hosts: ["teamtailor.com"],
            fields: {
                _full_name: ["candidate name", "name"],
                email: ["candidate email", "email"],
                phone: ["candidate phone", "phone"],
                _resume: ["candidate resume", "resume"],
            },
        },
        {
            id: "recruitee",
            name: "Recruitee",
            hosts: ["recruitee.com"],
            fields: {
                _full_name: ["candidate name", "name"],
                email: ["candidate email", "email"],
                phone: ["candidate phone", "phone"],
                _resume: ["candidate cv", "cv", "resume"],
            },
        },
        {
            id: "bamboohr",
            name: "BambooHR",
            hosts: ["bamboohr.com"],
            fields: {
                first_name: ["firstname", "first name"],
                last_name: ["lastname", "last name"],
                email: ["email"],
                phone: ["phone"],
                _resume: ["resume"],
            },
        },
        {
            id: "personio",
            name: "Personio",
            hosts: ["jobs.personio.de", "personio.com", "personio.de"],
            fields: {
                first_name: ["job application first name", "first name"],
                last_name: ["job application last name", "last name"],
                email: ["job application email", "email"],
                phone: ["job application phone", "phone"],
            },
        },
        {
            id: "zoho",
            name: "Zoho Recruit",
            hosts: ["zohorecruit.com", "zoho.com"],
            fields: {
                first_name: ["first name"],
                last_name: ["last name"],
                email: ["email"],
                phone: ["phone", "mobile"],
            },
        },
    ];

    /** Employers whose own careers site runs a known ATS behind the scenes. */
    const HOSTED = [
        { id: "uber", name: "Uber", hosts: ["uber.com"] },
        { id: "waymo", name: "Waymo", hosts: ["waymo.com"] },
    ];

    /**
     * The names a page uses, reduced the way this file writes them:
     * lower case, punctuation to spaces, runs collapsed. `urls[LinkedIn]`
     * and `candidate[first_name]` both become plain words.
     */
    function normalizeName(value) {
        return String(value || "")
            .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function detect(hostname) {
        const host = String(hostname || (typeof location !== "undefined" ? location.hostname : "")).toLowerCase();
        if (!host) return null;
        return (
            SITES.find((site) => site.hosts.some((h) => host === h || host.endsWith("." + h) || host.includes(h))) || null
        );
    }

    /**
     * The profile key this platform gives an input of this name, or null.
     * Both the name and the id are worth trying: platforms differ on which
     * one carries the meaning.
     */
    function keyForField(site, name, id) {
        if (!site || !site.fields) return null;

        const candidates = [normalizeName(name), normalizeName(id)].filter(Boolean);
        if (!candidates.length) return null;

        for (const [profileKey, names] of Object.entries(site.fields)) {
            for (const known of names) {
                if (candidates.includes(known)) return profileKey;
            }
        }
        return null;
    }

    /** What the popup lists as supported, newest platforms last. */
    function supportedSites() {
        return SITES.concat(HOSTED)
            .map((s) => ({ id: s.id, name: s.name, host: s.hosts[0] }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    return { SITES, HOSTED, detect, keyForField, supportedSites, normalizeName };
})();

if (typeof window !== "undefined") {
    window.Vignova_AtsProfiles = AtsProfiles;
}
