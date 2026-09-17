// WhatsApp Cloud API — receives guest inquiries into the staff Inbox and
// lets staff reply from there. Same gated-real-call shape as lib/meta.ts,
// which this shares an app with (WhatsApp is a product on the same Meta
// app as the Page/Instagram posting integration).
//
// Requires WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID (for sending),
// and WHATSAPP_VERIFY_TOKEN (an arbitrary string you also paste into the
// Meta App dashboard's webhook config — see .env.example). Without them,
// the webhook route 404s and no reply button appears in the Inbox.

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Sends a plain-text WhatsApp message. `to` is the guest's phone number in
 *  the format the Cloud API's webhook gave us (E.164 digits, no "+"). */
export async function sendWhatsAppMessage(params: { to: string; body: string }): Promise<{ id: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error("WhatsApp isn't configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)");

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to,
      type: "text",
      text: { body: params.body },
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `WhatsApp API error (${res.status})`);
  }
  return { id: body.messages?.[0]?.id };
}

/** Verifies the webhook subscription handshake Meta sends once, when the
 *  webhook URL is first configured in the App dashboard. Returns the
 *  challenge string to echo back, or null if verification fails. */
export function verifyWebhookChallenge(params: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
}): string | null {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken || params.mode !== "subscribe" || params.token !== verifyToken || !params.challenge) {
    return null;
  }
  return params.challenge;
}

/** Shape of a single inbound text message inside a webhook POST's
 *  entry[0].changes[0].value. WhatsApp also sends delivery-status updates
 *  and non-text message types through the same webhook — parseInboundText
 *  in the route handler ignores anything that doesn't match this. */
export type WhatsAppInboundMessage = {
  from: string; // phone number, no "+"
  id: string;
  text?: { body: string };
  type: string;
};
