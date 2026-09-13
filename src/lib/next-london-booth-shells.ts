// TransPerfect NEXT 2026 — TRADE BOOTH SHELLS (the two supplied blanks).
//
// The London stand build ships two front-wall shells, both trimming at
// 1830 × 2440 mm with 100 mm bleed per edge (artboard 5754.33 × 7483.46 pt):
//
//   • Trade Booth A — carries a wall-mounted SCREEN. The supplied file marks the
//     screen aperture as a magenta keep-clear rectangle, centred on the trim,
//     1422.5 × 797.3 mm (16:9), starting 404.5 mm below the trim top. Nothing
//     that has to be read may sit inside it: the monitor covers it.
//   • Trade Booth B — the same wall with NO screen, so the whole face is live.
//
// Every partner booth is built on one of these two shells, which is why the
// keep-clear zone is data here rather than a per-booth guess: the branding
// planner reads it to keep the lockup above the screen and the copy below it,
// and re-issuing a booth at another stand size scales the aperture with the
// trim (the screen is specified as a fraction of trim, not in absolute mm).
//
// This module holds data and pure geometry only, and imports nothing from the
// signage graph, so the signage builder can consult it while building panels.

import shellAAi from "@/assets/london-booths/tradebooth-a-shell.ai?url";
import shellAProof from "@/assets/london-booths/tradebooth-a-shell.jpg";
import shellARender from "@/assets/london-booths/renders/tradebooth-a-render.jpg";
import shellBAi from "@/assets/london-booths/tradebooth-b-shell.ai?url";
import shellBProof from "@/assets/london-booths/tradebooth-b-shell.jpg";
import shellBRender from "@/assets/london-booths/renders/tradebooth-b-render.jpg";

export type LondonBoothShellId = "tradebooth-a" | "tradebooth-b";

/** A rectangle on the wall, in mm from the TRIM origin (top-left of trim). */
export type BoothRectMm = { x: number; y: number; w: number; h: number };

export type LondonBoothShell = {
  id: LondonBoothShellId;
  label: string;
  /** Supplied Illustrator blank. */
  sourceFile: string;
  /** CDN copy of the blank shell — the starting master for a new booth. */
  aiUrl: string;
  /** Rasterised proof of the blank artboard. */
  previewUrl: string;
  trimW: number;
  trimH: number;
  bleedMm: number;
  /** True when the shell has a wall-mounted screen. */
  hasScreen: boolean;
  /**
   * Screen aperture as fractions of the trim box, so the keep-clear zone
   * survives a re-issue at another stand size. Null on the screenless shell.
   */
  screen: { x: number; y: number; w: number; h: number } | null;
  /**
   * Photoreal in-situ visualisation of the blank shell standing in a room of
   * this type. A visualisation only — never a survey photograph, and never a
   * dimensional reference.
   */
  renderUrl: string;
  /**
   * Where the wall face sits inside that render, as fractions of the image, so
   * a booth's own artwork can be laid onto the visualisation.
   */
  renderFace: { x: number; y: number; w: number; h: number };
  note: string;
};

/** Trim size and bleed shared by both supplied shells. */
export const LONDON_BOOTH_SHELL_TRIM = { w: 1830, h: 2440, bleedMm: 100 } as const;

/**
 * Fit the exact 1830 × 2440 trim ratio inside a measured wall opening.
 * The render plates are landscape images, so percentages alone do not preserve
 * the physical wall ratio unless the image dimensions are included here.
 */
function trimFaceOnRender(
  render: { w: number; h: number },
  opening: { centerX: number; top: number; bottom: number },
): LondonBoothShell["renderFace"] {
  const heightPx = opening.bottom - opening.top;
  const widthPx = heightPx * (LONDON_BOOTH_SHELL_TRIM.w / LONDON_BOOTH_SHELL_TRIM.h);
  return {
    x: (opening.centerX - widthPx / 2) / render.w,
    y: opening.top / render.h,
    w: widthPx / render.w,
    h: heightPx / render.h,
  };
}

// Measured off the supplied Trade Booth A artboard: the magenta aperture runs
// x 303.76 → 1726.24 mm and y 504.50 → 1301.83 mm on the 2030 × 2640 mm bleed
// page, i.e. 203.76 / 404.50 mm inside the trim, 1422.48 × 797.33 mm.
const SCREEN_MM: BoothRectMm = { x: 203.76, y: 404.5, w: 1422.48, h: 797.33 };

