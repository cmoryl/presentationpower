// GlobalLink NEXT pedestals — designer-supplied finals (15 × 36 in trim,
// 1/8 in bleed). One .ai holds all three artboards; the PDF holds all three
// pages. Both are served byte-for-byte.
import p1 from "@/assets/globallink-pedestals/pedestal-1.jpg.asset.json";
import p2 from "@/assets/globallink-pedestals/pedestal-2.jpg.asset.json";
import p3 from "@/assets/globallink-pedestals/pedestal-3.jpg.asset.json";
import ai from "@/assets/globallink-pedestals/pedestals.ai.asset.json";
import pdf from "@/assets/globallink-pedestals/pedestals.pdf.asset.json";
import type { NextRegistryRow } from "@/lib/next-event";

const SIZE = "15×36 in · 1/8 in bleed · supplied .ai master (all three artboards)";

const SET = [
  { code: "PD1", format: "Pedestal 1 · artboard 1", jpg: p1 },
  { code: "PD2", format: "Pedestal 2 · artboard 2", jpg: p2 },
  { code: "PD3", format: "Pedestal 3 · artboard 3", jpg: p3 },
];

export function globallinkPedestalRows(): NextRegistryRow[] {
  return SET.map((s) => ({
    divisionId: "globallink",
    group: "pillar-signage",
    code: s.code,
    format: s.format,
    size: SIZE,
    exampleUrl: s.jpg.url,
    downloadUrl: ai.url,
    secondaryUrl: pdf.url,
    secondaryLabel: "PDF · all three",
  }));
}
