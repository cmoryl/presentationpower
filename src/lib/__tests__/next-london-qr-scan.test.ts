import { describe, expect, it } from "vitest";

import { LONDON_PANELS } from "@/lib/next-london-signage";
import {
  DEFAULT_STEP_REPEAT,
  stepRepeatPlan,
  stepRepeatQrScanBlockers,
  stepRepeatWarnings,
} from "@/lib/next-london-step-repeat";

const wall = LONDON_PANELS.find((p) => p.name.toUpperCase().includes("STEP"))!;

const plan = (patch: Partial<typeof DEFAULT_STEP_REPEAT>) =>
  stepRepeatPlan(wall, { ...DEFAULT_STEP_REPEAT, ...patch });

describe("wall QR scannability", () => {
  it("blocks white modules printed straight onto the gradient ground", () => {
    const blockers = stepRepeatQrScanBlockers(
      plan({
        kind: "logo-qr",
        qrData: "www.transperfect.com",
        qrInkHex: "#FFFFFF",
        qrPlateHex: "#FFFFFF",
        qrPlateShape: "none",
        qrModuleShape: "dot",
      }),
    );
    expect(blockers.length).toBeGreaterThan(0);
    expect(blockers.join(" ")).toMatch(/plate/i);
  });

  it("blocks a QR wall with no link", () => {
    expect(stepRepeatQrScanBlockers(plan({ kind: "qr", qrData: "" }))).toHaveLength(1);
  });

  it("blocks ink and plate that are too close in value", () => {
    expect(
      stepRepeatQrScanBlockers(
        plan({
          kind: "qr",
          qrData: "https://example.com",
          qrInkHex: "#333333",
          qrPlateHex: "#3A3A3A",
          qrPlateShape: "rounded",
        }),
      ),
    ).toHaveLength(1);
  });

  it("passes dark modules on a light plate and surfaces blockers in the warnings", () => {
    const good = plan({
      kind: "logo-qr",
      qrData: "www.transperfect.com",
      qrInkHex: "#03002C",
      qrPlateHex: "#FFFFFF",
      qrPlateShape: "rounded",
      qrModuleShape: "square",
    });
    expect(stepRepeatQrScanBlockers(good)).toHaveLength(0);
    expect(good.qr?.path.length ?? 0).toBeGreaterThan(100);

    const bad = plan({ kind: "qr", qrData: "" });
    expect(stepRepeatWarnings(wall, bad).some((w) => w.startsWith("WILL NOT SCAN:"))).toBe(true);
  });

  it("leaves logo-only walls alone", () => {
    expect(stepRepeatQrScanBlockers(plan({ kind: "logo" }))).toHaveLength(0);
  });
});
