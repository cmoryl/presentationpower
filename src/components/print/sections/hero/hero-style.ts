// SHARED HERO / MASTHEAD STYLE CONTRACT
// ---------------------------------------------------------------------------
// One source of truth for the authorable masthead rule and title-block
// typography. Both the modular hero section variants (HeroVariants.tsx) and the
// legacy full-page openers (CaseStudy / Spotlight / EBrochure / AdaptorBrief)
// resolve their rule + type spec through these helpers, so the inspector's
// masthead controls behave identically on every opener in the system.

import type { PrintHeroRule, PrintHeroTitleType } from "@/lib/print-assets.types";
import { cq } from "../shared";

/** Anything carrying the hero style contract: a modular hero section, or a
 *  legacy page content object exposing `heroRule` / `heroTitleType`. */
export type HeroStyleSource = {
  rule?: PrintHeroRule;
  titleType?: PrintHeroTitleType;
};

export const heroStyleOf = (src: {
  heroRule?: PrintHeroRule;
  heroTitleType?: PrintHeroTitleType;
}): HeroStyleSource => ({ rule: src.heroRule, titleType: src.heroTitleType });

/** Top masthead rule. `def` is the variant's own default thickness in px. */
export function heroRuleTop(s: HeroStyleSource, accent: string, def: number) {
  const w = s.rule?.weight ?? def;
  const color = s.rule?.color ?? accent;
  return w <= 0 ? { borderTop: "none" as const } : { borderTop: `${cq(w)} solid ${color}` };
}

/** Air under the rule before the title block. */
export function heroRuleGap(s: HeroStyleSource, def: number): string {
  return cq(s.rule?.gap ?? def);
}

/** Closing hairline under the title block. */
export function heroHairline(
  s: HeroStyleSource,
  ink: { hairline: string },
  shownByDefault = true,
) {
  const shown = s.rule?.hairline ?? shownByDefault;
  if (!shown) return { borderBottom: "none" as const };
  return { borderBottom: `1px solid ${s.rule?.hairlineColor ?? ink.hairline}` };
}

export const emTrack = (thousandths: number) => `${(thousandths / 1000).toFixed(3)}em`;

export function heroTitleStyle(s: HeroStyleSource) {
  const t = s.titleType;
  if (!t) return {};
  return {
    ...(t.titleWeight ? { fontWeight: t.titleWeight } : null),
    ...(t.titleTracking !== undefined ? { letterSpacing: emTrack(t.titleTracking) } : null),
    ...(t.titleLeading ? { lineHeight: t.titleLeading / 100 } : null),
    ...(t.titleCase === "upper" ? { textTransform: "uppercase" as const } : null),
  };
}

/** Authored size for the title block, honouring the inspector override. */
export function heroTitleFontPx(s: HeroStyleSource, def: number): number {
  return s.titleType?.titlePx ?? def;
}

/** Authored size for the summary, honouring the inspector override. */
export function heroSummaryFontPx(s: HeroStyleSource, def: number): number {
  return s.titleType?.summaryPx ?? def;
}

export function heroSummaryStyle(s: HeroStyleSource) {
  const t = s.titleType;
  if (!t) return {};
  return {
    ...(t.summaryLeading ? { lineHeight: t.summaryLeading / 100 } : null),
  };
}

export function heroEyebrowStyle(s: HeroStyleSource) {
  const t = s.titleType;
  if (!t) return {};
  return {
    ...(t.eyebrowPx ? { fontSize: cq(t.eyebrowPx) } : null),
    ...(t.eyebrowTracking !== undefined ? { letterSpacing: emTrack(t.eyebrowTracking) } : null),
  };
}
