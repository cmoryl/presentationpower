import { useDeckStore, type TemplatePayload } from "@/lib/deck-store";
import { SHOWCASE_DECKS, type ShowcaseDeckDef } from "@/lib/showcase-decks";
import { DEMO_DIVISIONS, retargetPayload } from "@/lib/showcase-division";

export type RegenerateResult = {
  /** Saved demo copies replaced with the latest approved build. */
  refreshed: string[];
  /** Demo builds that had no saved copy, so nothing was touched. */
  skipped: number;
};

function nativeDivisionFor(def: ShowcaseDeckDef) {
  return (
    DEMO_DIVISIONS.find(
      (d) => def.divisionLabel.includes(d.name) || def.divisionLabel.includes(d.label),
    ) ?? DEMO_DIVISIONS[0]
  );
}

/** Every approved payload a demo can produce: its native division plus each
 *  retargeted division variant. Built lazily — callers only invoke on demand. */
export function approvedDemoPayloads(): TemplatePayload[] {
  const out: TemplatePayload[] = [];
  for (const def of SHOWCASE_DECKS) {
    const base = def.build();
    const home = nativeDivisionFor(def);
    out.push(base);
    for (const division of DEMO_DIVISIONS) {
      if (division.id === home.id) continue;
      out.push(retargetPayload(base, division));
    }
  }
  return out;
}

/**
 * Refresh every saved demo copy to the latest approved build in one pass.
 * A saved deck is considered a demo copy when its title matches an approved
 * demo payload title; that deck is deleted and re-created from the current
 * build so it picks up new imagery, backdrops and approval stamping.
 */
export function regenerateApprovedDemoCopies(): RegenerateResult {
  const payloads = approvedDemoPayloads();
  const refreshed: string[] = [];
  let skipped = 0;

  for (const payload of payloads) {
    const state = useDeckStore.getState();
    const existing = Object.values(state.decks).find((d) => d.title === payload.title);
    if (!existing) {
      skipped += 1;
      continue;
    }
    state.deleteDeck(existing.id);
    useDeckStore.getState().createDeckFromTemplate(payload);
    refreshed.push(payload.title);
  }

  return { refreshed, skipped };
}
