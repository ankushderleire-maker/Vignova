/**
 * A Master Profile's skills with one more appended, in whatever shape the
 * profile stores them.
 *
 * The dashboard edits skills as { technical: "a, b", soft: "" }, older imports
 * wrote an array or a plain comma-separated string, and all three are live in
 * the database. Adding a skill must keep the shape it found, or the profile
 * page stops reading the list. A skill already present, in any casing, is left
 * alone and reported as not added.
 */
export function withSkill(skills: unknown, skill: string): { skills: unknown; added: boolean } {
    const key = skill.trim().toLowerCase();
    const split = (value: unknown) =>
        String(value ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
    const names = (value: unknown) => (Array.isArray(value) ? value.map((item) => String(item).trim()) : split(value));

    if (Array.isArray(skills)) {
        if (names(skills).some((name) => name.toLowerCase() === key)) return { skills, added: false };
        return { skills: [...skills, skill], added: true };
    }

    if (skills && typeof skills === "object") {
        const record = skills as Record<string, unknown>;
        const present = Object.values(record).some((value) => names(value).some((name) => name.toLowerCase() === key));
        if (present) return { skills, added: false };
        const technical = record.technical;
        return {
            skills: {
                ...record,
                technical: Array.isArray(technical) ? [...technical, skill] : [...split(technical), skill].join(", "),
            },
            added: true,
        };
    }

    const current = split(skills);
    if (current.some((name) => name.toLowerCase() === key)) return { skills, added: false };
    return { skills: { technical: [...current, skill].join(", "), soft: "" }, added: true };
}
