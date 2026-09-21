// Logo placement matrix — clearspace, minimum size, and automatic variant
// selection for every surface that prints or displays a brand lockup.
//
// Pure module: no React, no DOM, no network. The DOM collector lives in
// `brand-health-scan.ts` and the findings join the brand-health pre-flight, so
// slides, social cards and print briefs are all judged by these same rules.
//
// Background policy: this module NEVER produces or substitutes a background.
// It reads the ground a surface already has (approved photography, a solid
// brand token, or a curated image asset) and picks the approved lockup
// treatment for it. No vector background is generated anywhere.

import type { LogoOrientation } from "./logo-placement";

/** The three render surfaces a lockup is placed on. */
export type LogoMedium = "slide" | "social" | "print";

/** How the ground behind the lockup is made. */
export type LogoGroundKind =
  | "solid-token" // a brand token fill
  | "photo" // approved photography
  | "image"; // curated image asset (illustration, plate, texture)

export type LogoGround = {
  kind: LogoGroundKind;
  /** Flat colour of the ground, `#rrggbb`. For photo/image grounds this is the
   *  scrim/mode colour behind the picture, used only to judge light vs dark. */
  hex?: string;
  /** True when the surface records a deepened scrim under the artwork. */
  scrim?: boolean;
};

/** Approved lockup tones. Never a hue shift — only these three treatments. */
export type LogoTone = "color" | "white" | "black";

/** Lockup orientations the matrix will choose between. */
export type MatrixOrientation = Extract<LogoOrientation, "horizontal" | "stacked" | "mark-only">;

/** A measured lockup on a rendered surface, in that surface's own px. */
export type LogoBox = { x: number; y: number; w: number; h: number };

export type LogoPlacementInput = {
  id: string;
  /** Short human label, e.g. `Slide 03 · lockup`. */
  label: string;
  medium: LogoMedium;
  /** The rendered surface size in px (the stage, card or page at 96dpi). */
  surface: { w: number; h: number };
  /** The lockup's own rendered box. */
  box: LogoBox;
  ground: LogoGround;
  orientation: MatrixOrientation;
  tone: LogoTone;
  /** Boxes of anything else painted on the surface (type blocks, media, rules)
   *  used for the clearspace test. */
  neighbours?: Array<LogoBox & { label?: string }>;
};

export type LogoMatrixSeverity = "pass" | "warn" | "fail";

export type LogoMatrixCheck = "logo-clearspace" | "logo-min-size" | "logo-variant";

export type LogoMatrixFinding = {
  id: string;
  check: LogoMatrixCheck;
  severity: Exclude<LogoMatrixSeverity, "pass">;
  label: string;
  detail: string;
  fix?: string;
};

// ---- Clearspace --------------------------------------------------------
// Brand rule: the safe zone around a lockup is 1.5x the height of the T
// symbol. For every shipped lockup the T sets the artwork height, so the
// clear zone is measured off the rendered lockup height.
export const CLEARSPACE_T_MULTIPLE = 1.5;
/** Anything inside this share of the safe zone is a hard fail. */
export const CLEARSPACE_FAIL_SHARE = 0.5;

/** Required clear space around a lockup, in the surface's px. */
export function clearspaceFor(box: LogoBox, orientation: MatrixOrientation): number {
  // Stacked and mark-only lockups are taller than they are wide, so their
  // T height is closer to half the artwork height.
  const tHeight = orientation === "horizontal" ? box.h : box.h * 0.5;
  return tHeight * CLEARSPACE_T_MULTIPLE;
}

/** The safe-zone rectangle around a lockup. */
export function clearspaceRect(box: LogoBox, orientation: MatrixOrientation): LogoBox {
  const c = clearspaceFor(box, orientation);
  return { x: box.x - c, y: box.y - c, w: box.w + c * 2, h: box.h + c * 2 };
}

function overlap(a: LogoBox, b: LogoBox): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** How far into the safe zone a neighbour reaches, 0 (clear) … 1 (touching). */
function intrusionShare(box: LogoBox, orientation: MatrixOrientation, other: LogoBox): number {
  const c = clearspaceFor(box, orientation);
  if (c <= 0) return 0;
  if (!overlap(clearspaceRect(box, orientation), other)) return 0;
  if (overlap(box, other)) return 1;
  // Shortest gap on either axis between the two boxes.
  const gapX = Math.max(box.x - (other.x + other.w), other.x - (box.x + box.w), 0);
  const gapY = Math.max(box.y - (other.y + other.h), other.y - (box.y + box.h), 0);
  const gap = Math.max(gapX, gapY);
  return Math.max(0, Math.min(1, 1 - gap / c));
}

