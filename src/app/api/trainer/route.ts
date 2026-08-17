import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { trainerChat } from "@/lib/ai";

async function requireStaff() {
  const user = await getSessionUser();
  if (!user || user.role !== "STAFF") return null;
  return user;
}

export async function GET() {
  const user = await requireStaff();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  const user = await requireStaff();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const content = String(body.content ?? "").slice(0, 4000);
  if (!content.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  await prisma.chatMessage.create({ data: { userId: user.id, role: "USER", content } });

  const history = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  const reply = await trainerChat(
    history.map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }))
  );

  const saved = await prisma.chatMessage.create({ data: { userId: user.id, role: "ASSISTANT", content: reply } });

  return NextResponse.json({ message: saved });
}
