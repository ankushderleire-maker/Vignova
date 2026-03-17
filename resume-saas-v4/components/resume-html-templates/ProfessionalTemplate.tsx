import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

/**
 * Professional Template - Executive-level design
 * Sophisticated with sidebar layout
 */
export const ProfessionalTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map(s => s.trim()) : []);

    return (
        <div className="resume-page professional-template" style={getCssVariables(designSettings)}>
            <div className="layout-grid">
                {/* Left Sidebar */}
                <aside className="sidebar">
                    {/* Contact Info */}
                    <section className="sidebar-section" data-section="contact">
                        <h3 className="sidebar-title">CONTACT</h3>
                        <div className="contact-list">
                            {data.contact?.email && (
                                <div className="contact-item" data-editable="email">
                                    <span className="label">Email</span>
                                    <span className="value">{data.contact.email}</span>
                                </div>
                            )}
                            {data.contact?.phone && (
                                <div className="contact-item" data-editable="phone">
                                    <span className="label">Phone</span>
                                    <span className="value">{data.contact.phone}</span>
                                </div>
                            )}
                            {data.contact?.location && (
                                <div className="contact-item" data-editable="location">
                                    <span className="label">Location</span>
                                    <span className="value">{data.contact.location}</span>
                                </div>
                            )}
                            {data.contact?.linkedin && (
                                <div className="contact-item">
                                    <span className="label">LinkedIn</span>
                                    <a href={`https://${data.contact.linkedin}`} className="value link" data-editable="linkedin">
                                        Profile
                                    </a>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Skills */}
                    {skills.length > 0 && (
                        <section className="sidebar-section" data-section="skills">
                            <h3 className="sidebar-title">SKILLS</h3>
                            <div className="skills-list">
                                {skills.map((skill: string, i: number) => (
                                    <div key={i} className="skill-item">
                                        {skill}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Education */}
                    {data.education && data.education.length > 0 && (
                        <section className="sidebar-section" data-section="education">
                            <h3 className="sidebar-title">EDUCATION</h3>
                            {data.education.map((edu, index) => (
                                <div key={edu.id || index} className="edu-item no-break">
                                    <div className="edu-degree" data-editable={`education-${index}-degree`}>{edu.degree}</div>
                                    <div className="edu-school" data-editable={`education-${index}-school`}>{edu.school}</div>
                                    <div className="edu-date">{edu.startDate} - {edu.endDate}</div>
                                </div>
                            ))}
                        </section>
                    )}

                    {/* Certifications */}
                    {data.certifications && data.certifications.length > 0 && (
                        <section className="sidebar-section" data-section="certifications">
                            <h3 className="sidebar-title">CERTIFICATIONS</h3>
                            <div className="skills-list">
                                {data.certifications.map((cert: string, i: number) => (
                                    <div key={i} className="skill-item no-break">
                                        {cert}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </aside>

                {/* Main Content */}
                <main className="main-content">
                    {/* Header */}
                    <header className="header no-break" style={{ marginBottom: `${headerSettings.spacing}px` }} data-section="header">
                        <h1 className="name" data-editable="fullName">{data.fullName}</h1>
                        <p className="job-title" data-editable="jobTitle">{data.jobTitle}</p>
                    </header>

                    {/* Summary */}
                    {data.summary && (
                        <section className="section no-break" style={{ marginBottom: `${summarySettings.spacing}px` }} data-section="summary">
                            <h2 className="section-title">PROFESSIONAL SUMMARY</h2>
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
                        <section className="section" data-section="experience">
                            <h2 className="section-title">PROFESSIONAL EXPERIENCE</h2>
                            {data.experience.map((exp, index) => (
                                <div
                                    key={exp.id || index}
                                    className="experience-item no-break"
                                    style={{ marginBottom: `${experienceSettings.spacing / 1.5}px` }}
                                >
                                    <div className="exp-header">
                                        <div className="exp-left">
                                            <div className="role" data-editable={`experience-${index}-role`}>{exp.role}</div>
                                            <div className="company" data-editable={`experience-${index}-company`}>{exp.company}</div>
                                        </div>
                                        <div className="date">{exp.startDate} - {exp.endDate}</div>
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
                        <section className="section" data-section="projects">
                            <h2 className="section-title">PROJECTS</h2>
                            {data.projects.map((proj: any, index: number) => (
                                <div
                                    key={proj.id || index}
                                    className="project-item no-break"
                                    style={{ marginBottom: `${experienceSettings.spacing / 1.5}px` }}
                                >
                                    <div className="proj-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                        <div className="proj-name" style={{ fontSize: '12px', fontWeight: 700, color: '#2c3e50' }}>
                                            {proj.name}
                                            {proj.link && (
                                                <a href={proj.link} className="link" style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 400 }}>Link</a>
                                            )}
                                        </div>
                                    </div>
                                    {proj.techStack && (
                                        <div className="tech-stack" style={{ fontSize: '10px', color: '#7f8c8d', fontStyle: 'italic', marginBottom: '4px' }}>
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
                </main>
            </div>
        </div >
    );
};

/**
 * CSS for Professional Template
 */
export const PROFESSIONAL_STYLES = `
${BASE_STYLES}

.professional-template {
    font-family: 'Georgia', 'Times New Roman', serif;
    color: #1a1a1a;
    padding: 0;
}

.professional-template .layout-grid {
    display: grid;
    grid-template-columns: 200px 1fr;
    min-height: 297mm;
}

.professional-template .sidebar {
    background: #2c3e50;
    color: white;
    padding: 30px 20px;
}

.professional-template .sidebar-section {
    margin-bottom: 20px;
}

.professional-template .sidebar-title {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1.5px;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid #3498db;
    color: #3498db;
}

.professional-template .contact-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.professional-template .contact-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.professional-template .label {
    font-size: 12px;
    color: #95a5a6;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 0.5px;
}

.professional-template .value {
    font-size: 13px;
    color: white;
    word-break: break-word;
}

.professional-template .link {
    color: #3498db;
    text-decoration: none;
}

.professional-template .skills-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.professional-template .skill-item {
    background: rgba(52, 152, 219, 0.2);
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 13px;
    color: white;
    border-left: 2px solid #3498db;
}

.professional-template .edu-item {
    margin-bottom: 12px;
}

.professional-template .edu-degree {
    font-size: 14px;
    font-weight: 700;
    color: white;
    margin-bottom: 2px;
}

.professional-template .edu-school {
    font-size: 13px;
    color: #ecf0f1;
    margin-bottom: 2px;
}

.professional-template .edu-date {
    font-size: 13px;
    color: #95a5a6;
}

.professional-template .main-content {
    padding: 30px 30px 30px 25px;
}

.professional-template .header {
    border-bottom: 3px solid #2c3e50;
    padding-bottom: 10px;
    margin-bottom: 15px;
}

.professional-template .name {
    font-size: 36px;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 4px;
    letter-spacing: 1px;
}

.professional-template .job-title {
    font-size: 16px;
    color: #7f8c8d;
    font-weight: 400;
    font-style: italic;
}

.professional-template .section-title {
    font-size: 15px;
    font-weight: 700;
    color: #2c3e50;
    letter-spacing: 1px;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid #3498db;
}

.professional-template .summary-text {
    color: #34495e;
    text-align: justify;
    font-size: 14px;
}

.professional-template .experience-item {
    margin-bottom: 14px;
}

.professional-template .project-item {
    margin-bottom: 14px;
}

.professional-template .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 6px;
}

.professional-template .role {
    font-size: 15px;
    font-weight: 700;
    color: #2c3e50;
    margin-bottom: 2px;
}

.professional-template .company {
    font-size: 15px;
    color: #3498db;
    font-weight: 600;
}

.professional-template .date {
    font-size: 13px;
    color: #7f8c8d;
    font-style: italic;
    white-space: nowrap;
}

.professional-template .description {
    color: #34495e;
    font-size: 14px;
}
`;

/**
 * Generate full HTML for Professional Template
 */
export function generateProfessionalHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<ProfessionalTemplate data={data} designSettings={designSettings} />);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.fullName} - Resume</title>
    <style>${PROFESSIONAL_STYLES}</style>
</head>
<body>
    ${html}
</body>
</html>
    `.trim();
}

