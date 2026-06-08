import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// EU Europass-style CV — structured blue-accented official format
export const EuropassTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page europass-template" style={getCssVariables(designSettings)}>
            {/* Top EU bar */}
            <div className="ep-topbar">
                <span className="ep-cv-label">Curriculum Vitae</span>
            </div>

            {/* Personal info block */}
            <div className="ep-personal no-break">
                <div className="ep-name-col">
                    <h1 className="ep-name" data-editable="fullName">{data.fullName}</h1>
                    <p className="ep-title" data-editable="jobTitle">{data.jobTitle}</p>
                </div>
                <div className="ep-contact-col">
                    {data.contact?.email    && <div className="ep-contact-row"><span className="ep-contact-lbl">Email</span><span>{data.contact.email}</span></div>}
                    {data.contact?.phone    && <div className="ep-contact-row"><span className="ep-contact-lbl">Phone</span><span>{data.contact.phone}</span></div>}
                    {data.contact?.location && <div className="ep-contact-row"><span className="ep-contact-lbl">Address</span><span>{data.contact.location}</span></div>}
                    {data.contact?.linkedin && <div className="ep-contact-row"><span className="ep-contact-lbl">LinkedIn</span><span>{data.contact.linkedin}</span></div>}
                    {data.contact?.website  && <div className="ep-contact-row"><span className="ep-contact-lbl">Website</span><span>{data.contact.website}</span></div>}
                </div>
            </div>

            {/* Summary */}
            {data.summary && (
                <div className="ep-section no-break">
                    <div className="ep-section-header">
                        <div className="ep-section-icon">☰</div>
                        <h2 className="ep-section-title">Personal Statement</h2>
                    </div>
                    <div className="ep-section-body">
                        <p className="ep-body-text text-wrap" data-editable="summary"
                            style={{ lineHeight: sumSettings.lineHeight }}>
                            {data.summary}
                        </p>
                    </div>
                </div>
            )}

            {/* Work Experience */}
            {data.experience && data.experience.length > 0 && (
                <div className="ep-section">
                    <div className="ep-section-header">
                        <div className="ep-section-icon">✦</div>
                        <h2 className="ep-section-title">Work Experience</h2>
                    </div>
                    <div className="ep-section-body">
                        {data.experience.map((exp: any, i: number) => (
                            <div key={i} className="ep-entry no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                <div className="ep-entry-grid">
                                    <div className="ep-entry-date">{exp.startDate} – {exp.endDate}</div>
                                    <div className="ep-entry-right">
                                        <div className="ep-entry-role" data-editable={`experience-${i}-role`}>{exp.role}</div>
                                        <div className="ep-entry-org" data-editable={`experience-${i}-company`}>
                                            {exp.company}{exp.location ? `, ${exp.location}` : ''}
                                        </div>
                                        <div className="ep-entry-desc text-wrap"
                                            style={{ lineHeight: expSettings.lineHeight }}>
                                            {splitDescription(exp.description).map((line: string, li: number) => (
                                                <div key={li} className="ep-bullet">• {line}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <div className="ep-section">
                    <div className="ep-section-header">
                        <div className="ep-section-icon">◉</div>
                        <h2 className="ep-section-title">Education and Training</h2>
                    </div>
                    <div className="ep-section-body">
                        {data.education.map((edu: any, i: number) => (
                            <div key={i} className="ep-entry no-break"
                                style={{ marginBottom: `${eduSettings.spacing / 2}px` }}>
                                <div className="ep-entry-grid">
                                    <div className="ep-entry-date">{edu.startDate} – {edu.endDate}</div>
                                    <div className="ep-entry-right">
                                        <div className="ep-entry-role" data-editable={`education-${i}-degree`}>
                                            {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                                        </div>
                                        <div className="ep-entry-org" data-editable={`education-${i}-school`}>{edu.school}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <div className="ep-section">
                    <div className="ep-section-header">
                        <div className="ep-section-icon">▸</div>
                        <h2 className="ep-section-title">Key Projects</h2>
                    </div>
                    <div className="ep-section-body">
                        {data.projects.map((proj: any, i: number) => (
                            <div key={i} className="ep-entry no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.5}px` }}>
                                <div className="ep-entry-grid">
                                    <div className="ep-entry-date" />
                                    <div className="ep-entry-right">
                                        <div className="ep-entry-role">{proj.name}{proj.link ? <a href={proj.link} className="ep-link"> ↗</a> : ''}</div>
                                        {proj.techStack && <div className="ep-entry-org">{proj.techStack}</div>}
                                        <div className="ep-entry-desc text-wrap">
                                            {splitDescription(proj.description).map((line: string, li: number) => (
                                                <div key={li} className="ep-bullet">• {line}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
                <div className="ep-section no-break">
                    <div className="ep-section-header">
                        <div className="ep-section-icon">★</div>
                        <h2 className="ep-section-title">Digital Skills</h2>
                    </div>
                    <div className="ep-section-body">
                        <div className="ep-entry-grid">
                            <div className="ep-entry-date" />
                            <div className="ep-skills-row">
                                {skills.map((s: string, i: number) => (
                                    <span key={i} className="ep-skill">{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
                <div className="ep-section no-break">
                    <div className="ep-section-header">
                        <div className="ep-section-icon">✓</div>
                        <h2 className="ep-section-title">Certificates</h2>
                    </div>
                    <div className="ep-section-body">
                        <div className="ep-entry-grid">
                            <div className="ep-entry-date" />
                            <div>
                                {data.certifications.map((c: string, i: number) => (
                                    <div key={i} className="ep-bullet">• {c}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Languages */}
            {data.languages && data.languages.length > 0 && (
                <div className="ep-section no-break">
                    <div className="ep-section-header">
                        <div className="ep-section-icon">◎</div>
                        <h2 className="ep-section-title">Languages</h2>
                    </div>
                    <div className="ep-section-body">
                        <div className="ep-entry-grid">
                            <div className="ep-entry-date" />
                            <div className="ep-lang-row">
                                {data.languages.map((l: string, i: number) => (
                                    <span key={i} className="ep-lang">{l}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const EUROPASS_STYLES = `
${BASE_STYLES}

.europass-template {
    font-family: 'Arial', 'Helvetica', sans-serif;
    padding: 0;
    color: #1a1a1a;
    font-size: 11px;
}

.ep-topbar {
    background: #003399;
    padding: 8px 30px;
    display: flex;
    align-items: center;
}

.ep-cv-label {
    font-size: 11px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 2px;
    text-transform: uppercase;
}

.ep-personal {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 18px 30px 16px;
    background: #F0F4FF;
    border-bottom: 2px solid #003399;
}

.ep-name {
    font-size: 22px;
    font-weight: 700;
    color: #003399;
    margin-bottom: 3px;
    line-height: 1.2;
}

.ep-title {
    font-size: 11px;
    color: #444;
    font-style: italic;
}

.ep-contact-col {
    padding-top: 2px;
}

.ep-contact-row {
    display: flex;
    gap: 8px;
    margin-bottom: 3px;
    font-size: 10.5px;
    color: #333;
}

.ep-contact-lbl {
    font-weight: 700;
    color: #003399;
    min-width: 52px;
    font-size: 10px;
}

.ep-section {
    margin: 0;
    border-bottom: 1px solid #D0D8F0;
}

.ep-section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #E8EEFF;
    padding: 6px 30px;
    border-left: 4px solid #003399;
}

.ep-section-icon {
    color: #003399;
    font-size: 10px;
}

.ep-section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #003399;
}

.ep-section-body {
    padding: 10px 30px 12px;
}

.ep-entry {
    margin-bottom: 10px;
}

.ep-entry-grid {
    display: grid;
    grid-template-columns: 90px 1fr;
    gap: 12px;
}

.ep-entry-date {
    font-size: 10px;
    color: #555;
    padding-top: 1px;
    line-height: 1.5;
}

.ep-entry-right {}

.ep-entry-role {
    font-size: 12px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 1px;
}

.ep-entry-org {
    font-size: 10.5px;
    color: #555;
    margin-bottom: 3px;
    font-style: italic;
}

.ep-entry-desc {
    margin-top: 3px;
}

.ep-bullet {
    font-size: 10.5px;
    color: #333;
    margin-bottom: 2px;
    line-height: 1.5;
}

.ep-body-text {
    font-size: 10.5px;
    color: #333;
    text-align: justify;
    line-height: 1.6;
}

.ep-skills-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.ep-skill {
    background: #fff;
    border: 1px solid #003399;
    color: #003399;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 2px;
}

.ep-lang-row {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.ep-lang {
    background: #F0F4FF;
    border: 1px solid #D0D8F0;
    color: #003399;
    font-size: 10px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 2px;
}

.ep-link {
    font-size: 10px;
    color: #003399;
    text-decoration: none;
}
`;

export function generateEuropassHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<EuropassTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.fullName} - CV</title>
<style>${EUROPASS_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
