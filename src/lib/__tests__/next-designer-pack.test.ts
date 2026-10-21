import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NEXT_DIVISIONS, NEXT_MARKS } from "@/lib/next-brand-guide";
import { buildAse, designerFileName, logoFormats, parseCmykPercent } from "@/lib/next-designer-pack";
import { liveUrl } from "@/lib/next-designer-guide-pdf";
import { NEXT_APP_ORIGIN } from "@/lib/next-event";

describe("NEXT designer pack", () => {
  it("names files next26_<division>_<asset>_<variant>.<ext>", () => {
    expect(designerFileName("Finance", "stacked", "white", "EPS")).toBe("next26_finance_stacked_white.eps");
    expect(designerFileName("life-sci", "side-by-side", "color", ".svg")).toBe("next26_lifesci_sidebyside_color.svg");
  });

  it("ships every lockup and mark as SVG, EPS and PNG", () => {
    const srcs = [...NEXT_DIVISIONS.flatMap((d) => d.lockups.map((l) => l.src)), ...NEXT_MARKS.map((m) => m.src)];
    const missing = srcs.flatMap((s) => Object.values(logoFormats(s)).filter((u) => !existsSync(`public${u}`)));
    expect(missing).toEqual([]);
  });

  it("points every PDF link at the live site", () => {
    expect(liveUrl("/next-2026/logos/eps/x.eps")).toBe(`${NEXT_APP_ORIGIN}/next-2026/logos/eps/x.eps`);
    expect(liveUrl("https://www.dropbox.com/a")).toBe("https://www.dropbox.com/a");
  });

  it("writes a valid Adobe swatch file", () => {
    const ase = buildAse("NEXT", [{ name: "Blue", hex: "#003FC7", cmyk: parseCmykPercent("100, 83, 0, 6") }]);
    expect(String.fromCharCode(...ase.slice(0, 4))).toBe("ASEF");
    // group start + RGB + CMYK + group end
    expect(new DataView(ase.buffer).getUint32(8)).toBe(4);
  });

  it("never writes CMYK for a swatch without a build", () => {
    const ase = buildAse("NEXT", [{ name: "X", hex: "#123456" }]);
    expect(new DataView(ase.buffer).getUint32(8)).toBe(3);
  });
});
