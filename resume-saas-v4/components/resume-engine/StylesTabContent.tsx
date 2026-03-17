'use client';

import React from 'react';
import { DesignControls, DesignSettings } from './DesignControls';

interface StylesTabContentProps {
    designSettings: DesignSettings;
    onDesignChange: (settings: DesignSettings) => void;
}

const PRESET_COLORS = {
    primary: [
        { name: 'Purple', value: '#667eea' },
        { name: 'Pink', value: '#f093fb' },
        { name: 'Blue', value: '#4facfe' },
        { name: 'Green', value: '#43e97b' },
        { name: 'Coral', value: '#fa709a' },
        { name: 'Orange', value: '#ff6b6b' },
        { name: 'Teal', value: '#20bf6b' },
        { name: 'Indigo', value: '#4834d4' },
    ],
    secondary: [
        { name: 'Violet', value: '#764ba2' },
        { name: 'Red', value: '#f5576c' },
        { name: 'Cyan', value: '#00f2fe' },
        { name: 'Mint', value: '#38f9d7' },
        { name: 'Yellow', value: '#fee140' },
        { name: 'Rose', value: '#eb3b5a' },
        { name: 'Aqua', value: '#0fb9b1' },
        { name: 'Purple', value: '#8854d0' },
    ]
};

export function StylesTabContent({ designSettings, onDesignChange }: StylesTabContentProps) {
    const handleColorChange = (type: 'primary' | 'secondary', color: string) => {
        onDesignChange({
            ...designSettings,
            colors: {
                ...designSettings.colors,
                [type]: color
            }
        });
    };

    const primaryColor = designSettings.colors?.primary || '#667eea';
    const secondaryColor = designSettings.colors?.secondary || '#764ba2';

    return (
        <div className="flex-1 overflow-y-auto p-6 animate-slide-down">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-2">Customize Colors</h3>
                <p className="text-sm text-gray-400">Choose colors that match your personal brand</p>
            </div>

            {/* Primary Color */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                    Primary Color
                </label>

                {/* Color Picker + Hex Input */}
                <div className="flex items-center gap-3 mb-4">
                    <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        className="w-14 h-14 rounded-lg cursor-pointer border-2 border-white/10"
                    />
                    <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white uppercase font-mono focus:outline-none focus:border-[#667eea]/50"
                        placeholder="#667eea"
                        maxLength={7}
                    />
                </div>

                {/* Preset Colors */}
                <div className="grid grid-cols-4 gap-2">
                    {PRESET_COLORS.primary.map(({ name, value }) => (
                        <button
                            key={value}
                            onClick={() => handleColorChange('primary', value)}
                            className={`
                                relative w-full aspect-square rounded-lg transition-all
                                ${primaryColor === value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111]' : 'hover:scale-105'}
                            `}
                            style={{ backgroundColor: value }}
                            title={name}
                        >
                            {primaryColor === value && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-4 bg-white rounded-full" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Secondary Color */}
            <div className="mb-8">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                    Secondary Color
                </label>

                {/* Color Picker + Hex Input */}
                <div className="flex items-center gap-3 mb-4">
                    <input
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                        className="w-14 h-14 rounded-lg cursor-pointer border-2 border-white/10"
                    />
                    <input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white uppercase font-mono focus:outline-none focus:border-[#667eea]/50"
                        placeholder="#764ba2"
                        maxLength={7}
                    />
                </div>

                {/* Preset Colors */}
                <div className="grid grid-cols-4 gap-2">
                    {PRESET_COLORS.secondary.map(({ name, value }) => (
                        <button
                            key={value}
                            onClick={() => handleColorChange('secondary', value)}
                            className={`
                                relative w-full aspect-square rounded-lg transition-all
                                ${secondaryColor === value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111]' : 'hover:scale-105'}
                            `}
                            style={{ backgroundColor: value }}
                            title={name}
                        >
                            {secondaryColor === value && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-4 h-4 bg-white rounded-full" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Typography & Spacing Controls */}
            <div className="border-t border-white/10 pt-6 mb-8">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-white mb-2">Typography & Layout</h3>
                    <p className="text-sm text-gray-400">Fine-tune fonts, spacing, and sizes.</p>
                </div>
                <DesignControls settings={designSettings} onChange={onDesignChange} />
            </div>

            {/* Color Preview */}
            <div className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-xs font-medium text-gray-400 mb-3">Color Preview</p>
                <div className="flex gap-3">
                    <div className="flex-1">
                        <div
                            className="h-24 rounded-lg mb-2 flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: primaryColor }}
                        >
                            Primary
                        </div>
                        <p className="text-xs text-gray-400 text-center font-mono">{primaryColor}</p>
                    </div>
                    <div className="flex-1">
                        <div
                            className="h-24 rounded-lg mb-2 flex items-center justify-center text-white font-bold text-sm"
                            style={{ backgroundColor: secondaryColor }}
                        >
                            Secondary
                        </div>
                        <p className="text-xs text-gray-400 text-center font-mono">{secondaryColor}</p>
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="mt-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-300">
                    💡 Colors will be applied to headings, accents, and design elements in your resume template.
                </p>
            </div>
        </div>
    );
}
