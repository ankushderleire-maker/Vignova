import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Luxe Template - Premium black & gold design
 * Single-column with luxurious typography and gold details
 */
export const LuxeTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page luxe-template" style={getCssVariables(designSettings)}>
            {/* Luxe header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <div className="header-block">
                    <div className="gold-bar top"></div>
                    <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                    <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                    <div className="gold-bar bottom"></div>
                </div>
                <div className="contact-row">
                    {data.contact?.email && <span data-editable="email">{data.contact.email}</span>}
                    <span className="separator">◆</span>
                    {data.contact?.phone && <span data-editable="phone">{data.contact.phone}</span>}
                    <span className="separator">◆</span>
                    {data.contact?.location && <span data-editable="location">{data.contact.location}</span>}
                    {data.contact?.linkedin && (
                        <>
                            <span className="separator">◆</span>
                            <a href={`https://${data.contact.linkedin}`} className="link" data-editable="linkedin">LinkedIn</a>
                        </>
                    )}
                </div>
            </header>

            {/* Summary */}
            {data.summary && (
                <section className="section" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                    <h2 className="section-title"><span className="title-accent">◈</span> Executive Summary</h2>
                    <p className="summary-text text-wrap" data-editable="summary"
                        style={{ lineHeight: summarySettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                    <h2 className="section-title"><span className="title-accent">◈</span> Professional Experience</h2>
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
                    <h2 className="section-title"><span className="title-accent">◈</span> Notable Projects</h2>
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
                    <h2 className="section-title"><span className="title-accent">◈</span> Areas of Expertise</h2>
                    <div className="skills-grid">
                        {skills.map((skill: string, i: number) => (
                            <span key={i} className="skill-pill">{skill}</span>
                        ))}
                    </div>
                </section>
            )}

            {data.education.map((edu, index) => (
                <div key={edu.id || index} className="education-item no-break" data-section={`education-${index}`}>
                    <div className="edu-header">
                        <div className="degree" data-editable={`education-${index}-degree`}>{edu.degree}</div>
                        <div className="date" data-editable={`education-${index}-date`}>{edu.startDate} - {edu.endDate}</div>
                    </div>
                    <div className="school" data-editable={`education-${index}-school`}>{edu.school}</div>
                </div>
            ))}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
                <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="certifications">
                    <h2 className="section-title"><span className="title-accent">◈</span> Certifications</h2>
                    <div className="skills-grid">
                        {data.certifications.map((cert: string, index: number) => (
                            <span key={index} className="skill-pill no-break">{cert}</span>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export const LUXE_STYLES = `
${BASE_STYLES}

.luxe-template {
    font-family: 'Didot', 'Georgia', 'Times New Roman', serif;
    color: #111111;
    padding: 40px 45px;
}

.luxe-template .header {
    text-align: center;
    margin-bottom: 22px;
}

.luxe-template .header-block {
    padding: 20px 0 15px;
    margin-bottom: 12px;
}

.luxe-template .gold-bar {
    height: 2px;
    background: linear-gradient(90deg, transparent, #c9a84c, transparent);
}

.luxe-template .gold-bar.top { margin-bottom: 15px; }
.luxe-template .gold-bar.bottom { margin-top: 12px; }

.luxe-template .name {
    font-size: 34px;
    font-weight: 400;
    letter-spacing: 6px;
    text-transform: uppercase;
    color: #111111;
}

.luxe-template .job-title {
    font-size: 15px;
    color: #c9a84c;
    letter-spacing: 4px;
    text-transform: uppercase;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 400;
    margin-top: 6px;
}

.luxe-template .contact-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 13px;
    color: #666666;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.luxe-template .separator {
    color: #c9a84c;
    font-size: 6px;
}

.luxe-template .contact-row a {
    color: #c9a84c;
    text-decoration: none;
}

.luxe-template .section-title {
    font-size: 15px;
    font-weight: 400;
    color: #111111;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e5e5;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.luxe-template .title-accent {
    color: #c9a84c;
    font-size: 14px;
}

.luxe-template .summary-text {
    color: #444444;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.7;
    text-align: justify;
}

.luxe-template .experience-item {
    margin-bottom: 15px;
}

.luxe-template .project-item {
    margin-bottom: 15px;
}

.luxe-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.luxe-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.luxe-template .proj-name {
    font-size: 14px;
    font-weight: 700;
    color: #111111;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    text-transform: uppercase;
    letter-spacing: 1px;
}

.luxe-template .tech-stack {
    font-size: 13px;
    color: #c9a84c;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 500;
}

.luxe-template .role {
    font-size: 15px;
    font-weight: 700;
    color: #111111;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.luxe-template .company {
    font-size: 14px;
    color: #c9a84c;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 500;
}

.luxe-template .date {
    font-size: 13px;
    color: #999999;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    white-space: nowrap;
    font-style: italic;
}

.luxe-template .description {
    color: #444444;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    text-align: justify;
}

.luxe-template .skills-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.luxe-template .skill-pill {
    font-size: 13px;
    padding: 4px 14px;
    background: #111111;
    color: #c9a84c;
    border-radius: 2px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 500;
    letter-spacing: 0.5px;
}

.luxe-template .edu-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.luxe-template .education-item {
    margin-bottom: 10px;
}

.luxe-template .degree {
    font-size: 14px;
    font-weight: 700;
    color: #111111;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.luxe-template .school {
    font-size: 13px;
    color: #666666;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-style: italic;
}
`;

export function generateLuxeHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<LuxeTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${LUXE_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
