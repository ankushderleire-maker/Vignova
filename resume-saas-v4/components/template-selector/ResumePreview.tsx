'use client';

import React from 'react';
import { ModernTemplate, MODERN_STYLES } from '../resume-html-templates/ModernTemplate';
import { ClassicTemplate, CLASSIC_STYLES } from '../resume-html-templates/ClassicTemplate';
import { CreativeTemplate, CREATIVE_STYLES } from '../resume-html-templates/CreativeTemplate';
import { ProfessionalTemplate, PROFESSIONAL_STYLES } from '../resume-html-templates/ProfessionalTemplate';
import { MinimalTemplate, MINIMAL_STYLES } from '../resume-html-templates/MinimalTemplate';
import { TemplateId } from '@/lib/stores/resumeStore';
import { ResumeData } from '@/types/resume';

interface ResumePreviewProps {
    templateId: TemplateId;
    resumeData: ResumeData;
    designSettings?: any;
    className?: string;
}

/**
 * Scope template CSS so it only applies inside .resume-preview-wrapper
 * This prevents the global `*` and `body` resets from leaking out
 */
function scopeStyles(css: string): string {
    // Remove the global * reset (margin:0, padding:0, box-sizing)
    // and the body styles — they break the dashboard layout
    let scoped = css
        // Remove bare * { ... } block
        .replace(/^\s*\*\s*\{[^}]*\}/m, '')
        // Remove bare body { ... } block
        .replace(/^\s*body\s*\{[^}]*\}/m, '')
        // Remove @page rules (only needed for PDF/print)
        .replace(/@page\s*\{[^}]*\}/g, '');

    // Scope .resume-page and all template classes inside our wrapper
    scoped = scoped.replace(
        /\.resume-page/g,
        '.resume-preview-wrapper .resume-page'
    );

    return scoped;
}

/**
 * Dynamic Template Renderer with Scoped CSS Injection
 */
export const ResumePreview: React.FC<ResumePreviewProps> = ({
    templateId,
    resumeData,
    designSettings,
    className = ''
}) => {
    const getTemplateStyles = () => {
        switch (templateId) {
            case 'modern': return MODERN_STYLES;
            case 'classic': return CLASSIC_STYLES;
            case 'creative': return CREATIVE_STYLES;
            case 'professional': return PROFESSIONAL_STYLES;
            case 'minimal': return MINIMAL_STYLES;
            default: return MODERN_STYLES;
        }
    };

    const renderTemplate = () => {
        const props = { data: resumeData, designSettings };
        switch (templateId) {
            case 'modern': return <ModernTemplate {...props} />;
            case 'classic': return <ClassicTemplate {...props} />;
            case 'creative': return <CreativeTemplate {...props} />;
            case 'professional': return <ProfessionalTemplate {...props} />;
            case 'minimal': return <MinimalTemplate {...props} />;
            default: return <ModernTemplate {...props} />;
        }
    };

    // Scope the CSS so it doesn't leak out
    const scopedCSS = scopeStyles(getTemplateStyles());

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: scopedCSS }} />
            <div className={`resume-preview-wrapper ${className}`}>
                {renderTemplate()}
            </div>
        </>
    );
};
