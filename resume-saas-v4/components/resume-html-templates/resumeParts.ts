/**
 * The pieces the house templates share.
 *
 * Signature and Meridian are two layouts of the same document — one drawn from
 * an engineering resume, one from a supply-chain one — so the reading of the
 * data is common and only the arrangement differs.
 */

export type Group = { label: string; skills: string[] };

/** Skills, however they arrived: a list, a comma string, or {technical}. */
export function flatList(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean);
    if (value && typeof value === 'object') {
        const technical = (value as any).technical;
        if (Array.isArray(technical)) return technical.map((v: any) => String(v ?? '').trim()).filter(Boolean);
        return String(technical ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    }
    return String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** The labelled groups, falling back to one unlabelled block of skills. */
export function groupsOf(data: any): Group[] {
    const groups = Array.isArray(data?.skillGroups) ? data.skillGroups : [];
    const clean = groups
        .map((g: any) => ({ label: String(g?.label ?? '').trim(), skills: flatList(g?.skills) }))
        .filter((g: Group) => g.label && g.skills.length);
    if (clean.length) return clean;

    const skills = flatList(data?.skills);
    return skills.length ? [{ label: 'Skills', skills }] : [];
}

export const escapeHtml = (value: string): string =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The bullet with its first two technology mentions in bold.
 *
 * Longest term first, so "GitHub Actions" wins over "GitHub", and only on a
 * word boundary, so "Go" never lights up inside "Google". Nothing is added to
 * the text — the same words are simply set in bold, so what an ATS reads is
 * unchanged.
 */
export function emphasize(line: string, terms: string[]): string {
    const safe = escapeHtml(line);
    const haystack = safe.toLowerCase();
    const marks: Array<[number, number]> = [];

    const candidates = terms.filter((t) => t.length >= 3).sort((a, b) => b.length - a.length);

    for (const term of candidates) {
        if (marks.length >= 2) break;
        const needle = escapeHtml(term).toLowerCase();
        const at = haystack.indexOf(needle);
        if (at === -1) continue;

        const end = at + needle.length;
        const before = at === 0 ? ' ' : safe[at - 1];
        const after = end >= safe.length ? ' ' : safe[end];
        if (/[A-Za-z0-9]/.test(before) || /[A-Za-z0-9]/.test(after)) continue;
        if (marks.some(([s, e]) => at < e && s < end)) continue;

        marks.push([at, end]);
    }

    if (!marks.length) return safe;

    marks.sort((a, b) => a[0] - b[0]);
    let out = '';
    let cursor = 0;
    for (const [start, end] of marks) {
        out += safe.slice(cursor, start) + '<strong>' + safe.slice(start, end) + '</strong>';
        cursor = end;
    }
    return out + safe.slice(cursor);
}

/**
 * "Masters in Artificial Intelligence" — not "…, Artificial Intelligence".
 *
 * The profile form collects degree and field separately and people fill both
 * with the same words, so joining them blindly prints the subject twice.
 */
export function degreeLine(edu: any): string {
    const degree = String(edu?.degree ?? '').trim();
    const field = String(edu?.field ?? '').trim();
    if (!field) return degree;
    if (!degree) return field;
    return degree.toLowerCase().includes(field.toLowerCase()) ? degree : `${degree}, ${field}`;
}

/** The header's contact row, in reading order, empties dropped. */
export function contactParts(data: any): string[] {
    return [
        data?.contact?.location,
        data?.contact?.phone,
        data?.contact?.email,
        data?.contact?.linkedin,
        data?.contact?.github,
        data?.contact?.website,
        data?.contact?.workAuthorization,
    ]
        .map((v) => String(v ?? '').trim())
        .filter(Boolean);
}

export type Achievement = { id?: string; title: string; description?: string; date?: string };

export function achievementsOf(data: any): Achievement[] {
    return Array.isArray(data?.achievements) ? data.achievements.filter((a: any) => a?.title) : [];
}

export function referenceLines(data: any): string[] {
    const value = data?.references;
    if (Array.isArray(value)) return value.map((v) => String(v ?? '').trim()).filter(Boolean);
    return String(value ?? '')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
}
