/**
 * Document rendering mode for print sections.
 *
 * Print collateral is typeset, not "app UI": the uploaded PDFs lead with
 * type hierarchy, hairlines and numerals rather than icon chips. When
 * `icons` is false, section renderers drop the icon chip and fall back to a
 * typographic marker (numeral / rule / plain label) so previews read like a
 * document page.
 */
import { createContext, useContext, type ReactNode } from "react";

type PrintDocMode = {
  /** Render icon glyph chips inside sections. */
  icons: boolean;
};

const PrintDocModeContext = createContext<PrintDocMode>({ icons: true });

export function usePrintDocMode(): PrintDocMode {
  return useContext(PrintDocModeContext);
}

/** True when section renderers should draw icon chips. */
export function usePrintIcons(): boolean {
  return useContext(PrintDocModeContext).icons;
}

export function PrintDocModeProvider({
  icons,
  children,
}: {
  icons: boolean;
  children: ReactNode;
}) {
  return (
    <PrintDocModeContext.Provider value={{ icons }}>{children}</PrintDocModeContext.Provider>
  );
}
