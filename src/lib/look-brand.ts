// -----------------------------------------------------------------------------
// LOOK → BRAND OWNER
//
// Most looks are TransPerfect enterprise templates, so their previews and
// seeded demo slides carry the TransPerfect lockup. A few looks belong to a
// named product brand (e.g. the AI / Data signature is DataForce's template),
// and those must preview with the product lockup instead of the master
// wordmark. The mapping is keyed by look code so it holds for the catalog pack
// (`skin-r03`) and for an edited/saved version of the same look (`tpl-r03`).
// -----------------------------------------------------------------------------

/** Look code → brand-mode id that owns the look. */
export const LOOK_BRAND_MODE: Record<string, string> = {
  // AI · Data Signature is DataForce's template (DataForce by TransPerfect).
  R03: "bm-product",
};

/** Normalises any pack id / code to the bare look code (e.g. "R03"). */
export function lookCodeFromPackId(id: string): string {
  return id
    .replace(/^tpl-/i, "")
    .replace(/^skin-/i, "")
    .toUpperCase();
}

/** Brand-mode id that owns a look, defaulting to the enterprise master brand. */
export function lookBrandModeId(packIdOrCode: string | null | undefined): string {
  if (!packIdOrCode) return "bm-enterprise";
  const code = lookCodeFromPackId(packIdOrCode);
  return LOOK_BRAND_MODE[code] ?? LOOK_BRAND_MODE[code.replace(/-V\d+$/i, "")] ?? "bm-enterprise";
}

/**
 * Reverse lookup: the catalog pack id a brand mode's own look lives at, so
 * picking that brand scope in the library activates its template (e.g.
 * DataForce → the AI · Data Signature look).
 */
export function packIdForBrandMode(brandModeId: string | null | undefined): string | null {
  if (!brandModeId) return null;
  const code = Object.keys(LOOK_BRAND_MODE).find((c) => LOOK_BRAND_MODE[c] === brandModeId);
  return code ? `skin-${code.toLowerCase()}` : null;
}

/**
 * Look code → glyph colour, when a look leads its structure in one colour and
 * its icons in another. DataForce's AI · Data Signature paints rules, ticks and
 * accent bands in DataForce Green and keeps every icon in DataForce Blue.
 */
export const LOOK_GLYPH_COLOR: Record<string, string> = {
  R03: "#139DD8",
};

/**
 * A saved/edited look (`tpl-…`) is authored by an admin in Template Studio, so
 * its own palette is the authority — the owning brand's hard lock only applies
 * to the shipped catalog pack. Without this, editing the DataForce look's
 * accents in the studio appeared to revert on every render surface.
 */
function isAuthoredPack(id: string): boolean {
  return /^tpl-/i.test(id);
}

/** Glyph colour a look forces on its icons, or null to follow the accent. */
export function lookGlyphColor(packIdOrCode: string | null | undefined): string | null {
  if (!packIdOrCode || isAuthoredPack(packIdOrCode)) return null;
  const code = lookCodeFromPackId(packIdOrCode);
  return LOOK_GLYPH_COLOR[code] ?? LOOK_GLYPH_COLOR[code.replace(/-V\d+$/i, "")] ?? null;
}

/**
 * Lead / accent colours a look's OWNING brand forces on its structure.
 *
 * The single-slide PPTX export path resolves a product-owned look under that
 * product's brand mode; the module preview renderer used to keep whatever brand
 * scope was selected, so a DataForce-owned look previewed in the catalog
 * palette and exported in DataForce green. Both paths now read this table
 * through `packToneBrand`, so preview and export are one pipeline.
 */
export const LOOK_OWNER_ACCENT: Record<string, { primary: string; accent: string }> = {
  // DataForce Green leads the structure on AI · Data Signature.
  R03: { primary: "#7BCD3A", accent: "#7BCD3A" },
};

/**
 * Owning-brand lead/accent for a look, or null when the look is enterprise or
 * when an admin has saved their own version of it in Template Studio.
 */
export function lookOwnerAccent(
  packIdOrCode: string | null | undefined,
): { primary: string; accent: string } | null {
  if (!packIdOrCode || isAuthoredPack(packIdOrCode)) return null;
  const code = lookCodeFromPackId(packIdOrCode);
  return LOOK_OWNER_ACCENT[code] ?? LOOK_OWNER_ACCENT[code.replace(/-V\d+$/i, "")] ?? null;
}
