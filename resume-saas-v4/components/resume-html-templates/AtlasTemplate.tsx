import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// Swiss / International style — grid-based, strong red accent, clean typography
export const AtlasTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page atlas-template" style={getCssVariables(designSettings)}>
            {/* Accent bar */}
            <div className="atlas-bar" />

            {/* Header */}
            <header className="atlas-header no-break">
                <div className="atlas-header-left">
                    <h1 className="atlas-name" data-editable="fullName">{data.fullName}</h1>
                    <p className="atlas-title" data-editable="jobTitle">{data.jobTitle}</p>
                </div>
                <div className="atlas-contact">
                    {data.contact?.email && <div className="atlas-contact-item">{data.contact.email}</div>}
                    {data.contact?.phone && <div className="atlas-contact-item">{data.contact.phone}</div>}
                    {data.contact?.location && <div className="atlas-contact-item">{data.contact.location}</div>}
                    {data.contact?.linkedin && <div className="atlas-contact-item">{data.contact.linkedin}</div>}
                </div>
            </header>

            <div className="atlas-divider" />

            {/* Summary */}
            {data.summary && (
                <section className="atlas-section no-break">
                    <div className="atlas-label">Summary</div>
                    <p className="atlas-summary text-wrap" data-editable="summary"
                        style={{ lineHeight: sumSettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="atlas-section">
                    <div className="atlas-label">Experience</div>
                    {data.experience.map((exp: any, i: number) => (
                        <div key={i} className="atlas-entry no-break"
                            style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                            <div className="atlas-entry-grid">
                                <div className="atlas-entry-date">{exp.startDate}<br />–<br />{exp.endDate}</div>
                                <div className="atlas-entry-content">
                                    <div className="atlas-entry-role" data-editable={`experience-${i}-role`}>{exp.role}</div>
                                    <div className="atlas-entry-org" data-editable={`experience-${i}-company`}>
                                        {exp.company}{exp.location ? ` / ${exp.location}` : ''}
                                    </div>
                                    <div className="atlas-bullets text-wrap" style={{ lineHeight: expSettings.lineHeight }}>
                                        {splitDescription(exp.description).map((line: string, li: number) => (
                                            <div key={li} className="atlas-bullet">– {line}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <section className="atlas-section">
                    <div className="atlas-label">Projects</div>
                    {data.projects.map((proj: any, i: number) => (
                        <div key={i} className="atlas-entry no-break"
                            style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                            <div className="atlas-entry-grid">
                                <div className="atlas-entry-date" style={{ fontSize: '10px' }}>
                                    {proj.link ? <a href={proj.link} className="atlas-link">↗ Link</a> : ''}
                                </div>
                                <div className="atlas-entry-content">
                                    <div className="atlas-entry-role">{proj.name}</div>
                                    {proj.techStack && <div className="atlas-entry-org">{proj.techStack}</div>}
                                    <div className="atlas-bullets text-wrap" style={{ lineHeight: expSettings.lineHeight }}>
                                        {splitDescription(proj.description).map((line: string, li: number) => (
                                            <div key={li} className="atlas-bullet">– {line}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Education + Skills row */}
            <div className="atlas-bottom-grid">
                {data.education && data.education.length > 0 && (
                    <section className="atlas-section">
                        <div className="atlas-label">Education</div>
                        {data.education.map((edu: any, i: number) => (
                            <div key={i} className="atlas-entry no-break"
                                style={{ marginBottom: `${eduSettings.spacing / 2}px` }}>
                                <div className="atlas-entry-grid">
                                    <div className="atlas-entry-date">
                                        {edu.startDate}<br />–<br />{edu.endDate}
                                    </div>
                                    <div className="atlas-entry-content">
                                        <div className="atlas-entry-role" data-editable={`education-${i}-degree`}>{edu.degree}</div>
                                        <div className="atlas-entry-org">{edu.field}</div>
                                        <div className="atlas-entry-org" data-editable={`education-${i}-school`}>{edu.school}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                <div>
                    {skills.length > 0 && (
                        <section className="atlas-section">
                            <div className="atlas-label">Skills</div>
                            <div className="atlas-skills-list">
                                {skills.map((s: string, i: number) => (
                                    <span key={i} className="atlas-skill">{s}</span>
                                ))}
                            </div>
                        </section>
                    )}

                    {data.certifications && data.certifications.length > 0 && (
                        <section className="atlas-section">
                            <div className="atlas-label">Certifications</div>
                            {data.certifications.map((c: string, i: number) => (
                                <div key={i} className="atlas-bullet">– {c}</div>
                            ))}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export const ATLAS_STYLES = `
${BASE_STYLES}

.atlas-template {
    font-family: 'Helvetica Neue', 'Arial', sans-serif;
    padding: 36px 40px 40px;
    color: #1a1a1a;
}

.atlas-bar {
    height: 5px;
    background: #DC2626;
    margin: -36px -40px 28px;
    width: calc(100% + 80px);
}

.atlas-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 16px;
    gap: 20px;
}

.atlas-name {
    font-size: 32px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: -1px;
    line-height: 1.1;
    margin-bottom: 4px;
}

.atlas-title {
    font-size: 12px;
    color: #DC2626;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.atlas-contact {
    text-align: right;
    flex-shrink: 0;
}

.atlas-contact-item {
    font-size: 10.5px;
    color: #555;
    margin-bottom: 2px;
}

.atlas-divider {
    height: 2px;
    background: #1a1a1a;
    margin-bottom: 20px;
}

.atlas-section {
    margin-bottom: 18px;
}

.atlas-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #DC2626;
    margin-bottom: 10px;
}

.atlas-summary {
    font-size: 11.5px;
    color: #333;
    text-align: justify;
}

.atlas-entry {
    margin-bottom: 12px;
}

.atlas-entry-grid {
    display: grid;
    grid-template-columns: 52px 1fr;
    gap: 12px;
}

.atlas-entry-date {
    font-size: 9.5px;
    color: #888;
    text-align: right;
    line-height: 1.4;
    padding-top: 2px;
}

.atlas-entry-content {}

.atlas-entry-role {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 1px;
}

.atlas-entry-org {
    font-size: 11px;
    color: #555;
    margin-bottom: 4px;
}

.atlas-bullets {
    margin-top: 4px;
}

.atlas-bullet {
    font-size: 11px;
    color: #444;
    margin-bottom: 3px;
    padding-left: 2px;
}

.atlas-link {
    font-size: 10px;
    color: #DC2626;
    text-decoration: none;
}

.atlas-bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.atlas-skills-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.atlas-skill {
    font-size: 10px;
    color: #333;
    background: #F5F5F5;
    border: 1px solid #E0E0E0;
    padding: 3px 8px;
    border-radius: 2px;
}
`;

export function generateAtlasHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<AtlasTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.fullName} - Resume</title>
<style>${ATLAS_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
