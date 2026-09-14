import { describe, expect, it } from "vitest";

import {
  AGENDA_BAND_TREATMENTS,
  agendaBandPalette,
  agendaBandTreatment,
  agendaDefault,
  normalizeAgendaConfig,
} from "../next-agenda";
import { contrastRatio } from "../wcag";

/** contrastRatio parses rgb() only, so brand hex values are converted first. */
const rgbOf = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const ratio = (fg: string, bg: string) => contrastRatio(rgbOf(fg), rgbOf(bg));

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
        expect(ratio(p.ink, fill), `${t.id} ink on ${fill}`).toBeGreaterThanOrEqual(4.5);
      }
      expect(
        ratio(p.parallelInk, p.parallel),
        `${t.id} parallel ink`,
      ).toBeGreaterThanOrEqual(4.5);
      // The rail is a graphic mark, so it only has to separate from both fills.
      expect(ratio(p.rail, p.fillA), `${t.id} rail on fillA`).toBeGreaterThanOrEqual(3);
      expect(p.railW).toBeGreaterThan(0);
    }
  });

  it("defaults to the solid treatment and only accepts approved ids", () => {
    expect(agendaBandTreatment({})).toBe("solid");
    expect(agendaBandTreatment({ bandTreatment: "neon" })).toBe("solid");
    expect(agendaBandTreatment({ bandTreatment: "ink" })).toBe("ink");
  });

  it("round-trips through the config normalizer", () => {
    const base = agendaDefault("globallink");
    const kept = normalizeAgendaConfig({ ...base, bandTreatment: "ink" });
    expect(kept.bandTreatment).toBe("ink");
    const rejected = normalizeAgendaConfig({ ...base, bandTreatment: "sparkle" });
    expect(rejected.bandTreatment).toBe(base.bandTreatment);
  });
});
