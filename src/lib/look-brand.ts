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
