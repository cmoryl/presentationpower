/**
 * Division signage templates — every division's starter sign set, taken from
 * the NEXT 2026 London kit. Each template is a real London item (same size,
 * bleed and gradient ground) re-branded for one division: white lockup, the
 * division accent as a light-end tint. Nothing is invented — sizes come from
 * the issued London schedule, and sign types London did not print (A-frames)
 * are not offered.
 */

import {
  LONDON_VENUE_ITEM_PANELS,
  type LondonPanel,
} from "@/lib/next-london-signage";
import { LONDON_DIVISION_ACCENTS } from "@/lib/next-london-division";
import { stepRepeatPanelDefault } from "@/lib/next-london-step-repeat";
import type { LondonArtOptions } from "@/lib/next-london-revise";

export type DivisionSignGroup = "doors" | "scenic" | "tabletop" | "booth";

export const DIVISION_SIGN_GROUP_LABEL: Record<DivisionSignGroup, string> = {
  doors: "Room door signs",
  scenic: "Scenic panels & banners",
  tabletop: "Table-tops",
  booth: "Booth & step-and-repeat",
};

type TemplateSpec = {
  group: DivisionSignGroup;
  /** London item the template is built from. */
  source: string;
  label: string;
  /** Replace a NEXTBrew-only ground with a house one. */
  style?: string;
  /** Keep door semantics (stronger accent weight) by keeping a door name. */
  name?: string;
};

export const DIVISION_SIGN_TEMPLATES: TemplateSpec[] = [
  { group: "doors", source: "ldn-v18", label: "Door branding · 840×2000", name: "DOOR BRANDING" },
  { group: "doors", source: "ldn-v21", label: "Door artwork · 1500×1500", name: "DOOR ARTWORK" },
  { group: "scenic", source: "ldn-v30", label: "Pillar wrap · 620×2500", name: "PILLAR WRAP" },
  { group: "scenic", source: "ldn-v26", label: "Corridor panel · 900×2020", name: "CORRIDOR PANEL" },
  { group: "scenic", source: "ldn-v13", label: "Banner vinyl · 4750×850", name: "BANNER VINYL" },
  { group: "tabletop", source: "ldn-v12", label: "Table-top square · 600×600", style: "01-beam-violet-aqua", name: "TABLE TOP SQUARE" },
  { group: "tabletop", source: "ldn-v10", label: "Table-top round · 900 dia", style: "09-dawn", name: "TABLE TOP ROUND" },
  { group: "booth", source: "ldn-v23", label: "Trade booth front · 1830×2440", name: "TRADE BOOTH FRONT" },
  { group: "booth", source: "ldn-v42", label: "Step & repeat wall · 3000×2400", name: "STEP & REPEAT WALL" },
];

export const DIVISION_SIGN_DIVISIONS = Object.keys(LONDON_DIVISION_ACCENTS);

export type DivisionSign = { group: DivisionSignGroup; label: string; panel: LondonPanel };

/** The full starter set for one division, or [] for an unknown division. */
export function divisionSigns(divisionId: string): DivisionSign[] {
  const accent = LONDON_DIVISION_ACCENTS[divisionId];
  if (!accent) return [];
  const out: DivisionSign[] = [];
  for (const t of DIVISION_SIGN_TEMPLATES) {
    const src = LONDON_VENUE_ITEM_PANELS.find((p) => p.id === t.source);
    if (!src) continue;
    const size = src.name.match(/ - [^-]+$/)?.[0] ?? "";
    out.push({
      group: t.group,
      label: t.label,
      panel: {
        ...src,
        id: `div-${divisionId}-${t.source.replace("ldn-", "")}`,
        room: accent.label.toUpperCase(),
        name: `${accent.label.toUpperCase()} ${t.name ?? src.name}${size}`,
        style: t.style ?? src.style,
        division: divisionId,
      },
    });
  }
  return out;
}

export function divisionSignFile(sign: DivisionSign): string {
  // Templates are never published revisions, so they always ship as rdraft-.
  return `rdraft-${sign.panel.id}`;
}

/**
 * Art options for a division sign. A step-and-repeat wall repeats the
 * division's own lockup (the London wall repeats the master mark).
 */
export function divisionSignArtOptions(sign: DivisionSign): LondonArtOptions {
  if (sign.group !== "booth" || !/STEP & REPEAT/.test(sign.panel.name)) return {};
  return {
    stepRepeat: { ...stepRepeatPanelDefault("ldn-v42"), familyId: sign.panel.division ?? "transperfect" },
  };
}
