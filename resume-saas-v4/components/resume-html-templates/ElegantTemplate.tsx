import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Elegant Template - Refined single-column design
 * Thin accent lines, soft teal, modern serif+sans pairing
 */
export const ElegantTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page elegant-template" style={getCssVariables(designSettings)}>
            {/* Elegant centered header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                <div className="accent-line"></div>
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
                    <h2 className="section-title">Profile</h2>
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
                    <h2 className="section-title">Projects</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div key={proj.id || index} className="project-item" data-section={`project-${index}`}>
                            <div className="proj-header">
                                <div>
                                    <div className="proj-name">{proj.name}</div>
                                    {proj.link && (
                                        <a href={proj.link} className="link" target="_blank" rel="noreferrer">Link</a>
                                    )}
                                </div>
                                {proj.techStack && (
                                    <div className="tech-stack">{proj.techStack}</div>
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

            {/* Education */}
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
                    <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="certifications">
                        <h2 className="section-title">Certifications</h2>
                        <div className="description text-wrap" style={{ fontSize: `${educationSettings.fontSize}px`, lineHeight: educationSettings.lineHeight }}>
                            {data.certifications.map((cert: string, index: number) => (
                                <p key={index} style={{ marginBottom: '3px' }}>• {cert}</p>
                            ))}
                        </div>
                    </section>
                )
            }

            {/* Skills */}
            {
                skills.length > 0 && (
                    <section className="section" style={{ marginBottom: `${skillsSettings.spacing}px` }} data-section="skills">
                        <h2 className="section-title">Skills</h2>
                        <div className="skills-grid">
                            {skills.map((skill: string, i: number) => (
                                <span key={i} className="skill-tag">{skill}</span>
                            ))}
                        </div>
                    </section>
                )
            }
        </div >
    );
};

export const ELEGANT_STYLES = `
${BASE_STYLES}

.elegant-template {
    font-family: 'Georgia', 'Times New Roman', serif;
    color: #2d3436;
    padding: 45px 50px;
}

.elegant-template .header {
    text-align: center;
    margin-bottom: 20px;
}

.elegant-template .name {
    font-size: 30px;
    font-weight: 400;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: #2d3436;
}

.elegant-template .accent-line {
    width: 60px;
    height: 2px;
    background: #00b894;
    margin: 10px auto;
}

.elegant-template .job-title {
    font-size: 16px;
    color: #636e72;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 300;
    margin-bottom: 10px;
}

.elegant-template .contact-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 13px;
    color: #636e72;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.elegant-template .contact-row a {
    color: #00b894;
    text-decoration: none;
}

.elegant-template .section-title {
    font-size: 15px;
    font-weight: 400;
    color: #2d3436;
    text-transform: uppercase;
    letter-spacing: 3px;
    padding-bottom: 6px;
    margin-bottom: 12px;
    border-bottom: 1px solid #dfe6e9;
}

.elegant-template .summary-text {
    color: #636e72;
    text-align: justify;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.7;
}

.elegant-template .experience-item {
    margin-bottom: 14px;
}

.elegant-template .project-item {
    margin-bottom: 14px;
}

.elegant-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.elegant-template .role {
    font-size: 15px;
    font-weight: 700;
    color: #2d3436;
}

.elegant-template .company {
    font-size: 14px;
    color: #00b894;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 500;
}

.elegant-template .date {
    font-size: 13px;
    color: #b2bec3;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    white-space: nowrap;
    font-style: italic;
}

.elegant-template .description {
    color: #636e72;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    text-align: justify;
}

.elegant-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.elegant-template .proj-name {
    font-size: 15px;
    font-weight: 700;
    color: #2d3436;
}

.elegant-template .tech-stack {
    font-size: 14px;
    color: #00b894;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 500;
}

.elegant-template .edu-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.elegant-template .education-item {
    margin-bottom: 10px;
}

.elegant-template .degree {
    font-size: 14px;
    font-weight: 700;
    color: #2d3436;
}

.elegant-template .school {
    font-size: 13px;
    color: #636e72;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-style: italic;
}

.elegant-template .skills-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.elegant-template .skill-tag {
    font-size: 13px;
    padding: 4px 12px;
    border: 1px solid #00b894;
    border-radius: 20px;
    color: #00b894;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 500;
}
`;

export function generateElegantHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<ElegantTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${ELEGANT_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
