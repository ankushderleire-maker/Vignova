/**
 * Section composer
 * ================
 * Every template hardcodes which sections it renders and in what order. Between
 * them they only cover six of the editor's eleven — volunteering, references,
 * links, custom sections and (in 20 of 26 templates) languages are simply
 * dropped, so a user fills them in and they never appear on the page.
 *
 * Rewriting 26 templates is not the fix: they share no markup convention (only
 * 2 use `<section class="section">`, 17 have a `section-title` class, the rest
 * do their own thing) and several are two-column, where a single linear order
 * is meaningless. Instead this runs over a template's *output*, which is the
 * one thing they all have in common: an HTML document whose sections are
 * introduced by a heading.
 *
 * It does two jobs:
 *   1. appends any section the user filled in that the template omitted,
 *      borrowing that template's own heading and body classes so it looks native
 *   2. reorders the sections it can identify to match `data.sectionOrder`
 *
 * `getTemplateGenerator` applies it, so preview, PDF, thumbnails and the
 * extension all get the same document.
 *
 * Runs in Node and the browser — no DOMParser, because the extension routes and
 * the thumbnail generator call this on the server.
 */

/** Editor section id -> the heading a template would use for it. */
const SECTION_HEADINGS: Record<string, string[]> = {
    profile: ["professional summary", "summary", "profile", "about", "objective"],
    experience: ["professional experience", "experience", "work experience", "employment"],
    education: ["education", "academic background"],
    skills: ["skills", "key skills", "technical skills", "core competencies", "expertise"],
    projects: ["projects", "selected projects", "key projects"],
    certifications: ["certifications", "certificates", "licenses"],
    languages: ["languages"],
    volunteering: ["volunteering", "volunteering & leadership", "volunteer experience", "leadership"],
    references: ["references"],
    links: ["links", "profiles", "online presence"],
    awards: ["awards", "awards & achievements", "achievements", "honors"],
};

/** Titles used when this composer has to create the section itself. */
const FALLBACK_TITLES: Record<string, string> = {
    languages: "Languages",
    volunteering: "Volunteering &amp; Leadership",
    references: "References",
    links: "Links",
    awards: "Awards &amp; Achievements",
};

/** Sections this composer knows how to render from scratch, as simple lists. */
const LIST_SECTIONS = ["languages", "volunteering", "references", "links", "awards"] as const;

function escapeHtml(value: unknown): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Turns whatever the editor stored into a list of lines. */
function toLines(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map((v) => (typeof v === "string" ? v : String(v ?? ""))).map((v) => v.trim()).filter(Boolean);
    }
    if (typeof value === "string") {
        return value.split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
    }
    return [];
}

type Heading = {
    /** Full matched tag, e.g. `<h2 class="section-title">`. */
    tag: string;
    level: string;
    className: string;
    text: string;
    start: number;
    /** Index just past the heading's closing tag. */
    afterOpen: number;
};

const HEADING_RE = /<(h[1-4])\b([^>]*)>([\s\S]*?)<\/\1>/gi;

function findHeadings(html: string): Heading[] {
    const out: Heading[] = [];
    let match: RegExpExecArray | null;
    HEADING_RE.lastIndex = 0;
    while ((match = HEADING_RE.exec(html))) {
        const attrs = match[2] || "";
        const classMatch = attrs.match(/class="([^"]*)"/i);
        out.push({
            tag: match[0],
            level: match[1].toLowerCase(),
            className: classMatch ? classMatch[1] : "",
            text: match[3].replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim().toLowerCase(),
            start: match.index,
            afterOpen: match.index + match[0].length,
        });
    }
    return out;
}

/** Which editor section a heading introduces, if any. */
function sectionIdForHeading(text: string): string | null {
    for (const [id, names] of Object.entries(SECTION_HEADINGS)) {
        if (names.includes(text)) return id;
    }
    return null;
}

/**
 * The heading and body classes this template uses, so appended sections inherit
 * the design instead of looking bolted on.
 */
