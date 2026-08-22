/**
 * Division branding for solution proposals.
 *
 * The multi-page proposal was ported from a TransPerfect master deck, so its
 * lockups and accent colour were baked in. Every proposal in the library is a
 * *division* master (Legal, Life Sciences, Media, Gaming, GlobalLink, Digital,
 * Trial Interactive, Enterprise, Element…), so the printed pages must carry
 * that division's lockup and accent instead of the master's.
 *
 * `resolveProposalBrand()` maps a BrandMode to the artwork + colours the pages
 * need; `ProposalBrandProvider` publishes it so deep page components read the
 * right values without threading props through 15 page renderers.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { BrandMode } from "@/lib/taxonomy";
import { getDivisionLogos } from "@/lib/division-logos";
import { ELEMENT_LOCKUP_URLS } from "@/components/brand/ElementLogo";
import { PROPOSAL_ART } from "@/lib/print-library/proposal-art";

/** TransPerfect master defaults — also the fallback for unmapped brands. */
const TP_NAVY = "#03002C";
const TP_BLUE = "#003FC7";
const TP_LAV = "#A9A3FD";
const TP_AQUA = "#A1F8F9";

export type ProposalBrand = {
  /** Division display name, e.g. "TransPerfect Legal". */
  name: string;
  /** Accent used for rules, numerals, dot fields and highlight words. */
  accent: string;
  /** Deep ink field colour for dark pages. */
  deep: string;
  /** Full-colour lockup for light pages. */
  logoDark: string;
  /** Reversed lockup for dark / photographic pages. */
  logoWhite: string;
  /** Gradient field for bright pages. */
  brightField: string;
  /** Gradient field for deep pages. */
  deepField: string;
};

export function resolveProposalBrand(
  brand?: BrandMode | null,
  /** Admin-authored override from the `division_seeds` table (sparse). */
  seed?: DivisionSeed | null,
): ProposalBrand {
  const accent = seed?.accent || brand?.tokens?.accent || brand?.tokens?.primary || TP_BLUE;
  const deep = seed?.deep || brand?.tokens?.primary || TP_NAVY;
  const isElement = brand?.id === "bm-element";
  const logos = brand?.id ? getDivisionLogos(brand.id) : undefined;

  const logoDark =
    seed?.logoDark ||
    (isElement ? ELEMENT_LOCKUP_URLS.color : (logos?.color ?? PROPOSAL_ART.lockupDark));
  const logoWhite =
    seed?.logoWhite ||
    (isElement
      ? ELEMENT_LOCKUP_URLS.reversed
      : (logos?.white ?? logos?.color ?? PROPOSAL_ART.logoWhite));

  return {
    name: seed?.displayName || brand?.name || "TransPerfect",
    accent,
    deep,
    logoDark,
    logoWhite,
    brightField:
      seed?.brightField ||
      `linear-gradient(101deg, ${accent} 0%, ${accent}CC 26%, ${TP_LAV} 58%, #BFE6FA 82%, ${TP_AQUA} 100%)`,
    deepField:
      seed?.deepField ||
      `linear-gradient(72deg, ${deep} 0%, ${deep}E6 22%, ${accent} 52%, #7FA6F5 74%, ${TP_LAV} 100%)`,
  };
}

const FALLBACK = resolveProposalBrand(null);

const ProposalBrandContext = createContext<ProposalBrand>(FALLBACK);

export function ProposalBrandProvider({
  brand,
  children,
}: {
  brand?: BrandMode | null;
  children: ReactNode;
}) {
  // Admin overrides win over the code-authored division defaults.
  const seed = useDivisionSeed(brand?.id);
  const value = useMemo(() => resolveProposalBrand(brand, seed), [brand, seed]);
  return <ProposalBrandContext.Provider value={value}>{children}</ProposalBrandContext.Provider>;
}

export function useProposalBrand(): ProposalBrand {
  return useContext(ProposalBrandContext);
}
