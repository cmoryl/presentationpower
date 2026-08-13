/**
 * Font embedding is a user-facing option: with it ON the Geist files ride inside
 * the .pptx (typography holds on machines without the brand font), with it OFF
 * the package stays small. Either way the deck must still ASK for the brand
 * typeface, so the theme font scheme / typeface normalization pass always runs.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import JSZip from "jszip";
import { embedFontsInPptx } from "../pptx-font-embed";

const CT =
  '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>';
const RELS =
  '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="slides/slide1.xml"/></Relationships>';
const PRES =
  '<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldSz cx="12192000" cy="6858000"/><p:defaultTextStyle/></p:presentation>';
const SLIDE = '<?xml version="1.0"?><p:sld xmlns:a="a"><a:latin typeface="Arial"/></p:sld>';

async function fixture(): Promise<Blob> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", CT);
  zip.file("ppt/_rels/presentation.xml.rels", RELS);
  zip.file("ppt/presentation.xml", PRES);
  zip.file("ppt/slides/slide1.xml", SLIDE);
  return (await zip.generateAsync({ type: "blob" })) as Blob;
}

async function open(blob: Blob) {
  const zip = await JSZip.loadAsync(blob);
  return {
    names: Object.keys(zip.files),
    pres: await zip.file("ppt/presentation.xml")!.async("string"),
    rels: await zip.file("ppt/_rels/presentation.xml.rels")!.async("string"),
  };
}

describe("embedFontsInPptx font embedding option", () => {
  beforeEach(() => {
    // 40 bytes so the ECMA-376 obfuscation of the first 32 bytes is exercised.
    const font = new Uint8Array(40).fill(7);
    vi.stubGlobal("fetch", async () => ({ ok: true, arrayBuffer: async () => font.buffer }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("packs obfuscated font parts and registers them when embedding is on", async () => {
    const out = await open(await embedFontsInPptx(await fixture(), { embedFontData: true }));
    expect(out.names.filter((n) => n.startsWith("ppt/fonts/")).length).toBeGreaterThan(0);
    expect(out.pres).toContain("<p:embeddedFontLst>");
    expect(out.rels).toContain("/relationships/font");
  });

  it("ships no font parts when embedding is off", async () => {
    const out = await open(await embedFontsInPptx(await fixture(), { embedFontData: false }));
    expect(out.names.filter((n) => n.startsWith("ppt/fonts/"))).toHaveLength(0);
    expect(out.pres).not.toContain("embeddedFontLst");
    expect(out.rels).not.toContain("/relationships/font");
  });

  it("still normalizes typefaces with embedding off", async () => {
    const zip = await JSZip.loadAsync(
      await embedFontsInPptx(await fixture(), { embedFontData: false }),
    );
    const slide = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(slide).not.toContain('typeface="Arial"');
  });

  it("defaults to embedding when no option is passed", async () => {
    const out = await open(await embedFontsInPptx(await fixture()));
    expect(out.pres).toContain("<p:embeddedFontLst>");
  });
});
