"use client";

import { useEffect, useState } from "react";
import { X, Search } from "lucide-react";
import { AVAILABLE_TEMPLATES, TemplateConfig } from "@/components/resume-engine/templates";
import { ResumeData } from "@/types/resume";
import dynamic from "next/dynamic";

// Dynamically import the PDF Client to avoid SSR issues with react-pdf
// Dynamically import the HTML Preview Panel for thumbnails
const HtmlPreviewPanel = dynamic(
    () => import("@/components/resume-engine/HtmlPreviewPanel").then((mod) => mod.HtmlPreviewPanel),
    { ssr: false, loading: () => <div className="w-full h-full bg-gray-100 animate-pulse rounded-lg" /> }
);

interface TemplateGalleryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: TemplateConfig) => void;
    currentTemplateId: string;
    resumeData: ResumeData | null;
}

export default function TemplateGalleryDialog({
    isOpen,
    onClose,
    onSelect,
    currentTemplateId,
    resumeData
}: TemplateGalleryDialogProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredTemplates, setFilteredTemplates] = useState(AVAILABLE_TEMPLATES);

    useEffect(() => {
        if (searchTerm) {
            setFilteredTemplates(AVAILABLE_TEMPLATES.filter(t =>
                t.name.toLowerCase().includes(searchTerm.toLowerCase())
            ));
        } else {
            setFilteredTemplates(AVAILABLE_TEMPLATES);
        }
    }, [searchTerm]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            {/* BACKDROP */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* MODAL CONTENT */}
            <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* HEADER */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#111]">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Choose a Template</h2>
                        <p className="text-sm text-gray-400">Select a design to instantly transform your resume.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* SEARCH & FILTERS (Optional for future) */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-4 bg-[#141414]">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[var(--primary)] transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                        Showing {filteredTemplates.length} templates
                    </div>
                </div>

                {/* SCROLLABLE GRID */}
                <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F0F]">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredTemplates.map((template) => (
                            <div
                                key={template.id}
                                onClick={() => {
                                    onSelect(template);
                                    onClose();
                                }}
                                className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all cursor-pointer ${currentTemplateId === template.id
                                    ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/20 bg-white/5"
                                    : "border-white/10 bg-white/5 hover:border-white/30 hover:shadow-xl hover:-translate-y-1"
                                    }`}
                            >
                                {/* PREVIEW AREA */}
                                <div className="aspect-[1/1.414] w-full bg-[#E5E5E5] relative overflow-hidden">
                                    {/* Render actual mini preview if we have data */}
                                    {resumeData ? (
                                        <div className="w-[300%] h-[300%] origin-top-left scale-[0.33] pointer-events-none">
                                            <HtmlPreviewPanel
                                                data={resumeData}
                                                templateId={template.id}
                                                designSettings={{
                                                    global: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
                                                    // Add default settings for thumbnails
                                                    header: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
                                                    summary: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
                                                    experience: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
                                                    education: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
                                                    skills: { fontSize: 10, lineHeight: 1.5, spacing: 20 },
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 text-xs">No Data</div>
                                    )}

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm transform scale-90 group-hover:scale-100 transition-transform">
                                            Select Template
                                        </span>
                                    </div>
                                </div>

                                {/* FOOTER */}
                                <div className="p-4 bg-[#1a1a1a] border-t border-white/5">
                                    <div className="flex items-center justify-between">
                                        <h3 className={`font-bold text-sm ${currentTemplateId === template.id ? "text-[var(--primary)]" : "text-white"}`}>
                                            {template.name}
                                        </h3>
                                        {currentTemplateId === template.id && (
                                            <span className="text-[10px] bg-[var(--primary)]/20 text-[var(--primary)] px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1 capitalize">{template.type.replace("-", " ")} Layout</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
