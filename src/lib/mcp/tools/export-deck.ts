import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, supabaseForUser, textResult } from "../supabase";
import { publicOrigin } from "@/lib/deck-sharing.core";

export default defineTool({
  name: "export_deck",
  title: "Export deck to PowerPoint",
  description:
    "Build an exact-build-fidelity .pptx from a saved deck and return a private download link (valid 1 hour). Every slide is rebuilt from the scene graph captured from the real rendered component, so the file matches the app 1:1. Slides with no current capture are reported as unsupported and left out — never substituted with a different design.",
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

    // Housekeeping: an export of a private deck must not linger as a durable
    // artifact. Anything older than 24h in this caller's own folder goes.
    try {
      const { data: existing } = await supabase.storage.from("deck-exports").list(userId, {
        limit: 100,
        sortBy: { column: "created_at", order: "asc" },
      });
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const stale = (existing ?? [])
        .filter((f) => {
          const at = f.created_at ? Date.parse(f.created_at) : NaN;
          return Number.isFinite(at) && at < cutoff;
        })
        .map((f) => `${userId}/${f.name}`);
      if (stale.length) await supabase.storage.from("deck-exports").remove(stale);
    } catch {
      /* cleanup is best-effort; never fail an export over it */
    }

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

    // Warm-up link: opening the deck's export screen in the app records a fresh
    // capture of every slide, which is what an unsupported slide needs.
    const warmUpUrl = `${publicOrigin()}/decks/${deck_id}/export?auto=pptx&fidelity=build`;
    const unsupported = out.unsupportedSlides;

    return textResult({
      deck: out.deckTitle,
      file_name: out.fileName,
      slides: out.slideCount,
      download_url: signed.data.signedUrl,
      download_expires_in_seconds: 3600,
      fidelity: "exact-build",
      exact_slides: out.exactSlides,
      unsupported_slides: unsupported,
      ...(unsupported.length ? { warm_up_url: warmUpUrl } : {}),
      failed_slides: out.failedSlides,
      warnings: out.warnings,
      delivery_instruction: [
        "Give the user download_url as the finished PowerPoint. Every slide in it was rebuilt from the exact rendered build, fully layered and editable in PowerPoint.",
        "Do NOT describe this file as a fallback, and do NOT send the user to the app to re-export the slides it contains.",
        unsupported.length
          ? "unsupported_slides is non-empty: name those slides to the user, say they were left out rather than redrawn, and offer warm_up_url — opening it once in the app records their exact appearance, after which this export includes them."
          : "No caveat is needed: the whole deck exported at exact build fidelity.",
        out.failedSlides.length
          ? "failed_slides is non-empty: name those slides to the user as needing attention."
          : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  },
});
