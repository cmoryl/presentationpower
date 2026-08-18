import { createContext, useContext, type ReactNode } from "react";

import { StylePackProvider, StylePackVars } from "@/components/slide/StylePackContext";
import { packToneBrand, type StylePack } from "@/lib/style-packs";
import { useResolvedStylePack } from "@/hooks/use-template-registry";

/**
 * Library-wide "alternate look" selection.
 *
 * The public wall lets reviewers audition style packs; the internal library
 * needs the same switch so a curator can edit a module's sample content while
 * seeing it in the look it will ship in. The pack lives in context so every
 * preview surface (grid card, modal A/B, lightbox, slide studio) picks it up
 * without threading a prop through a dozen components.
 */
const PackContext = createContext<StylePack | null>(null);

export function LibraryPackProvider({
  packId,
  children,
}: {
  packId: string | null;
  children: ReactNode;
}) {
  const pack = useResolvedStylePack(packId);
  return <PackContext.Provider value={pack}>{children}</PackContext.Provider>;
}

export function useLibraryPack(): StylePack | null {
  return useContext(PackContext);
}

/** A pack owns its mode — the look IS light or dark. */
export function usePackMode<M extends "light" | "dark">(mode: M): "light" | "dark" {
  const pack = useLibraryPack();
  return pack ? pack.mode : mode;
}

/** Tone the brand toward the active pack so primitives pick up its palette. */
export function usePackBrand<B>(brand: B): B {
  const pack = useLibraryPack();
  return pack ? (packToneBrand(brand as never, pack) as unknown as B) : brand;
}

/** Ground colour for the preview frame behind the scaled slide. */
export function usePackSurface(fallback: string): string {
  const pack = useLibraryPack();
  return pack ? pack.tokens.surface : fallback;
}

/**
 * Wraps slide content in the active pack's token scope. With no pack active it
 * is a transparent pass-through, so existing brand-system previews are byte
 * identical to before.
 */
export function PackShell({ children }: { children: ReactNode }) {
  const pack = useLibraryPack();
  if (!pack) return <>{children}</>;
  return (
    <StylePackProvider pack={pack}>
      <StylePackVars pack={pack} className="h-full w-full">
        {children}
      </StylePackVars>
    </StylePackProvider>
  );
}
