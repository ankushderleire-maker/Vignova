import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Nordic Template - Scandinavian clean design
 * Generous whitespace, muted blue-grey palette, minimal decoration
 */
export const NordicTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page nordic-template" style={getCssVariables(designSettings)}>
            {/* Clean header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                <div className="contact-row">
                    {data.contact?.email && <span data-editable="email">{data.contact.email}</span>}
                    {data.contact?.phone && <span data-editable="phone">{data.contact.phone}</span>}
                    {data.contact?.location && <span data-editable="location">{data.contact.location}</span>}
                    {data.contact?.linkedin && (
                        <a href={`https://${data.contact.linkedin}`} className="link" data-editable="linkedin">LinkedIn</a>
                    )}
                </div>
            </header>

            {/* Summary */}
            {data.summary && (
                <section className="section" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                    <h2 className="section-title">About</h2>
                    <p className="summary-text text-wrap" data-editable="summary"
                        style={{ lineHeight: summarySettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                    <h2 className="section-title">Experience</h2>
                    {data.experience.map((exp, index) => (
                        <div key={exp.id || index} className="experience-item" data-section={`experience-${index}`}>
                            <div className="exp-meta">
                                <span className="date" data-editable={`experience-${index}-date`}>
                                    {exp.startDate} — {exp.endDate || 'Present'}
                                </span>
                            </div>
                            <div className="exp-content">
                                <div className="role" data-editable={`experience-${index}-role`}>{exp.role}</div>
                                <div className="company" data-editable={`experience-${index}-company`}>{exp.company}</div>
                                <div className="description text-wrap" data-editable={`experience-${index}-description`}
                                    style={{ lineHeight: experienceSettings.lineHeight }}>
                                    {splitDescription(exp.description).map((line: string, i: number) => (
                                        <p key={i} style={{ marginBottom: '3px' }}>• {line}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="projects">
                    <h2 className="section-title">Projects</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div key={proj.id || index} className="project-item" data-section={`project-${index}`}>
                            <div className="exp-meta">
                                {proj.link && (
                                    <a href={proj.link} className="date" style={{ color: '#5b8a9a', textDecoration: 'none' }} target="_blank" rel="noreferrer">
                                        View Project ↗
                                    </a>
                                )}
                            </div>
                            <div className="exp-content">
                                <div className="role" data-editable={`project-${index}-name`}>{proj.name}</div>
                                {proj.techStack && (
                                    <div className="company" data-editable={`project-${index}-techStack`}>{proj.techStack}</div>
                                )}
                                <div className="description text-wrap" data-editable={`project-${index}-description`}
                                    style={{ lineHeight: experienceSettings.lineHeight }}>
                                    {splitDescription(proj.description).map((line: string, i: number) => (
                                        <p key={i} style={{ marginBottom: '3px' }}>• {line}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
                <section className="section" style={{ marginBottom: `${skillsSettings.spacing}px` }} data-section="skills">
                    <h2 className="section-title">Skills</h2>
                    <div className="skills-flow">
                        {skills.map((skill: string, i: number) => (
                            <span key={i} className="skill-chip">{skill}</span>
                        ))}
                    </div>
                </section>
            )}

            {data.education.map((edu, index) => (
                <div key={edu.id || index} className="education-item no-break" data-section={`education-${index}`}>
                    <div className="exp-meta">
                        <span className="date" data-editable={`education-${index}-date`}>{edu.startDate} - {edu.endDate}</span>
                    </div>
                    <div className="exp-content">
                        <div className="degree" data-editable={`education-${index}-degree`}>{edu.degree}</div>
                        <div className="school" data-editable={`education-${index}-school`}>{edu.school}</div>
                    </div>
                </div>
            ))}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
                <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="certifications">
                    <h2 className="section-title">Certifications</h2>
                    <div className="skills-flow">
                        {data.certifications.map((cert: string, i: number) => (
                            <span key={i} className="skill-chip no-break">{cert}</span>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export const NORDIC_STYLES = `
${BASE_STYLES}

.nordic-template {
    font-family: 'Helvetica Neue', 'Inter', Arial, sans-serif;
    color: #2c3e50;
    padding: 50px 55px;
    background: #fafbfc;
}

.nordic-template .header {
    margin-bottom: 25px;
}

.nordic-template .name {
    font-size: 32px;
    font-weight: 200;
    letter-spacing: 3px;
    color: #2c3e50;
    text-transform: uppercase;
}

.nordic-template .job-title {
    font-size: 15px;
    color: #7f8c8d;
    font-weight: 300;
    letter-spacing: 2px;
    margin-bottom: 12px;
}

.nordic-template .contact-row {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #95a5a6;
    font-weight: 400;
}

.nordic-template .contact-row a {
    color: #5b8a9a;
    text-decoration: none;
}

.nordic-template .section-title {
    font-size: 14px;
    font-weight: 600;
    color: #5b8a9a;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin-bottom: 14px;
}

.nordic-template .summary-text {
    color: #7f8c8d;
    font-size: 14px;
    line-height: 1.7;
    font-weight: 300;
}

.nordic-template .experience-item,
.nordic-template .education-item {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 15px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ecf0f1;
}

.nordic-template .experience-item:last-child,
.nordic-template .education-item:last-child {
    border-bottom: none;
}

.nordic-template .project-item {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 15px;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #ecf0f1;
}

.nordic-template .project-item:last-child {
    border-bottom: none;
}

.nordic-template .exp-meta {
    text-align: right;
    padding-top: 2px;
}

.nordic-template .date {
    font-size: 13px;
    color: #95a5a6;
    font-weight: 400;
    line-height: 1.5;
}

.nordic-template .role {
    font-size: 15px;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 2px;
}

.nordic-template .company {
    font-size: 14px;
    color: #5b8a9a;
    font-weight: 400;
    margin-bottom: 6px;
}

.nordic-template .description {
    color: #7f8c8d;
    font-size: 14px;
    font-weight: 300;
}

.nordic-template .degree {
    font-size: 14px;
    font-weight: 600;
    color: #2c3e50;
}

.nordic-template .school {
    font-size: 13px;
    color: #95a5a6;
    font-weight: 300;
}

.nordic-template .skills-flow {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.nordic-template .skill-chip {
    font-size: 13px;
    padding: 5px 14px;
    background: white;
    border: 1px solid #dce6ea;
    border-radius: 3px;
    color: #5b8a9a;
    font-weight: 500;
}
`;

export function generateNordicHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<NordicTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${NORDIC_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
