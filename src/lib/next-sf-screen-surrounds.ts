// San Francisco breakout-room screen surrounds — designer-supplied GlobalLink
// NEXT finals (Oct 2026). Served byte-for-byte; the red cut line in the files
// marks the screen opening.
import allJpg from "@/assets/sf-screen-surrounds/surround-all.jpg.asset.json";
import allAi from "@/assets/sf-screen-surrounds/surround-all.ai.asset.json";
import allPdf from "@/assets/sf-screen-surrounds/surround-all.pdf.asset.json";
import threeJpg from "@/assets/sf-screen-surrounds/surround-three.jpg.asset.json";
import threeAi from "@/assets/sf-screen-surrounds/surround-three.ai.asset.json";
import threePdf from "@/assets/sf-screen-surrounds/surround-three.pdf.asset.json";
import type { NextRegistryRow } from "@/lib/next-event";

export function sfScreenSurroundRows(): NextRegistryRow[] {
  return [
    {
      divisionId: "globallink",
      group: "event-signage",
      code: "SS1",
      format: "Screen surround · all sides (San Francisco)",
      size: "18.9 × 12.7 in as supplied · supplied .ai master",
      exampleUrl: allJpg.url,
      downloadUrl: allAi.url,
      secondaryUrl: allPdf.url,
      secondaryLabel: "PDF",
      liveSignId: "sf-surround-all",
    },
    {
      divisionId: "globallink",
      group: "event-signage",
      code: "SS2",
      format: "Screen surround · three sides (San Francisco)",
      size: "18.9 × 11.5 in as supplied · supplied .ai master",
      exampleUrl: threeJpg.url,
      downloadUrl: threeAi.url,
      secondaryUrl: threePdf.url,
      secondaryLabel: "PDF",
      liveSignId: "sf-surround-three",
    },
  ];
}
