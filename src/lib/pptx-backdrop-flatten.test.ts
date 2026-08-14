// EXPORT SPEC #3 — the backdrop is a flat raster, and only the backdrop.
// These tests pin the three invariants the pass exists to enforce: one media
// part per unique image, no svgBlip fallback on a backdrop blip, and a locked
// full-canvas frame — while proving content pictures are left alone.
import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import {
  CANVAS_CX_EMU,
  CANVAS_CY_EMU,
  flattenBackdrops,
  normalizeBackdropPictures,
} from "./pptx-backdrop-flatten";


/** Minimal slide XML wrapper. */
function slide(inner: string): string {
  return `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a" xmlns:r="r"><p:cSld><p:spTree>${inner}</p:spTree></p:cSld></p:sld>`;
}

const BACKDROP = [
  "<p:pic>",
  '<p:nvPicPr><p:cNvPr id="2" name="TP Background"/><p:cNvPicPr/></p:nvPicPr>',
  '<p:blipFill><a:blip r:embed="rId2"><a:extLst><a:ext uri="{96DAC541}"><asvg:svgBlip xmlns:asvg="svg" r:embed="rId9"/></a:ext></a:extLst></a:blip><a:srcRect l="4000"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>',
  '<p:spPr><a:xfrm><a:off x="914400" y="457200"/><a:ext cx="3000000" cy="2000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>',
  "</p:pic>",
].join("");

const CONTENT_PHOTO = [
  "<p:pic>",
  '<p:nvPicPr><p:cNvPr id="3" name="TP Photo"/><p:cNvPicPr/></p:nvPicPr>',
  '<p:blipFill><a:blip r:embed="rId3"/><a:srcRect l="7000"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>',
  '<p:spPr><a:xfrm><a:off x="600000" y="600000"/><a:ext cx="1200000" cy="900000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>',
  "</p:pic>",
].join("");

describe("normalizeBackdropPictures", () => {
  it("strips the svgBlip fallback so the flat PNG is the only candidate", () => {
    const res = normalizeBackdropPictures(slide(BACKDROP));
    expect(res.svgStripped).toBe(1);
    expect(res.xml).not.toMatch(/svgBlip/);
    expect(res.xml).toContain('<a:blip r:embed="rId2"/>');
  });

  it("locks the backdrop out of selection and movement", () => {
    const res = normalizeBackdropPictures(slide(BACKDROP));
    expect(res.normalized).toBe(1);
    expect(res.xml).toMatch(/<a:picLocks[^>]*noSelect="1"/);
    expect(res.xml).toMatch(/noMove="1"/);
    expect(res.xml).toMatch(/noResize="1"/);
  });

  it("forces the exact full canvas with no crop", () => {
    const res = normalizeBackdropPictures(slide(BACKDROP));
    expect(res.xml).toContain('<a:off x="0" y="0"/>');
    expect(res.xml).toContain(`<a:ext cx="${CANVAS_CX_EMU}" cy="${CANVAS_CY_EMU}"/>`);
    expect(res.xml).toContain("<a:srcRect/>");
    expect(res.xml).not.toMatch(/srcRect l="4000"/);
  });

  it("leaves content pictures untouched — the spec must not bleed into content", () => {
    const res = normalizeBackdropPictures(slide(CONTENT_PHOTO));
    expect(res.normalized).toBe(0);
    expect(res.svgStripped).toBe(0);
    expect(res.xml).toContain('<a:off x="600000" y="600000"/>');
    expect(res.xml).toContain('srcRect l="7000"');
    expect(res.xml).not.toMatch(/picLocks/);
  });

  it("normalizes every backdrop alias the exporter emits", () => {
    for (const name of ["TP Background", "TP Design plate", "TP Graphic plate", "TP Ground"]) {
      const res = normalizeBackdropPictures(slide(BACKDROP.replace("TP Background", name)));
      expect(res.normalized, name).toBe(1);
    }
  });

  it("is idempotent", () => {
    const once = normalizeBackdropPictures(slide(BACKDROP)).xml;
    const twice = normalizeBackdropPictures(once);
    expect(twice.xml).toBe(once);
    expect(twice.svgStripped).toBe(0);
  });
});

