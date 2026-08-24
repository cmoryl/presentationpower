/**
 * Document rendering mode for print sections.
 *
 * Print collateral is typeset, not "app UI": the uploaded PDFs lead with
 * type hierarchy, hairlines and numerals rather than icon chips. When
 * `icons` is false, section renderers drop the icon chip and fall back to a
 * typographic marker (numeral / rule / plain label) so previews read like a
 * document page.
 *
 * When icons ARE on, the same context carries the iconography *style* — glyph
 * scale, stroke weight and an optional accent override — so a document's
 * iconography can be tuned to match its type weight without touching each
 * section renderer.
 */
import { createContext, useContext, type ReactNode } from "react";
import type { PrintSurface } from "@/lib/print-icon-contrast";


export type PrintIconStyle = {
  /** Multiplier applied to every glyph's rendered size (1 = layout default). */
  scale: number;
  /** Multiplier applied to every glyph's stroke width. */
  stroke: number;
  /** Optional accent colour override for glyphs (CSS colour). */
  accent?: string;
};

export const PRINT_ICON_STYLE_DEFAULT: PrintIconStyle = { scale: 1, stroke: 1 };

/** Normalise a persisted (partial) icon treatment into a full style. */
export function resolvePrintIconStyle(
  settings?: { scale?: number; stroke?: number; accent?: string } | null,
): PrintIconStyle {
  const clamp = (n: number | undefined, lo: number, hi: number, fallback: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  return {
    scale: clamp(settings?.scale, 0.5, 2.5, 1),
    stroke: clamp(settings?.stroke, 0.5, 3, 1),
    ...(settings?.accent ? { accent: settings.accent } : {}),
  };
}

type PrintDocMode = {
  /** Render icon glyph chips inside sections. */
  icons: boolean;
  iconStyle: PrintIconStyle;
};

const PrintDocModeContext = createContext<PrintDocMode>({
  icons: true,
  iconStyle: PRINT_ICON_STYLE_DEFAULT,
});

export function usePrintDocMode(): PrintDocMode {
  return useContext(PrintDocModeContext);
}

/** True when section renderers should draw icon chips. */
export function usePrintIcons(): boolean {
  return useContext(PrintDocModeContext).icons;
}

/** Current glyph styling (scale / stroke / accent override). */
export function usePrintIconStyle(): PrintIconStyle {
  return useContext(PrintDocModeContext).iconStyle;
}

export function PrintDocModeProvider({
  icons,
  iconStyle = PRINT_ICON_STYLE_DEFAULT,
  children,
}: {
  icons: boolean;
  iconStyle?: PrintIconStyle;
  children: ReactNode;
}) {
  return (
    <PrintDocModeContext.Provider value={{ icons, iconStyle }}>
      {children}
    </PrintDocModeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Sheet surface
// ---------------------------------------------------------------------------
// Glyph ink is brand-coloured, and the brand's blues are dark: on the dark
// variant of a template a Blue 500 / Blue 800 stroke sits on a Blue 800 sheet
// and disappears. Layouts publish which sheet they are drawing so glyphs can
// resolve a readable version of that same colour instead of each layout
// hand-picking a second palette.
const PrintSurfaceContext = createContext<PrintSurface>("light");

/** Which sheet the glyphs are being drawn on. Defaults to a white page. */
export function usePrintSurface(): PrintSurface {
  return useContext(PrintSurfaceContext);
}

export function PrintSurfaceProvider({
  mode,
  children,
}: {
  mode: PrintSurface;
  children: ReactNode;
}) {
  return <PrintSurfaceContext.Provider value={mode}>{children}</PrintSurfaceContext.Provider>;
}

