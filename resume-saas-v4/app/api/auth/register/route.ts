import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// ── Input Validation ──
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_NAME_LENGTH = 100;

function validateRegistrationInput(email: string, password: string, fullName: string) {
    const errors: string[] = [];

    // Email validation
    if (!email || typeof email !== 'string') {
        errors.push("Email is required");
    } else if (!EMAIL_REGEX.test(email.trim())) {
        errors.push("Please enter a valid email address");
    } else if (email.trim().length > 255) {
        errors.push("Email is too long");
    }

    // Password validation
    if (!password || typeof password !== 'string') {
        errors.push("Password is required");
    } else {
        if (password.length < MIN_PASSWORD_LENGTH) {
            errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
        }
        if (password.length > MAX_PASSWORD_LENGTH) {
            errors.push("Password is too long");
        }
        if (!/[A-Z]/.test(password)) {
            errors.push("Password must contain at least one uppercase letter");
        }
        if (!/[0-9]/.test(password)) {
            errors.push("Password must contain at least one number");
        }
    }

    // Name validation
    if (!fullName || typeof fullName !== 'string') {
        errors.push("Full name is required");
    } else if (fullName.trim().length === 0) {
        errors.push("Full name cannot be empty");
    } else if (fullName.trim().length > MAX_NAME_LENGTH) {
        errors.push(`Full name must be under ${MAX_NAME_LENGTH} characters`);
    }

    return errors;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, fullName } = body;

    // Validate input
    const validationErrors = validateRegistrationInput(email, password, fullName);
    if (validationErrors.length > 0) {
        return NextResponse.json(
            { error: validationErrors[0], errors: validationErrors },
            { status: 400 }
        );
    }

    // Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();

    // Check duplicate (use generic message to prevent user enumeration)
    const existing = await db.users.findUnique({
        where: { email: sanitizedEmail } 
    });
    if (existing) {
        return NextResponse.json(
            { error: "An account with this email already exists" },
            { status: 409 }
        );
    }

    const hashed = await hashPassword(password);

    // Create User
    const user = await db.users.create({
      data: {
        email: sanitizedEmail,
        password_hash: hashed,
        full_name: fullName.trim(),
        // Create related records automatically
        subscriptions: {
            create: { plan_type: "FREE", credits_remaining: 3 }
        },
        master_profiles: {
            create: { parsed_data: {} }
        }
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[REGISTER]", error);
    return NextResponse.json(
        { error: "Registration failed. Please try again." },
        { status: 500 }
    );
  }
}