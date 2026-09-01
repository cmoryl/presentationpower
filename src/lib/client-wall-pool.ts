// Shared, module-level cache of the REAL approved client-logo pool.
//
// The logo-wall builders in `reinterpret-design.ts` are synchronous and cannot
// fetch, so they used to fall back to `APPROVED_LOGOS` — the TransPerfect
// division lockups — which is wrong: a "client wall" must only ever show real,
// cleared client marks.
//
// React surfaces that already load the public wall feed (`useClientWallPool`,
// the module library, the import review) prime this cache, and every builder
// reads from it. When the cache is empty the builders fall back to
// name-only client placeholders (a wordmark plate), never a division mark.

import type { LogoFiller } from "@/lib/logohub-fillers";

let POOL: LogoFiller[] = [];

/** Called by React surfaces once the public wall feed resolves. */
export function primeClientWallPool(pool: LogoFiller[] | undefined | null): void {
  if (!pool || pool.length === 0) return;
  const seen = new Set<string>();
  const out: LogoFiller[] = [];
  for (const l of pool) {
    const key = l.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key || seen.has(key)) continue;
    if (!l.logoUrl && !l.logoUrlDark) continue;
    seen.add(key);
    out.push({
      name: l.name,
      logoUrl: l.logoUrl || l.logoUrlDark,
      logoUrlDark: l.logoUrlDark || l.logoUrl,
    });
  }
  POOL = out;
}

export function clientWallPoolSize(): number {
  return POOL.length;
}

/**
 * `count` real client marks, deterministic for a given seed so A/B toggles and
 * re-renders never reshuffle a wall. Returns `[]` when nothing is primed.
 */
export function getClientWallItems(
  count: number,
  seed = "wall",
): Array<{ name: string; logoUrl: string; logoUrlDark: string }> {
  if (POOL.length === 0 || count <= 0) return [];
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const start = h % POOL.length;
  const out: Array<{ name: string; logoUrl: string; logoUrlDark: string }> = [];
  for (let i = 0; i < count; i++) out.push({ ...POOL[(start + i) % POOL.length] });
  return out;
}

/** Best-effort lookup of a real client mark by name (case/punctuation loose). */
export function findClientWallLogo(name: string): LogoFiller | undefined {
  const key = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!key) return undefined;
  return POOL.find((l) => {
    const k = l.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return k === key || k.includes(key) || key.includes(k);
  });
}
