/**
 * PDF/X-4 conformance wrapper.
 *
 * Post-processes a jsPDF-produced PDF (single-image-per-page raster) so
 * the resulting bytes are PDF/X-4 conformant:
 *
 *   • Header set to PDF version 1.7
 *   • Each page carries a numerically-correct TrimBox and BleedBox
 *   • Catalog carries an /OutputIntents array with a GTS_PDF_X intent
 *     whose /DestOutputProfile is an embedded ICC profile stream
 *   • Catalog carries an XMP /Metadata stream declaring
 *     pdfxid:GTS_PDFXVersion = "PDF/X-4"
 *
 * The current raster export contains **no live text, no live transparency,
 * and no embedded fonts** (every page is a single flat PNG). That means
 * the two hardest X-4 requirements are satisfied by construction — this
 * wrapper only needs to add the identification and page-box metadata a
 * printer's RIP looks for.
 *
 * All work is client-side. No native binaries. No server round-trip.
 */

import {
  PDFArray,
  PDFDocument,
  PDFHeader,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFString,
} from "pdf-lib";
import gracolAsset from "@/assets/icc/GRACoL2013_CRPC6.icc.asset.json";
import swopAsset from "@/assets/icc/SWOP2013_CRPC5.icc.asset.json";

export type IccProfileKey = "GRACoL2013_CRPC6" | "SWOP2013_CRPC5";

/** Public catalog of supported output-intent profiles. */
export const X4_ICC_PROFILES: Record<
  IccProfileKey,
  { label: string; url: string; description: string }
> = {
  GRACoL2013_CRPC6: {
    label: "GRACoL 2013 (CRPC6) — US premium coated",
    url: gracolAsset.url,
    description: "Default. Modern US coated stock. Recommended for most premium print work.",
  },
  SWOP2013_CRPC5: {
    label: "SWOP 2013 (CRPC5) — US publication coated",
    url: swopAsset.url,
    description: "Legacy publication/magazine standard. Use only if the printer requests it.",
  },
};

/** In-memory cache — an ICC profile is ~3.4 MB and immutable. */
const ICC_CACHE = new Map<IccProfileKey, Uint8Array>();

/** Fetch and cache an ICC profile from CDN. Browser-only. */
export async function fetchIccProfile(name: IccProfileKey): Promise<Uint8Array> {
  const cached = ICC_CACHE.get(name);
  if (cached) return cached;
  const url = X4_ICC_PROFILES[name].url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ICC profile ${name}: HTTP ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  // Sanity check: bytes 36..39 must equal "acsp" for a valid ICC profile.
  const sig = String.fromCharCode(buf[36]!, buf[37]!, buf[38]!, buf[39]!);
  if (sig !== "acsp") throw new Error(`ICC profile ${name} is corrupt (sig=${sig})`);
  ICC_CACHE.set(name, buf);
  return buf;
}

export interface WrapPdfAsX4Options {
  /** Trim size in inches (final cut size, before bleed). */
  trimSize: { widthIn: number; heightIn: number };
  /** Bleed in inches. The wrapper assumes the incoming PDF's MediaBox
   *  already includes bleed on all four sides. */
  bleedIn: number;
  /** ICC profile bytes to embed as the OutputIntent's DestOutputProfile. */
  iccProfileBytes: Uint8Array;
  /** Human-readable identifier written into the OutputIntent dict. */
  iccProfileName: IccProfileKey;
  /** Optional document title for XMP dc:title. */
  title?: string;
  /** Optional creator for XMP xmp:CreatorTool. */
  creator?: string;
}

const IN_TO_PT = 72;

/**
 * Wrap a raster-only PDF as PDF/X-4.
 *
 * Requires that the incoming PDF's page MediaBox already equals
 * `(trim + 2×bleed)` in inches — which is what `exportPrintAssetAsPdf`
 * produces when `bleedIn` is set.
 */
