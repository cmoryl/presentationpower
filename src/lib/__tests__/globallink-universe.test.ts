import { describe, expect, it } from "vitest";

import {
  GLOBALLINK_CATEGORY_TAG,
  GLOBALLINK_UNIVERSE,
  globalLinkConnections,
  globalLinkNeighbours,
  globalLinkProduct,
} from "@/lib/globallink-universe";

describe("GlobalLink Universe", () => {
  it("records the twelve products with one central hub", () => {
    expect(GLOBALLINK_UNIVERSE).toHaveLength(12);
    expect(GLOBALLINK_UNIVERSE.filter((p) => p.hub).map((p) => p.name)).toEqual(["GlobalLink TMS"]);
  });

  it("joins every product to something that exists", () => {
    for (const p of GLOBALLINK_UNIVERSE) {
      expect(p.connects.length).toBeGreaterThan(0);
      for (const id of p.connects) expect(globalLinkProduct(id)).toBeTruthy();
      expect(p.connects).not.toContain(p.id);
    }
  });

  it("reads a connection from both ends", () => {
    for (const p of GLOBALLINK_UNIVERSE)
      for (const id of p.connects) expect(globalLinkNeighbours(id)).toContain(p.id);
  });

  it("lists each connection once", () => {
    const keys = globalLinkConnections().map((pair) => pair.slice().sort().join("|"));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every category an approved tag colour and every product copy", () => {
    for (const p of GLOBALLINK_UNIVERSE) {
      expect(GLOBALLINK_CATEGORY_TAG[p.category]).toBeTruthy();
      expect(p.tagline.length).toBeGreaterThan(8);
      expect(p.description.length).toBeGreaterThan(40);
    }
  });
});
