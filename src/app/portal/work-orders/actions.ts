"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { WorkOrderStatus } from "@prisma/client";

export async function setWorkOrderStatus(id: string, status: WorkOrderStatus) {
  await requireRole("STAFF");
  await prisma.workOrder.update({ where: { id }, data: { status } });
  revalidatePath("/portal/work-orders");
}
