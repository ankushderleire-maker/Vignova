/**
 * Turns a raw job description into the sections the preview renders.
 *
 * Postings arrive as plain text from four different places (extension, manual
 * entry, scraper, job search) and almost none of them use bullet characters.
 * What they do have is consistent *shape*, which is what this reads:
 *
 *  - A paragraph is one long line sitting on its own between blank lines.
 *  - A list is a run of consecutive lines with no blank line between them.
 *    That single rule recovers the bullet lists that postings write as bare
 *    lines ("Digital Design Signoff", "PCB Design and Analysis", ...).
 *  - A heading is a lone short line with no sentence punctuation.
 *  - `Label: value` lines ("Job Type: Full-time", "Pay: €38,000 per annum")
 *    are facts, not headings — they get lifted out into the summary card.
 *
 * It stays deterministic on purpose: it runs on every job already saved, costs
 * nothing, and cannot fail. Genuinely unstructured prose still lands in the
 * overview and reads fine.
 */

export type JdBlock =
    | { type: "paragraph"; text: string }
    | { type: "list"; items: string[] };

export type JdSection = {
    /** Canonical title where we recognise the heading, else the original text. */
    title: string;
    /** Lowercased key used to pick an icon. */
    kind: string;
    blocks: JdBlock[];
};

export type JdFact = { label: string; value: string; kind: string };

export type ParsedJd = {
    sections: JdSection[];
    facts: JdFact[];
    salary: string | null;
    hours: string | null;
    employmentType: string | null;
    workLocation: string | null;
};

const BULLET_RE = /^\s*(?:[•▪‣●○◦*·–—-]|\d+[.)])\s+/;

