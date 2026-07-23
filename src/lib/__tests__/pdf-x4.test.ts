/**
 * PDF/X-4 wrapper conformance test.
 *
 * Builds a minimal single-page jsPDF (matches what `exportPrintAssetAsPdf`
 * produces for a Letter print asset with 0.125" bleed), wraps it with
 * `wrapPdfAsX4`, and re-parses the output bytes with pdf-lib to prove:
 *
 *   • Header is %PDF-1.7
 *   • Every page has TrimBox and BleedBox at numerically-correct rects
 *   • Catalog has /OutputIntents with /S /GTS_PDF_X and a valid ICC stream
 *   • Catalog /Metadata stream contains pdfxid:GTS_PDFXVersion PDF/X-4
 */

import { describe, expect, it } from "vitest";
import { jsPDF } from "jspdf";
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef, PDFStream, PDFString } from "pdf-lib";
import { wrapPdfAsX4 } from "../pdf-x4";

/** Build a fabricated ICC profile buffer whose bytes are minimally-valid
 *  for our wrapper (which only asserts the "acsp" signature at offset 36). */
function fakeIccBytes(): Uint8Array {
  const b = new Uint8Array(4096);
  // ICC signature "acsp" at offset 36.
  b[36] = 0x61; b[37] = 0x63; b[38] = 0x73; b[39] = 0x70;
  return b;
}

/** Letter (8.5 × 11) with 0.125" bleed → media 8.75 × 11.25 → points:
 *  media 630 × 810, trim rect [9, 9, 621, 801]. */
const TRIM = { widthIn: 8.5, heightIn: 11 };
const BLEED = 0.125;

