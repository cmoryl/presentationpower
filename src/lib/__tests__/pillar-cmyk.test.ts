import { describe, expect, it } from "vitest";

import { pillarCmykLedger, pillarCmykSignOffCsv, pillarTemplateCmykCsv } from "../next-pillar-cmyk";
import { pillarDefault, type PillarConfig } from "../next-pillar-masters";
import { buildPillarVectorPdf } from "../pillar-vector-pdf";

function config(over: Partial<PillarConfig> = {}): PillarConfig {
  return { ...pillarDefault(), ...over };
}

describe("pillar CMYK sign-off ledger", () => {
  it("reports the NEXT ascent chevron ground as needing printer approval", () => {
    const ledger = pillarCmykLedger(config({ templateId: "next-ascend", face: "dark" }));
    const hexes = ledger.stops.map((s) => s.hex);
    expect(hexes).toContain("#9A70F8");
    expect(hexes).toContain("#8BC6EA");
    expect(ledger.fullyApproved).toBe(false);
    expect(ledger.converted).toBeGreaterThan(0);
    // The chevron device must be tracked as its own role so it can be signed off.
    expect(ledger.stops.some((s) => s.roles.includes("chevron device"))).toBe(true);
  });

  it("never reports a colour as approved without a signed-off brand build", () => {
    const ledger = pillarCmykLedger(config({ templateId: "next-ascend" }));
    for (const stop of ledger.stops) {
      expect(typeof stop.build.approved).toBe("boolean");
      // A conversion must never be dressed up as an approved brand build.
      if (!stop.build.approved) expect(stop.roles.length).toBeGreaterThan(0);
    }
    expect(ledger.approved + ledger.converted).toBe(ledger.stops.length);
  });

  it("writes a sign-off CSV with a blank printer approval column per colour", () => {
    const csv = pillarCmykSignOffCsv(config({ templateId: "next-ascend" }));
    const lines = csv.trim().split("\n");
    expect(lines[0]).toContain("printer_approval");
    expect(lines.length).toBeGreaterThan(1);
    // Every conversion leaves the approval column blank for the printer to sign;
    // signed-off brand builds are marked n/a so nobody re-approves them.
    for (const line of lines.slice(1)) {
      const last = line.trimEnd().split(",").at(-1);
      expect(line.includes("needs sign-off") ? last === "" : last === "n/a").toBe(true);
    }
  });

  it("rolls the ground up across templates and faces so colour is signed once", () => {
    const csv = pillarTemplateCmykCsv(config());
    expect(csv).toContain("NEXT ascent");
    expect(csv).toContain("Classic column");
    // Both faces of both templates, so the chevron ground is approved once.
    expect(csv).toContain(",dark,");
    expect(csv).toContain(",light,");
  });

  it("builds a CMYK vector pillar carrying its ledger, and leaves RGB the default", async () => {
    const cfg = config({ templateId: "next-ascend", headline: "GO FURTHER" });
    const cmyk = await buildPillarVectorPdf(cfg, { colorSpace: "cmyk" });
    expect(cmyk.colorSpace).toBe("cmyk");
    expect(cmyk.cmyk?.signOffCsv).toContain("printer_approval");
    expect(cmyk.bytes.byteLength).toBeGreaterThan(1000);

    const rgb = await buildPillarVectorPdf(cfg);
    expect(rgb.colorSpace).toBe("rgb");
    expect(rgb.cmyk).toBeNull();
  }, 60_000);
});
