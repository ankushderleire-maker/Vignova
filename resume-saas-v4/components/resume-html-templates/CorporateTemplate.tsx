import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Corporate Template - Traditional corporate layout
 * Dark sidebar left, classic blue-grey palette
 */
export const CorporateTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page corporate-template" style={getCssVariables(designSettings)}>
            <div className="layout-grid">
                {/* Sidebar */}
                <aside className="sidebar">
                    <div className="sidebar-header">
                        <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                        <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                    </div>

                    {/* Contact */}
                    <div className="sidebar-section">
                        <h3 className="sidebar-title">Contact</h3>
                        <div className="contact-list">
                            {data.contact?.email && <div className="contact-item" data-editable="email">✉ {data.contact.email}</div>}
                            {data.contact?.phone && <div className="contact-item" data-editable="phone">✆ {data.contact.phone}</div>}
                            {data.contact?.location && <div className="contact-item" data-editable="location">◈ {data.contact.location}</div>}
                            {data.contact?.linkedin && (
                                <a href={`https://${data.contact.linkedin}`} className="contact-item link" data-editable="linkedin">⊹ LinkedIn</a>
                            )}
                        </div>
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                        <div className="sidebar-section">
                            <h3 className="sidebar-title">Expertise</h3>
                            <div className="skills-list">
                                {skills.map((skill: string, i: number) => (
                                    <div key={i} className="skill-item">{skill}</div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Education */}
                    {data.education.map((edu, index) => (
                        <div className="sidebar-section" key={edu.id || index}>
                            <h3 className="sidebar-title">Education</h3>
                            <div className="education-item no-break" data-section={`education-${index}`}>
                                <div className="degree" data-editable={`education-${index}-degree`}>{edu.degree}</div>
                                <div className="school" data-editable={`education-${index}-school`}>{edu.school}</div>
                                <div className="date" data-editable={`education-${index}-date`}>{edu.startDate} - {edu.endDate}</div>
                            </div>
                        </div>
                    ))}

                    {/* Certifications */}
                    {data.certifications && data.certifications.length > 0 && (
                        <div className="sidebar-section">
                            <h3 className="sidebar-title">Certifications</h3>
                            <div className="skills-list">
                                {data.certifications.map((cert: string, i: number) => (
                                    <div key={i} className="skill-item no-break">{cert}</div>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>

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
                            <h2 className="section-title">Work Experience</h2>
                            {data.experience.map((exp, index) => (
                                <div key={exp.id || index} className="experience-item" data-section={`experience-${index}`}>
                                    <div className="exp-header">
                                        <div>
                                            <div className="role" data-editable={`experience-${index}-role`}>{exp.role}</div>
                                            <div className="company" data-editable={`experience-${index}-company`}>{exp.company}</div>
                                        </div>
                                        <div className="date-badge" data-editable={`experience-${index}-date`}>
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
                            <h2 className="section-title">Projects</h2>
                            {data.projects.map((proj: any, index: number) => (
                                <div key={proj.id || index} className="project-item" data-section={`project-${index}`}>
                                    <div className="proj-header">
                                        <div>
                                            <div className="proj-name" data-editable={`project-${index}-name`}>{proj.name}</div>
                                            {proj.link && (
                                                <a href={proj.link} className="link" target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#60a5fa' }}>Link</a>
                                            )}
                                        </div>
                                        {proj.techStack && (
                                            <div className="tech-stack" data-editable={`project-${index}-techStack`}>
                                                {proj.techStack}
                                            </div>
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
                </main>
            </div>
        </div>
    );
};

export const CORPORATE_STYLES = `
${BASE_STYLES}

.corporate-template {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a2e;
    padding: 0;
}

.corporate-template .layout-grid {
    display: grid;
    grid-template-columns: 210px 1fr;
    min-height: 297mm;
}

.corporate-template .sidebar {
    background: #1a1a2e;
    color: #e2e8f0;
    padding: 30px 20px;
}

.corporate-template .sidebar-header {
    text-align: center;
    padding-bottom: 18px;
    margin-bottom: 18px;
    border-bottom: 1px solid rgba(255,255,255,0.15);
}

.corporate-template .name {
    font-size: 24px;
    font-weight: 700;
    color: white;
    letter-spacing: 1px;
    margin-bottom: 4px;
}

.corporate-template .job-title {
    font-size: 15px;
    color: #60a5fa;
    font-weight: 500;
    letter-spacing: 1px;
    text-transform: uppercase;
}

.corporate-template .sidebar-title {
    font-size: 14px;
    font-weight: 700;
    color: #60a5fa;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid rgba(96, 165, 250, 0.3);
}

.corporate-template .sidebar-section {
    margin-bottom: 18px;
}

.corporate-template .contact-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.corporate-template .contact-item {
    font-size: 13px;
    color: #cbd5e1;
    display: block;
    text-decoration: none;
    word-break: break-all;
}

.corporate-template .skill-item {
    font-size: 13px;
    padding: 4px 8px;
    background: rgba(96, 165, 250, 0.15);
    border-radius: 3px;
    margin-bottom: 4px;
    color: #e2e8f0;
}

.corporate-template .education-item {
    margin-bottom: 10px;
}

.corporate-template .degree {
    font-size: 14px;
    font-weight: 700;
    color: white;
}

.corporate-template .school {
    font-size: 13px;
    color: #94a3b8;
    font-style: italic;
}

.corporate-template .sidebar .date {
    font-size: 13px;
    color: #60a5fa;
    font-weight: 600;
}

.corporate-template .main-content {
    padding: 30px 35px;
}

.corporate-template .section-title {
    font-size: 16px;
    font-weight: 700;
    color: #1a1a2e;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid #60a5fa;
}

.corporate-template .summary-text {
    color: #475569;
    font-size: 14px;
    line-height: 1.6;
    text-align: justify;
}

.corporate-template .experience-item {
    margin-bottom: 14px;
}

.corporate-template .project-item {
    margin-bottom: 14px;
}

.corporate-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.corporate-template .role {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a2e;
}

.corporate-template .company {
    font-size: 14px;
    color: #60a5fa;
    font-weight: 600;
}

.corporate-template .date-badge {
    font-size: 13px;
    color: white;
    background: #1a1a2e;
    padding: 3px 8px;
    border-radius: 3px;
    font-weight: 600;
    white-space: nowrap;
}

.corporate-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.corporate-template .proj-name {
    font-size: 15px;
    font-weight: 700;
    color: #1a1a2e;
}

.corporate-template .tech-stack {
    font-size: 14px;
    color: #60a5fa;
    font-weight: 600;
}

.corporate-template .description {
    color: #475569;
    font-size: 14px;
}
`;

export function generateCorporateHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<CorporateTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${CORPORATE_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