export const LONDON_BOOTH_SHELLS: LondonBoothShell[] = [
  {
    id: "tradebooth-a",
    label: "Trade Booth A — screen wall",
    sourceFile: "TradeBoothA_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: shellAAi,
    previewUrl: shellAProof,
    trimW: LONDON_BOOTH_SHELL_TRIM.w,
    trimH: LONDON_BOOTH_SHELL_TRIM.h,
    bleedMm: LONDON_BOOTH_SHELL_TRIM.bleedMm,
    hasScreen: true,
    screen: {
      x: SCREEN_MM.x / LONDON_BOOTH_SHELL_TRIM.w,
      y: SCREEN_MM.y / LONDON_BOOTH_SHELL_TRIM.h,
      w: SCREEN_MM.w / LONDON_BOOTH_SHELL_TRIM.w,
      h: SCREEN_MM.h / LONDON_BOOTH_SHELL_TRIM.h,
    },
    renderUrl: shellARender,
    // The photographed opening is centred at x=779 and runs y=68 → 965.
    // Fit the supplied 1830:2440 trim inside it rather than stretching artwork
    // to the wider decorative frame. The TV remains centred on the true trim.
    renderFace: trimFaceOnRender({ w: 1536, h: 1024 }, { centerX: 779, top: 68, bottom: 965 }),
    note:
      "Screen wall: a 1422 × 797 mm 16:9 monitor aperture sits centred, 405 mm below the trim top. " +
      "Keep logos and copy out of it — the lockup rides above the screen, copy below it.",
  },
  {
    id: "tradebooth-b",
    label: "Trade Booth B — full graphic wall",
    sourceFile: "TradeBoothB_Front_1830x2440mm_Plus100mmBleed.ai",
    aiUrl: shellBAi,
    previewUrl: shellBProof,
    trimW: LONDON_BOOTH_SHELL_TRIM.w,
    trimH: LONDON_BOOTH_SHELL_TRIM.h,
    bleedMm: LONDON_BOOTH_SHELL_TRIM.bleedMm,
    hasScreen: false,
    screen: null,
    renderUrl: shellBRender,
    // Apply the same physical trim fit to the screenless wall. Its measured
    // opening is centred at x=767.6 and runs y=70 → 941 on the render plate.
    renderFace: trimFaceOnRender({ w: 1536, h: 1024 }, { centerX: 767.6, top: 70, bottom: 941 }),
    note: "No screen: the whole 1830 × 2440 mm face is live artwork.",
  },
];

export const DEFAULT_BOOTH_SHELL_ID: LondonBoothShellId = "tradebooth-a";

/**
 * Which shell each partner booth is built on. Booth slugs ending `-tradebooth-b`
 * are the screenless wall; everything else is the screen wall, which is what the
 * London team ordered for the rest of the stands.
 */
export function boothShellIdForSlug(slug: string | null | undefined): LondonBoothShellId {
  if (!slug) return DEFAULT_BOOTH_SHELL_ID;
  return /tradebooth-b$/i.test(slug) ? "tradebooth-b" : DEFAULT_BOOTH_SHELL_ID;
}

export function boothShell(id: string | null | undefined): LondonBoothShell {
  return (
    LONDON_BOOTH_SHELLS.find((shell) => shell.id === id) ??
    LONDON_BOOTH_SHELLS.find((shell) => shell.id === DEFAULT_BOOTH_SHELL_ID)!
  );
}

export function boothShellForSlug(slug: string | null | undefined): LondonBoothShell {
  return boothShell(boothShellIdForSlug(slug));
}

/**
 * The screen keep-clear zone in mm, resolved against a real trim size so a
 * re-issued booth keeps a proportional aperture. Null on a screenless shell.
 */
export function boothScreenRectMm(
  shell: LondonBoothShell,
  trim: { trimW: number; trimH: number } = { trimW: shell.trimW, trimH: shell.trimH },
): BoothRectMm | null {
  if (!shell.screen) return null;
  return {
    x: shell.screen.x * trim.trimW,
    y: shell.screen.y * trim.trimH,
    w: shell.screen.w * trim.trimW,
    h: shell.screen.h * trim.trimH,
  };
}

/** Diagonal of the screen aperture in inches — what monitor the shell expects. */
export function boothScreenDiagonalIn(shell: LondonBoothShell): number | null {
  const rect = boothScreenRectMm(shell);
  if (!rect) return null;
  return Math.round((Math.hypot(rect.w, rect.h) / 25.4) * 10) / 10;
}
