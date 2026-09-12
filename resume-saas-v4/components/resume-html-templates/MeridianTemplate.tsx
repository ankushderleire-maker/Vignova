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
 * Meridian — the second house layout.
 *
 * Where Signature tracks its name out across the page and hangs a rule under
 * every section, Meridian sets the name in plain bold, rules directly under
 * each heading, and gives each role two lines: the title with its dates, then
 * the employer in italic beneath. It suits a history of several roles at
 * several employers, where the company names carry weight and want their own
 * line — support, operations, planning, coordination work.
 *
 * Skills are laid out as labelled paragraphs rather than a right-aligned grid,
 * which is what a field whose skills are phrases needs: "Inventory control
 * (ROP, safety stock, DOS, ABC/FSN analysis)" does not belong in a narrow
 * column.
 */

export const MeridianTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
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
        <div className="resume-page meridian-template" style={getCssVariables(designSettings)}>
            <header className="mer-header no-break" data-section="header">
                <h1 className="mer-name" data-editable="fullName">{data.fullName}</h1>
                {data.jobTitle && <p className="mer-title" data-editable="jobTitle">{data.jobTitle}</p>}
                {contact.length > 0 && (
                    <p className="mer-contact">
                        {contact.map((item, index) => (
                            <span key={index}>
                                {index > 0 && <span className="mer-sep">|</span>}
                                {item}
                            </span>
                        ))}
                    </p>
                )}
            </header>

            {data.summary && (
                <section className="mer-section no-break" data-section="summary">
                    <h2 className="mer-heading">Summary</h2>
                    <p className="mer-body text-wrap" data-editable="summary" style={{ lineHeight: summarySettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {groups.length > 0 && (
                <section className="mer-section no-break" data-section="skills">
                    <h2 className="mer-heading">Skills</h2>
                    <div style={{ fontSize: `${Math.min(Math.max(skillsSettings.fontSize, 9), 11)}px`, lineHeight: skillsSettings.lineHeight }}>
                        {groups.map((group, index) => (
                            <p className="mer-skill-line text-wrap" key={index}>
                                <span className="mer-skill-label">{group.label}</span>: {group.skills.join(', ')}
                            </p>
                        ))}
                    </div>
                </section>
            )}

            {data.experience && data.experience.length > 0 && (
                <section className="mer-section" data-section="experience">
                    <h2 className="mer-heading">Experience</h2>
                    {data.experience.map((exp, index) => (
                        <div className="mer-entry" key={exp.id || index}>
                            <div className="mer-entry-head">
                                <span className="mer-role">{exp.role}</span>
                                <span className="mer-date">{[exp.startDate, exp.endDate].filter(Boolean).join(' – ')}</span>
                            </div>
                            {(exp.company || exp.location) && (
                                <div className="mer-org">
                                    {exp.company}{exp.location ? `, ${exp.location}` : ''}
                                </div>
                            )}
                            <ul className="mer-bullets" style={{ lineHeight: experienceSettings.lineHeight }}>
                                {splitDescription(exp.description).map((line, i) => (
                                    <li key={i} dangerouslySetInnerHTML={{ __html: emphasize(line, terms) }} />
                                ))}
                            </ul>
                            {(exp as any).impact && (
                                <p className="mer-impact text-wrap">
                                    <span className="mer-impact-label">Impact</span>: {(exp as any).impact}
                                </p>
                            )}
                        </div>
                    ))}
                </section>
            )}

            {data.projects && data.projects.length > 0 && (
                <section className="mer-section" data-section="projects">
                    <h2 className="mer-heading">Projects</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div className="mer-entry" key={proj.id || index}>
                            <div className="mer-entry-head">
                                <span className="mer-role">{proj.name}</span>
                                {proj.link && <span className="mer-date mer-link">{String(proj.link).replace(/^https?:\/\//, '')}</span>}
                            </div>
                            {proj.techStack && <div className="mer-org">{proj.techStack}</div>}
                            <ul className="mer-bullets" style={{ lineHeight: experienceSettings.lineHeight }}>
                                {splitDescription(proj.description).map((line: string, i: number) => (
                                    <li key={i} dangerouslySetInnerHTML={{ __html: emphasize(line, terms) }} />
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>
            )}

            {data.education && data.education.length > 0 && (
                <section className="mer-section no-break" data-section="education">
                    <h2 className="mer-heading">Education</h2>
                    {data.education.map((edu, index) => (
                        <div className="mer-entry" key={edu.id || index} style={{ lineHeight: educationSettings.lineHeight }}>
                            <div className="mer-entry-head">
                                <span className="mer-role">{edu.school}</span>
                                <span className="mer-date">{[edu.startDate, edu.endDate].filter(Boolean).join(' – ')}</span>
                            </div>
                            <div className="mer-entry-head">
                                <span className="mer-org">{degreeLine(edu)}{edu.grade ? ` · ${edu.grade}` : ''}</span>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {data.certifications && data.certifications.length > 0 && (
                <section className="mer-section no-break" data-section="certifications">
                    <h2 className="mer-heading">Certifications</h2>
                    {(data.certifications as string[]).map((cert, index) => (
                        <p className="mer-cert" key={index}>{cert}</p>
                    ))}
                </section>
            )}

            {achievements.length > 0 && (
                <section className="mer-section no-break" data-section="awards">
                    <h2 className="mer-heading">Achievements</h2>
                    {achievements.map((item, index) => (
                        <div className="mer-award" key={item.id || index}>
                            <div className="mer-award-title">{item.title}{item.date ? ` (${item.date})` : ''}</div>
                            {item.description && <div className="mer-award-note">{item.description}</div>}
                        </div>
                    ))}
                </section>
            )}

            {data.languages && data.languages.length > 0 && (
                <section className="mer-section no-break" data-section="languages">
                    <h2 className="mer-heading">Languages</h2>
                    <p className="mer-body">{(data.languages as string[]).join('  ·  ')}</p>
                </section>
            )}

            {references.length > 0 && (
                <section className="mer-section no-break" data-section="references">
                    <h2 className="mer-heading">References</h2>
                    {references.map((line, index) => (
                        <p className="mer-body" key={index}>{line}</p>
                    ))}
                </section>
            )}
        </div>
    );
};

export const MERIDIAN_STYLES = `
${BASE_STYLES}

.meridian-template {
    font-family: 'Segoe UI', 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #2c2c2c;
    padding: 34px 46px;
    font-size: 10.5px;
    min-height: 296mm;
}

/* ── Header ───────────────────────────────────────────────────────── */

.meridian-template .mer-header {
    text-align: center;
    padding-bottom: 6px;
}

.meridian-template .mer-name {
    font-size: 26px;
    font-weight: 700;
    color: #111;
    letter-spacing: 0.01em;
    line-height: 1.2;
}

.meridian-template .mer-title {
    font-size: 11px;
    font-style: italic;
    color: #333;
    margin-top: 2px;
}

.meridian-template .mer-contact {
    font-size: 10.5px;
    color: #2c2c2c;
    margin-top: 3px;
}

.meridian-template .mer-sep {
    color: #999;
    padding: 0 6px;
}

/* ── Sections: the rule sits under the heading ────────────────────── */

.meridian-template .mer-section {
    margin-top: 10px;
}

.meridian-template .mer-heading {
    font-size: 12px;
    font-weight: 600;
    font-variant: small-caps;
    letter-spacing: 0.06em;
    color: #111;
    border-bottom: 1px solid #4a4a4a;
    padding-bottom: 1px;
    margin-bottom: 6px;
}

.meridian-template .mer-body {
    font-size: 10.5px;
    text-align: justify;
    color: #2c2c2c;
}

/* ── Skills as labelled paragraphs ────────────────────────────────── */

.meridian-template .mer-skill-line {
    margin-bottom: 3px;
    padding-left: 12px;
    text-indent: -12px;
    text-align: justify;
}

.meridian-template .mer-skill-label {
    font-weight: 700;
    color: #111;
}

/* ── Entries: title and dates, employer beneath ───────────────────── */

.meridian-template .mer-entry {
    margin-bottom: 9px;
    padding-left: 8px;
}

.meridian-template .mer-entry:last-child {
    margin-bottom: 0;
}

.meridian-template .mer-entry-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
}

.meridian-template .mer-role {
    font-weight: 700;
    color: #111;
    font-size: 11px;
}

.meridian-template .mer-date {
    font-weight: 700;
    color: #111;
    white-space: nowrap;
}

.meridian-template .mer-link {
    font-weight: 400;
    font-style: italic;
    color: #1155cc;
}

.meridian-template .mer-org {
    font-style: italic;
    color: #3a3a3a;
    margin-bottom: 2px;
}

/* ── Bullets ──────────────────────────────────────────────────────── */

.meridian-template .mer-bullets {
    margin: 3px 0 0 0;
    padding-left: 18px;
    list-style: none;
}

.meridian-template .mer-bullets li {
    position: relative;
    text-align: justify;
    color: #2c2c2c;
    margin-bottom: 3px;
}

.meridian-template .mer-bullets li::before {
    content: "-";
    position: absolute;
    left: -11px;
    color: #555;
}

.meridian-template .mer-bullets strong {
    font-weight: 700;
    color: #111;
}

.meridian-template .mer-impact {
    margin-top: 3px;
    margin-left: -8px;
    color: #2c2c2c;
}

.meridian-template .mer-impact-label {
    font-weight: 700;
    color: #111;
}

/* ── Tail sections ────────────────────────────────────────────────── */

.meridian-template .mer-cert {
    font-weight: 700;
    color: #111;
    padding-left: 8px;
    margin-bottom: 2px;
}

.meridian-template .mer-award {
    padding-left: 8px;
    margin-bottom: 5px;
}

.meridian-template .mer-award-title {
    font-weight: 700;
    color: #111;
}

.meridian-template .mer-award-note {
    font-style: italic;
    color: #3a3a3a;
}
`;

export function generateMeridianHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<MeridianTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${MERIDIAN_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
