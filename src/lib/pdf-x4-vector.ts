// -----------------------------------------------------------------------------
// PDF/X-4 conformance for *vector* PDFs we author with pdf-lib.
//
// `pdf-x4.ts` post-processes a finished raster PDF (jsPDF path). This module is
// the in-flight equivalent: call `applyPdfX4()` on a pdf-lib `PDFDocument` just
// before `save()` so Illustrator, Acrobat preflight and RIPs all treat the file
// as one standardised press document instead of a generic PDF.
//
// What it guarantees:
//   • PDF 1.7 header (X-4 needs ≥ 1.6)
//   • /OutputIntents with a GTS_PDF_X intent whose /DestOutputProfile is a real
//     embedded ICC profile, with /N + /Alternate matching that profile's space
//   • /DefaultRGB on every page mapped to ICCBased sRGB, so the DeviceRGB fills,
//     strokes, text and Type 4 mesh shadings we emit become device-INDEPENDENT
//     colour rather than untagged device colour (the usual X-4 preflight failure)
//   • XMP identification: pdfxid:GTS_PDFXVersion = "PDF/X-4", pdf:Trapped False
//   • MediaBox/TrimBox/BleedBox are left to the caller — the pillar builder
//     already sets numerically-correct boxes.
//
// It does NOT convert artwork to CMYK. Colour is supplied as tagged sRGB and the
// RIP separates to the output intent. That is legal X-4; some shops still ask
// for CMYK-native files, so confirm with the printer.
// -----------------------------------------------------------------------------

import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHeader,
  PDFName,
  PDFRawStream,
  type PDFRef,
} from "pdf-lib";
import { sRgbIccBytes } from "./icc-srgb";
import { fetchIccProfile, type IccProfileKey } from "./pdf-x4";

export interface ApplyPdfX4Options {
  /** Document title, written to XMP dc:title. */
  title: string;
  /** Authoring tool, written to XMP xmp:CreatorTool. */
  creator?: string;
  /** Output-intent profile. Defaults to GRACoL 2013 (CRPC6). */
  iccProfileName?: IccProfileKey;
  /** Pre-fetched profile bytes (skips the network round-trip). */
  iccProfileBytes?: Uint8Array;
}

export interface PdfX4Applied {
  /** Identifier written into the output intent. */
  outputIntent: string;
  /** Colour space of the embedded destination profile. */
  outputIntentSpace: string;
  /** False when the CMYK profile was unavailable and sRGB was embedded instead. */
  cmykIntent: boolean;
}

const DEFAULT_PROFILE: IccProfileKey = "GRACoL2013_CRPC6";

function spaceOf(icc: Uint8Array): { space: string; n: number; alt: string } {
  const space = String.fromCharCode(icc[16]!, icc[17]!, icc[18]!, icc[19]!).trim();
  if (space === "CMYK") return { space, n: 4, alt: "DeviceCMYK" };
  if (space === "GRAY") return { space, n: 1, alt: "DeviceGray" };
  return { space: space || "RGB", n: 3, alt: "DeviceRGB" };
}

export async function applyPdfX4(doc: PDFDocument, opts: ApplyPdfX4Options): Promise<PdfX4Applied> {
  const wanted = opts.iccProfileName ?? DEFAULT_PROFILE;

  // ── destination profile ────────────────────────────────────────────────────
  let destBytes = opts.iccProfileBytes ?? null;
  let destName: string = wanted;
  if (!destBytes) {
    try {
      destBytes = await fetchIccProfile(wanted);
    } catch {
      // Offline / non-browser: fall back to an sRGB output intent. Still a
      // valid X-4 intent, just device-independent RGB rather than press CMYK.
      destBytes = sRgbIccBytes();
      destName = "sRGB IEC61966-2.1";
    }
  }
  const dest = spaceOf(destBytes);

  doc.context.header = PDFHeader.forVersion(1, 7);
  doc.setProducer(opts.creator ?? "TransPerfect Element");
  doc.setCreationDate(new Date());
  doc.setModificationDate(new Date());

  const destStream = doc.context.stream(destBytes, {
    N: dest.n,
    Alternate: PDFName.of(dest.alt),
  });
  const destRef = doc.context.register(destStream);

  const intent = doc.context.obj({
    Type: PDFName.of("OutputIntent"),
    S: PDFName.of("GTS_PDF_X"),
    OutputConditionIdentifier: doc.context.obj(destName),
    Info: doc.context.obj(destName),
    RegistryName: doc.context.obj("http://www.color.org"),
    DestOutputProfile: destRef,
  });
  const intents = PDFArray.withContext(doc.context);
  intents.push(intent);
  doc.catalog.set(PDFName.of("OutputIntents"), intents);

  // ── tag DeviceRGB content as sRGB via /DefaultRGB ──────────────────────────
  const srgbStream = doc.context.stream(sRgbIccBytes(), {
    N: 3,
    Alternate: PDFName.of("DeviceRGB"),
  });
  const srgbRef: PDFRef = doc.context.register(srgbStream);
  const srgbSpace = PDFArray.withContext(doc.context);
  srgbSpace.push(PDFName.of("ICCBased"));
  srgbSpace.push(srgbRef);

  for (const page of doc.getPages()) {
    const resources = page.node.Resources();
    if (!resources) continue;
    const existing = resources.lookupMaybe(PDFName.of("ColorSpace"), PDFDict);
    const dict = existing ?? doc.context.obj({});
    if (!existing) resources.set(PDFName.of("ColorSpace"), dict);
    dict.set(PDFName.of("DefaultRGB"), srgbSpace);
  }

  // ── XMP identification ─────────────────────────────────────────────────────
  const xmpBytes = new TextEncoder().encode(
    buildXmp({ title: opts.title, creator: opts.creator, intent: destName }),
  );
  const metaRef = doc.context.register(
    PDFRawStream.of(
      doc.context.obj({
        Type: PDFName.of("Metadata"),
        Subtype: PDFName.of("XML"),
        Length: xmpBytes.length,
      }),
      xmpBytes,
    ),
  );
  doc.catalog.set(PDFName.of("Metadata"), metaRef);

  return {
    outputIntent: destName,
    outputIntentSpace: dest.space,
    cmykIntent: dest.space === "CMYK",
  };
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildXmp(opts: { title: string; creator?: string; intent: string }): string {
  const now = new Date().toISOString();
  const title = xmlEscape(opts.title);
  const creator = xmlEscape(opts.creator ?? "TransPerfect Element");
  const intent = xmlEscape(opts.intent);
  return `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="pdf-lib">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:dc="http://purl.org/dc/elements/1.1/"
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:pdf="http://ns.adobe.com/pdf/1.3/"
        xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/">
      <dc:title><rdf:Alt><rdf:li xml:lang="x-default">${title}</rdf:li></rdf:Alt></dc:title>
      <xmp:CreatorTool>${creator}</xmp:CreatorTool>
      <xmp:CreateDate>${now}</xmp:CreateDate>
      <xmp:ModifyDate>${now}</xmp:ModifyDate>
      <pdf:Producer>TransPerfect Element (pdf-lib vector press writer)</pdf:Producer>
      <pdf:Trapped>False</pdf:Trapped>
      <pdfxid:GTS_PDFXVersion>PDF/X-4</pdfxid:GTS_PDFXVersion>
      <pdfxid:GTS_PDFXConformance>PDF/X-4</pdfxid:GTS_PDFXConformance>
      <photoshop:ICCProfile xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/">${intent}</photoshop:ICCProfile>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}
