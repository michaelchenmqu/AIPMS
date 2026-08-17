import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Edge-safe base config (no Credentials provider / Prisma / bcrypt here —
// those need the Node runtime). Consumed by both the full auth.ts (route
// handlers, server components) and middleware.ts (edge runtime).
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET ?? "demo-only-insecure-secret-change-me",
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.ownerId = user.ownerId;
        token.contractorId = user.contractorId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.ownerId = (token.ownerId as string | null) ?? null;
      session.user.contractorId = (token.contractorId as string | null) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
