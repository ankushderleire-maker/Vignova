import { cleanSkills, cleanSkillDetails } from "@/lib/linkedin-skills";

/**
 * Everything the optimisation report shows, derived from data we already hold.
 *
 * The backend returns the before and after scores and both versions of the
 * profile. The headline numbers on the report — how many keywords were added,
 * how many bullets were strengthened, which roles the profile now fits — are
 * differences between those two, so they are computed here rather than asked
 * for again. That keeps the report honest: every figure on it is something we
 * can point at in the data, not a number the model was invited to invent.
 */

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Bullets, however the section stores them. */
function bullets(entry: any): string[] {
    const d = entry?.description;
    if (Array.isArray(d)) return d.map(text).filter(Boolean);
    return text(d)
        .split(/\r?\n/)
        .map((l) => l.replace(/^[•\-*]\s*/, "").trim())
        .filter(Boolean);
}

/** Skills as written, for display. */
function skillList(profile: any): string[] {
    const named = cleanSkillDetails(profile?.skillDetails).map((s: any) => s.name);
    const plain = cleanSkills(profile?.skills);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of [...named, ...plain]) {
        const value = String(raw).trim();
        const key = value.toLowerCase();
        if (value && !seen.has(key)) { seen.add(key); out.push(value); }
    }
    return out;
}

/** The same skills folded for comparison. */
function skillSet(profile: any): Set<string> {
    return new Set(skillList(profile).map((s) => s.toLowerCase()));
}

/** Words worth counting as keywords — skips the connective tissue. */
const STOP = new Set([
    "and", "the", "for", "with", "from", "that", "this", "into", "over", "your",
    "our", "are", "was", "were", "has", "have", "had", "will", "can", "all",
    "new", "using", "used", "use", "across", "within", "their", "them", "they",
]);

