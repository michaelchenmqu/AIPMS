import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Demo shortcut: photos are stored inline as data URLs in SQLite. The README
// flags this explicitly — production should upload to object storage and
// store a signed URL instead. Geo coords are recorded as reported by the
// device; production should cross-check them against the property's
// registered coordinates (geofencing) before trusting them for billing.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "HOUSEKEEPER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.assignedUserId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const photoDataUrl = typeof body.photoDataUrl === "string" ? body.photoDataUrl.slice(0, 5_000_000) : null;
  const lat = typeof body.lat === "number" ? body.lat : null;
  const lng = typeof body.lng === "number" ? body.lng : null;

  // Server clock, never the client's — this is what billing is computed
  // from, so it must not be spoofable via a manipulated device clock.
  const arrivalAt = new Date();

  const updated = await prisma.job.update({
    where: { id },
    data: {
      status: "IN_PROGRESS",
      arrivalAt,
      arrivalPhotoUrl: photoDataUrl,
      arrivalGeoLat: lat,
      arrivalGeoLng: lng,
    },
  });
  return NextResponse.json({ job: updated });
}