/** `Label: value`, where the value is short enough to be a value and not prose. */
const FACT_LINE_RE = /^\s*([A-Za-z][A-Za-z /&'-]{2,28})\s*[:：]\s*(.+?)\s*$/;

const FACT_LABELS: [RegExp, string, string][] = [
    [/^job\s*type$|^employment\s*type$|^contract\s*type$|^type$/i, "Employment type", "employmentType"],
    [/^pay$|^salary$|^compensation$|^remuneration$|^rate$|^package$/i, "Salary", "salary"],
    [/^schedule$|^shift$|^working\s*pattern$/i, "Schedule", "schedule"],
    [/^work\s*location$|^location$|^work\s*setting$|^workplace$/i, "Work location", "workLocation"],
    [/^hours$|^working\s*hours$/i, "Working hours", "hours"],
    [/^experience\s*level$|^seniority$/i, "Level", "level"],
    [/^deadline$|^closing\s*date$|^apply\s*by$/i, "Closing date", "deadline"],
];

// Matched against a whole short line, so "Job Qualifications" and "Additional
// Information" are recognised even though they don't start with the keyword.
const HEADING_RULES: [RegExp, string, string][] = [
    [/\b(overview|summary|introduction|job\s+description|the\s+role|role\s+overview)\b/i, "Overview", "overview"],
    [/\babout\s+(us|the\s+company|cadence|the\s+team)\b/i, "About the company", "company"],
    [/\babout\s+(the\s+)?(job|role|position|opportunity)\b/i, "Overview", "overview"],
    [/\b(responsibilities|duties|accountabilities)\b/i, "Responsibilities", "responsibilities"],
    [/\bwhat\s+you.{0,3}ll\s+(do|be\s+doing)\b|\byour\s+role\b|\bday[\s-]to[\s-]day\b/i, "Responsibilities", "responsibilities"],
    [/\b(requirements|qualifications)\b/i, "Requirements", "requirements"],
    [/\bwhat\s+we.{0,3}re\s+looking\s+for\b|\bwho\s+you\s+are\b|\bcandidate\s+profile\b/i, "Requirements", "requirements"],
    [/\b(skills|competencies)\b/i, "Skills", "skills"],
    [/\b(education|academic)\b/i, "Education", "education"],
    [/\b(benefits|perks|what\s+we\s+offer|why\s+join|rewards)\b/i, "Benefits", "benefits"],
    [/\b(compensation|salary|package|remuneration)\b/i, "Compensation", "compensation"],
    [/\b(how\s+to\s+apply|application\s+process|next\s+steps)\b/i, "How to apply", "apply"],
    [/\b(additional|other)\s+information\b|\bnotes?\b|\bequal\s+(employment\s+)?opportunit/i, "Additional information", "additional"],
];

function classifyHeading(line: string): { title: string; kind: string } | null {
    const clean = line.trim().replace(/[:：]\s*$/, "").replace(/^[#*\s]+/, "").trim();
    if (clean.length < 3 || clean.length > 70) return null;
    if (BULLET_RE.test(line)) return null;
    // Real sentences end in punctuation; headings don't.
    if (/[.!?,;]$/.test(clean)) return null;

    const words = clean.split(/\s+/);
    if (words.length > 9) return null;

    for (const [re, title, kind] of HEADING_RULES) {
        if (re.test(clean)) return { title, kind };
    }

    // Unrecognised, but shaped like a heading: short, and either explicitly
    // terminated with a colon or written in caps.
    const endsWithColon = /[:：]\s*$/.test(line.trim());
    const isCaps = clean === clean.toUpperCase() && /[A-Z]{3}/.test(clean);
    if ((endsWithColon || isCaps) && words.length <= 6) {
        return { title: isCaps ? clean.charAt(0) + clean.slice(1).toLowerCase() : clean, kind: "other" };
    }
    return null;
}

/** "€38,000 per annum", "$120,000 - $150,000", "£45k" */
export function extractSalary(text: string): string | null {
    const match = text.match(
        /[€$£₹]\s?\d[\d,.]*\s?k?(?:\s*(?:-|–|to)\s*[€$£₹]?\s?\d[\d,.]*\s?k?)?(?:\s*(?:per|\/|a)\s*(?:year|annum|month|hour|week))?/i
    );
    return match ? match[0].replace(/\s+/g, " ").trim() : null;
}

/** "39 hours per week", "37.5 hours/week", "39-hour working week" */
export function extractHours(text: string): string | null {
    const perWeek = text.match(/\b\d{1,2}(?:\.\d)?\s*hours?\s*(?:per|a|\/)\s*week\b/i);
    if (perWeek) return perWeek[0].replace(/\s+/g, " ").trim();
    const hyphenated = text.match(/\b(\d{1,2}(?:\.\d)?)[\s-]hour\s+(?:working\s+)?week\b/i);
    return hyphenated ? `${hyphenated[1]} hours per week` : null;
}

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Temporary", "Freelance"];

export function extractEmploymentType(text: string): string | null {
    for (const type of EMPLOYMENT_TYPES) {
        const loose = type.replace("-", "[\\s-]?");
        if (new RegExp(`\\b${loose}\\b`, "i").test(text)) return type;
    }
    return null;
}

/**
 * Rejoins lines a posting hard-wrapped mid-sentence, so wrapped prose isn't
 * mistaken for a list. A line that stops without punctuation and is followed by
 * one starting lowercase is a continuation, not a new item.
 */
function joinSoftWraps(lines: string[]): string[] {
    const out: string[] = [];
    for (const line of lines) {
        const previous = out[out.length - 1];
        if (
            previous &&
            !/[.!?:;)\]]$/.test(previous) &&
            /^[a-z(,]/.test(line)
        ) {
            out[out.length - 1] = `${previous} ${line}`;
        } else {
            out.push(line);
        }
    }
    return out;
}

function blocksFrom(group: string[]): JdBlock[] {
    const stripped = group.map((l) => l.replace(BULLET_RE, "").trim()).filter(Boolean);
    if (!stripped.length) return [];

    const hadBullets = group.some((l) => BULLET_RE.test(l));
    const entries = hadBullets ? stripped : joinSoftWraps(stripped);

    // A run of consecutive lines is how postings write lists when they don't
    // use bullet characters. A single line is a paragraph.
    if (entries.length > 1) return [{ type: "list", items: entries }];
    return [{ type: "paragraph", text: entries[0] }];
}

export function parseJobDescription(raw: string | null | undefined): ParsedJd {
    const text = (raw || "").replace(/\r\n?/g, "\n").trim();
    const empty: ParsedJd = {
        sections: [],
        facts: [],
        salary: null,
        hours: null,
        employmentType: null,
        workLocation: null,
    };
    if (!text) return empty;

    // ── Pass 1: lift out "Label: value" facts ──
    const facts: JdFact[] = [];
    const seenFactKinds = new Set<string>();
    const bodyLines: string[] = [];

    for (const line of text.split("\n")) {
        const match = line.match(FACT_LINE_RE);
        if (match && !BULLET_RE.test(line)) {
            const [, rawLabel, rawValue] = match;
            const known = FACT_LABELS.find(([re]) => re.test(rawLabel.trim()));
            if (known && rawValue.length <= 80) {
                const [, label, kind] = known;
                if (!seenFactKinds.has(kind)) {
                    seenFactKinds.add(kind);
                    facts.push({ label, value: rawValue.replace(/\.$/, "").trim(), kind });
                }
                continue; // consumed — never render it as a heading or paragraph
            }
        }
        bodyLines.push(line);
    }

    // ── Pass 2: headings, paragraphs and lists ──
    const sections: JdSection[] = [];
    let current: JdSection = { title: "Overview", kind: "overview", blocks: [] };
    let group: string[] = [];

    const flush = () => {
        if (!group.length) return;
        current.blocks.push(...blocksFrom(group));
        group = [];
    };

    for (const line of bodyLines) {
        const trimmed = line.trim();

        if (!trimmed) {
            flush();
            continue;
        }

        // Only a line standing alone can be a heading; a short line inside a
        // run is a list item ("Digital Design Signoff").
        if (!group.length && classifyHeading(trimmed)) {
            const heading = classifyHeading(trimmed)!;
            if (current.blocks.length) sections.push(current);
            current = { title: heading.title, kind: heading.kind, blocks: [] };
            continue;
        }

        group.push(trimmed);
    }
    flush();
    if (current.blocks.length) sections.push(current);

    // ── Facts the body only mentions in passing ──
    const factValue = (kind: string) => facts.find((f) => f.kind === kind)?.value || null;

    const salary = factValue("salary") || extractSalary(text);
    const hours = factValue("hours") || extractHours(text);
    const employmentType = factValue("employmentType") || extractEmploymentType(text);
    const workLocation = factValue("workLocation");

    return {
        sections: sections.filter((s) => s.blocks.length),
        facts,
        salary,
        hours,
        employmentType,
        workLocation,
    };
}


// --------------------------------------------------------------------------
// The structured contract the UI renders. The AI formatter fills this in;
// `formatWithParser` produces the same shape without a model call, so the
// preview has something to draw the moment a job is saved.
// --------------------------------------------------------------------------

export type JdKeyInfo = {
    jobType: string | null;
    workMode: string | null;
    location: string | null;
    salary: string | null;
    experienceLevel: string | null;
    company: string | null;
};

export type FormattedJd = {
    summary: string;
    overview: string[];
    responsibilities: string[];
    requirements: string[];
    niceToHave: string[];
    benefits: string[];
    skills: string[];
    keyInfo: JdKeyInfo;
};

export type JdEnvelope = {
    status: "READY" | "FAILED" | "PENDING";
    version: 1;
    /** "ai" when the model produced it, "parser" for the deterministic fallback. */
    source: "ai" | "parser";
    model: string | null;
    formattedAt: string;
    data: FormattedJd | null;
    error?: string;
};

/**
 * Same shape, built without the model. Used when OpenAI is unconfigured or
 * unreachable, so the UI always has something structured to render.
 */
export function formatWithParser(
    description: string,
    context?: { company?: string | null; location?: string | null; salary?: string | null }
): JdEnvelope {
    const parsed = parseJobDescription(description);

    const pick = (...kinds: string[]) =>
        parsed.sections
            .filter((s) => kinds.includes(s.kind))
            .flatMap((s) => s.blocks.flatMap((b) => (b.type === "list" ? b.items : [])));

    const overview = parsed.sections
        .filter((s) => ["overview", "company", "additional", "other"].includes(s.kind))
        .flatMap((s) => s.blocks.flatMap((b) => (b.type === "paragraph" ? [b.text] : b.items)));

    const data: FormattedJd = {
        summary: overview[0] || "",
        overview,
        responsibilities: pick("responsibilities"),
        requirements: pick("requirements", "skills", "education"),
        niceToHave: [],
        benefits: pick("benefits", "compensation"),
        skills: [],
        keyInfo: {
            jobType: parsed.employmentType,
            workMode: parsed.workLocation,
            location: context?.location || null,
            salary: context?.salary || parsed.salary,
            experienceLevel: null,
            company: context?.company || null,
        },
    };

    return {
        status: "READY",
        version: 1,
        source: "parser",
        model: null,
        formattedAt: new Date().toISOString(),
        data,
    };
}

