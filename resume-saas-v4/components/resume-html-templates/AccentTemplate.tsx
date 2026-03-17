import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Accent Template - Clean design with colored left borders
 * Single-column with distinctive section accent borders
 */
export const AccentTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page accent-template" style={getCssVariables(designSettings)}>
            {/* Header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                <div className="contact-row">
                    {data.contact?.email && <span data-editable="email">✉ {data.contact.email}</span>}
                    {data.contact?.phone && <span data-editable="phone">☎ {data.contact.phone}</span>}
                    {data.contact?.location && <span data-editable="location">◎ {data.contact.location}</span>}
                    {data.contact?.linkedin && (
                        <a href={`https://${data.contact.linkedin}`} className="link" data-editable="linkedin">↗ LinkedIn</a>
                    )}
                </div>
            </header>

            {/* Summary */}
            {data.summary && (
                <section className="section accent-section accent-purple" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                    <h2 className="section-title">Profile</h2>
                    <p className="summary-text text-wrap" data-editable="summary"
                        style={{ lineHeight: summarySettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="section accent-section accent-blue" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                    <h2 className="section-title">Experience</h2>
                    {data.experience.map((exp, index) => (
                        <div key={exp.id || index} className="experience-item" data-section={`experience-${index}`}>
                            <div className="exp-header">
                                <div>
                                    <div className="role" data-editable={`experience-${index}-role`}>{exp.role}</div>
                                    <div className="company" data-editable={`experience-${index}-company`}>{exp.company}</div>
                                </div>
                                <div className="date" data-editable={`experience-${index}-date`}>
                                    {exp.startDate} — {exp.endDate || 'Present'}
                                </div>
                            </div>
                            <div className="description text-wrap" data-editable={`experience-${index}-description`}
                                style={{ lineHeight: experienceSettings.lineHeight }}>
                                {splitDescription(exp.description).map((line: string, i: number) => (
                                    <p key={i} style={{ marginBottom: '3px' }}>• {line}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <section className="section accent-section accent-blue" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="projects">
                    <h2 className="section-title">Projects</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div key={proj.id || index} className="project-item" data-section={`project-${index}`}>
                            <div className="proj-header">
                                <div>
                                    <div className="proj-name" data-editable={`project-${index}-name`}>{proj.name}</div>
                                    {proj.link && (
                                        <a href={proj.link} className="link" target="_blank" rel="noreferrer" style={{ fontSize: '10px' }}>Link</a>
                                    )}
                                </div>
                                {proj.techStack && (
                                    <div className="tech-stack" data-editable={`project-${index}-techStack`}>{proj.techStack}</div>
                                )}
                            </div>
                            <div className="description text-wrap" data-editable={`project-${index}-description`}
                                style={{ lineHeight: experienceSettings.lineHeight }}>
                                {splitDescription(proj.description).map((line: string, i: number) => (
                                    <p key={i} style={{ marginBottom: '3px' }}>• {line}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
                <section className="section accent-section accent-green" style={{ marginBottom: `${skillsSettings.spacing}px` }} data-section="skills">
                    <h2 className="section-title">Skills</h2>
                    <div className="skills-grid">
                        {skills.map((skill: string, i: number) => (
                            <span key={i} className="skill-tag">{skill}</span>
                        ))}
                    </div>
                </section>
            )}

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <section className="section" data-section="education">
                    <h2 className="section-title">Education</h2>
                    {data.education.map((edu, index) => (
                        <div key={edu.id || index} className="education-item no-break" data-section={`education-${index}`}>
                            <div className="edu-header">
                                <div className="degree" data-editable={`education-${index}-degree`}>{edu.degree}</div>
                                <div className="date" data-editable={`education-${index}-date`}>{edu.startDate} - {edu.endDate}</div>
                            </div>
                            <div className="school" data-editable={`education-${index}-school`}>{edu.school}</div>
                        </div>
                    ))}
                </section>
            )}

            {/* Certifications */}
            {
                data.certifications && data.certifications.length > 0 && (
                    <section className="section accent-section accent-green" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="certifications">
                        <h2 className="section-title">Certifications</h2>
                        <div className="skills-grid">
                            {data.certifications.map((cert: string, index: number) => (
                                <span key={index} className="skill-tag no-break">{cert}</span>
                            ))}
                        </div>
                    </section>
                )
            }
        </div >
    );
};

export const ACCENT_STYLES = `
${BASE_STYLES}

.accent-template {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #2d3748;
    padding: 40px 45px;
}

.accent-template .header {
    margin-bottom: 20px;
}

.accent-template .name {
    font-size: 28px;
    font-weight: 700;
    color: #1a202c;
    margin-bottom: 3px;
}

.accent-template .job-title {
    font-size: 16px;
    color: #718096;
    font-weight: 400;
    margin-bottom: 10px;
}

.accent-template .contact-row {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #718096;
}

.accent-template .contact-row a {
    color: #4299e1;
    text-decoration: none;
}

.accent-template .accent-section {
    padding-left: 16px;
    border-left: 4px solid transparent;
}

.accent-template .accent-purple { border-left-color: #805ad5; }
.accent-template .accent-blue { border-left-color: #4299e1; }
.accent-template .accent-green { border-left-color: #48bb78; }
.accent-template .accent-orange { border-left-color: #ed8936; }

.accent-template .section-title {
    font-size: 15px;
    font-weight: 700;
    color: #1a202c;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
}

.accent-template .summary-text {
    color: #4a5568;
    font-size: 14px;
    line-height: 1.6;
    text-align: justify;
}

.accent-template .experience-item {
    margin-bottom: 14px;
}

.accent-template .project-item {
    margin-bottom: 14px;
}

.accent-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.accent-template .role {
    font-size: 15px;
    font-weight: 700;
    color: #1a202c;
}

.accent-template .company {
    font-size: 14px;
    color: #4299e1;
    font-weight: 500;
}

.accent-template .date {
    font-size: 13px;
    color: #a0aec0;
    white-space: nowrap;
}

.accent-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.accent-template .proj-name {
    font-size: 15px;
    font-weight: 700;
    color: #1a202c;
}

.accent-template .tech-stack {
    font-size: 14px;
    color: #4299e1;
    font-weight: 500;
}

.accent-template .description {
    color: #4a5568;
    font-size: 14px;
}

.accent-template .skills-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.accent-template .skill-tag {
    font-size: 13px;
    padding: 4px 10px;
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    color: #2d3748;
    font-weight: 500;
}

.accent-template .edu-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.accent-template .education-item {
    margin-bottom: 10px;
}

.accent-template .degree {
    font-size: 14px;
    font-weight: 700;
    color: #1a202c;
}

.accent-template .school {
    font-size: 13px;
    color: #718096;
    font-style: italic;
}
`;

export function generateAccentHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<AccentTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${ACCENT_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
