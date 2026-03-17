import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Bold Template - Strong typography, striking design
 * Oversized name, coral/red accents, impactful single-column
 */
export const BoldTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page bold-template" style={getCssVariables(designSettings)}>
            {/* Bold header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                <div className="title-bar">
                    <span className="job-title" data-editable="jobTitle">{data.jobTitle}</span>
                </div>
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
                    <h2 className="section-title">ABOUT</h2>
                    <p className="summary-text text-wrap" data-editable="summary"
                        style={{ lineHeight: summarySettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                    <h2 className="section-title">EXPERIENCE</h2>
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
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="projects">
                    <h2 className="section-title">PROJECTS</h2>
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
                <section className="section" style={{ marginBottom: `${skillsSettings.spacing}px` }} data-section="skills">
                    <h2 className="section-title">SKILLS</h2>
                    <div className="skills-grid">
                        {skills.map((skill: string, i: number) => (
                            <span key={i} className="skill-block">{skill}</span>
                        ))}
                    </div>
                </section>
            )}

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <section className="section" data-section="education">
                    <h2 className="section-title">EDUCATION</h2>
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
                    <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="certifications">
                        <h2 className="section-title">CERTIFICATIONS</h2>
                        <div className="skills-grid">
                            {data.certifications.map((cert: string, index: number) => (
                                <span key={index} className="skill-block no-break">{cert}</span>
                            ))}
                        </div>
                    </section>
                )
            }
        </div >
    );
};

export const BOLD_STYLES = `
${BASE_STYLES}

.bold-template {
    font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a;
    padding: 35px 45px;
}

.bold-template .header {
    margin-bottom: 20px;
}

.bold-template .name {
    font-size: 40px;
    font-weight: 900;
    letter-spacing: -1px;
    color: #1a1a1a;
    line-height: 1;
    margin-bottom: 6px;
}

.bold-template .title-bar {
    background: #e74c3c;
    display: inline-block;
    padding: 4px 16px;
    margin-bottom: 12px;
}

.bold-template .job-title {
    font-size: 16px;
    color: white;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.bold-template .contact-row {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #777;
    font-weight: 500;
}

.bold-template .contact-row a {
    color: #e74c3c;
    text-decoration: none;
    font-weight: 600;
}

.bold-template .section-title {
    font-size: 16px;
    font-weight: 900;
    color: #1a1a1a;
    letter-spacing: 2px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 3px solid #e74c3c;
    display: inline-block;
}

.bold-template .section {
    margin-bottom: 6px;
}

.bold-template .summary-text {
    color: #555;
    font-size: 14px;
    line-height: 1.7;
    font-weight: 400;
}

.bold-template .experience-item {
    margin-bottom: 14px;
}

.bold-template .project-item {
    margin-bottom: 14px;
}

.bold-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.bold-template .role {
    font-size: 15px;
    font-weight: 800;
    color: #1a1a1a;
}

.bold-template .company {
    font-size: 14px;
    color: #e74c3c;
    font-weight: 600;
}

.bold-template .date {
    font-size: 13px;
    color: #999;
    font-weight: 500;
    white-space: nowrap;
}

.bold-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2px;
}

.bold-template .proj-name {
    font-size: 15px;
    font-weight: 800;
    color: #1a1a1a;
}

.bold-template .tech-stack {
    font-size: 14px;
    color: #e74c3c;
    font-weight: 600;
}

.bold-template .description {
    color: #555;
    font-size: 14px;
}

.bold-template .skills-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.bold-template .skill-block {
    font-size: 13px;
    padding: 5px 12px;
    background: #fef2f2;
    border: 2px solid #e74c3c;
    color: #e74c3c;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.bold-template .edu-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.bold-template .education-item {
    margin-bottom: 10px;
}

.bold-template .degree {
    font-size: 15px;
    font-weight: 800;
    color: #1a1a1a;
}

.bold-template .school {
    font-size: 13px;
    color: #777;
    font-weight: 500;
}
`;

export function generateBoldHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<BoldTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${BOLD_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
