// HTML Resume Templates
// These templates render to HTML/CSS for perfect text handling and PDF generation

export { ClassicTemplate, CLASSIC_STYLES, generateClassicHtml } from './ClassicTemplate';
export { ModernTemplate, MODERN_STYLES, generateModernHtml } from './ModernTemplate';
export { CreativeTemplate, CREATIVE_STYLES, generateCreativeHtml } from './CreativeTemplate';
export { ProfessionalTemplate, PROFESSIONAL_STYLES, generateProfessionalHtml } from './ProfessionalTemplate';
export { MinimalTemplate, MINIMAL_STYLES, generateMinimalHtml } from './MinimalTemplate';
export { ExecutiveTemplate, EXECUTIVE_STYLES, generateExecutiveHtml } from './ExecutiveTemplate';
export { ElegantTemplate, ELEGANT_STYLES, generateElegantHtml } from './ElegantTemplate';
export { TechTemplate, TECH_STYLES, generateTechHtml } from './TechTemplate';
export { CorporateTemplate, CORPORATE_STYLES, generateCorporateHtml } from './CorporateTemplate';
export { LuxeTemplate, LUXE_STYLES, generateLuxeHtml } from './LuxeTemplate';
export { NordicTemplate, NORDIC_STYLES, generateNordicHtml } from './NordicTemplate';
export { BoldTemplate, BOLD_STYLES, generateBoldHtml } from './BoldTemplate';
export { CompactTemplate, COMPACT_STYLES, generateCompactHtml } from './CompactTemplate';
export { AccentTemplate, ACCENT_STYLES, generateAccentHtml } from './AccentTemplate';
export { DiamondTemplate, DIAMOND_STYLES, generateDiamondHtml } from './DiamondTemplate';
export type { HtmlTemplateProps } from './BaseTemplate';
export { getSettings, getCssVariables, BaseWrapper, BASE_STYLES } from './BaseTemplate';

// Template registry for dynamic loading
import { generateClassicHtml } from './ClassicTemplate';
import { generateModernHtml } from './ModernTemplate';
import { generateCreativeHtml } from './CreativeTemplate';
import { generateProfessionalHtml } from './ProfessionalTemplate';
import { generateMinimalHtml } from './MinimalTemplate';
import { generateExecutiveHtml } from './ExecutiveTemplate';
import { generateElegantHtml } from './ElegantTemplate';
import { generateTechHtml } from './TechTemplate';
import { generateCorporateHtml } from './CorporateTemplate';
import { generateLuxeHtml } from './LuxeTemplate';
import { generateNordicHtml } from './NordicTemplate';
import { generateBoldHtml } from './BoldTemplate';
import { generateCompactHtml } from './CompactTemplate';
import { generateAccentHtml } from './AccentTemplate';
import { generateDiamondHtml } from './DiamondTemplate';

export type TemplateId =
    | 'classic'
    | 'modern'
    | 'creative'
    | 'professional'
    | 'minimal'
    | 'executive'
    | 'elegant'
    | 'tech'
    | 'corporate'
    | 'luxe'
    | 'nordic'
    | 'bold'
    | 'compact'
    | 'accent'
    | 'diamond';

/**
 * Map of template IDs to their HTML generator functions
 */
export const HTML_TEMPLATE_GENERATORS: Record<TemplateId, (data: any, designSettings?: any) => string> = {
    classic: generateClassicHtml,
    modern: generateModernHtml,
    creative: generateCreativeHtml,
    professional: generateProfessionalHtml,
    minimal: generateMinimalHtml,
    executive: generateExecutiveHtml,
    elegant: generateElegantHtml,
    tech: generateTechHtml,
    corporate: generateCorporateHtml,
    luxe: generateLuxeHtml,
    nordic: generateNordicHtml,
    bold: generateBoldHtml,
    compact: generateCompactHtml,
    accent: generateAccentHtml,
    diamond: generateDiamondHtml,
};

/**
 * Get the HTML generator for a template
 */
export function getTemplateGenerator(templateId: string): (data: any, designSettings?: any) => string {
    return HTML_TEMPLATE_GENERATORS[templateId as TemplateId] || generateClassicHtml;
}
