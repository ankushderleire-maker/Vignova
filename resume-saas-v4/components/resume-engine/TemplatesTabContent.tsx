'use client';

import React, { useState } from 'react';
import { useResumeStore, TEMPLATES } from '@/lib/stores/resumeStore';
import { Check, Crown, Search } from 'lucide-react';
import { TemplateThumbnail } from './TemplateThumbnail';

export function TemplatesTabContent() {
    const { selectedTemplate, setSelectedTemplate, setHoveredTemplate } = useResumeStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [layout, setLayout] = useState<'single' | 'two'>('single');

    // Layout leads, because it is the only choice here that changes how a
    // parser reads the page. Twenty-five names in a flat grid asked people
    // to pick on looks alone.
    const filteredTemplates = TEMPLATES.filter(template =>
        template.layout === layout && (
            template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const counts = {
        single: TEMPLATES.filter(t => t.layout === 'single').length,
        two: TEMPLATES.filter(t => t.layout === 'two').length,
    };

    const LAYOUTS = [
        {
            id: 'single' as const,
            name: 'Single Column',
            blurb: 'One top-to-bottom flow. The safest choice for applicant tracking systems.',
        },
        {
            id: 'two' as const,
            name: 'Two Column',
            blurb: 'A sidebar beside the main content. Denser, but some parsers read the columns out of order.',
        },
    ];

    return (
        <div className="flex-1 flex flex-col overflow-hidden animate-slide-down">
            {/* Layout chooser */}
            <div className="p-4 pb-0">
                <div className="grid grid-cols-2 gap-2">
                    {LAYOUTS.map(l => (
                        <button
                            key={l.id}
                            onClick={() => setLayout(l.id)}
                            className={`text-left rounded-xl border p-3 transition-colors ${
                                layout === l.id
                                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                                    : 'border-[var(--border-color)] hover:border-[var(--primary)]/40'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <LayoutGlyph kind={l.id} active={layout === l.id} />
                                <span className={`text-sm font-bold ${layout === l.id ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>
                                    {l.name}
                                </span>
                                <span className="ml-auto text-[10px] font-bold text-[var(--text-secondary)]">{counts[l.id]}</span>
                            </div>
                            <p className="text-[11px] leading-snug text-[var(--text-secondary)]">{l.blurb}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-white/10">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="search"
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#667eea]/50"
                    />
                </div>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                    {filteredTemplates.map(template => (
                        <div
                            key={template.id}
                            className={`
                                cursor-pointer rounded-lg border-2 transition-all overflow-hidden relative group
                                ${selectedTemplate === template.id
                                    ? 'border-[#667eea] ring-2 ring-[#667eea]/20'
                                    : 'border-white/10 hover:border-[#667eea]/50 hover:scale-[1.02]'
                                }
                            `}
                            onClick={() => setSelectedTemplate(template.id)}
                            onMouseEnter={() => setHoveredTemplate(template.id)}
                            onMouseLeave={() => setHoveredTemplate(null)}
                        >
                            {/* Template Preview Thumbnail */}
                            <div className="aspect-[210/297] bg-white relative">
                                <TemplateThumbnail templateId={template.id} />

                                {/* Hover Overlay */}
                                <div className={`
                                    absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity flex items-center justify-center
                                    ${selectedTemplate === template.id ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}
                                `}>
                                    <span className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-full transform scale-90 group-hover:scale-100 transition-transform">
                                        Preview
                                    </span>
                                </div>

                                {/* Selected Indicator */}
                                {selectedTemplate === template.id && (
                                    <div className="absolute top-2 right-2 bg-[#667eea] rounded-full p-1.5 z-20 shadow-lg">
                                        <Check className="h-3 w-3 text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Template Info */}
                            <div className="p-3 bg-[#1A1A1A] border-t border-white/5">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="font-bold text-white text-sm">{template.name}</h4>
                                    {template.isPremium && (
                                        <div className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                                            <Crown className="h-2.5 w-2.5" />
                                            PRO
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 line-clamp-2">{template.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* No Results */}
                {filteredTemplates.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-400 text-sm">No templates found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

/** A two-up sketch of the layout, so the choice is legible without reading. */
function LayoutGlyph({ kind, active }: { kind: 'single' | 'two'; active: boolean }) {
    const bar = active ? 'bg-[var(--primary)]/70' : 'bg-[var(--text-secondary)]/50';
    return (
        <span className={`w-5 h-6 rounded-[3px] border p-[3px] flex gap-[2px] shrink-0 ${active ? 'border-[var(--primary)]/60' : 'border-[var(--text-secondary)]/40'}`}>
            {kind === 'single' ? (
                <span className="flex-1 flex flex-col gap-[2px]">
                    <span className={`h-[2px] rounded-full ${bar}`} />
                    <span className={`h-[2px] rounded-full ${bar}`} />
                    <span className={`h-[2px] rounded-full ${bar}`} />
                    <span className={`h-[2px] w-2/3 rounded-full ${bar}`} />
                </span>
            ) : (
                <>
                    <span className={`w-[5px] rounded-[1px] ${bar}`} />
                    <span className="flex-1 flex flex-col gap-[2px]">
                        <span className={`h-[2px] rounded-full ${bar}`} />
                        <span className={`h-[2px] rounded-full ${bar}`} />
                        <span className={`h-[2px] w-2/3 rounded-full ${bar}`} />
                    </span>
                </>
            )}
        </span>
    );
}
