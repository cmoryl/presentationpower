// TransPerfect NEXT 2026 — London signage BRANDING LAYER.
//
// Every generated panel now carries the official NEXT 2026 lockup and its
// headline copy, not just a gradient ground:
//
//   • Lockup — the white EPS-derived outlines from `next-logo-vectors.ts`.
//     Stacked white is the default; a panel whose live area is clearly
//     horizontal gets the side-by-side white lockup instead.
//   • Copy — set in Geist Bold, the NEXT 2026 signage face, as live text in
//     both the .svg and the .ai so the venue can retype it.
//
// Family and copy are read from the item's own branding note, so the artwork
// follows what the London location team asked for on each item.

import { pickNextLogo, type NextLogoArt } from "@/lib/next-logo-vectors";
import type { LondonPanel } from "@/lib/next-london-signage";

/** The signage face for NEXT 2026. Bold only — no other weight is approved. */
export const LONDON_SIGNAGE_FONT = {
  family: "Geist",
  /** PDF/Illustrator base font name for the .ai text objects. */
  pdfBaseFont: "Geist-Bold",
  cssStack: "Geist, 'Geist Variable', 'Helvetica Neue', Arial, sans-serif",
  weight: 700,
  /** Signage tracking, in em — tight, per the brand type rules. */
  tracking: -0.02,
} as const;

const FAMILY_KEYWORDS: [RegExp, string][] = [
  [/globallink/i, "globallink"],
  [/dataforce/i, "dataforce"],
  [/life\s*sci/i, "lifesci"],
  [/legal/i, "legal"],
  [/\bmedia\b/i, "media"],
  [/\bgames?\b/i, "games"],
  [/finance|financial/i, "finance"],
  [/\bdigital\b/i, "digital"],
  [/\blearn(ing)?\b/i, "learn"],
  [/experience/i, "experience"],
  [/city series/i, "cityseries"],
];

/** Which lockup family an item belongs to, from its note/room/name. */
export function londonPanelFamily(panel: LondonPanel): string {
  const haystack = `${panel.room} ${panel.name} ${panel.ground}`;
  for (const [re, id] of FAMILY_KEYWORDS) if (re.test(haystack)) return id;
  return "transperfect";
}

/** Headline copy the note calls out, normalised to the signage set. */
const COPY_KEYWORDS: [RegExp, string][] = [
  [/beyond intelligence/i, "BEYOND INTELLIGENCE"],
  [/welcome/i, "WELCOME"],
  [/registration|check[- ]?in/i, "REGISTRATION"],
  [/cloakroom/i, "CLOAKROOM"],
  [/nextbrew/i, "NEXTBREW"],
  [/merch/i, "MERCH MART"],
  [/lunch|catering|coffee/i, "REFUEL"],
];

export type LondonBrandingPlan = {
  familyId: string;
  orientation: "stacked" | "side";
  art: NextLogoArt;
  /** Logo box, in mm, in the panel's bleed coordinate space. */
  logo: { x: number; y: number; w: number; h: number };
  /** Optional headline, set in Geist Bold. */
  copy: string | null;
  /** Cap height of the headline, in mm. */
  copySizeMm: number;
  /** Headline baseline, in mm from the top of the bleed box. */
  copyBaselineMm: number;
  /** Text anchor for the headline. */
  copyAlign: "middle" | "start";
  /** Clear space held around the lockup, in mm (1.5× the mark height rule). */
  clearMm: number;
};

/**
 * Deterministic branding placement for a panel. The lockup is sized against the
 * TRIM box (never the bleed) and kept inside the venue safe area, so nothing
 * lands in a cut or a wrap.
 */
export function londonBrandingPlan(panel: LondonPanel): LondonBrandingPlan {
  const familyId = londonPanelFamily(panel);
  const aspect = panel.trimW / Math.max(1, panel.trimH);
  const { art, orientation } = pickNextLogo(familyId, aspect);

  const marginX = (panel.bleedW - panel.trimW) / 2;
  const marginY = (panel.bleedH - panel.trimH) / 2;
  // Safe area: bleed plus 4% of the short trim edge, floored at 20 mm.
  const safe = Math.max(20, Math.min(panel.trimW, panel.trimH) * 0.04);

  const liveW = panel.trimW - safe * 2;
  const liveH = panel.trimH - safe * 2;

  // Lockup width target: horizontal lockups run wider, stacked marks stay
  // compact so tall panels do not turn into a wall of logo.
  const widthShare = orientation === "side" ? (aspect >= 4 ? 0.34 : 0.46) : aspect >= 1.6 ? 0.24 : 0.4;
  let logoW = liveW * widthShare;
  let logoH = (art.h / art.w) * logoW;
  const maxH = liveH * (orientation === "side" ? 0.24 : 0.34);
  if (logoH > maxH) {
    logoH = maxH;
    logoW = (art.w / art.h) * logoH;
  }

  const copy = pickCopy(panel);
  const centreX = marginX + panel.trimW / 2 - logoW / 2;

  // Stacked lockups sit on the upper third; horizontal lockups ride the lower
  // band so the middle of a wide panel stays open for copy.
  const logoY =
    orientation === "side"
      ? marginY + panel.trimH - safe - logoH
      : marginY + safe + liveH * (copy ? 0.06 : 0.28);

  const copySizeMm = Math.min(liveH * 0.16, Math.max(24, liveW * 0.052));
  const copyBaselineMm =
    orientation === "side"
      ? marginY + safe + copySizeMm
      : logoY + logoH + Math.max(logoH * 0.5, copySizeMm * 1.2);

  return {
    familyId,
    orientation,
    art,
    logo: { x: centreX, y: logoY, w: logoW, h: logoH },
    copy,
    copySizeMm,
    copyBaselineMm,
    copyAlign: "middle",
    clearMm: logoH * 0.25,
  };
}

function pickCopy(panel: LondonPanel): string | null {
  const haystack = `${panel.room} ${panel.name} ${panel.ground}`;
  for (const [re, copy] of COPY_KEYWORDS) if (re.test(haystack)) return copy;
  return null;
}

/** Short human line for the UI: which lockup and copy a panel carries. */
export function brandingSummary(plan: LondonBrandingPlan, familyLabel: string): string {
  const lockup = plan.orientation === "side" ? "side-by-side white" : "stacked white";
  return plan.copy
    ? `${familyLabel} · ${lockup} · “${plan.copy}” in Geist Bold`
    : `${familyLabel} · ${lockup}`;
}
