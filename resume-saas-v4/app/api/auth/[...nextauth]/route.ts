import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import { db } from "@/lib/db"; // CHANGED: Importing 'db' instead of 'prisma'
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID || "",
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        // 1. Find user in DB
        // CHANGED: Using 'db' instead of 'prisma'
        const user = await db.users.findUnique({
          where: {
            email: credentials.email,
          },
        });

        // 2. Check if user exists (generic error to prevent user enumeration)
        if (!user) {
          throw new Error("Invalid email or password");
        }

        // 3. Check password match (same generic error)
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!passwordMatch) {
          throw new Error("Invalid email or password");
        }

        // 4. Return user object (include role for admin checks)
        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" || account?.provider === "linkedin") {
        if (!user.email) return false;
        
        let dbUser = await db.users.findUnique({
          where: { email: user.email },
        });

        if (!dbUser) {
          const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          
          dbUser = await db.users.create({
            data: {
              email: user.email,
              full_name: user.name || "User",
              password_hash: hashedPassword,
              role: "USER"
            }
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google" || account?.provider === "linkedin") {
           const dbUser = await db.users.findUnique({ where: { email: user.email! } });
           if (dbUser) {
             token.id = dbUser.id;
             // @ts-ignore
             token.role = dbUser.role;
           }
        } else {
          token.id = user.id;
          // @ts-ignore
          token.role = user.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id as string;
        // role intentionally omitted — admin checks query the DB server-side
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };