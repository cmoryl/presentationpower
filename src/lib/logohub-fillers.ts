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

/**
 * Convert LogoHub rows into filler items.
 *
 * By default (used for logo-wall style variants), only rows that ship BOTH
 * a color/light mark AND a dedicated white/dark mark are included — so
 * dark-mode walls never fall back to a color logo that fights the backdrop.
 * Pass `{ requireBoth: false }` for looser callers (e.g. single-logo
 * placements where any variant is acceptable).
 */
export function toLogoFillers(
  rows: ClientLogoRow[] | undefined | null,
  opts: { requireBoth?: boolean } = {},
): LogoFiller[] {
  if (!rows || rows.length === 0) return [];
  const requireBoth = opts.requireBoth !== false;
  const out: LogoFiller[] = [];
  for (const r of rows) {
    const light = r.lightUrl || r.primaryUrl;
    // `darkUrl` is the explicit white/on-dark variant. Only fall back to
    // primary when the caller doesn't require a real dark asset.
    const dark = r.darkUrl || (requireBoth ? null : r.primaryUrl);
    if (requireBoth) {
      if (!light || !dark) continue;
    } else if (!light && !dark) {
      continue;
    }
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
    // Client-name modules: real client names + marks so an outcome matrix or a
    // compare table never shows a TransPerfect division as the "client".
    case "MV-CLIENT-MATRIX":
    case "MV-CLIENT-COMPARE":
    case "MV-STAT-PORTRAIT-PROOF": {
      if (items.length === 0) return content;
      const picks = pickN(pool, items.length, variantId);
      return {
        ...content,
        items: items.map((it, i) => {
          const base = (it ?? {}) as Record<string, unknown>;
          const p = picks[i];
          if (!p) return base;
          return {
            ...base,
            client: p.name,
            logoUrl: p.logoUrl,
            logoUrlDark: p.logoUrlDark,
          };
        }),
      };
    }
    default:
      return content;
  }

}
