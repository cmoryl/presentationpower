// WCAG contrast audit for reinterpretation colour choices.
//
// The reinterpretation controls let a reviewer lock an accent and a light/dark
// slide mode across the deck, and override either per slide. Several brand
// accents are decorative, not readable: Yellow and Aqua vanish on white, deep
// Blue and Red fall under AA-Large on the dark backdrop. This module scores
// every proposed colour against the surface it will actually render on, so the
// review dialog can warn *before* the deck is built.
//
// Pure module: no React, no network. Ratios follow WCAG 2.1 relative luminance.

import { DARK_STAT_BG, LIGHT_STAT_BG, ratio, statColors } from "./stat-contrast";

/** WCAG thresholds we score against. */
export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;
/** Non-text (borders, chart fills, rules) — WCAG 1.4.11. */
export const AA_NON_TEXT = 3;

/** Accent used when a slide has no lock and no division override. */
export const DEFAULT_ACCENT = "#003fc7";

export type ContrastLevel = "pass" | "warn" | "fail";

export type ContrastFinding = {
  /** Stable id, e.g. `accent-heading`. */
  id: string;
  /** Human label for the pairing under test. */
  label: string;
  /** Foreground colour tested. */
  fg: string;
  /** Background colour tested. */
  bg: string;
  ratio: number;
  required: number;
  level: ContrastLevel;
  /** One-line reviewer-facing explanation. */
  detail: string;
};

export type ContrastAudit = {
  accent: string;
  mode: "light" | "dark";
  bg: string;
  ink: string;
  findings: ContrastFinding[];
  failures: number;
  warnings: number;
  /** Worst level across every finding. */
  level: ContrastLevel;
  /**
   * Accent nudged until it clears AA on this surface. Only set when the raw
   * accent failed as text — offer it as the one-click remedy.
   */
  safeAccent?: string;
};

const round = (n: number) => Math.round(n * 100) / 100;

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Normalize to `#rrggbb`, falling back to the brand accent. */
export function normalizeHex(v: string | null | undefined, fallback = DEFAULT_ACCENT): string {
  if (!v) return fallback;
  const s = v.trim();
  const short = /^#?([0-9a-f]{3})$/i.exec(s);
  if (short)
    return (
      "#" +
      short[1]
        .split("")
        .map((c) => c + c)
        .join("")
    ).toLowerCase();
  const full = /^#?([0-9a-f]{6})$/i.exec(s);
  return full ? `#${full[1].toLowerCase()}` : fallback;
}

/** Contrast ratio between two hex colours (order-independent). */
export function contrastRatio(a: string, b: string): number {
  const pa = toRgb(a);
  const pb = toRgb(b);
  if (!pa || !pb) return 1;
  return round(ratio(pa, pb));
}