// ---- Minimum size ------------------------------------------------------
// Recorded floors below which the wordmark stops being legible. Screen media
// are px at 96dpi; print is millimetres of the finished trim.
export const LOGO_MIN_WIDTH_PX: Record<LogoMedium, Record<MatrixOrientation, number>> = {
  slide: { horizontal: 150, stacked: 96, "mark-only": 40 },
  social: { horizontal: 120, stacked: 80, "mark-only": 32 },
  // Print boxes are measured at 96dpi CSS px before trim conversion.
  print: { horizontal: 94, stacked: 60, "mark-only": 26 },
};

export const LOGO_MIN_WIDTH_MM: Record<MatrixOrientation, number> = {
  horizontal: 25,
  stacked: 16,
  "mark-only": 7,
};

const MM_PER_IN = 25.4;
const CSS_DPI = 96;

/** Convert a CSS-px width into millimetres of finished print. */
export function pxToMm(px: number): number {
  return (px / CSS_DPI) * MM_PER_IN;
}

// ---- Automatic variant selection ---------------------------------------

export type LogoVariantChoice = {
  orientation: MatrixOrientation;
  tone: LogoTone;
  /** Plain-language reason, shown in the pre-flight drawer. */
  reason: string;
  /** True when the box forced a smaller lockup than the one asked for. */
  downgraded: boolean;
  /** Set when photography needs a scrim for the mark to read. */
  needsScrim: boolean;
};

const RELATIVE_LUMINANCE = (hexValue: string): number => {
  const h = hexValue.replace("#", "");
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const ch = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};

