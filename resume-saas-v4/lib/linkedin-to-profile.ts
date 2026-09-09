/**
 * Maps an imported LinkedIn profile onto the Master Profile shape.
 *
 * The two models disagree in one important way: LinkedIn gives a single
 * human-readable span per entry ("Jan 2020 - Present · 2 yrs") while the
 * Master Profile keeps startDate and endDate apart, so the span has to be
 * taken back apart. Everything else is a field rename.
 *
 * Nothing here invents data. LinkedIn does not publish an email or a phone
 * number, so those stay empty for the user to fill in rather than being
 * guessed at from the profile.
 */

type Experience = { id: string; company: string; role: string; location: string; startDate: string; endDate: string; description: string };
type Education = { id: string; school: string; degree: string; field: string; startDate: string; endDate: string; grade: string };
type Project = { id: string; name: string; techStack: string; link: string; description: string };
type Certification = { id: string; name: string; issuer: string; date: string; url: string };
type Language = { id: string; name: string; proficiency: string };

export type ImportedProfile = {
    fullName: string; jobTitle: string; email: string; phone: string;
    location: string; website: string; linkedin: string; github: string;
    summary: string;
    skills: { technical: string; soft: string };
    experience: Experience[];
    education: Education[];
    projects: Project[];
    certifications: Certification[];
    languages: Language[];
};

/** What the import actually found, so the UI can say so instead of guessing. */
export type ImportSummary = {
    experience: number;
    education: number;
    skills: number;
    projects: number;
    certifications: number;
    languages: number;
};

let seq = 0;
const nextId = () => `li-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/**
 * Splits "Jan 2020 - Present · 2 yrs" into its start and end.
 *
 * The duration suffix after "·" is dropped, and a span with no four-digit year
 * anywhere ("2 yrs 3 mos", which is all LinkedIn shows for some entries) gives
 * two empty strings — better an empty date field than "2 yrs" sitting in one.
 */
export function splitDateRange(range: unknown): { startDate: string; endDate: string } {
    const raw = text(range);
    if (!raw || !/\d{4}/.test(raw)) return { startDate: "", endDate: "" };

    // Drop the "· 2 yrs" tail, then split on any dash variant with spaces
    // around it — bare hyphens appear inside month names in some locales.
    const span = raw.split("·")[0].trim();
    const parts = span.split(/\s+[-–—]\s+/).map((p) => p.trim()).filter(Boolean);

    if (parts.length === 0) return { startDate: "", endDate: "" };
    if (parts.length === 1) return { startDate: parts[0], endDate: "" };

    // "2000 - Present - 25 yrs" leaves a trailing duration; only the first two
    // parts are dates.
    return { startDate: parts[0], endDate: parts[1] };
}

/** Pulls a named site out of the profile's website list. */
function siteMatching(websites: unknown, host: string): string {
    if (!Array.isArray(websites)) return "";
    const hit = websites.map(text).find((w) => w.toLowerCase().includes(host));
    return hit || "";
}

function firstNonMatching(websites: unknown, hosts: string[]): string {
    if (!Array.isArray(websites)) return "";
    const hit = websites
        .map(text)
        .find((w) => w && !hosts.some((h) => w.toLowerCase().includes(h)));
    return hit || "";
}

const list = (v: unknown): any[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);

export function linkedInToProfile(raw: any): { profile: ImportedProfile; summary: ImportSummary } {
    const p = raw && typeof raw === "object" ? raw : {};

    const fullName =
        text(p.name) || [text(p.firstName), text(p.lastName)].filter(Boolean).join(" ");

    const experience: Experience[] = list(p.experience).map((e) => {
        const { startDate, endDate } = splitDateRange(e.dateRange);
        return {
            id: nextId(),
            company: text(e.company),
            role: text(e.title),
            location: text(e.location),
            startDate,
            endDate,
            description: text(e.description),
        };
    });

    const education: Education[] = list(p.education).map((e) => {
        const { startDate, endDate } = splitDateRange(e.dateRange);
        // The backend already folds field of study into `degree` ("BSc,
        // Computer Science"), so splitting it back out would only re-guess
        // something it has already decided.
        return {
            id: nextId(),
            school: text(e.school),
            degree: text(e.degree),
            field: "",
            startDate,
            endDate,
            grade: "",
        };
    });

    const projects: Project[] = list(p.projects).map((e) => ({
        id: nextId(),
        name: text(e.title),
        techStack: "",
        link: text(e.url),
        description: text(e.description),
    }));

    const certifications: Certification[] = list(p.certifications).map((e) => ({
        id: nextId(),
        name: text(e.name),
        issuer: text(e.organization),
        date: text(e.issueDate),
        url: text(e.url),
    }));

    const languages: Language[] = list(p.languages).map((e) => ({
        id: nextId(),
        name: text(e.name),
        proficiency: text(e.proficiency),
    }));

    const skills = Array.isArray(p.skills) ? p.skills.map(text).filter(Boolean) : [];

    const profile: ImportedProfile = {
        fullName,
        // The headline is what someone calls themselves; the current role title
        // is the fallback when the headline is a slogan rather than a job.
        jobTitle: text(p.headline) || text(experience[0]?.role),
        email: "",
        phone: "",
        location: text(p.location),
        website: firstNonMatching(p.websites, ["github.com", "linkedin.com"]),
        linkedin: text(p.linkedinUrl),
        github: siteMatching(p.websites, "github.com"),
        summary: text(p.about),
        // Everything lands in technical: LinkedIn does not distinguish, and
        // sorting someone's skills for them would be a guess they then have to
        // undo.
        skills: { technical: skills.join(", "), soft: "" },
        experience,
        education,
        projects,
        certifications,
        languages,
    };

    return {
        profile,
        summary: {
            experience: experience.length,
            education: education.length,
            skills: skills.length,
            projects: projects.length,
            certifications: certifications.length,
            languages: languages.length,
        },
    };
}
