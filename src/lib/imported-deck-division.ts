// Division-id translation for imported PPTX decks.
//
// imported_decks.division_id stores the brand-guide slug
// ("transperfect-life-sciences"); brand_asset_chunks.division_id uses the
// canonical bm-* brand mode id ("bm-tp-lifesci"). Keep the mapping in one
// pure module so server-only ingest code and client route code can both
// use it without dragging server dependencies into the browser bundle.

const IMPORTED_DECK_SLUG_TO_DIVISION: Record<string, string> = {
  "transperfect-master": "bm-enterprise",
  globallink: "bm-division",
  "transperfect-life-sciences": "bm-tp-lifesci",
  "transperfect-legal": "bm-tp-legal",
  "transperfect-media": "bm-tp-media",
  "transperfect-gaming": "bm-tp-games",
  "transperfect-digital": "bm-tp-digital",
  dataforce: "bm-product",
  "transperfect-cobrand": "bm-cobrand",
  "trial-interactive": "bm-trial-interactive",
};

/** slug → canonical bm-* brand mode id (identity for unknown values). */
export function normalizeImportedDeckDivision(v: string): string {
  return IMPORTED_DECK_SLUG_TO_DIVISION[v] ?? v;
}

/**
 * Inverse: given a bm-* id (or an already-slug string), return the slug used
 * by the imported_decks table so callers that speak the canonical bm-* scheme
 * can filter that table safely.
 */
export function importedDeckSlugForDivision(v: string): string {
  if (Object.prototype.hasOwnProperty.call(IMPORTED_DECK_SLUG_TO_DIVISION, v)) return v;
  for (const [slug, div] of Object.entries(IMPORTED_DECK_SLUG_TO_DIVISION)) {
    if (div === v) return slug;
  }
  return v;
}
