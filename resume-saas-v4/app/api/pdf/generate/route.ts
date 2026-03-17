import { NextRequest, NextResponse } from 'next/server';
import { generatePdfFromHtml } from '@/lib/pdf/puppeteer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

/**
 * POST /api/pdf/generate
 * Generate a PDF from HTML content
 * 
 * Body: { html: string, filename?: string }
 * Returns: PDF file as blob
 */
export async function POST(req: NextRequest) {
    try {
        // Auth check
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await req.json();
        const { html, filename = 'resume.pdf' } = body;

        if (!html || typeof html !== 'string') {
            return NextResponse.json(
                { error: 'HTML content is required' },
                { status: 400 }
            );
        }

        // Generate PDF
        const pdfBuffer = await generatePdfFromHtml(html);

        // Return PDF as download
        return new NextResponse(new Uint8Array(pdfBuffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': pdfBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('[PDF_GENERATE]', error);
        return NextResponse.json(
            { error: 'Failed to generate PDF' },
            { status: 500 }
        );
    }
}
