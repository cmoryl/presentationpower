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

import {
  NEXT_LOGO_COLOURWAY_LABELS,
  pickNextLogo,
  type NextLogoArt,
  type NextLogoColourway,
} from "@/lib/next-logo-vectors";
import { londonVenueItemMeta, type LondonPanel } from "@/lib/next-london-signage";
import {
  londonLogoPlacement,
  type LondonLogoPlacement,
} from "@/lib/next-london-logo-placement";

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
  const haystack = brandingHaystack(panel);
  for (const [re, id] of FAMILY_KEYWORDS) if (re.test(haystack)) return id;
  return "transperfect";
}

/** Headline copy the note calls out, normalised to the signage set. */
/** Everything that can carry a branding instruction for an item. */
function brandingHaystack(panel: LondonPanel): string {
  const note = londonVenueItemMeta(panel)?.note ?? "";
  return `${panel.room} ${panel.name} ${panel.ground} ${note}`;
}

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
  /** The colourway actually placed (falls back to white when unavailable). */
  colourway: NextLogoColourway;
  art: NextLogoArt;
  /** Logo box, in mm, in the panel's bleed coordinate space. */
  logo: { x: number; y: number; w: number; h: number };
  /** Optional headline, set in Geist Bold. */
  copy: string | null;
  /** Cap height of the headline, in mm. */
  copySizeMm: number;
  /** Headline baseline, in mm from the top of the bleed box. */
  copyBaselineMm: number;
  /** Headline centre, in mm from the left of the bleed box. */
  copyCentreMm: number;
  /** Text anchor for the headline. */
  copyAlign: "middle" | "start";
  /** Clear space held around the lockup, in mm (1.5× the mark height rule). */
  clearMm: number;
  /** The nudge/scale override applied to the planned lockup box. */
  placement: LondonLogoPlacement;
};


/**
 * Deterministic branding placement for a panel. The lockup is sized against the
 * TRIM box (never the bleed) and kept inside the venue safe area, so nothing
 * lands in a cut or a wrap.
 */
export function londonBrandingPlan(
  panel: LondonPanel,
  placement?: LondonLogoPlacement,
): LondonBrandingPlan {
  const familyId = londonPanelFamily(panel);
  const aspect = panel.trimW / Math.max(1, panel.trimH);
  const nudgeEarly = placement ?? londonLogoPlacement(panel.id);
  const { art, orientation, colourway } = pickNextLogo(familyId, aspect, nudgeEarly.colourway);

  const marginX = (panel.bleedW - panel.trimW) / 2;
  const marginY = (panel.bleedH - panel.trimH) / 2;
  // Safe area: bleed plus 4% of the short trim edge, floored at 20 mm.
  const safe = Math.max(20, Math.min(panel.trimW, panel.trimH) * 0.04);

  const liveW = panel.trimW - safe * 2;
  const liveH = panel.trimH - safe * 2;

  // Lockup width target: the mark is the hero on scenic panels, so it fills
  // most of the live area — horizontal lockups run widest, stacked marks stay
  // a little tighter on very wide trims.
  const widthShare = orientation === "side" ? (aspect >= 4 ? 0.62 : 0.78) : aspect >= 1.6 ? 0.48 : 0.72;
  const nudge = nudgeEarly;
  let logoW = liveW * widthShare * nudge.scale;
  let logoH = (art.h / art.w) * logoW;
  const maxH = liveH * (orientation === "side" ? 0.44 : 0.58) * nudge.scale;
  if (logoH > maxH) {
    logoH = maxH;
    logoW = (art.w / art.h) * logoH;
  }


  // Copy: the note-derived headline unless the location team typed their own.
  // An empty string is a deliberate "no headline on this panel".
  const authored = nudge.text === null ? pickCopy(panel) : nudge.text.trim() || null;
  const copy = authored;
  const centreX = marginX + panel.trimW / 2 - logoW / 2;

  // Stacked lockups sit on the upper third; horizontal lockups ride the lower
  // band so the middle of a wide panel stays open for copy.
  const baseY =
    orientation === "side"
      ? marginY + panel.trimH - safe - logoH
      : marginY + safe + liveH * (copy ? 0.06 : 0.28);

  // Designer nudge, in trim fractions, clamped so the lockup stays on the sheet.
  const logoX = clamp(centreX + nudge.dx * panel.trimW, 0, panel.bleedW - logoW);
  const logoY = clamp(baseY + nudge.dy * panel.trimH, 0, panel.bleedH - logoH);

  const copySizeMm = Math.min(liveH * 0.16, Math.max(24, liveW * 0.052)) * nudge.textScale;
  const baseBaseline =
    orientation === "side"
      ? marginY + safe + copySizeMm
      : logoY + logoH + Math.max(logoH * 0.5, copySizeMm * 1.2);
  // Headline nudge, clamped so the cap band stays inside the sheet.
  const copyBaselineMm = clamp(
    baseBaseline + nudge.textDy * panel.trimH,
    copySizeMm,
    panel.bleedH - copySizeMm * 0.3,
  );
  const copyCentreMm = clamp(
    marginX + panel.trimW / 2 + nudge.textDx * panel.trimW,
    0,
    panel.bleedW,
  );

  return {
    familyId,
    orientation,
    colourway,
    art,
    logo: { x: logoX, y: logoY, w: logoW, h: logoH },
    copy,
    copySizeMm,
    copyBaselineMm,
    copyCentreMm,
    copyAlign: "middle",
    clearMm: logoH * 0.25,
    placement: nudge,
  };
}


function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(Math.max(lo, hi), value));
}

function pickCopy(panel: LondonPanel): string | null {
  const haystack = brandingHaystack(panel);
  for (const [re, copy] of COPY_KEYWORDS) if (re.test(haystack)) return copy;
  return null;
}

/** Short human line for the UI: which lockup and copy a panel carries. */
export function brandingSummary(plan: LondonBrandingPlan, familyLabel: string): string {
  const colour = NEXT_LOGO_COLOURWAY_LABELS[plan.colourway].toLowerCase();
  const lockup = `${plan.orientation === "side" ? "side-by-side" : "stacked"} ${colour}`;
  return plan.copy
    ? `${familyLabel} · ${lockup} · “${plan.copy}” in Geist Bold`
    : `${familyLabel} · ${lockup}`;
}
