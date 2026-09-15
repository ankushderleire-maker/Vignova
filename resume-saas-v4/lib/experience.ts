/**
 * Work history arithmetic for Master Profile experience entries. Dates arrive
 * in whatever form the resume parser or the profile form produced: "04/2023",
 * "2023-04", "Apr 2023", "April 2023", "2023" or "Present".
 */
type Entry = { start_date?: string; end_date?: string; title?: string; company?: string };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const ONGOING = /^(present|current|now|ongoing|till date|to date|today)$/i;

const thisMonth = (now: Date) => now.getFullYear() * 12 + now.getMonth();

/** A date as a month count (year * 12 + month), or null when it cannot be read. */
export function monthIndex(value: unknown, now = new Date()): number | null {
    const text = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (!text) return null;
    if (ONGOING.test(text)) return thisMonth(now);
    const month = (n: number) => Math.min(11, Math.max(0, n - 1));
    let m = text.match(/^(\d{1,2})[/.-](\d{4})$/);
    if (m) return Number(m[2]) * 12 + month(Number(m[1]));
    m = text.match(/^(\d{4})[/.-](\d{1,2})(?:[/.-]\d{1,2})?$/);
    if (m) return Number(m[1]) * 12 + month(Number(m[2]));
    m = text.match(/^([a-z]{3})[a-z]*\.?,?\s+(\d{4})$/);
    if (m && MONTHS.includes(m[1])) return Number(m[2]) * 12 + MONTHS.indexOf(m[1]);
    m = text.match(/^(\d{4})$/);
    return m ? Number(m[1]) * 12 : null;
}

/**
 * Years of experience across the entries, to one decimal, with overlapping
 * roles counted once. A role without an end date is taken as the current one.
 * Null when no entry has a readable start date.
 */
export function experienceYears(entries: Entry[], now = new Date()): number | null {
    const spans = entries
        .map((entry) => {
            const start = monthIndex(entry.start_date, now);
            const end = entry.end_date ? monthIndex(entry.end_date, now) : thisMonth(now);
            return start !== null && end !== null && end >= start ? [start, end + 1] : null;
        })
        .filter((span): span is number[] => span !== null)
        .sort((a, b) => a[0] - b[0]);
    if (!spans.length) return null;

    let months = 0;
    let [from, to] = spans[0];
    for (const [start, end] of spans.slice(1)) {
        if (start <= to) {
            to = Math.max(to, end);
        } else {
            months += to - from;
            [from, to] = [start, end];
        }
    }
    months += to - from;
    return Math.round((months / 12) * 10) / 10;
}

/** The most recent role: an ongoing one, otherwise the one that ended last. */
export function latestRole<T extends Entry>(entries: T[], now = new Date()): T | undefined {
    const endOf = (entry: T) => (entry.end_date ? monthIndex(entry.end_date, now) : thisMonth(now)) ?? -1;
    return [...entries].sort((a, b) => endOf(b) - endOf(a))[0];
}
