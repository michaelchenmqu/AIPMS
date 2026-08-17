import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

// Section of the app -> roles allowed in it. Anything not listed here is
// public (landing page, /login, static assets, the NextAuth API routes).
const GUARDS: { prefix: string; roles: string[] }[] = [
  { prefix: "/portal", roles: ["STAFF"] },
  { prefix: "/owner", roles: ["OWNER"] },
  { prefix: "/contractor", roles: ["CONTRACTOR"] },
  { prefix: "/app/owner", roles: ["OWNER"] },
  { prefix: "/app/housekeeper", roles: ["HOUSEKEEPER"] },
];

const ROLE_HOME: Record<string, string> = {
  STAFF: "/portal",
  OWNER: "/owner",
  CONTRACTOR: "/contractor",
  HOUSEKEEPER: "/app/housekeeper",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const guard = GUARDS.find((g) => pathname.startsWith(g.prefix));
  if (!guard) return NextResponse.next();

  const role = req.auth?.user?.role;
  if (!role) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (!guard.roles.includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/", req.nextUrl));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/portal/:path*", "/owner/:path*", "/contractor/:path*", "/app/:path*"],
};
