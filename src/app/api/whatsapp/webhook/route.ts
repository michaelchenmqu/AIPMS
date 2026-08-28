// Inbound WhatsApp: GET handles Meta's one-time webhook verification
// handshake; POST receives guest messages and files them into the staff
// Inbox as a WHATSAPP-channel InboxMessage, AI-classified the same way
// every other inbox source is (see lib/ai.ts#classifyInboxMessage).
//
// 404s when WhatsApp isn't configured, same as every other gated
// integration — see lib/whatsapp.ts.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { classifyInboxMessage } from "@/lib/ai";
import { isWhatsAppConfigured, verifyWebhookChallenge, type WhatsAppInboundMessage } from "@/lib/whatsapp";

export async function GET(req: Request) {
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const challenge = verifyWebhookChallenge({
    mode: url.searchParams.get("hub.mode"),
    token: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
  });
  if (!challenge) return NextResponse.json({ error: "Verification failed" }, { status: 403 });
  return new NextResponse(challenge);
}

export async function POST(req: Request) {
  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let payload: {
    entry?: {
      changes?: {
        value?: {
          contacts?: { profile?: { name?: string } }[];
          messages?: WhatsAppInboundMessage[];
        };
      }[];
    }[];
  };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const value = payload.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];

  // Delivery-status callbacks and non-text messages (images, reactions, ...)
  // land here too — nothing to file into the Inbox, just acknowledge.
  if (!message || message.type !== "text" || !message.text?.body) {
    return NextResponse.json({ ok: true });
  }

  const fromName = value?.contacts?.[0]?.profile?.name ?? message.from;
  const body = message.text.body;
  const subject = body.length > 60 ? `${body.slice(0, 57)}...` : body;

  const ai = await classifyInboxMessage({ subject, body });

  await prisma.inboxMessage.create({
    data: {
      fromName,
      fromPhone: message.from,
      channel: "WHATSAPP",
      subject,
      body,
      aiKind: ai.kind,
      aiConfidence: ai.confidence,
      aiPrimaryAction: ai.primaryAction,
      aiSecondaryAction: ai.secondaryAction,
    },
  });

  return NextResponse.json({ ok: true });
}
