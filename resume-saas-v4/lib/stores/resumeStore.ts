import { create } from 'zustand';
import { ResumeData } from '@/types/resume';

// Placeholder resume data for template previews
export const PLACEHOLDER_RESUME_DATA: ResumeData = {
    fullName: "Captain Jack Sparrow",
    jobTitle: "Pirate Lord of the Caribbean Sea",
    contact: {
        email: "jack@blackpearl.sea",
        phone: "+1 800 RUM PLZ",
        location: "Tortuga, Caribbean",
        linkedin: "linkedin.com/in/captain-jack",
        website: "blackpearl.com"
    },
    summary: "Infamous Pirate Lord of the Caribbean Sea, captain of the Black Pearl. Expert in unconventional negotiation, escaping impossible situations, and acquiring priceless artifacts. Highly skilled in sword fighting, naval combat, and charming both allies and enemies.",
    skills: [
        "Navigation",
        "Sailing",
        "Sword Fighting",
        "Negotiation",
        "Marksmanship",
        "Leadership",
        "Improvisation",
        "Rum Appreciation",
        "Escapology",
        "Charisma",
        "Treasure Hunting",
        "Seamanship"
    ],
    experience: [
        {
            id: "1",
            company: "The Black Pearl",
            role: "Captain",
            startDate: "1720",
            endDate: "Present",
            location: "Caribbean Sea",
            description: [
                "Commanded the fastest ship in the Caribbean, specializing in daring raids and evading the Royal Navy.",
                "Successfully recovered the Black Pearl from mutineer Hector Barbossa after a 10-year exile.",
                "Navigated out of Davy Jones' Locker and defeated the Kraken."
            ]
        },
        {
            id: "2",
            company: "East India Trading Co.",
            role: "Contractor (Briefly)",
            startDate: "1715",
            endDate: "1718",
            location: "Various",
            description: [
                "Refused to transport slaves, famously liberating them and subsequently being branded a pirate by Cutler Beckett.",
                "Aquired the Wicked Wench (later renamed the Black Pearl)."
            ]
        }
    ],
    education: [
        {
            id: "1",
            school: "University of Technology",
            degree: "B.Tech in Computer Science",
            field: "Computer Science",
            startDate: "2018",
            endDate: "2022"
        }
    ],
    projects: [],
    certifications: ["AWS Certified ML Specialty", "TensorFlow Developer Certificate"],
    languages: ["English", "Hindi", "Marathi"]
};

export type TemplateId = 'modern' | 'classic' | 'creative' | 'professional' | 'minimal' | 'executive' | 'elegant' | 'tech' | 'corporate' | 'luxe' | 'nordic' | 'bold' | 'compact' | 'accent' | 'diamond' | 'cascade' | 'horizon' | 'atlas' | 'prism' | 'chronicle' | 'europass' | 'cambridge' | 'berlin' | 'geneva' | 'milano' | 'signature' | 'meridian';

export interface TemplateMetadata {
    id: TemplateId;
    name: string;
    description: string;
    thumbnail: string;
    isPremium?: boolean;
    /**
     * How the page reads, which is the only structural choice that matters
     * to an ATS: does the content flow in one column, or is it split across
     * two?
     *
     * Judged on whether whole sections sit side by side, not on whether the
     * markup uses a grid — several single-column templates use a narrow
     * gutter for dates or labels beside each section, which a parser still
     * reads top to bottom.
     */
    layout: "single" | "two";
}

