import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import nodemailer from "nodemailer";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const tickets = await prisma.supportTicket.findMany({
            where: {
                userId: (session!.user as any).id,
            },
            orderBy: {
                updatedAt: 'desc',
            },
            include: {
                messages: {
                    select: {
                        id: true
                    }
                }
            }
        });

        return NextResponse.json(tickets);
    } catch (error: any) {
        console.error("GET /api/tickets error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!(session?.user as any)?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { subject, category, priority, message } = body;

        if (!subject || !message) {
            return NextResponse.json({ error: "Subject and Message are required" }, { status: 400 });
        }

        const ticket = await prisma.supportTicket.create({
            data: {
                userId: (session!.user as any).id,
                subject,
                category: category || "GENERAL",
                priority: priority || "NORMAL",
                messages: {
                    create: {
                        senderId: (session!.user as any).id,
                        message,
                        isAdmin: false
                    }
                }
            },
            include: {
                messages: true
            }
        });

        // Send email notification to admin
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || "smtp.example.com",
                port: Number(process.env.SMTP_PORT) || 587,
                secure: Number(process.env.SMTP_PORT) === 465,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
                tls: {
                    rejectUnauthorized: false,
                },
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"Vignova Support" <noreply@vignova.io>',
                to: "ankushderle1@gmail.com",
                subject: `[Vignova Support] New Ticket: ${subject}`,
                html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>🎫 New Support Ticket</h2>
                    <p>A new support ticket has been raised by <strong>${(session!.user as any).email}</strong>.</p>
                    <table style="border-collapse: collapse; margin: 16px 0;">
                        <tr><td style="padding: 6px 12px; font-weight: bold;">Subject:</td><td style="padding: 6px 12px;">${subject}</td></tr>
                        <tr><td style="padding: 6px 12px; font-weight: bold;">Category:</td><td style="padding: 6px 12px;">${category || "GENERAL"}</td></tr>
                        <tr><td style="padding: 6px 12px; font-weight: bold;">Priority:</td><td style="padding: 6px 12px;">${priority || "NORMAL"}</td></tr>
                    </table>
                    <p><strong>Message:</strong></p>
                    <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin: 8px 0;">${message}</div>
                    <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/tickets/${ticket.id}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">View Ticket in Dashboard</a>
                    <br />
                    <p>Best regards,</p>
                    <p><strong>Vignova Support System</strong></p>
                </div>
                `,
            });
        } catch (emailError) {
            console.error("Failed to send admin notification email:", emailError);
            // We don't fail the ticket creation if email fails
        }

        return NextResponse.json(ticket);
    } catch (error: any) {
        console.error("POST /api/tickets error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
