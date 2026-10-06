// Designer-supplied NEXT templates — the ONE place they join the registry.
// Add a supplied division file by appending its rows here; the assets listing,
// division tiles and template counts all read loadNextRegistry(), so nothing
// else needs to change for it to appear.
import type { NextRegistryRow } from "@/lib/next-event";
import { financePillarRows } from "@/lib/next-finance-pillars";
import { globallinkPedestalRows } from "@/lib/next-globallink-pedestals";
import financeDeskPreview from "@/assets/finance-pillars/reg-desk.jpg.asset.json";

/** Supplied division desk fronts (edited live in the sign editor). */
function deskRows(): NextRegistryRow[] {
  return [
    {
      divisionId: "finance",
      group: "event-signage",
      code: "D1",
      format: "Registration desk front",
      size: "71.25 × 40.5 in",
      exampleUrl: financeDeskPreview.url,
      liveSignId: "finance-reg-desk",
    },
  ];
}

export function suppliedTemplateRows(): NextRegistryRow[] {
  return [...financePillarRows(), ...globallinkPedestalRows(), ...deskRows()];
}
