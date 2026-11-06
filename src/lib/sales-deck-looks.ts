/**
 * SALES-ENABLEMENT DECK LOOKS — sales decks ship in Enterprise mode only.
 *
 * Since the Nov 2026 Spectrum style guide, the corporate look is LIGHT-FIRST:
 * there is no dark corporate deck. Sales enablement is create-only: the deck
 * is born into the approved Enterprise Spectrum look, and nothing else. Any
 * other style pack that reaches a sales deck (from a stale preset, an import,
 * or an agent suggestion) is coerced back to it. The retired dark look
 * (skin-s04) is kept below solely so stale references resolve to Spectrum
 * instead of breaking.
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
    label: "Enterprise · Spectrum",
    note: "Light canvas, frosted glass cards, aqua-blue-violet spectrum accents.",
  },
  // Retired by the Spectrum guide (light-first, no dark pages). Kept mapped to
  // the Spectrum pack so stale dark references coerce instead of erroring.
  dark: {
    stylePackId: "skin-s06",
    label: "Enterprise · Spectrum",
    note: "Light canvas, frosted glass cards, aqua-blue-violet spectrum accents.",
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
