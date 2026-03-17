import React, { useEffect, useState } from 'react';
import { PLACEHOLDER_RESUME_DATA } from '@/lib/stores/resumeStore';
import { getTemplateGenerator } from '@/components/resume-html-templates';
import { TemplateId } from '@/components/resume-html-templates/index';

interface TemplateThumbnailProps {
    templateId: string;
}

export const TemplateThumbnail: React.FC<TemplateThumbnailProps> = ({ templateId }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(0.25);

    useEffect(() => {
        // Generate HTML for the template using placeholder data
        const generator = getTemplateGenerator(templateId);
        let html = generator(PLACEHOLDER_RESUME_DATA);

        // Inject CSS overrides to remove body padding/margins for the thumbnail preview
        html = html.replace('</head>', `
            <style>
                body { padding: 0 !important; background: white !important; min-height: 0 !important; display: block !important; }
                .resume-page { margin: 0 !important; box-shadow: none !important; }
            </style>
        </head>`);

        // Create a blob URL for the iframe
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [templateId]);

    // Measure parent container to dynamically scale the 210mm A4 page to fit edge-to-edge
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            if (width > 0) {
                // 210mm is approximately 793.7px at 96dpi
                setScale(width / 793.7);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    if (!blobUrl) return <div className="w-full h-full bg-gray-900 animate-pulse" />;

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white">
            <iframe
                src={blobUrl}
                className="absolute top-0 left-1/2 -translate-x-1/2 border-none origin-top pointer-events-none select-none"
                style={{
                    width: '210mm',
                    height: '297mm',
                    transform: `scale(${scale})`
                }}
                tabIndex={-1}
                aria-hidden="true"
            />
            {/* Overlay to prevent interaction and capture clicks for parent */}
            <div className="absolute inset-0 z-10" />
        </div>
    );
};
