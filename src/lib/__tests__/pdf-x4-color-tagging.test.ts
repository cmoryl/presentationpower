import { describe, expect, it } from "vitest";
import { PDFArray, PDFDocument, PDFName, PDFRawStream } from "pdf-lib";
import { wrapPdfAsX4 } from "../pdf-x4";

/**
 * Two regressions guarded here:
 *
 * 1. /DestOutputProfile carried a hard-coded N:3 / Alternate DeviceRGB while
 *    embedding GRACoL or SWOP, which are CMYK profiles. Conformance error.
 * 2. Rasters shipped as untagged /DeviceRGB. Untagged device colour is what
 *    fails PDF/X-4 preflight (RGB as such does not), so every image XObject is
 *    retagged ICCBased/sRGB.
 */

/** Minimal 128-byte ICC-shaped header with the given colour space at 16..19. */
function fakeIccHeader(space: "CMYK" | "RGB " | "GRAY"): Uint8Array {
  const b = new Uint8Array(128);
  b.set(new TextEncoder().encode(space), 16);
  b.set(new TextEncoder().encode("acsp"), 36);
  return b;
}

/** One-page PDF carrying a single DeviceRGB image XObject. */
async function pdfWithRgbImage(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const stream = doc.context.stream(new Uint8Array([255, 0, 0]), {
    Type: PDFName.of("XObject"),
    Subtype: PDFName.of("Image"),
    Width: 1,
    Height: 1,
    ColorSpace: PDFName.of("DeviceRGB"),
    BitsPerComponent: 8,
  });
  const ref = doc.context.register(stream);
  page.node.setXObject(PDFName.of("Im0"), ref);
  return doc.save();
}

async function loadWrapped(bytes: Uint8Array) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  return doc;
}

function outputIntentProfileDict(doc: PDFDocument) {
  const intents = doc.catalog.lookup(PDFName.of("OutputIntents"), PDFArray);
  const intent = intents.lookup(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileRef = (intent as any).get(PDFName.of("DestOutputProfile"));
  const stream = doc.context.lookup(profileRef) as PDFRawStream;
  return stream.dict;
}

function imageColorSpaces(doc: PDFDocument): string[] {
  const out: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue;
    const subtype = obj.dict.get(PDFName.of("Subtype"));
    if (!(subtype instanceof PDFName) || subtype.asString() !== "/Image") continue;
    const cs = obj.dict.get(PDFName.of("ColorSpace"));
    out.push(cs instanceof PDFName ? cs.asString() : "array");
  }
  return out;
}

describe("wrapPdfAsX4 colour handling", () => {
  const base = {
    trimSize: { widthIn: 8.5, heightIn: 11 },
    bleedIn: 0.125,
    iccProfileName: "GRACoL2013_CRPC6" as const,
  };

  it("matches /N and /Alternate to the embedded profile's colour space", async () => {
    const wrapped = await wrapPdfAsX4(await pdfWithRgbImage(), {
      ...base,
      iccProfileBytes: fakeIccHeader("CMYK"),
    });
    const dict = outputIntentProfileDict(await loadWrapped(wrapped));
    expect(dict.get(PDFName.of("N"))?.toString()).toBe("4");
    expect(dict.get(PDFName.of("Alternate"))?.toString()).toBe("/DeviceCMYK");
  });

  it("falls back to 3 / DeviceRGB for an RGB output profile", async () => {
    const wrapped = await wrapPdfAsX4(await pdfWithRgbImage(), {
      ...base,
      iccProfileBytes: fakeIccHeader("RGB "),
    });
    const dict = outputIntentProfileDict(await loadWrapped(wrapped));
    expect(dict.get(PDFName.of("N"))?.toString()).toBe("3");
    expect(dict.get(PDFName.of("Alternate"))?.toString()).toBe("/DeviceRGB");
  });

  it("retags DeviceRGB rasters as ICCBased so no untagged device colour ships", async () => {
    const before = imageColorSpaces(await loadWrapped(await pdfWithRgbImage()));
    expect(before).toContain("/DeviceRGB");

    const wrapped = await wrapPdfAsX4(await pdfWithRgbImage(), {
      ...base,
      iccProfileBytes: fakeIccHeader("CMYK"),
    });
    const doc = await loadWrapped(wrapped);
    expect(imageColorSpaces(doc)).not.toContain("/DeviceRGB");

    // The retagged entry must be [/ICCBased <ref>] pointing at an N=3 stream.
    let checked = false;
    for (const [, obj] of doc.context.enumerateIndirectObjects()) {
      if (!(obj instanceof PDFRawStream)) continue;
      const subtype = obj.dict.get(PDFName.of("Subtype"));
      if (!(subtype instanceof PDFName) || subtype.asString() !== "/Image") continue;
      const cs = obj.dict.get(PDFName.of("ColorSpace"));
      expect(cs).toBeInstanceOf(PDFArray);
      const arr = cs as PDFArray;
      expect(arr.get(0)?.toString()).toBe("/ICCBased");
      const profile = doc.context.lookup(arr.get(1)) as PDFRawStream;
      expect(profile.dict.get(PDFName.of("N"))?.toString()).toBe("3");
      checked = true;
    }
    expect(checked).toBe(true);
  });

  it("can be opted out of for printer preflight comparison", async () => {
    const wrapped = await wrapPdfAsX4(await pdfWithRgbImage(), {
      ...base,
      iccProfileBytes: fakeIccHeader("CMYK"),
      tagRastersAsSRgb: false,
    });
    expect(imageColorSpaces(await loadWrapped(wrapped))).toContain("/DeviceRGB");
  });

  it("writes a TrimBox inset from the media box by the bleed", async () => {
    const wrapped = await wrapPdfAsX4(await pdfWithRgbImage(), {
      ...base,
      iccProfileBytes: fakeIccHeader("CMYK"),
    });
    const doc = await loadWrapped(wrapped);
    const page = doc.getPages()[0]!;
    const trim = page.node.lookup(PDFName.of("TrimBox"), PDFArray);
    const media = page.node.lookup(PDFName.of("MediaBox"), PDFArray);
    const nums = (a: PDFArray) => a.asArray().map((n) => Number(n.toString()));
    expect(nums(media)).toEqual([0, 0, 8.75 * 72, 11.25 * 72]);
    expect(nums(trim)).toEqual([9, 9, 9 + 8.5 * 72, 9 + 11 * 72]);
  });
});
