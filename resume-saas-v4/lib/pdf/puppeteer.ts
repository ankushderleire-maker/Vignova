import { Browser, Page } from 'puppeteer-core';

let browserInstance: Browser | null = null;

/**
 * Get or create a Puppeteer browser instance
 * - PROD (Vercel): Uses @sparticuz/chromium + puppeteer-core
 * - DEV (Local): Uses full puppeteer package (with local Chrome)
 */
export async function getBrowser(): Promise<Browser> {
    if (browserInstance && browserInstance.connected) {
        return browserInstance;
    }

    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
        // PRODUCTION: Use @sparticuz/chromium
        const chromium = require("@sparticuz/chromium");
        const puppeteerCore = require("puppeteer-core");

        chromium.setHeadlessMode = "shell";
        chromium.setGraphicsMode = false;

        browserInstance = await puppeteerCore.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: true,
            ignoreHTTPSErrors: true,
        });
    } else {
        // DEVELOPMENT: Use full puppeteer
        const puppeteer = require("puppeteer");
        browserInstance = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
    }

    if (!browserInstance) {
        throw new Error("Failed to launch browser");
    }

    return browserInstance;
}

/**
 * Generate a PDF from HTML content
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        // Set content and wait for fonts/images to load
        await page.setContent(html, {
            waitUntil: ['networkidle0', 'domcontentloaded'],
        });

        // Generate PDF with A4 size
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '0',
                right: '0',
                bottom: '0',
                left: '0',
            },
            preferCSSPageSize: true, // Respect CSS @page rules
        });

        return Buffer.from(pdfBuffer);
    } finally {
        await page.close();
    }
}

/**
 * Cleanup browser instance (call on server shutdown if needed)
 */
export async function closeBrowser(): Promise<void> {
    if (browserInstance) {
        await browserInstance.close();
        browserInstance = null;
    }
}
