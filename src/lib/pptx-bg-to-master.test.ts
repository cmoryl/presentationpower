import { describe, expect, it } from "vitest";
import {
  layoutWithImageBackground,
  lockShapes,
  planSlideScrub,
  readShapes,
  stripShapes,
} from "./pptx-bg-to-master";

const CANVAS = '<a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/>';

function pic(name: string, embed: string, xfrm = CANVAS): string {
  return (
    `<p:pic><p:nvPicPr><p:cNvPr id="2" name="${name}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>` +
    `<p:blipFill><a:blip r:embed="${embed}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>` +
    `<p:spPr><a:xfrm>${xfrm}</a:xfrm></p:spPr></p:pic>`
  );
}

function sp(name: string, xfrm: string, text = ""): string {
  return (
    `<p:sp><p:nvSpPr><p:cNvPr id="3" name="${name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm>${xfrm}</a:xfrm></p:spPr>` +
    `<p:txBody><a:bodyPr/><a:p><a:r><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`
  );
}

function slide(body: string): string {
  return (
    `<p:sld><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg>` +
    `<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/>` +
    `${body}</p:spTree></p:cSld></p:sld>`
  );
}

describe("readShapes", () => {
  it("reads names, frames and embeds in z-order", () => {
    const shapes = readShapes(slide(pic("TP Background", "rId2") + sp("TP Text 1", CANVAS, "Hi")));
    expect(shapes.map((s) => s.name)).toEqual(["TP Background", "TP Text 1"]);
    expect(shapes[0].embed).toBe("rId2");
    expect(shapes[0].frame).toEqual({ x: 0, y: 0, w: 12192000, h: 6858000 });
    expect(shapes[1].hasText).toBe(true);
  });
});

describe("planSlideScrub", () => {
  it("promotes a pure full-bleed ground and keeps content", () => {
    const xml = slide(
      pic("TP Background", "rId2") +
        sp("TP Text 1", '<a:off x="100" y="100"/><a:ext cx="200" cy="200"/>', "Copy"),
    );
    const plan = planSlideScrub(xml);
    expect(plan.bgEmbed).toBe("rId2");
    expect(plan.drop).toHaveLength(1);
    const stripped = stripShapes(xml, plan.drop);
    expect(stripped).not.toContain("TP Background");
    expect(stripped).toContain("TP Text 1");
  });

  it("never promotes the composite design plate — it carries content", () => {
    const plan = planSlideScrub(slide(pic("TP Design plate", "rId2")));
    expect(plan.bgEmbed).toBeNull();
    expect(plan.drop).toHaveLength(0);
    // it stays, but locked out of selection
    expect(plan.lock).toHaveLength(1);
  });

  it("drops full-height scaffold hairlines and full-bleed effect washes", () => {
    const rule = sp("TP Rule", '<a:off x="500000" y="0"/><a:ext cx="12700" cy="6858000"/>');
    const wash = sp("TP Effect", CANVAS);
    const card = sp(
      "TP Shape",
      '<a:off x="500000" y="900000"/><a:ext cx="3000000" cy="2000000"/>',
    );
    const plan = planSlideScrub(slide(rule + wash + card));
    expect(plan.drop.map((s) => s.name).sort()).toEqual(["TP Effect", "TP Rule"]);
    expect(plan.lock).toHaveLength(0);
  });

  it("locks a kept full-bleed object", () => {
    const xml = slide(pic("TP Photo", "rId2"));
    const plan = planSlideScrub(xml);
    const locked = lockShapes(xml, plan.lock);
    expect(locked).toContain('noSelect="1"');
  });
});

describe("layoutWithImageBackground", () => {
  const layout =
    `<p:sldLayout><p:cSld name="TP_BRAND_LIGHT"><p:bg><p:bgPr><a:solidFill>` +
    `<a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg><p:spTree/></p:cSld></p:sldLayout>`;

  it("replaces the solid background with a stretched blipFill", () => {
    const out = layoutWithImageBackground(layout, "rId9", "TP_BACKGROUND_4");
    expect(out).toContain('<a:blip r:embed="rId9"/>');
    expect(out).toContain("<a:stretch><a:fillRect/></a:stretch>");
    expect(out).not.toContain('<a:srgbClr val="FFFFFF"/>');
    expect(out).toContain('name="TP_BACKGROUND_4"');
    // exactly one background element
    expect(out.match(/<p:bg>/g)).toHaveLength(1);
  });
});