export async function wrapPdfAsX4(
  pdfBytes: Uint8Array | ArrayBuffer,
  opts: WrapPdfAsX4Options,
): Promise<Uint8Array> {
  const source = pdfBytes instanceof Uint8Array ? pdfBytes : new Uint8Array(pdfBytes);

  const pdfDoc = await PDFDocument.load(source, { updateMetadata: false });

  // ── PDF 1.7 ────────────────────────────────────────────────────────────
  // jsPDF emits PDF 1.3 in its default configuration. PDF/X-4 requires
  // at least 1.6; 1.7 is preferred. pdf-lib exposes header on the context.
  pdfDoc.context.header = PDFHeader.forVersion(1, 7);

  // ── Page boxes ─────────────────────────────────────────────────────────
  const bleedPt = opts.bleedIn * IN_TO_PT;
  const trimWpt = opts.trimSize.widthIn * IN_TO_PT;
  const trimHpt = opts.trimSize.heightIn * IN_TO_PT;
  const mediaWpt = trimWpt + bleedPt * 2;
  const mediaHpt = trimHpt + bleedPt * 2;

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    // Ensure MediaBox is authoritative (matches what jsPDF produced).
    page.node.set(PDFName.of("MediaBox"), pdfDoc.context.obj([0, 0, mediaWpt, mediaHpt]));
    page.node.set(PDFName.of("BleedBox"), pdfDoc.context.obj([0, 0, mediaWpt, mediaHpt]));
    page.node.set(
      PDFName.of("TrimBox"),
      pdfDoc.context.obj([bleedPt, bleedPt, bleedPt + trimWpt, bleedPt + trimHpt]),
    );
  }

  // ── ICC profile stream (DestOutputProfile) ────────────────────────────
  // Uncompressed raw stream is safest for printer-side conformance
  // checkers. `context.stream` creates a PDFRawStream with no filter.
  const iccStream = pdfDoc.context.stream(opts.iccProfileBytes, {
    N: 3, // RGB output profile — 3 color components
    Alternate: PDFName.of("DeviceRGB"),
  });
  const iccRef = pdfDoc.context.register(iccStream);

  // ── OutputIntent dictionary ───────────────────────────────────────────
  const oiDict = pdfDoc.context.obj({
    Type: PDFName.of("OutputIntent"),
    S: PDFName.of("GTS_PDF_X"),
    OutputConditionIdentifier: PDFString.of(opts.iccProfileName),
    Info: PDFString.of(opts.iccProfileName),
    RegistryName: PDFString.of("http://www.color.org"),
    DestOutputProfile: iccRef,
  });
  const oiArray = PDFArray.withContext(pdfDoc.context);
  oiArray.push(oiDict);
  pdfDoc.catalog.set(PDFName.of("OutputIntents"), oiArray);

  // ── XMP metadata (PDF/X-4 identification) ─────────────────────────────
  const xmp = buildXmpMetadata({
    title: opts.title,
    creator: opts.creator,
    iccProfileName: opts.iccProfileName,
  });
  const xmpBytes = new TextEncoder().encode(xmp);
  const metaStream = PDFRawStream.of(
    pdfDoc.context.obj({
      Type: PDFName.of("Metadata"),
      Subtype: PDFName.of("XML"),
      Length: xmpBytes.length,
    }),
    xmpBytes,
  );
  const metaRef = pdfDoc.context.register(metaStream);
  pdfDoc.catalog.set(PDFName.of("Metadata"), metaRef);

  // ── Save ──────────────────────────────────────────────────────────────
  // Keep object streams enabled — PDF 1.5+ compressed xref/objstm is
  // permitted under X-4 and reduces file size meaningfully.
  return pdfDoc.save({ useObjectStreams: true });
}

// ─────────────────────────────────────────────────────────────────────────
// XMP construction
// ─────────────────────────────────────────────────────────────────────────

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildXmpMetadata(opts: {
  title?: string;
  creator?: string;
  iccProfileName: IccProfileKey;
}): string {
  const now = new Date().toISOString();
  const title = xmlEscape(opts.title ?? "Print asset");
  const creator = xmlEscape(opts.creator ?? "TransPerfect Presentation Suite");
  // Canonical XMP packet. The `pdfxid` namespace is the PDF/X identifier
  // registered by NPES.
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
      <pdf:Producer>pdf-lib + jsPDF (PDF/X-4 wrapper)</pdf:Producer>
      <pdfxid:GTS_PDFXVersion>PDF/X-4</pdfxid:GTS_PDFXVersion>
      <pdfxid:GTS_PDFXConformance>PDF/X-4</pdfxid:GTS_PDFXConformance>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

// Silence unused-import warnings in strict builds (some symbols are only
// used indirectly through the pdf-lib object graph).
export const _unusedImportGuard = { PDFHexString };
