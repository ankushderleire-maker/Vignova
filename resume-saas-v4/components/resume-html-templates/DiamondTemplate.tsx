import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Diamond Template - Geometric modern design with emerald accent
 * Two-column sidebar-right with geometric header
 */
export const DiamondTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page diamond-template" style={getCssVariables(designSettings)}>
            {/* Geometric header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <div className="header-geo">
                    <div className="geo-accent"></div>
                    <div className="header-text">
                        <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                        <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                    </div>
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

            <div className="layout-columns">
                {/* Main Content */}
                <main className="main-content">
                    {/* Summary */}
                    {data.summary && (
                        <section className="section" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                            <h2 className="section-title">◆ Profile</h2>
                            <p className="summary-text text-wrap" data-editable="summary"
                                style={{ lineHeight: summarySettings.lineHeight }}>
                                {data.summary}
                            </p>
                        </section>
                    )}

                    {/* Experience */}
                    {data.experience && data.experience.length > 0 && (
                        <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                            <h2 className="section-title">◆ Experience</h2>
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
                            <h2 className="section-title">◆ Projects</h2>
                            {data.projects.map((proj: any, index: number) => (
                                <div key={proj.id || index} className="project-item" data-section={`project-${index}`}>
                                    <div className="proj-header">
                                        <div>
                                            <div className="proj-name" data-editable={`project-${index}-name`}>{proj.name}</div>
                                            {proj.link && (
                                                <a href={proj.link} className="link" target="_blank" rel="noreferrer" style={{ fontSize: '10px', color: '#059669' }}>Link</a>
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
                            <h2 className="sidebar-title">◆ Skills</h2>
                            <div className="skills-list">
                                {skills.map((skill: string, i: number) => (
                                    <div key={i} className="skill-item">
                                        <span className="diamond-dot">◇</span> {skill}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Education */}
                    {data.education && data.education.length > 0 && (
                        <section className="section sidebar-section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="education">
                            <h2 className="sidebar-title">◆ Education</h2>
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
                            <h2 className="sidebar-title">◆ Certifications</h2>
                            <div className="skills-list">
                                {data.certifications.map((cert: string, i: number) => (
                                    <div key={i} className="skill-item no-break">
                                        <span className="diamond-dot">◇</span> {cert}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </aside>
            </div>
        </div >
    );
};

export const DIAMOND_STYLES = `
${BASE_STYLES}

.diamond-template {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #1a202c;
    padding: 0;
}

.diamond-template .header-geo {
    background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%);
    padding: 25px 40px;
    position: relative;
    overflow: hidden;
}

.diamond-template .geo-accent {
    position: absolute;
    top: -20px;
    right: -20px;
    width: 100px;
    height: 100px;
    background: rgba(255,255,255,0.08);
    transform: rotate(45deg);
}

.diamond-template .name {
    font-size: 30px;
    font-weight: 700;
    color: white;
    letter-spacing: 1px;
    margin-bottom: 4px;
    position: relative;
}

.diamond-template .job-title {
    font-size: 15px;
    color: #a7f3d0;
    font-weight: 400;
    letter-spacing: 2px;
    text-transform: uppercase;
    position: relative;
}

.diamond-template .contact-row {
    background: #064e3b;
    padding: 8px 40px;
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #d1fae5;
}

.diamond-template .contact-row a {
    color: #6ee7b7;
    text-decoration: none;
}

.diamond-template .layout-columns {
    display: grid;
    grid-template-columns: 1fr 190px;
    gap: 0;
    padding: 25px 0 30px;
}

.diamond-template .main-content {
    padding: 0 20px 0 40px;
}

.diamond-template .sidebar {
    padding: 0 35px 0 15px;
    border-left: 1px solid #e2e8f0;
}

.diamond-template .section-title {
    font-size: 15px;
    font-weight: 700;
    color: #065f46;
    letter-spacing: 1px;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid #059669;
}

.diamond-template .sidebar-title {
    font-size: 14px;
    font-weight: 700;
    color: #065f46;
    letter-spacing: 1px;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 2px solid #059669;
}

.diamond-template .summary-text {
    color: #4a5568;
    font-size: 14px;
    line-height: 1.6;
    text-align: justify;
}

.diamond-template .experience-item {
    margin-bottom: 14px;
}

.diamond-template .project-item {
    margin-bottom: 14px;
}

.diamond-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 4px;
}

.diamond-template .role {
    font-size: 15px;
    font-weight: 700;
    color: #1a202c;
}

.diamond-template .company {
    font-size: 14px;
    color: #059669;
    font-weight: 600;
}

.diamond-template .date {
    font-size: 12px;
    color: #a0aec0;
    white-space: nowrap;
}

.diamond-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2px;
}

.diamond-template .proj-name {
    font-size: 15px;
    font-weight: 700;
    color: #1a202c;
}

.diamond-template .tech-stack {
    font-size: 14px;
    color: #059669;
    font-weight: 600;
    margin-bottom: 4px;
}

.diamond-template .description {
    color: #4a5568;
    font-size: 14px;
}

.diamond-template .skill-item {
    font-size: 13px;
    padding: 3px 0;
    color: #2d3748;
}

.diamond-template .diamond-dot {
    color: #059669;
    font-size: 9px;
}

.diamond-template .education-item {
    margin-bottom: 10px;
}

.diamond-template .degree {
    font-size: 14px;
    font-weight: 700;
    color: #1a202c;
}

.diamond-template .school {
    font-size: 13px;
    color: #718096;
    font-style: italic;
}

.diamond-template .education-item .date {
    font-size: 12px;
    color: #059669;
    font-weight: 600;
}
`;

export function generateDiamondHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<DiamondTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${DIAMOND_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
