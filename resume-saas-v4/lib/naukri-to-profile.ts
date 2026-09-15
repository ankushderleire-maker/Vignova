/**
 * Maps a Naukri profile, as the extension read it off naukri.com, onto the
 * Master Profile shape. The Naukri counterpart of linkedin-to-profile.
 *
 * Naukri shows an entry's dates as one line ("Jan 2021 to Present (4 years
 * 8 months)", "2014-2018"), so they are taken apart here; everything else is
 * a field rename. Nothing is invented: the scan leaves out email, phone and
 * other personal details on purpose, so those stay empty and the form keeps
 * whatever the user typed.
 */

import type { ImportedProfile, ImportSummary } from "@/lib/linkedin-to-profile";
import { sanitizeNaukriProfile } from "@/lib/naukri-profile";
import { MAX_PROFILE_SKILLS } from "@/lib/profileSkills";

let seq = 0;
const nextId = () => `nk-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
/** One date inside a span: "Jan 2021", "2014", or an open end. */
const DATE = new RegExp(`(?:\\b${MONTH}\\s+)?\\b(?:19|20)\\d{2}\\b|\\b(?:present|till date|current)\\b`, "i");
const OPEN_END = /^(?:present|till date|current)$/i;

/**
 * Splits a Naukri date line into its start and end.
 *
 *   "Jan 2021 to Present (4 years 8 months)"  ->  Jan 2021 / Present
 *   "Aug 2018 - Jun 2021"                      ->  Aug 2018 / Jun 2021
 *   "2014-2018"                                ->  2014 / 2018
 *
 * A lone date is the start of a job but the end of a course, which Naukri
 * shows by the year it was completed. A line with no year at all ("4 years
 * 8 months") gives nothing: a length is not a date.
 */
export function splitNaukriDuration(value: unknown, lone: "start" | "end" = "start"): { startDate: string; endDate: string } {
    // The "(4 years 8 months)" length after the dates belongs to neither.
    const span = (typeof value === "string" ? value : "").replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
    const pieces = /\sto\s/i.test(span) ? span.split(/\s+to\s+/i) : span.split(/\s*[-–—]\s*/);
    const dates = pieces
        .map((piece) => piece.match(DATE)?.[0] ?? "")
        .filter(Boolean)
        .map((date) => (OPEN_END.test(date) ? "Present" : date));

    if (!dates.some((date) => /\d{4}/.test(date))) return { startDate: "", endDate: "" };
    if (dates.length === 1) return lone === "end" ? { startDate: "", endDate: dates[0] } : { startDate: dates[0], endDate: "" };
    return { startDate: dates[0], endDate: dates[1] };
}

/** Drops blanks and repeats, ignoring case, keeping the first spelling. */
function unique(values: string[]): string[] {
    const seen = new Set<string>();
    return values.filter((value) => {
        const key = value.toLowerCase();
        if (!value || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export function naukriToProfile(raw: unknown): { profile: ImportedProfile; summary: ImportSummary } | null {
    const p = sanitizeNaukriProfile(raw);
    if (!p) return null;

    const experience = p.employment.map((job) => ({
        id: nextId(),
        company: job.company,
        role: job.designation,
        location: "",
        ...splitNaukriDuration(job.duration),
        description: job.description,
    }));

    const education = p.education.map((course) => ({
        id: nextId(),
        school: course.institute,
        degree: course.degree,
        field: course.specialization,
        ...splitNaukriDuration(course.duration, "end"),
        grade: "",
    }));

    const projects = p.projects.map((project) => ({
        id: nextId(),
        name: project.title,
        techStack: "",
        link: "",
        // The Master Profile has no client field, and who the work was for is
        // part of what it was.
        description: [project.client && `Client: ${project.client}`, project.description].filter(Boolean).join("\n"),
    }));

    const certifications = p.accomplishments.certifications.map((cert) => ({
        id: nextId(),
        name: cert.title,
        issuer: "",
        date: "",
        url: cert.url,
    }));

    const languages = p.languages.map((lang) => ({ id: nextId(), name: lang.language, proficiency: lang.proficiency }));

    // Key skills lead, as the ones the person chose to show first, then the IT
    // skills table; capped like every Master Profile.
    const skills = unique(
        [...p.keySkills, ...p.itSkills.flatMap((row) => row.skills.split(","))].map((skill) => skill.trim())
    ).slice(0, MAX_PROFILE_SKILLS);

    const links = [...p.accomplishments.onlineProfiles, ...p.accomplishments.workSamples].map((link) => link.url).filter(Boolean);
    const linkOn = (host: string) => links.find((url) => url.toLowerCase().includes(host)) || "";

    const profile: ImportedProfile = {
        fullName: p.name,
        // Naukri's resume headline is a sentence ("Data scientist with five
        // years of..."), so the current designation is the title and the
        // headline only stands in when it is short enough to be one.
        jobTitle: p.employment[0]?.designation || (p.headline.length <= 80 ? p.headline : ""),
        email: "",
        phone: "",
        location: p.location,
        website: links.find((url) => !/linkedin\.com|github\.com/i.test(url)) || "",
        linkedin: linkOn("linkedin.com"),
        github: linkOn("github.com"),
        summary: p.profileSummary || p.headline,
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
