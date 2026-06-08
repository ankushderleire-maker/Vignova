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

export type TemplateId = 'modern' | 'classic' | 'creative' | 'professional' | 'minimal' | 'executive' | 'elegant' | 'tech' | 'corporate' | 'luxe' | 'nordic' | 'bold' | 'compact' | 'accent' | 'diamond' | 'cascade' | 'horizon' | 'atlas' | 'prism' | 'chronicle';

export interface TemplateMetadata {
    id: TemplateId;
    name: string;
    description: string;
    thumbnail: string;
    isPremium?: boolean;
}

export const TEMPLATES: TemplateMetadata[] = [
    {
        id: 'modern',
        name: 'Modern',
        description: 'Clean contemporary design',
        thumbnail: '/templates/modern-thumb.png'
    },
    {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional professional look',
        thumbnail: '/templates/classic-thumb.png'
    },
    {
        id: 'creative',
        name: 'Creative',
        description: 'Bold and colorful design',
        thumbnail: '/templates/creative-thumb.png',
        isPremium: true
    },
    {
        id: 'professional',
        name: 'Professional',
        description: 'Executive-level template',
        thumbnail: '/templates/professional-thumb.png'
    },
    {
        id: 'minimal',
        name: 'Minimal',
        description: 'Simple and elegant',
        thumbnail: '/templates/minimal-thumb.png',
        isPremium: true
    },
    {
        id: 'executive',
        name: 'Executive',
        description: 'Corporate navy & gold design',
        thumbnail: '/templates/executive-thumb.png',
        isPremium: true
    },
    {
        id: 'elegant',
        name: 'Elegant',
        description: 'Refined serif with teal accents',
        thumbnail: '/templates/elegant-thumb.png'
    },
    {
        id: 'tech',
        name: 'Tech',
        description: 'Developer-focused terminal style',
        thumbnail: '/templates/tech-thumb.png'
    },
    {
        id: 'corporate',
        name: 'Corporate',
        description: 'Dark sidebar corporate layout',
        thumbnail: '/templates/corporate-thumb.png',
        isPremium: true
    },
    {
        id: 'luxe',
        name: 'Luxe',
        description: 'Premium black & gold design',
        thumbnail: '/templates/luxe-thumb.png',
        isPremium: true
    },
    {
        id: 'nordic',
        name: 'Nordic',
        description: 'Clean Scandinavian aesthetic',
        thumbnail: '/templates/nordic-thumb.png'
    },
    {
        id: 'bold',
        name: 'Bold',
        description: 'Strong typography with red accents',
        thumbnail: '/templates/bold-thumb.png'
    },
    {
        id: 'compact',
        name: 'Compact',
        description: 'Dense info-packed layout',
        thumbnail: '/templates/compact-thumb.png'
    },
    {
        id: 'accent',
        name: 'Accent',
        description: 'Colorful section borders',
        thumbnail: '/templates/accent-thumb.png'
    },
    {
        id: 'diamond',
        name: 'Diamond',
        description: 'Emerald geometric two-column',
        thumbnail: '/templates/diamond-thumb.png',
        isPremium: true
    },
    {
        id: 'cascade',
        name: 'Cascade',
        description: 'Indigo sidebar with clean main column',
        thumbnail: '/templates/cascade-thumb.png',
    },
    {
        id: 'horizon',
        name: 'Horizon',
        description: 'Teal gradient header, skill chips',
        thumbnail: '/templates/horizon-thumb.png',
    },
    {
        id: 'atlas',
        name: 'Atlas',
        description: 'Swiss grid design with red accents',
        thumbnail: '/templates/atlas-thumb.png',
        isPremium: true
    },
    {
        id: 'prism',
        name: 'Prism',
        description: 'Purple gradient, rounded badges',
        thumbnail: '/templates/prism-thumb.png',
        isPremium: true
    },
    {
        id: 'chronicle',
        name: 'Chronicle',
        description: 'Timeline layout with amber accents',
        thumbnail: '/templates/chronicle-thumb.png',
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
    selectedTemplate: 'modern',
    hoveredTemplate: null,

    setResumeData: (data) => set({ resumeData: data }),
    setSelectedTemplate: (template) => set({ selectedTemplate: template, hoveredTemplate: null }),
    setHoveredTemplate: (template) => set({ hoveredTemplate: template }),

    getActiveTemplate: () => {
        const { hoveredTemplate, selectedTemplate } = get();
        return hoveredTemplate || selectedTemplate;
    }
}));
