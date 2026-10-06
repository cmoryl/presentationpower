// Designer-supplied NEXT templates — the ONE place they join the registry.
// Add a supplied division file by appending its rows here; the assets listing,
// division tiles and template counts all read loadNextRegistry(), so nothing
// else needs to change for it to appear.
import type { NextRegistryRow } from "@/lib/next-event";
import { financePillarRows } from "@/lib/next-finance-pillars";
import { globallinkPedestalRows } from "@/lib/next-globallink-pedestals";

export function suppliedTemplateRows(): NextRegistryRow[] {
  return [...financePillarRows(), ...globallinkPedestalRows()];
}