function keywordSet(profile: any): Set<string> {
    const parts = [
        text(profile?.headline),
        text(profile?.about),
        ...arr(profile?.experience).flatMap((e) => [text(e?.title), text(e?.company), ...bullets(e)]),
        ...arr(profile?.projects).map((p) => text(p?.title) + " " + text(p?.description)),
    ].join(" ");

    return new Set(
        parts
            .toLowerCase()
            .split(/[^a-z0-9+#.]+/)
            .filter((w) => w.length > 2 && !STOP.has(w))
    );
}

/** A bullet counts as quantified once it carries a number or a percentage. */
const isQuantified = (line: string) => /\d/.test(line);

export type ProfileFacts = {
    targetRoles: string[];
    schools: string[];
    skills: string[];
    projects: string[];
};

/** The four tiles across the top: what the profile actually contains. */
export function profileFacts(profile: any): ProfileFacts {
    return {
        targetRoles: arr(profile?.experience).map((e) => text(e?.title)).filter(Boolean),
        schools: arr(profile?.education).map((e) => text(e?.school)).filter(Boolean),
        skills: skillList(profile),
        projects: arr(profile?.projects).map((p) => text(p?.title)).filter(Boolean),
    };
}

export type Improvement = { label: string; count: number };

/**
 * What the rewrite actually changed, by comparing the two profiles.
 *
 * Each figure is a count of a specific difference, so a rewrite that changed
 * little reports little rather than padding the list.
 */
export function improvements(before: any, after: any): Improvement[] {
    if (!after) return [];

    // Only terms that read as keywords: something already claimed as a
    // skill, or a technical token. Counting every new word inflated this
    // wildly — a rewritten About alone put it in the dozens.
    const kwBefore = keywordSet(before);
    const kwAfter = keywordSet(after);
    const vocabulary = new Set([
        ...skillSet(before),
        ...skillSet(after),
    ].flatMap((s) => s.split(/[^a-z0-9+#.]+/)).filter((w) => w.length > 2));
    const keywordsAdded = [...kwAfter].filter(
        (k) => !kwBefore.has(k) && (vocabulary.has(k) || /[0-9+#.]/.test(k))
    ).length;

    const skBefore = skillSet(before);
    const skAfter = skillSet(after);
    const skillsAdded = [...skAfter].filter((s) => !skBefore.has(s)).length;

    const expBefore = arr(before?.experience);
    const expAfter = arr(after?.experience);

    let bulletsStrengthened = 0;
    let newlyQuantified = 0;
    for (let i = 0; i < expAfter.length; i++) {
        const b = bullets(expBefore[i]);
        const a = bullets(expAfter[i]);
        for (let j = 0; j < a.length; j++) {
            if (a[j] !== b[j]) bulletsStrengthened++;
            if (isQuantified(a[j]) && !isQuantified(b[j] || "")) newlyQuantified++;
        }
    }

    const rewritten = ["headline", "about"].filter(
        (k) => text(after?.[k]) && text(after?.[k]) !== text(before?.[k])
    ).length;

    const addedSections = ["about", "projects", "skills"].filter((k) => {
        const had = Array.isArray(before?.[k]) ? before[k].length > 0 : Boolean(text(before?.[k]));
        const has = Array.isArray(after?.[k]) ? after[k].length > 0 : Boolean(text(after?.[k]));
        return !had && has;
    }).length;

    return [
        { label: "Keywords added", count: keywordsAdded },
        { label: "Experience bullets strengthened", count: bulletsStrengthened },
        { label: "Achievements quantified", count: newlyQuantified },
        { label: "Skills added", count: skillsAdded },
        { label: "Sections rewritten", count: rewritten },
        { label: "Missing section added", count: addedSections },
    ].filter((i) => i.count > 0);
}

export type ReadinessItem = { label: string; ok: boolean };

/**
 * The recruiter-readiness checklist.
 *
 * Each line is tied to a score the backend already computes, so "excellent"
 * means the numbers say so rather than the copy being optimistic.
 */
export function readiness(scores: any, profile: any, missingKeywords: string[]): {
    items: ReadinessItem[];
    verdict: "Excellent" | "Good" | "Needs work";
} {
    const s = (k: string) => (typeof scores?.[k] === "number" ? scores[k] : 0);

    const items: ReadinessItem[] = [
        { label: "Clear target role and headline", ok: s("headline") >= 70 },
        { label: "Strong value proposition in about section", ok: s("readability") >= 70 && Boolean(text(profile?.about)) },
        { label: "Relevant skills and keywords", ok: s("keyword") >= 70 },
        { label: "Experience shows measurable impact", ok: s("impact") >= 70 },
        { label: "Projects and education well presented", ok: s("projects") >= 60 && arr(profile?.education).length > 0 },
    ];

    if (missingKeywords.length > 0) {
        items.push({
            label: `${missingKeywords.length} recommended keyword${missingKeywords.length === 1 ? "" : "s"} still missing`,
            ok: false,
        });
    }

    const passed = items.filter((i) => i.ok).length;
    const verdict = passed >= 5 ? "Excellent" : passed >= 3 ? "Good" : "Needs work";
    return { items, verdict };
}

export type RoleMatch = { role: string; percent: number };

/**
 * How well the profile reads for each role it claims.
 *
 * Scored on how much of each role's own vocabulary appears across the rest of
 * the profile — a headline that says "Generative AI Engineer" backed by
 * matching experience scores higher than one that says it and nothing else.
 * Capped below 100: this is a similarity signal, not a guarantee.
 */
export function roleMatches(profile: any, scores: any): RoleMatch[] {
    const roles = new Set<string>();
    const headline = text(profile?.headline);

    // A headline often lists several: "AI Engineer | Data Scientist".
    headline
        .split(/[|·,/]+/)
        .map((r) => r.trim())
        .filter((r) => r.length > 2 && r.split(/\s+/).length <= 4)
        .forEach((r) => roles.add(r));

    arr(profile?.experience)
        .map((e) => text(e?.title))
        .filter(Boolean)
        .forEach((r) => roles.add(r));

    if (roles.size === 0) return [];

    // Weighted by how often each role's vocabulary appears, not merely
    // whether it does. Presence alone scored every claimed role identically,
    // because a headline listing three titles mentions all three once.
    const corpus = [
        text(profile?.about),
        ...arr(profile?.experience).flatMap((e) => [text(e?.title), ...bullets(e)]),
        ...arr(profile?.projects).map((p) => text(p?.title) + " " + text(p?.description)),
        ...skillList(profile),
    ]
        .join(" ")
        .toLowerCase();

    const occurrences = (word: string) => {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return (corpus.match(new RegExp("\\b" + escaped, "g")) || []).length;
    };

    const base = typeof scores?.semantic === "number" ? scores.semantic : 60;

    return [...roles]
        .slice(0, 6)
        .map((role) => {
            const words = role
                .toLowerCase()
                .split(/[^a-z0-9+#]+/)
                .filter((w) => w.length > 2 && !STOP.has(w));
            if (!words.length) return { role, percent: 0 };

            const counts = words.map(occurrences);
            const present = counts.filter((n) => n > 0).length / words.length;
            // Repetition separates a role the profile is built around from one
            // it only mentions. Capped per word so one repeated term cannot
            // carry a role on its own.
            const depth = Math.min(
                1,
                counts.reduce((n, c) => n + Math.min(c, 6), 0) / (words.length * 4)
            );

            const percent = Math.round(Math.min(97, base * 0.45 + present * 32 + depth * 25));
            return { role, percent };
        })
        .filter((r) => r.percent > 0)
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 3);
}
