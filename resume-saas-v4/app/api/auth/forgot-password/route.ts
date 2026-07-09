import { NextResponse } from 'next/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || typeof email !== 'string') {
            return NextResponse.json({ message: "Email is required" }, { status: 400 });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await db.users.findUnique({
            where: { email: normalizedEmail },
        });

        // We don't want to explicitly state the user doesn't exist to prevent email enumeration attacks.
        if (!user) {
            return NextResponse.json({ message: "If that email is in our database, we will send a reset link." }, { status: 200 });
        }

        // Generate a random secure token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

        // Save it to the database
        await db.users.update({
            where: { email: normalizedEmail },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        // Initialize Nodemailer transporter ok
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.example.com",
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false,
            }
        });

        const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        // Send the email
        await transporter.sendMail({
            from: process.env.SMTP_FROM || `"Vignova" <noreply@vignova.io>`,
            to: user.email,
            subject: "Reset Your Password - Vignova",
            html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Password Reset Request</h2>
                <p>Hello ${user.full_name || 'there'},</p>
                <p>Someone requested to reset the password for your Vignova account. If this was you, please click the button below to set a new password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; margin: 20px 0; background-color: #059669; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
                <p>If you did not request this, you can safely ignore this email.</p>
                <p>This link will expire in 1 hour.</p>
                <br />
                <p>Best regards,</p>
                <p><strong>The Vignova Team</strong></p>
            </div>
            `,
        });

        return NextResponse.json({ message: "If that email is in our database, we will send a reset link." }, { status: 200 });

    } catch (error: any) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json({ message: "An error occurred while attempting to send the reset link." }, { status: 500 });
    }
}
