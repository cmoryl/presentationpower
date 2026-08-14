// Asset-free lookup from BRAND_MODES ids / BrandGuide slugs → division logo
// slug. Kept in its own module so metadata consumers (MCP taxonomy tool,
// server code) can resolve a slug without pulling every logo image into their
// bundle. `division-logos.ts` is the only place that maps slug → image files.

export const KEY_TO_SLUG: Record<string, string> = {
  // BRAND_MODES ids
  master: "tp",
  "bm-master": "tp",
  "bm-enterprise": "tp",
  "bm-division": "globallink",
  "bm-subcompany": "tp",
  "bm-tp-legal": "legal",
  "bm-tp-media": "media",
  "bm-tp-games": "games",
  "bm-tp-digital": "digital",
  "bm-tp-lifesci": "lifesci",
  "bm-trial-interactive": "tp",
  "bm-product": "dataforce",
  "bm-cobrand": "tp",

  // BrandGuide slugs
  "transperfect-master": "tp",
  transperfect: "tp",
  globallink: "globallink",
  "transperfect-life-sciences": "lifesci",
  "transperfect-legal": "legal",
  "transperfect-media": "media",
  "transperfect-gaming": "games",
  "transperfect-digital": "digital",
  "transperfect-cobrand": "tp",
  dataforce: "dataforce",
  "trial-interactive": "tp",

  // Convenience aliases
  legal: "legal",
  lifesci: "lifesci",
  "life-sciences": "lifesci",
  media: "media",
  games: "games",
  digital: "digital",
};

/** Resolve a brand mode id / guide slug to its division logo slug. */
export function divisionLogoSlug(key?: string | null): string | undefined {
  if (!key) return undefined;
  return KEY_TO_SLUG[key.toLowerCase()];
}
