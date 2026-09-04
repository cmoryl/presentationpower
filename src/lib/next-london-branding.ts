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
import {
  isBoothPanel,
  londonBoothArtworkUrl,
  londonVenueItemMeta,
  type LondonPanel,
} from "@/lib/next-london-signage";
import { londonSafeMm } from "@/lib/next-london-print-geometry";
import { buildPillarQr } from "@/lib/pillar-qr";
import { PILLAR_CAPTION_FONTS } from "@/lib/next-pillar-masters";
import {
  isLondonDoorItem,
  londonDivisionColourway,
  londonDoorColourway,
  londonDoorDivision,
} from "@/lib/next-london-division";

import { londonLogoPlacement, type LondonLogoPlacement } from "@/lib/next-london-logo-placement";

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

// The venue notes write divisions as one word ("MediaNEXT", "GamesNEXT"), so
// each keyword also accepts the NEXT suffix — otherwise a word-boundary match
// silently fell through to the master brand and the board lost its accent.
const FAMILY_KEYWORDS: [RegExp, string][] = [
  [/globallink/i, "globallink"],
  [/dataforce/i, "dataforce"],
  [/life\s*sci/i, "lifesci"],
  [/legal/i, "legal"],
  [/\bmedia(next)?\b/i, "media"],
  [/\bgames?(next)?\b/i, "games"],
  [/finance|financial/i, "finance"],
  [/\bdigital(next)?\b/i, "digital"],
  [/\blearn(ing|next)?\b/i, "learn"],
  [/experience/i, "experience"],
  [/city series/i, "cityseries"],
];

/**
 * Run length of a single line of signage copy, in mm. Geist Bold caps average
 * ~0.62 em of advance, and each glyph also carries the tracking, so opening the
 * tracking widens the measured box the editor and print preview draw.
 */
export function londonCopyRunMm(text: string, sizeMm: number, trackingEm: number): number {
  return Math.max(0, text.length * sizeMm * (0.62 + trackingEm));
}