/** True when the ground reads dark, so the reversed (white) mark is correct. */
export function groundIsDark(ground: LogoGround): boolean {
  if (ground.kind !== "solid-token") return !(ground.hex && RELATIVE_LUMINANCE(ground.hex) > 0.6);
  if (!ground.hex || !/^#[0-9a-f]{3,6}$/i.test(ground.hex)) return false;
  return RELATIVE_LUMINANCE(ground.hex) < 0.45;
}

/**
 * Pick the approved lockup for a ground and a box.
 *
 * Tone: photography and dark tokens take the white (reversed) mark; light
 * tokens take the approved single-colour black lockup; curated image plates
 * take white when the plate reads dark, black otherwise. Never a recolour.
 *
 * Orientation: a wide box keeps the horizontal lockup; a squarer or taller box
 * takes the stacked lockup; a box too narrow for the stacked minimum drops to
 * the mark on its own rather than printing an illegible wordmark.
 */
export function selectLogoVariant(input: {
  medium: LogoMedium;
  box: { w: number; h: number };
  ground: LogoGround;
  /** Orientation the surface asked for, when it has a preference. */
  prefer?: MatrixOrientation;
}): LogoVariantChoice {
  const dark = groundIsDark(input.ground);
  const onArtwork = input.ground.kind !== "solid-token";
  const tone: LogoTone = dark || onArtwork ? "white" : "black";
  const mins = LOGO_MIN_WIDTH_PX[input.medium];
  const ratio = input.box.h > 0 ? input.box.w / input.box.h : 0;

  const wanted: MatrixOrientation =
    input.prefer ?? (ratio >= 3 ? "horizontal" : ratio >= 1.1 ? "stacked" : "stacked");

  let orientation = wanted;
  let downgraded = false;
  if (orientation === "horizontal" && input.box.w < mins.horizontal) {
    orientation = "stacked";
    downgraded = true;
  }
  if (orientation === "stacked" && input.box.w < mins.stacked) {
    orientation = "mark-only";
    downgraded = true;
  }

  const groundWord =
    input.ground.kind === "photo"
      ? "photography"
      : input.ground.kind === "image"
        ? "a curated image plate"
        : dark
          ? "a dark brand token"
          : "a light brand token";

  const reason = downgraded
    ? `The box is ${Math.round(input.box.w)}px wide — too narrow for the ${wanted} lockup, so the ${orientation} lockup is used in ${tone} on ${groundWord}.`
    : `${orientation} lockup in ${tone} on ${groundWord}.`;

  return {
    orientation,
    tone,
    reason,
    downgraded,
    needsScrim: onArtwork && !input.ground.scrim,
  };
}

// ---- Validation --------------------------------------------------------

/** Run the full matrix over one measured lockup. */
export function validateLogoPlacement(input: LogoPlacementInput): LogoMatrixFinding[] {
  const out: LogoMatrixFinding[] = [];
  const { box, orientation, medium, label } = input;

  // 1. Minimum size.
  const min = LOGO_MIN_WIDTH_PX[medium][orientation];
  if (box.w < min) {
    const short = Math.round(min - box.w);
    out.push({
      id: `${input.id}-min-size`,
      check: "logo-min-size",
      severity: box.w < min * 0.75 ? "fail" : "warn",
      label,
      detail:
        medium === "print"
          ? `The lockup prints ${pxToMm(box.w).toFixed(1)}mm wide — the recorded minimum for the ${orientation} lockup is ${LOGO_MIN_WIDTH_MM[orientation]}mm.`
          : `The lockup renders ${Math.round(box.w)}px wide — ${short}px under the ${min}px minimum for the ${orientation} lockup.`,
      fix:
        orientation === "mark-only"
          ? "Give the mark more room, or drop the lockup from this surface rather than printing it under the legible size."
          : `Grow the lockup to at least ${min}px, or switch to the ${orientation === "horizontal" ? "stacked" : "mark-only"} lockup, which reads smaller.`,
    });
  }

  // 2. Clearspace.
  const required = clearspaceFor(box, orientation);
  const edges: Array<[string, number]> = [
    ["left edge", box.x],
    ["top edge", box.y],
    ["right edge", input.surface.w - (box.x + box.w)],
    ["bottom edge", input.surface.h - (box.y + box.h)],
  ];
  for (const [name, gap] of edges) {
    if (gap < required) {
      out.push({
        id: `${input.id}-clearspace-${name.replace(/\s/g, "-")}`,
        check: "logo-clearspace",
        severity: gap < required * CLEARSPACE_FAIL_SHARE ? "fail" : "warn",
        label,
        detail: `Only ${Math.round(Math.max(0, gap))}px between the lockup and the ${name} — the safe zone is ${Math.round(required)}px (1.5× the T height).`,
        fix: `Move the lockup in so it keeps ${Math.round(required)}px clear of the ${name}.`,
      });
    }
  }
  for (const other of input.neighbours ?? []) {
    const share = intrusionShare(box, orientation, other);
    if (share > 0) {
      out.push({
        id: `${input.id}-clearspace-${Math.round(other.x)}-${Math.round(other.y)}`,
        check: "logo-clearspace",
        severity: share >= 1 - CLEARSPACE_FAIL_SHARE ? "fail" : "warn",
        label,
        detail: `${other.label ?? "Something on the surface"} sits inside the lockup's ${Math.round(required)}px safe zone.`,
        fix: "Move it out of the safe zone, or place the lockup in a clear corner.",
      });
    }
  }

  // 3. Variant selection.
  const want = selectLogoVariant({
    medium,
    box,
    ground: input.ground,
    prefer: orientation,
  });
  if (want.tone !== input.tone) {
    out.push({
      id: `${input.id}-tone`,
      check: "logo-variant",
      severity: "fail",
      label,
      detail: `The ${input.tone} lockup is placed on ${input.ground.kind === "solid-token" ? "a solid brand token" : input.ground.kind === "photo" ? "photography" : "a curated image plate"} that calls for the ${want.tone} lockup.`,
      fix: `Use the approved ${want.tone} lockup here.`,
    });
  }
  if (want.orientation !== orientation) {
    out.push({
      id: `${input.id}-orientation`,
      check: "logo-variant",
      severity: "warn",
      label,
      detail: want.reason,
      fix: `Switch to the ${want.orientation} lockup in this box.`,
    });
  }
  if (want.needsScrim && input.tone === "white") {
    out.push({
      id: `${input.id}-scrim`,
      check: "logo-variant",
      severity: "warn",
      label,
      detail:
        "The white lockup sits straight on artwork with no recorded scrim behind it, so it can disappear into a light part of the picture.",
      fix: "Deepen the image scrim under the lockup, or move it over a darker part of the picture.",
    });
  }

  return out;
}

/** Run the matrix over every measured lockup on a set of surfaces. */
export function validateLogoPlacements(inputs: LogoPlacementInput[]): LogoMatrixFinding[] {
  return inputs.flatMap((i) => validateLogoPlacement(i));
}

export const LOGO_MATRIX_CHECK_LABEL: Record<LogoMatrixCheck, string> = {
  "logo-clearspace": "Logo clear space (1.5× T)",
  "logo-min-size": "Logo minimum size",
  "logo-variant": "Logo variant for the ground",
};
