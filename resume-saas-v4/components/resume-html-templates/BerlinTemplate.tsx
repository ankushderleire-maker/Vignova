import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// German professional Lebenslauf style — structured, comprehensive, dark headers
export const BerlinTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page berlin-template" style={getCssVariables(designSettings)}>
            {/* Dark header block */}
            <header className="brl-header no-break">
                <div className="brl-header-main">
                    <h1 className="brl-name" data-editable="fullName">{data.fullName}</h1>
                    <p className="brl-title" data-editable="jobTitle">{data.jobTitle}</p>
                </div>
                <div className="brl-header-contact">
                    {data.contact?.email    && <div className="brl-contact-item"><span className="brl-ci-label">E</span>{data.contact.email}</div>}
                    {data.contact?.phone    && <div className="brl-contact-item"><span className="brl-ci-label">T</span>{data.contact.phone}</div>}
                    {data.contact?.location && <div className="brl-contact-item"><span className="brl-ci-label">A</span>{data.contact.location}</div>}
                    {data.contact?.linkedin && <div className="brl-contact-item"><span className="brl-ci-label">in</span>{data.contact.linkedin}</div>}
                    {data.contact?.website  && <div className="brl-contact-item"><span className="brl-ci-label">W</span>{data.contact.website}</div>}
                </div>
            </header>

            {/* Profile */}
            {data.summary && (
                <div className="brl-section no-break">
                    <div className="brl-section-title">Berufliches Profil</div>
                    <p className="brl-body text-wrap" data-editable="summary"
                        style={{ lineHeight: sumSettings.lineHeight }}>
                        {data.summary}
                    </p>
                </div>
            )}

            {/* Berufserfahrung / Work Experience */}
            {data.experience && data.experience.length > 0 && (
                <div className="brl-section">
                    <div className="brl-section-title">Berufserfahrung</div>
                    {data.experience.map((exp: any, i: number) => (
                        <div key={i} className="brl-entry no-break"
                            style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                            <div className="brl-entry-row">
                                <div className="brl-entry-date">{exp.startDate}<br />– {exp.endDate}</div>
                                <div className="brl-entry-content">
                                    <div className="brl-entry-role" data-editable={`experience-${i}-role`}>{exp.role}</div>
                                    <div className="brl-entry-org" data-editable={`experience-${i}-company`}>
                                        {exp.company}{exp.location ? ` | ${exp.location}` : ''}
                                    </div>
                                    <div className="brl-entry-desc text-wrap"
                                        style={{ lineHeight: expSettings.lineHeight }}>
                                        {splitDescription(exp.description).map((line: string, li: number) => (
                                            <div key={li} className="brl-bullet">– {line}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Ausbildung / Education */}
            {data.education && data.education.length > 0 && (
                <div className="brl-section">
                    <div className="brl-section-title">Ausbildung</div>
                    {data.education.map((edu: any, i: number) => (
                        <div key={i} className="brl-entry no-break"
                            style={{ marginBottom: `${eduSettings.spacing / 2}px` }}>
                            <div className="brl-entry-row">
                                <div className="brl-entry-date">{edu.startDate}<br />– {edu.endDate}</div>
                                <div className="brl-entry-content">
                                    <div className="brl-entry-role" data-editable={`education-${i}-degree`}>
                                        {edu.degree}{edu.field ? `, ${edu.field}` : ''}
                                    </div>
                                    <div className="brl-entry-org" data-editable={`education-${i}-school`}>{edu.school}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <div className="brl-section">
                    <div className="brl-section-title">Projekte</div>
                    {data.projects.map((proj: any, i: number) => (
                        <div key={i} className="brl-entry no-break"
                            style={{ marginBottom: `${expSettings.spacing / 1.5}px` }}>
                            <div className="brl-entry-row">
                                <div className="brl-entry-date" />
                                <div className="brl-entry-content">
                                    <div className="brl-entry-role">
                                        {proj.name}
                                        {proj.link && <a href={proj.link} className="brl-link"> ↗</a>}
                                    </div>
                                    {proj.techStack && <div className="brl-entry-org">{proj.techStack}</div>}
                                    <div className="brl-entry-desc text-wrap">
                                        {splitDescription(proj.description).map((line: string, li: number) => (
                                            <div key={li} className="brl-bullet">– {line}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Two-column bottom */}
            <div className="brl-two-col">
                {/* Kenntnisse / Skills */}
                {skills.length > 0 && (
                    <div className="brl-section">
                        <div className="brl-section-title">Kenntnisse</div>
                        <div className="brl-skill-list">
                            {skills.map((s: string, i: number) => (
                                <div key={i} className="brl-skill-item">
                                    <span className="brl-skill-dot" />
                                    <span className="brl-body">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    {/* Sprachen / Languages */}
                    {data.languages && data.languages.length > 0 && (
                        <div className="brl-section">
                            <div className="brl-section-title">Sprachen</div>
                            {data.languages.map((l: string, i: number) => (
                                <div key={i} className="brl-skill-item">
                                    <span className="brl-skill-dot" />
                                    <span className="brl-body">{l}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Zertifikate */}
                    {data.certifications && data.certifications.length > 0 && (
                        <div className="brl-section">
                            <div className="brl-section-title">Zertifikate</div>
                            {data.certifications.map((c: string, i: number) => (
                                <div key={i} className="brl-skill-item">
                                    <span className="brl-skill-dot" />
                                    <span className="brl-body">{c}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const BERLIN_STYLES = `
${BASE_STYLES}

.berlin-template {
    font-family: 'Arial', 'Helvetica', sans-serif;
    padding: 0;
    color: #1a1a1a;
    font-size: 11px;
}

/* Header */
.brl-header {
    background: #1C1C1C;
    padding: 24px 32px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: center;
}

.brl-name {
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    line-height: 1.2;
}

.brl-title {
    font-size: 11px;
    color: #AAA;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.brl-header-contact {
    border-left: 1px solid #444;
    padding-left: 20px;
}

.brl-contact-item {
    font-size: 10.5px;
    color: #CCC;
    margin-bottom: 4px;
    display: flex;
    gap: 8px;
    align-items: baseline;
    word-break: break-all;
}

.brl-ci-label {
    font-size: 9px;
    font-weight: 700;
    color: #888;
    width: 14px;
    flex-shrink: 0;
    text-transform: uppercase;
}

/* Body */
.brl-section {
    padding: 0 32px;
    margin-bottom: 14px;
    padding-top: 14px;
}

.brl-section-title {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #1C1C1C;
    padding-bottom: 4px;
    border-bottom: 2px solid #1C1C1C;
    margin-bottom: 10px;
}

.brl-body {
    font-size: 11px;
    color: #333;
    text-align: justify;
}

/* Entries */
.brl-entry-row {
    display: grid;
    grid-template-columns: 70px 1fr;
    gap: 14px;
}

.brl-entry-date {
    font-size: 9.5px;
    color: #666;
    line-height: 1.6;
    padding-top: 2px;
}

.brl-entry-content {}

.brl-entry-role {
    font-size: 12px;
    font-weight: 700;
    color: #1C1C1C;
    margin-bottom: 1px;
}

.brl-entry-org {
    font-size: 10.5px;
    color: #555;
    margin-bottom: 3px;
}

.brl-entry-desc {
    margin-top: 3px;
}

.brl-bullet {
    font-size: 10.5px;
    color: #333;
    margin-bottom: 2px;
    line-height: 1.5;
}

.brl-link {
    font-size: 10px;
    color: #555;
    text-decoration: none;
}

/* Bottom two-col */
.brl-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid #DDD;
    margin-top: 4px;
}

.brl-skill-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.brl-skill-item {
    display: flex;
    align-items: baseline;
    gap: 7px;
}

.brl-skill-dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #1C1C1C;
    flex-shrink: 0;
    margin-top: 3px;
}
`;

export function generateBerlinHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<BerlinTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.fullName} - Lebenslauf</title>
<style>${BERLIN_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
