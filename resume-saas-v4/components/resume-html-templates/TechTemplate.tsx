import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Tech Template - Developer-focused design
 * Dark header bar, monospace headings, code-style skill tags
 */
export const TechTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page tech-template" style={getCssVariables(designSettings)}>
            {/* Dark header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <div className="header-dark">
                    <div className="terminal-bar">
                        <span className="dot red"></span>
                        <span className="dot yellow"></span>
                        <span className="dot green"></span>
                    </div>
                    <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                    <p className="job-title" data-editable="jobTitle">&gt; {data.jobTitle}</p>
                </div>
                <div className="contact-bar">
                    {data.contact?.email && <span data-editable="email">📧 {data.contact.email}</span>}
                    {data.contact?.phone && <span data-editable="phone">📱 {data.contact.phone}</span>}
                    {data.contact?.location && <span data-editable="location">📍 {data.contact.location}</span>}
                    {data.contact?.linkedin && (
                        <a href={`https://${data.contact.linkedin}`} className="link" data-editable="linkedin">🔗 LinkedIn</a>
                    )}
                </div>
            </header>

            {/* Summary */}
            {data.summary && (
                <section className="section" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                    <h2 className="section-title">{'{ '}<span>About</span>{' }'}</h2>
                    <p className="summary-text text-wrap" data-editable="summary"
                        style={{ lineHeight: summarySettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
                <section className="section" style={{ marginBottom: `${skillsSettings.spacing}px` }} data-section="skills">
                    <h2 className="section-title">{'{ '}<span>Tech Stack</span>{' }'}</h2>
                    <div className="skills-grid">
                        {skills.map((skill: string, i: number) => (
                            <span key={i} className="skill-code">{skill}</span>
                        ))}
                    </div>
                </section>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="projects">
                    <h2 className="section-title">{'{ '}<span>Projects</span>{' }'}</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div key={proj.id || index} className="project-item no-break" data-section={`project-${index}`}>
                            <div className="proj-header">
                                <div>
                                    <div className="proj-name" data-editable={`project-${index}-name`}>{proj.name}</div>
                                    {proj.link && (
                                        <a href={proj.link} className="link" target="_blank" rel="noreferrer" style={{ fontSize: '9px', color: '#22d3ee' }}>Link</a>
                                    )}
                                </div>
                                {proj.techStack && (
                                    <div className="tech-stack" data-editable={`project-${index}-techStack`}>&lt; {proj.techStack} /&gt;</div>
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

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                    <h2 className="section-title">{'{ '}<span>Experience</span>{' }'}</h2>
                    {data.experience.map((exp, index) => (
                        <div key={exp.id || index} className="experience-item no-break" data-section={`experience-${index}`}>
                            <div className="exp-header">
                                <div>
                                    <div className="role" data-editable={`experience-${index}-role`}>{exp.role}</div>
                                    <div className="company" data-editable={`experience-${index}-company`}>@{exp.company}</div>
                                </div>
                                <div className="date" data-editable={`experience-${index}-date`}>
                                    {exp.startDate} → {exp.endDate || 'Present'}
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

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="education">
                    <h2 className="section-title">{'{ '}<span>Education</span>{' }'}</h2>
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
            {data.certifications && data.certifications.length > 0 && (
                <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="certifications">
                    <h2 className="section-title">{'{ '}<span>Certifications</span>{' }'}</h2>
                    <div className="description text-wrap" style={{ fontSize: `${educationSettings.fontSize}px`, lineHeight: educationSettings.lineHeight }}>
                        {data.certifications.map((cert: string, index: number) => (
                            <p key={index} style={{ marginBottom: '4px' }}>• {cert}</p>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export const TECH_STYLES = `
${BASE_STYLES}

.tech-template {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    padding: 0;
}

.tech-template .header-dark {
    background: #0f172a;
    padding: 25px 40px 20px;
    position: relative;
}

.tech-template .terminal-bar {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
}

.tech-template .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.tech-template .dot.red { background: #ff5f57; }
.tech-template .dot.yellow { background: #febc2e; }
.tech-template .dot.green { background: #28c840; }

.tech-template .name {
    font-size: 30px;
    font-weight: 700;
    color: #22d3ee;
    font-family: 'Consolas', 'Courier New', monospace;
    margin-bottom: 4px;
}

.tech-template .job-title {
    font-size: 15px;
    color: #94a3b8;
    font-family: 'Consolas', 'Courier New', monospace;
}

.tech-template .contact-bar {
    background: #1e293b;
    padding: 8px 40px;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #94a3b8;
}

.tech-template .contact-bar a {
    color: #22d3ee;
    text-decoration: none;
}

.tech-template .section {
    padding: 0 40px;
}

.tech-template .section-title {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    font-family: 'Consolas', 'Courier New', monospace;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid #22d3ee;
}

.tech-template .section-title span {
    color: #22d3ee;
}

.tech-template .summary-text {
    color: #475569;
    font-size: 14px;
    line-height: 1.6;
    text-align: justify;
}

.tech-template .skills-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.tech-template .skill-code {
    background: #0f172a;
    color: #22d3ee;
    padding: 4px 10px;
    border-radius: 4px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 13px;
    font-weight: 600;
}

.tech-template .experience-item {
    margin-bottom: 14px;
    padding-left: 12px;
    border-left: 3px solid #22d3ee;
}

.tech-template .project-item {
    margin-bottom: 14px;
    padding-left: 12px;
    border-left: 3px solid #f43f5e;
}

.tech-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.tech-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.tech-template .proj-name {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
    font-family: 'Consolas', 'Courier New', monospace;
}

.tech-template .tech-stack {
    font-size: 14px;
    color: #f43f5e;
    font-family: 'Consolas', 'Courier New', monospace;
    font-weight: 600;
}

.tech-template .role {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
}

.tech-template .company {
    font-size: 14px;
    color: #22d3ee;
    font-family: 'Consolas', 'Courier New', monospace;
    font-weight: 600;
}

.tech-template .date {
    font-size: 13px;
    color: #94a3b8;
    font-family: 'Consolas', 'Courier New', monospace;
    white-space: nowrap;
}

.tech-template .description {
    color: #475569;
    font-size: 14px;
}

.tech-template .education-item {
    margin-bottom: 10px;
    padding-left: 12px;
    border-left: 3px solid #22d3ee;
}

.tech-template .edu-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}

.tech-template .degree {
    font-size: 14px;
    font-weight: 700;
    color: #0f172a;
}

.tech-template .school {
    font-size: 13px;
    color: #64748b;
    font-style: italic;
}
`;

export function generateTechHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<TechTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${TECH_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
