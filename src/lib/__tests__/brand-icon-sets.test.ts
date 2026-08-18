import { describe, expect, it } from "vitest";
import { BRAND_GUIDES } from "@/lib/brand-guides";
import { ICON_LIBRARY } from "@/lib/icon-library";
import {
  BRAND_ICON_SETS,
  approvedIconForLabel,
  approvedIconNames,
  brandIconSet,
  brandIconSetForDivision,
  APPROVED_SET_SIZE,
  SUB_AREA_MIN_SIZE,

  flatIcons,
  iconColorOptions,
} from "@/lib/brand-icon-sets";
import { iconFileName, iconSvgString, slugifyIconName } from "@/lib/icon-export";

const valid = new Set(ICON_LIBRARY.map((e) => e.name));

describe("brand icon sets", () => {
  it("covers every brand guide", () => {
    for (const guide of BRAND_GUIDES) {
      expect(brandIconSet(guide.slug).slug).toBe(guide.slug);
      expect(brandIconSetForDivision(guide.divisionId).slug).toBe(guide.slug);
    }
  });

  it("only references glyphs that exist in the icon library", () => {
    for (const set of BRAND_ICON_SETS) {
      for (const icon of flatIcons(set)) expect(valid.has(icon.name)).toBe(true);
    }
  });

  it("gives each guide sub-areas plus the shared process and proof cores", () => {
    for (const set of BRAND_ICON_SETS) {
      const ids = set.subAreas.map((a) => a.id);
      expect(ids).toContain("process");
      expect(ids).toContain("proof");
      expect(flatIcons(set).length).toBeGreaterThanOrEqual(APPROVED_SET_SIZE);
    }
  });

  it("publishes at least 50 glyphs in every sub-area of every guide", () => {
    for (const set of BRAND_ICON_SETS) {
      for (const area of set.subAreas) {
        expect(area.icons.length).toBeGreaterThanOrEqual(SUB_AREA_MIN_SIZE);
        // No glyph repeated inside one section.
        expect(new Set(area.icons.map((i) => i.name)).size).toBe(area.icons.length);
      }
      // Padding never repeats a glyph, so a guide's sections stay near-disjoint —
      // only authored overlap (a glyph two sections both genuinely mean) remains.
      const all = set.subAreas.flatMap((a) => a.icons.map((i) => i.name));
      expect(new Set(all).size).toBeGreaterThanOrEqual(all.length - 10);
    }
  });



  it("matches labels to the division's own approved vocabulary", () => {
    expect(approvedIconForLabel("bm-tp-legal", "Document review workflow")).toBeTruthy();
    expect(approvedIconNames("bm-tp-legal")).toContain("Scale");
    expect(approvedIconForLabel("bm-tp-legal", "zzzz")).toBeNull();
  });

  it("offers approved-only colours", () => {
    const colors = iconColorOptions("globallink");
    expect(colors.length).toBeGreaterThan(3);
    expect(colors.some((c) => c.hex === "#003FC7")).toBe(true);
    expect(new Set(colors.map((c) => c.hex)).size).toBe(colors.length);
  });
});

describe("icon export", () => {
  it("renders standalone svg markup", () => {
    const svg = iconSvgString("Search", { size: 64, color: "#003FC7" });
    expect(svg).toContain("<svg");
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("#003FC7");
  });

  it("names files by glyph, size and colour", () => {
    expect(slugifyIconName("FileCheck2")).toBe("file-check2");
    expect(iconFileName("ShieldCheck", { format: "png", size: 128, color: "#03002C" })).toBe(
      "shield-check-128-03002c.png",
    );
  });
});
