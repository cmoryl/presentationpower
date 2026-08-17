import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { publicOrigin } from "@/lib/deck-sharing.core";

export default defineTool({
  name: "export_deck",
  title: "Export deck to PowerPoint",
  description:
    "Build a layered, editable .pptx from a saved deck and return a private download link (valid 1 hour). Runs the native-shape export path, so slides whose artwork needs the in-app renderer are reported back instead of silently flattened.",
  inputSchema: {
    deck_id: z.string().describe("The deck UUID, as returned by list_decks."),
    theme: z
      .enum(["auto", "light", "dark"])
      .default("auto")
      .describe("Force every slide light or dark; 'auto' keeps each slide's own mode."),
    embed_fonts: z
      .boolean()
      .default(true)
      .describe("Embed the brand typeface so the file opens identically on any machine."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, theme, embed_fonts }, ctx) => {
    if (!ctx.isAuthenticated()) return errorResult("Not authenticated");
    const userId = ctx.getUserId();
    if (!userId) return errorResult("Not authenticated");
    const supabase = supabaseForUser(ctx);

    const { exportDeckHeadless } = await import("../export-deck.server");
    const out = await exportDeckHeadless(supabase, {
      deckId: deck_id,
      origin: publicOrigin(),
      mode: theme === "auto" ? null : theme,
      embedFonts: embed_fonts,
    });
    if (!out.ok) return errorResult(out.error);

    const path = `${userId}/${deck_id}-${Date.now()}-${out.fileName}`;
    const up = await supabase.storage.from("deck-exports").upload(path, out.bytes, {
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      upsert: true,
    });
    if (up.error) return errorResult(`Export built but upload failed: ${up.error.message}`);

    const signed = await supabase.storage.from("deck-exports").createSignedUrl(path, 3600);
    if (signed.error || !signed.data?.signedUrl) {
      return errorResult(`Export uploaded but link failed: ${signed.error?.message ?? "no url"}`);
    }

    return textResult({
      deck: out.deckTitle,
      file_name: out.fileName,
      slides: out.slideCount,
      download_url: signed.data.signedUrl,
      download_expires_in_seconds: 3600,
      slides_needing_in_app_export: out.degradedSlides,
      failed_slides: out.failedSlides,
      warnings: out.warnings,
      note: "Show the download link to the user. Slides listed in slides_needing_in_app_export use design plates that only the app renderer can produce — re-export those from the deck editor for pixel-exact artwork.",
    });
  },
});
