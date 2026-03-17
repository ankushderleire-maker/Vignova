"use client";

import React, { useState, useEffect } from 'react';
import {
    Bold, Italic, Underline, AlignLeft, AlignCenter,
    AlignRight, AlignJustify, ChevronDown, Type
} from 'lucide-react';

export interface TextFormatting {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontFamily?: string;
    fontSize?: number;
    alignment?: 'left' | 'center' | 'right' | 'justify';
    color?: string;
}

interface FormattingToolbarProps {
    position: { x: number; y: number };
    currentFormatting: TextFormatting;
    onFormatChange: (formatting: Partial<TextFormatting>) => void;
    onClose: () => void;
}

const FONT_FAMILIES = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Roboto', value: 'Roboto, sans-serif' },
    { name: 'Lato', value: 'Lato, sans-serif' },
    { name: 'Open Sans', value: '"Open Sans", sans-serif' },
    { name: 'Montserrat', value: 'Montserrat, sans-serif' },
    { name: 'Playfair', value: '"Playfair Display", serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times', value: '"Times New Roman", serif' },
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24];

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
    position,
    currentFormatting,
    onFormatChange,
    onClose
}) => {
    const [showFontMenu, setShowFontMenu] = useState(false);
    const [showSizeMenu, setShowSizeMenu] = useState(false);

    // Close toolbar on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const toggleFormat = (format: keyof TextFormatting) => {
        onFormatChange({ [format]: !currentFormatting[format] });
    };

    const setAlignment = (alignment: TextFormatting['alignment']) => {
        onFormatChange({ alignment });
    };

    const currentFontFamily = FONT_FAMILIES.find(f => f.value === currentFormatting.fontFamily)?.name || 'Inter';
    const currentFontSize = currentFormatting.fontSize || 12;

    return (
        <>
            {/* Backdrop to close menus */}
            {(showFontMenu || showSizeMenu) && (
                <div
                    className="fixed inset-0 z-[60]"
                    onClick={() => {
                        setShowFontMenu(false);
                        setShowSizeMenu(false);
                    }}
                />
            )}

            {/* Main Toolbar */}
            <div
                className="fixed z-[70] bg-[#1a1a1a] border border-white/20 rounded-lg shadow-2xl flex items-center gap-1 p-2"
                style={{
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    transform: 'translateY(-100%) translateY(-12px)',
                }}
            >
                {/* Text Style Buttons */}
                <button
                    onClick={() => toggleFormat('bold')}
                    className={`p-2 rounded hover:bg-white/10 transition ${currentFormatting.bold ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white'}`}
                    title="Bold (Ctrl+B)"
                >
                    <Bold className="w-4 h-4" />
                </button>
                <button
                    onClick={() => toggleFormat('italic')}
                    className={`p-2 rounded hover:bg-white/10 transition ${currentFormatting.italic ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white'}`}
                    title="Italic (Ctrl+I)"
                >
                    <Italic className="w-4 h-4" />
                </button>
                <button
                    onClick={() => toggleFormat('underline')}
                    className={`p-2 rounded hover:bg-white/10 transition ${currentFormatting.underline ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white'}`}
                    title="Underline (Ctrl+U)"
                >
                    <Underline className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-6 bg-white/20 mx-1" />

                {/* Font Family Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowFontMenu(!showFontMenu);
                            setShowSizeMenu(false);
                        }}
                        className="px-3 py-2 rounded hover:bg-white/10 transition text-white text-xs flex items-center gap-2 min-w-[100px]"
                    >
                        <Type className="w-3 h-3" />
                        <span>{currentFontFamily}</span>
                        <ChevronDown className="w-3 h-3 ml-auto" />
                    </button>
                    {showFontMenu && (
                        <div className="absolute top-full left-0 mt-2 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-2xl py-1 min-w-[140px] z-[80] max-h-[300px] overflow-y-auto">
                            {FONT_FAMILIES.map((font) => (
                                <button
                                    key={font.value}
                                    onClick={() => {
                                        onFormatChange({ fontFamily: font.value });
                                        setShowFontMenu(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-xs hover:bg-white/10 transition ${currentFontFamily === font.name ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white'
                                        }`}
                                    style={{ fontFamily: font.value }}
                                >
                                    {font.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Font Size Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => {
                            setShowSizeMenu(!showSizeMenu);
                            setShowFontMenu(false);
                        }}
                        className="px-3 py-2 rounded hover:bg-white/10 transition text-white text-xs flex items-center gap-2"
                    >
                        <span>{currentFontSize}px</span>
                        <ChevronDown className="w-3 h-3" />
                    </button>
                    {showSizeMenu && (
                        <div className="absolute top-full left-0 mt-2 bg-[#1a1a1a] border border-white/20 rounded-lg shadow-2xl py-1 min-w-[80px] z-[80] max-h-[300px] overflow-y-auto">
                            {FONT_SIZES.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => {
                                        onFormatChange({ fontSize: size });
                                        setShowSizeMenu(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-xs hover:bg-white/10 transition ${currentFontSize === size ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white'
                                        }`}
                                >
                                    {size}px
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-[1px] h-6 bg-white/20 mx-1" />

                {/* Alignment Buttons */}
                <button
                    onClick={() => setAlignment('left')}
                    className={`p-2 rounded hover:bg-white/10 transition ${currentFormatting.alignment === 'left' ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white'}`}
                    title="Align Left"
                >
                    <AlignLeft className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setAlignment('center')}
                    className={`p-2 rounded hover:bg-white/10 transition ${currentFormatting.alignment === 'center' ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white'}`}
                    title="Align Center"
                >
                    <AlignCenter className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setAlignment('right')}
                    className={`p-2 rounded hover:bg-white/10 transition ${currentFormatting.alignment === 'right' ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white'}`}
                    title="Align Right"
                >
                    <AlignRight className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setAlignment('justify')}
                    className={`p-2 rounded hover:bg-white/10 transition ${currentFormatting.alignment === 'justify' ? 'bg-[var(--primary)]/20 text-[var(--primary)]' : 'text-white'}`}
                    title="Justify"
                >
                    <AlignJustify className="w-4 h-4" />
                </button>
            </div>
        </>
    );
};
