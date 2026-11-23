import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";

// Railway (and most reverse-proxy hosts that aren't Vercel's own edge
// network) don't reliably make req.nextUrl's origin reflect the public
// domain — it can fall back to the container's internal bind address
// (e.g. localhost:8080), sending anyone redirected here to their own
// machine instead of the live site. Build the origin explicitly from the
// forwarded headers the proxy actually sets, rather than trusting
// req.nextUrl's built-in resolution.
function publicOrigin(req: NextRequest): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return `${proto}://${host}`;
}

const { auth } = NextAuth(authConfig);

// Section of the app -> roles allowed in it. Anything not listed here is
// public (landing page, /login, static assets, the NextAuth API routes).
const GUARDS: { prefix: string; roles: string[] }[] = [
  { prefix: "/portal", roles: ["STAFF"] },
  { prefix: "/owner", roles: ["OWNER"] },
  { prefix: "/contractor", roles: ["CONTRACTOR"] },
  { prefix: "/app/owner", roles: ["OWNER"] },
  { prefix: "/app/housekeeper", roles: ["HOUSEKEEPER"] },
  { prefix: "/tenant", roles: ["TENANT"] },
];

const ROLE_HOME: Record<string, string> = {
  STAFF: "/portal",
  OWNER: "/owner",
  CONTRACTOR: "/contractor",
  HOUSEKEEPER: "/app/housekeeper",
  TENANT: "/tenant",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const guard = GUARDS.find((g) => pathname.startsWith(g.prefix));
  if (!guard) return NextResponse.next();

  const role = req.auth?.user?.role;
  if (!role) {
    const loginUrl = new URL("/login", publicOrigin(req));
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (!guard.roles.includes(role)) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/", publicOrigin(req)));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/portal/:path*", "/owner/:path*", "/contractor/:path*", "/app/:path*", "/tenant/:path*"],
};
