// Meta Graph API — publishes a campaign to a Facebook Page and/or an
// Instagram Business account. Same shape as lib/ai.ts: gated behind real
// credentials, with the caller (marketing/actions.ts) falling back to the
// existing simulated-results path when they're not configured.
//
// Requires META_PAGE_ACCESS_TOKEN, META_PAGE_ID (for Facebook), and
// META_IG_USER_ID (for Instagram) — see .env.example. Instagram posts
// require a publicly reachable image URL; Meta's API rejects localhost or
// relative paths, so this only works once deployed to a real domain.

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function isMetaConfigured(): boolean {
  return Boolean(process.env.META_PAGE_ACCESS_TOKEN);
}

async function graphPost(path: string, params: Record<string, string>): Promise<{ id: string }> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new Error("META_PAGE_ACCESS_TOKEN is not set");

  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: token }),
  });
  const body = await res.json();
  if (!res.ok) {
    const message = body?.error?.message ?? `Graph API error (${res.status})`;
    throw new Error(message);
  }
  return body as { id: string };
}

/** Posts a photo + caption to a Facebook Page. Returns the published post's
 *  ID, or null if META_PAGE_ID isn't configured (Instagram-only setups). */
export async function postToFacebookPage(params: {
  caption: string;
  imageUrl: string;
}): Promise<string | null> {
  const pageId = process.env.META_PAGE_ID;
  if (!pageId) return null;
  const result = await graphPost(`/${pageId}/photos`, {
    url: params.imageUrl,
    caption: params.caption,
  });
  return result.id;
}

/** Publishes a photo + caption to an Instagram Business account. Instagram's
 *  API is two-step: create a media container, then publish it. Returns the
 *  published post's ID, or null if META_IG_USER_ID isn't configured. */
export async function postToInstagram(params: {
  caption: string;
  imageUrl: string;
}): Promise<string | null> {
  const igUserId = process.env.META_IG_USER_ID;
  if (!igUserId) return null;

  const container = await graphPost(`/${igUserId}/media`, {
    image_url: params.imageUrl,
    caption: params.caption,
  });
  const published = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: container.id,
  });
  return published.id;
}
