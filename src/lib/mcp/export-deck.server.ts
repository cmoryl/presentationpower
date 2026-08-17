/**
 * Headless (no-DOM) PowerPoint export for the MCP `export_deck` tool.
 *
 * The in-app export mounts every slide in a hidden React root and rasterizes
 * design plates from the live DOM. None of that exists on the server, and those
 * passes are already gated on `typeof document !== "undefined"`, so this entry
 * drives the SAME exporter down its native-OOXML path only:
 *
 *   - variants with a native emitter export exactly as they do in the app;
 *   - variants that normally rely on a captured plate fall through to the
 *     family-generic renderer, and are reported back by name so the caller can
 *     tell the user which slides to re-export from the app.
 *
 * Nothing about the browser export changes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { cloudDeckToLocal } from "@/lib/cloud-deck-import";
import { BRAND_MODES, byId } from "@/lib/taxonomy";
import { hasNativeVariantEmitter } from "@/lib/export-native-variants";
import { setAssetBaseUrl } from "@/lib/asset-base-url";

/** Hard cap: an MCP tool call is synchronous with a client-side timeout. */
export const MAX_EXPORT_SLIDES = 40;

export type HeadlessExportOptions = {
  deckId: string;
  /** Origin used to resolve root-relative assets (fonts, /brand-logos, …). */
  origin: string;
  mode?: "light" | "dark" | null;
  embedFonts?: boolean;
  backgroundInMaster?: boolean;
};

export type HeadlessExportResult =
  | { ok: false; error: string }
  | {
      ok: true;
      bytes: Uint8Array;
      fileName: string;
      deckTitle: string;
      slideCount: number;
      /** Slides whose artwork needs the in-app export for full fidelity. */
      degradedSlides: Array<{ position: number; variantId: string }>;
      failedSlides: string[];
      warnings: string[];
    };

const DECK_COLS =
  "id, title, brand_mode_id, archetype_id, created_at, context, brief_id, owner_id";
const SLIDE_COLS = "id, position, section_id, variant_id, layout_id, notes, content";

function safeName(title: string): string {
  const base = title.replace(/[^a-z0-9-_ ]+/gi, "").trim().replace(/\s+/g, "-");
  return `${base || "deck"}.pptx`;
}

export async function exportDeckHeadless(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  opts: HeadlessExportOptions,
): Promise<HeadlessExportResult> {
  const { data: deckRow, error: deckErr } = await supabase
    .from("decks")
    .select(DECK_COLS)
    .eq("id", opts.deckId)
    .maybeSingle();
  if (deckErr) return { ok: false, error: deckErr.message };
  if (!deckRow) return { ok: false, error: "Deck not found" };

  const { data: slideRows, error: slidesErr } = await supabase
    .from("deck_slides")
    .select(SLIDE_COLS)
    .eq("deck_id", opts.deckId)
    .order("position", { ascending: true });
  if (slidesErr) return { ok: false, error: slidesErr.message };
  const slides = slideRows ?? [];
  if (slides.length === 0) return { ok: false, error: "Deck has no slides" };
  if (slides.length > MAX_EXPORT_SLIDES) {
    return {
      ok: false,
      error: `This deck has ${slides.length} slides; the MCP export is capped at ${MAX_EXPORT_SLIDES}. Export it from the app instead.`,
    };
  }

  const brief = deckRow.brief_id
    ? (
        await supabase
          .from("briefs")
          .select(
            "id, prospect, industry, meeting_objective, audience, brand_mode_id, sub_company, length_target, known_facts, inputs, created_at",
          )
          .eq("id", deckRow.brief_id)
          .maybeSingle()
      ).data
    : null;

  const { deck } = cloudDeckToLocal({ deck: deckRow, brief, slides });
  const brand = byId(BRAND_MODES, deck.brandModeId) ?? BRAND_MODES[0]!;

  // Root-relative asset URLs (Geist font files, /brand-logos/…) have no base
  // URL on the server; give the export pipeline the request origin.
  setAssetBaseUrl(opts.origin);

  const { exportDeckToPptx } = await import("@/lib/pptx-export");
  const result = await exportDeckToPptx(deck, brand, {
    output: "blob",
    fidelity: "editable",
    forceMode: opts.mode ?? undefined,
    embedFonts: opts.embedFonts ?? true,
    backgroundInMaster: opts.backgroundInMaster ?? true,
  });
  if (!result.blob) return { ok: false, error: "Export produced no file" };

  return {
    ok: true,
    bytes: new Uint8Array(await result.blob.arrayBuffer()),
    fileName: result.fileName ?? safeName(deck.title),
    deckTitle: deck.title,
    slideCount: deck.slides.length,
    degradedSlides: deck.slides
      .map((s, i) => ({ position: i, variantId: s.variantId }))
      .filter((s) => !hasNativeVariantEmitter(s.variantId)),
    failedSlides: result.failedSlides ?? [],
    warnings: result.warnings ?? [],
  };
}
