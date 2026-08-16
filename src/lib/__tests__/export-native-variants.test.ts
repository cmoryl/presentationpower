// Keeps NATIVE_EMITTER_VARIANT_IDS in lockstep with the `renderAdvancedVariant`
// switch in pptx-export.ts. If a native renderer is added or removed without
// updating the list, slides silently lose (or needlessly gain) the design-exact
// graphic plate path — which is exactly the regression this guards.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  NATIVE_EMITTER_VARIANT_IDS,
  hasNativeVariantEmitter,
  needsGraphicPlate,
} from "../export-native-variants";

function switchCaseIds(): string[] {
  const src = readFileSync(resolve(process.cwd(), "src/lib/pptx-export.ts"), "utf8");
  const start = src.indexOf("function renderAdvancedVariant(");
  expect(start).toBeGreaterThan(-1);
  const end = src.indexOf("\nfunction drawTitle(", start);
  const seg = src.slice(start, end > start ? end : undefined);
  const ids = new Set<string>();
  for (const m of seg.matchAll(/case "(MV-[A-Z0-9-]+)"/g)) ids.add(m[1]!);
  return [...ids];
}

describe("native variant coverage", () => {
  it("matches the renderAdvancedVariant switch exactly", () => {
    expect([...NATIVE_EMITTER_VARIANT_IDS].sort()).toEqual(switchCaseIds().sort());
  });

  it("plates only variants without a native emitter (editable-first)", () => {
    expect(hasNativeVariantEmitter("MV-VIZ-SANKEY")).toBe(true);
    expect(hasNativeVariantEmitter("MV-FLYWHEEL")).toBe(true);
    expect(needsGraphicPlate("MV-INFO-HUB-SATELLITES")).toBe(true);
    expect(needsGraphicPlate("MV-LOC-WORLD-PINS")).toBe(true);
    // Anything with a native emitter must stay fully editable — no fused plate.
    expect(needsGraphicPlate("MV-FLYWHEEL")).toBe(false);
    expect(needsGraphicPlate("MV-OP-COVER-SPLIT")).toBe(false);
    expect(needsGraphicPlate("MV-BENTO-5")).toBe(false);
    expect(needsGraphicPlate("MV-VIZ-SANKEY")).toBe(false);
    expect(needsGraphicPlate(null)).toBe(false);
  });
});

