import type { ResumeData } from "@/types/resume";

/**
 * The AI backend's answer, in the shape the templates read.
 *
 * This translation existed in four places — the job page's two generate
 * handlers and the two extension routes — and the four had drifted. All of
 * them dropped certifications and languages, three dropped the grade, none
 * knew about grouped skills, and one dropped GitHub. Whatever the user typed
 * into those fields never reached the page, from any entry point.
 *
 * The backend returns certifications and languages as objects; every template
 * renders them as strings. That mismatch is settled here rather than in each
 * of the 25 templates.
 */

type SkillGroup = { label: string; skills: string[] };
type Achievement = { id?: string; title: string; description?: string; date?: string };

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/** Whatever the backend sent, as a list of lines. */
function toList(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(text).filter(Boolean);
    return text(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

/** "AWS Solutions Architect — Amazon, 2024" from the object the profile stores. */
function certificationLine(entry: any): string {
    if (typeof entry === "string") return entry.trim();
    const name = text(entry?.name);
    if (!name) return "";
    const detail = [text(entry?.issuer), text(entry?.date)].filter(Boolean).join(", ");
    return detail ? `${name} — ${detail}` : name;
}

/** Awards, as the profile stores them — the model never writes these. */
function achievementsOf(value: unknown): Achievement[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item: any) =>
            typeof item === "string"
                ? { title: item.trim() }
                : { id: text(item?.id), title: text(item?.title), description: text(item?.description), date: text(item?.date) }
        )
        .filter((item) => item.title);
}

/** "Best Performance Award (2022) — Recognised for hyper-care during go-live". */
function awardLine(item: Achievement): string {
    const head = item.date ? `${item.title} (${item.date})` : item.title;
    return item.description ? `${head} — ${item.description}` : head;
}

/** "English (Fluent)". */
function languageLine(entry: any): string {
    if (typeof entry === "string") return entry.trim();
    const name = text(entry?.name);
    if (!name) return "";
    const level = text(entry?.proficiency);
    return level ? `${name} (${level})` : name;
}

export function skillGroupsOf(value: unknown): SkillGroup[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((group: any) => ({
            label: text(group?.label),
            skills: toList(group?.skills),
        }))
        .filter((group) => group.label && group.skills.length > 0);
}

/**
 * The groups, brought back in line with a skill list the user has edited.
 *
 * Skills can be edited as one flat list in the studio, and the groups have to
 * follow: a skill removed there should not survive under a heading, and one
 * added should still appear. Without this the grouped templates would quietly
 * show a stale section.
 */
export function reconcileSkillGroups(groups: SkillGroup[], skills: string[]): SkillGroup[] {
    if (!groups.length) return [];

    const wanted = new Set(skills.map((s) => s.toLowerCase()));
    const placed = new Set<string>();

    const kept = groups
        .map((group) => ({
            label: group.label,
            skills: group.skills.filter((skill) => {
                const key = skill.toLowerCase();
                if (!wanted.has(key) || placed.has(key)) return false;
                placed.add(key);
                return true;
            }),
        }))
        .filter((group) => group.skills.length > 0);

    const extra = skills.filter((skill) => !placed.has(skill.toLowerCase()));
    if (extra.length && kept.length) kept[kept.length - 1].skills.push(...extra);

    return kept;
}

/** Every skill on the resume, in the order the groups present them. */
export function flatSkills(data: any): string[] {
    const groups = skillGroupsOf(data?.skillGroups);
    if (groups.length) return groups.flatMap((group) => group.skills);

    const skills = data?.skills;
    if (Array.isArray(skills)) return skills.map(text).filter(Boolean);
    if (skills && typeof skills === "object") return toList((skills as any).technical);
    return toList(skills);
}

/**
 * `aiData` is the backend's `data` object; `profile` is the master profile it
 * was tailored from, used only to fill a field the model left empty.
 */
export function toResumeData(aiData: any, profile: any = {}, jobTitle = ""): ResumeData {
    const groups = skillGroupsOf(aiData?.skillGroups);

    const certifications = (aiData?.certifications?.length ? aiData.certifications : profile?.certifications) || [];
    const languages = (aiData?.languages?.length ? aiData.languages : profile?.languages) || [];
    // Awards and the references note are facts the profile owns; the backend
    // copies them through untouched and the profile is the fallback.
    const achievements = achievementsOf(aiData?.achievements?.length ? aiData.achievements : profile?.achievements);
    const references = text(aiData?.references) || text(profile?.references);

    return {
        fullName: text(aiData?.fullName) || text(profile?.fullName),
        jobTitle: text(aiData?.jobTitle) || jobTitle || text(profile?.jobTitle),
        contact: {
            email: text(aiData?.email) || text(profile?.email),
            phone: text(aiData?.phone) || text(profile?.phone),
            location: text(aiData?.location) || text(profile?.location),
            linkedin: text(aiData?.linkedin) || text(profile?.linkedin),
            website: text(aiData?.website) || text(profile?.website),
            github: text(aiData?.github) || text(profile?.github),
            workAuthorization: text(aiData?.workAuthorization) || text(profile?.workAuthorization),
        },
        summary: text(aiData?.summary),
        skills: flatSkills(aiData),
        ...(groups.length ? { skillGroups: groups } : {}),
        experience: (aiData?.experience || []).map((exp: any, index: number) => ({
            id: exp?.id || `exp-${index}`,
            company: text(exp?.company),
            role: text(exp?.role),
            startDate: text(exp?.startDate),
            endDate: text(exp?.endDate),
            location: text(exp?.location),
            description: Array.isArray(exp?.description) ? exp.description : toList(exp?.description),
            impact: text(exp?.impact),
        })),
        projects: (aiData?.projects || []).map((proj: any, index: number) => ({
            id: proj?.id || `proj-${index}`,
            name: text(proj?.name),
            techStack: text(proj?.techStack),
            link: text(proj?.link),
            description: Array.isArray(proj?.description) ? proj.description : toList(proj?.description),
        })),
        education: (aiData?.education || []).map((edu: any, index: number) => ({
            id: edu?.id || `edu-${index}`,
            school: text(edu?.school),
            degree: text(edu?.degree),
            field: text(edu?.field),
            startDate: text(edu?.startDate),
            endDate: text(edu?.endDate),
            grade: text(edu?.grade),
        })),
        certifications: certifications.map(certificationLine).filter(Boolean),
        languages: languages.map(languageLine).filter(Boolean),
        ...(achievements.length ? { achievements, awards: achievements.map(awardLine) } : {}),
        ...(references ? { references } : {}),
    };
}
