// Pillar vector export regression.
//
// Renders sample pillars through the layered vector builder and diffs a
// structural fingerprint of the PDF against a committed snapshot, so
// Illustrator-specific regressions (missing layers, unsupported shading types,
// subset fonts, rasterised grounds, drifting page/trim geometry) fail here
// before they reach a printer.

import { describe, expect, it } from "vitest";

import { buildPillarVectorPdf, type PillarVectorResult } from "@/lib/pillar-vector-pdf";
import { pillarDefault, withPillarKind, type PillarConfig } from "@/lib/next-pillar-masters";

const latin1 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return s;
};

const count = (hay: string, needle: string) => hay.split(needle).length - 1;

/** Bucketed so tiny sampling changes do not churn the snapshot, while a real
 *  structural change (a lost layer, a vanished mesh) still moves the numbers. */
const bucket = (n: number) => (n === 0 ? 0 : Math.max(1, Math.round(n / 10) * 10));

type Fingerprint = {
  page: string;
  layers: string[];
  boxes: { media: boolean; trim: boolean; bleed: boolean };
  meshShading: number;
  legacyShading: number;
  rasterImages: number;
  fontsEmbedded: number;
  subsetFont: boolean;
  textShowOps: number;
  fillOps: number;
  clips: number;
  pdfVersion: string;
  pdfx: { conformance: string; outputIntent: boolean; defaultRgb: boolean };
};

function fingerprint(result: PillarVectorResult): Fingerprint {
  const raw = latin1(result.bytes);
  return {
    page: `${Math.round(result.page.widthPt)}x${Math.round(result.page.heightPt)}pt`,
    layers: result.layers,
    boxes: {
      media: raw.includes("/MediaBox"),
      trim: raw.includes("/TrimBox"),
      bleed: raw.includes("/BleedBox"),
    },
    meshShading: count(raw, "/ShadingType 4"),
    legacyShading: count(raw, "/ShadingType 2") + count(raw, "/ShadingType 3"),
    rasterImages: count(raw, "/Subtype /Image"),
    fontsEmbedded: count(raw, "/FontFile2") + count(raw, "/FontFile3"),
    subsetFont: /\/BaseFont \/[A-Z]{6}\+/.test(raw),
    textShowOps: bucket(count(raw, " Tj")),
    fillOps: bucket(count(raw, "\nf\n") + count(raw, "\nf*\n")),
    clips: bucket(count(raw, "\nW n\n") + count(raw, " W n")),
    pdfVersion: raw.slice(0, 8),
    pdfx: {
      conformance: result.pdfx.conformance,
      outputIntent: result.pdfx.outputIntent,
      defaultRgb: result.pdfx.defaultRgb,
    },
  };
}

const samples: { name: string; config: PillarConfig }[] = [
  {
    name: "welcome-dark-vertical",
    config: { ...pillarDefault(), headline: "WELCOME" },
  },
  {
    name: "registration-light",
    config: {
      ...withPillarKind(pillarDefault(), "registration"),
      face: "light",
      verticalHeadline: false,
    },
  },
  {
    name: "directional-chevron",
    config: {
      ...withPillarKind(pillarDefault(), "directional"),
      headline: "MAIN STAGE",
      arrow: "right",
      arrowStyle: "chevron",
      verticalHeadline: false,
    } as PillarConfig,
  },
  {
    name: "logo-with-qr",
    config: {
      ...withPillarKind(pillarDefault(), "logo"),
      qrData: "https://transperfect.com/next",
      qrSize: 220,
      qrCaption: "Register",
      subheadline: "transperfect.com/next",
    },
  },
];

describe("pillar vector export regression", () => {
  for (const sample of samples) {
    it(`keeps the Illustrator-safe vector structure for ${sample.name}`, async () => {
      const result = await buildPillarVectorPdf(sample.config);
      const fp = fingerprint(result);

      // Illustrator-specific invariants — these are the failures printers see.
      expect(fp.pdfVersion.startsWith("%PDF-1.7"), "PDF 1.7 header").toBe(true);
      expect(fp.legacyShading, "only Type 4 mesh shadings survive Illustrator").toBe(0);
      expect(fp.meshShading, "ground must be a live mesh gradient").toBeGreaterThan(0);
      expect(fp.subsetFont, "subset cmaps render as .notdef boxes").toBe(false);
      expect(fp.layers.length, "seven named layers (OCGs)").toBe(7);
      expect(fp.boxes).toEqual({ media: true, trim: true, bleed: true });
      expect(fp.clips, "ground is clipped to the bleed sheet").toBeGreaterThan(0);

      expect(fp).toMatchSnapshot();
    });
  }

  it("diffs two faces of the same sign rather than emitting identical art", async () => {
    const dark = await buildPillarVectorPdf({ ...pillarDefault(), face: "dark" });
    const light = await buildPillarVectorPdf({ ...pillarDefault(), face: "light" });
    expect(latin1(dark.bytes)).not.toEqual(latin1(light.bytes));
    expect(dark.layers).toEqual(light.layers);
  });
});
