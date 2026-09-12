import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';
import {
    achievementsOf,
    contactParts,
    degreeLine,
    emphasize,
    groupsOf,
    referenceLines,
} from './resumeParts';

/**
 * Signature — the layout the generator is written for.
 *
 * Single column, no colour, no panels: a letter-spaced name over a rule, a
 * three-line profile, skills as a labelled grid rather than a wall of commas,
 * and roles whose dates sit out to the right where a recruiter's eye already
 * is. It is the shape of a resume that gets read, not decorated.
 *
 * Two things it does that no other template here does:
 *
 *  - It lays out `skillGroups` — "Databases & Storage : PostgreSQL, Milvus" —
 *    which is how a skills section stays readable past a dozen items. Given a
 *    resume without them it falls back to the flat list.
 *  - It emphasises, inside each bullet, the first technologies that bullet
 *    names, matched against the resume's own skills. Nothing is added to the
 *    text: the same words are simply set in bold, so the page can be skimmed
 *    without changing what an ATS reads.
 */

const Bullets: React.FC<{ lines: string[]; terms: string[]; lineHeight: number }> = ({ lines, terms, lineHeight }) => (
    <ul className="sig-bullets" style={{ lineHeight }}>
        {lines.map((line, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: emphasize(line, terms) }} />
        ))}
    </ul>
);

