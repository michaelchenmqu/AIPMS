// Guest access — no user account, no NextAuth session. A guest proves who
// they are once (last name + arrival date, optionally scoped to a property
// via the QR code they scanned) and gets a short-lived signed cookie that
// scopes every later request to that one Reservation.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "aipms_guest";
const SESSION_DAYS = 14; // generous — covers pre-stay browsing through post-checkout

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encodeToken(reservationId: string, exp: number): string {
  const payload = Buffer.from(JSON.stringify({ reservationId, exp })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeToken(token: string): { reservationId: string; exp: number } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof parsed.reservationId !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Finds the reservation a guest is claiming, matching on last name +
 *  arrival date (and property, if the QR code they scanned carried one).
 *  The arrival date can be the exact check-in date, or any date within the
 *  stay — guests mid-stay often reach for "today" rather than remembering
 *  their original check-in date. Verification is only possible from a few
 *  days before arrival through a few days after departure — not
 *  indefinitely, so a stale QR code eventually stops granting access. */
export async function verifyGuestAccess(params: {
  lastName: string;
  arrivalDate: Date;
  propertyId?: string;
}) {
  const lastName = params.lastName.trim().toLowerCase();
  if (!lastName) return null;

  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const arrivalDayStart = new Date(params.arrivalDate);
  arrivalDayStart.setHours(0, 0, 0, 0);
  const arrivalDayEnd = new Date(arrivalDayStart.getTime() + 24 * 60 * 60 * 1000);

  // Broad candidate fetch — the exact-date filtering happens below so a
  // stay-spanning date (not just the literal check-in day) can still match.
  const candidates = await prisma.reservation.findMany({
    where: {
      ...(params.propertyId ? { propertyId: params.propertyId } : {}),
      checkIn: { lt: arrivalDayEnd },
      checkOut: { gt: new Date(arrivalDayStart.getTime() - threeDaysMs) },
    },
    include: { property: true },
  });

  const now = Date.now();
  const match = candidates.find((r) => {
    // Prefix match in either direction: seed/demo names are often
    // family-style ("The Patels"), so a guest typing the singular form
    // ("Patel") should still get in, and vice versa.
    const nameMatches = r.guestName
      .toLowerCase()
      .split(/\s+/)
      .some((part) => (part.length >= 3 && lastName.length >= 3 ? part.startsWith(lastName) || lastName.startsWith(part) : part === lastName));
    if (!nameMatches) return false;

    // Accepted arrival-date entries: the exact check-in day, or any day
    // within the stay (checkIn..checkOut inclusive).
    const dateMatches = arrivalDayStart.getTime() < r.checkOut.getTime() && arrivalDayEnd.getTime() > r.checkIn.getTime();
    if (!dateMatches) return false;

    const windowStart = r.checkIn.getTime() - threeDaysMs;
    const windowEnd = r.checkOut.getTime() + threeDaysMs;
    return now >= windowStart && now <= windowEnd;
  });

  return match ?? null;
}

export async function setGuestSession(reservationId: string) {
  const exp = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const store = await cookies();
  store.set(COOKIE_NAME, encodeToken(reservationId, exp), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearGuestSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Reads and validates the guest cookie without redirecting — safe to call
 *  from a Route Handler (redirect() only works from page/action contexts).
 *  Returns null if there's no valid session. */
export async function getGuestSession() {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  const parsed = raw ? decodeToken(raw) : null;
  if (!parsed) return null;

  const reservation = await prisma.reservation.findUnique({
    where: { id: parsed.reservationId },
    include: { property: true },
  });
  if (!reservation) return null;

  return { reservation, property: reservation.property };
}

/** Server-component guard for every /guest/* page: same as
 *  getGuestSession(), but redirects to the verification screen instead of
 *  returning null. */
export async function requireGuestScope() {
  const scope = await getGuestSession();
  if (!scope) redirect("/guest");
  return scope;
}
