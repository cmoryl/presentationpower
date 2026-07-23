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
