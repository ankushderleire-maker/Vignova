"use client";

import React, { useMemo, useState } from 'react';
import { ResumeData } from '@/types/resume';
import { DesignSettings } from '@/components/resume-engine/DesignControls';
import { getTemplateGenerator } from '@/components/resume-html-templates';
import { Download, Loader2 } from 'lucide-react';

interface HtmlPreviewPanelProps {
    data: ResumeData;
    templateId: string;
    designSettings?: DesignSettings;
    onSectionClick?: (section: string) => void;
}

/**
 * HTML-based resume preview using iframe
 * Provides instant updates and perfect CSS layout
 */
export const HtmlPreviewPanel: React.FC<HtmlPreviewPanelProps> = ({
    data,
    templateId,
    designSettings,
    onSectionClick
}) => {
    // Generate HTML whenever data/template/settings change
    const htmlContent = useMemo(() => {
        const generator = getTemplateGenerator(templateId);
        let html = generator(data, designSettings);

        // Inject interaction script and styles
        const script = `
            <script>
                document.addEventListener('click', (e) => {
                    const target = e.target.closest('[data-section]');
                    if (target) {
                        e.preventDefault();
                        e.stopPropagation();
                        const section = target.getAttribute('data-section');
                        window.parent.postMessage({ type: 'RESUME_SECTION_CLICK', section }, '*');
                    }
                });
            </script>
            <style>
                [data-section] {
                    cursor: pointer;
                    position: relative;
                    transition: outline 0.2s;
                }
                [data-section]:hover {
                    outline: 2px dashed #4f46e5; /* Indigo-600 */
                    outline-offset: 4px;
                    border-radius: 2px;
                }
            </style>
        `;

        return html.replace('</body>', `${script}</body>`);
    }, [data, templateId, designSettings]);

    // Handle messages from iframe
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'RESUME_SECTION_CLICK' && onSectionClick) {
                onSectionClick(event.data.section);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [onSectionClick]);

    // Create blob URL for iframe
    const blobUrl = useMemo(() => {
        const blob = new Blob([htmlContent], { type: 'text/html' });
        return URL.createObjectURL(blob);
    }, [htmlContent]);

    return (
        <div className="w-full h-full bg-gray-100 relative">
            <iframe
                src={blobUrl}
                className="w-full h-full border-none bg-white"
                title="Resume Preview"
                style={{
                    transform: 'scale(0.85)',
                    transformOrigin: 'top center',
                    width: '117.6%', // 1/0.85 to compensate for scale
                    height: '117.6%',
                    marginLeft: '-8.8%', // Center after scaling
                }}
            />
        </div>
    );
};

interface PdfDownloadButtonProps {
    data: ResumeData;
    templateId: string;
    designSettings?: DesignSettings;
    fileName?: string;
}

/**
 * Download button that generates PDF via server API
 */
export const PdfDownloadButton: React.FC<PdfDownloadButtonProps> = ({
    data,
    templateId,
    designSettings,
    fileName = 'resume.pdf'
}) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleDownload = async () => {
        setIsLoading(true);
        try {
            // Generate HTML
            const generator = getTemplateGenerator(templateId);
            const html = generator(data, designSettings);

            // Call PDF generation API
            const response = await fetch('/api/pdf/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ html, filename: fileName }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            // Download the PDF
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF download error:', error);
            alert('Failed to download PDF. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleDownload}
            disabled={isLoading}
            className="flex items-center gap-1 bg-white text-black hover:bg-gray-200 transition px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap disabled:opacity-50"
        >
            {isLoading ? (
                <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Download className="h-3 w-3" />
                    Download PDF
                </>
            )}
        </button>
    );
};
