import { NextRequest, NextResponse } from 'next/server';
import { generatePdfFromHtml } from '@/lib/pdf/puppeteer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTemplateGenerator } from '@/components/resume-html-templates';
import { checkTemplateAccess, freeTemplateNames } from '@/lib/templateAccess';

/**
 * POST /api/pdf/generate
 *
 * Two shapes:
 *
 *   { templateId, data, designSettings?, filename? }  — a resume
 *   { html, filename? }                               — a cover letter
 *
 * A resume is rendered here from the template id and the resume data, not
 * from HTML the browser prepared. That is what makes the paywall mean
 * anything: the premium flag has been on the template metadata all along, but
 * the route used to accept whatever markup it was handed, so a free account
 * could download any design just by selecting it. The server picks the
 * template, so the client cannot claim one and send another.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userId = (session?.user as any)?.id as string | undefined;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { templateId, data, designSettings, filename = 'resume.pdf' } = body ?? {};

        let html: string;

        if (templateId && data) {
            const access = await checkTemplateAccess(userId, templateId);
            if (!access.allowed) {
                return NextResponse.json(
                    {
                        error: `${access.templateName} is a Pro template.`,
                        message:
                            `Downloading ${access.templateName} needs a Pro or Premium plan. ` +
                            `You can keep editing it, or switch to a free template and download straight away.`,
                        upgradeRequired: true,
                        templateId,
                        templateName: access.templateName,
                        plan: access.plan,
                        freeTemplates: freeTemplateNames(),
                    },
                    { status: 402 }
                );
            }

            try {
                html = getTemplateGenerator(templateId)(data, designSettings);
            } catch (err) {
                console.error('[PDF_GENERATE] template render failed', templateId, err);
                return NextResponse.json({ error: 'Could not render that template.' }, { status: 500 });
            }
        } else if (typeof body?.html === 'string' && body.html) {
            // Documents that are not built from a resume template — the cover
            // letter, for instance — have nothing to gate on.
            html = body.html;
        } else {
            return NextResponse.json(
                { error: 'Either templateId and data, or html, is required' },
                { status: 400 }
            );
        }

        const pdfBuffer = await generatePdfFromHtml(html);

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
