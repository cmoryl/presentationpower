// Public client-logo wall pool.
//
// Fetches the read-only wall feed once, then exposes a division-aware pool so
// every logo-wall / proof / matrix module in the library renders with REAL
// approved client marks (never TransPerfect division lockups).

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicWallLogos, type PublicWallLogo } from "@/lib/public-wall.functions";
import { BRAND_PROFILES } from "@/lib/brand-profiles";
import type { LogoFiller } from "@/lib/logohub-fillers";

/** Partner/tech-stack marks are not clients — keep them out of client walls. */
const NON_CLIENT_INDUSTRIES = new Set(["PartnerLink Logos"]);

export function usePublicWallLogos() {
  const fetchLogos = useServerFn(listPublicWallLogos);
  return useQuery({
    queryKey: ["public-wall-logos"],
    queryFn: () => fetchLogos({}) as Promise<PublicWallLogo[]>,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

/**
 * Division-aware client pool: the division's own industries first, then every
 * other real client, so a wall always fills even for narrow divisions.
 */
export function useClientWallPool(brandModeId: string | undefined): LogoFiller[] {
  const { data } = usePublicWallLogos();
  return useMemo(() => {
    const rows = (data ?? []).filter((r) => !NON_CLIENT_INDUSTRIES.has(r.industry ?? ""));
    if (rows.length === 0) return [];
    const wanted = new Set(
      (brandModeId ? (BRAND_PROFILES[brandModeId]?.contentScope?.industries ?? []) : []).map(norm),
    );
    const primary: LogoFiller[] = [];
    const rest: LogoFiller[] = [];
    for (const r of rows) {
      const filler: LogoFiller = {
        name: r.name,
        logoUrl: r.logoUrl,
        logoUrlDark: r.logoUrlDark,
      };
      const ind = norm(r.industry ?? "");
      if (ind && wanted.size > 0 && [...wanted].some((w) => w.includes(ind) || ind.includes(w))) {
        primary.push(filler);
      } else {
        rest.push(filler);
      }
    }
    return [...primary, ...rest];
  }, [data, brandModeId]);
}
