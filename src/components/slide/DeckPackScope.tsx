// Deck-level "alternate look" scope.
//
// A deck records its chosen design skin / style pack on
// `deck.context.stylePackId` (set in the brief, the agent, or the deck header).
// The agent preview and the module library both dress their slides through the
// StylePack context, but the deck editor, presenter, print, document and share
// surfaces used to render with no pack in scope — so a deck authored in, say,
// "Verda Field" reverted to the default enterprise look the moment it was
// opened in the editor.
//
// This module is the single place those surfaces resolve the deck's look:
//   • `useDeckPack(deck)` → the resolved pack (or null for the brand system)
//   • `useDeckPackBrand(brand, pack)` → brand toned toward the pack's palette
//   • `<DeckPackScope>` → the token scope every slide render site wraps
//
// With no pack recorded, every helper is a pass-through, so brand-system decks
// render exactly as before.
import { useMemo, type CSSProperties, type ReactNode } from "react";

import { StylePackProvider, StylePackVars } from "@/components/slide/StylePackContext";
import { packToneBrand, stylePackById, type StylePack } from "@/lib/style-packs";
import { useResolvedStylePack } from "@/hooks/use-template-registry";

type PackSource =
  | { context?: { stylePackId?: string | null } | null | undefined }
  | null
  | undefined;

/** Resolve a deck's recorded look. Accepts the deck (or nothing) directly. */
export function useDeckPack(deck: PackSource): StylePack | null {
  // Resolved through the registry-aware hook so a republished template or an
  // updated background override invalidates the deck's look immediately.
  return useResolvedStylePack(deck?.context?.stylePackId ?? null);
}

/** Non-hook form for loaders, exports and other non-render call sites. */
export function deckPack(deck: PackSource): StylePack | null {
  return stylePackById(deck?.context?.stylePackId ?? null);
}

/**
 * Tone a resolved brand mode toward the active pack so slide primitives that
 * read `brand.tokens` (charts, rules, accents) match the pack, not the default
 * blue system.
 */
export function packBrand<B>(brand: B, pack: StylePack | null): B {
  return pack ? (packToneBrand(brand as never, pack) as unknown as B) : brand;
}

/**
 * Token scope for one slide surface.
 *
 * Wrap the slide stage — never the app chrome: pack CSS is scoped under
 * `[data-style-pack]` and would restyle editor headings and controls too.
 */
export function DeckPackScope({
  pack,
  className,
  style,
  children,
}: {
  pack: StylePack | null | undefined;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!pack) return <>{children}</>;
  return (
    <StylePackProvider pack={pack}>
      <StylePackVars pack={pack} className={className ?? "h-full w-full"} style={style}>
        {children}
      </StylePackVars>
    </StylePackProvider>
  );
}
