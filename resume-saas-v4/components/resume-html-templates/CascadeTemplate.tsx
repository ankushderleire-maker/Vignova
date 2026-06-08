import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// Indigo two-column sidebar layout
export const CascadeTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page cascade-template" style={getCssVariables(designSettings)}>
            <div className="cascade-grid">
                {/* ── Sidebar ── */}
                <aside className="sidebar">
                    <div className="sb-name-block">
                        <h1 className="sb-name" data-editable="fullName">{data.fullName}</h1>
                        <p className="sb-title" data-editable="jobTitle">{data.jobTitle}</p>
                    </div>

                    <div className="sb-section">
                        <h3 className="sb-heading">Contact</h3>
                        {data.contact?.email && <div className="sb-item">{data.contact.email}</div>}
                        {data.contact?.phone && <div className="sb-item">{data.contact.phone}</div>}
                        {data.contact?.location && <div className="sb-item">{data.contact.location}</div>}
                        {data.contact?.linkedin && <div className="sb-item">{data.contact.linkedin}</div>}
                        {data.contact?.website && <div className="sb-item">{data.contact.website}</div>}
                    </div>

                    {skills.length > 0 && (
                        <div className="sb-section">
                            <h3 className="sb-heading">Skills</h3>
                            <div className="skill-tags">
                                {skills.map((s: string, i: number) => (
                                    <span key={i} className="skill-tag">{s}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.education && data.education.length > 0 && (
                        <div className="sb-section">
                            <h3 className="sb-heading">Education</h3>
                            {data.education.map((edu: any, i: number) => (
                                <div key={i} className="sb-edu">
                                    <div className="sb-edu-degree">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</div>
                                    <div className="sb-edu-school">{edu.school}</div>
                                    <div className="sb-edu-date">{edu.startDate} – {edu.endDate}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {data.languages && data.languages.length > 0 && (
                        <div className="sb-section">
                            <h3 className="sb-heading">Languages</h3>
                            {data.languages.map((l: string, i: number) => (
                                <div key={i} className="sb-item">{l}</div>
                            ))}
                        </div>
                    )}

                    {data.certifications && data.certifications.length > 0 && (
                        <div className="sb-section">
                            <h3 className="sb-heading">Certifications</h3>
                            {data.certifications.map((c: string, i: number) => (
                                <div key={i} className="sb-item">{c}</div>
                            ))}
                        </div>
                    )}
                </aside>

                {/* ── Main ── */}
                <main className="main-col">
                    {data.summary && (
                        <section className="main-section no-break">
                            <h2 className="main-heading">Profile</h2>
                            <p className="summary-text text-wrap" data-editable="summary"
                                style={{ lineHeight: sumSettings.lineHeight }}>
                                {data.summary}
                            </p>
                        </section>
                    )}

                    {data.experience && data.experience.length > 0 && (
                        <section className="main-section">
                            <h2 className="main-heading">Experience</h2>
                            {data.experience.map((exp: any, i: number) => (
                                <div key={i} className="exp-item no-break"
                                    style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                    <div className="exp-header">
                                        <div>
                                            <span className="exp-role" data-editable={`experience-${i}-role`}>{exp.role}</span>
                                            <span className="exp-company" data-editable={`experience-${i}-company`}>
                                                {exp.company}{exp.location ? ` · ${exp.location}` : ''}
                                            </span>
                                        </div>
                                        <span className="exp-date">{exp.startDate} – {exp.endDate}</span>
                                    </div>
                                    <div className="exp-desc text-wrap"
                                        style={{ lineHeight: expSettings.lineHeight }}>
                                        {splitDescription(exp.description).map((line: string, li: number) => (
                                            <div key={li} className="desc-bullet">▸ {line}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}

                    {data.projects && data.projects.length > 0 && (
                        <section className="main-section">
                            <h2 className="main-heading">Projects</h2>
                            {data.projects.map((proj: any, i: number) => (
                                <div key={i} className="exp-item no-break"
                                    style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                    <div className="exp-header">
                                        <span className="exp-role">{proj.name}</span>
                                        {proj.link && <a href={proj.link} className="proj-link">Link ↗</a>}
                                    </div>
                                    {proj.techStack && <div className="proj-stack">{proj.techStack}</div>}
                                    <div className="exp-desc text-wrap" style={{ lineHeight: expSettings.lineHeight }}>
                                        {splitDescription(proj.description).map((line: string, li: number) => (
                                            <div key={li} className="desc-bullet">▸ {line}</div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
};

export const CASCADE_STYLES = `
${BASE_STYLES}

.cascade-template {
    padding: 0;
    font-family: 'Inter', 'Segoe UI', sans-serif;
}

.cascade-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    min-height: 297mm;
}

/* ── Sidebar ── */
.sidebar {
    background: #4338CA;
    color: #fff;
    padding: 32px 20px;
}

.sb-name-block {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.2);
}

.sb-name {
    font-size: 18px;
    font-weight: 700;
    color: #fff;
    line-height: 1.3;
    margin-bottom: 6px;
    word-break: break-word;
}

.sb-title {
    font-size: 11px;
    color: rgba(255,255,255,0.75);
    font-weight: 400;
    line-height: 1.4;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.sb-section {
    margin-bottom: 20px;
}

.sb-heading {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: rgba(255,255,255,0.5);
    margin-bottom: 8px;
}

.sb-item {
    font-size: 10px;
    color: rgba(255,255,255,0.85);
    margin-bottom: 4px;
    word-break: break-all;
    line-height: 1.5;
}

.skill-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.skill-tag {
    background: rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.9);
    font-size: 9px;
    padding: 3px 7px;
    border-radius: 3px;
    font-weight: 500;
}

.sb-edu {
    margin-bottom: 10px;
}

.sb-edu-degree {
    font-size: 10px;
    font-weight: 600;
    color: #fff;
    line-height: 1.4;
}

.sb-edu-school {
    font-size: 10px;
    color: rgba(255,255,255,0.75);
    margin-top: 1px;
}

.sb-edu-date {
    font-size: 9px;
    color: rgba(255,255,255,0.5);
    margin-top: 1px;
}

/* ── Main content ── */
.main-col {
    padding: 32px 28px;
    background: #fff;
}

.main-section {
    margin-bottom: 22px;
}

.main-heading {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #4338CA;
    padding-bottom: 6px;
    border-bottom: 2px solid #4338CA;
    margin-bottom: 12px;
}

.summary-text {
    font-size: 11px;
    color: #374151;
    text-align: justify;
}

.exp-item {
    margin-bottom: 14px;
}

.exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 3px;
    gap: 8px;
}

.exp-role {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #111827;
}

.exp-company {
    display: block;
    font-size: 11px;
    color: #6B7280;
    margin-top: 1px;
}

.exp-date {
    font-size: 10px;
    color: #9CA3AF;
    white-space: nowrap;
    flex-shrink: 0;
}

.exp-desc {
    margin-top: 4px;
}

.desc-bullet {
    font-size: 11px;
    color: #374151;
    margin-bottom: 3px;
    padding-left: 4px;
}

.proj-stack {
    font-size: 10px;
    color: #4338CA;
    font-style: italic;
    margin-bottom: 4px;
    margin-top: 2px;
}

.proj-link {
    font-size: 10px;
    color: #4338CA;
    text-decoration: none;
}
`;

export function generateCascadeHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<CascadeTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${data.fullName} - Resume</title>
<style>${CASCADE_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
