import { cleanSkills } from "@/lib/linkedin-skills";

/**
 * The Naukri profile the extension reads off naukri.com/mnjuser/profile.
 *
 * Naukri has no API, so the extension scrapes the page and posts this shape.
 * It is untrusted input from a browser, so everything passes through
 * sanitizeNaukriProfile before it is stored or sent to a model.
 */
export type NaukriEmployment = { designation: string; company: string; employmentType: string; duration: string; description: string };
export type NaukriEducation = { degree: string; specialization: string; institute: string; duration: string; courseType: string };
export type NaukriItSkill = { skills: string; version: string; lastUsed: string; experience: string };
export type NaukriProject = { title: string; client: string; duration: string; description: string };
export type NaukriLink = { title: string; url: string; description: string };

export type NaukriProfile = {
    source: "naukri";
    profileUrl: string;
    name: string;
    location: string;
    experience: string;
    noticePeriod: string;
    profileCompleteness: number | null;
    lastUpdated: string;
    headline: string;
    keySkills: string[];
    employment: NaukriEmployment[];
    education: NaukriEducation[];
    itSkills: NaukriItSkill[];
    projects: NaukriProject[];
    profileSummary: string;
    accomplishments: Record<AccomplishmentKind, NaukriLink[]>;
    careerProfile: Record<string, string>;
    languages: { language: string; proficiency: string }[];
    resumeFileName: string;
};

/** Naukri's own field limits, which every rewrite has to fit. */
export const NAUKRI_LIMITS = { headline: 250, profileSummary: 1000, jobProfile: 4000, projectDetails: 1000, keySkills: 50 } as const;

export const ACCOMPLISHMENT_KINDS = ["onlineProfiles", "workSamples", "publications", "presentations", "patents", "certifications"] as const;
export type AccomplishmentKind = (typeof ACCOMPLISHMENT_KINDS)[number];

export const ACCOMPLISHMENT_LABELS: Record<AccomplishmentKind, string> = {
    onlineProfiles: "Online profiles",
    workSamples: "Work samples",
    publications: "Publications",
    presentations: "Presentations",
    patents: "Patents",
    certifications: "Certifications",
};

/**
 * Career profile fields worth keeping. Salary is left out on purpose: nothing
 * in the optimizer uses it.
 */
const CAREER_FIELDS = [
    "Current industry", "Department", "Role category", "Job role", "Desired job type",
    "Desired employment type", "Preferred job role", "Preferred work location", "Preferred shift",
];

const clean = (value: unknown, max = 300) =>
    typeof value === "string"
        ? value.normalize("NFKC").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/[ \t]+/g, " ").trim().slice(0, max)
        : "";
const records = (value: unknown, max: number): Record<string, unknown>[] =>
    Array.isArray(value) ? value.filter((item) => item && typeof item === "object").slice(0, max) : [];
const safeUrl = (value: unknown) => {
    const url = clean(value, 500);
    return /^https?:\/\//i.test(url) ? url : "";
};

