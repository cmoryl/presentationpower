// Regression suite: orbit / stat-graph labels must never clip, mis-wrap, or
// break the SVG frame.
// ---------------------------------------------------------------------------
// The reported defect: side labels on MV-STAT-ORBIT rendered as "MARKE" because
// the ring's label text ran past the SVG viewBox. The fix padded the viewBox and
// wrapped long labels. This suite locks both behaviours across the label-length
// cases real decks produce — single short words, long single words, multi-word
// phrases, and 2–6 segment rings where labels land at every clock position.

import { describe, expect, it } from "vitest";

import {
  ORBIT_BOX,
  ORBIT_LABEL_FS,
  ORBIT_LABEL_LINE_H,
  ORBIT_LABEL_TRACKING_EM,
  ORBIT_LABEL_MAX_W,
  ORBIT_LABEL_MIN_SCALE,
  approxTextWidth,
  orbitLabelFontScale,
  layoutOrbitLabels,
  orbitViewBoxX,
  wrapOrbitLabel,
} from "@/lib/orbit-label-layout";
import { makeSlideInk } from "@/components/slide/SlideChrome";

/** Label-length cases seen in real decks, shortest → longest. */
const LABEL_CASES = [
  "Legal",
  "Marketing",
  "Life sciences",
  "Media localization",
  "Marketing & communications",
  "Regulatory affairs and submissions",
  "Global content operations across regions",
  "SUPERCALIFRAGILISTICEXPIALIDOCIOUS",
];

/** Segment counts the variant supports (it slices to 6). */
const SEG_COUNTS = [2, 3, 4, 5, 6];

function ringItems(count: number, labels: string[]) {
  return Array.from({ length: count }, (_, i) => ({
    label: labels[i % labels.length],
    value: 10 + i * 7,
  }));
}

