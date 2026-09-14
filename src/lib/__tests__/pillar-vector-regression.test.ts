// Pillar vector export regression.
//
// Renders sample pillars through the layered vector builder and diffs a
// structural fingerprint of the PDF against a committed snapshot, so
// Illustrator-specific regressions (missing layers, unsupported shading types,
// subset fonts, rasterised grounds, drifting page/trim geometry) fail here
// before they reach a printer.

import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { buildPillarVectorPdf, type PillarVectorResult } from "@/lib/pillar-vector-pdf";
import { pillarDefault, withPillarKind, type PillarConfig } from "@/lib/next-pillar-masters";

const latin1 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 1) s += String.fromCharCode(bytes[i]!);
  return s;
};

/** Content streams are Flate-compressed; operator-level checks need them back. */
function operators(bytes: Uint8Array): string {
  const raw = latin1(bytes);
  let out = "";
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const start = m.index + m[0].length;
    const end = raw.indexOf("endstream", start);
    if (end < 0) continue;
    const slice = bytes.subarray(start, end);
    try {
      out += inflateSync(slice).toString("latin1") + "\n";
    } catch {
      out += latin1(slice) + "\n";
    }
  }
  return out;
}

const count = (hay: string, re: RegExp) => (hay.match(re) ?? []).length;

/** Bucketed so tiny sampling changes do not churn the snapshot, while a real
 *  structural change (a lost layer, a vanished mesh) still moves the numbers. */
const bucket = (n: number) => (n === 0 ? 0 : Math.max(1, Math.round(n / 10) * 10));

type Fingerprint = {
  page: string;
  layers: string[];
  boxes: { media: boolean; trim: boolean; bleed: boolean };
  meshShading: number;
  legacyShading: number;
  gradientPattern: number;
  rasterImages: number;
  fontsEmbedded: number;
  subsetFont: boolean;
  textShowOps: number;
  fillOps: number;
  clips: number;
  pdfVersion: string;
  pdfx: { outputIntent: string; outputIntentSpace: string };
};

function fingerprint(result: PillarVectorResult): Fingerprint {
  const raw = latin1(result.bytes);
  const ops = operators(result.bytes);
  const both = raw + "\n" + ops;
  return {
    page: `${Math.round(result.page.widthPt)}x${Math.round(result.page.heightPt)}pt`,
    layers: result.layers,
    boxes: {
      media: raw.includes("/MediaBox"),
      trim: raw.includes("/TrimBox"),
      bleed: raw.includes("/BleedBox"),
    },
    meshShading: count(both, /\/ShadingType 4/g),
    legacyShading: count(both, /\/ShadingType [23]/g),
    gradientPattern: count(both, /\/PatternType 2/g),
    rasterImages: count(both, /\/Subtype ?\/Image/g),
    fontsEmbedded: count(raw, /\/FontFile[23]?/g),
    subsetFont: /\/BaseFont ?\/[A-Z]{6}\+/.test(raw),
    textShowOps: bucket(count(ops, /\bTj\b/g)),
    fillOps: bucket(count(ops, /(^|[\s\n])f\*?[\s\n]/g)),
    clips: bucket(count(ops, /\bW\s+n\b/g)),
    pdfVersion: raw.slice(0, 8),
    pdfx: {
      outputIntent: result.pdfx.outputIntent,
      outputIntentSpace: result.pdfx.outputIntentSpace,
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
    name: "next-ascend-chevron-template",
    config: {
      ...pillarDefault(),
      templateId: "next-ascend",
      headline: "LIFT YOUR GLOBAL PROFILE",
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
      // The ground must be an EDITABLE gradient: an analytic axial/radial shading
      // (Type 2/3) used as a pattern fill on a path — what Illustrator writes for
      // a gradient-filled object. A Type 4 mesh prints fine but opens as a
      // gradient mesh a designer cannot retune, so it must not come back.
      expect(fp.meshShading, "no gradient meshes — they are not editable").toBe(0);
      expect(fp.legacyShading, "ground is an analytic axial/radial shading").toBeGreaterThan(0);
      expect(fp.gradientPattern, "shading is a pattern fill on a path").toBeGreaterThan(0);
      expect(fp.subsetFont, "subset cmaps render as .notdef boxes").toBe(false);
      expect(fp.layers.length, "nine named layers (OCGs)").toBe(9);
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
