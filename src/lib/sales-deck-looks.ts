/**
 * SALES-ENABLEMENT DECK LOOKS — sales decks ship in Enterprise mode only, in
 * a light and a dark variant.
 *
 * Sales enablement is create-only: they pick which of the two approved
 * enterprise looks a deck is born into, and nothing else. Any other style pack
 * that reaches a sales deck (from a stale preset, an import, or an agent
 * suggestion) is coerced back to the matching enterprise pack for its mode.
 */

export type SalesLookMode = "light" | "dark";

/** The only style packs a sales-enablement deck may use. */
export const SALES_DECK_LOOKS: Record<
  SalesLookMode,
  { stylePackId: string; label: string; note: string }
> = {
  light: {
    stylePackId: "skin-s06",
    label: "Enterprise · Light",
    note: "Disciplined grid, layered neutrals, boardroom-safe on projectors.",
  },
  dark: {
    stylePackId: "skin-s04",
    label: "Enterprise · Dark",
    note: "Precision dark planes with restrained accents for on-screen rooms.",
  },
};

export const SALES_DECK_PACK_IDS: readonly string[] = [
  SALES_DECK_LOOKS.light.stylePackId,
  SALES_DECK_LOOKS.dark.stylePackId,
];

/** True when the pack is one of the two approved sales enterprise looks. */
export function isSalesDeckPack(stylePackId?: string | null): boolean {
  return !!stylePackId && SALES_DECK_PACK_IDS.includes(stylePackId);
}

/**
 * Coerce any style pack to the approved sales enterprise pack. When the pack is
 * already approved it is kept, so the user's light/dark choice survives.
 */
export function enforceSalesDeckPack(
  stylePackId?: string | null,
  prefer: SalesLookMode = "light",
): string {
  if (isSalesDeckPack(stylePackId)) return stylePackId as string;
  return SALES_DECK_LOOKS[prefer].stylePackId;
}
