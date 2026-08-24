/**
 * SALES-ENABLEMENT DECK LOOKS — sales decks ship in Enterprise mode only, in
 * a light and a dark variant.
 *
 * Sales enablement is create-only: they pick which of the two approved
 * enterprise looks a deck is born into, and nothing else. Any other style pack
 * that reaches a sales deck (from a stale preset, an import, or an agent
 * suggestion) is coerced back to the matching enterprise pack for its mode.
 */

import { salesApprovedTemplatePackIds } from "./template-registry";

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

/**
 * Custom (admin-authored) templates are NOT available to sales by default. A
 * look only joins the sales set when an admin flags it `sales_approved`, which
 * the template registry publishes as `tpl-<code>` pack ids.
 */
export function salesApprovedPackIds(): readonly string[] {
  return [...SALES_DECK_PACK_IDS, ...salesApprovedTemplatePackIds()];
}

/** True when the pack is one of the two approved sales enterprise looks. */
export function isSalesDeckPack(stylePackId?: string | null): boolean {
  return !!stylePackId && SALES_DECK_PACK_IDS.includes(stylePackId);
}

/** True when sales may use this pack: enterprise light/dark, or an approved custom look. */
export function isSalesAllowedPack(stylePackId?: string | null): boolean {
  return !!stylePackId && salesApprovedPackIds().includes(stylePackId);
}

/**
 * Coerce any style pack to a sales-approved pack. Enterprise light/dark and
 * admin-approved custom templates are kept, so the user's light/dark choice (or
 * an approved brand look) survives; everything else falls back to Enterprise.
 */
export function enforceSalesDeckPack(
  stylePackId?: string | null,
  prefer: SalesLookMode = "light",
): string {
  if (isSalesAllowedPack(stylePackId)) return stylePackId as string;
  return SALES_DECK_LOOKS[prefer].stylePackId;
}

