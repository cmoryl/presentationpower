// Shared helpers for portrait-native print section renderers.
// Mirrors the tokens the print layouts already establish so blocks feel
// native to the document (same glass, ink, and cq-scaling language).

import type { CSSProperties } from "react";

import {
  printCardSurface,
  type PrintCardSurfaceOptions,
} from "@/lib/print-card-surface";

export const PRINT_PAGE_W = 816;

/** Defensive read for any authored collection. Stripped/partial drafts often
 *  arrive with `items`/`rows`/`bullets` missing or set to a non-array, which
 *  used to throw inside a render pass and blank the whole document. Modules
 *  read every collection through this and simply render nothing instead. */
export function safeList<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
/** Same unit the page layouts use (print-primitives.cq): px against the 816pt
 *  page, multiplied by `--print-fit-scale` so modular sections shrink with the
 *  rest of the document under content-fit relief instead of overflowing. */
export const cq = (px: number) =>
  `calc(${((px * 100) / PRINT_PAGE_W).toFixed(3)}cqw * var(--print-fit-scale, 1))`;

export function sectionInk(mode: "light" | "dark") {
  return {
    strong: mode === "dark" ? "#F5F4FF" : "#03002C",
    soft: mode === "dark" ? "rgba(245,244,255,0.72)" : "rgba(68,68,68,0.95)",
    faint: mode === "dark" ? "rgba(245,244,255,0.55)" : "rgba(102,102,102,0.92)",
    hairline: mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.10)",
  };
}

/**
 * Module panel/card surface. Matches the presentation deck's module boxes: an
 * accent seam along the top edge, a tint that fades to nothing before the
 * bottom, and no closing hairline — see `src/lib/print-card-surface.ts`.
 * Pass `{ seam: false }` for nested tiles that shouldn't repeat the seam.
 */
export function sectionGlass(
  mode: "light" | "dark",
  accent: string,
  opts: PrintCardSurfaceOptions = {},
): CSSProperties {
  return printCardSurface(mode, accent, opts);
}

// ---------------------------------------------------------------------------
// Page bleed
// ---------------------------------------------------------------------------
// Hero modules are the TOP SECTION of a printed page, not a web hero card:
// photo/accent mastheads run to the trimmed page edge and sit flush with the
// top of the sheet, while the copy inside them keeps the page's own side
// margin. Containers that know their page padding publish it as
// `--print-page-pad` / `--print-page-pad-top`; everywhere else the fallback of
// 0px means the block simply stays inside its column.
export const PAGE_PAD_VAR = "var(--print-page-pad, 0px)";
export const PAGE_PAD_TOP_VAR = "var(--print-page-pad-top, 0px)";

/** Pull a masthead out to the page trim on both sides (and optionally the top). */
export function pageBleed(top = true): CSSProperties {
  return {
    marginLeft: `calc(-1 * ${PAGE_PAD_VAR})`,
    marginRight: `calc(-1 * ${PAGE_PAD_VAR})`,
    ...(top ? { marginTop: `calc(-1 * ${PAGE_PAD_TOP_VAR})` } : {}),
  };
}

/** Inside a bled masthead, restore the page's own side margin for copy. */
export function pageGutter(extra = 0): CSSProperties {
  return {
    paddingLeft: `calc(${PAGE_PAD_VAR} + ${cq(extra)})`,
    paddingRight: `calc(${PAGE_PAD_VAR} + ${cq(extra)})`,
  };
}

// ---------------------------------------------------------------------------
// MODULE RHYTHM — one scale every non-hero print module obeys
// ---------------------------------------------------------------------------
// Before this existed each module carried its own hand-tuned margins, header
// sizes, radii and paddings, so a page mixing "template" blocks with newer
// modules read as two different design systems. All values are page px against
// the 816pt sheet (pass them through `cq()`), so they scale with the document.
export const MODULE = {
  /** Vertical rhythm BETWEEN modules — owned by `PrintSectionsStack`, never by
   *  a module's own margin. Keeps stacks even regardless of block order. */
  stack: 22,
  /** Header (eyebrow + title) → body. */
  headerGap: 12,
  /** Eyebrow → title. */
  eyebrowGap: 4,
  eyebrow: 9.5,
  eyebrowTrack: "0.18em",
  /** Module title (outside a panel). */
  title: 18,
  /** Title inside a panel / card header. */
  panelTitle: 15,
  /** Card heading (tri-card, verb card, feature row). */
  cardTitle: 12.5,
  titleTrack: "-0.015em",
  body: 10,
  bodyLead: 1.5,
  meta: 9.4,
  /** Panel + card corner radius. */
  radius: 14,
  /** Inner chip/tile radius. */
  radiusInner: 10,
  /** Panel padding (y, x). */
  padY: 16,
  padX: 18,
  /** Card padding inside a grid. */
  cardPad: 16,
  /** Gap between cards/columns in a module grid. */
  gridGap: 14,
  /** Hairline row padding for list/table modules. */
  rowPadY: 8,
  /** Icon plate size for card/row icons. */
  iconPlate: 32,
} as const;

/** Outer wrapper for a module — rhythm is owned by the stack, so no margin. */
export const moduleShell: CSSProperties = { margin: 0 };

/** Full-width glass panel at module level (uniform radius + padding). */
export function modulePanel(mode: "light" | "dark", accent: string): CSSProperties {
  return {
    borderRadius: cq(MODULE.radius),
    padding: `${cq(MODULE.padY)} ${cq(MODULE.padX)}`,
    overflow: "hidden",
    ...sectionGlass(mode, accent),
  };
}

/** Card inside a module grid — same radius as the panel, tighter padding. */
export function moduleCard(mode: "light" | "dark", accent: string): CSSProperties {
  return {
    borderRadius: cq(MODULE.radius),
    padding: cq(MODULE.cardPad),
    overflow: "hidden",
    ...sectionGlass(mode, accent),
  };
}

export function moduleEyebrowStyle(accent: string): CSSProperties {
  return {
    fontSize: cq(MODULE.eyebrow),
    fontWeight: 700,
    letterSpacing: MODULE.eyebrowTrack,
    color: accent,
    textTransform: "uppercase",
  };
}

export function moduleTitleStyle(
  mode: "light" | "dark",
  scope: "module" | "panel" = "module",
): CSSProperties {
  return {
    margin: `${cq(MODULE.eyebrowGap)} 0 0`,
    fontSize: cq(scope === "panel" ? MODULE.panelTitle : MODULE.title),
    fontWeight: 700,
    lineHeight: 1.15,
    letterSpacing: MODULE.titleTrack,
    color: sectionInk(mode).strong,
  };
}