/** Which lockup family an item belongs to, from its note/room/name. */
export function londonPanelFamily(panel: LondonPanel): string {
  const haystack = brandingHaystack(panel);
  for (const [re, id] of FAMILY_KEYWORDS) if (re.test(haystack)) return id;
  // Door branding always belongs to a room, and every room belongs to a
  // division: fall back to the door register so entrance leaves and lounge
  // doors carry an accent rather than the neutral master ramp.
  if (isLondonDoorItem(panel.room, panel.name)) {
    const door = londonDoorDivision(panel.room);
    if (door) return door;
  }
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
  [/main stage|directional/i, "MAIN STAGE"],
  [/help desk/i, "HELP DESK"],
  [/step\s*&?\s*repeat|photo wall/i, "TRANSPERFECT NEXT"],
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
  /**
   * Headline tracking, in em: the brand's tight signage tracking plus whatever
   * extra spacing the location designer dialled in for this board.
   */
  copyTrackingEm: number;
  /** Headline run length, in mm, at the current cap height and tracking. */
  copyRunMm: number;
  /** Headline baseline, in mm from the top of the bleed box. */
  copyBaselineMm: number;
  /** Headline centre, in mm from the left of the bleed box. */
  copyCentreMm: number;
  /** Text anchor for the headline. */
  copyAlign: "middle" | "start";
  /** True when the headline runs DOWN the panel (pillars and tall fascias). */
  copyVertical: boolean;
  /** Clear space held around the lockup, in mm (1.5× the mark height rule). */
  clearMm: number;
  /** Scannable QR block, in mm, when the panel carries a code. */
  qr: {
    data: string;
    x: number;
    y: number;
    size: number;
    /** Module count per side, including the quiet zone. */
    modules: number;
    /** Module geometry, in module units. */
    path: string;
    caption: string | null;
    captionSizeMm: number;
    /** Gap between the plate and the caption baseline block, in mm. */
    captionPadMm: number;
    /** Caption anchor, resolved from the designer's alignment choice. */
    captionAnchor: "start" | "middle" | "end";
    /** Caption x in mm, already resolved for the anchor. */
    captionX: number;
    /** Caption weight/tracking treatment. */
    captionWeight: number;
    captionTracking: number;
    /** Quiet-zone plate padding, in mm. `plate: false` prints code only. */
    padMm: number;
    plate: boolean;
    /** Plate corner radius, in mm. */
    radiusMm: number;
    /** Plate and module inks, so a code can knock out of a dark plate. */
    plateInk: string;
    moduleInk: string;
  } | null;
  /** The nudge/scale override applied to the planned lockup box. */
  placement: LondonLogoPlacement;
  /**
   * Whether the generated NEXT lockup prints on this panel. Vendor booths with
   * supplied artwork default to OFF (their file is already branded); the
   * location designer can switch it on per booth.
   */
  lockupOn: boolean;
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
  // Division items print the white lockup: full-colour and dark-blue marks are
  // not approved on division signage, so a stored override is clamped here.
  const wantedColourway = isLondonDoorItem(panel.room, panel.name)
    ? londonDoorColourway(familyId, nudgeEarly.colourway)
    : londonDivisionColourway(familyId, nudgeEarly.colourway);

  const { art, orientation, colourway } = pickNextLogo(familyId, aspect, wantedColourway);

  const marginX = (panel.bleedW - panel.trimW) / 2;
  const marginY = (panel.bleedH - panel.trimH) / 2;
  // Safe area: bleed plus 4% of the short trim edge, floored at 20 mm. Shared
  // with the print preview so the on-screen guides are the real geometry.
  const safe = londonSafeMm(panel);

  const liveW = panel.trimW - safe * 2;
  const liveH = panel.trimH - safe * 2;

  // Lockup width target: the mark is the hero on scenic panels, so it fills
  // most of the live area — horizontal lockups run widest, stacked marks stay
  // a little tighter on very wide trims.
  const widthShare =
    orientation === "side" ? (aspect >= 4 ? 0.62 : 0.78) : aspect >= 1.6 ? 0.48 : 0.72;
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

  // Pillars and other tall, narrow sheets set their copy running DOWN the
  // panel by default — the same treatment as the master NEXT pillar set. The
  // location designer can force either direction per panel.
  const vertical = nudge.textVertical ?? aspect <= 0.5;

  const copySizeMm = vertical
    ? Math.min(liveW * 0.42, Math.max(24, liveH * 0.036)) * nudge.textScale
    : Math.min(liveH * 0.16, Math.max(24, liveW * 0.052)) * nudge.textScale;

  let copyBaselineMm: number;
  let copyCentreMm: number;
  if (vertical) {
    // Rotated 90°: the anchor x carries the baseline, cap heights run to its
    // right, so the band is centred by pulling the baseline back a third of a
    // cap height. The anchor y is the middle of the vertical run.
    const baseX = marginX + panel.trimW / 2 - copySizeMm * 0.35;
    copyCentreMm = clamp(baseX + nudge.textDx * panel.trimW, 0, panel.bleedW);
    copyBaselineMm = clamp(
      marginY + safe + liveH * 0.55 + nudge.textDy * panel.trimH,
      0,
      panel.bleedH,
    );
  } else {
    const baseBaseline =
      orientation === "side"
        ? marginY + safe + copySizeMm
        : logoY + logoH + Math.max(logoH * 0.5, copySizeMm * 1.2);
    // Headline nudge, clamped so the cap band stays inside the sheet.
    copyBaselineMm = clamp(
      baseBaseline + nudge.textDy * panel.trimH,
      copySizeMm,
      panel.bleedH - copySizeMm * 0.3,
    );
    copyCentreMm = clamp(marginX + panel.trimW / 2 + nudge.textDx * panel.trimW, 0, panel.bleedW);
  }

  // QR block: a real, scannable code in vector modules. Default placement is
  // the lower band of the live area, centred, with the caption beneath it.
  const code = nudge.qr ? buildPillarQr(nudge.qr) : null;
  const qrSize = Math.min(liveW * 0.55, Math.min(liveW, liveH) * 0.24) * nudge.qrScale;
  // Caption size follows the code unless the designer authored a cap height,
  // matching how the pillar QR editors treat their sub-line.
  const captionSizeMm = nudge.qrCaptionSize > 0 ? nudge.qrCaptionSize : Math.max(6, qrSize * 0.11);
  const captionFont =
    PILLAR_CAPTION_FONTS.find((f) => f.id === nudge.qrCaptionFont) ?? PILLAR_CAPTION_FONTS[0]!;
  const padMm = qrSize * nudge.qrQuiet;
  const captionPadMm = nudge.qrCaptionPad > 0 ? nudge.qrCaptionPad : padMm;
  const qr = code
    ? (() => {
        const x = clamp(
          marginX + panel.trimW / 2 - qrSize / 2 + nudge.qrDx * panel.trimW,
          0,
          panel.bleedW - qrSize,
        );
        const y = clamp(
          marginY + panel.trimH - safe - qrSize - captionSizeMm * 2 + nudge.qrDy * panel.trimH,
          0,
          panel.bleedH - qrSize,
        );
        const rawCaption = nudge.qrCaption.trim();
        const caption = rawCaption
          ? captionFont.uppercase
            ? rawCaption.toUpperCase()
            : rawCaption
          : null;
        const anchor =
          nudge.qrCaptionAlign === "left"
            ? "start"
            : nudge.qrCaptionAlign === "right"
              ? "end"
              : "middle";
        return {
          data: nudge.qr!,
          size: qrSize,
          x,
          y,
          modules: code.size,
          path: code.path,
          caption,
          captionSizeMm,
          captionPadMm,
          captionAnchor: anchor as "start" | "middle" | "end",
          captionX:
            anchor === "start" ? x - padMm : anchor === "end" ? x + qrSize + padMm : x + qrSize / 2,
          captionWeight: captionFont.weight,
          captionTracking: captionFont.tracking,
          padMm,
          plate: !nudge.qrTransparent,
          radiusMm: qrSize * nudge.qrRadius,
          // Inverted codes knock the modules out of a deep-navy plate; scanners
          // read both polarities, and the dark plate sits better on light art.
          plateInk: nudge.qrInvert ? "#03002C" : "#FFFFFF",
          moduleInk: nudge.qrInvert ? "#FFFFFF" : "#03002C",
        };
      })()
    : null;

  const copyTrackingEm = LONDON_SIGNAGE_FONT.tracking + nudge.textTracking;
  const copyRunMm = copy ? londonCopyRunMm(copy, copySizeMm, copyTrackingEm) : 0;

  return {
    familyId,
    orientation,
    colourway,
    art,
    logo: { x: logoX, y: logoY, w: logoW, h: logoH },
    copy,
    copySizeMm,
    copyTrackingEm,
    copyRunMm,
    copyBaselineMm,
    copyCentreMm,
    copyAlign: "middle",
    copyVertical: vertical,
    clearMm: logoH * 0.25,
    qr,
    placement: nudge,
    // Booths that supplied branded artwork start clean; pending booths still get
    // the house lockup on their brand ground.
    lockupOn: nudge.lockup ?? !(isBoothPanel(panel) && !!londonBoothArtworkUrl(panel.id)),
  };
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(Math.max(lo, hi), value));
}

function pickCopy(panel: LondonPanel): string | null {
  // Vendor booth artwork is already typeset by the vendor — no auto headline.
  if (isBoothPanel(panel)) return null;
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
