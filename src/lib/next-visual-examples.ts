import { loadNextRegistry } from "@/lib/next-event";

export const NEXT_EXAMPLE_EVENTS = ["london-2026", "san-francisco"] as const;
export const NEXT_EXAMPLE_AREAS: Record<string, string> = {
  "registration-wall": "Arrival & registration",
  "door-or-screen-header": "Entrances & wayfinding",
  "room-backdrop": "Room backdrops",
  "stage-set": "Stage & keynotes",
  lectern: "Lecterns",
  "pillar-totem": "Pillars",
  "kiosk-booth": "Booths & kiosks",
  "digital-screen": "Screens & sessions",
  "lanyard-badge": "Badges & lanyards",
  "printed-collateral": "Print & merchandise",
  "other-sign": "Other event touchpoints",
};

export interface NextVisualExample {
  id: string;
  title: string;
  area: string;
  division: string;
  event: string;
  kind: "photo" | "artwork";
  path?: string;
  thumbPath?: string;
  src?: string;
  note: string;
}

/** Never request private photos from a partner-share gallery. */
export function nextExamplesAllowPhotos(shared: boolean): boolean { return !shared; }

export async function loadNextArtworkExamples(): Promise<NextVisualExample[]> {
  const rows = await loadNextRegistry();
  const examples: NextVisualExample[] = rows.filter(r => !!r.exampleUrl).map((r, i) => ({
    id: `artwork-${r.divisionId}-${r.code}-${i}`,
    title: `${r.code} · ${r.format}`,
    area: r.group === "asset-subsection" ? "Social & email" : /pillar/i.test(r.format) ? "Pillars" : /desk/i.test(r.format) ? "Arrival & registration" : /kiosk|booth/i.test(r.format) ? "Booths & kiosks" : /surround/i.test(r.format) ? "Screens & sessions" : r.group === "sponsorship-deck" ? "Slides & sponsorship" : "Other event touchpoints",
    division: r.divisionId,
    event: "Master artwork",
    kind: "artwork" as const,
    src: r.exampleUrl,
    note: `${r.size} · Existing artwork preview, not a photograph or proof of installation.`,
  }));
  const areas = [...new Set(examples.map(e => e.area))];
  const groups = areas.map(a => examples.filter(e => e.area === a));
  const balanced: NextVisualExample[] = [];
  for (let i = 0; i < Math.max(0, ...groups.map(g => g.length)); i++) for (const g of groups) if (g[i]) balanced.push(g[i]);
  return balanced;
}