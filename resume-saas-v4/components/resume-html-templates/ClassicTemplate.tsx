import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Classic Template - Elegant serif-based design
 * Traditional resume layout with clean lines
 */
export const ClassicTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    return (
        <div className="resume-page classic-template" style={getCssVariables(designSettings)}>
            {/* Header */}
            <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                {data.jobTitle && <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>}
                <div className="contact-row">
                    {data.contact?.location && <span data-editable="location">{data.contact.location}</span>}
                    {data.contact?.phone && <span className="separator">|</span>}
                    {data.contact?.phone && <span data-editable="phone">{data.contact.phone}</span>}
                    {data.contact?.email && <span className="separator">|</span>}
                    {data.contact?.email && <span data-editable="email">{data.contact.email}</span>}
                </div>
                {data.contact?.linkedin && (
                    <a href={`https://${data.contact.linkedin}`} className="link" data-editable="linkedin">
                        {data.contact.linkedin}
                    </a>
                )}
                {data.contact?.website && (
                    <a href={`https://${data.contact.website}`} className="link" data-editable="website">
                        {data.contact.website}
                    </a>
                )}
                {data.contact?.github && (
                    <a href={`https://${data.contact.github}`} className="link" data-editable="github">
                        {data.contact.github}
                    </a>
                )}
            </header>

            {/* Summary */}
            {data.summary && (
                <section className="section no-break" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                    <h2 className="section-title">Professional Summary</h2>
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
                    <h2 className="section-title">Professional Experience</h2>
                    {data.experience.map((exp, index) => (
                        <div
                            key={exp.id || index}
                            className="experience-item no-break"
                            style={{ marginBottom: `${experienceSettings.spacing / 2}px` }}
                        >
                            <div className="exp-header">
                                <span className="company">{exp.company}{exp.location ? ` · ${exp.location}` : ''}</span>
                                <span className="date">{exp.startDate} - {exp.endDate}</span>
                            </div>
                            <div className="role">{exp.role}</div>
                            <div
                                className="description text-wrap"
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
                            style={{ marginBottom: `${experienceSettings.spacing / 2}px` }}
                        >
                            <div className="proj-header">
                                <span className="company">{proj.name}</span>
                                {proj.link && (
                                    <a href={proj.link} className="link" target="_blank" rel="noreferrer" style={{ marginLeft: '6px' }}>Link</a>
                                )}
                            </div>
                            {proj.techStack && (
                                <div className="role" style={{ color: '#555', fontStyle: 'normal', fontSize: '10px' }}>{proj.techStack}</div>
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

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <section className="section" style={{ marginBottom: `${educationSettings.spacing}px` }} data-section="education">
                    <h2 className="section-title">Education</h2>
                    {data.education.map((edu, index) => (
                        <div
                            key={edu.id || index}
                            className="education-item no-break"
                            style={{ marginBottom: `${educationSettings.spacing / 2}px` }}
                        >
                            <div className="edu-row">
                                <div>
                                    <span className="school">{edu.school}{edu.grade ? ` · ${edu.grade}` : ''}</span>
                                    <span className="degree">, {edu.degree}{edu.field ? ' · ' + edu.field : ''}</span>
                                </div>
                                <span className="date">{edu.startDate} - {edu.endDate}</span>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Certifications */}
            {data.certifications && data.certifications.length > 0 && (
                <section className="section no-break" data-section="certifications">
                    <h2 className="section-title">Certifications</h2>
                    <div className="description text-wrap" style={{ fontSize: `${educationSettings.fontSize}px`, lineHeight: educationSettings.lineHeight }}>
                        {data.certifications.map((cert: string, index: number) => (
                            <p key={index} style={{ marginBottom: '4px' }}>• {cert}</p>
                        ))}
                    </div>
                </section>
            )}

            {/* Skills */}
            {data.skills && (
                <section className="section no-break" data-section="skills">
                    <h2 className="section-title">Skills</h2>
                    <p
                        className="skills-text text-wrap"
                        style={{
                            lineHeight: skillsSettings.lineHeight
                        }}
                    >
                        {Array.isArray(data.skills)
                            ? data.skills.join(', ')
                            : (data.skills.technical ? data.skills.technical : '')
                        }
                    </p>
                </section>
            )}
        </div>
    );
};

/**
 * CSS for Classic Template
 */
export const CLASSIC_STYLES = `
${BASE_STYLES}

.classic-template {
    font-family: 'Times New Roman', Georgia, serif;
    color: #000;
}

.classic-template .header {
    text-align: center;
    border-bottom: 1px solid #000;
    padding-bottom: 15px;
}

.classic-template .name {
    font-size: 30px;
    font-weight: bold;
    text-transform: uppercase;
    margin-bottom: 8px;
    letter-spacing: 1px;
}

.classic-template .contact-row {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 14px;
    color: #333;
}

.classic-template .separator {
    color: #666;
}

.classic-template .link {
    color: #1e40af;
    text-decoration: none;
    font-size: 14px;
    margin-top: 4px;
    display: inline-block;
}

.classic-template .section-title {
    font-size: 15px;
    font-weight: bold;
    text-transform: uppercase;
    border-bottom: 1px solid #000;
    padding-bottom: 4px;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
}

.classic-template .experience-item,
.classic-template .project-item,
.classic-template .education-item {
    margin-bottom: 12px;
}

.classic-template .exp-header,
.classic-template .proj-header,
.classic-template .edu-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 2px;
}

.classic-template .company,
.classic-template .school {
    font-size: 15px;
    font-weight: bold;
}

.classic-template .date {
    font-size: 14px;
    color: #555;
}

.classic-template .role {
    font-size: 14px;
    font-style: italic;
    color: #333;
    margin-bottom: 4px;
}

.classic-template .degree {
    font-size: 14px;
}

.classic-template .description {
    text-align: justify;
    font-size: 14px;
}

.classic-template .summary-text {
    text-align: justify;
    font-size: 14px;
}

.classic-template .skills-text {
    line-height: 1.6;
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
export function generateClassicHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<ClassicTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${CLASSIC_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}
