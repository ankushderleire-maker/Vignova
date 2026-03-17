import React, { useState } from 'react';
import { Settings, Type, AlignJustify, MoveVertical, Layers } from 'lucide-react';

export interface SectionDesign {
    fontSize: number;
    lineHeight: number;
    spacing: number; // For sections, this usually means bottom margin
}

export interface DesignSettings {
    global: SectionDesign;
    header?: SectionDesign;
    summary?: SectionDesign;
    experience?: SectionDesign;
    education?: SectionDesign;
    skills?: SectionDesign;
    colors?: {
        primary?: string;
        secondary?: string;
    };
}

interface DesignControlsProps {
    settings: DesignSettings;
    onChange: (newSettings: DesignSettings) => void;
    // Optional props for controlled mode (Click-to-Edit)
    activeSection?: keyof DesignSettings;
    onSectionChange?: (section: keyof DesignSettings) => void;
}

const SECTIONS = [
    { id: 'global', label: 'Global' },
    { id: 'header', label: 'Header' },
    { id: 'summary', label: 'Summary' },
    { id: 'experience', label: 'Experience' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
];

export const DesignControls: React.FC<DesignControlsProps> = ({
    settings,
    onChange,
    activeSection: propActiveSection,
    onSectionChange
}) => {
    const [internalActiveSection, setInternalActiveSection] = useState<keyof DesignSettings>('global');

    // Use prop if available (controlled), otherwise local state
    const activeSection = propActiveSection || internalActiveSection;

    // Helper to safely get the current section settings
    const currentSettings: SectionDesign = activeSection === 'colors'
        ? settings.global
        : (settings[activeSection] || settings.global) as SectionDesign;

    const handleSectionSwitch = (section: keyof DesignSettings) => {
        if (section === 'colors') return; // Colors handled separately
        setInternalActiveSection(section);
        onSectionChange?.(section);
    };

    const handleChange = (field: keyof SectionDesign, value: number) => {
        onChange({
            ...settings,
            [activeSection]: {
                ...currentSettings,
                [field]: value
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* Section Selector */}
            <div>
                <div className="flex items-center gap-2 mb-3 text-xs text-gray-400 uppercase font-bold tracking-wider">
                    <Layers className="w-3 h-3" /> Target Section
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {SECTIONS.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => handleSectionSwitch(section.id as keyof DesignSettings)}
                            className={`text-[10px] py-1.5 px-2 rounded border transition-colors ${activeSection === section.id
                                ? 'bg-[var(--primary)] border-[var(--primary)] text-white'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {section.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[1px] bg-white/10 my-4" />

            <div>
                <Label icon={<Type className="w-3 h-3" />} text="Font Size" value={`${currentSettings.fontSize}px`} />
                <input
                    type="range"
                    min="8"
                    max="24"
                    step="0.5"
                    value={currentSettings.fontSize}
                    onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                />
            </div>

            <div>
                <Label icon={<AlignJustify className="w-3 h-3" />} text="Line Height" value={currentSettings.lineHeight.toFixed(1)} />
                <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={currentSettings.lineHeight}
                    onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                />
            </div>

            <div>
                <Label icon={<MoveVertical className="w-3 h-3" />} text="Spacing / Margin" value={currentSettings.spacing} />
                <input
                    type="range"
                    min="0"
                    max="60"
                    step="2"
                    value={currentSettings.spacing}
                    onChange={(e) => handleChange('spacing', parseInt(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
                />
            </div>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-[10px] text-blue-200">
                    <span className="font-bold">Note:</span> Adjusting <strong>{SECTIONS.find(s => s.id === activeSection)?.label}</strong> settings will override Global settings for that specific section.
                </p>
            </div>
        </div>
    );
};

const Label = ({ icon, text, value }: { icon: any, text: string, value: any }) => (
    <div className="flex justify-between items-center mb-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium uppercase tracking-wider">{text}</span>
        </div>
        <span className="text-white font-mono bg-white/5 px-1.5 py-0.5 rounded">{value}</span>
    </div>
);
