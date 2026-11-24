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
        token.tenantId = user.tenantId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as Role;
      session.user.ownerId = (token.ownerId as string | null) ?? null;
      session.user.contractorId = (token.contractorId as string | null) ?? null;
      session.user.tenantId = (token.tenantId as string | null) ?? null;
      return session;
    },
    // Auth.js computes `baseUrl` from the raw request URL, which on Railway
    // (and similar reverse-proxy hosts) can be the container's internal
    // bind address (e.g. localhost:8080) rather than the public domain —
    // the same proxy-awareness gap that req.nextUrl has in middleware. A
    // relative callback URL (the only kind this app ever passes, e.g.
    // signOut({ callbackUrl: "/" })) is left as-is instead of being
    // resolved against that possibly-wrong baseUrl, so the browser
    // resolves it against the page's real origin instead.
    redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return url;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // not a valid absolute URL — fall through to the safe default
      }
      return "/";
    },
  },
} satisfies NextAuthConfig;
