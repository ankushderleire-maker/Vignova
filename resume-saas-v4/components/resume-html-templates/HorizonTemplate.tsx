import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// Full-width teal header, clean single-column
export const HorizonTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page horizon-template" style={getCssVariables(designSettings)}>
            {/* Hero header */}
            <header className="hz-header no-break">
                <div className="hz-name-row">
                    <div>
                        <h1 className="hz-name" data-editable="fullName">{data.fullName}</h1>
                        <p className="hz-title" data-editable="jobTitle">{data.jobTitle}</p>
                    </div>
                </div>
                <div className="hz-contact-bar">
                    {data.contact?.email && <span>{data.contact.email}</span>}
                    {data.contact?.phone && <span>{data.contact.phone}</span>}
                    {data.contact?.location && <span>{data.contact.location}</span>}
                    {data.contact?.linkedin && <span>{data.contact.linkedin}</span>}
                    {data.contact?.website && <span>{data.contact.website}</span>}
                </div>
            </header>

            <div className="hz-body">
                {data.summary && (
                    <section className="hz-section no-break">
                        <div className="hz-section-label">About</div>
                        <p className="hz-summary text-wrap" data-editable="summary"
                            style={{ lineHeight: sumSettings.lineHeight }}>
                            {data.summary}
                        </p>
                    </section>
                )}

                {data.experience && data.experience.length > 0 && (
                    <section className="hz-section">
                        <div className="hz-section-label">Experience</div>
                        {data.experience.map((exp: any, i: number) => (
                            <div key={i} className="hz-entry no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                <div className="hz-entry-top">
                                    <div className="hz-entry-left">
                                        <span className="hz-entry-title" data-editable={`experience-${i}-role`}>{exp.role}</span>
                                        <span className="hz-entry-sub" data-editable={`experience-${i}-company`}>
                                            {exp.company}{exp.location ? `, ${exp.location}` : ''}
                                        </span>
                                    </div>
                                    <span className="hz-date">{exp.startDate} – {exp.endDate}</span>
                                </div>
                                <div className="hz-bullets text-wrap" style={{ lineHeight: expSettings.lineHeight }}>
                                    {splitDescription(exp.description).map((line: string, li: number) => (
                                        <div key={li} className="hz-bullet">
                                            <span className="hz-dot">◆</span>
                                            <span>{line}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {data.projects && data.projects.length > 0 && (
                    <section className="hz-section">
                        <div className="hz-section-label">Projects</div>
                        {data.projects.map((proj: any, i: number) => (
                            <div key={i} className="hz-entry no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                <div className="hz-entry-top">
                                    <div className="hz-entry-left">
                                        <span className="hz-entry-title">{proj.name}</span>
                                        {proj.techStack && <span className="hz-stack">{proj.techStack}</span>}
                                    </div>
                                    {proj.link && <a href={proj.link} className="hz-link">↗ Link</a>}
                                </div>
                                <div className="hz-bullets text-wrap" style={{ lineHeight: expSettings.lineHeight }}>
                                    {splitDescription(proj.description).map((line: string, li: number) => (
                                        <div key={li} className="hz-bullet">
                                            <span className="hz-dot">◆</span>
                                            <span>{line}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                <div className="hz-two-col">
                    {data.education && data.education.length > 0 && (
                        <section className="hz-section hz-col">
                            <div className="hz-section-label">Education</div>
                            {data.education.map((edu: any, i: number) => (
                                <div key={i} className="hz-edu no-break"
                                    style={{ marginBottom: `${eduSettings.spacing / 2}px` }}>
                                    <div className="hz-entry-title" data-editable={`education-${i}-degree`}>{edu.degree}</div>
                                    <div className="hz-entry-sub">{edu.field}</div>
                                    <div className="hz-entry-sub" data-editable={`education-${i}-school`}>{edu.school}</div>
                                    <div className="hz-date-inline">{edu.startDate} – {edu.endDate}</div>
                                </div>
                            ))}
                        </section>
                    )}

                    <div className="hz-col">
                        {skills.length > 0 && (
                            <section className="hz-section">
                                <div className="hz-section-label">Skills</div>
                                <div className="hz-skill-grid">
                                    {skills.map((s: string, i: number) => (
                                        <span key={i} className="hz-skill-chip">{s}</span>
                                    ))}
                                </div>
                            </section>
                        )}

                        {data.certifications && data.certifications.length > 0 && (
                            <section className="hz-section">
                                <div className="hz-section-label">Certifications</div>
                                {data.certifications.map((c: string, i: number) => (
                                    <div key={i} className="hz-bullet">
                                        <span className="hz-dot">◆</span>
                                        <span style={{ fontSize: '11px', color: '#374151' }}>{c}</span>
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

export const HORIZON_STYLES = `
${BASE_STYLES}

.horizon-template {
    padding: 0;
    font-family: 'Inter', 'Segoe UI', sans-serif;
}

/* Header */
.hz-header {
    background: linear-gradient(135deg, #0F766E 0%, #0D9488 60%, #14B8A6 100%);
    padding: 28px 36px 20px;
    color: white;
}

.hz-name-row {
    margin-bottom: 10px;
}

.hz-name {
    font-size: 30px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.5px;
    line-height: 1.1;
    margin-bottom: 4px;
}

.hz-title {
    font-size: 13px;
    font-weight: 400;
    color: rgba(255,255,255,0.85);
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.hz-contact-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255,255,255,0.25);
    font-size: 10.5px;
    color: rgba(255,255,255,0.9);
}

/* Body */
.hz-body {
    padding: 24px 36px 32px;
}

.hz-section {
    margin-bottom: 18px;
}

.hz-section-label {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #0F766E;
    padding-bottom: 5px;
    border-bottom: 2px solid #0D9488;
    margin-bottom: 10px;
}

.hz-summary {
    font-size: 11.5px;
    color: #374151;
    text-align: justify;
}

.hz-entry {
    margin-bottom: 12px;
}

.hz-entry-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
    gap: 8px;
}

.hz-entry-left {
    display: flex;
    flex-direction: column;
    gap: 1px;
}

.hz-entry-title {
    font-size: 12.5px;
    font-weight: 700;
    color: #111827;
}

.hz-entry-sub {
    font-size: 11px;
    color: #6B7280;
}

.hz-stack {
    font-size: 10px;
    color: #0F766E;
    font-style: italic;
}

.hz-date {
    font-size: 10px;
    color: #9CA3AF;
    white-space: nowrap;
    flex-shrink: 0;
}

.hz-date-inline {
    font-size: 10px;
    color: #9CA3AF;
    margin-top: 2px;
}

.hz-bullets {
    margin-top: 4px;
}

.hz-bullet {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: 11px;
    color: #374151;
    margin-bottom: 3px;
}

.hz-dot {
    color: #0D9488;
    font-size: 7px;
    margin-top: 4px;
    flex-shrink: 0;
}

.hz-link {
    font-size: 10px;
    color: #0D9488;
    text-decoration: none;
    white-space: nowrap;
}

.hz-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.hz-col {}

.hz-edu {
    margin-bottom: 10px;
}

.hz-skill-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.hz-skill-chip {
    background: #F0FDFA;
    border: 1px solid #99F6E4;
    color: #0F766E;
    font-size: 10px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 4px;
}
`;

export function generateHorizonHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<HorizonTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.fullName} - Resume</title>
<style>${HORIZON_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
