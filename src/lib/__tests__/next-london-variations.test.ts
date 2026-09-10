// @vitest-environment jsdom
// Copies of a sign: a new version must be its own asset, sit next to the sign it
// came from, and never overwrite the original.

import { beforeEach, describe, expect, it } from "vitest";

import {
  createLondonVariation,
  londonVariationsOf,
  removeLondonVariation,
  renameLondonVariation,
  setLondonVariationStyle,
  withLondonVariations,
} from "@/lib/next-london-variations";
import { LONDON_PANELS, type LondonPanel } from "@/lib/next-london-signage";

const source = (): LondonPanel => LONDON_PANELS[0]!;

describe("London signage variations", () => {
  beforeEach(() => {
    for (const v of londonVariationsOf(source().id)) removeLondonVariation(v.id);
  });

  it("copies a sign as its own panel, next to the original", () => {
    const made = createLondonVariation(source());
    expect(made?.label).toBe("Version B");
    const list = withLondonVariations([source()]);
    expect(list).toHaveLength(2);
    expect(list[0]!.id).toBe(source().id);
    expect(list[1]!.id).toBe(made!.id);
    expect(list[1]!.trimW).toBe(source().trimW);
    expect(list[1]!.name).toContain("VERSION B");
  });

  it("numbers further versions and keeps its own treatment and name", () => {
    const b = createLondonVariation(source())!;
    const c = createLondonVariation(source())!;
    expect(c.label).toBe("Version C");
    setLondonVariationStyle(c.id, "09-dawn");
    renameLondonVariation(b.id, "REGISTRATION PILLAR — dark run");
    const list = withLondonVariations([source()]);
    expect(list.find((p) => p.id === c.id)!.style).toBe("09-dawn");
    expect(list.find((p) => p.id === b.id)!.name).toBe("REGISTRATION PILLAR — dark run");
    expect(list.find((p) => p.id === source().id)!.style).toBe(source().style);
  });

  it("deleting a copy leaves the original in place", () => {
    const b = createLondonVariation(source())!;
    removeLondonVariation(b.id);
    expect(londonVariationsOf(source().id)).toHaveLength(0);
    expect(withLondonVariations([source()])).toHaveLength(1);
  });

  it("never hands a new copy an id another version already uses", () => {
    const b = createLondonVariation(source())!;
    const c = createLondonVariation(source())!;
    removeLondonVariation(b.id);
    const next = createLondonVariation(source())!;
    expect(next.id).not.toBe(c.id);
    const list = withLondonVariations([source()]);
    expect(new Set(list.map((p) => p.id)).size).toBe(list.length);
  });

  it("a resized copy keeps its own board and leaves the original measured as it was", () => {
    const b = createLondonVariation(source())!;
    setLondonBoardSize({ ...source(), id: b.id }, { trimW: source().trimW - 120 });
    const list = applyLondonBoardSizes(withLondonVariations([source()]), londonBoardSizes());
    expect(list.find((p) => p.id === b.id)!.trimW).toBeCloseTo(source().trimW - 120, 2);
    expect(list.find((p) => p.id === source().id)!.trimW).toBeCloseTo(source().trimW, 2);
    resetLondonBoardSize(b.id);
  });

  it("a copy already in the published set is listed once, with its current name", () => {
    const b = createLondonVariation(source())!;
    renameLondonVariation(b.id, "REGISTRATION PILLAR — second run");
    // What a publish then a reload looks like: the copy arrives inside the panel
    // set in force, and the local record is still here.
    const published: LondonPanel[] = [source(), { ...source(), id: b.id, name: b.name }];
    const list = withLondonVariations(published);
    expect(list).toHaveLength(2);
    expect(list.filter((p) => p.id === b.id)).toHaveLength(1);
    expect(list.find((p) => p.id === b.id)!.name).toBe("REGISTRATION PILLAR — second run");
  });

  it("a deleted copy's own edits do not carry into the next copy of that sign", () => {
    const b = createLondonVariation(source())!;
    setLondonBoardSize({ ...source(), id: b.id }, { trimW: source().trimW - 200 });
    setLondonLogoPlacement(b.id, { scale: 1.4 });
    removeLondonVariation(b.id);
    const next = createLondonVariation(source())!;
    expect(londonBoardSizes()[next.id]).toBeUndefined();
    expect(londonLogoPlacements()[next.id]).toBeUndefined();
  });
});
