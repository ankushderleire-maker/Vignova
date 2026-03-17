import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Creative Template - Bold and colorful design
 * Features vibrant accents and modern layout
 */
export const CreativeTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map(s => s.trim()) : []);

    return (
        <div className="resume-page creative-template" style={getCssVariables(designSettings)}>
            {/* Header with colored background */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <div className="header-gradient">
                    <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                    <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                </div>
                <div className="contact-grid">
                    {data.contact?.email && <span data-editable="email">✉ {data.contact.email}</span>}
                    {data.contact?.phone && <span data-editable="phone">📞 {data.contact.phone}</span>}
                    {data.contact?.location && <span data-editable="location">📍 {data.contact.location}</span>}
                    {data.contact?.linkedin && (
                        <a href={`https://${data.contact.linkedin}`} className="link" data-editable="linkedin">
                            🔗 LinkedIn
                        </a>
                    )}
                </div>
            </header>

            {/* Summary */}
            {data.summary && (
                <section className="section no-break" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                    <h2 className="section-title">💡 About Me</h2>
                    <p
                        className="summary-text text-wrap"
                        data-editable="summary"
                        style={{
                            lineHeight: summarySettings.lineHeight
                        }}
                    >
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
                <section className="section no-break" style={{ marginBottom: `${skillsSettings.spacing}px` }} data-section="skills">
                    <h2 className="section-title">🚀 Skills</h2>
                    <div className="skills-grid">
                        {skills.map((skill: string, i: number) => (
                            <span
                                key={i}
                                className="skill-badge"
                            >
                                {skill}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                    <h2 className="section-title">💼 Experience</h2>
                    {data.experience.map((exp, index) => (
                        <div
                            key={exp.id || index}
                            className="experience-item no-break"
                            style={{ marginBottom: `${experienceSettings.spacing / 1.5}px` }}
                        >
                            <div className="exp-header">
                                <div>
                                    <div className="role" data-editable={`experience-${index}-role`}>{exp.role}</div>
                                    <div className="company" data-editable={`experience-${index}-company`}>{exp.company}</div>
                                </div>
                                <span className="date">{exp.startDate} - {exp.endDate}</span>
                            </div>
                            <div
                                className="description text-wrap"
                                data-editable={`experience-${index}-description`}
                                style={{
                                    lineHeight: experienceSettings.lineHeight
                                }}
                            >
                                {splitDescription(exp.description).map((line, i) => (
                                    <p key={i} style={{ marginBottom: '4px' }}>• {line}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="projects">
                    <h2 className="section-title">🚀 Projects</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div
                            key={proj.id || index}
                            className="project-item no-break"
                            style={{ marginBottom: `${experienceSettings.spacing / 1.5}px` }}
                        >
                            <div className="proj-header">
                                <div>
                                    <div className="proj-name" data-editable={`project-${index}-name`}>{proj.name}</div>
                                    {proj.link && (
                                        <a href={proj.link} className="link" target="_blank" rel="noreferrer" style={{ fontSize: '10px' }}>Link</a>
                                    )}
                                </div>
                                {proj.techStack && (
                                    <span className="tech-stack">{proj.techStack}</span>
                                )}
                            </div>
                            <div
                                className="description text-wrap"
                                data-editable={`project-${index}-description`}
                                style={{
                                    lineHeight: experienceSettings.lineHeight
                                }}
                            >
                                {splitDescription(proj.description).map((line: string, i: number) => (
                                    <p key={i} style={{ marginBottom: '4px' }}>• {line}</p>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <section className="section" data-section="education">
                    <h2 className="section-title">🎓 Education</h2>
                    {data.education.map((edu, index) => (
                        <div
                            key={edu.id || index}
                            className="education-item no-break"
                            style={{ marginBottom: `${educationSettings.spacing / 2}px` }}
                        >
                            <div className="degree" data-editable={`education-${index}-degree`}>{edu.degree}</div>
                            <div className="school" data-editable={`education-${index}-school`}>{edu.school}</div>
                            <span className="date">{edu.startDate} - {edu.endDate}</span>
                        </div>
                    ))}
                </section>
            )}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
                <section className="section" data-section="certifications">
                    <h2 className="section-title">🏆 Certifications</h2>
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

/**
 * CSS for Creative Template
 */
export const CREATIVE_STYLES = `
${BASE_STYLES}

.creative-template {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1a1a1a;
}

.creative-template .header {
    padding: 0;
}

.creative-template .header-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
    text-align: center;
    border-radius: 8px;
    margin-bottom: 12px;
}

.creative-template .name {
    font-size: 36px;
    font-weight: 800;
    color: white;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 2px;
}

.creative-template .job-title {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 500;
    letter-spacing: 1px;
}

.creative-template .contact-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    font-size: 13px;
    color: #4b5563;
}

.creative-template .contact-grid span,
.creative-template .contact-grid a {
    background: #f3f4f6;
    padding: 6px 10px;
    border-radius: 6px;
    font-weight: 600;
}

.creative-template .link {
    color: #667eea;
    text-decoration: none;
}

.creative-template .section-title {
    font-size: 15px;
    font-weight: 800;
    color: #667eea;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    border-bottom: 3px solid #667eea;
    padding-bottom: 4px;
}

.creative-template .summary-text {
    color: #374151;
    text-align: justify;
    font-size: 14px;
}

.creative-template .skills-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}

.creative-template .skill-badge {
    background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%);
    border: 1px solid #667eea;
    color: #667eea;
    padding: 6px 10px;
    border-radius: 6px;
    font-weight: 700;
    text-align: center;
    font-size: 13px;
}

.creative-template .experience-item {
    margin-bottom: 14px;
    padding-left: 12px;
    border-left: 3px solid #764ba2;
}

.creative-template .project-item {
    margin-bottom: 14px;
    padding-left: 12px;
    border-left: 3px solid #667eea;
}

.creative-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
}

.creative-template .role {
    font-size: 15px;
    font-weight: 800;
    color: #111827;
    margin-bottom: 2px;
}

.creative-template .company {
    font-size: 14px;
    font-weight: 600;
    color: #667eea;
}

.creative-template .date {
    font-size: 13px;
    color: white;
    background: #764ba2;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 600;
    white-space: nowrap;
}

.creative-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
}

.creative-template .proj-name {
    font-size: 15px;
    font-weight: 800;
    color: #111827;
    margin-bottom: 2px;
}

.creative-template .tech-stack {
    font-size: 13px;
    color: white;
    background: #667eea;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: 600;
    white-space: nowrap;
}

.creative-template .description {
    color: #374151;
    font-size: 14px;
}

.creative-template .education-item {
    background: #f9fafb;
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 8px;
    border-left: 3px solid #667eea;
}

.creative-template .degree {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 2px;
}

.creative-template .school {
    font-size: 14px;
    color: #4b5563;
    margin-bottom: 4px;
}

.creative-template .education-item .date {
    font-size: 13px;
    background: #667eea;
}
`;

/**
 * Generate full HTML for Creative Template
 */
export function generateCreativeHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<CreativeTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${CREATIVE_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}

