import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Modern Template - Clean contemporary design
 * Two-line header with modern typography
 */
export const ModernTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map(s => s.trim()) : []);

    return (
        <div className="resume-page modern-template" style={getCssVariables(designSettings)}>
            {/* Header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px`, textAlign: 'center' }} data-section="header">
                <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                {data.jobTitle && <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>}
                <div className="contact-row" style={{ display: 'block', textAlign: 'center' }}>
                    {data.contact?.location && <span data-editable="location">{data.contact.location}</span>}
                    {data.contact?.email && <span data-editable="email">• {data.contact.email}</span>}
                    {data.contact?.phone && <span data-editable="phone">• {data.contact.phone}</span>}
                </div>
                <div className="links-row" style={{ display: 'block', textAlign: 'center' }}>
                    {data.contact?.linkedin && (
                        <a href={`https://${data.contact.linkedin}`} className="link" data-editable="linkedin">
                            {data.contact.linkedin}
                        </a>
                    )}
                    {data.contact?.github && (
                        <a href={`https://${data.contact.github}`} className="link" data-editable="github">
                            {data.contact.github}
                        </a>
                    )}
                    {data.contact?.website && (
                        <a href={`https://${data.contact.website}`} className="link" data-editable="website">
                            {data.contact.website}
                        </a>
                    )}
                </div>
            </header>

            {/* Summary */}
            {data.summary && (
                <section className="section no-break" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                    <h2 className="section-title">Profile</h2>
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
                    <h2 className="section-title">Key Skills</h2>
                    <div className="skills-row flex-wrap">
                        {skills.map((skill: string, i: number) => (
                            <span
                                key={i}
                                className="skill-tag"
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
                    <h2 className="section-title">Experience</h2>
                    {data.experience.map((exp, index) => (
                        <div
                            key={exp.id || index}
                            className="experience-item no-break"
                            style={{ marginBottom: `${experienceSettings.spacing / 1.5}px` }}
                        >
                            <div className="exp-header">
                                <span className="company" data-editable={`experience-${index}-company`}>{exp.company}{exp.location ? ` · ${exp.location}` : ''}</span>
                                <span className="date">{exp.startDate} - {exp.endDate}</span>
                            </div>
                            <div className="role" data-editable={`experience-${index}-role`}>{exp.role}</div>
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

            {/* Projects — this template had no projects section at all, so
                everything entered under Projects was silently dropped. */}
            {data.projects && data.projects.length > 0 && (
                <section className="section" style={{ marginBottom: `${experienceSettings.spacing}px` }} data-section="projects">
                    <h2 className="section-title">Projects</h2>
                    {data.projects.map((proj: any, index: number) => (
                        <div
                            key={proj.id || index}
                            className="experience-item no-break"
                            style={{ marginBottom: `${experienceSettings.spacing / 1.5}px` }}
                        >
                            <div className="exp-header">
                                <span className="company" data-editable={`projects-${index}-name`}>{proj.name}</span>
                                {proj.link && <span className="date">{proj.link}</span>}
                            </div>
                            {proj.techStack && <div className="role" data-editable={`projects-${index}-tech`}>{proj.techStack}</div>}
                            <div
                                className="description text-wrap"
                                data-editable={`projects-${index}-description`}
                                style={{ lineHeight: experienceSettings.lineHeight }}
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
                    <h2 className="section-title">Education</h2>
                    {data.education.map((edu, index) => (
                        <div
                            key={edu.id || index}
                            className="education-item no-break"
                            style={{ marginBottom: `${educationSettings.spacing / 2}px` }}
                        >
                            <div className="edu-content">
                                <div className="school" data-editable={`education-${index}-school`}>{edu.school}{edu.grade ? ` · ${edu.grade}` : ''}</div>
                                <div className="degree" data-editable={`education-${index}-degree`}>{edu.degree}{edu.field ? ` · ${edu.field}` : ''}</div>
                            </div>
                            <span className="date">{edu.startDate} - {edu.endDate}</span>
                        </div>
                    ))}
                </section>
            )}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
                <section className="section" data-section="certifications">
                    <h2 className="section-title">Certifications</h2>
                    <div className="skills-row flex-wrap" style={{ flexDirection: 'column', gap: '4px' }}>
                        {data.certifications.map((cert: string, index: number) => (
                            <div key={index} className="cert-item no-break" style={{ fontSize: `${educationSettings.fontSize}px` }}>
                                • {cert}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

/**
 * CSS for Modern Template
 */
export const MODERN_STYLES = `
${BASE_STYLES}

.modern-template {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #333;
}

.modern-template .header {
    border-bottom: 2px solid #1f2937;
    padding-bottom: 15px;
}

.modern-template .name {
    font-size: 36px;
    font-weight: 700;
    text-transform: uppercase;
    color: #111827;
    letter-spacing: 1px;
    margin-bottom: 8px;
    align-items: center;
}

.modern-template .contact-row {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    font-size: 14px;
    color: #4b5563;
    font-weight: 600;
    margin-bottom: 6px;
}

.modern-template .links-row {
    display: flex;
    gap: 15px;
    font-size: 14px;
}

.modern-template .link {
    color: #2563eb;
    text-decoration: none;
    font-weight: 600;
}

.modern-template .section-title {
    font-size: 15px;
    font-weight: 700;
    text-transform: uppercase;
    color: #9ca3af;
    letter-spacing: 1px;
    margin-bottom: 10px;
}

.modern-template .summary-text {
    color: #374151;
    text-align: justify;
    font-size: 14px;
}

.modern-template .skills-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.modern-template .skill-tag {
    background: #f3f4f6;
    color: #1f2937;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
}

.modern-template .experience-item {
    margin-bottom: 14px;
}

.modern-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 2px;
}

.modern-template .company {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
}

.modern-template .date {
    font-size: 14px;
    color: #6b7280;
    background: #f3f4f6;
    padding: 2px 8px;
    border-radius: 3px;
}

.modern-template .role {
    font-size: 15px;
    font-weight: 600;
    color: #4b5563;
    margin-bottom: 4px;
}

.modern-template .description {
    color: #374151;
    font-size: 14px;
}

.modern-template .project-item {
    margin-bottom: 14px;
}

.modern-template .proj-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 2px;
}

.modern-template .project-name {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
}

.modern-template .tech-stack {
    font-size: 14px;
    color: #6b7280;
    font-style: italic;
}

.modern-template .education-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 8px;
    margin-bottom: 8px;
}

.modern-template .school {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
}

.modern-template .degree {
    font-size: 14px;
    color: #4b5563;
}
`;

/**
 * Generate full HTML document for PDF rendering
 */
/**
 * Renders the component, the way every other template does.
 *
 * This used to be a second, hand-written copy of the markup, and the two
 * had drifted: the string version never picked up job location, field of
 * study, grade, GitHub or the website link, so those were dropped for
 * anyone on this template no matter what the component said.
 */
export function generateModernHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<ModernTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${MODERN_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
