// FinanceNEXT pillar set — the designer-supplied finals (23.5 × 72 in .ai
// masters), served byte-for-byte. They replace the Canva pillar and screen
// rows for Finance in the master template registry.
import welcomeJpg from "@/assets/finance-pillars/welcome.jpg.asset.json";
import welcomeAi from "@/assets/finance-pillars/welcome.ai.asset.json";
import riversideJpg from "@/assets/finance-pillars/riverside-ballroom.jpg.asset.json";
import riversideAi from "@/assets/finance-pillars/riverside-ballroom.ai.asset.json";
import liftJpg from "@/assets/finance-pillars/finance-pillar.jpg.asset.json";
import liftAi from "@/assets/finance-pillars/finance-pillar.ai.asset.json";
import bgJpg from "@/assets/finance-pillars/pillar-background.jpg.asset.json";
import bgAi from "@/assets/finance-pillars/pillar-background.ai.asset.json";
import type { NextRegistryRow } from "@/lib/next-event";

const SIZE = "23.5×72 in · supplied .ai master";

const SET = [
  { code: "P1", format: "Welcome Pillar", jpg: welcomeJpg, ai: welcomeAi },
  { code: "P2", format: "Riverside Ballroom Pillar", jpg: riversideJpg, ai: riversideAi },
  { code: "P3", format: "Lift Your Global Profile Pillar", jpg: liftJpg, ai: liftAi },
  { code: "P4", format: "Pillar Background (blank)", jpg: bgJpg, ai: bgAi },
];

export function financePillarRows(): NextRegistryRow[] {
  return SET.map((s) => ({
    divisionId: "finance",
    group: "pillar-signage",
    code: s.code,
    format: s.format,
    size: SIZE,
    exampleUrl: s.jpg.url,
    downloadUrl: s.ai.url,
  }));
}

/** Divisions whose pillars are supplied finals, so the live pillar studio cards are hidden. */
export const SUPPLIED_PILLAR_DIVISIONS = new Set(["finance"]);
