import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// Purple / violet — gradient header, elegant two-pane bottom
export const PrismTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page prism-template" style={getCssVariables(designSettings)}>
            {/* Purple gradient header */}
            <header className="prism-header no-break">
                <div className="prism-hero">
                    <h1 className="prism-name" data-editable="fullName">{data.fullName}</h1>
                    <p className="prism-title" data-editable="jobTitle">{data.jobTitle}</p>
                </div>
                <div className="prism-contact-strip">
                    {data.contact?.email && <span className="prism-contact-item">✉ {data.contact.email}</span>}
                    {data.contact?.phone && <span className="prism-contact-item">✆ {data.contact.phone}</span>}
                    {data.contact?.location && <span className="prism-contact-item">⌖ {data.contact.location}</span>}
                    {data.contact?.linkedin && <span className="prism-contact-item">in {data.contact.linkedin}</span>}
                    {data.contact?.website && <span className="prism-contact-item">⊕ {data.contact.website}</span>}
                </div>
            </header>

            <div className="prism-body">
                {/* Summary */}
                {data.summary && (
                    <section className="prism-section no-break">
                        <h2 className="prism-heading">Profile</h2>
                        <p className="prism-summary text-wrap" data-editable="summary"
                            style={{ lineHeight: sumSettings.lineHeight }}>
                            {data.summary}
                        </p>
                    </section>
                )}

                {/* Experience */}
                {data.experience && data.experience.length > 0 && (
                    <section className="prism-section">
                        <h2 className="prism-heading">Experience</h2>
                        {data.experience.map((exp: any, i: number) => (
                            <div key={i} className="prism-entry no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                <div className="prism-entry-top">
                                    <div>
                                        <div className="prism-entry-role" data-editable={`experience-${i}-role`}>{exp.role}</div>
                                        <div className="prism-entry-org" data-editable={`experience-${i}-company`}>
                                            {exp.company}{exp.location ? ` · ${exp.location}` : ''}
                                        </div>
                                    </div>
                                    <div className="prism-date-badge">{exp.startDate} – {exp.endDate}</div>
                                </div>
                                <div className="prism-bullets text-wrap" style={{ lineHeight: expSettings.lineHeight }}>
                                    {splitDescription(exp.description).map((line: string, li: number) => (
                                        <div key={li} className="prism-bullet">
                                            <span className="prism-pip" />
                                            <span>{line}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Projects */}
                {data.projects && data.projects.length > 0 && (
                    <section className="prism-section">
                        <h2 className="prism-heading">Projects</h2>
                        {data.projects.map((proj: any, i: number) => (
                            <div key={i} className="prism-entry no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                <div className="prism-entry-top">
                                    <div>
                                        <div className="prism-entry-role">{proj.name}</div>
                                        {proj.techStack && <div className="prism-tech">{proj.techStack}</div>}
                                    </div>
                                    {proj.link && <a href={proj.link} className="prism-link">↗</a>}
                                </div>
                                <div className="prism-bullets text-wrap" style={{ lineHeight: expSettings.lineHeight }}>
                                    {splitDescription(proj.description).map((line: string, li: number) => (
                                        <div key={li} className="prism-bullet">
                                            <span className="prism-pip" />
                                            <span>{line}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Bottom two columns */}
                <div className="prism-footer-grid">
                    {data.education && data.education.length > 0 && (
                        <section className="prism-section">
                            <h2 className="prism-heading">Education</h2>
                            {data.education.map((edu: any, i: number) => (
                                <div key={i} className="prism-edu no-break"
                                    style={{ marginBottom: `${eduSettings.spacing / 2}px` }}>
                                    <div className="prism-entry-role" data-editable={`education-${i}-degree`}>{edu.degree}</div>
                                    <div className="prism-entry-org">{edu.field}</div>
                                    <div className="prism-entry-org" data-editable={`education-${i}-school`}>{edu.school}</div>
                                    <div className="prism-date-small">{edu.startDate} – {edu.endDate}</div>
                                </div>
                            ))}
                        </section>
                    )}

                    <div>
                        {skills.length > 0 && (
                            <section className="prism-section">
                                <h2 className="prism-heading">Skills</h2>
                                <div className="prism-skill-cloud">
                                    {skills.map((s: string, i: number) => (
                                        <span key={i} className="prism-skill">{s}</span>
                                    ))}
                                </div>
                            </section>
                        )}
                        {data.certifications && data.certifications.length > 0 && (
                            <section className="prism-section">
                                <h2 className="prism-heading">Certifications</h2>
                                {data.certifications.map((c: string, i: number) => (
                                    <div key={i} className="prism-bullet">
                                        <span className="prism-pip" />
                                        <span style={{ fontSize: '10.5px', color: '#374151' }}>{c}</span>
                                    </div>
                                ))}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PRISM_STYLES = `
${BASE_STYLES}

.prism-template {
    padding: 0;
    font-family: 'Inter', 'Segoe UI', sans-serif;
}

.prism-header {
    background: linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #A855F7 100%);
    padding: 28px 36px 18px;
}

.prism-hero {
    margin-bottom: 14px;
}

.prism-name {
    font-size: 34px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
    line-height: 1.1;
    margin-bottom: 5px;
}

.prism-title {
    font-size: 12px;
    color: rgba(255,255,255,0.8);
    font-weight: 400;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.prism-contact-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.2);
}

.prism-contact-item {
    font-size: 10px;
    color: rgba(255,255,255,0.85);
}

.prism-body {
    padding: 22px 36px 32px;
}

.prism-section {
    margin-bottom: 16px;
}

.prism-heading {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #7C3AED;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1.5px solid #DDD6FE;
}

.prism-summary {
    font-size: 11.5px;
    color: #374151;
    text-align: justify;
}

.prism-entry {
    margin-bottom: 12px;
}

.prism-entry-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 5px;
}

.prism-entry-role {
    font-size: 12.5px;
    font-weight: 700;
    color: #1F2937;
}

.prism-entry-org {
    font-size: 11px;
    color: #6B7280;
    margin-top: 1px;
}

.prism-tech {
    font-size: 10px;
    color: #7C3AED;
    font-style: italic;
    margin-top: 1px;
}

.prism-date-badge {
    background: #F5F3FF;
    color: #7C3AED;
    font-size: 9.5px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 20px;
    white-space: nowrap;
    flex-shrink: 0;
    border: 1px solid #DDD6FE;
}

.prism-date-small {
    font-size: 10px;
    color: #9CA3AF;
    margin-top: 2px;
}

.prism-bullets {
    margin-top: 3px;
}

.prism-bullet {
    display: flex;
    align-items: flex-start;
    gap: 7px;
    font-size: 11px;
    color: #374151;
    margin-bottom: 3px;
}

.prism-pip {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #7C3AED;
    margin-top: 5px;
    flex-shrink: 0;
}

.prism-link {
    font-size: 13px;
    color: #7C3AED;
    text-decoration: none;
    flex-shrink: 0;
}

.prism-footer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.prism-edu {
    margin-bottom: 8px;
}

.prism-skill-cloud {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.prism-skill {
    background: #F5F3FF;
    border: 1px solid #DDD6FE;
    color: #5B21B6;
    font-size: 10px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 20px;
}
`;

export function generatePrismHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<PrismTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.fullName} - Resume</title>
<style>${PRISM_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
