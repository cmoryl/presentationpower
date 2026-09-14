import { describe, expect, it } from "vitest";

import {
  AGENDA_BAND_TREATMENTS,
  agendaBandPalette,
  agendaBandTreatment,
  agendaDefaultConfig,
  normalizeAgendaConfig,
} from "../next-agenda";
import { contrastRatio } from "../wcag";

/**
 * Every approved band treatment must stay readable. A treatment pairs a fill
 * with the one ink that clears WCAG AA on it, so switching the look can never
 * make a printed programme unreadable.
 */
describe("agenda band treatments", () => {
  it("keeps AA contrast for copy on every fill", () => {
    for (const t of AGENDA_BAND_TREATMENTS) {
      const p = agendaBandPalette({ bandTreatment: t.id });
      for (const fill of [p.fillA, p.fillB]) {
        expect(contrastRatio(p.ink, fill), `${t.id} ink on ${fill}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        contrastRatio(p.parallelInk, p.parallel),
        `${t.id} parallel ink`,
      ).toBeGreaterThanOrEqual(4.5);
      // The rail is a graphic mark, so it only has to separate from both fills.
      expect(contrastRatio(p.rail, p.fillA), `${t.id} rail on fillA`).toBeGreaterThanOrEqual(3);
      expect(p.railW).toBeGreaterThan(0);
    }
  });

  it("defaults to the solid treatment and only accepts approved ids", () => {
    expect(agendaBandTreatment({})).toBe("solid");
    expect(agendaBandTreatment({ bandTreatment: "neon" })).toBe("solid");
    expect(agendaBandTreatment({ bandTreatment: "ink" })).toBe("ink");
  });

  it("round-trips through the config normalizer", () => {
    const base = agendaDefaultConfig("globallink");
    const kept = normalizeAgendaConfig({ ...base, bandTreatment: "ink" });
    expect(kept.bandTreatment).toBe("ink");
    const rejected = normalizeAgendaConfig({ ...base, bandTreatment: "sparkle" });
    expect(rejected.bandTreatment).toBe(base.bandTreatment);
  });
});
