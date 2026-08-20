// Page-format context. Section modules — mastheads especially — need to know
// which sheet they are laid out on: the band height, bleed behaviour and
// margin restore all depend on the trim, not just on the container width.
//
// Anything that renders a print sheet (asset editor canvas, library preview
// frame, hero gallery) provides this; sections read it with `usePrintPage()`
// and fall back to Letter when rendered bare.

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { PrintDensity, PrintPageSize } from "@/lib/print-assets.types";
import {
  heroBandPct,
  pageHeightPx,
  pagePreset,
  pageSideMarginPx,
  pageTopMarginPx,
  type PrintMarginPreset,
  type PrintPagePreset,
} from "@/lib/print-page-presets";

export type PrintPageContextValue = {
  size: PrintPageSize;
  margin: PrintMarginPreset;
  density: PrintDensity;
  preset: PrintPagePreset;
  /** Page height in template px (816px-wide canvas). */
  heightPx: number;
  /** Side margin in template px. */
  sideMarginPx: number;
  /** Top margin in template px. */
  topMarginPx: number;
  /** Default masthead band height, % of page height. */
  heroBandPct: number;
};

const FALLBACK: PrintPageContextValue = {
  size: "Letter",
  margin: "standard",
  density: "standard",
  preset: pagePreset("Letter"),
  heightPx: pageHeightPx("Letter"),
  sideMarginPx: pageSideMarginPx("Letter"),
  topMarginPx: pageTopMarginPx("Letter"),
  heroBandPct: heroBandPct("Letter"),
};

const Ctx = createContext<PrintPageContextValue>(FALLBACK);

export function usePrintPage(): PrintPageContextValue {
  return useContext(Ctx);
}

export function PrintPageProvider({
  size = "Letter",
  margin = "standard",
  density = "standard",
  children,
}: {
  size?: PrintPageSize;
  margin?: PrintMarginPreset;
  density?: PrintDensity;
  children: ReactNode;
}) {
  const value = useMemo<PrintPageContextValue>(
    () => ({
      size,
      margin,
      density,
      preset: pagePreset(size),
      heightPx: pageHeightPx(size),
      sideMarginPx: pageSideMarginPx(size, density, margin),
      topMarginPx: pageTopMarginPx(size, density, margin),
      heroBandPct: heroBandPct(size),
    }),
    [size, margin, density],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
