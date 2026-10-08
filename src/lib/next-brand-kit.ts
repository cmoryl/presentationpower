// Master NEXT event brand kit — assembled ONLY from existing registries.
//
// Logos, division colours, type and rules come from `next-brand-guide.ts`;
// sign templates come from `loadNextRegistry()` (which includes every
// designer-supplied template); digital formats from `social-formats.ts`.
// Nothing here restates a fact, so the page, the share view and the download
// pack always match the rest of the app.
//
// Division colours are an event-only exception to the enterprise palette rule:
// they appear on NEXT event material only.

import {
  NEXT_APPLICATION_RULES,
  NEXT_CORE_COLORS,
  NEXT_DIVISIONS,
  NEXT_GUIDE_UPDATED,
  NEXT_GUIDE_VERSION,
  NEXT_LOGO_RULES,
  NEXT_MARKS,
  NEXT_TYPOGRAPHY,
} from "@/lib/next-brand-guide";
import { loadNextRegistry, type NextRegistryRow } from "@/lib/next-event";
import { SOCIAL_FORMATS } from "@/lib/social-formats";

export const BRAND_KIT_VERSION = `${NEXT_GUIDE_VERSION}-kit`;
export const BRAND_KIT_UPDATED = NEXT_GUIDE_UPDATED;

export const BRAND_KIT_COLOUR_NOTE =
  "NEXT division colours are for NEXT event material only. Everywhere else, divisions use the enterprise palette.";

export const BRAND_KIT_PRINT_NOTES = [
  "RGB is the house colour space. Supplied CMYK files are kept exactly as supplied; nothing is converted.",
  "Every print file carries ⅛ in bleed. Where a supplied file has none, the background is stretched ⅛ in past the trim.",
  "Body text is 100K on print. Pantone builds are confirmed with the printer, not matched from the hex.",
  "Guides (TV boxes, step lines, door gaps) never print.",
];

export { NEXT_APPLICATION_RULES, NEXT_CORE_COLORS, NEXT_DIVISIONS, NEXT_LOGO_RULES, NEXT_MARKS, NEXT_TYPOGRAPHY };

/** Sign template families shown in the kit, matched on the template name. */
export const TEMPLATE_FAMILIES: { id: string; label: string; match: RegExp }[] = [
  { id: "pillars", label: "Pillars", match: /pillar/i },
  { id: "desks", label: "Registration desks", match: /desk/i },
  { id: "kiosks", label: "Kiosks", match: /kiosk/i },
  { id: "demo-booths", label: "Demo booths", match: /demo booth/i },
  { id: "lifts", label: "Lift door wraps", match: /lift/i },
  { id: "stairs", label: "Stair wraps", match: /stair/i },
  { id: "surrounds", label: "Screen surrounds", match: /surround/i },
  { id: "pedestals", label: "Pedestals", match: /pedestal/i },
];

export type KitTemplate = NextRegistryRow & { divisionName: string };
export type KitFamily = { id: string; label: string; templates: KitTemplate[] };

export async function loadKitFamilies(): Promise<KitFamily[]> {
  const rows = await loadNextRegistry();
  const name = (id: string) => NEXT_DIVISIONS.find((d) => d.id === id)?.name ?? id;
  return TEMPLATE_FAMILIES.map((f) => ({
    id: f.id,
    label: f.label,
    templates: rows
      .filter((r) => f.match.test(r.format))
      .map((r) => ({ ...r, divisionName: name(r.divisionId) })),
  })).filter((f) => f.templates.length > 0);
}

export const KIT_DIGITAL_FORMATS = SOCIAL_FORMATS.filter((f) =>
  ["social", "screen", "email"].includes(f.category),
);

/** Fixed links to the digital and slide areas that already exist. */
export const KIT_DIGITAL_LINKS = [
  { label: "Agenda boards", to: "/events/next/agendas" as const },
  { label: "Delegate guide", to: "/events/next/guide" as const },
  { label: "Venue playbook", to: "/events/next/playbook" as const },
];

/** New-city checklist: process rules, never event facts. */
export const NEW_CITY_CHECKLIST = [
  { step: "Copy the look", body: "Start from these logos, colours and templates. Don't redraw a lockup or pick new colours." },
  { step: "Measure from the site survey", body: "Sign sizes come only from the venue survey, never from artwork sizes or guesses." },
  { step: "Fill in facts from the event record", body: "Dates, venue, rooms and URLs come from the event page. Never type them onto artwork or invent them." },
  { step: "Read the lessons first", body: "Check the event lessons and decisions before planning signage, and add a lesson when something goes wrong." },
  { step: "Check before print", body: "Every print file goes through the print checks and a printer proof before production." },
];

export function paletteCsv(): string {
  const head = "Division,Hex,RGB,CMYK,Pantone";
  const lines = NEXT_DIVISIONS.map((d) => `"${d.name}",${d.accent},"${d.rgb}","${d.cmyk}","${d.pantone}"`);
  return [head, ...lines].join("\n");
}

export function paletteJson(): string {
  return JSON.stringify(
    {
      source: "TransPerfect Element — Master NEXT event brand kit",
      note: BRAND_KIT_COLOUR_NOTE,
      core: NEXT_CORE_COLORS,
      divisions: NEXT_DIVISIONS.map((d) => ({ id: d.id, name: d.name, hex: d.accent, rgb: d.rgb, cmyk: d.cmyk, pantone: d.pantone })),
    },
    null,
    2,
  );
}

export function canvaCopyValues(): string {
  return [
    "Canva brand kit — values to copy in",
    "",
    "Colours:",
    ...NEXT_CORE_COLORS.map((c) => `  ${c.name}: ${c.hex}`),
    ...NEXT_DIVISIONS.map((d) => `  ${d.name}: ${d.accent}`),
    "",
    `Headings & body: ${NEXT_TYPOGRAPHY.headlineFont} (upload Geist-Regular.ttf and Geist-Bold.ttf from the pack)`,
    "Logos: upload the SVGs from the logos folder of the pack.",
  ].join("\n");
}
