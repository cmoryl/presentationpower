// Unit gate for the placement-fingerprint primitives that back the export
// placement verification sweep (scripts/verify-placement.mjs).
//
// The sweep itself needs a browser; these tests lock the comparison semantics
// the sweep depends on — zero tolerance, stable digests, and drift reporting —
// plus the presence of a committed baseline so CI has something to compare to.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  diffPlacement,
  fnv1a,
  formatDrift,
  placementDigest,
  serializePlacement,
  PLACEMENT_SELECTOR,
  type PlacementEntry,
} from "../export-placement";

const BASE: PlacementEntry[] = [
  { key: "0000:div[data-plane=ground]", x: 0, y: 0, w: 1920, h: 1080 },
  { key: "0001:h1", x: 120, y: 140, w: 1200, h: 180 },
  { key: "0002:div[data-stat-value=42]", x: 120, y: 420, w: 380, h: 220 },
];

describe("export placement fingerprints", () => {
  it("hashes deterministically and changes when geometry changes", () => {
    expect(placementDigest(BASE)).toBe(placementDigest([...BASE]));
    const moved = BASE.map((e) => (e.key.includes("h1") ? { ...e, y: e.y + 1 } : e));
    expect(placementDigest(moved)).not.toBe(placementDigest(BASE));
    expect(fnv1a("")).toHaveLength(8);
    expect(serializePlacement(BASE).split("\n")).toHaveLength(3);
  });

  it("reports zero drift for identical placement", () => {
    expect(diffPlacement(BASE, BASE)).toEqual([]);
  });

  it("flags sub-pixel drift at the default zero tolerance", () => {
    const nudged = BASE.map((e) => (e.key.includes("stat") ? { ...e, x: e.x + 0.01 } : e));
    const drift = diffPlacement(BASE, nudged);
    expect(drift).toHaveLength(1);
    expect(drift[0].field).toBe("x");
    expect(drift[0].deltaPx).toBeCloseTo(0.01, 4);
    // …and tolerates it only when a tolerance is asked for explicitly.
    expect(diffPlacement(BASE, nudged, 0.02)).toEqual([]);
  });

  it("flags elements that appear or vanish across a capture", () => {
    const missing = BASE.slice(0, 2);
    expect(diffPlacement(BASE, missing).map((d) => d.field)).toEqual(["missing"]);
    expect(
      diffPlacement(missing, BASE).map((d) => d.field),
    ).toEqual(["added"]);
  });

  it("measures every plane, copy, figure and media element", () => {
    for (const sel of [
      "[data-plane]",
      "[data-stat-value]",
      "[data-slide-logo]",
      "[data-print-page]",
      "h1",
      "p",
      "li",
      "img",
      "svg",
    ]) {
      expect(PLACEMENT_SELECTOR).toContain(sel);
    }
  });

  it("formats drift for a CI log", () => {
    const lines = formatDrift(diffPlacement(BASE, BASE.slice(0, 1)));
    expect(lines.join(" ")).toContain("missing");
  });

  it("ships a committed placement baseline for the sweep to compare against", () => {
    const file = resolve(process.cwd(), "tests/snapshots/export-placement.baseline.json");
    expect(existsSync(file), "run `npm run verify:placement:update` to create it").toBe(true);
    const json = JSON.parse(readFileSync(file, "utf8"));
    expect(json.version).toBe(1);
    expect(typeof json.entries).toBe("object");
    for (const [key, entry] of Object.entries<Record<string, unknown>>(json.entries)) {
      expect(key, `baseline key ${key} is not kind:target@pack@mode`).toMatch(
        /^(slide|print):[^@]+@[^@]+@(light|dark)$/,
      );
      expect(typeof entry.digest, `baseline ${key} has no digest`).toBe("string");
      expect(typeof entry.entries).toBe("number");
    }
  });
});
