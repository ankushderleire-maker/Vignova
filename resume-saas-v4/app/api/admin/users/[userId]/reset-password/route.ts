import { NextResponse } from "next/server";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { requireAdmin, logAdminAction } from "@/lib/admin-guard";
import { db } from "@/lib/db";

interface RouteParams {
    params: Promise<{ userId: string }>;
}

/**
 * POST /api/admin/users/[userId]/reset-password
 *
 * Generates a fresh reset token and emails the user the same reset link the
 * self-service forgot-password flow uses. The link is never returned to the
 * admin, so this cannot be used to take over the account silently.
 */
export async function POST(req: Request, { params }: RouteParams) {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const { userId } = await params;

    try {
        const user = await db.users.findUnique({
            where: { id: userId },
            select: { id: true, email: true, full_name: true },
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await db.users.update({
            where: { id: userId },
            data: { resetToken, resetTokenExpiry },
        });

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

        const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${resetToken}`;

        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Vignova" <noreply@vignova.io>`,
            to: user.email,
            subject: "Reset Your Password - Vignova",
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Password Reset</h2>
                <p>Hello ${user.full_name || "there"},</p>
                <p>A password reset was initiated for your Vignova account by our support team. Click the button below to set a new password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                <p>If you did not expect this, please contact support.</p>
                <p>This link will expire in 1 hour.</p>
                <br />
                <p>Best regards,</p>
                <p><strong>The Vignova Team</strong></p>
            </div>
            `,
        });

        await logAdminAction({
            admin: auth.user,
            action: "USER_PASSWORD_RESET_SENT",
            targetType: "user",
            targetId: userId,
            details: { targetEmail: user.email },
            req,
        });

        return NextResponse.json({ success: true, message: `Reset link emailed to ${user.email}` });
    } catch (error) {
        console.error("[ADMIN_USER_RESET_PASSWORD]", error);
        return NextResponse.json(
            { error: "Failed to send reset email — check SMTP configuration" },
            { status: 500 }
        );
    }
}
