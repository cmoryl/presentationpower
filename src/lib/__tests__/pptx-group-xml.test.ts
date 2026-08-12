import { describe, expect, it } from "vitest";
import { groupTag, stripGroupTag, withGroups } from "../pptx-group-xml";

function sp(name: string, x: number, y: number, cx: number, cy: number, id = 2): string {
  return (
    "<p:sp><p:nvSpPr>" +
    `<p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr/>` +
    "</p:nvSpPr><p:spPr><a:xfrm>" +
    `<a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/>` +
    "</a:xfrm></p:spPr></p:sp>"
  );
}

function slide(inner: string): string {
  return `<p:sld><p:cSld><p:spTree><p:nvGrpSpPr/><p:grpSpPr/>${inner}</p:spTree></p:cSld></p:sld>`;
}

describe("group tags", () => {
  it("round-trips", () => {
    expect(stripGroupTag(`${groupTag("card-1", "Card 1")} Plate`)).toBe("Plate");
    expect(stripGroupTag("Plate")).toBe("Plate");
  });
});

describe("withGroups", () => {
  it("wraps tagged siblings in a grpSp with the union bounding box", () => {
    const tag = groupTag("card-1", "Card 1");
    const xml = slide(
      sp(`${tag} Plate`, 100, 200, 1000, 500, 2) + sp(`${tag} Title`, 300, 900, 400, 100, 3),
    );
    const out = withGroups(xml);
    expect(out).toContain("<p:grpSp>");
    expect(out).toContain('name="Card 1"');
    expect(out).toContain('<a:off x="100" y="200"/><a:ext cx="1000" cy="800"/>');
    // chOff/chExt mirror off/ext so child coordinates stay valid.
    expect(out).toContain('<a:chOff x="100" y="200"/><a:chExt cx="1000" cy="800"/>');
    expect(out.match(/<p:sp>/g)).toHaveLength(2);
  });

  it("strips the tag from visible object names", () => {
    const tag = groupTag("k", "KPI card 1");
    const out = withGroups(slide(sp(`${tag} A`, 0, 0, 10, 10) + sp(`${tag} B`, 0, 0, 10, 10, 3)));
    expect(out).not.toContain("[g:");
    expect(out).toContain('name="A"');
  });

  it("does not group a single tagged object", () => {
    const out = withGroups(slide(sp(`${groupTag("solo")} A`, 0, 0, 10, 10)));
    expect(out).not.toContain("<p:grpSp>");
    expect(out).toContain('name="A"');
  });

  it("keeps untagged neighbours ungrouped and in z-order", () => {
    const tag = groupTag("c", "Card");
    const out = withGroups(
      slide(
        sp("Background", 0, 0, 100, 100) +
          sp(`${tag} A`, 10, 10, 20, 20, 3) +
          sp(`${tag} B`, 40, 10, 20, 20, 4) +
          sp("Footer", 0, 90, 100, 10, 5),
      ),
    );
    expect(out.indexOf("Background")).toBeLessThan(out.indexOf("<p:grpSp>"));
    expect(out.indexOf("<p:grpSp>")).toBeLessThan(out.indexOf("Footer"));
    expect(out).toContain('<a:ext cx="50" cy="20"/>');
  });

  it("separates distinct groups and assigns unique ids", () => {
    const a = groupTag("a", "Card A");
    const b = groupTag("b", "Card B");
    const out = withGroups(
      slide(
        sp(`${a} 1`, 0, 0, 10, 10, 2) +
          sp(`${a} 2`, 0, 0, 10, 10, 3) +
          sp(`${b} 1`, 50, 0, 10, 10, 4) +
          sp(`${b} 2`, 50, 0, 10, 10, 5),
      ),
    );
    const groups = out.match(/<p:grpSp>/g) ?? [];
    expect(groups).toHaveLength(2);
    const ids = [...out.matchAll(/<p:cNvPr id="(\d+)" name="Card [AB]"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(2);
    expect(Number(ids[0])).toBeGreaterThan(5);
  });

  it("is a safe no-op on markup without a spTree", () => {
    expect(withGroups("<p:notASlide/>")).toBe("<p:notASlide/>");
  });
});