export const SignatureTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const groups = groupsOf(data);
    const terms = groups.flatMap((g) => g.skills);

    const contact = contactParts(data);
    const achievements = achievementsOf(data);
    const references = referenceLines(data);

    return (
        <div className="resume-page signature-template" style={getCssVariables(designSettings)}>
            <header className="sig-header no-break" data-section="header">
                <h1 className="sig-name" data-editable="fullName">{data.fullName}</h1>
                {data.jobTitle && <p className="sig-title" data-editable="jobTitle">{data.jobTitle}</p>}
                {contact.length > 0 && (
                    <div className="sig-contact" style={{ marginTop: `${Math.max(headerSettings.spacing / 2, 6)}px` }}>
                        {contact.map((item, index) => (
                            <span key={index}>
                                {index > 0 && <span className="sig-sep">|</span>}
                                <span>{item}</span>
                            </span>
                        ))}
                    </div>
                )}
            </header>

            {data.summary && (
                <section className="sig-section no-break" data-section="summary">
                    <h2 className="sig-heading">Profile</h2>
                    <p className="sig-body text-wrap" data-editable="summary" style={{ lineHeight: summarySettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {groups.length > 0 && (
                <section className="sig-section no-break" data-section="skills">
                    <h2 className="sig-heading">Technology Skills</h2>
                    <div className="sig-skills" style={{ fontSize: `${Math.min(Math.max(skillsSettings.fontSize, 9), 11)}px`, lineHeight: skillsSettings.lineHeight }}>
                        {groups.map((group, index) => (
                            <div className="sig-skill-row" key={index}>
                                <div className="sig-skill-label">{group.label}</div>
                                <div className="sig-skill-sep">:</div>
                                <div className="sig-skill-values text-wrap">{group.skills.join(', ')}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {data.experience && data.experience.length > 0 && (
                <section className="sig-section" data-section="experience">
                    <h2 className="sig-heading">Work Experience</h2>
                    {data.experience.map((exp, index) => (
                        <div className="sig-entry" key={exp.id || index}>
                            <div className="sig-entry-head">
                                <div className="sig-entry-left">
                                    <span className="sig-role">{exp.role}</span>
                                    {exp.company && <span className="sig-org"> | {exp.company}{exp.location ? ` - ${exp.location}` : ''}</span>}
                                </div>
                                <div className="sig-date">{[exp.startDate, exp.endDate].filter(Boolean).join(' – ')}</div>
                            </div>
                            <Bullets
                                lines={splitDescription(exp.description)}
                                terms={terms}
                                lineHeight={experienceSettings.lineHeight}
                            />
                            {(exp as any).impact && (
                                <p className="sig-impact text-wrap" style={{ lineHeight: experienceSettings.lineHeight }}>
                                    <span className="sig-impact-label">Impact</span>: {(exp as any).impact}
                                </p>
                            )}
                        </div>
                    ))}
                </section>
            )}

            {data.projects && data.projects.length > 0 && (
                <section className="sig-section" data-section="projects">
                    <h2 className="sig-heading">Projects</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div className="sig-entry" key={proj.id || index}>
                            <div className="sig-entry-head">
                                <div className="sig-entry-left">
                                    <span className="sig-role">{proj.name}</span>
                                    {proj.techStack && <span className="sig-org"> | {proj.techStack}</span>}
                                </div>
                                {proj.link && <div className="sig-date sig-link">{proj.link.replace(/^https?:\/\//, '')}</div>}
                            </div>
                            <Bullets
                                lines={splitDescription(proj.description)}
                                terms={terms}
                                lineHeight={experienceSettings.lineHeight}
                            />
                        </div>
                    ))}
                </section>
            )}

            {data.education && data.education.length > 0 && (
                <section className="sig-section no-break" data-section="education">
                    <h2 className="sig-heading">Education</h2>
                    {data.education.map((edu, index) => (
                        <div className="sig-edu" key={edu.id || index} style={{ lineHeight: educationSettings.lineHeight }}>
                            <div className="sig-entry-left">
                                <span className="sig-degree">{degreeLine(edu)}</span>
                                {edu.school && <span className="sig-org"> | {edu.school}</span>}
                                {edu.grade && <span className="sig-org"> · {edu.grade}</span>}
                            </div>
                            <div className="sig-date">{[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}</div>
                        </div>
                    ))}
                </section>
            )}

            {data.certifications && data.certifications.length > 0 && (
                <section className="sig-section no-break" data-section="certifications">
                    <h2 className="sig-heading">Certifications</h2>
                    <ul className="sig-bullets" style={{ lineHeight: educationSettings.lineHeight }}>
                        {data.certifications.map((cert: string, index: number) => (
                            <li key={index}>{cert}</li>
                        ))}
                    </ul>
                </section>
            )}

            {data.languages && data.languages.length > 0 && (
                <section className="sig-section no-break" data-section="languages">
                    <h2 className="sig-heading">Languages</h2>
                    <p className="sig-body">{(data.languages as string[]).join('  ·  ')}</p>
                </section>
            )}

            {achievements.length > 0 && (
                <section className="sig-section no-break" data-section="awards">
                    <h2 className="sig-heading">Achievements</h2>
                    {achievements.map((item, index) => (
                        <div className="sig-award" key={item.id || index}>
                            <div className="sig-award-title">
                                {item.title}{item.date ? ` (${item.date})` : ''}
                            </div>
                            {item.description && <div className="sig-award-note">{item.description}</div>}
                        </div>
                    ))}
                </section>
            )}

            {references.length > 0 && (
                <section className="sig-section no-break" data-section="references">
                    <h2 className="sig-heading">References</h2>
                    {references.map((line, index) => (
                        <p className="sig-body" key={index}>{line}</p>
                    ))}
                </section>
            )}
        </div>
    );
};

export const SIGNATURE_STYLES = `
${BASE_STYLES}

.signature-template {
    font-family: 'Segoe UI', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #2f2f2f;
    padding: 30px 50px;
    font-size: 10.5px;
    /* The shared base sets min-height to a full 297mm A4 page. Printed at
       exactly A4 with no margin, a single rounded-up pixel spills the last
       section onto a second page — a resume that ends with "Languages" alone
       on page two. A millimetre of slack removes that. */
    min-height: 296mm;
}

/* ── Header ───────────────────────────────────────────────────────── */

.signature-template .sig-header {
    text-align: center;
    padding-bottom: 10px;
}

.signature-template .sig-name {
    font-size: 25px;
    font-weight: 400;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    color: #1b1b1b;
    line-height: 1.25;
    /* The tracking adds space after the last letter; pull it back so the
       block still reads as centred. */
    margin-left: 0.3em;
}

.signature-template .sig-title {
    font-size: 12px;
    font-weight: 400;
    letter-spacing: 0.18em;
    color: #3a3a3a;
    margin-top: 4px;
    margin-left: 0.18em;
}

.signature-template .sig-contact {
    border-top: 1px solid #c8c8c8;
    border-bottom: 1px solid #c8c8c8;
    padding: 6px 0;
    font-size: 10.5px;
    color: #2f2f2f;
}

.signature-template .sig-sep {
    color: #9a9a9a;
    padding: 0 7px;
}

/* ── Sections ─────────────────────────────────────────────────────── */

.signature-template .sig-section {
    padding-top: 8px;
    padding-bottom: 7px;
    border-bottom: 1px solid #d8d8d8;
}

.signature-template .sig-section:last-child {
    border-bottom: none;
    padding-bottom: 0;
}

.signature-template .sig-heading {
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #1b1b1b;
    margin-bottom: 7px;
}

.signature-template .sig-body {
    font-size: 10.5px;
    text-align: justify;
    color: #333;
    padding-left: 14px;
}

/* ── Skills grid ──────────────────────────────────────────────────── */

.signature-template .sig-skills {
    padding-left: 14px;
}

.signature-template .sig-skill-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 3px;
}

.signature-template .sig-skill-label {
    width: 31%;
    text-align: right;
    font-weight: 700;
    color: #1b1b1b;
    flex-shrink: 0;
}

.signature-template .sig-skill-sep {
    width: 22px;
    text-align: center;
    font-weight: 700;
    color: #1b1b1b;
    flex-shrink: 0;
}

.signature-template .sig-skill-values {
    flex: 1;
    color: #333;
}

/* ── Entries ──────────────────────────────────────────────────────── */

.signature-template .sig-entry {
    margin-bottom: 8px;
}

.signature-template .sig-entry:last-child {
    margin-bottom: 0;
}

.signature-template .sig-entry-head,
.signature-template .sig-edu {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
}

.signature-template .sig-edu {
    margin-bottom: 5px;
}

.signature-template .sig-role,
.signature-template .sig-degree {
    font-weight: 700;
    color: #1b1b1b;
    text-transform: uppercase;
    font-size: 10.5px;
    letter-spacing: 0.02em;
}

.signature-template .sig-degree {
    text-transform: none;
    font-size: 11px;
}

.signature-template .sig-org {
    font-style: italic;
    color: #3a3a3a;
}

.signature-template .sig-date {
    font-weight: 700;
    color: #1b1b1b;
    white-space: nowrap;
    font-size: 10.5px;
}

.signature-template .sig-link {
    font-weight: 400;
    font-style: italic;
    color: #1155cc;
}

/* ── Bullets ──────────────────────────────────────────────────────── */

.signature-template .sig-bullets {
    margin: 5px 0 0 0;
    padding-left: 30px;
    list-style: none;
}

.signature-template .sig-bullets li {
    position: relative;
    text-align: justify;
    color: #333;
    margin-bottom: 3px;
    padding-left: 2px;
}

.signature-template .sig-bullets li::before {
    content: "•";
    position: absolute;
    left: -13px;
    color: #333;
}

.signature-template .sig-impact {
    margin-top: 4px;
    color: #333;
    text-align: justify;
}

.signature-template .sig-impact-label {
    font-weight: 700;
    color: #1b1b1b;
}

.signature-template .sig-award {
    margin-bottom: 6px;
    padding-left: 14px;
}

.signature-template .sig-award:last-child {
    margin-bottom: 0;
}

.signature-template .sig-award-title {
    font-weight: 700;
    color: #1b1b1b;
}

.signature-template .sig-award-note {
    font-style: italic;
    color: #3a3a3a;
}

.signature-template .sig-bullets strong {
    font-weight: 700;
    color: #1b1b1b;
}
`;

export function generateSignatureHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<SignatureTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${SIGNATURE_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
