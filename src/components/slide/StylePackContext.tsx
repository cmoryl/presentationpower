import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { stylePackById, stylePackCssVars, type StylePack } from "@/lib/style-packs";
import { packReadability } from "@/lib/pack-readability";

/**
 * The active STYLE PACK, if any.
 *
 * A pack is an alternate master design used for taste-testing in the public
 * module library. `null` means the approved brand system is in force — that is
 * the default everywhere, so no production surface changes behaviour unless it
 * explicitly opts in by wrapping children in <StylePackProvider>.
 */
const StylePackContext = createContext<StylePack | null>(null);

export function useStylePack(): StylePack | null {
  return useContext(StylePackContext);
}

export function StylePackProvider({
  pack,
  children,
}: {
  /** A pack, a pack id, or null/undefined for the approved brand system. */
  pack: StylePack | string | null | undefined;
  children: ReactNode;
}) {
  const resolved = typeof pack === "string" ? stylePackById(pack) : (pack ?? null);
  return <StylePackContext.Provider value={resolved}>{children}</StylePackContext.Provider>;
}

/**
 * Publishes a pack's custom properties onto a wrapper element and tags it with
 * `data-style-pack` so scoped CSS (typography, corner language, texture) can
 * hook in. Slide primitives read the same vars inline with fallbacks, so a
 * subtree with no pack renders identically to today.
 */
export function StylePackVars({
  pack,
  className = "",
  style,
  children,
}: {
  pack: StylePack | null | undefined;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!pack) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }
  return (
    <div
      className={className}
      data-style-pack={pack.id}
      data-style-pack-mode={pack.mode}
      style={{ ...(stylePackCssVars(pack) as CSSProperties), ...style }}
    >
      {children}
    </div>
  );
}

export { StylePackContext };
