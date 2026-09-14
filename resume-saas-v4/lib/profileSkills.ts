/** The most skills a Master Profile's Skills section holds. */
export const MAX_PROFILE_SKILLS = 70;

const split = (value: unknown) =>
    String(value ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
const names = (value: unknown) =>
    Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : split(value);

/**
 * The skills the dashboard's Skills section shows and edits.
 *
 * The dashboard stores { technical: "a, b", soft: "" } and edits only
 * `technical`; older imports wrote an array or a plain comma-separated string.
 * The limit counts what the user can see and remove.
 */
export function sectionSkills(skills: unknown): string[] {
    if (skills && typeof skills === "object" && !Array.isArray(skills)) {
        return names((skills as Record<string, unknown>).technical);
    }
    return names(skills);
}

/**
 * A Master Profile's skills with one more appended, in whatever shape the
 * profile stores them. All three shapes are live in the database, and adding a
 * skill must keep the shape it found or the profile page stops reading the
 * list. A skill already present, in any casing, is left alone; a full section
 * is left alone and reported as full.
 */
export function withSkill(skills: unknown, skill: string): { skills: unknown; added: boolean; full: boolean } {
    const key = skill.trim().toLowerCase();
    const present =
        skills && typeof skills === "object" && !Array.isArray(skills)
            ? Object.values(skills as Record<string, unknown>).some((value) => names(value).some((name) => name.toLowerCase() === key))
            : names(skills).some((name) => name.toLowerCase() === key);
    if (present) return { skills, added: false, full: false };
    if (sectionSkills(skills).length >= MAX_PROFILE_SKILLS) return { skills, added: false, full: true };

    if (Array.isArray(skills)) return { skills: [...skills, skill], added: true, full: false };
    if (skills && typeof skills === "object") {
        const record = skills as Record<string, unknown>;
        const technical = record.technical;
        return {
            skills: {
                ...record,
                technical: Array.isArray(technical) ? [...technical, skill] : [...split(technical), skill].join(", "),
            },
            added: true,
            full: false,
        };
    }
    return { skills: { technical: [...split(skills), skill].join(", "), soft: "" }, added: true, full: false };
}

/**
 * The skills cut to the section limit, keeping their shape and order. Imports
 * and saves go through this, so a profile never stores more than the limit.
 */
export function capSkills(skills: unknown, max = MAX_PROFILE_SKILLS): { skills: unknown; removed: number } {
    const count = sectionSkills(skills).length;
    if (count <= max) return { skills, removed: 0 };
    const removed = count - max;
    if (Array.isArray(skills)) return { skills: skills.slice(0, max), removed };
    if (skills && typeof skills === "object") {
        const record = skills as Record<string, unknown>;
        const technical = record.technical;
        return {
            skills: {
                ...record,
                technical: Array.isArray(technical) ? technical.slice(0, max) : split(technical).slice(0, max).join(", "),
            },
            removed,
        };
    }
    return { skills: split(skills).slice(0, max).join(", "), removed };
}

/** Profile data with its Skills section cut to the limit; everything else passes through. */
export function capProfileSkills<T>(parsedData: T): T {
    if (!parsedData || typeof parsedData !== "object" || Array.isArray(parsedData)) return parsedData;
    const record = parsedData as Record<string, unknown>;
    if (!("skills" in record)) return parsedData;
    return { ...record, skills: capSkills(record.skills).skills } as T;
}
