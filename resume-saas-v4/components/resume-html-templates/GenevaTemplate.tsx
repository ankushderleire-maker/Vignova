import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// Swiss minimal professional — clean grid, soft grey accents, no fuss
export const GenevaTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page geneva-template" style={getCssVariables(designSettings)}>

            {/* Header: name left, contact right */}
            <header className="gen-header no-break">
                <div className="gen-name-block">
                    <h1 className="gen-name" data-editable="fullName">{data.fullName}</h1>
                    <span className="gen-divider-v" />
                    <p className="gen-title" data-editable="jobTitle">{data.jobTitle}</p>
                </div>
                <div className="gen-contact-block">
                    {data.contact?.email    && <span className="gen-ci">{data.contact.email}</span>}
                    {data.contact?.phone    && <span className="gen-ci">{data.contact.phone}</span>}
                    {data.contact?.location && <span className="gen-ci">{data.contact.location}</span>}
                    {data.contact?.linkedin && <span className="gen-ci">{data.contact.linkedin}</span>}
                    {data.contact?.website  && <span className="gen-ci">{data.contact.website}</span>}
                </div>
            </header>

            <div className="gen-hairline" />

            {/* Body: label column + content */}
            {data.summary && (
                <div className="gen-row no-break">
                    <div className="gen-label">Profile</div>
                    <div className="gen-content">
                        <p className="gen-body text-wrap" data-editable="summary"
                            style={{ lineHeight: sumSettings.lineHeight }}>
                            {data.summary}
                        </p>
                    </div>
                </div>
            )}

            {data.experience && data.experience.length > 0 && (
                <div className="gen-row">
                    <div className="gen-label">Experience</div>
                    <div className="gen-content">
                        {data.experience.map((exp: any, i: number) => (
                            <div key={i} className="gen-entry no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                                <div className="gen-entry-header">
                                    <div>
                                        <div className="gen-entry-role" data-editable={`experience-${i}-role`}>{exp.role}</div>
                                        <div className="gen-entry-org" data-editable={`experience-${i}-company`}>
                                            {exp.company}{exp.location ? `, ${exp.location}` : ''}
                                        </div>
                                    </div>
                                    <div className="gen-entry-date">{exp.startDate} – {exp.endDate}</div>
                                </div>
                                <div className="gen-bullets text-wrap"
                                    style={{ lineHeight: expSettings.lineHeight }}>
                                    {splitDescription(exp.description).map((line: string, li: number) => (
                                        <div key={li} className="gen-bullet">
                                            <span className="gen-dash">—</span> {line}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.education && data.education.length > 0 && (
                <div className="gen-row">
                    <div className="gen-label">Education</div>
                    <div className="gen-content">
                        {data.education.map((edu: any, i: number) => (
                            <div key={i} className="gen-entry no-break"
                                style={{ marginBottom: `${eduSettings.spacing / 2}px` }}>
                                <div className="gen-entry-header">
                                    <div>
                                        <div className="gen-entry-role" data-editable={`education-${i}-degree`}>
                                            {edu.degree}{edu.field ? `, ${edu.field}` : ''}
                                        </div>
                                        <div className="gen-entry-org" data-editable={`education-${i}-school`}>{edu.school}</div>
                                    </div>
                                    <div className="gen-entry-date">{edu.startDate} – {edu.endDate}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.projects && data.projects.length > 0 && (
                <div className="gen-row">
                    <div className="gen-label">Projects</div>
                    <div className="gen-content">
                        {data.projects.map((proj: any, i: number) => (
                            <div key={i} className="gen-entry no-break"
                                style={{ marginBottom: `${expSettings.spacing / 1.5}px` }}>
                                <div className="gen-entry-header">
                                    <div>
                                        <div className="gen-entry-role">
                                            {proj.name}
                                            {proj.link && <a href={proj.link} className="gen-link"> ↗</a>}
                                        </div>
                                        {proj.techStack && <div className="gen-entry-org">{proj.techStack}</div>}
                                    </div>
                                </div>
                                <div className="gen-bullets text-wrap">
                                    {splitDescription(proj.description).map((line: string, li: number) => (
                                        <div key={li} className="gen-bullet">
                                            <span className="gen-dash">—</span> {line}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {skills.length > 0 && (
                <div className="gen-row no-break">
                    <div className="gen-label">Skills</div>
                    <div className="gen-content">
                        <div className="gen-skill-row">
                            {skills.map((s: string, i: number) => (
                                <span key={i} className="gen-skill">{s}</span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {(data.certifications?.length || data.languages?.length) ? (
                <div className="gen-row no-break">
                    <div className="gen-label">Other</div>
                    <div className="gen-content">
                        {data.certifications && data.certifications.length > 0 && (
                            <div style={{ marginBottom: '6px' }}>
                                <span className="gen-other-label">Certifications: </span>
                                <span className="gen-body">{data.certifications.join(' · ')}</span>
                            </div>
                        )}
                        {data.languages && data.languages.length > 0 && (
                            <div>
                                <span className="gen-other-label">Languages: </span>
                                <span className="gen-body">{data.languages.join(' · ')}</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export const GENEVA_STYLES = `
${BASE_STYLES}

.geneva-template {
    font-family: 'Helvetica Neue', 'Arial', 'Helvetica', sans-serif;
    padding: 40px 44px;
    color: #1a1a1a;
    font-size: 11px;
}

/* Header */
.gen-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;
    margin-bottom: 12px;
}

.gen-name-block {
    display: flex;
    align-items: baseline;
    gap: 14px;
    flex-wrap: wrap;
}

.gen-name {
    font-size: 26px;
    font-weight: 300;
    color: #000;
    letter-spacing: -0.5px;
    line-height: 1.1;
}

.gen-divider-v {
    display: inline-block;
    width: 1px;
    height: 20px;
    background: #999;
    flex-shrink: 0;
}

.gen-title {
    font-size: 12px;
    color: #555;
    font-weight: 400;
    white-space: nowrap;
}

.gen-contact-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
}

.gen-ci {
    font-size: 10px;
    color: #666;
    display: block;
}

/* Hairline */
.gen-hairline {
    border: none;
    border-top: 1px solid #CCC;
    margin-bottom: 16px;
}

/* Row layout: label | content */
.gen-row {
    display: grid;
    grid-template-columns: 80px 1fr;
    gap: 16px;
    padding-bottom: 14px;
    margin-bottom: 0;
    border-bottom: 1px solid #EEEEEE;
}

.gen-row:last-of-type {
    border-bottom: none;
}

.gen-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #888;
    padding-top: 3px;
    text-align: right;
}

.gen-content {
    padding-top: 2px;
}

/* Entries */
.gen-entry {
    margin-bottom: 10px;
}

.gen-entry-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 3px;
}

.gen-entry-role {
    font-size: 12px;
    font-weight: 600;
    color: #111;
}

.gen-entry-org {
    font-size: 10.5px;
    color: #666;
    margin-top: 1px;
}

.gen-entry-date {
    font-size: 10px;
    color: #999;
    white-space: nowrap;
    flex-shrink: 0;
}

.gen-bullets {
    margin-top: 3px;
}

.gen-bullet {
    font-size: 11px;
    color: #333;
    margin-bottom: 2px;
    display: flex;
    gap: 5px;
}

.gen-dash {
    color: #AAA;
    flex-shrink: 0;
}

.gen-body {
    font-size: 11px;
    color: #333;
    text-align: justify;
}

.gen-link {
    font-size: 10px;
    color: #666;
    text-decoration: none;
}

/* Skills */
.gen-skill-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}

.gen-skill {
    font-size: 10px;
    color: #444;
    background: #F5F5F5;
    border: 1px solid #DDD;
    padding: 2px 8px;
    border-radius: 2px;
}

.gen-other-label {
    font-size: 10.5px;
    font-weight: 700;
    color: #444;
}
`;

export function generateGenevaHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<GenevaTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.fullName} - CV</title>
<style>${GENEVA_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
