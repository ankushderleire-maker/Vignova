
const puppeteer = require('puppeteer');

async function test() {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch();
        console.log("Browser launched. Creating page...");
        const page = await browser.newPage();
        await page.setContent('<h1>Test</h1>');
        const pdf = await page.pdf({ format: 'A4' });
        console.log("Success! PDF Buffer length:", pdf.length);
        await browser.close();
    } catch (e) {
        console.error("Simple Test Failed:", e);
    }
}

test();
