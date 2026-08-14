// Asset-free manifest of the per-division backdrop sets. Mirrors
// `src/assets/backdrops/divisions/index.ts` (DIVISION_IMAGERY) but carries only
// counts + the set key, so metadata consumers such as the MCP `get_taxonomy`
// tool can describe the available backdrops without importing ~70 images.
//
// Kept honest by `src/lib/division-backdrop-manifest.test.ts`, which imports the
// real registry and asserts these counts still match.

export type BackdropSetInfo = {
  /** Set key — brand modes that share a set report the same key. */
  setKey: string;
  photos: number;
  abstracts: number;
  light: number;
};

export const DIVISION_BACKDROP_MANIFEST: Record<string, BackdropSetInfo> = {
  "bm-enterprise": { setKey: "enterprise", photos: 6, abstracts: 8, light: 6 },
  "bm-subcompany": { setKey: "bm-subcompany", photos: 6, abstracts: 4, light: 0 },
  "bm-division": { setKey: "bm-division", photos: 6, abstracts: 4, light: 0 },
  "bm-tp-media": { setKey: "bm-tp-media", photos: 6, abstracts: 4, light: 0 },
  "bm-tp-legal": { setKey: "bm-tp-legal", photos: 6, abstracts: 4, light: 0 },
  "bm-tp-games": { setKey: "bm-tp-games", photos: 6, abstracts: 4, light: 0 },
  "bm-tp-digital": { setKey: "bm-tp-digital", photos: 6, abstracts: 4, light: 0 },
  "bm-product": { setKey: "enterprise", photos: 6, abstracts: 8, light: 6 },
  "bm-cobrand": { setKey: "enterprise", photos: 6, abstracts: 8, light: 6 },
};

/** Backdrop set for a brand mode, falling back to the enterprise set. */
export function backdropSetFor(brandModeId: string): BackdropSetInfo {
  return DIVISION_BACKDROP_MANIFEST[brandModeId] ?? DIVISION_BACKDROP_MANIFEST["bm-enterprise"]!;
}
