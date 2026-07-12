// NextAuth configuration for TransitOps

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { loginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rate-limit';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const parsed = loginSchema.safeParse({
          email: credentials.email,
          password: credentials.password,
        });

        if (!parsed.success) {
          throw new Error('Invalid input');
        }

        // Rate limit by email: 5 attempts per minute
        const emailKey = parsed.data.email.toLowerCase();
        const rateCheck = rateLimit(`auth:${emailKey}`, 5, 60 * 1000);
        if (!rateCheck.allowed) {
          throw new Error('Too many login attempts. Please try again later.');
        }

        const user = await db.user.findUnique({
          where: { email: emailKey },
          include: { role: true },
        });

        // Use constant-time comparison to prevent timing attacks
        // Always run bcrypt.compare even if user doesn't exist to prevent enumeration
        const dummyHash = '$2a$12$000000000000000000000uVCRzVGJIFVH0fU0vKrul7KknRSxfTAa';
        const isValid = user
          ? await bcrypt.compare(parsed.data.password, user.password)
          : await bcrypt.compare(parsed.data.password, dummyHash);

        if (!user || !isValid) {
          throw new Error('Invalid email or password');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roleName: user.role.name,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 8, // 8 hours
  },
  pages: {
    signIn: '/login',
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code-verifier`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roleName = (user as { roleName: string }).roleName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roleName = token.roleName as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      roleName: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    roleName: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    roleName?: string;
  }
}
