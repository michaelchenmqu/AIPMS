"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function approveGuestRequest(id: string) {
  await requireRole("STAFF");

  const request = await prisma.guestRequest.findUnique({ where: { id }, include: { reservation: true } });
  if (!request || request.status !== "PENDING") return;

  await prisma.guestRequest.update({
    where: { id },
    data: { status: "APPROVED", respondedAt: new Date() },
  });

  if ((request.type === "EXTEND_STAY" || request.type === "REDUCE_STAY") && request.requestedCheckOut) {
    const delta = request.type === "EXTEND_STAY" ? request.estimatedPrice ?? 0 : -(request.estimatedPrice ?? 0);
    await prisma.reservation.update({
      where: { id: request.reservationId },
      data: {
        checkOut: request.requestedCheckOut,
        totalAmount: request.reservation.totalAmount + delta,
      },
    });
  }

  revalidatePath("/portal/reservations");
}

export async function declineGuestRequest(id: string) {
  await requireRole("STAFF");
  await prisma.guestRequest.update({
    where: { id },
    data: { status: "DECLINED", respondedAt: new Date() },
  });
  revalidatePath("/portal/reservations");
}