function conventions(html: string, headings: Heading[]) {
    // The most common heading level/class in the document is the section style.
    const tally = new Map<string, { level: string; className: string; n: number }>();
    for (const h of headings) {
        if (!sectionIdForHeading(h.text)) continue;
        const key = h.level + "|" + h.className;
        const entry = tally.get(key) || { level: h.level, className: h.className, n: 0 };
        entry.n += 1;
        tally.set(key, entry);
    }
    const best = [...tally.values()].sort((a, b) => b.n - a.n)[0];

    // A body class that reads as ordinary prose in this template.
    const bodyClass =
        (html.match(/class="([^"]*\btext-wrap\b[^"]*)"/) ||
            html.match(/class="([^"]*\bdescription\b[^"]*)"/) ||
            [])[1] || "";

    return {
        level: best?.level || "h2",
        headingClass: best?.className || "section-title",
        bodyClass,
    };
}

function renderListSection(id: string, lines: string[], conv: ReturnType<typeof conventions>): string {
    const title = FALLBACK_TITLES[id] || id;
    const items = lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
    const cls = conv.headingClass ? ` class="${conv.headingClass}"` : "";
    const bodyCls = conv.bodyClass ? ` class="${conv.bodyClass}"` : "";
    return (
        `\n<div class="vignova-extra-section no-break" data-section="${id}" style="margin-bottom:16px">` +
        `<${conv.level}${cls}>${title}</${conv.level}>` +
        `<ul${bodyCls} style="margin:0;padding-left:18px">${items}</ul>` +
        `</div>`
    );
}

function renderCustomSection(title: string, content: string, conv: ReturnType<typeof conventions>, index: number): string {
    const lines = toLines(content);
    const cls = conv.headingClass ? ` class="${conv.headingClass}"` : "";
    const bodyCls = conv.bodyClass ? ` class="${conv.bodyClass}"` : "";
    const body = lines.length > 1
        ? `<ul${bodyCls} style="margin:0;padding-left:18px">${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>`
        : `<p${bodyCls} style="margin:0">${escapeHtml(lines[0] || "")}</p>`;
    return (
        `\n<div class="vignova-extra-section no-break" data-section="custom-${index}" style="margin-bottom:16px">` +
        `<${conv.level}${cls}>${escapeHtml(title)}</${conv.level}>` +
        body +
        `</div>`
    );
}

/** Where to append: just inside the outermost page container. */
function insertionPoint(html: string): number {
    const bodyClose = html.lastIndexOf("</body>");
    if (bodyClose === -1) return html.length;
    // Step back over any closing divs that belong to the page wrapper.
    const before = html.slice(0, bodyClose);
    const lastDiv = before.lastIndexOf("</div>");
    return lastDiv === -1 ? bodyClose : lastDiv;
}

/**
 * Appends the sections the template dropped, then orders what it can.
 * Never throws: a template whose output it cannot read is returned untouched.
 */
export function composeSections(html: string, data: any): string {
    if (!html || typeof html !== "string" || !data) return html;

    try {
        const headings = findHeadings(html);
        const present = new Set(
            headings.map((h) => sectionIdForHeading(h.text)).filter(Boolean) as string[]
        );
        const conv = conventions(html, headings);

        let additions = "";

        for (const id of LIST_SECTIONS) {
            if (present.has(id)) continue;
            const lines = toLines((data as any)[id]);
            if (lines.length) additions += renderListSection(id, lines, conv);
        }

        const custom = Array.isArray(data.customSections) ? data.customSections : [];
        custom.forEach((section: any, index: number) => {
            const title = typeof section?.title === "string" ? section.title.trim() : "";
            const content = typeof section?.content === "string" ? section.content : "";
            if (title && content.trim()) additions += renderCustomSection(title, content, conv, index);
        });

        const withAdditions = additions
            ? html.slice(0, insertionPoint(html)) + additions + html.slice(insertionPoint(html))
            : html;

        const order = Array.isArray(data.sectionOrder) ? data.sectionOrder : null;
        return order ? reorderSections(withAdditions, order) : withAdditions;
    } catch {
        return html;
    }
}


// ── Reordering ────────────────────────────────────────────────────────────
//
// A section can only move if the sections are siblings in one container. That
// holds for single-column designs; two-column ones keep skills or education in
// a fixed sidebar, where "move Skills above Experience" has no meaning. So this
// works out the structure first and leaves the document alone when it cannot
// prove the sections are siblings.

