// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearLondonOverrideCleared,
  markLondonOverrideCleared,
  mergeLondonOverrideMap,
} from "@/lib/next-london-override-clears";
import { clampStepRepeatConfig, DEFAULT_STEP_REPEAT } from "@/lib/next-london-step-repeat";

const QR_RECIPE = {
  ...DEFAULT_STEP_REPEAT,
  kind: "logo-qr" as const,
  qrData: "https://presentationpower.lovable.app/events/next/london",
};

describe("published override merge", () => {
  beforeEach(() => {
    for (const id of ["ldn-v42", "ldn-v43"]) clearLondonOverrideCleared("stepRepeat", id);
  });

  it("keeps a published wall recipe when this browser holds no local edit", () => {
    // The destructive bug: a fresh browser published an empty map and wiped the
    // QR wall recipe for everyone.
    const merged = mergeLondonOverrideMap("stepRepeat", { "ldn-v42": QR_RECIPE }, {});
    expect(merged["ldn-v42"]).toEqual(QR_RECIPE);
  });

  it("lets a local edit win over the published value", () => {
    const local = { ...QR_RECIPE, tileWidthMm: 320 };
    const merged = mergeLondonOverrideMap(
      "stepRepeat",
      { "ldn-v42": QR_RECIPE },
      {
        "ldn-v42": local,
      },
    );
    expect(merged["ldn-v42"]!.tileWidthMm).toBe(320);
  });

  it("drops a published value only after an explicit reset", () => {
    markLondonOverrideCleared("stepRepeat", "ldn-v42");
    expect(mergeLondonOverrideMap("stepRepeat", { "ldn-v42": QR_RECIPE }, {})).toEqual({});
    clearLondonOverrideCleared("stepRepeat", "ldn-v42");
    expect(mergeLondonOverrideMap("stepRepeat", { "ldn-v42": QR_RECIPE }, {})["ldn-v42"]).toEqual(
      QR_RECIPE,
    );
  });

  it("keeps other panels untouched by one reset", () => {
    markLondonOverrideCleared("stepRepeat", "ldn-v42");
    const merged = mergeLondonOverrideMap(
      "stepRepeat",
      { "ldn-v42": QR_RECIPE, "ldn-v43": QR_RECIPE },
      {},
    );
    expect(Object.keys(merged)).toEqual(["ldn-v43"]);
  });
});

describe("clampStepRepeatConfig", () => {
  it("restores QR fields missing from a legacy snapshot", () => {
    const legacy = { kind: "logo-qr", qrData: "https://example.com" } as never;
    const config = clampStepRepeatConfig(legacy);
    expect(config.kind).toBe("logo-qr");
    expect(config.qrData).toBe("https://example.com");
    expect(config.qrPlateShape).toBe(DEFAULT_STEP_REPEAT.qrPlateShape);
    expect(config.qrModuleShape).toBe(DEFAULT_STEP_REPEAT.qrModuleShape);
    expect(config.tileWidthMm).toBe(DEFAULT_STEP_REPEAT.tileWidthMm);
  });
});
