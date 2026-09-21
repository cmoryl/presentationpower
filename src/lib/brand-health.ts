// Brand health & contrast pre-flight scoring.
//
// Pure module: no React, no DOM, no network. The DOM collector lives in
// `brand-health-scan.ts`; everything here works off plain samples so the same
// rules score a rendered slide, a social layout or a unit test fixture.
//
// Three families of checks, all read from the division's active brand guide:
//   1. contrast        — WCAG 2.1 AA between text and the surface behind it.
//   2. colour hierarchy — accents and pops are fills, never text ink; any ink
//                         outside the approved set is reported.
//   3. typography      — recorded typeface and the recorded heading/body scale.
//
// Backgrounds are never invented or re-drawn by this module: it measures the
// surface a layout already has (approved photography, solid tokens, curated
// imagery) and reports. No vector background is generated anywhere.

import type { BrandGuide, ColorSwatch } from "./brand-guides";
import { MASTER_TRANSPERFECT_GUIDE } from "./brand-guides";
import { contrastRatio } from "./contrast-audit";
import {
  LOGO_MATRIX_CHECK_LABEL,
  validateLogoPlacements,
  type LogoMatrixCheck,
  type LogoPlacementInput,
} from "./logo-placement-matrix";

/** WCAG AA thresholds used by the pre-flight. */
export const BH_AA_NORMAL = 4.5;
export const BH_AA_LARGE = 3;

/** Ink colours that are always legitimate text colours in this system. */
export const APPROVED_TEXT_INK = ["#03002c", "#003fc7", "#ffffff", "#666666"] as const;

export type BrandHealthSeverity = "pass" | "warn" | "fail";

export type BrandHealthCheck =
  | "contrast"
  | "accent-on-text"
  | "ink"
  | "typeface"
  | "type-scale"
  | LogoMatrixCheck;

/** One measured run of text from a rendered surface. */
export type BrandHealthSample = {
  /** Stable id within the scan. */
  id: string;
  /** Short human label, e.g. `Slide 03 · heading`. */
  label: string;
  /** The text itself (trimmed, truncated by the collector). */
  text: string;
  /** Resolved foreground colour, `#rrggbb`. */
  fg: string;
  /** Resolved surface colour behind the text, `#rrggbb`. */
  bg: string;
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number;
  /** True when the text sits on photography or a curated image plate. */
  onMedia?: boolean;
};

export type BrandHealthFinding = {
  id: string;
  check: BrandHealthCheck;
  severity: BrandHealthSeverity;
  /** What was measured. */
  label: string;
  /** Plain-language explanation for the person exporting. */
  detail: string;
  /** One concrete remedy, when there is one. */
  fix?: string;
  ratio?: number;
  required?: number;
  text?: string;
};

export type BrandHealthReport = {
  score: number;
  grade: "pass" | "review" | "blocked";
  guideTitle: string;
  sampled: number;
  failures: number;
  warnings: number;
  /** Checks with nothing to report, listed so a clean pre-flight is visible. */
  passed: { check: BrandHealthCheck; label: string }[];
  findings: BrandHealthFinding[];
};

const CHECK_LABEL: Record<BrandHealthCheck, string> = {
  contrast: "Text contrast (WCAG AA)",
  "accent-on-text": "Accent colours used as fills, not text",
  ink: "Text ink from the approved set",
  typeface: "Approved typeface",
  "type-scale": "Recorded type scale",
  ...LOGO_MATRIX_CHECK_LABEL,
};

export function brandHealthCheckLabel(check: BrandHealthCheck): string {
  return CHECK_LABEL[check];
}

const hex = (v: string | null | undefined): string => {
  const s = (v ?? "").trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  return "";
};

/** AA treats >=24px, or >=18.66px bold, as large text. */
export function isLargeText(sizePx: number, weight: number): boolean {
  return sizePx >= 24 || (sizePx >= 18.66 && weight >= 700);
}

