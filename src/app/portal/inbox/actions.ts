"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function replyToWhatsApp(id: string, formData: FormData) {
  await requireRole("STAFF");
  const message = await prisma.inboxMessage.findUniqueOrThrow({ where: { id } });
  if (message.channel !== "WHATSAPP" || !message.fromPhone) {
    throw new Error("This message has no WhatsApp number to reply to.");
  }

  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("Reply can't be empty.");

  await sendWhatsAppMessage({ to: message.fromPhone, body });
  await prisma.inboxMessage.update({ where: { id }, data: { status: "RESOLVED" } });
  revalidatePath("/portal/inbox");
}

export async function resolveMessage(id: string) {
  await requireRole("STAFF");
  await prisma.inboxMessage.update({ where: { id }, data: { status: "RESOLVED" } });
  revalidatePath("/portal/inbox");
}

export async function createWorkOrderFromMessage(id: string) {
  await requireRole("STAFF");
  const message = await prisma.inboxMessage.findUnique({ where: { id } });
  if (!message || !message.propertyId) return;

  await prisma.workOrder.create({
    data: {
      propertyId: message.propertyId,
      title: message.subject,
      description: message.body,
      status: "OPEN",
      priority: message.aiKind === "COMPLAINT" ? "HIGH" : "MEDIUM",
    },
  });
  await prisma.inboxMessage.update({ where: { id }, data: { status: "RESOLVED" } });
  revalidatePath("/portal/inbox");
  revalidatePath("/portal/work-orders");
}
