import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { stylePackCssVars, type StylePack } from "@/lib/style-packs";
import { useResolvedStylePack } from "@/hooks/use-template-registry";
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
  const fromId = useResolvedStylePack(typeof pack === "string" ? pack : null);
  const resolved = typeof pack === "string" ? fromId : (pack ?? null);
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
  // Automatic readability guard: the pack's ink tokens are re-tested against
  // the worst-case luminance its own background layers can produce, and nudged
  // along the pack's own direction of travel when they fall short. Decorative
  // marks are untouched.
  const guard = packReadability(pack);
  return (
    <div
      className={className}
      data-style-pack={pack.id}
      data-style-pack-mode={pack.mode}
      data-pack-readability={guard.passes ? "pass" : "scrim"}
      style={{
        ...(stylePackCssVars(pack) as CSSProperties),
        ...(guard.vars as CSSProperties),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export { StylePackContext };
