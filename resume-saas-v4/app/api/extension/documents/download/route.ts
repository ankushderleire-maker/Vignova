import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getExtensionUser } from "@/lib/extensionAuth";
import { withCors, handleCorsOptions } from "@/lib/extensionCors";
import { getTemplateGenerator } from "@/components/resume-html-templates";
import { generatePdfFromHtml } from "@/lib/pdf/puppeteer";

export async function OPTIONS() {
    return handleCorsOptions();
}

/**
 * GET /api/extension/documents/download?id=<id>&type=<resume|cover_letter>
 * Generates a PDF on the fly from the stored JSON resume or Cover Letter string.
 */
export async function GET(req: Request) {
    try {
        const auth = await getExtensionUser(req);
        if (auth.error || !auth.user) {
            return withCors(NextResponse.json({ error: auth.error }, { status: auth.status }));
        }

        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        const docType = url.searchParams.get("type");

        if (!id || !docType) {
            return withCors(NextResponse.json({ error: "Missing id or type" }, { status: 400 }));
        }

        let html = "";
        let filename = "document.pdf";

        if (docType === "resume") {
            const resume = await db.generatedResume.findUnique({
                where: { id, userId: auth.user.id }
            });

            if (!resume || !resume.content) {
                return withCors(NextResponse.json({ error: "Resume not found" }, { status: 404 }));
            }

            const data = typeof resume.content === "string" ? JSON.parse(resume.content) : resume.content;

            let templateId = "classic";
            const settings = (auth.user as any).extensionSettings;
            if (settings && settings.mode === "specific" && settings.templateId) {
                templateId = settings.templateId;
            } else if (settings && settings.mode === "curated" && Array.isArray(settings.templateIds) && settings.templateIds.length > 0) {
                templateId = settings.templateIds[0];
            }

            const generator = getTemplateGenerator(templateId) || getTemplateGenerator("classic");
            html = generator(data);
            filename = `Resume_${resume.name.replace(/[^a-z0-9]/gi, '_')}.pdf`;

        } else if (docType === "cover_letter") {
            const job = await db.jobApplication.findUnique({
                where: { id, userId: auth.user.id }
            });

            if (!job || !job.coverLetter) {
                return withCors(NextResponse.json({ error: "Cover letter not found" }, { status: 404 }));
            }

            const formattedText = job.coverLetter
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\n/g, "<br/>");

            html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Cover Letter</title>
                    <style>
                        body {
                            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
                            font-size: 11pt;
                            line-height: 1.6;
                            color: #333;
                            padding: 1in;
                            max-width: 8.5in;
                            margin: 0 auto;
                        }
                        p { margin-bottom: 1em; }
                    </style>
                </head>
                <body>
                    <div>${formattedText}</div>
                </body>
                </html>
            `;
            filename = `Cover_Letter_${job.company.replace(/[^a-z0-9]/gi, '_')}.pdf`;
        } else {
            return withCors(NextResponse.json({ error: "Invalid document type" }, { status: 400 }));
        }

        // Generate PDF
        const pdfBuffer = await generatePdfFromHtml(html);
        const pdfBase64 = pdfBuffer.toString("base64");

        return withCors(NextResponse.json({
            success: true,
            pdfBase64,
            filename,
            mimeType: "application/pdf"
        }));

    } catch (error: any) {
        console.error("[EXT_DOCUMENTS_DOWNLOAD]", error);
        return withCors(NextResponse.json({ error: "Failed to generate document PDF" }, { status: 500 }));
    }
}
