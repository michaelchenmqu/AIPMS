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
    // the same proxy-awareness gap that req.nextUrl has in middleware. The
    // usual same-origin check against that baseUrl is actively wrong here:
    // it would reject every legitimate request on Railway. This app never
    // passes an attacker-controlled callbackUrl in (only a literal "/"
    // from SignOutButton, or the browser's own current address from
    // next-auth/react's signIn), so there's no open-redirect risk in
    // returning it unchanged — relative for signOut (the browser resolves
    // it against the real page origin), absolute for signIn (next-auth's
    // client calls `new URL(data.url)` on the result when redirect:false,
    // which throws on a bare "/", so it must stay a valid absolute URL
    // there).
    redirect({ url }) {
      return url || "/";
    },
  },
} satisfies NextAuthConfig;
