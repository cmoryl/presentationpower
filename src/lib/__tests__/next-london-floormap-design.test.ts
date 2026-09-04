import { describe, expect, it } from "vitest";

import {
  DEFAULT_MAP_DESIGN,
  kindInkFor,
  mapPalette,
  pdfFormatFor,
  zoneStyleFor,
  type MapDesign,
} from "@/lib/next-london-floormap-design";
import { floorMapSheetSize, floorMapSvg } from "@/lib/next-london-floormap-svg";
import { LONDON_PANELS } from "@/lib/next-london-signage";

const design = (over: Partial<MapDesign> = {}): MapDesign => ({ ...DEFAULT_MAP_DESIGN, ...over });
const svg = (over: Partial<MapDesign> = {}, extra = {}) =>
  floorMapSvg("GF", { panels: LONDON_PANELS, labels: true, design: design(over), ...extra });

describe("map design", () => {
  it("resolves palettes and accent overrides", () => {
    expect(mapPalette(design()).accent).toBe("#003FC7");
    expect(mapPalette(design({ accent: "#EC388A" })).accent).toBe("#EC388A");
    // Junk in the accent field must never leak into the artwork.
    expect(mapPalette(design({ accent: "not a colour" })).accent).toBe("#003FC7");
    expect(mapPalette(design({ theme: "night" })).dark).toBe(true);
  });

  it("flattens category colour when the design asks for it", () => {
    expect(zoneStyleFor("hospitality", design()).accent).not.toBe(
      zoneStyleFor("auditorium", design()).accent,
    );
    const flat = design({ roomTint: false });
    expect(zoneStyleFor("hospitality", flat).accent).toBe(zoneStyleFor("auditorium", flat).accent);
    expect(kindInkFor("pillar", design({ theme: "mono" }))).toBe(
      kindInkFor("door", design({ theme: "mono" })),
    );
  });

  it("paints the sheet in the chosen theme", () => {
    expect(svg()).toContain("#EDF1F7");
    const night = svg({ theme: "night" });
    expect(night).toContain("#03002C");
    expect(night).toContain("#0B1043");
  });

  it("honours scale and margin in the sheet size", () => {
    const base = floorMapSheetSize("GF", { panels: LONDON_PANELS, labels: true });
    const big = floorMapSheetSize("GF", {
      panels: LONDON_PANELS,
      labels: true,
      design: design({ ppm: 26, margin: 64 }),
    });
    expect(big.w).toBeGreaterThan(base.w);
    expect(big.h).toBeGreaterThan(base.h);
  });

  it("switches label mode, grid, legend and compass off", () => {
    const numbered = svg();
    expect(numbered).toContain("ASSET KEY");
    const bare = svg({ labelMode: "none", legend: "none", grid: false, compass: false });
    expect(bare).not.toContain("ASSET KEY");
    expect(bare).not.toContain("stroke-opacity");
    expect(bare).not.toContain(">N</text>");
    // Named mode prints asset names beside the pins instead of an index.
    const named = svg({ labelMode: "named" });
    const first = LONDON_PANELS.find((p) => p.floor === "GF")!;
    expect(named).toContain(first.name.slice(0, 12));
  });

  it("draws the pin shape and size the design asks for", () => {
    expect(svg({ labelMode: "none", pinShape: "dot" })).toContain("<circle");
    expect(svg({ labelMode: "none", pinShape: "square" })).toContain('rx="');
  });

  it("uses the design wording when supplied", () => {
    const worded = svg({
      eyebrow: "Crew brief",
      title: "Level zero",
      subtitle: "Install day one",
      legendTitle: "What goes where",
      footerNote: "Confirm with production",
    });
    expect(worded).toContain("Level zero");
    expect(worded).toContain("Install day one");
    expect(worded).toContain("Confirm with production");
    expect(worded).toContain("WHAT GOES WHERE");
  });

  it("maps paper choices onto jsPDF formats", () => {
    expect(pdfFormatFor(design())).toBe("a3");
    expect(pdfFormatFor(design({ paper: "A2" }))).toBe("a2");
    expect(pdfFormatFor(design({ paper: "sheet" }))).toBeNull();
  });

  it("leaves the default sheet unchanged", () => {
    expect(svg()).toBe(floorMapSvg("GF", { panels: LONDON_PANELS, labels: true }));
  });
});