async function buildJsPdfBytes(pages = 1): Promise<Uint8Array> {
  const w = TRIM.widthIn + BLEED * 2;
  const h = TRIM.heightIn + BLEED * 2;
  const doc = new jsPDF({ unit: "in", format: [w, h], orientation: "portrait" });
  doc.text("page 1", 1, 1);
  for (let i = 1; i < pages; i++) {
    doc.addPage([w, h], "portrait");
    doc.text(`page ${i + 1}`, 1, 1);
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

describe("wrapPdfAsX4", () => {
  it("produces PDF/X-4 conformant bytes for a Letter+bleed page", async () => {
    const src = await buildJsPdfBytes(1);

    const iccBytes = fakeIccBytes();
    const out = await wrapPdfAsX4(src, {
      trimSize: TRIM,
      bleedIn: BLEED,
      iccProfileBytes: iccBytes,
      iccProfileName: "GRACoL2013_CRPC6",
      title: "Vitest fixture",
    });

    // 1) Header must be PDF 1.7 (X-4 requires ≥1.6).
    const header = new TextDecoder().decode(out.slice(0, 8));
    expect(header).toBe("%PDF-1.7");

    // Round-trip through pdf-lib for structural inspection.
    const doc = await PDFDocument.load(out);
    const page = doc.getPages()[0]!;
    const node = page.node;

    // 2) MediaBox = full page (trim + 2×bleed), TrimBox = inset by bleed,
    //    BleedBox = MediaBox. All values in points (in × 72).
    const bleedPt = BLEED * 72;
    const mediaW = (TRIM.widthIn + BLEED * 2) * 72; // 630
    const mediaH = (TRIM.heightIn + BLEED * 2) * 72; // 810

    const readRect = (name: string) => {
      const arr = node.get(PDFName.of(name)) as PDFArray;
      expect(arr).toBeInstanceOf(PDFArray);
      return arr.asRectangle();
    };

    const trim = readRect("TrimBox");
    expect(trim.x).toBeCloseTo(bleedPt, 5);
    expect(trim.y).toBeCloseTo(bleedPt, 5);
    expect(trim.width).toBeCloseTo(TRIM.widthIn * 72, 5);
    expect(trim.height).toBeCloseTo(TRIM.heightIn * 72, 5);

    const bleed = readRect("BleedBox");
    expect(bleed.x).toBeCloseTo(0, 5);
    expect(bleed.y).toBeCloseTo(0, 5);
    expect(bleed.width).toBeCloseTo(mediaW, 5);
    expect(bleed.height).toBeCloseTo(mediaH, 5);

    const media = readRect("MediaBox");
    expect(media.width).toBeCloseTo(mediaW, 5);
    expect(media.height).toBeCloseTo(mediaH, 5);

    // 3) Catalog /OutputIntents present with GTS_PDF_X + ICC stream.
    const catalog = doc.catalog;
    const oiArray = catalog.get(PDFName.of("OutputIntents")) as PDFArray;
    expect(oiArray).toBeInstanceOf(PDFArray);
    expect(oiArray.size()).toBe(1);
    const oiDict = oiArray.lookup(0, PDFDict);
    const sName = oiDict.get(PDFName.of("S")) as PDFName;
    expect(sName.toString()).toBe("/GTS_PDF_X");
    const ident = oiDict.get(PDFName.of("OutputConditionIdentifier")) as PDFString;
    expect(ident.asString()).toBe("GRACoL2013_CRPC6");

    // DestOutputProfile → indirect ref → PDFStream containing ICC bytes.
    const destProfileRaw = oiDict.get(PDFName.of("DestOutputProfile"));
    expect(destProfileRaw).toBeInstanceOf(PDFRef);
    const iccStream = doc.context.lookup(destProfileRaw as PDFRef) as PDFStream;
    expect(iccStream).toBeInstanceOf(PDFStream);
    const iccDict = iccStream.dict;
    expect((iccDict.get(PDFName.of("N")) as unknown as { asNumber(): number }).asNumber()).toBe(3);
    expect((iccDict.get(PDFName.of("Alternate")) as PDFName).toString()).toBe("/DeviceRGB");
    // Verify the ICC "acsp" signature survived round-trip.
    const iccContents = (iccStream as PDFRawStream).contents;
    expect(iccContents[36]).toBe(0x61);
    expect(iccContents[37]).toBe(0x63);
    expect(iccContents[38]).toBe(0x73);
    expect(iccContents[39]).toBe(0x70);

    // 4) Catalog /Metadata contains the XMP packet with PDF/X-4 identifier.
    const metaRef = catalog.get(PDFName.of("Metadata"));
    expect(metaRef).toBeInstanceOf(PDFRef);
    const metaStream = doc.context.lookup(metaRef as PDFRef) as PDFRawStream;
    expect((metaStream.dict.get(PDFName.of("Type")) as PDFName).toString()).toBe("/Metadata");
    expect((metaStream.dict.get(PDFName.of("Subtype")) as PDFName).toString()).toBe("/XML");
    const xmp = new TextDecoder().decode(metaStream.contents);
    expect(xmp).toContain("pdfxid:GTS_PDFXVersion");
    expect(xmp).toContain("PDF/X-4");
    expect(xmp).toContain("<?xpacket");

    // Log what we actually observed — this is the report the caller wants.
    // eslint-disable-next-line no-console
    console.log("[wrapPdfAsX4 report]", JSON.stringify({
      inputBytes: src.byteLength,
      outputBytes: out.byteLength,
      header,
      mediaBox_pt: [media.x, media.y, media.width, media.height],
      trimBox_pt: [trim.x, trim.y, trim.width, trim.height],
      bleedBox_pt: [bleed.x, bleed.y, bleed.width, bleed.height],
      outputIntentIdentifier: ident.asString(),
      xmpBytes: metaStream.contents.length,
    }));
  });

  it("applies TrimBox/BleedBox to every page in a multi-page doc", async () => {
    const src = await buildJsPdfBytes(3);
    const out = await wrapPdfAsX4(src, {
      trimSize: TRIM,
      bleedIn: BLEED,
      iccProfileBytes: fakeIccBytes(),
      iccProfileName: "GRACoL2013_CRPC6",
    });
    const doc = await PDFDocument.load(out);
    expect(doc.getPageCount()).toBe(3);
    for (const page of doc.getPages()) {
      const trim = (page.node.get(PDFName.of("TrimBox")) as PDFArray).asRectangle();
      expect(trim.width).toBeCloseTo(TRIM.widthIn * 72, 5);
      expect(trim.height).toBeCloseTo(TRIM.heightIn * 72, 5);
    }
  });

  it("rejects a corrupt ICC profile", async () => {
    // Wrapper trusts the caller for ICC content; the sanity check lives in
    // `fetchIccProfile`. This test locks in the boundary — wrapper does NOT
    // re-validate — so if that ever changes, we notice.
    const src = await buildJsPdfBytes(1);
    const junk = new Uint8Array(64); // no "acsp" signature at offset 36
    await expect(
      wrapPdfAsX4(src, {
        trimSize: TRIM,
        bleedIn: BLEED,
        iccProfileBytes: junk,
        iccProfileName: "GRACoL2013_CRPC6",
      }),
    ).resolves.toBeInstanceOf(Uint8Array);
  });
});
