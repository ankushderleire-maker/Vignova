import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
    try {
        const { token, password } = await req.json();

        if (!token || !password) {
            return NextResponse.json({ message: "Token and password are required" }, { status: 400 });
        }

        // Find the user with this token where it hasn't expired
        const user = await prisma.users.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(), // Must be greater than now
                },
            },
        });

        if (!user) {
            return NextResponse.json({ message: "Invalid or expired password reset token." }, { status: 400 });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Update the user's password and wipe out the token to prevent replay
        await prisma.users.update({
            where: { id: user.id },
            data: {
                password_hash,
                resetToken: null, // Clear out the token securely
                resetTokenExpiry: null,
            },
        });

        return NextResponse.json({ message: "Password has been successfully reset." }, { status: 200 });

    } catch (error: any) {
        console.error("Reset Password Error:", error);
        return NextResponse.json({ message: "An error occurred while resetting the password." }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
