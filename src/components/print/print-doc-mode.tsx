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

export type PrintIconStyle = {
  /** Multiplier applied to every glyph's rendered size (1 = layout default). */
  scale: number;
  /** Multiplier applied to every glyph's stroke width. */
  stroke: number;
  /** Optional accent colour override for glyphs (CSS colour). */
  accent?: string;
};

export const PRINT_ICON_STYLE_DEFAULT: PrintIconStyle = { scale: 1, stroke: 1 };

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
