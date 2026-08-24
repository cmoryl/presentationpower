/**
 * QUICK-CREATE PRESETS — one-click starts for the Sales and Marketing
 * dashboards.
 *
 * Each preset names the *template set* the new artifact should be born into:
 * a deck gets an archetype plus a validated look (style pack + industry
 * recipe), a print piece gets its master kind, and a campaign kit gets a
 * format profile and seed copy. The dashboard applies the division the user
 * picks; everything else here is the approved starting point so nobody lands
 * on a blank, unskinned canvas.
 */

export type QuickCreateKind = "deck" | "print" | "kit";

export type PrintMasterKind =
  | "case-study"
  | "spotlight"
  | "ebrochure"
  | "adaptor-brief"
  | "msa-partnership"
  | "solution-proposal";

export type QuickCreatePreset = {
  id: string;
  kind: QuickCreateKind;
  label: string;
  hint: string;
  /** Human label of the template set this starts from. */
  templateSet: string;

  // ---- deck presets
  archetypeId?: string;
  lengthTarget?: number;
  /** `skin-sNN` visual language. */
  stylePackId?: string;
  /** `RNN` industry ground. Independent of the pack; validated before use. */
  designRecipeId?: string;
  /** Seeds the brief industry field so the recipe reads as intentional. */
  industry?: string;

  // ---- print presets
  printKind?: PrintMasterKind;

  // ---- campaign-kit presets
  kitProfileId?: string;
  kitMode?: "light" | "dark" | "both";
  kitCopy?: { title: string; summary?: string; cta?: string };
};

const SALES: readonly QuickCreatePreset[] = [
  {
    id: "sales-pitch-deck",
    kind: "deck",
    label: "Client pitch deck",
    hint: "Problem → solution narrative, 12 slides, enterprise look",
    templateSet: "Enterprise Grid · R01 Corporate",
    archetypeId: "arch-problem-solution",
    lengthTarget: 12,
    stylePackId: "skin-s06",
    designRecipeId: "R01",
    industry: "Corporate / Enterprise",
  },
  {
    id: "sales-exec-briefing",
    kind: "deck",
    label: "Executive briefing",
    hint: "Tight decision deck, 8 slides, boardroom look",
    templateSet: "Spatial Clarity · R01 Corporate",
    archetypeId: "arch-exec-briefing",
    lengthTarget: 8,
    stylePackId: "skin-s01",
    designRecipeId: "R01",
    industry: "Corporate / Enterprise",
  },
  {
    id: "sales-solution-proposal",
    kind: "print",
    label: "Solution proposal",
    hint: "Division-branded master with scope, locations and cost summary",
    templateSet: "Solution proposal master",
    printKind: "solution-proposal",
  },
  {
    id: "sales-case-study",
    kind: "print",
    label: "Case study",
    hint: "Two-page proof piece for the deal",
    templateSet: "Case study master",
    printKind: "case-study",
  },
  {
    id: "sales-spotlight",
    kind: "print",
    label: "Client spotlight",
    hint: "One-page win, print-ready",
    templateSet: "Client spotlight master",
    printKind: "spotlight",
  },
];

const MARKETING: readonly QuickCreatePreset[] = [
  {
    id: "mkt-campaign-kit",
    kind: "kit",
    label: "Campaign kit",
    hint: "Feed, portrait, story and LinkedIn link in one set",
    templateSet: "Social essentials profile",
    kitProfileId: "social-essentials",
    kitMode: "both",
    kitCopy: {
      title: "Every language. Every content type. One partner.",
      summary:
        "Set the campaign headline once — every format in the kit inherits the look, palette and lockup.",
      cta: "See how we work",
    },
  },
  {
    id: "mkt-full-launch-kit",
    kind: "kit",
    label: "Full launch kit",
    hint: "Every social geometry, feed and story surfaces",
    templateSet: "Full social launch profile",
    kitProfileId: "full-launch",
    kitMode: "both",
    kitCopy: {
      title: "A launch that lands in every feed.",
      summary: "One campaign look rendered across every approved social geometry.",
      cta: "Explore the campaign",
    },
  },
  {
    id: "mkt-ebrochure",
    kind: "print",
    label: "e-Brochure",
    hint: "Multi-page collateral on the CMYK contract",
    templateSet: "e-Brochure master",
    printKind: "ebrochure",
  },
  {
    id: "mkt-case-study",
    kind: "print",
    label: "Case study",
    hint: "Campaign proof piece, fully editable",
    templateSet: "Case study master",
    printKind: "case-study",
  },
  {
    id: "mkt-campaign-deck",
    kind: "deck",
    label: "Campaign deck",
    hint: "Product-forward story, 10 slides, marketing look",
    templateSet: "Liquid Layer · R21 Media & Entertainment",
    archetypeId: "arch-product-pitch",
    lengthTarget: 10,
    stylePackId: "skin-s02",
    designRecipeId: "R21",
    industry: "Media / Entertainment",
  },
];

/**
 * Admin-level preset template sets. These are *not* available to sales
 * enablement users; an admin browsing the Sales workspace can start from them
 * on a sales user's behalf.
 */
const SALES_ADMIN_EXTRAS: readonly QuickCreatePreset[] = [
  {
    id: "sales-admin-industry-pitch",
    kind: "deck",
    label: "Industry pitch (admin preset)",
    hint: "Vertical-specific narrative on a premium look, 14 slides",
    templateSet: "Element System · R21 Media & Entertainment",
    archetypeId: "arch-product-pitch",
    lengthTarget: 14,
    stylePackId: "skin-s29",
    designRecipeId: "R21",
    industry: "Media / Entertainment",
  },
  {
    id: "sales-admin-msa",
    kind: "print",
    label: "MSA / partnership brief (admin preset)",
    hint: "Contract-grade partnership piece",
    templateSet: "MSA & partnership master",
    printKind: "msa-partnership",
  },
  {
    id: "sales-admin-ebrochure",
    kind: "print",
    label: "e-Brochure (admin preset)",
    hint: "Multi-page collateral on the CMYK contract",
    templateSet: "e-Brochure master",
    printKind: "ebrochure",
  },
];

/** Presets per persona. Admins get the full system surfaces instead. */
export const QUICK_CREATE_PRESETS: Record<string, readonly QuickCreatePreset[]> = {
  sales: SALES,
  marketing: MARKETING,
};

export function quickCreatePresets(
  personaId: string,
  opts?: { includeAdminPresets?: boolean },
): readonly QuickCreatePreset[] {
  const base = QUICK_CREATE_PRESETS[personaId] ?? [];
  if (personaId === "sales" && opts?.includeAdminPresets) return [...base, ...SALES_ADMIN_EXTRAS];
  return base;
}

/** True when the preset is an admin-only template set. */
export function isAdminPreset(preset: QuickCreatePreset): boolean {
  return SALES_ADMIN_EXTRAS.some((p) => p.id === preset.id);
}
