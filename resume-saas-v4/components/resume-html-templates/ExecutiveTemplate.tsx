import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Executive Template - Corporate sophistication with dark navy header and gold accents
 * Two-column layout: main content left, sidebar right
 */
export const ExecutiveTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page executive-template" style={getCssVariables(designSettings)}>
            {/* Full-width header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <div className="header-bar">
                    <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                    <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                </div>
                <div className="contact-strip">
                    {data.contact?.email && <span data-editable="email">{data.contact.email}</span>}
                    {data.contact?.phone && <span data-editable="phone">{data.contact.phone}</span>}
                    {data.contact?.location && <span data-editable="location">{data.contact.location}</span>}
                    {data.contact?.linkedin && (
                        <a href={`https://${data.contact.linkedin}`} className="link" data-editable="linkedin">LinkedIn</a>
                    )}
                </div>
            </header>

            <div className="layout-grid">
                {/* Main Content */}
                <main className="main-content">
                    {/* Summary */}
                    {data.summary && (
                        <section className="section" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                            <h2 className="section-title">Professional Summary</h2>
                            <p className="summary-text text-wrap" data-editable="summary"
                                style={{ lineHeight: summarySettings.lineHeight }}>
                                {data.summary}
                            </p>
                        </section>
                    )}

                    {/* Experience */}
                    {data.experience && data.experience.length > 0 && (
                        <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                            <h2 className="section-title">Professional Experience</h2>
                            {data.experience.map((exp, index) => (
                                <div key={exp.id || index} className="experience-item" data-section={`experience-${index}`}>
                                    <div className="exp-header">
                                        <div>
                                            <div className="role" data-editable={`experience-${index}-role`}>{exp.role}</div>
                                            <div className="company" data-editable={`experience-${index}-company`}>{exp.company}</div>
                                        </div>
                                        <div className="date" data-editable={`experience-${index}-date`}>
                                            {exp.startDate} - {exp.endDate || 'Present'}
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
                            <h2 className="section-title">Key Projects</h2>
                            {data.projects.map((proj: any, index: number) => (
                                <div key={proj.id || index} className="project-item" data-section={`project-${index}`}>
                                    <div className="proj-header">
                                        <div>
                                            <div className="proj-name" data-editable={`project-${index}-name`}>{proj.name}</div>
                                            {proj.link && (
                                                <a href={proj.link} className="link" target="_blank" rel="noreferrer" style={{ fontSize: '10px' }}>Link</a>
                                            )}
                                        </div>
                                    </div>
                                    {proj.techStack && (
                                        <div className="tech-stack" data-editable={`project-${index}-techStack`}>{proj.techStack}</div>
                                    )}
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
                </main>

                {/* Sidebar */}
                <aside className="sidebar">
                    {/* Skills */}
                    {skills.length > 0 && (
                        <section className="section sidebar-section" style={{ marginBottom: `${skillsSettings.spacing}px` }} data-section="skills">
                            <h2 className="sidebar-title">Core Skills</h2>
                            <div className="skills-list">
                                {skills.map((skill: string, i: number) => (
                                    <div key={i} className="skill-item">{skill}</div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Education */}
                    {data.education && data.education.length > 0 && (
                        <section className="section sidebar-section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="education">
                            <h2 className="sidebar-title">Education</h2>
                            {data.education.map((edu, index) => (
                                <div key={edu.id || index} className="education-item no-break" data-section={`education-${index}`}>
                                    <div className="degree" data-editable={`education-${index}-degree`}>{edu.degree}</div>
                                    <div className="school" data-editable={`education-${index}-school`}>{edu.school}</div>
                                    <div className="date" data-editable={`education-${index}-date`}>{edu.startDate} - {edu.endDate}</div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Certifications */}
                    {data.certifications && data.certifications.length > 0 && (
                        <section className="section sidebar-section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="certifications">
                            <h2 className="sidebar-title">Certifications</h2>
                            <div className="skills-list">
                                {data.certifications.map((cert: string, i: number) => (
                                    <div key={i} className="skill-item no-break">{cert}</div>
                                ))}
                            </div>
                        </section>
                    )}
                </aside>
            </div>
        </div >
    );
};

export const EXECUTIVE_STYLES = `
${BASE_STYLES}

.executive-template {
    font-family: 'Georgia', 'Times New Roman', serif;
    color: #1a1a2e;
    padding: 0;
}

.executive-template .header-bar {
    background: #1e293b;
    color: white;
    padding: 28px 40px 20px;
    margin-bottom: 0;
}

.executive-template .name {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: white;
    margin-bottom: 4px;
}

.executive-template .job-title {
    font-size: 16px;
    color: #d4a853;
    font-weight: 400;
    letter-spacing: 3px;
    text-transform: uppercase;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.executive-template .contact-strip {
    background: #d4a853;
    padding: 8px 40px;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #1e293b;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-weight: 600;
}

.executive-template .contact-strip a {
    color: #1e293b;
    text-decoration: none;
}

.executive-template .layout-grid {
    display: grid;
    grid-template-columns: 1fr 200px;
    gap: 0;
    padding: 25px 0 30px;
}

.executive-template .main-content {
    padding: 0 25px 0 40px;
    border-right: 1px solid #e2e8f0;
}

.executive-template .sidebar {
    padding: 0 40px 0 20px;
}

.executive-template .section-title {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    border-bottom: 2px solid #d4a853;
    padding-bottom: 6px;
    margin-bottom: 12px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.executive-template .sidebar-title {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-bottom: 2px solid #d4a853;
    padding-bottom: 5px;
    margin-bottom: 10px;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.executive-template .summary-text {
    font-size: 14px;
    color: #334155;
    text-align: justify;
    line-height: 1.6;
}

.executive-template .experience-item {
    margin-bottom: 14px;
}

.executive-template .project-item {
    margin-bottom: 14px;
}

.executive-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.executive-template .role {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
}

.executive-template .company {
    font-size: 14px;
    color: #d4a853;
    font-weight: 600;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.executive-template .date {
    font-size: 13px;
    color: #64748b;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    white-space: nowrap;
}

.executive-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2px;
}

.executive-template .proj-name {
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
}

.executive-template .tech-stack {
    font-size: 14px;
    color: #d4a853;
    font-weight: 600;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    margin-bottom: 4px;
}

.executive-template .description {
    color: #334155;
    font-family: 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
}

.executive-template .skill-item {
    font-size: 13px;
    padding: 4px 0;
    border-bottom: 1px dotted #e2e8f0;
    color: #334155;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.executive-template .skill-item:last-child {
    border-bottom: none;
}

.executive-template .education-item {
    margin-bottom: 10px;
}

.executive-template .degree {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
}

.executive-template .school {
    font-size: 13px;
    color: #64748b;
    font-family: 'Helvetica Neue', Arial, sans-serif;
}

.executive-template .education-item .date {
    font-size: 13px;
    color: #d4a853;
    font-weight: 600;
}
`;

export function generateExecutiveHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<ExecutiveTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${EXECUTIVE_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
