import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// Timeline-style with amber accents — vertical line, year markers
export const ChronicleTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page chronicle-template" style={getCssVariables(designSettings)}>
            {/* Header */}
            <header className="chr-header no-break">
                <div className="chr-name-block">
                    <h1 className="chr-name" data-editable="fullName">{data.fullName}</h1>
                    <p className="chr-title" data-editable="jobTitle">{data.jobTitle}</p>
                </div>
                <div className="chr-contact-col">
                    {data.contact?.email && <div className="chr-contact">{data.contact.email}</div>}
                    {data.contact?.phone && <div className="chr-contact">{data.contact.phone}</div>}
                    {data.contact?.location && <div className="chr-contact">{data.contact.location}</div>}
                    {data.contact?.linkedin && <div className="chr-contact">{data.contact.linkedin}</div>}
                </div>
            </header>

            {/* Amber rule */}
            <div className="chr-rule" />

            {/* Summary */}
            {data.summary && (
                <section className="chr-plain-section no-break">
                    <div className="chr-plain-label">About</div>
                    <p className="chr-summary text-wrap" data-editable="summary"
                        style={{ lineHeight: sumSettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Experience — timeline */}
            {data.experience && data.experience.length > 0 && (
                <section className="chr-tl-section">
                    <div className="chr-plain-label">Experience</div>
                    <div className="chr-timeline">
                        {data.experience.map((exp: any, i: number) => (
                            <div key={i} className="chr-tl-item no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                {/* Dot + line */}
                                <div className="chr-tl-marker">
                                    <div className="chr-dot" />
                                    {i < data.experience.length - 1 && <div className="chr-line" />}
                                </div>
                                {/* Date gutter */}
                                <div className="chr-tl-date">
                                    <span>{exp.endDate}</span>
                                    <span className="chr-date-start">{exp.startDate}</span>
                                </div>
                                {/* Content */}
                                <div className="chr-tl-content">
                                    <div className="chr-entry-role" data-editable={`experience-${i}-role`}>{exp.role}</div>
                                    <div className="chr-entry-org" data-editable={`experience-${i}-company`}>
                                        {exp.company}{exp.location ? ` · ${exp.location}` : ''}
                                    </div>
                                    <div className="chr-bullets text-wrap" style={{ lineHeight: expSettings.lineHeight }}>
                                        {splitDescription(exp.description).map((line: string, li: number) => (
                                            <div key={li} className="chr-bullet">› {line}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Projects — timeline */}
            {data.projects && data.projects.length > 0 && (
                <section className="chr-tl-section">
                    <div className="chr-plain-label">Projects</div>
                    <div className="chr-timeline">
                        {data.projects.map((proj: any, i: number) => (
                            <div key={i} className="chr-tl-item no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                <div className="chr-tl-marker">
                                    <div className="chr-dot chr-dot-sm" />
                                    {i < data.projects.length - 1 && <div className="chr-line" />}
                                </div>
                                <div className="chr-tl-date" />
                                <div className="chr-tl-content">
                                    <div className="chr-entry-role">
                                        {proj.name}
                                        {proj.link && <a href={proj.link} className="chr-link"> ↗</a>}
                                    </div>
                                    {proj.techStack && <div className="chr-tech">{proj.techStack}</div>}
                                    <div className="chr-bullets text-wrap" style={{ lineHeight: expSettings.lineHeight }}>
                                        {splitDescription(proj.description).map((line: string, li: number) => (
                                            <div key={li} className="chr-bullet">› {line}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Bottom row */}
            <div className="chr-bottom-grid">
                {data.education && data.education.length > 0 && (
                    <section className="chr-plain-section">
                        <div className="chr-plain-label">Education</div>
                        {data.education.map((edu: any, i: number) => (
                            <div key={i} className="chr-edu no-break"
                                style={{ marginBottom: `${eduSettings.spacing / 2}px` }}>
                                <div className="chr-entry-role" data-editable={`education-${i}-degree`}>{edu.degree}</div>
                                <div className="chr-entry-org">{edu.field}</div>
                                <div className="chr-entry-org" data-editable={`education-${i}-school`}>{edu.school}</div>
                                <div className="chr-edu-date">{edu.startDate} – {edu.endDate}</div>
                            </div>
                        ))}
                    </section>
                )}

                <div>
                    {skills.length > 0 && (
                        <section className="chr-plain-section">
                            <div className="chr-plain-label">Skills</div>
                            <div className="chr-skill-wrap">
                                {skills.map((s: string, i: number) => (
                                    <span key={i} className="chr-skill">{s}</span>
                                ))}
                            </div>
                        </section>
                    )}
                    {data.certifications && data.certifications.length > 0 && (
                        <section className="chr-plain-section">
                            <div className="chr-plain-label">Certifications</div>
                            {data.certifications.map((c: string, i: number) => (
                                <div key={i} className="chr-bullet" style={{ fontSize: '10.5px' }}>› {c}</div>
                            ))}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export const CHRONICLE_STYLES = `
${BASE_STYLES}

.chronicle-template {
    font-family: 'Georgia', 'Times New Roman', serif;
    padding: 36px 40px;
    color: #1F2937;
}

/* Header */
.chr-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    margin-bottom: 14px;
}

.chr-name {
    font-size: 32px;
    font-weight: 700;
    color: #111827;
    letter-spacing: -0.5px;
    line-height: 1.1;
    margin-bottom: 4px;
}

.chr-title {
    font-size: 13px;
    color: #D97706;
    font-weight: 400;
    font-style: italic;
}

.chr-contact-col {
    text-align: right;
    flex-shrink: 0;
}

.chr-contact {
    font-size: 10.5px;
    color: #6B7280;
    margin-bottom: 2px;
    font-family: 'Inter', sans-serif;
}

/* Amber rule */
.chr-rule {
    height: 3px;
    background: linear-gradient(90deg, #F59E0B, #FBBF24, #FDE68A);
    margin-bottom: 18px;
    border-radius: 2px;
}

/* Section labels */
.chr-plain-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #D97706;
    margin-bottom: 8px;
    font-family: 'Inter', sans-serif;
}

.chr-plain-section {
    margin-bottom: 16px;
}

.chr-tl-section {
    margin-bottom: 14px;
}

/* Summary */
.chr-summary {
    font-size: 11.5px;
    color: #374151;
    text-align: justify;
    font-style: italic;
}

/* Timeline layout */
.chr-timeline {
    position: relative;
}

.chr-tl-item {
    display: grid;
    grid-template-columns: 14px 52px 1fr;
    gap: 0 10px;
    position: relative;
}

.chr-tl-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 3px;
}

.chr-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #F59E0B;
    border: 2px solid #FEF3C7;
    flex-shrink: 0;
    z-index: 1;
}

.chr-dot-sm {
    width: 8px;
    height: 8px;
    background: #FCD34D;
}

.chr-line {
    width: 2px;
    flex: 1;
    background: #FDE68A;
    margin-top: 2px;
}

.chr-tl-date {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    padding-top: 2px;
    gap: 0;
}

.chr-tl-date span {
    font-size: 10px;
    color: #6B7280;
    font-family: 'Inter', sans-serif;
    line-height: 1.5;
}

.chr-date-start {
    color: #9CA3AF !important;
    font-size: 9.5px !important;
}

.chr-tl-content {
    padding-bottom: 10px;
}

.chr-entry-role {
    font-size: 13px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 1px;
}

.chr-entry-org {
    font-size: 11px;
    color: #6B7280;
    font-style: italic;
    margin-bottom: 2px;
    font-family: 'Inter', sans-serif;
}

.chr-tech {
    font-size: 10px;
    color: #D97706;
    font-family: 'Inter', sans-serif;
    margin-bottom: 3px;
}

.chr-bullets {
    margin-top: 3px;
}

.chr-bullet {
    font-size: 11px;
    color: #374151;
    margin-bottom: 2px;
    padding-left: 2px;
    font-family: 'Inter', sans-serif;
}

.chr-link {
    font-size: 11px;
    color: #D97706;
    text-decoration: none;
}

.chr-bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.chr-edu {
    margin-bottom: 10px;
    font-family: 'Inter', sans-serif;
}

.chr-edu-date {
    font-size: 10px;
    color: #9CA3AF;
    margin-top: 2px;
}

.chr-skill-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    font-family: 'Inter', sans-serif;
}

.chr-skill {
    background: #FFFBEB;
    border: 1px solid #FDE68A;
    color: #92400E;
    font-size: 10px;
    font-weight: 500;
    padding: 3px 9px;
    border-radius: 3px;
}
`;

export function generateChronicleHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<ChronicleTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.fullName} - Resume</title>
<style>${CHRONICLE_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
