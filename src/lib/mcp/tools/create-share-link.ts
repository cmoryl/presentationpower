import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";

function randomToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export default defineTool({
  name: "create_share_link",
  title: "Create deck share link",
  description:
    "Enable read-only sharing for one of the signed-in user's decks and return the share token and URL. Anyone holding the link can view that deck until it expires or sharing is disabled in the app.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID."),
    expires_at: z
      .string()
      .describe("Optional ISO 8601 timestamp after which the link stops working.")
      .optional(),
    regenerate: z
      .boolean()
      .describe("Mint a fresh token, invalidating any link shared earlier.")
      .optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, expires_at, regenerate }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);
    const { data: deck, error } = await supabase
      .from("decks")
      .select("id, title, share_token")
      .eq("id", deck_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!deck) return errorResult("Deck not found");

    const existing = (deck as { share_token: string | null }).share_token;
    const token = !existing || regenerate === true ? randomToken(24) : existing;
    const patch: Record<string, unknown> = {
      share_token: token,
      shared_at: new Date().toISOString(),
    };
    if (expires_at !== undefined) patch.share_expires_at = expires_at;

    const { error: upErr } = await supabase
      .from("decks")
      .update(patch as never)
      .eq("id", deck_id);
    if (upErr) return errorResult(upErr.message);

    return textResult({
      ok: true,
      deck_id,
      title: (deck as { title: string }).title,
      token,
      path: `/share/${token}`,
      expires_at: expires_at ?? null,
    });
  },
});
