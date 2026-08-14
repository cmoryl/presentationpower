import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { enableDeckSharingCore, shareUrlFor } from "@/lib/deck-sharing.core";

export default defineTool({
  name: "create_share_link",
  title: "Create deck share link",
  description:
    "Enable read-only sharing for one of the signed-in user's decks and return the share token and absolute URL. Anyone holding the link can view that deck until it expires or sharing is disabled in the app.",
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
    const userId = ctx.getUserId();
    if (!userId) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const { data: deck, error } = await supabase
      .from("decks")
      .select("id, title")
      .eq("id", deck_id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!deck) return errorResult("Deck not found");

    try {
      // Same core the in-app `enableDeckSharing` server fn uses — token minting,
      // owner check and column writes live in one place.
      const res = await enableDeckSharingCore(supabase, userId, {
        deckId: deck_id,
        expiresAt: expires_at,
        regenerate,
      });
      return textResult({
        ok: true,
        deck_id,
        title: (deck as { title: string }).title,
        token: res.token,
        url: shareUrlFor(res.token),
        path: `/share/${res.token}`,
        regenerated: res.regenerated,
        expires_at: res.expiresAt,
      });
    } catch (e) {
      return errorResult((e as Error).message);
    }
  },
});