/** The profile as stored: clamped, cleaned, and reduced to the fields above. Null when nothing in it can be optimized. */
export function sanitizeNaukriProfile(value: unknown): NaukriProfile | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const raw = value as Record<string, unknown>;
    const nested = (key: string) => (raw[key] && typeof raw[key] === "object" ? (raw[key] as Record<string, unknown>) : {});

    const accomplishments = Object.fromEntries(
        ACCOMPLISHMENT_KINDS.map((kind) => [
            kind,
            records(nested("accomplishments")[kind], 20)
                .map((item) => ({ title: clean(item.title, 200), url: safeUrl(item.url), description: clean(item.description, 1000) }))
                .filter((item) => item.title || item.url),
        ])
    ) as Record<AccomplishmentKind, NaukriLink[]>;

    const career = nested("careerProfile");
    const careerProfile = Object.fromEntries(
        CAREER_FIELDS.map((field) => [field, clean(career[field])]).filter(([, text]) => text && text !== "-")
    );

    const completeness = Number(raw.profileCompleteness);
    const profile: NaukriProfile = {
        source: "naukri",
        profileUrl: safeUrl(raw.profileUrl) || "https://www.naukri.com/mnjuser/profile",
        name: clean(raw.name, 120),
        location: clean(raw.location, 160),
        experience: clean(raw.experience, 80),
        noticePeriod: clean(raw.noticePeriod, 120),
        profileCompleteness:
            raw.profileCompleteness !== null && Number.isFinite(completeness) && completeness >= 0 && completeness <= 100
                ? Math.round(completeness)
                : null,
        lastUpdated: clean(raw.lastUpdated, 60),
        headline: clean(raw.headline, 1000),
        keySkills: cleanSkills(raw.keySkills, 100),
        employment: records(raw.employment, 30)
            .map((item) => ({
                designation: clean(item.designation, 200),
                company: clean(item.company, 200),
                employmentType: clean(item.employmentType, 60),
                duration: clean(item.duration, 120),
                description: clean(item.description, 6000),
            }))
            .filter((item) => item.designation || item.company),
        education: records(raw.education, 20)
            .map((item) => ({
                degree: clean(item.degree, 200),
                specialization: clean(item.specialization, 200),
                institute: clean(item.institute, 200),
                duration: clean(item.duration, 60),
                courseType: clean(item.courseType, 60),
            }))
            .filter((item) => item.degree || item.institute),
        itSkills: records(raw.itSkills, 60)
            .map((item) => ({
                skills: clean(item.skills),
                version: clean(item.version, 60),
                lastUsed: clean(item.lastUsed, 60),
                experience: clean(item.experience, 60),
            }))
            .filter((item) => item.skills),
        projects: records(raw.projects, 30)
            .map((item) => ({
                title: clean(item.title, 200),
                client: clean(item.client, 200),
                duration: clean(item.duration, 120),
                description: clean(item.description, 6000),
            }))
            .filter((item) => item.title),
        profileSummary: clean(raw.profileSummary, 5000),
        accomplishments,
        careerProfile,
        languages: records(raw.languages, 15)
            .map((item) => ({ language: clean(item.language, 60), proficiency: clean(item.proficiency, 60) }))
            .filter((item) => item.language),
        resumeFileName: clean(raw.resumeFileName, 200),
    };

    const hasContent = profile.headline || profile.profileSummary || profile.keySkills.length || profile.employment.length;
    return hasContent ? profile : null;
}

/**
 * The scraped profile with a rewrite's text laid over it. Only the fields
 * Naukri lets a user edit as free text change; entries keep their titles,
 * companies and dates.
 */
export function applyNaukriRewrite(current: NaukriProfile, rewrite: unknown): NaukriProfile {
    const next: Record<string, unknown> = rewrite && typeof rewrite === "object" ? (rewrite as Record<string, unknown>) : {};
    const text = (value: unknown, max: number) => clean(value, max);
    const described = (items: unknown, i: number) =>
        Array.isArray(items) && items[i] && typeof items[i] === "object" ? text((items[i] as Record<string, unknown>).description, 6000) : "";
    const skills = cleanSkills(next.keySkills, 100);
    return {
        ...current,
        headline: text(next.headline, 1000) || current.headline,
        profileSummary: text(next.profileSummary, 5000) || current.profileSummary,
        keySkills: skills.length ? skills : current.keySkills,
        employment: current.employment.map((item, i) => ({ ...item, description: described(next.employment, i) || item.description })),
        projects: [
            ...current.projects.map((item, i) => ({ ...item, description: described(next.projects, i) || item.description })),
            // Projects the rewrite brought in from the Master Profile follow the ones already on Naukri.
            ...(Array.isArray(next.projects) ? next.projects.slice(current.projects.length) : [])
                .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
                .map((item) => ({
                    title: text(item.title, 200),
                    client: text(item.client, 200),
                    duration: text(item.duration, 120),
                    description: text(item.description, 6000),
                }))
                .filter((item) => item.title),
        ],
    };
}

/** Counts for the "Read from Naukri" tiles. */
export function summarizeNaukriProfile(profile: NaukriProfile | null): { label: string; value: number }[] {
    if (!profile) return [];
    const links = ACCOMPLISHMENT_KINDS.reduce((sum, kind) => sum + profile.accomplishments[kind].length, 0);
    return [
        { label: "Key skills", value: profile.keySkills.length },
        { label: "Roles", value: profile.employment.length },
        { label: "Education", value: profile.education.length },
        { label: "IT skills", value: profile.itSkills.length },
        { label: "Projects", value: profile.projects.length },
        { label: "Accomplishments", value: links },
    ].filter((item) => item.value > 0);
}
