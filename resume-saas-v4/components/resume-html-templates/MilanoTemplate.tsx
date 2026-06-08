import React from 'react';
import { HtmlTemplateProps, getSettings, getCssVariables, BASE_STYLES } from './BaseTemplate';
import { splitDescription } from './descriptionHelper';

// Italian elegant professional — centered serif name, navy accent, refined spacing
export const MilanoTemplate: React.FC<HtmlTemplateProps> = ({ data, designSettings }) => {
    const expSettings = getSettings(designSettings, 'experience');
    const eduSettings = getSettings(designSettings, 'education');
    const sumSettings = getSettings(designSettings, 'summary');

    const skills = Array.isArray(data.skills)
        ? data.skills
        : (data.skills?.technical ? data.skills.technical.split(',').map((s: string) => s.trim()) : []);

    return (
        <div className="resume-page milano-template" style={getCssVariables(designSettings)}>

            {/* Elegant centered header */}
            <header className="mil-header no-break">
                <div className="mil-name-line">
                    <div className="mil-ornament">—</div>
                    <h1 className="mil-name" data-editable="fullName">{data.fullName}</h1>
                    <div className="mil-ornament">—</div>
                </div>
                <p className="mil-title" data-editable="jobTitle">{data.jobTitle}</p>
                <div className="mil-contact-bar">
                    {[
                        data.contact?.email,
                        data.contact?.phone,
                        data.contact?.location,
                        data.contact?.linkedin,
                        data.contact?.website,
                    ].filter(Boolean).map((item, i, arr) => (
                        <React.Fragment key={i}>
                            <span className="mil-contact-item">{item}</span>
                            {i < arr.length - 1 && <span className="mil-sep">·</span>}
                        </React.Fragment>
                    ))}
                </div>
                <div className="mil-header-rule">
                    <div className="mil-rule-left" />
                    <div className="mil-rule-diamond">◆</div>
                    <div className="mil-rule-right" />
                </div>
            </header>

            {/* Profile */}
            {data.summary && (
                <section className="mil-section no-break">
                    <h2 className="mil-section-heading">Profilo Professionale</h2>
                    <p className="mil-body text-wrap" data-editable="summary"
                        style={{ lineHeight: sumSettings.lineHeight }}>
                        {data.summary}
                    </p>
                </section>
            )}

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
                <section className="mil-section">
                    <h2 className="mil-section-heading">Esperienza Professionale</h2>
                    {data.experience.map((exp: any, i: number) => (
                        <div key={i} className="mil-entry no-break"
                            style={{ marginBottom: `${expSettings.spacing / 1.2}px` }}>
                            <div className="mil-entry-top">
                                <div>
                                    <div className="mil-entry-role" data-editable={`experience-${i}-role`}>{exp.role}</div>
                                    <div className="mil-entry-org" data-editable={`experience-${i}-company`}>
                                        {exp.company}{exp.location ? ` · ${exp.location}` : ''}
                                    </div>
                                </div>
                                <div className="mil-entry-date">{exp.startDate} – {exp.endDate}</div>
                            </div>
                            <div className="mil-bullets text-wrap"
                                style={{ lineHeight: expSettings.lineHeight }}>
                                {splitDescription(exp.description).map((line: string, li: number) => (
                                    <div key={li} className="mil-bullet">◦ {line}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Education */}
            {data.education && data.education.length > 0 && (
                <section className="mil-section">
                    <h2 className="mil-section-heading">Formazione</h2>
                    {data.education.map((edu: any, i: number) => (
                        <div key={i} className="mil-entry no-break"
                            style={{ marginBottom: `${eduSettings.spacing / 2}px` }}>
                            <div className="mil-entry-top">
                                <div>
                                    <div className="mil-entry-role" data-editable={`education-${i}-degree`}>
                                        {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                                    </div>
                                    <div className="mil-entry-org" data-editable={`education-${i}-school`}>{edu.school}</div>
                                </div>
                                <div className="mil-entry-date">{edu.startDate} – {edu.endDate}</div>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Projects */}
            {data.projects && data.projects.length > 0 && (
                <section className="mil-section">
                    <h2 className="mil-section-heading">Progetti Selezionati</h2>
                    {data.projects.map((proj: any, i: number) => (
                        <div key={i} className="mil-entry no-break"
                            style={{ marginBottom: `${expSettings.spacing / 1.5}px` }}>
                            <div className="mil-entry-top">
                                <div>
                                    <div className="mil-entry-role">
                                        {proj.name}
                                        {proj.link && <a href={proj.link} className="mil-link"> ↗</a>}
                                    </div>
                                    {proj.techStack && <div className="mil-entry-org">{proj.techStack}</div>}
                                </div>
                            </div>
                            <div className="mil-bullets text-wrap">
                                {splitDescription(proj.description).map((line: string, li: number) => (
                                    <div key={li} className="mil-bullet">◦ {line}</div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {/* Two-col footer */}
            <div className="mil-footer-grid">
                {skills.length > 0 && (
                    <section className="mil-section">
                        <h2 className="mil-section-heading">Competenze</h2>
                        <div className="mil-skills">
                            {skills.map((s: string, i: number) => (
                                <span key={i} className="mil-skill">{s}</span>
                            ))}
                        </div>
                    </section>
                )}

                <div>
                    {data.languages && data.languages.length > 0 && (
                        <section className="mil-section">
                            <h2 className="mil-section-heading">Lingue</h2>
                            <p className="mil-body">{data.languages.join(' · ')}</p>
                        </section>
                    )}
                    {data.certifications && data.certifications.length > 0 && (
                        <section className="mil-section">
                            <h2 className="mil-section-heading">Certificazioni</h2>
                            {data.certifications.map((c: string, i: number) => (
                                <div key={i} className="mil-bullet">◦ {c}</div>
                            ))}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export const MILANO_STYLES = `
${BASE_STYLES}

.milano-template {
    font-family: 'Garamond', 'Georgia', 'Times New Roman', serif;
    padding: 36px 44px 40px;
    color: #1a1a1a;
    font-size: 11.5px;
}

/* Header */
.mil-header {
    text-align: center;
    margin-bottom: 22px;
}

.mil-name-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 6px;
}

.mil-name {
    font-size: 30px;
    font-weight: 700;
    color: #0F2C5A;
    letter-spacing: 2px;
    font-variant: small-caps;
    line-height: 1.1;
}

.mil-ornament {
    font-size: 14px;
    color: #C8AA6E;
    letter-spacing: 4px;
    flex-shrink: 0;
}

.mil-title {
    font-size: 12px;
    color: #555;
    font-style: italic;
    margin-bottom: 10px;
    font-family: 'Georgia', serif;
}

.mil-contact-bar {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px;
    font-size: 10px;
    color: #555;
    font-family: 'Arial', sans-serif;
    margin-bottom: 14px;
}

.mil-contact-item {}

.mil-sep {
    color: #C8AA6E;
}

.mil-header-rule {
    display: flex;
    align-items: center;
    gap: 8px;
}

.mil-rule-left,
.mil-rule-right {
    flex: 1;
    height: 1px;
    background: #C8AA6E;
}

.mil-rule-diamond {
    font-size: 8px;
    color: #C8AA6E;
}

/* Sections */
.mil-section {
    margin-bottom: 14px;
}

.mil-section-heading {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #0F2C5A;
    margin-bottom: 8px;
    font-family: 'Arial', sans-serif;
    padding-bottom: 3px;
    border-bottom: 1px solid #C8AA6E;
}

.mil-body {
    font-size: 11.5px;
    color: #333;
    text-align: justify;
    line-height: 1.6;
}

/* Entries */
.mil-entry {
    margin-bottom: 10px;
}

.mil-entry-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 3px;
}

.mil-entry-role {
    font-size: 12.5px;
    font-weight: 700;
    color: #0F2C5A;
    margin-bottom: 1px;
}

.mil-entry-org {
    font-size: 11px;
    color: #666;
    font-style: italic;
}

.mil-entry-date {
    font-size: 10px;
    color: #888;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: 'Arial', sans-serif;
}

.mil-bullets {
    margin-top: 3px;
}

.mil-bullet {
    font-size: 11px;
    color: #444;
    margin-bottom: 2px;
    line-height: 1.55;
}

.mil-link {
    font-size: 10.5px;
    color: #0F2C5A;
    text-decoration: none;
}

/* Footer */
.mil-footer-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.mil-skills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.mil-skill {
    font-size: 10px;
    color: #0F2C5A;
    border: 1px solid #C8AA6E;
    padding: 2px 8px;
    border-radius: 2px;
    font-family: 'Arial', sans-serif;
}
`;

export function generateMilanoHtml(data: any, designSettings?: any): string {
    const { renderToStaticMarkup } = require('react-dom/server');
    const html = renderToStaticMarkup(<MilanoTemplate data={data} designSettings={designSettings} />);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${data.fullName} - Curriculum Vitae</title>
<style>${MILANO_STYLES}</style>
</head>
<body>${html}</body>
</html>`.trim();
}