function toRgb(hex: string): [number, number, number] | null {
  const h = normalizeHex(hex, "");
  if (!HEX_RE.test(h)) return null;
  return [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
}

/** Score one foreground/background pair. `warnAt` softens a near miss. */
export function checkPair(args: {
  id: string;
  label: string;
  fg: string;
  bg: string;
  required: number;
  detail?: string;
}): ContrastFinding {
  const r = contrastRatio(args.fg, args.bg);
  const level: ContrastLevel =
    r >= args.required ? "pass" : r >= args.required * 0.75 ? "warn" : "fail";
  const detail =
    args.detail ??
    (level === "pass"
      ? `Clears ${args.required}:1.`
      : `${r}:1 — below the ${args.required}:1 minimum.`);
  return { ...args, ratio: r, level, detail };
}

const WORST: Record<ContrastLevel, number> = { pass: 0, warn: 1, fail: 2 };

function worst(findings: ContrastFinding[]): ContrastLevel {
  return findings.reduce<ContrastLevel>(
    (acc, f) => (WORST[f.level] > WORST[acc] ? f.level : acc),
    "pass",
  );
}

/**
 * Audit one slide's proposed colours.
 *
 * Three pairings matter on our slide surfaces:
 *  1. body/heading ink on the slide background (mode sanity check);
 *  2. the accent used as *text* — stat figures, kickers, eyebrows;
 *  3. the accent used as a *fill* with ink on top — chips, buttons, KPI plates.
 */
export function auditSlideColors(input: {
  accent?: string | null;
  mode?: "light" | "dark";
  /** Override the surface colour (e.g. a photographic scrim). */
  bg?: string;
}): ContrastAudit {
  const mode = input.mode ?? "light";
  const bg = normalizeHex(input.bg, mode === "dark" ? DARK_STAT_BG : LIGHT_STAT_BG);
  const ink = mode === "dark" ? "#ffffff" : "#03002c";
  const accent = normalizeHex(input.accent);

  const findings: ContrastFinding[] = [
    checkPair({
      id: "ink-body",
      label: "Body copy on slide background",
      fg: ink,
      bg,
      required: AA_NORMAL,
    }),
    checkPair({
      id: "accent-text",
      label: "Accent as text (stats, kickers)",
      fg: accent,
      bg,
      required: AA_LARGE,
      detail:
        contrastRatio(accent, bg) >= AA_LARGE
          ? `Clears AA-Large (${AA_LARGE}:1) for headline-size text.`
          : `${contrastRatio(accent, bg)}:1 against the ${mode} surface — accent text will be hard to read.`,
    }),
    checkPair({
    // Filled chips/buttons pick whichever label colour reads best on the
    // accent, so the audit scores the better of the two rather than punishing
    // a light accent for failing against white.
    (() => {
      const best =
        contrastRatio("#03002c", accent) >= contrastRatio("#ffffff", accent)
          ? "#03002c"
          : "#ffffff";
      return checkPair({
        id: "accent-fill",
        label: "Label on accent fill (chips, buttons)",
        fg: best,
        bg: accent,
        required: AA_NORMAL,
        detail:
          contrastRatio(best, accent) >= AA_NORMAL
            ? `Readable with ${best === "#ffffff" ? "white" : "dark"} label copy.`
            : `${contrastRatio(best, accent)}:1 at best — no label colour reads cleanly on this fill.`,
      });
    })(),

    checkPair({
      id: "accent-hairline",
      label: "Accent rules & borders on background",
      fg: accent,
      bg,
      required: AA_NON_TEXT,
      detail:
        contrastRatio(accent, bg) >= AA_NON_TEXT
          ? "Hairlines and rules stay visible."
          : "Accent rules will nearly disappear against this surface.",
    }),
  ];

  const textFinding = findings.find((f) => f.id === "accent-text")!;
  const safe = statColors(accent, mode, { bg, ink });
  const safeAccent =
    textFinding.level === "pass" || safe.base.toLowerCase() === accent
      ? undefined
      : safe.base.toLowerCase();

  return {
    accent,
    mode,
    bg,
    ink,
    findings,
    failures: findings.filter((f) => f.level === "fail").length,
    warnings: findings.filter((f) => f.level === "warn").length,
    level: worst(findings),
    safeAccent,
  };
}

export type SlideColorProposal = {
  index: number;
  accent?: string | null;
  mode?: "light" | "dark";
};

export type DeckContrastAudit = {
  /** Per-slide audit keyed by slide index. */
  bySlide: Map<number, ContrastAudit>;
  /** Slide indexes with at least one failure. */
  failingSlides: number[];
  /** Slide indexes with warnings but no failures. */
  warningSlides: number[];
  level: ContrastLevel;
};

/** Audit every proposed slide colour pairing in one pass. */
export function auditDeckColors(slides: SlideColorProposal[]): DeckContrastAudit {
  const bySlide = new Map<number, ContrastAudit>();
  const failingSlides: number[] = [];
  const warningSlides: number[] = [];
  for (const s of slides) {
    const a = auditSlideColors(s);
    bySlide.set(s.index, a);
    if (a.failures > 0) failingSlides.push(s.index);
    else if (a.warnings > 0) warningSlides.push(s.index);
  }
  return {
    bySlide,
    failingSlides,
    warningSlides,
    level: failingSlides.length > 0 ? "fail" : warningSlides.length > 0 ? "warn" : "pass",
  };
}
