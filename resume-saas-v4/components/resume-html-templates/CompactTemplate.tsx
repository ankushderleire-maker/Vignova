import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Compact Template - Dense information layout
 * Maximizes content per page with smaller fonts and tight spacing
 */
export const CompactTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page compact-template" style={getCssVariables(designSettings)}>
            {/* Compact header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <div className="header-top">
                    <div>
                        <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                        <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                    </div>
                    <div className="contact-col">
                        {data.contact?.email && <span data-editable="email">{data.contact.email}</span>}
                        {data.contact?.phone && <span data-editable="phone">{data.contact.phone}</span>}
                        {data.contact?.location && <span data-editable="location">{data.contact.location}</span>}
                        {data.contact?.linkedin && (
                            <a href={`https://${data.contact.linkedin}`} className="link" data-editable="linkedin">LinkedIn</a>
                        )}
                    </div>
                </div>
            </header>

            {/* Summary */}
            {data.summary && (
                <section className="section" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                    <h2 className="section-title">Summary</h2>
                    <p className="summary-text text-wrap" data-editable="summary"
                        style={{ lineHeight: summarySettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Skills inline */}
            {skills.length > 0 && (
                <section className="section" style={{ marginBottom: `${skillsSettings.spacing}px` }} data-section="skills">
                    <h2 className="section-title">Technical Skills</h2>
                    <div className="skills-inline">
                        {skills.map((skill: string, i: number) => (
                            <React.Fragment key={i}>
                                <span className="skill-item">{skill}</span>
                                {i < skills.length - 1 && <span className="skill-sep">•</span>}
                            </React.Fragment>
                        ))}
                    </div>
                </section>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="projects">
                    <h2 className="section-title">Projects</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div key={proj.id || index} className="project-item" data-section={`project-${index}`}>
                            <div className="proj-header">
                                <span className="proj-name" data-editable={`project-${index}-name`}>{proj.name}</span>
                                <span className="spacer"></span>
                                {proj.techStack && (
                                    <span className="tech-stack" data-editable={`project-${index}-techStack`}>{proj.techStack}</span>
                                )}
                                {proj.link && (
                                    <a href={proj.link} className="link" target="_blank" rel="noreferrer" style={{ marginLeft: '6px', fontSize: '8px' }}>Link</a>
                                )}
                            </div>
                            <div className="description text-wrap" data-editable={`project-${index}-description`}
                                style={{ lineHeight: experienceSettings.lineHeight }}>
                                {splitDescription(proj.description).map((line: string, i: number) => (
                                    <p key={i} style={{ marginBottom: '2px' }}>• {line}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                    <h2 className="section-title">Professional Experience</h2>
                    {data.experience.map((exp, index) => (
                        <div key={exp.id || index} className="experience-item" data-section={`experience-${index}`}>
                            <div className="exp-header">
                                <span className="role" data-editable={`experience-${index}-role`}>{exp.role}</span>
                                <span className="spacer"></span>
                                <span className="company" data-editable={`experience-${index}-company`}>{exp.company}</span>
                                <span className="date" data-editable={`experience-${index}-date`}>
                                    {exp.startDate} - {exp.endDate || 'Present'}
                                </span>
                            </div>
                            <div className="description text-wrap" data-editable={`experience-${index}-description`}
                                style={{ lineHeight: experienceSettings.lineHeight }}>
                                {splitDescription(exp.description).map((line: string, i: number) => (
                                    <p key={i} style={{ marginBottom: '2px' }}>• {line}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="education">
                    <h2 className="section-title">Education</h2>
                    {data.education.map((edu, index) => (
                        <div key={edu.id || index} className="education-item no-break" data-section={`education-${index}`}>
                            <span className="degree" data-editable={`education-${index}-degree`}>{edu.degree}</span>
                            <span className="sep"> | </span>
                            <span className="school" data-editable={`education-${index}-school`}>{edu.school}</span>
                            <span className="sep"> | </span>
                            <span className="date" data-editable={`education-${index}-date`}>{edu.startDate} - {edu.endDate}</span>
                        </div>
                    ))}
                </section>
            )}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
                <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="certifications">
                    <h2 className="section-title">Certifications</h2>
                    <div className="skills-row flex-wrap" style={{ flexDirection: 'column', gap: '2px' }}>
                        {data.certifications.map((cert: string, index: number) => (
                            <div key={index} className="cert-item no-break" style={{ fontSize: `${educationSettings.fontSize}px` }}>
                                • {cert}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export const COMPACT_STYLES = `
${BASE_STYLES}

.compact-template {
    font-family: 'Arial', 'Helvetica', sans-serif;
    color: #222;
    padding: 25px 30px;
    font-size: 13px;
}

.compact-template .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 8px;
    border-bottom: 2px solid #2563eb;
}

.compact-template .name {
    font-size: 28px;
    font-weight: 700;
    color: #1e3a5f;
    margin-bottom: 2px;
}

.compact-template .job-title {
    font-size: 14px;
    color: #2563eb;
    font-weight: 600;
}

.compact-template .contact-col {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    font-size: 13px;
    color: #555;
}

.compact-template .contact-col a {
    color: #2563eb;
    text-decoration: none;
}

.compact-template .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #1e3a5f;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 5px;
    padding-bottom: 3px;
    border-bottom: 1px solid #dbeafe;
}

.compact-template .summary-text {
    color: #444;
    font-size: 14px;
    line-height: 1.5;
}

.compact-template .skills-inline {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    align-items: center;
}

.compact-template .skill-item {
    font-size: 13px;
    color: #333;
    font-weight: 500;
}

.compact-template .skill-sep {
    color: #2563eb;
    font-size: 6px;
    margin: 0 3px;
}

.compact-template .experience-item {
    margin-bottom: 8px;
}

.compact-template .project-item {
    margin-bottom: 8px;
}

.compact-template .exp-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 2px;
}

.compact-template .role {
    font-size: 14px;
    font-weight: 700;
    color: #1e3a5f;
}

.compact-template .spacer {
    flex: 0;
}

.compact-template .company {
    font-size: 13px;
    color: #2563eb;
    font-weight: 600;
    margin-right: auto;
}

.compact-template .proj-header {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 2px;
}

.compact-template .proj-name {
    font-size: 14px;
    font-weight: 700;
    color: #1e3a5f;
}

.compact-template .tech-stack {
    font-size: 13px;
    color: #2563eb;
    font-weight: 600;
    margin-right: auto;
}

.compact-template .date {
    font-size: 13px;
    color: #888;
    white-space: nowrap;
}

.compact-template .description {
    color: #444;
    font-size: 14px;
    line-height: 1.4;
}

.compact-template .education-item {
    margin-bottom: 4px;
    font-size: 13px;
}

.compact-template .degree {
    font-weight: 700;
    color: #1e3a5f;
}

.compact-template .school {
    color: #555;
}

.compact-template .sep {
    color: #ccc;
}
`;

export function generateCompactHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<CompactTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${COMPACT_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
