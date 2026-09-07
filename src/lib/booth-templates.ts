// TransPerfect NEXT — BOOTH TEMPLATES held in the backend.
//
// The vendor booth masters used to be bundled in the app (see
// next-london-booths.ts), which meant a new artwork round or a different stand
// size was a code change. The masters now live in Cloud storage with one
// `booth_templates` row each: vendor, style, stored master + proof, trim size,
// bleed, stand-size preset and an editable overlay (headline, lockup, QR,
// placement) recorded per booth.
//
// The bundled list stays as the offline fallback so the London page still
// renders when the backend is unreachable — a template row simply patches the
// matching spec, artboard and panel record in place, which is why previews,
// print previews, `.svg`/`.ai` masters and the pack builder all follow a
// database edit without any of them knowing about the database.

import {
  LONDON_BOOTHS,
  LONDON_BOOTH_BLEED_MM,
  type LondonBoothSpec,
} from "@/lib/next-london-booths";
import {
  LONDON_BOOTH_PANELS,
  LONDON_BOOTH_PANEL_META,
} from "@/lib/next-london-signage";
import {
  DEFAULT_LOGO_PLACEMENT,
  setLondonLogoPlacement,
  type LondonLogoPlacement,
} from "@/lib/next-london-logo-placement";

/**
 * The editable layer that sits on top of a supplied booth wall: a partial
 * placement record, exactly what the live panel editor already writes, so an
 * overlay saved here reproduces in every renderer.
 */
export type BoothTemplateOverlay = Partial<LondonLogoPlacement>;

export type BoothTemplateRecord = {
  id: string;
  slug: string;
  vendor: string;
  venue: string;
  style: string;
  source_file: string | null;
  master_path: string | null;
  master_content_type: string | null;
  proof_path: string | null;
  trim_w: number;
  trim_h: number;
  bleed_mm: number;
  trim_preset_id: string | null;
  overlay: BoothTemplateOverlay;
  sort_order: number;
  is_active: boolean;
  revision: number;
  updated_at: string;
  /** Read URLs resolved server-side from the private bucket. */
  master_url: string | null;
  proof_url: string | null;
};

/** Only the placement keys we store; anything else in the row is ignored. */
export function normalizeBoothOverlay(raw: unknown): BoothTemplateOverlay {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(DEFAULT_LOGO_PLACEMENT)) {
    const value = (raw as Record<string, unknown>)[key];
    if (value !== undefined) out[key] = value;
  }
  return out as BoothTemplateOverlay;
}

/** The overlay to save for a booth: the live placement, minus untouched keys. */
export function boothOverlayFromPlacement(
  placement: LondonLogoPlacement,
): BoothTemplateOverlay {
  const out: Record<string, unknown> = {};
  for (const [key, fallback] of Object.entries(DEFAULT_LOGO_PLACEMENT)) {
    const value = (placement as Record<string, unknown>)[key];
    if (value !== fallback) out[key] = value;
  }
  return out as BoothTemplateOverlay;
}

/** Booth spec ids keyed by the template slug they correspond to. */
function specFor(slug: string): LondonBoothSpec | undefined {
  return LONDON_BOOTHS.find((b) => b.id === slug);
}

/**
 * Patch the in-memory booth set from backend template rows.
 *
 * Mutation is deliberate: the panel records were derived once at module load
 * and are referenced by the whole signage pipeline, so patching the same
 * objects is what makes a database edit reach the masters. Returns the number
 * of booths that changed.
 */
export function applyBoothTemplates(rows: BoothTemplateRecord[]): number {
  let changed = 0;
  for (const row of rows) {
    if (!row.is_active) continue;
    const spec = specFor(row.slug);
    if (!spec) continue;

    spec.vendor = row.vendor;
    spec.style = row.style;
    spec.sourceFile = row.source_file;
    if (row.master_url) spec.aiUrl = row.master_url;

    const artboard = spec.artboards.find((a) => a.kind === "main") ?? spec.artboards[0];
    if (artboard) {
      artboard.trimW = row.trim_w;
      artboard.trimH = row.trim_h;
      artboard.bleedMm = row.bleed_mm;
      if (row.proof_url) artboard.previewUrl = row.proof_url;
    }

    // Every panel built from this booth follows the template's geometry.
    for (const panel of LONDON_BOOTH_PANELS) {
      const meta = LONDON_BOOTH_PANEL_META[panel.id];
      if (!meta || meta.booth !== spec) continue;
      const edge = row.bleed_mm ?? LONDON_BOOTH_BLEED_MM;
      panel.name = row.vendor;
      panel.room = `${row.vendor.toUpperCase()} BOOTH`;
      panel.trimW = row.trim_w;
      panel.trimH = row.trim_h;
      panel.bleedEdge = edge;
      panel.bleedW = row.trim_w + edge * 2;
      panel.bleedH = row.trim_h + edge * 2;
      panel.style = row.style;
      panel.proof = row.source_file ?? panel.proof;

      const overlay = normalizeBoothOverlay(row.overlay);
      if (Object.keys(overlay).length > 0) setLondonLogoPlacement(panel.id, overlay);
    }
    changed += 1;
  }
  return changed;
}
