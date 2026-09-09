/** Skill-only values for new results and previously saved LinkedIn analyses. */
const headings = new Set([
    "skill", "skills", "technical skills", "soft skills", "top skills",
    "certification", "certifications", "licenses & certifications", "contact",
    "contact info", "contact information", "personal information", "personal details",
    "email", "email address", "phone", "phone number", "mobile", "address",
    "name", "full name", "location", "education", "experience", "projects",
    "summary", "about", "interests", "references", "n/a", "none", "null",
]);
const skillGroups = new Set([
    "technical", "soft", "languages", "frameworks", "databases", "cloud", "devops",
    "other", "items", "values", "list", "skills", "skill", "technicalskills",
    "softskills", "topskills", "skilldetails", "associatedskills", "technologies",
    "technology", "techstack", "tools", "competencies", "expertise",
]);
type SkillRecord = Record<string, unknown>;
export type LinkedInSkill = { name: string; endorsements?: string; positions?: string[] };

export function cleanSkillName(value: unknown): string {
    if (typeof value !== "string") return "";
    const text = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, "")
        .replace(/\s+/g, " ").replace(/^[\s*•:-]+|[\s*•:-]+$/g, "");
    if (!text || text.length > 100 || !/\p{L}/u.test(text)) return "";
    if (headings.has(text.toLowerCase()) || text.includes("@")) return "";
    if (/(?:https?:\/\/|www\.|mailto:|tel:|(?:linkedin\.com|github\.com)\/)/i.test(text)) return "";
    if (/^(?:e-?mail|phone|mobile|telephone|contact|address|location|full name)\s*[:=]/i.test(text)) return "";
    const phones = text.match(/(?<!\w)\+?\d[\d\s().-]{5,}\d(?!\w)/g) || [];
    if (phones.some(phone => (phone.match(/\d/g) || []).length >= 7)) return "";
    return text;
}

function splitSkills(text: string): string[] {
    let depth = 0, start = 0;
    const result: string[] = [];
    for (let i = 0; i < text.length; i++) {
        if ("([".includes(text[i])) depth++;
        else if (")]".includes(text[i])) depth = Math.max(0, depth - 1);
        else if (",;|\n\r•".includes(text[i]) && depth === 0) {
            result.push(text.slice(start, i));
            start = i + 1;
        }
    }
    result.push(text.slice(start));
    return result;
}

export function cleanSkills(value: unknown, limit = 80): string[] {
    const result: string[] = [], seen = new Set<string>();
    function add(item: unknown) {
        if (typeof item === "string") {
            for (const part of splitSkills(item)) {
                const name = cleanSkillName(part);
                if (name && !seen.has(name.toLowerCase()) && result.length < limit) {
                    seen.add(name.toLowerCase());
                    result.push(name);
                }
            }
        } else if (Array.isArray(item)) item.forEach(add);
        else if (item && typeof item === "object") {
            const record = item as SkillRecord;
            for (const field of ["name", "title", "skill", "text"]) {
                if (typeof record[field] === "string" && record[field].trim()) {
                    add(record[field]);
                    return;
                }
            }
            for (const [key, child] of Object.entries(record)) {
                if (skillGroups.has(key.toLowerCase().replace(/[^a-z]/g, ""))) add(child);
            }
        }
    }
    add(value);
    return result;
}

export function cleanSkillDetails(value: unknown): LinkedInSkill[] {
    const seen = new Set<string>();
    return (Array.isArray(value) ? value : cleanSkills(value)).flatMap(item =>
        cleanSkills(item).filter(name => {
            if (seen.has(name.toLowerCase())) return false;
            seen.add(name.toLowerCase());
            return true;
        }).map(name => ({ ...(item && typeof item === "object" ? item : {}), name }))
    );
}

/** Decode legacy JSON strings, then clean only skill fields; contact info stays intact. */
export function sanitizeLinkedInProfile(value: unknown): Record<string, any> | null {
    let parsed = value;
    for (let i = 0; i < 5 && typeof parsed === "string"; i++) {
        try { parsed = JSON.parse(parsed); } catch { return null; }
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const profile = { ...(parsed as SkillRecord) };
    if ("skills" in profile) profile.skills = cleanSkills(profile.skills);
    if ("topSkills" in profile) profile.topSkills = cleanSkills(profile.topSkills);
    if ("skillDetails" in profile) profile.skillDetails = cleanSkillDetails(profile.skillDetails);
    for (const section of ["experience", "education", "projects"]) {
        if (!Array.isArray(profile[section])) continue;
        profile[section] = profile[section].map((item: unknown) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return item;
            const entry = { ...(item as SkillRecord) };
            if ("skills" in entry) entry.skills = cleanSkills(entry.skills);
            if ("associatedSkills" in entry) entry.associatedSkills = cleanSkills(entry.associatedSkills).join(", ");
            return entry;
        });
    }
    return profile;
}