/** Every swatch a guide records as an accent, secondary or pop colour. */
export function accentSwatches(guide: BrandGuide): ColorSwatch[] {
  return [...guide.secondaryColors, ...guide.tertiaryColors];
}

/** Hexes approved as text ink for this guide: the shared ink set plus primaries. */
export function approvedInk(guide: BrandGuide): string[] {
  const set = new Set<string>(APPROVED_TEXT_INK.map((c) => hex(c)).filter(Boolean));
  for (const c of guide.primaryColors) {
    const h = hex(c.hex);
    if (h) set.add(h);
  }
  // Deep ramp stops are legitimate ink; pale stops are not.
  for (const ramp of guide.ramps) {
    for (const stop of ramp.stops) {
      const h = hex(stop);
      if (h && contrastRatio(h, "#ffffff") >= BH_AA_NORMAL) set.add(h);
    }
  }
  return Array.from(set);
}

/** Every size recorded in the guide's heading + body scale. */
export function recordedSizes(guide: BrandGuide): number[] {
  return Array.from(
    new Set([...guide.headingScale, ...guide.bodyScale].map((s) => s.sizePx)),
  ).sort((a, b) => a - b);
}

function nearestSize(sizePx: number, sizes: number[]): number | null {
  if (!sizes.length) return null;
  return sizes.reduce((best, s) => (Math.abs(s - sizePx) < Math.abs(best - sizePx) ? s : best));
}

