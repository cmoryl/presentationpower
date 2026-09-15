import { describe, expect, it } from "vitest";

import {
  AGENDA_BAND_TREATMENTS,
  agendaBandComposite,
  agendaBandPalette,
  roundedRectPath,
} from "../next-agenda";
import { contrastRatio } from "../wcag";

const rgbOf = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};
const ratio = (fg: string, bg: string) => contrastRatio(rgbOf(fg), rgbOf(bg));

/** The grounds a band can sit on: the darkest and lightest approved faces. */
const GROUNDS = ["#03002C", "#EEF1F7", "#003FC7", "#A1FBF9"];

describe("agenda programme bands read through to the ground", () => {
  it("carries a translucent fill and a curved edge on every treatment", () => {
    for (const t of AGENDA_BAND_TREATMENTS) {
      const p = agendaBandPalette({ bandTreatment: t.id });
      // A veil fades to nothing down the band, so it starts lighter than a flat
      // treatment; every treatment still has to let the ground read through.
      const floor = p.fade ? 0.5 : 0.75;
      expect(p.fillAlpha, `${t.id} fill alpha`).toBeGreaterThan(floor);
      expect(p.fillAlpha, `${t.id} fill alpha`).toBeLessThan(1);
      expect(p.parallelAlpha, `${t.id} parallel alpha`).toBeGreaterThan(floor);
      expect(p.parallelAlpha, `${t.id} parallel alpha`).toBeLessThan(1);
      expect(p.radius, `${t.id} radius`).toBeGreaterThan(0);
    }
  });

  it("keeps copy readable once the fill is composited over any ground", () => {
    for (const t of AGENDA_BAND_TREATMENTS) {
      const p = agendaBandPalette({ bandTreatment: t.id });
      for (const ground of GROUNDS) {
        for (const fill of [p.fillA, p.fillB]) {
          const seen = agendaBandComposite(fill, p.fillAlpha, ground);
          expect(ratio(p.ink, seen), `${t.id} ink on ${fill} over ${ground}`).toBeGreaterThanOrEqual(
            4.5,
          );
        }
        const card = agendaBandComposite(p.parallel, p.parallelAlpha, ground);
        expect(ratio(p.parallelInk, card), `${t.id} card ink over ${ground}`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it("draws a rounded plate path that closes on itself", () => {
    const path = roundedRectPath(40, 20, 3);
    expect(path.startsWith("M")).toBe(true);
    expect(path.trim().endsWith("Z")).toBe(true);
    // Four arcs, one per corner, so no corner prints square.
    expect((path.match(/A/g) ?? []).length).toBe(4);
  });
});
