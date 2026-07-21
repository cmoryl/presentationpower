// Turn LogoHub client-logo rows into filler items for the MV-PROOF-LOGOS-*
// module variants. The renderer's `pickLogoForMode` reads `logoUrl` (light)
// and `logoUrlDark` (dark) so we normalize to that shape once here.
//
// When LogoHub is empty (no rows, sign-in required, fetch error), callers
// should fall back to the built-in APPROVED_LOGOS set that already ships
// through `seedContent()`.

import type { ClientLogoRow } from "@/lib/client-logos.functions";

export type LogoFiller = {
  name: string;
  logoUrl: string;
  logoUrlDark: string;
};

export function toLogoFillers(rows: ClientLogoRow[] | undefined | null): LogoFiller[] {
  if (!rows || rows.length === 0) return [];
  const out: LogoFiller[] = [];
  for (const r of rows) {
    const light = r.lightUrl || r.primaryUrl;
    const dark = r.darkUrl || r.primaryUrl;
    if (!light && !dark) continue;
    out.push({
      name: r.client_name,
      logoUrl: (light ?? dark) as string,
      logoUrlDark: (dark ?? light) as string,
    });
  }
  return out;
}

/** Deterministic slice — same variant id always gets the same batch so
 *  A/B toggles don't reshuffle the wall. */
function pickN(pool: LogoFiller[], count: number, seed: string): LogoFiller[] {
  if (pool.length === 0) return [];
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const start = h % pool.length;
  const out: LogoFiller[] = [];
  for (let i = 0; i < count; i++) out.push(pool[(start + i) % pool.length]);
  return out;
}

/**
 * Overlay LogoHub logos on top of a seeded content payload for the
 * MV-PROOF-LOGOS-* family. Preserves the number of items the variant
 * expects; leaves non-logo fields (title, kicker, subtitle) alone.
 */
export function overlayLogoHubFillers(
  content: Record<string, unknown>,
  variantId: string,
  pool: LogoFiller[],
): Record<string, unknown> {
  if (pool.length === 0) return content;

  const items = Array.isArray(content.items) ? (content.items as unknown[]) : [];

  switch (variantId) {
    case "MV-PROOF-LOGOS":
    case "MV-CASE-LOGO-GRID":
    case "MV-LOGO-WALL":
    case "MV-PROOF-LOGOS-STRIP":
    case "MV-PROOF-LOGOS-MARQUEE":
    case "MV-PROOF-LOGOS-MOSAIC": {

      const n = Math.max(items.length, 1);
      const picks = pickN(pool, n, variantId);
      return {
        ...content,
        items: picks.map((p, i) => {
          const base = (items[i] ?? {}) as Record<string, unknown>;
          return { ...base, name: p.name, logoUrl: p.logoUrl, logoUrlDark: p.logoUrlDark };
        }),
      };
    }
    case "MV-PROOF-LOGOS-FEATURED": {
      const picks = pickN(pool, Math.max(1, items.length) + 1, variantId);
      const [featured, ...rest] = picks;
      return {
        ...content,
        featuredName: featured.name,
        featuredLogoUrl: featured.logoUrl,
        featuredLogoUrlDark: featured.logoUrlDark,
        items: rest.map((p, i) => {
          const base = (items[i] ?? {}) as Record<string, unknown>;
          return { ...base, name: p.name, logoUrl: p.logoUrl, logoUrlDark: p.logoUrlDark };
        }),
      };
    }
    case "MV-PROOF-LOGOS-CATEGORIZED": {
      // Two groups; refill each group's `logos[]` array.
      const groups = Array.isArray(content.items) ? (content.items as unknown[]) : [];
      const perGroup = 4;
      const picks = pickN(pool, groups.length * perGroup, variantId);
      const out = groups.map((g, gi) => {
        const grp = (g ?? {}) as Record<string, unknown>;
        const existing = Array.isArray(grp.logos) ? (grp.logos as unknown[]) : [];
        const slice = picks.slice(gi * perGroup, gi * perGroup + perGroup);
        return {
          ...grp,
          logos: slice.map((p, i) => {
            const base = (existing[i] ?? {}) as Record<string, unknown>;
            return { ...base, name: p.name, logoUrl: p.logoUrl, logoUrlDark: p.logoUrlDark };
          }),
        };
      });
      return { ...content, items: out };
    }
    default:
      return content;
  }
}