export const TEMPLATES: TemplateMetadata[] = [
    {
        id: 'modern',
        layout: "single",
        name: 'Modern',
        description: 'Clean contemporary design',
        thumbnail: '/templates/modern-thumb.png'
    },
    {
        id: 'classic',
        layout: "single",
        name: 'Classic',
        description: 'Traditional professional look',
        thumbnail: '/templates/classic-thumb.png'
    },
    {
        id: 'creative',
        layout: "two",
        name: 'Creative',
        description: 'Bold and colorful design',
        thumbnail: '/templates/creative-thumb.png',
        isPremium: true
    },
    {
        id: 'professional',
        layout: "two",
        name: 'Professional',
        description: 'Executive-level template',
        thumbnail: '/templates/professional-thumb.png'
    },
    {
        id: 'minimal',
        layout: "single",
        name: 'Minimal',
        description: 'Simple and elegant',
        thumbnail: '/templates/minimal-thumb.png',
        isPremium: true
    },
    {
        id: 'executive',
        layout: "two",
        name: 'Executive',
        description: 'Corporate navy & gold design',
        thumbnail: '/templates/executive-thumb.png',
        isPremium: true
    },
    {
        id: 'elegant',
        layout: "single",
        name: 'Elegant',
        description: 'Refined serif with teal accents',
        thumbnail: '/templates/elegant-thumb.png'
    },
    {
        id: 'tech',
        layout: "single",
        name: 'Tech',
        description: 'Developer-focused terminal style',
        thumbnail: '/templates/tech-thumb.png'
    },
    {
        id: 'corporate',
        layout: "two",
        name: 'Corporate',
        description: 'Dark sidebar corporate layout',
        thumbnail: '/templates/corporate-thumb.png',
        isPremium: true
    },
    {
        id: 'luxe',
        layout: "single",
        name: 'Luxe',
        description: 'Premium black & gold design',
        thumbnail: '/templates/luxe-thumb.png',
        isPremium: true
    },
    {
        id: 'nordic',
        layout: "single",
        name: 'Nordic',
        description: 'Clean Scandinavian aesthetic',
        thumbnail: '/templates/nordic-thumb.png'
    },
    {
        id: 'bold',
        layout: "single",
        name: 'Bold',
        description: 'Strong typography with red accents',
        thumbnail: '/templates/bold-thumb.png'
    },
    {
        id: 'compact',
        layout: "single",
        name: 'Compact',
        description: 'Dense info-packed layout',
        thumbnail: '/templates/compact-thumb.png'
    },
    {
        id: 'accent',
        layout: "single",
        name: 'Accent',
        description: 'Colorful section borders',
        thumbnail: '/templates/accent-thumb.png'
    },
    {
        id: 'diamond',
        layout: "two",
        name: 'Diamond',
        description: 'Emerald geometric two-column',
        thumbnail: '/templates/diamond-thumb.png',
        isPremium: true
    },
    {
        id: 'cascade',
        layout: "two",
        name: 'Cascade',
        description: 'Indigo sidebar with clean main column',
        thumbnail: '/templates/cascade-thumb.png',
    },
    {
        id: 'horizon',
        layout: "two",
        name: 'Horizon',
        description: 'Teal gradient header, skill chips',
        thumbnail: '/templates/horizon-thumb.png',
    },
    {
        id: 'atlas',
        layout: "single",
        name: 'Atlas',
        description: 'Swiss grid design with red accents',
        thumbnail: '/templates/atlas-thumb.png',
        isPremium: true
    },
    {
        id: 'prism',
        layout: "two",
        name: 'Prism',
        description: 'Purple gradient, rounded badges',
        thumbnail: '/templates/prism-thumb.png',
        isPremium: true
    },
    {
        id: 'chronicle',
        layout: "single",
        name: 'Chronicle',
        description: 'Timeline layout with amber accents',
        thumbnail: '/templates/chronicle-thumb.png',
    },
    {
        id: 'europass',
        layout: "two",
        name: 'Europass',
        description: 'Official EU Europass CV format',
        thumbnail: '/templates/europass-thumb.png',
    },
    {
        id: 'cambridge',
        layout: "single",
        name: 'Cambridge',
        description: 'Classic British serif CV, no colour',
        thumbnail: '/templates/cambridge-thumb.png',
    },
    {
        id: 'berlin',
        layout: "two",
        name: 'Berlin',
        description: 'German Lebenslauf — structured & formal',
        thumbnail: '/templates/berlin-thumb.png',
    },
    {
        id: 'geneva',
        layout: "single",
        name: 'Geneva',
        description: 'Swiss minimal label-column layout',
        thumbnail: '/templates/geneva-thumb.png',
    },
    {
        id: 'signature',
        layout: "single",
        name: 'Signature',
        description: 'Letter-spaced header, grouped skills — our house layout',
        thumbnail: '/templates/signature-thumb.png',
    },
    {
        id: 'meridian',
        layout: "single",
        name: 'Meridian',
        description: 'Ruled headings, employer under the role, impact lines',
        thumbnail: '/templates/meridian-thumb.png',
    },
    {
        id: 'milano',
        layout: "two",
        name: 'Milano',
        description: 'Italian elegant serif with gold accents',
        thumbnail: '/templates/milano-thumb.png',
        isPremium: true,
    }
];

interface ResumeStore {
    resumeData: ResumeData;
    selectedTemplate: TemplateId;
    hoveredTemplate: TemplateId | null;

    setResumeData: (data: ResumeData) => void;
    setSelectedTemplate: (template: TemplateId) => void;
    setHoveredTemplate: (template: TemplateId | null) => void;

    // Computed value for active template
    getActiveTemplate: () => TemplateId;
}

export const useResumeStore = create<ResumeStore>((set, get) => ({
    resumeData: PLACEHOLDER_RESUME_DATA,
    selectedTemplate: 'signature',
    hoveredTemplate: null,

    setResumeData: (data) => set({ resumeData: data }),
    setSelectedTemplate: (template) => set({ selectedTemplate: template, hoveredTemplate: null }),
    setHoveredTemplate: (template) => set({ hoveredTemplate: template }),

    getActiveTemplate: () => {
        const { hoveredTemplate, selectedTemplate } = get();
        return hoveredTemplate || selectedTemplate;
    }
}));
