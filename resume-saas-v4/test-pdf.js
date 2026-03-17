
const { generatePdfFromHtml } = require('./lib/pdf/puppeteer');

async function test() {
    try {
        console.log("Testing PDF Generation...");
        const pdf = await generatePdfFromHtml("<h1>Hello World</h1>");
        console.log("Success! PDF Buffer length:", pdf.length);
    } catch (e) {
        console.error("Test Failed:", e);
    }
}

test();
