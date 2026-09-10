import { describe, it, expect } from "vitest";
import { buildLondonKitZip, zipSafeSegment } from "@/lib/next-london-kit-zip";
import { LONDON_PANELS } from "@/lib/next-london-signage";
import JSZip from "jszip";

describe("london kit zip", () => {
  it("sanitises folders", () => {
    expect(zipSafeSegment("Level 2 / Britten*")).toBe("Level 2 - Britten-");
  });
  it("files masters by floor and room and records skips", async () => {
    const panels = LONDON_PANELS.slice(0, 3);
    let n = 0;
    const res = await buildLondonKitZip(panels, {
      fileBase: (p) => `r001-${p.id}`,
      floorLabel: () => "Level 2 — Britten",
      ai: async () => { n += 1; if (n === 2) throw new Error("QA fail"); return new Uint8Array([1,2,3]); },
      printPdf: async () => new Uint8Array([4,5]),
    }, { revLabel: "r001", scheduleCsv: "a,b" });
    expect(res.skipped).toHaveLength(1);
    const zip = await JSZip.loadAsync(await res.blob.arrayBuffer());
    const names = Object.keys(zip.files);
    expect(names.some((x) => x.includes("/live-ai/r001-"))).toBe(true);
    expect(names.some((x) => x.includes("/print-pdf/"))).toBe(true);
    expect(names.some((x) => x.endsWith("manifest.csv"))).toBe(true);
    expect(names.some((x) => x.endsWith("SKIPPED.txt"))).toBe(true);
  });
});
