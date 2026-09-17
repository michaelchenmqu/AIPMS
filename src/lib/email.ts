// Transactional / campaign email via Resend. Same shape as lib/ai.ts: a real
// call gated behind RESEND_API_KEY, falling back to a no-op (logged, not
// sent) so nothing throws in the demo environment where no key is set.

import { Resend } from "resend";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function client(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/** Sends an email via Resend. In the demo/unconfigured state this logs the
 *  email instead of sending it — callers don't need to branch on whether
 *  email is configured. */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; id?: string }> {
  const resend = client();
  const from = process.env.RESEND_FROM_EMAIL ?? "AIPMS <onboarding@resend.dev>";
  // Resend can only send "from" a domain we've verified — it can't send as
  // a Gmail/Hotmail/etc. address. reply_to is how a real inbox (the staff
  // portal's live contact address) still gets the reply, without needing
  // domain ownership.
  const replyTo = process.env.REPLY_TO_EMAIL;

  if (!resend) {
    console.log(`[email:mock] to=${params.to} subject="${params.subject}"`);
    return { sent: false };
  }

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    ...(replyTo ? { replyTo } : {}),
  });
  if (error) throw new Error(error.message);
  return { sent: true, id: data?.id };
}
