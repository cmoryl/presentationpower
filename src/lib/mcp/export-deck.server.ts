/**
 * Headless (no-DOM) PowerPoint export for the MCP `export_deck` tool.
 *
 * EXACT BUILD FIDELITY CONTRACT. There is no browser on the server, so this
 * entry cannot render a slide itself — and it must never fall back to a
 * generic module -> PowerPoint reconstruction. Instead it replays the scene
 * graph the app captured from the REAL rendered component
 * (`deck_slide_captures`): the design plate, the measured text runs and the
 * native shapes. Editor and export therefore consume one scene graph, not two
 * layout engines.
 *
 *   - slide with a capture whose fingerprint still matches the slide -> exported
 *     from that scene graph, 1:1 with the editor;
 *   - slide with no capture, or a stale one -> reported as UNSUPPORTED and left
 *     out of the file. It is never substituted with a different design.
 *
 * A capture is written whenever the deck is exported (or warmed up) in the app.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { cloudDeckToLocal } from "@/lib/cloud-deck-import";
import { BRAND_MODES, byId } from "@/lib/taxonomy";
import { setAssetBaseUrl } from "@/lib/asset-base-url";
import { captureContextOf, slideCaptureFingerprint } from "@/lib/export-capture-key";

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
      /**
       * Slides left out because no current capture of the rendered component
       * exists. Nothing was substituted for them.
       */
      unsupportedSlides: Array<{ position: number; variantId: string; reason: string }>;
      /** Slides rebuilt from the captured scene graph (1:1 with the editor). */
      exactSlides: number;
      failedSlides: string[];
      warnings: string[];
    };

type CaptureRow = {
  slide_id: string;
  mode: "light" | "dark";
  fingerprint: string;
  plate: string;
  runs: unknown;
  shapes: unknown;
};

const DECK_COLS = "id, title, brand_mode_id, archetype_id, created_at, context, brief_id, owner_id";
const SLIDE_COLS = "id, position, section_id, variant_id, layout_id, notes, content";

function safeName(title: string): string {
  const base = title
    .replace(/[^a-z0-9-_ ]+/gi, "")
    .trim()
    .replace(/\s+/g, "-");
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

  // ---------------------------------------------------------------------------
  // Load the captured scene graphs and keep only the ones that still describe
  // the slide as it stands now (fingerprint match).
  // ---------------------------------------------------------------------------
  const { data: captureRows } = await supabase
    .from("deck_slide_captures")
    .select("slide_id, mode, fingerprint, plate, runs, shapes")
    .eq("deck_id", opts.deckId);
  const rows = (captureRows ?? []) as CaptureRow[];
  const ctx = captureContextOf(deck);
  const wantMode = opts.mode ?? null;

  const sceneCaptures: Record<
    string,
    { plate: string; runs?: never[]; shapes?: never[] }
  > = {};
  const unsupportedSlides: Array<{ position: number; variantId: string; reason: string }> = [];

  deck.slides.forEach((sl, i) => {
    const candidates = rows.filter((r) => r.slide_id === sl.id);
    const scoped = wantMode ? candidates.filter((r) => r.mode === wantMode) : candidates;
    const match = scoped.find((r) => r.fingerprint === slideCaptureFingerprint(sl, ctx, r.mode));
    if (!match) {
      unsupportedSlides.push({
        position: i,
        variantId: sl.variantId,
        reason: candidates.length
          ? "the saved capture no longer matches this slide (it was edited since); open the deck in the app to refresh it"
          : "this slide has never been rendered in the app, so there is no exact capture to export from",
      });
      return;
    }
    sceneCaptures[sl.id] = {
      plate: match.plate,
      runs: (Array.isArray(match.runs) ? match.runs : []) as never[],
      shapes: (Array.isArray(match.shapes) ? match.shapes : []) as never[],
    };
  });

  const exportable = deck.slides.filter((sl) => Boolean(sceneCaptures[sl.id]));
  if (exportable.length === 0) {
    return {
      ok: false,
      error:
        "No slide in this deck has an exact capture yet, so nothing can be exported at build fidelity. Open the deck once in the app (or export it there) to record the rendered slides, then try again.",
    };
  }

  const { exportDeckToPptx } = await import("@/lib/pptx-export");
  const result = await exportDeckToPptx({ ...deck, slides: exportable }, brand, {
    output: "blob",
    // Exact Build Fidelity: every slide comes from the captured scene graph.
    fidelity: "build",
    sceneCaptures,
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
    slideCount: exportable.length,
    unsupportedSlides,
    exactSlides: exportable.length,
    failedSlides: result.failedSlides ?? [],
    warnings: result.warnings ?? [],
  };
}
