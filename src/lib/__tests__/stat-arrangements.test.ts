// Guards the multi-stat arrangement engine: every preset must return exactly one
// cell per stat, degrade gracefully when it can't hold the set, and never place
// a cell outside its declared column bed.
import { describe, expect, it } from "vitest";
import {
  STAT_ARRANGEMENT_PRESETS,
  isStatArrangement,
  planStatArrangement,
  statArrangementGridStyle,
  statArrangementPreset,
  type StatArrangement,
} from "@/lib/stat-arrangements";

const ALL = STAT_ARRANGEMENT_PRESETS.map((p) => p.id);

describe("arrangement catalog", () => {
  it("has unique ids and authoring copy", () => {
    expect(new Set(ALL).size).toBe(ALL.length);
    const thin = STAT_ARRANGEMENT_PRESETS.filter(
      (p) => !p.label.trim() || p.description.trim().length < 12,
    );
    expect(thin.map((p) => p.id)).toEqual([]);
  });

  it("validates ids and falls back on unknown ones", () => {
    expect(isStatArrangement("bento")).toBe(true);
    expect(isStatArrangement("carousel")).toBe(false);
    expect(statArrangementPreset("nope" as StatArrangement).id).toBe("even");
  });
});

describe("plans", () => {
  it("returns one cell per stat for every preset and count", () => {
    for (const id of ALL) {
      for (let n = 1; n <= 8; n += 1) {
        const plan = planStatArrangement(id, n);
        expect(plan.cells.length, `${id} @ ${n}`).toBe(n);
        for (const c of plan.cells) {
          expect(c.col).toBeGreaterThanOrEqual(1);
          expect(c.col + c.span - 1).toBeLessThanOrEqual(plan.cols);
          expect(c.row).toBeGreaterThanOrEqual(1);
          expect(c.row).toBeLessThanOrEqual(plan.rows);
        }
      }
    }
  });

  it("degrades to an even grid when the set is too small", () => {
    expect(planStatArrangement("bento", 2).id).toBe("even");
    expect(planStatArrangement("hero-trio", 1).id).toBe("even");
  });

  it("gives the hero arrangement one lead figure and quiet satellites", () => {
    const plan = planStatArrangement("hero-trio", 4);
    expect(plan.cells[0].emphasis).toBe("hero");
    expect(plan.cells.slice(1).every((c) => c.emphasis === "quiet")).toBe(true);
  });

  it("steps each staircase cell lower than the last", () => {
    const plan = planStatArrangement("staircase", 3);
    expect(plan.cells.map((c) => c.offsetY)).toEqual([0, 46, 92]);
  });

  it("spans the bento lead cell across two columns", () => {
    const plan = planStatArrangement("bento", 5);
    expect(plan.cols).toBe(4);
    expect(plan.cells[0].span).toBe(2);
    expect(plan.cells.slice(1).every((c) => c.span === 1)).toBe(true);
  });

  it("keeps the ticker on a single row with dividers", () => {
    const plan = planStatArrangement("ticker", 4);
    expect(plan.rows).toBe(1);
    expect(plan.cells.filter((c) => c.leadingRule).length).toBe(3);
  });

  it("handles an empty set without dividing by zero", () => {
    const plan = planStatArrangement("staircase", 0);
    expect(plan.cells).toEqual([]);
    expect(statArrangementGridStyle(plan).gridTemplateRows).toContain("repeat(1");
  });

  it("respects a column ceiling", () => {
    expect(planStatArrangement("even", 6, { maxCols: 3 }).cols).toBe(3);
  });
});
