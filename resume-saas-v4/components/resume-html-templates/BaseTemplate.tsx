import React from 'react';
import { ResumeData } from '@/types/resume';
import { DesignSettings, SectionDesign } from '@/components/resume-engine/DesignControls';

export interface HtmlTemplateProps {
    data: ResumeData;
    designSettings?: DesignSettings;
}

/**
 * Helper to get settings for a section, falling back to global
 */
export function getSettings(
    designSettings: DesignSettings | undefined,
    section: keyof DesignSettings
): SectionDesign {
    const global = designSettings?.global || { fontSize: 14, lineHeight: 1.5, spacing: 15 };

    if (section === 'colors') return global; // Should not happen, but safe fallback

    return (designSettings?.[section] as SectionDesign) || global;
}

/**
 * Generate inline CSS variables from design settings
 */
export function getCssVariables(designSettings?: DesignSettings): React.CSSProperties {
    const global = getSettings(designSettings, 'global');
    const header = getSettings(designSettings, 'header');
    const summary = getSettings(designSettings, 'summary');
    const experience = getSettings(designSettings, 'experience');
    const education = getSettings(designSettings, 'education');
    const skills = getSettings(designSettings, 'skills');

    return {
        '--font-size-base': `${global.fontSize}px`,
        '--line-height-base': `${global.lineHeight}`,
        '--spacing-base': `${global.spacing}px`,
        '--primary-color': designSettings?.colors?.primary || '#667eea',
        '--secondary-color': designSettings?.colors?.secondary || '#764ba2',
        '--header-font-size': `${header.fontSize}px`,
        '--header-line-height': `${header.lineHeight}`,
        '--header-spacing': `${header.spacing}px`,
        '--summary-font-size': `${summary.fontSize}px`,
        '--summary-line-height': `${summary.lineHeight}`,
        '--summary-spacing': `${summary.spacing}px`,
        '--experience-font-size': `${experience.fontSize}px`,
        '--experience-line-height': `${experience.lineHeight}`,
        '--experience-spacing': `${experience.spacing}px`,
        '--education-font-size': `${education.fontSize}px`,
        '--education-line-height': `${education.lineHeight}`,
        '--education-spacing': `${education.spacing}px`,
        '--skills-font-size': `${skills.fontSize}px`,
        '--skills-line-height': `${skills.lineHeight}`,
        '--skills-spacing': `${skills.spacing}px`,
    } as React.CSSProperties;
}

/**
 * Base wrapper for all HTML templates
 * Provides A4 sizing and common styles
 */
export const BaseWrapper: React.FC<{
    children: React.ReactNode;
    designSettings?: DesignSettings;
    className?: string;
}> = ({ children, designSettings, className = '' }) => {
    return (
        <div
            className={`resume-page ${className}`}
            style={getCssVariables(designSettings)}
        >
            {children}
        </div>
    );
};

/**
 * Common CSS for all templates - include this in the full HTML
 */
export const BASE_STYLES = `
/* Base CSS for all templates */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

/* Ensure A4 size */
@page {
    size: A4;
    margin: 0;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    background: #525659; /* Grey background for preview */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    min-height: 100vh;
    padding: 20px 0;
    margin: 0;
}

.resume-page {
    width: 210mm;
    min-height: 297mm;
    padding: 40px;
    background: white;
    color: #333;
    font-size: var(--font-size-base, 14px);
    line-height: var(--line-height-base, 1.5);
    margin: 0 auto;
    position: relative;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

/* Prevent awkward page breaks */
.no-break {
    page-break-inside: avoid;
    break-inside: avoid;
}

/* Text overflow handling */
.text-wrap {
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
}

/* Flex wrap for tags/skills */
.flex-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

/* Print-specific styles for Puppeteer */
@media print {
    body {
        margin: 0;
        padding: 0;
        background: white;
        display: block; /* Ensure block layout for PDF */
    }
    
    .resume-page {
        margin: 0; /* No margin for PDF */
        box-shadow: none;
        page-break-after: always;
        width: 210mm;
        /* Let individual templates control their own padding */
        box-sizing: border-box;
    }
}
`;
