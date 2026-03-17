export type TemplateConfig = {
    id: string;
    name: string;
    type: "single-column" | "two-column";
    styles?: any; // Page padding, font family, etc.
    sections?: string[]; // For single column
    columns?: { left: string[], right: string[] }; // For two column
    layout?: { leftColWidth: string, rightColWidth: string, leftBg: string };
};

export const TEMPLATE_MAP: Record<string, any> = {};

export const AVAILABLE_TEMPLATES: TemplateConfig[] = [
    {
        id: "modern",
        name: "Modern Sidebar",
        type: "two-column",
        styles: { fontFamily: 'Helvetica' },
        layout: { leftColWidth: "30%", rightColWidth: "70%", leftBg: "#f8fafc" },
        columns: { left: ["contact", "skills", "education"], right: ["header", "summary", "experience", "projects"] }
    },
    {
        id: "classic",
        name: "Classic Elegant",
        type: "single-column",
        styles: { fontFamily: 'Times-Roman', padding: 40 },
        sections: ["header", "summary", "experience", "education", "skills"]
    },
    {
        id: "bold",
        name: "Bold Impact",
        type: "single-column",
        styles: { fontFamily: 'Helvetica-Bold' },
        sections: ["header", "summary", "experience", "skills", "education"]
    },
    {
        id: "minimalist",
        name: "Minimalist Clean",
        type: "single-column",
        styles: { fontFamily: 'Helvetica', padding: 30 },
        sections: ["header", "summary", "skills", "experience", "education"]
    },
    {
        id: "executive",
        name: "Executive Pro",
        type: "two-column",
        styles: { fontFamily: 'Times-Roman' },
        layout: { leftColWidth: "70%", rightColWidth: "30%", leftBg: "#ffffff" },
        columns: { left: ["header", "summary", "experience"], right: ["contact", "skills", "education"] }
    },
    {
        id: "tech",
        name: "Tech Modern",
        type: "single-column",
        styles: { fontFamily: 'Courier' },
        sections: ["header", "skills", "experience", "projects", "education"]
    },
    {
        id: "creative",
        name: "Creative Studio",
        type: "two-column",
        styles: { fontFamily: 'Helvetica' },
        layout: { leftColWidth: "35%", rightColWidth: "65%", leftBg: "#2d3748" }, // Dark sidebar
        columns: { left: ["contact", "skills", "education"], right: ["header", "summary", "experience", "projects"] }
    },
    {
        id: "startup",
        name: "Startup Ready",
        type: "single-column",
        styles: { fontFamily: 'Helvetica' },
        sections: ["header", "summary", "projects", "experience", "skills"]
    },
    {
        id: "elegant",
        name: "Elegant Serif",
        type: "single-column",
        styles: { fontFamily: 'Times-Roman' },
        sections: ["header", "summary", "experience", "education", "skills"]
    },
    {
        id: "compact",
        name: "Compact Dense",
        type: "two-column",
        styles: { fontFamily: 'Helvetica', fontSize: 9 },
        layout: { leftColWidth: "25%", rightColWidth: "75%", leftBg: "#f3f4f6" },
        columns: { left: ["skills", "education", "contact"], right: ["header", "summary", "experience"] }
    },
    {
        id: "timeline",
        name: "Timeline View",
        type: "two-column",
        styles: { fontFamily: 'Helvetica' },
        layout: { leftColWidth: "30%", rightColWidth: "70%", leftBg: "#ffffff" },
        columns: { left: ["contact", "education", "skills"], right: ["header", "summary", "experience"] }
    },
    {
        id: "sidebar",
        name: "Simple Sidebar",
        type: "two-column",
        styles: { fontFamily: 'Helvetica' },
        layout: { leftColWidth: "30%", rightColWidth: "70%", leftBg: "#e2e8f0" },
        columns: { left: ["contact", "skills", "education"], right: ["header", "summary", "experience"] }
    }
];