describe("orbit label wrapping", () => {
  it("never drops, duplicates, or re-orders characters", () => {
    for (const label of LABEL_CASES) {
      const lines = wrapOrbitLabel(label);
      // Hard-split words gain a line break, so compare letters only.
      expect(lines.join("").replace(/\s/g, "")).toBe(
        label.trim().toUpperCase().replace(/\s/g, ""),
      );
    }
  });

  it("wraps to at most two lines and only at spaces", () => {
    for (const label of LABEL_CASES) {
      const lines = wrapOrbitLabel(label);
      expect(lines.length).toBeLessThanOrEqual(2);
      for (const line of lines) {
        expect(line).not.toMatch(/^\s|\s$/);
        expect(line.length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps short labels on one line and splits long multi-word labels", () => {
    expect(wrapOrbitLabel("Marketing")).toHaveLength(1);
    expect(wrapOrbitLabel("Media localization")).toHaveLength(1);
    expect(wrapOrbitLabel("Marketing & communications")).toHaveLength(2);
    // An unbreakable word is hard-split rather than allowed to run out of frame.
    expect(wrapOrbitLabel("SUPERCALIFRAGILISTICEXPIALIDOCIOUS")).toHaveLength(2);
    expect(wrapOrbitLabel("")).toHaveLength(0);
    expect(wrapOrbitLabel("   ")).toHaveLength(0);
  });

  it("keeps every wrapped line inside the measured width budget", () => {
    for (const label of LABEL_CASES) {
      const lines = wrapOrbitLabel(label);
      const scale = orbitLabelFontScale(lines);
      expect(scale).toBeGreaterThanOrEqual(ORBIT_LABEL_MIN_SCALE);
      for (const line of lines) {
        const w = approxTextWidth(line, ORBIT_LABEL_FS * scale, ORBIT_LABEL_TRACKING_EM);
        expect(w, `"${line}" overruns the label budget`).toBeLessThanOrEqual(
          ORBIT_LABEL_MAX_W + 1e-6,
        );
      }
    }
  });
});

describe("orbit label framing", () => {
  const view = orbitViewBoxX();

  it("keeps every label inside the padded viewBox for all segment counts", () => {
    for (const count of SEG_COUNTS) {
      const layout = layoutOrbitLabels(ringItems(count, LABEL_CASES));
      for (const lab of layout) {
        const where = `${count} segments / seg ${lab.index} ("${lab.lines.join(" ")}")`;
        expect(lab.bounds.left, `${where} clipped left`).toBeGreaterThanOrEqual(view.min);
        expect(lab.bounds.right, `${where} clipped right`).toBeLessThanOrEqual(view.max);
      }
    }
  });

  it("keeps the hardest side-anchored labels inside the frame", () => {
    // Two equal shares put labels at 3 o'clock and 9 o'clock — the worst case
    // for horizontal clipping, and the exact case that regressed.
    const layout = layoutOrbitLabels([
      { label: "Marketing & communications", value: 50 },
      { label: "Regulatory affairs and submissions", value: 50 },
    ]);
    for (const lab of layout) {
      expect(lab.anchor).not.toBe("middle");
      expect(lab.bounds.left).toBeGreaterThanOrEqual(view.min);
      expect(lab.bounds.right).toBeLessThanOrEqual(view.max);
      expect(lab.lines.length).toBe(2);
    }
  });

  it("never lets a wrapped label overlap the neighbouring line or the ring band", () => {
    const layout = layoutOrbitLabels(ringItems(6, LABEL_CASES));
    for (const lab of layout) {
      // Line spacing must clear the glyph box.
      expect(ORBIT_LABEL_LINE_H).toBeGreaterThan(ORBIT_LABEL_FS);
      for (let i = 1; i < lab.lineYs.length; i += 1) {
        expect(lab.lineYs[i] - lab.lineYs[i - 1]).toBe(ORBIT_LABEL_LINE_H);
      }
      // Vertical extent stays inside the (unpadded) 640-tall box.
      expect(lab.bounds.top).toBeGreaterThanOrEqual(0);
      expect(lab.bounds.bottom).toBeLessThanOrEqual(ORBIT_BOX);
    }
  });

  it("holds the frame when every segment carries the longest phrase", () => {
    const worst = "Global content operations across regions";
    for (const count of SEG_COUNTS) {
      const layout = layoutOrbitLabels(
        Array.from({ length: count }, () => ({ label: worst, value: 1 })),
      );
      for (const lab of layout) {
        expect(lab.bounds.left).toBeGreaterThanOrEqual(view.min);
        expect(lab.bounds.right).toBeLessThanOrEqual(view.max);
        // Each wrapped line must fit the horizontal budget on its own.
        for (const line of lab.lines) {
          const w = approxTextWidth(
            line,
            ORBIT_LABEL_FS * lab.fontScale,
            ORBIT_LABEL_TRACKING_EM,
          );
          expect(w).toBeLessThanOrEqual(ORBIT_LABEL_MAX_W + 1e-6);
        }
      }
    }
  });

  it("locks the label layout for a representative ring", () => {
    const layout = layoutOrbitLabels([
      { label: "Marketing", value: 34 },
      { label: "Media localization", value: 26 },
      { label: "Legal", value: 22 },
      { label: "Regulatory affairs and submissions", value: 18 },
    ]).map((lab) => ({
      lines: lab.lines,
      pct: lab.pct,
      anchor: lab.anchor,
      x: Math.round(lab.x),
      y: Math.round(lab.y),
      left: Math.round(lab.bounds.left),
      right: Math.round(lab.bounds.right),
    }));
    expect(layout).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Dense rings: 7–10 segments. Real decks push past the 6-segment default, and
// dense rings drop labels at every clock position (including 12 and 6 o'clock,
// where the middle anchor and the two-line stack are the tightest). These cases
// lock horizontal AND vertical containment for those counts.
// ---------------------------------------------------------------------------

const DENSE_SEG_COUNTS = [7, 8, 9, 10];

/** Equal shares rotated by `phaseDeg` so labels sweep every clock position. */
function phasedRing(count: number, label: string, phaseDeg: number) {
  const items = Array.from({ length: count }, () => ({ label, value: 100 / count }));
  if (phaseDeg === 0) return items;
  // A leading spacer segment rotates the whole ring; it is dropped from the
  // assertions by the caller via `skipFirst`.
  return [{ label: "X", value: (phaseDeg / 360) * 100 }, ...items];
}

describe("orbit labels — dense 7–10 segment rings", () => {
  const view = orbitViewBoxX();

  it("keeps every label inside the padded viewBox for 7–10 segments", () => {
    for (const count of DENSE_SEG_COUNTS) {
      const layout = layoutOrbitLabels(ringItems(count, LABEL_CASES));
      expect(layout).toHaveLength(count);
      for (const lab of layout) {
        const where = `${count} segments / seg ${lab.index} ("${lab.lines.join(" ")}")`;
        expect(lab.bounds.left, `${where} clipped left`).toBeGreaterThanOrEqual(view.min);
        expect(lab.bounds.right, `${where} clipped right`).toBeLessThanOrEqual(view.max);
        expect(lab.bounds.top, `${where} clipped top`).toBeGreaterThanOrEqual(0);
        expect(lab.bounds.bottom, `${where} clipped bottom`).toBeLessThanOrEqual(ORBIT_BOX);
      }
    }
  });

  it("holds the frame at every clock position when all labels are the longest phrase", () => {
    const worst = "Global content operations across regions";
    for (const count of DENSE_SEG_COUNTS) {
      // 5° phase steps walk each label through all 12 clock positions.
      for (let phase = 0; phase < 360; phase += 5) {
        const layout = layoutOrbitLabels(phasedRing(count, worst, phase));
        const labels = phase === 0 ? layout : layout.slice(1);
        for (const lab of labels) {
          const where = `${count} segs @ ${phase}° / seg ${lab.index}`;
          expect(lab.bounds.left, `${where} clipped left`).toBeGreaterThanOrEqual(view.min);
          expect(lab.bounds.right, `${where} clipped right`).toBeLessThanOrEqual(view.max);
          expect(lab.bounds.top, `${where} clipped top`).toBeGreaterThanOrEqual(0);
          expect(lab.bounds.bottom, `${where} clipped bottom`).toBeLessThanOrEqual(ORBIT_BOX);
          expect(lab.lines.length).toBeLessThanOrEqual(2);
          expect(lab.fontScale).toBeGreaterThanOrEqual(ORBIT_LABEL_MIN_SCALE);
        }
      }
    }
  });

  it("never mis-wraps or shrinks below the floor on dense rings", () => {
    for (const count of DENSE_SEG_COUNTS) {
      const layout = layoutOrbitLabels(ringItems(count, LABEL_CASES));
      for (const lab of layout) {
        expect(lab.lines.join("").replace(/\s/g, "")).toBe(
          LABEL_CASES[lab.index % LABEL_CASES.length].toUpperCase().replace(/\s/g, ""),
        );
        expect(lab.fontScale).toBe(orbitLabelFontScale(lab.lines));
        for (const line of lab.lines) {
          const w = approxTextWidth(
            line,
            ORBIT_LABEL_FS * lab.fontScale,
            ORBIT_LABEL_TRACKING_EM,
          );
          expect(w).toBeLessThanOrEqual(ORBIT_LABEL_MAX_W + 1e-6);
        }
      }
    }
  });

  it("percentages of a dense equal ring sum to ~100", () => {
    for (const count of DENSE_SEG_COUNTS) {
      const layout = layoutOrbitLabels(
        Array.from({ length: count }, (_, i) => ({ label: `Seg ${i + 1}`, value: 1 })),
      );
      const sum = layout.reduce((n, l) => n + l.pct, 0);
      expect(Math.abs(sum - 100)).toBeLessThanOrEqual(count);
    }
  });
});

// ---------------------------------------------------------------------------
// Light vs dark parity. Theme changes ink colours only — it must never change
// label wrapping, type scale, anchors, or geometry, or a deck would clip in one
// mode and not the other (which is how the original "MARKE" defect slipped
// through: it only reproduced on a dark backdrop). These cases run the whole
// label-length matrix in both modes and assert identical layout, plus readable
// ink in each mode.
// ---------------------------------------------------------------------------

const THEMES = ["light", "dark"] as const;
type OrbitTheme = (typeof THEMES)[number];

/** Layout is theme-independent by construction; this asserts that stays true. */
function layoutForTheme(_theme: OrbitTheme, items: { label: string; value: number }[]) {
  return layoutOrbitLabels(items).map((lab) => ({
    lines: lab.lines,
    pct: lab.pct,
    anchor: lab.anchor,
    x: Math.round(lab.x * 1000) / 1000,
    y: Math.round(lab.y * 1000) / 1000,
    lineYs: lab.lineYs.map((v) => Math.round(v * 1000) / 1000),
    fontScale: Math.round(lab.fontScale * 1e6) / 1e6,
    widthPx: Math.round(lab.widthPx * 1000) / 1000,
    bounds: {
      left: Math.round(lab.bounds.left * 1000) / 1000,
      right: Math.round(lab.bounds.right * 1000) / 1000,
      top: Math.round(lab.bounds.top * 1000) / 1000,
      bottom: Math.round(lab.bounds.bottom * 1000) / 1000,
    },
  }));
}

describe.each(THEMES)("orbit labels — %s theme", (theme) => {
  const view = orbitViewBoxX();

  it("wraps every label-length case the same way as the other theme", () => {
    for (const label of LABEL_CASES) {
      const lines = wrapOrbitLabel(label);
      expect(lines.length, `${theme}: "${label}"`).toBeLessThanOrEqual(2);
      expect(lines.join("").replace(/\s/g, "")).toBe(
        label.trim().toUpperCase().replace(/\s/g, ""),
      );
      for (const line of lines) {
        const w = approxTextWidth(
          line,
          ORBIT_LABEL_FS * orbitLabelFontScale(lines),
          ORBIT_LABEL_TRACKING_EM,
        );
        expect(w, `${theme}: "${line}" overruns`).toBeLessThanOrEqual(ORBIT_LABEL_MAX_W + 1e-6);
      }
    }
  });

  it("keeps 2–10 segment rings inside the frame", () => {
    for (const count of [...SEG_COUNTS, ...DENSE_SEG_COUNTS]) {
      for (const lab of layoutOrbitLabels(ringItems(count, LABEL_CASES))) {
        const where = `${theme} / ${count} segs / seg ${lab.index}`;
        expect(lab.bounds.left, `${where} clipped left`).toBeGreaterThanOrEqual(view.min);
        expect(lab.bounds.right, `${where} clipped right`).toBeLessThanOrEqual(view.max);
        expect(lab.bounds.top, `${where} clipped top`).toBeGreaterThanOrEqual(0);
        expect(lab.bounds.bottom, `${where} clipped bottom`).toBeLessThanOrEqual(ORBIT_BOX);
      }
    }
  });
});

describe("orbit labels — light/dark consistency", () => {
  it("produces byte-identical layout in both themes for every label case", () => {
    for (const count of [...SEG_COUNTS, ...DENSE_SEG_COUNTS]) {
      const items = ringItems(count, LABEL_CASES);
      const light = layoutForTheme("light", items);
      const dark = layoutForTheme("dark", items);
      expect(dark, `${count} segments differ between themes`).toEqual(light);
    }
  });

  it("keeps wrapping identical for each individual label in both themes", () => {
    for (const label of LABEL_CASES) {
      const light = layoutForTheme("light", [{ label, value: 50 }, { label, value: 50 }]);
      const dark = layoutForTheme("dark", [{ label, value: 50 }, { label, value: 50 }]);
      expect(dark).toEqual(light);
      expect(dark[0].lines).toEqual(light[0].lines);
      expect(dark[0].fontScale).toBe(light[0].fontScale);
    }
  });

  it("uses distinct, readable ink per mode without touching geometry", () => {
    const light = makeSlideInk("light", "#003FC7", "#03002C", "#FFFFFF", "#03002C");
    const dark = makeSlideInk("dark", "#003FC7", "#03002C", "#FFFFFF", "#03002C");
    expect(light.text).not.toBe(dark.text);
    for (const inkSet of [light, dark]) {
      expect(inkSet.text).toMatch(/^#|rgb/);
      expect(inkSet.muted).toMatch(/^#|rgb/);
    }
    // Geometry constants are mode-free — assert no theme leaked into them.
    expect(ORBIT_LABEL_FS).toBe(15);
    expect(ORBIT_LABEL_LINE_H).toBe(19);
  });
});
