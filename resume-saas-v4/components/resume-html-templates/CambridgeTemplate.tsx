import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// Classic British academic / professional CV — serif, conservative, no colour
export const CambridgeTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page cambridge-template" style={getCssVariables(designSettings)}>

            {/* Centred heading */}
            <header className="cam-header no-break">
                <h1 className="cam-name" data-editable="fullName">{data.fullName}</h1>
                <p className="cam-title" data-editable="jobTitle">{data.jobTitle}</p>
                <div className="cam-contact-line">
                    {[
                        data.contact?.email,
                        data.contact?.phone,
                        data.contact?.location,
                        data.contact?.linkedin,
                    ].filter(Boolean).join('  |  ')}
                </div>
                <div className="cam-rule" />
            </header>

            {/* Summary / Profile */}
            {data.summary && (
                <section className="cam-section no-break">
                    <h2 className="cam-heading">Profile</h2>
                    <p className="cam-body text-wrap" data-editable="summary"
                        style={{ lineHeight: sumSettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="cam-section">
                    <h2 className="cam-heading">Employment History</h2>
                    {data.experience.map((exp: any, i: number) => (
                        <div key={i} className="cam-entry no-break"
                            style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                            <div className="cam-entry-header">
                                <div>
                                    <span className="cam-entry-role" data-editable={`experience-${i}-role`}>{exp.role}</span>
                                    <span className="cam-entry-sep">,&nbsp;</span>
                                    <span className="cam-entry-org" data-editable={`experience-${i}-company`}>{exp.company}</span>
                                    {exp.location && <span className="cam-entry-sep">,&nbsp;{exp.location}</span>}
                                </div>
                                <span className="cam-entry-date">{exp.startDate}–{exp.endDate}</span>
                            </div>
                            <div className="cam-bullets text-wrap"
                                style={{ lineHeight: expSettings.lineHeight }}>
                                {splitDescription(exp.description).map((line: string, li: number) => (
                                    <div key={li} className="cam-bullet">• {line}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <section className="cam-section">
                    <h2 className="cam-heading">Education</h2>
                    {data.education.map((edu: any, i: number) => (
                        <div key={i} className="cam-entry no-break"
                            style={{ marginBottom: `${eduSettings.spacing / 2}px` }}>
                            <div className="cam-entry-header">
                                <div>
                                    <span className="cam-entry-role" data-editable={`education-${i}-degree`}>{edu.degree}</span>
                                    {edu.field && <span className="cam-entry-sep">&nbsp;in {edu.field}</span>}
                                    <span className="cam-entry-sep">,&nbsp;</span>
                                    <span className="cam-entry-org" data-editable={`education-${i}-school`}>{edu.school}</span>
                                </div>
                                <span className="cam-entry-date">{edu.startDate}–{edu.endDate}</span>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <section className="cam-section">
                    <h2 className="cam-heading">Selected Projects</h2>
                    {data.projects.map((proj: any, i: number) => (
                        <div key={i} className="cam-entry no-break"
                            style={{ marginBottom: `${expSettings.spacing / 1.5}px` }}>
                            <div className="cam-entry-header">
                                <div>
                                    <span className="cam-entry-role">{proj.name}</span>
                                    {proj.techStack && <span className="cam-entry-sep">&nbsp;({proj.techStack})</span>}
                                </div>
                                {proj.link && <a href={proj.link} className="cam-link">Link ↗</a>}
                            </div>
                            <div className="cam-bullets text-wrap">
                                {splitDescription(proj.description).map((line: string, li: number) => (
                                    <div key={li} className="cam-bullet">• {line}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
                <section className="cam-section no-break">
                    <h2 className="cam-heading">Skills &amp; Competencies</h2>
                    <p className="cam-body">{skills.join(' · ')}</p>
                </section>
            )}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
                <section className="cam-section no-break">
                    <h2 className="cam-heading">Professional Certifications</h2>
                    {data.certifications.map((c: string, i: number) => (
                        <div key={i} className="cam-bullet">• {c}</div>
                    ))}
                </section>
            )}

            {/* Languages */}
            {data.languages && data.languages.length > 0 && (
                <section className="cam-section no-break">
                    <h2 className="cam-heading">Languages</h2>
                    <p className="cam-body">{data.languages.join(' · ')}</p>
                </section>
            )}
        </div>
    );
};

export const CAMBRIDGE_STYLES = `
${BASE_STYLES}

.cambridge-template {
    font-family: 'Times New Roman', 'Georgia', serif;
    padding: 44px 48px;
    color: #111;
    font-size: 11.5px;
    line-height: 1.6;
}

/* Header */
.cam-header {
    text-align: center;
    margin-bottom: 18px;
}

.cam-name {
    font-size: 26px;
    font-weight: 700;
    color: #000;
    letter-spacing: 1px;
    margin-bottom: 4px;
    font-variant: small-caps;
}

.cam-title {
    font-size: 12px;
    color: #333;
    font-style: italic;
    margin-bottom: 6px;
}

.cam-contact-line {
    font-size: 10.5px;
    color: #444;
    margin-bottom: 10px;
    font-family: 'Arial', sans-serif;
}

.cam-rule {
    border: none;
    border-top: 1.5px solid #000;
    margin: 0 auto;
    width: 100%;
}

/* Sections */
.cam-section {
    margin-bottom: 14px;
}

.cam-heading {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #000;
    border-bottom: 1px solid #999;
    padding-bottom: 3px;
    margin-bottom: 8px;
    font-family: 'Arial', 'Helvetica', sans-serif;
}

.cam-body {
    font-size: 11.5px;
    color: #222;
    text-align: justify;
}

/* Entries */
.cam-entry {
    margin-bottom: 10px;
}

.cam-entry-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 3px;
}

.cam-entry-role {
    font-weight: 700;
    color: #000;
    font-size: 12px;
}

.cam-entry-org {
    font-style: italic;
    color: #222;
}

.cam-entry-sep {
    color: #222;
}

.cam-entry-date {
    font-size: 10.5px;
    color: #555;
    white-space: nowrap;
    font-family: 'Arial', sans-serif;
    flex-shrink: 0;
}

.cam-bullets {
    margin-top: 2px;
    padding-left: 4px;
}

.cam-bullet {
    font-size: 11px;
    color: #333;
    margin-bottom: 2px;
    text-align: justify;
}

.cam-link {
    font-size: 10.5px;
    color: #000;
    font-family: 'Arial', sans-serif;
    text-decoration: none;
    white-space: nowrap;
}
`;

export function generateCambridgeHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<CambridgeTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.fullName} - CV</title>
<style>${CAMBRIDGE_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
