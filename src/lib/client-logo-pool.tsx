// Global LogoHub filler pool.
//
// Slide/print surfaces that show a CLIENT logo (case studies, logo walls,
// client matrices) must only ever render a real client mark — never a
// TransPerfect brand or division lockup. This provider makes the LogoHub
// roster available anywhere in the tree (decks, present, share, library,
// studios) through one shared cached fetch.
//
// When LogoHub is empty or unavailable, callers get `null` and MUST fall back
// to a neutral text treatment (client name / initials), not a TP mark.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useClientLogos, normalizeClientName } from "@/hooks/use-client-logos";
import { toLogoFillers, type LogoFiller } from "@/lib/logohub-fillers";

const ClientLogoPoolContext = createContext<LogoFiller[]>([]);

export function ClientLogoPoolProvider({ children }: { children: ReactNode }) {
  const { data } = useClientLogos();
  const pool = useMemo(() => toLogoFillers(data, { requireBoth: false }), [data]);
  return <ClientLogoPoolContext.Provider value={pool}>{children}</ClientLogoPoolContext.Provider>;
}

/** Full LogoHub filler pool (empty array when unavailable). */
export function useClientLogoPool(): LogoFiller[] {
  return useContext(ClientLogoPoolContext);
}

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Resolve a single client mark:
 *   1. exact/normalized name match against the LogoHub roster
 *   2. deterministic pick from the roster (stable per seed)
 *   3. null → caller renders a neutral wordmark
 */
export function pickClientLogo(
  pool: LogoFiller[],
  opts: { clientName?: string | null; seed?: string; mode?: "light" | "dark" },
): { name: string; url: string } | null {
  if (!pool.length) return null;
  const mode = opts.mode ?? "light";
  const norm = normalizeClientName(opts.clientName);
  const match = norm ? pool.find((p) => normalizeClientName(p.name) === norm) : undefined;
  const pick = match ?? pool[hashSeed(opts.seed || norm || "client") % pool.length];
  return { name: pick.name, url: mode === "dark" ? pick.logoUrlDark : pick.logoUrl };
}

/** Hook form of {@link pickClientLogo}. */
export function useClientLogoMark(opts: {
  clientName?: string | null;
  seed?: string;
  mode?: "light" | "dark";
}): { name: string; url: string } | null {
  const pool = useClientLogoPool();
  return useMemo(
    () => pickClientLogo(pool, opts),
    [pool, opts.clientName, opts.seed, opts.mode],
  );
}
