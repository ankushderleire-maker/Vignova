import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Minimal Template - Simple and elegant design
 * Ultra-clean with maximum whitespace
 */
export const MinimalTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map(s => s.trim()) : []);

    return (
        <div className="resume-page minimal-template" style={getCssVariables(designSettings)}>
            {/* Header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                <div className="contact-row">
                    {data.contact?.email && <span data-editable="email">{data.contact.email}</span>}
                    {data.contact?.phone && <span data-editable="phone">{data.contact.phone}</span>}
                    {data.contact?.location && <span data-editable="location">{data.contact.location}</span>}
                </div>
            </header>

            {/* Summary */}
            {data.summary && (
                <section className="section no-break" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                    <h2 className="section-title">Summary</h2>
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

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="experience">
                    <h2 className="section-title">Experience</h2>
                    {data.experience.map((exp, index) => (
                        <div
                            key={exp.id || index}
                            className="experience-item no-break"
                            style={{ marginBottom: `${experienceSettings.spacing / 1.5}px` }}
                        >
                            <div className="exp-header">
                                <span className="role" data-editable={`experience-${index}-role`}>{exp.role}</span>
                                <span className="date">{exp.startDate} - {exp.endDate}</span>
                            </div>
                            <div className="company" data-editable={`experience-${index}-company`}>{exp.company}</div>
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
                    <h2 className="section-title">Projects</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div
                            key={proj.id || index}
                            className="project-item no-break"
                            style={{ marginBottom: `${experienceSettings.spacing / 1.5}px` }}
                        >
                            <div className="proj-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                <span className="proj-name" style={{ fontSize: '12px', fontWeight: 500, color: '#000' }}>
                                    {proj.name}
                                    {proj.link && (
                                        <a href={proj.link} style={{ marginLeft: '8px', fontSize: '10px', color: '#666', textDecoration: 'none' }}>Link</a>
                                    )}
                                </span>
                            </div>
                            {proj.techStack && (
                                <div className="tech-stack" style={{ fontSize: '10px', color: '#666', fontStyle: 'italic', marginBottom: '4px' }}>
                                    {proj.techStack}
                                </div>
                            )}
                            <div
                                className="description text-wrap"
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

            {data.education.map((edu, index) => (
                <div
                    key={edu.id || index}
                    className="education-item no-break"
                    style={{ marginBottom: `${educationSettings.spacing / 2}px` }}
                >
                    <div className="edu-header">
                        <span className="degree" data-editable={`education-${index}-degree`}>{edu.degree}</span>
                        <span className="date">{edu.startDate} - {edu.endDate}</span>
                    </div>
                    <div className="school" data-editable={`education-${index}-school`}>{edu.school}</div>
                </div>
            ))}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
                <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="certifications">
                    <h2 className="section-title">Certifications</h2>
                    <div className="description text-wrap" style={{ fontSize: `${educationSettings.fontSize}px`, lineHeight: educationSettings.lineHeight }}>
                        {data.certifications.map((cert: string, index: number) => (
                            <p key={index} style={{ marginBottom: '4px' }}>• {cert}</p>
                        ))}
                    </div>
                </section>
            )}

            {/* Skills */}
            {skills.length > 0 && (
                <section className="section" data-section="skills">
                    <h2 className="section-title">Skills</h2>
                    <p className="skills-text">
                        {skills.join(' • ')}
                    </p>
                </section>
            )}
        </div>
    );
};

/**
 * CSS for Minimal Template
 */
export const MINIMAL_STYLES = `
${BASE_STYLES}

.minimal-template {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #000;
    line-height: 1.6;
}

.minimal-template .header {
    text-align: center;
    padding-bottom: 15px;
}

.minimal-template .name {
    font-size: 30px;
    font-weight: 300;
    color: #000;
    margin-bottom: 4px;
    letter-spacing: 3px;
}

.minimal-template .job-title {
    font-size: 16px;
    color: #666;
    font-weight: 300;
    margin-bottom: 8px;
    letter-spacing: 2px;
}

.minimal-template .contact-row {
    display: flex;
    justify-content: center;
    gap: 15px;
    font-size: 13px;
    color: #666;
    font-weight: 300;
}

.minimal-template .contact-row span::after {
    content: '|';
    margin-left: 15px;
    color: #ccc;
}

.minimal-template .contact-row span:last-child::after {
    content: '';
    margin-left: 0;
}

.minimal-template .section-title {
    font-size: 15px;
    font-weight: 400;
    color: #000;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 1px solid #000;
    letter-spacing: 2px;
}

.minimal-template .summary-text {
    color: #333;
    text-align: justify;
    font-size: 14px;
}

.minimal-template .experience-item {
    margin-bottom: 14px;
}

.minimal-template .project-item {
    margin-bottom: 14px;
}

.minimal-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
}

.minimal-template .role {
    font-size: 15px;
    font-weight: 500;
    color: #000;
}

.minimal-template .date {
    font-size: 13px;
    color: #666;
    font-weight: 300;
}

.minimal-template .company {
    font-size: 14px;
    color: #666;
    margin-bottom: 4px;
    font-style: italic;
}

.minimal-template .description {
    color: #333;
    font-size: 14px;
}

.minimal-template .education-item {
    margin-bottom: 10px;
}

.minimal-template .edu-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 2px;
}

.minimal-template .degree {
    font-size: 14px;
    font-weight: 500;
    color: #000;
}

.minimal-template .school {
    font-size: 14px;
    color: #666;
    font-style: italic;
}

.minimal-template .skills-text {
    color: #333;
    line-height: 1.8;
}
`;

/**
 * Generate full HTML for Minimal Template
 */
export function generateMinimalHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<MinimalTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${MINIMAL_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}