async function pkg(files: Record<string, string | Uint8Array>): Promise<Blob> {
  const zip = new JSZip();
  for (const [name, body] of Object.entries(files)) zip.file(name, body);
  return (await zip.generateAsync({ type: "blob" })) as Blob;
}

describe("flattenBackdrops (media dedupe)", () => {
  const rels = (rid: string, target: string) =>
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="${rid}" Type="image" Target="${target}"/></Relationships>`;

  it("collapses byte-identical media parts and repoints the rels", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const out = await flattenBackdrops(
      await pkg({
        "ppt/slides/slide1.xml": slide(BACKDROP),
        "ppt/slides/slide2.xml": slide(BACKDROP),
        "ppt/slides/_rels/slide1.xml.rels": rels("rId2", "../media/image1.png"),
        "ppt/slides/_rels/slide2.xml.rels": rels("rId2", "../media/image2.png"),
        "ppt/media/image1.png": bytes,
        "ppt/media/image2.png": bytes,
      }),
    );
    const zip = await JSZip.loadAsync(await out.arrayBuffer());
    const media = Object.keys(zip.files).filter((n) => n.startsWith("ppt/media/") && !zip.files[n].dir);
    // Unique media parts == total media parts: no byte-identical duplicates.
    expect(media).toEqual(["ppt/media/image1.png"]);
    const r2 = await zip.file("ppt/slides/_rels/slide2.xml.rels")!.async("string");
    expect(r2).toContain("../media/image1.png");
  });

  it("keeps distinct backdrops as separate parts (one per variant)", async () => {
    const out = await flattenBackdrops(
      await pkg({
        "ppt/slides/slide1.xml": slide(BACKDROP),
        "ppt/media/image1.png": new Uint8Array([1, 1, 1, 1]),
        "ppt/media/image2.png": new Uint8Array([2, 2, 2, 2]),
      }),
    );
    const zip = await JSZip.loadAsync(await out.arrayBuffer());
    const media = Object.keys(zip.files).filter((n) => n.startsWith("ppt/media/") && !zip.files[n].dir);
    expect(media.sort()).toEqual(["ppt/media/image1.png", "ppt/media/image2.png"]);
  });

  it("reports what it changed", async () => {
    let report: { duplicatesRemoved: number; svgFallbacksStripped: number } | null = null;
    await flattenBackdrops(
      await pkg({
        "ppt/slides/slide1.xml": slide(BACKDROP),
        "ppt/media/image1.png": new Uint8Array([9, 9]),
        "ppt/media/image2.png": new Uint8Array([9, 9]),
      }),
      (r) => {
        report = r;
      },
    );
    expect(report).not.toBeNull();
    expect(report!.duplicatesRemoved).toBe(1);
    expect(report!.svgFallbacksStripped).toBe(1);
  });

  it("emits no svgBlip anywhere in slide XML after the pass", async () => {
    const out = await flattenBackdrops(
      await pkg({
        "ppt/slides/slide1.xml": slide(BACKDROP + CONTENT_PHOTO),
        "ppt/media/image1.png": new Uint8Array([4, 4]),
      }),
    );
    const zip = await JSZip.loadAsync(await out.arrayBuffer());
    const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(xml).not.toMatch(/svgBlip/);
  });

  it("returns the original bytes when nothing needs changing", async () => {
    const original = await pkg({
      "ppt/slides/slide1.xml": slide(CONTENT_PHOTO),
      "ppt/media/image1.png": new Uint8Array([7, 7]),
    });
    const out = await flattenBackdrops(original);
    expect(out).toBe(original);
  });

  it("never throws on malformed bytes", async () => {
    const junk = new Blob([new Uint8Array([0, 1, 2])]);
    await expect(flattenBackdrops(junk)).resolves.toBe(junk);
  });
});
