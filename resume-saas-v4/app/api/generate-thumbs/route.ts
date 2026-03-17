import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { getTemplateGenerator } from '@/components/resume-html-templates';
import { PLACEHOLDER_RESUME_DATA } from '@/lib/stores/resumeStore';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const templates = ['executive', 'tech', 'creative', 'minimal'];
        const publicDir = path.join(process.cwd(), 'public', 'templates');

        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        console.log("Launching Puppeteer...");
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // A4 size at 96 DPI is ~794x1123. We use scale factor 2 for high-res thumbnails.
        await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

        for (const id of templates) {
            console.log(`Generating thumbnail for ${id}...`);
            const generator = getTemplateGenerator(id);
            let html = generator(PLACEHOLDER_RESUME_DATA);

            // Remove grey background/margins to get a pure white document
            html = html.replace('</head>', `
                <style>
                    body { padding: 0 !important; background: white !important; margin: 0 !important; display: block !important; }
                    .resume-page { margin: 0 !important; box-shadow: none !important; }
                </style>
            </head>`);

            await page.setContent(html, { waitUntil: 'load' });

            const savePath = path.join(publicDir, `${id}-thumb.png`);
            await page.screenshot({ path: savePath, fullPage: true });
            console.log(`Saved ${savePath}`);
        }

        await browser.close();
        return NextResponse.json({ success: true, message: "Thumbnails generated successfully." });
    } catch (e: any) {
        console.error("Error generating thumbnails:", e);
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
