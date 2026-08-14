// Transport-free share-link core. Shared by the `enableDeckSharing` server fn
// and the `create_share_link` MCP tool so token minting, owner checks and
// column writes exist exactly once.

import { z } from "zod";

export const shareEnableInput = z.object({
  deckId: z.string().uuid(),
  expiresAt: z.string().datetime().nullable().optional(),
  regenerate: z.boolean().optional(),
});

export type ShareEnableInput = z.infer<typeof shareEnableInput>;

/** URL-safe random token. Web crypto is available in the Worker runtime. */
export function randomShareToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]!);
  return btoa(s)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

type MinimalSb = {
  from: (t: string) => any;
};

/**
 * Mint (or reuse) a deck's share token. Owner-scoped: throws when the caller
 * does not own the deck. Writes `share_token` / `shared_at` (and
 * `share_expires_at` when an expiry is supplied) — all three columns exist on
 * `public.decks`.
 */
export async function enableDeckSharingCore(
  supabase: unknown,
  userId: string,
  rawInput: unknown,
): Promise<{ token: string; regenerated: boolean; expiresAt: string | null }> {
  const data = shareEnableInput.parse(rawInput);
  const sb = supabase as MinimalSb;

  const { data: existing, error: readErr } = await sb
    .from("decks")
    .select("id, owner_id, share_token, share_expires_at")
    .eq("id", data.deckId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!existing) throw new Error("Deck not found");
  if (existing.owner_id !== userId) throw new Error("Forbidden");

  let token = existing.share_token as string | null;
  const needsNew = !token || data.regenerate === true;
  if (needsNew) token = randomShareToken(24);

  const patch: Record<string, unknown> = {
    share_token: token,
    shared_at: new Date().toISOString(),
  };
  if (data.expiresAt !== undefined) patch.share_expires_at = data.expiresAt;

  const { error: upErr } = await sb.from("decks").update(patch).eq("id", data.deckId);
  if (upErr) throw new Error(upErr.message);

  return {
    token: token as string,
    regenerated: needsNew,
    expiresAt:
      data.expiresAt !== undefined
        ? (data.expiresAt ?? null)
        : ((existing.share_expires_at as string | null) ?? null),
  };
}

/** Absolute public origin for share URLs. */
export function publicOrigin(): string {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return (
    env?.PUBLIC_SITE_URL ??
    env?.VITE_PUBLIC_SITE_URL ??
    "https://presentationpower.lovable.app"
  ).replace(/\/+$/, "");
}

export function shareUrlFor(token: string): string {
  return `${publicOrigin()}/share/${token}`;
}