/** First family token from a computed `font-family` list. */
function primaryFamily(fontFamily: string): string {
  return (fontFamily.split(",")[0] ?? "").replace(/["']/g, "").trim();
}

const TYPE_SCALE_TOLERANCE = 0.14;
/** Micro labels and eyebrows sit below the recorded scale on purpose. */
const TYPE_SCALE_FLOOR_PX = 11;

function truncate(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/**
 * Score a set of samples against a division's brand guide.
 *
 * Deductions: 10 per failure, 3 per warning, floored at 0. A surface with
 * nothing to report scores 100.
 */
export function scoreBrandHealth(
  samples: BrandHealthSample[],
  guide: BrandGuide = MASTER_TRANSPERFECT_GUIDE,
  /** Measured brand lockups on the same surfaces, for the placement matrix. */
  logos: LogoPlacementInput[] = [],
): BrandHealthReport {
  const findings: BrandHealthFinding[] = [...validateLogoPlacements(logos)];
  const ink = approvedInk(guide);
  const accents = accentSwatches(guide);
  const accentByHex = new Map(accents.map((c) => [hex(c.hex), c] as const));
  const sizes = recordedSizes(guide);
  const wantFamily = primaryFamily(guide.typefacePrimary) || "Geist";

  for (const s of samples) {
    const fg = hex(s.fg);
    const bg = hex(s.bg);
    const large = isLargeText(s.fontSizePx, s.fontWeight);
    const required = large ? BH_AA_LARGE : BH_AA_NORMAL;

    // 1. Contrast. Text sitting on photography has no measurable flat
    //    surface behind it — white type is the approved treatment there, so
    //    we never invent a ratio against a fallback colour.
    if (s.onMedia) {
      if (hex(fg) !== "#ffffff") {
        findings.push({
          id: `${s.id}-media-ink`,
          check: "contrast",
          severity: "warn",
          label: s.label,
          detail: `Text sits over photography in ${fg} — the recorded treatment is white type on a deepened scrim.`,
          fix: "Set this text to #FFFFFF and deepen the image scrim behind it.",
          text: truncate(s.text),
        });
      }
    } else if (fg && bg) {
      const ratio = Math.round(contrastRatio(fg, bg) * 100) / 100;
      if (ratio < required) {
        const onDarkSurface = contrastRatio("#ffffff", bg) >= contrastRatio("#03002c", bg);
        findings.push({
          id: `${s.id}-contrast`,
          check: "contrast",
          severity: ratio < required - 1 ? "fail" : "warn",
          label: s.label,
          detail: `${fg} on ${bg} measures ${ratio}:1 — AA needs ${required}:1 at ${Math.round(s.fontSizePx)}px.`,
          fix: `Set this text to ${onDarkSurface ? "#FFFFFF" : "#03002C"} on this surface.`,
          ratio,
          required,
          text: truncate(s.text),
        });
      }
    }


    // 2. Colour hierarchy — accents and pops are fills, never text.
    const accent = accentByHex.get(fg);
    if (accent) {
      findings.push({
        id: `${s.id}-accent`,
        check: "accent-on-text",
        severity: large ? "warn" : "fail",
        label: s.label,
        detail: `${accent.name} (${accent.hex}) is an accent colour — the guide keeps accents for fills, rules, bars and icons, never for type.`,
        fix: "Move the accent to the shape behind the words and set the text to ink or white.",
        text: truncate(s.text),
      });
    } else if (fg && !ink.includes(fg)) {
      findings.push({
        id: `${s.id}-ink`,
        check: "ink",
        severity: "warn",
        label: s.label,
        detail: `${fg} is not a recorded text ink for ${guide.title}.`,
        fix: "Use Blue 800 #03002C, Blue 500 #003FC7, white, or Dark Gray #666666 for small print.",
        text: truncate(s.text),
      });
    }

    // 3a. Typeface.
    const family = primaryFamily(s.fontFamily);
    // "Geist" and "Geist Sans" are the same face; compare on letters only, both ways.
    // "Geist", "Geist Sans" and "Geist Variable" are the same face; compare on
    // letters only, with face descriptors dropped, both ways.
    const faceKey = (v: string) =>
      v
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .replace(/(variable|vf|sans|text|display|pro)$/g, "");
    const famKey = faceKey(family);
    const wantKey = faceKey(wantFamily);
    const faceMatches = Boolean(famKey) && (famKey.includes(wantKey) || wantKey.includes(famKey));

    if (family && !faceMatches) {
      findings.push({
        id: `${s.id}-typeface`,
        check: "typeface",
        severity: "warn",
        label: s.label,
        detail: `Rendering in ${family} — ${guide.title} records ${guide.typefacePrimary}.`,
        fix: `Set this text to ${guide.typefacePrimary}.`,
        text: truncate(s.text),
      });
    }

    // 3b. Type scale.
    if (s.fontSizePx >= TYPE_SCALE_FLOOR_PX) {
      const near = nearestSize(s.fontSizePx, sizes);
      if (near && Math.abs(near - s.fontSizePx) / near > TYPE_SCALE_TOLERANCE) {
        findings.push({
          id: `${s.id}-scale`,
          check: "type-scale",
          severity: "warn",
          label: s.label,
          detail: `${Math.round(s.fontSizePx)}px is off the recorded scale — the nearest recorded step is ${near}px.`,
          fix: `Use ${near}px, or record this size in the brand guide if it is deliberate.`,
          text: truncate(s.text),
        });
      }
    }
  }

  const failures = findings.filter((f) => f.severity === "fail").length;
  const warnings = findings.filter((f) => f.severity === "warn").length;
  // Warnings are "worth a look", not broken work: a surface with nothing failing
  // never sinks below 40, so a deliberate campaign face cannot read as a zero.
  const raw = 100 - failures * 10 - warnings * 3;
  const floor = failures === 0 ? 40 : 0;
  const score = Math.max(floor, Math.min(100, raw));
  const reported = new Set(findings.map((f) => f.check));
  const passed = (Object.keys(CHECK_LABEL) as BrandHealthCheck[])
    .filter((c) => !reported.has(c))
    .map((c) => ({ check: c, label: CHECK_LABEL[c] }));

  return {
    score,
    grade: failures > 0 ? "blocked" : warnings > 0 ? "review" : "pass",
    guideTitle: guide.title,
    sampled: samples.length,
    failures,
    warnings,
    passed,
    findings,
  };
}