const VOID_TAGS = new Set(["area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"]);

type Tag = { name: string; start: number; end: number; closing: boolean; selfClosing: boolean; depth: number };

function scanTags(html: string): Tag[] {
    const tags: Tag[] = [];
    const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*?(\/?)>/g;
    let m: RegExpExecArray | null;
    let depth = 0;
    while ((m = re.exec(html))) {
        const name = m[2].toLowerCase();
        const closing = m[1] === "/";
        const selfClosing = m[3] === "/" || VOID_TAGS.has(name);
        if (closing) depth -= 1;
        tags.push({ name, start: m.index, end: m.index + m[0].length, closing, selfClosing, depth });
        if (!closing && !selfClosing) depth += 1;
    }
    return tags;
}

/** The open-tag index of the element that directly contains `openIdx`. */
function parentOfTag(tags: Tag[], openIdx: number): number {
    const stack: number[] = [];
    for (let i = 0; i < openIdx; i++) {
        const tag = tags[i];
        if (tag.closing) stack.pop();
        else if (!tag.selfClosing) stack.push(i);
    }
    return stack.length ? stack[stack.length - 1] : -1;
}

function matchingClose(tags: Tag[], openIdx: number): number {
    const target = tags[openIdx].name;
    let depth = 0;
    for (let i = openIdx + 1; i < tags.length; i++) {
        const tag = tags[i];
        if (tag.name !== target) continue;
        if (tag.closing) {
            if (depth === 0) return i;
            depth -= 1;
        } else if (!tag.selfClosing) depth += 1;
    }
    return -1;
}

type Block = { id: string; from: number; to: number; parentOpen: number };

/**
 * Reorders top-level sections to match `order`. Returns the html unchanged when
 * the sections are not siblings, which is the two-column case.
 */
export function reorderSections(html: string, order: string[]): string {
    if (!Array.isArray(order) || order.length < 2) return html;

    try {
        const headings = findHeadings(html);
        const tags = scanTags(html);
        const blocks: Block[] = [];

        for (const heading of headings) {
            const id = sectionIdForHeading(heading.text);
            if (!id) continue;

            // The block is the element *around* the heading — the <section> or
            // <div> the template wrapped it in — and its parent is the page
            // container that all sections should share.
            const headingTag = tags.findIndex((t) => t.start === heading.start);
            if (headingTag === -1) return html;
            const openIdx = parentOfTag(tags, headingTag);
            if (openIdx === -1) return html;
            const closeIdx = matchingClose(tags, openIdx);
            if (closeIdx === -1) return html;
            const parentOpen = parentOfTag(tags, openIdx);
            if (parentOpen === -1) return html;

            blocks.push({ id, from: tags[openIdx].start, to: tags[closeIdx].end, parentOpen });
        }

        if (blocks.length < 2) return html;

        // Every section must sit in the same container, or moving one across
        // would tear a column apart.
        const parent = blocks[0].parentOpen;
        if (!blocks.every((b) => b.parentOpen === parent)) return html;

        // And they must not nest inside one another.
        const sorted = [...blocks].sort((a, b) => a.from - b.from);
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i].from < sorted[i - 1].to) return html;
        }

        const rank = (id: string) => {
            const at = order.indexOf(id);
            return at === -1 ? Number.MAX_SAFE_INTEGER : at;
        };
        const wanted = [...sorted].sort((a, b) => {
            const diff = rank(a.id) - rank(b.id);
            return diff !== 0 ? diff : sorted.indexOf(a) - sorted.indexOf(b);
        });
        if (wanted.every((b, i) => b === sorted[i])) return html;

        // Rebuild: the slots stay where they are, the contents get reshuffled.
        let out = "";
        let cursor = 0;
        sorted.forEach((slot, i) => {
            out += html.slice(cursor, slot.from);
            out += html.slice(wanted[i].from, wanted[i].to);
            cursor = slot.to;
        });
        return out + html.slice(cursor);
    } catch {
        return html;
    }
}

export const __test = { findHeadings, sectionIdForHeading, conventions, toLines, scanTags, reorderSections, matchingClose, parentOfTag };
