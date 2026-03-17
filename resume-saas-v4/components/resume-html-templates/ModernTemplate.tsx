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
                                <span className="company" data-editable={`experience-${index}-company`}>{exp.company}</span>
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
                                <div className="school" data-editable={`education-${index}-school`}>{edu.school}</div>
                                <div className="degree" data-editable={`education-${index}-degree`}>{edu.degree}</div>
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
export function generateModernHtml(data: any, designSettings?: any): string {
    const cssVars = getCssVariables(designSettings);
    const styleString = Object.entries(cssVars)
        .map(([key, value]) => `${key}: ${value}`)
        .join('; ');

    const headerSettings = getSettings(designSettings, 'header');
    const summarySettings = getSettings(designSettings, 'summary');
    const experienceSettings = getSettings(designSettings, 'experience');
    const educationSettings = getSettings(designSettings, 'education');
    const skillsSettings = getSettings(designSettings, 'skills');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    const skillsHtml = skills.map((skill: string) =>
        `<span class="skill-tag">${skill}</span>`
    ).join('');

    const experienceHtml = (data.experience || []).map((exp: any) => `
        <div class="experience-item no-break" style="margin-bottom: ${experienceSettings.spacing / 1.5}px">
            <div class="exp-header">
                <span class="company">${exp.company || ''}</span>
                <span class="date">${exp.startDate || ''} - ${exp.endDate || ''}</span>
            </div>
            <div class="role">${exp.role || ''}</div>
            <div class="description text-wrap" style="line-height: ${experienceSettings.lineHeight}">
                ${splitDescription(exp.description).map((line: string) => `<p style="margin-bottom: 4px">• ${line}</p>`).join('')}
            </div>
        </div>
    `).join('');

    const projectsHtml = (data.projects || []).map((proj: any) => `
        <div class="project-item no-break" style="margin-bottom: ${experienceSettings.spacing / 2}px">
            <div class="proj-header">
                <div class="project-name">${proj.name || ''}</div>
                ${proj.link ? `<a href="${proj.link}" class="link" style="font-size: 14px">Link</a>` : ''}
            </div>
            ${proj.techStack ? `<div class="tech-stack" style="margin-bottom: 4px">${proj.techStack}</div>` : ''}
            <div class="description text-wrap" style="line-height: ${experienceSettings.lineHeight}">
                ${splitDescription(proj.description).map((line: string) => `<p style="margin-bottom: 4px">• ${line}</p>`).join('')}
            </div>
        </div>
    `).join('');


    const educationHtml = (data.education || []).map((edu: any) => `
        <div class="education-item no-break" style="margin-bottom: ${educationSettings.spacing / 2}px">
            <div class="edu-content">
                <div class="school">${edu.school || ''}</div>
                <div class="degree">${edu.degree || ''}</div>
            </div>
            <span class="date">${edu.startDate || ''} - ${edu.endDate || ''}</span>
        </div>
    `).join('');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>${MODERN_STYLES}</style>
</head>
<body>
    <div class="resume-page modern-template" style="${styleString}">
        <header class="header no-break" style="margin-bottom: ${headerSettings.spacing}px">
            <h1 class="name" data-editable="fullName">${data.fullName || ''}</h1>
            <div class="contact-row" style="display: block; text-align: center">
                ${data.contact?.location ? `<span data-editable="location">${data.contact.location}</span>` : ''}
                ${data.contact?.email ? `<span data-editable="email">• ${data.contact.email}</span>` : ''}
                ${data.contact?.phone ? `<span data-editable="phone">• ${data.contact.phone}</span>` : ''}
            </div>
            <div class="links-row" style="display: block; text-align: center">
                ${data.contact?.linkedin ? `<a href="https://${data.contact.linkedin}" class="link" data-editable="linkedin">${data.contact.linkedin}</a>` : ''}
                ${data.contact?.website ? `<a href="https://${data.contact.website}" class="link" data-editable="website">${data.contact.website}</a>` : ''}
            </div>
        </header>

        ${data.summary ? `
        <section class="section no-break" style="margin-bottom: ${summarySettings.spacing}px">
            <h2 class="section-title">Profile</h2>
            <p class="summary-text text-wrap" data-editable="summary" style="line-height: ${summarySettings.lineHeight}">
                ${data.summary}
            </p>
        </section>
        ` : ''}

        ${skills.length ? `
        <section class="section no-break" style="margin-bottom: ${skillsSettings.spacing}px">
            <h2 class="section-title">Key Skills</h2>
            <div class="skills-row flex-wrap">
                ${skillsHtml}
            </div>
        </section>
        ` : ''}

        ${data.experience?.length ? `
        <section class="section" style="margin-bottom: ${experienceSettings.spacing}px">
            <h2 class="section-title">Experience</h2>
            ${experienceHtml}
        </section>
        ` : ''}

        ${data.projects?.length ? `
        <section class="section" style="margin-bottom: ${experienceSettings.spacing}px">
            <h2 class="section-title">Projects</h2>
            ${projectsHtml}
        </section>
        ` : ''}

        ${data.education?.length ? `
        <section class="section">
            <h2 class="section-title">Education</h2>
            ${educationHtml}
        </section>
        ` : ''}
    </div>
</body>
</html>`;
}
