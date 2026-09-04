import { describe, expect, it } from "vitest";
import { canMoveDown, canMoveUp, moveDown, moveItem, moveUp } from "../reorder";
import { reorderOrbits, resolveOrbitLayout } from "../orbit-layout";

describe("moveItem", () => {
  it("moves an entry forward and back without losing rows", () => {
    const list = ["a", "b", "c", "d"];
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 1)).toEqual(["a", "d", "b", "c"]);
    expect(moveItem(list, 1, 1)).toEqual(list);
  });

  it("ignores out-of-range sources and clamps the target", () => {
    const list = ["a", "b", "c"];
    expect(moveItem(list, 9, 0)).toEqual(list);
    expect(moveItem(list, -1, 0)).toEqual(list);
    expect(moveItem(list, 0, 99)).toEqual(["b", "c", "a"]);
  });

  it("nudges up and down with guards at the edges", () => {
    const list = ["a", "b", "c"];
    expect(moveUp(list, 2)).toEqual(["a", "c", "b"]);
    expect(moveDown(list, 0)).toEqual(["b", "a", "c"]);
    expect(moveUp(list, 0)).toEqual(list);
    expect(moveDown(list, 2)).toEqual(list);
    expect(canMoveUp(0)).toBe(false);
    expect(canMoveDown(2, 3)).toBe(false);
    expect(canMoveUp(1) && canMoveDown(1, 3)).toBe(true);
  });
});

describe("reorderOrbits", () => {
  it("reflows content through the existing placements", () => {
    const items = [
      { label: "one", x: 10, y: 10, size: 1 },
      { label: "two", x: 50, y: 50, size: 1.2 },
      { label: "three", x: 80, y: 90, size: 0.8 },
    ];
    const next = reorderOrbits(items, 2, 0);
    expect(next.map((r) => r.label)).toEqual(["three", "one", "two"]);
    // Slots keep their coordinates; only the copy moves through them.
    expect(next.map((r) => [r.x, r.y, r.size])).toEqual([
      [10, 10, 1],
      [50, 50, 1.2],
      [80, 90, 0.8],
    ]);
  });

  it("leaves unplaced figures on their staggered defaults", () => {
    const items = [{ label: "a" }, { label: "b" }, { label: "c" }];
    const next = reorderOrbits(items, 0, 2);
    expect(next.map((r) => r.label)).toEqual(["b", "c", "a"]);
    expect(next.every((r) => r.x === undefined && r.y === undefined)).toBe(true);
    expect(resolveOrbitLayout(next)).toEqual(resolveOrbitLayout(items));
  });

  it("is a no-op for identical or invalid indexes", () => {
    const items = [{ label: "a" }, { label: "b" }];
    expect(reorderOrbits(items, 1, 1).map((r) => r.label)).toEqual(["a", "b"]);
    expect(reorderOrbits(items, 5, 0).map((r) => r.label)).toEqual(["a", "b"]);
  });
});
