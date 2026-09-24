import { afterEach, describe, expect, it } from "vitest";
import {
  QEII_FLOOR_VECTORS,
  qeiiFloorSource,
  qeiiFloorVector,
  qeiiFloorVectors,
  qeiiVenueFloorsVersion,
  setQeiiVenueFloors,
} from "@/lib/next-london-qeii-vectors";

afterEach(() => setQeiiVenueFloors(null));

describe("QEII floors from the venue library", () => {
  it("draws from the built-in copy when the library has nothing", () => {
    expect(qeiiFloorSource("fourth")).toBe("bundled");
    expect(qeiiFloorVectors()).toEqual(QEII_FLOOR_VECTORS);
  });

  it("a venue-library floor wins; missing floors fall back to the built-in copy", () => {
    const fourth = QEII_FLOOR_VECTORS.find((f) => f.id === "fourth")!;
    const v0 = qeiiVenueFloorsVersion();
    setQeiiVenueFloors([{ ...fourth, title: "Fourth (library)" }]);
    expect(qeiiVenueFloorsVersion()).toBe(v0 + 1);
    expect(qeiiFloorVector("fourth")?.title).toBe("Fourth (library)");
    expect(qeiiFloorSource("fourth")).toBe("venue-library");
    expect(qeiiFloorVector("second")).toBe(QEII_FLOOR_VECTORS.find((f) => f.id === "second"));
    expect(qeiiFloorVectors().map((f) => f.id)).toEqual(QEII_FLOOR_VECTORS.map((f) => f.id));
  });

  it("a library copy made from the built-in floors draws shape for shape the same", () => {
    const copy = JSON.parse(JSON.stringify(QEII_FLOOR_VECTORS));
    setQeiiVenueFloors(copy);
    for (const f of QEII_FLOOR_VECTORS) expect(qeiiFloorVector(f.id)).toEqual(f);
  });
});
