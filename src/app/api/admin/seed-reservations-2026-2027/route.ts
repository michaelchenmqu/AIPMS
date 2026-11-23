// One-time, token-gated endpoint to backfill the 2026/2027 short-stay
// reservations (see prisma/reservations-2026-2027-seed.ts) on a deployment
// this session has no direct database access to. Visit it once with the
// correct ?token=, then this route gets deleted — it's not meant to stay.
//
// Idempotent: safe to visit more than once, re-runs just report 0 created.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { seedUpcomingReservations } from "../../../../../prisma/reservations-2026-2027-seed";

const ADMIN_TOKEN = "6a2964680d0c0f8299687400ffb0dcb8e255b26eb1a49fbe";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [islandOasis, bayRetreat, hilltopHideaway] = await Promise.all([
    prisma.property.findFirstOrThrow({ where: { name: "Island Oasis" } }),
    prisma.property.findFirstOrThrow({ where: { name: "Bay Retreat" } }),
    prisma.property.findFirstOrThrow({ where: { name: "Hilltop Hideaway" } }),
  ]);

  const { created, total } = await seedUpcomingReservations(prisma, {
    islandOasis: { id: islandOasis.id, basePrice: islandOasis.basePrice },
    bayRetreat: { id: bayRetreat.id, basePrice: bayRetreat.basePrice },
    hilltopHideaway: { id: hilltopHideaway.id, basePrice: hilltopHideaway.basePrice },
  });

  return NextResponse.json({ created, total, message: `Created ${created} of ${total} reservations — the rest already existed.` });
}
