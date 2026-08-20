// Shared helpers for portrait-native print section renderers.
// Mirrors the tokens the print layouts already establish so blocks feel
// native to the document (same glass, ink, and cq-scaling language).

import type { CSSProperties } from "react";

export const PRINT_PAGE_W = 816;
export const cq = (px: number) => `${((px * 100) / PRINT_PAGE_W).toFixed(3)}cqw`;

export function sectionInk(mode: "light" | "dark") {
  return {
    strong: mode === "dark" ? "#F5F4FF" : "#03002C",
    soft: mode === "dark" ? "rgba(245,244,255,0.72)" : "rgba(68,68,68,0.95)",
    faint: mode === "dark" ? "rgba(245,244,255,0.55)" : "rgba(102,102,102,0.92)",
    hairline: mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(3,0,44,0.10)",
  };
}

export function sectionGlass(mode: "light" | "dark", accent: string): CSSProperties {
  if (mode === "dark") {
    return {
      background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 8%, rgba(10,8,36,0.6)), rgba(6,4,32,0.55))`,
      border: `1px solid color-mix(in srgb, ${accent} 22%, rgba(255,255,255,0.08))`,
      backdropFilter: "blur(14px) saturate(140%)",
    };
  }
  return {
    background: `linear-gradient(180deg, rgba(255,255,255,0.94), rgba(255,255,255,0.82))`,
    border: `1px solid color-mix(in srgb, ${accent} 18%, rgba(255,255,255,0.75))`,
    backdropFilter: "blur(14px) saturate(140%)",
    boxShadow: `0 ${cq(6)} ${cq(18)} rgba(3,0,44,0.10)`,
  };
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
