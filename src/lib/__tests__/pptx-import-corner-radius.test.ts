/**
 * Guards corner-radius fidelity for imported PPTX shapes.
 *
 * PowerPoint rounds corners by an ABSOLUTE length derived from the shape's
 * shorter side (`adj` fraction x min(w,h)). Rendering that as a percentage
 * border-radius resolves per-axis, so a wide imported card came back with
 * stretched, egg-shaped corners — the "object scaling deformity".
 *
 * These tests assert (a) the importer captures `a:avLst` adjust values and
 * (b) the geometry mapper emits a single uniform length for every corner.
 */

import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parsePptxBuffer } from "@/lib/pptx-import";
import { prstToMask } from "@/components/slide/FaithfulSlideCanvas";
type ShapeWithAdj = { frame?: { x: number; y: number; w: number; h: number }; prst?: string; adj?: Record<string, number> };

const EMU_PER_IN = 914400;

function slideXml(): string {
  const shape = (
    id: number,
    xIn: number,
    wIn: number,
    hIn: number,
    avLst: string,
  ) => `<p:sp>
  <p:nvSpPr><p:cNvPr id="${id}" name="Card ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
  <p:spPr>
   <a:xfrm><a:off x="${xIn * EMU_PER_IN}" y="${EMU_PER_IN}"/><a:ext cx="${wIn * EMU_PER_IN}" cy="${hIn * EMU_PER_IN}"/></a:xfrm>
   <a:prstGeom prst="roundRect">${avLst}</a:prstGeom>
   <a:solidFill><a:srgbClr val="003FC7"/></a:solidFill>
  </p:spPr>
  <p:txBody><a:bodyPr/><a:p><a:r><a:t>Card ${id}</a:t></a:r></a:p></p:txBody>
 </p:sp>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
 <p:cSld><p:spTree>
  ${shape(1, 1, 8, 1.5, `<a:avLst><a:gd name="adj" fmla="val 8333"/></a:avLst>`)}
  ${shape(2, 1, 2, 2, `<a:avLst/>`)}
 </p:spTree></p:cSld>
</p:sld>`;
}

async function importShapes() {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>`,
  );
  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0"?><p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldSz cx="12192000" cy="6858000"/></p:presentation>`,
  );
  zip.file("ppt/slides/slide1.xml", slideXml());
  const buf = (await zip.generateAsync({ type: "uint8array" })) as Uint8Array;
  const parsed = await parsePptxBuffer(buf, "radius-fixture.pptx");
  return (parsed.slides[0]?.layout?.shapes ?? []) as ShapeWithAdj[];
}

describe("imported corner radius", () => {
  it("captures a:avLst adjust values as fractions", async () => {
    const shapes = await importShapes();
    const wide = shapes.find((s) => (s.frame?.w ?? 0) > 4);
    expect(wide).toBeDefined();
    expect(wide!.prst).toBe("roundRect");
    expect(wide!.adj?.adj).toBeCloseTo(0.08333, 5);
  });

  it("emits one absolute radius for wide shapes so corners stay circular", async () => {
    const shapes = await importShapes();
    const wide = shapes.find((s) => (s.frame?.w ?? 0) > 4)!;
    const mask = prstToMask(wide.prst, wide.frame, wide.adj);
    expect(mask.borderRadius).toBeDefined();
    // Single length, in inches — never a percentage (which deforms per-axis).
    expect(mask.borderRadius).not.toContain("%");
    expect(mask.borderRadius!.trim().split(/\s+/)).toHaveLength(1);
    // 8.333% of the 1.5in short side.
    const inches = Number(mask.borderRadius!.replace("in", ""));
    expect(inches).toBeCloseTo(0.08333 * 1.5, 3);
  });

  it("uses the PowerPoint default radius when no adjust value is present", async () => {
    const shapes = await importShapes();
    const square = shapes.find((s) => (s.frame?.w ?? 0) <= 4)!;
    const mask = prstToMask(square.prst, square.frame, square.adj);
    const inches = Number(mask.borderRadius!.replace("in", ""));
    expect(inches).toBeCloseTo(0.16667 * 2, 3);
  });

  it("keeps snip corners at 45 degrees on non-square shapes", () => {
    const mask = prstToMask("snip2SameRect", { w: 8, h: 2 }, { adj: 0.1 });
    const nums = (mask.clipPath ?? "").match(/[\d.]+(?=%)/g)!.map(Number);
    // 0.1 x 2in = 0.2in → 2.5% of width, 10% of height: axis-corrected, so the
    // cut is a true corner rather than a skewed wedge.
    expect(nums).toContain(2.5);
    expect(nums).toContain(10);
  });

  it("never clamps a radius above half the short side", () => {
    const mask = prstToMask("roundRect", { w: 4, h: 2 }, { adj: 0.9 });
    const inches = Number(mask.borderRadius!.replace("in", ""));
    expect(inches).toBeLessThanOrEqual(1.0001);
  });

  it("falls back to percentages only when the frame size is unknown", () => {
    const mask = prstToMask("roundRect", undefined, undefined);
    expect(mask.borderRadius).toContain("%");
  });
});
