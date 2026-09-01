/**
 * Enforce the child ordering of `<p:presentation>` that Office itself accepts.
 *
 * pptxgenjs emits `sldMasterIdLst → sldIdLst → notesMasterIdLst`, and font
 * embedding used to append `embeddedFontLst` last. Both PowerPoint desktop and
 * the Office conversion service refuse a deck whose `presentation.xml` strays
 * from the sequence below — proven by bisecting a refused export down to this
 * single part: moving `notesMasterIdLst` ahead of `sldIdLst` (the literal
 * ECMA-376 sequence) makes Office answer
 * `PPTCannotOpenFileMetroFileCorruption`, and moving it back makes the very
 * same package open. So we normalise to the accepted, real-world order and
 * re-assert it after every pass that rewrites presentation.xml. Re-sequencing is
 * content-preserving: each element is position-independent in meaning.
 */

import type JSZip from "jszip";

const PRES_PATH = "ppt/presentation.xml";

/** Child sequence Office accepts (verified against the Office renderer). */
const PRES_ORDER = [
  "p:sldMasterIdLst",
  "p:sldIdLst",
  "p:notesMasterIdLst",
  "p:handoutMasterIdLst",
  "p:sldSz",
  "p:notesSz",
  "p:smartTags",
  "p:embeddedFontLst",
  "p:custShowLst",
  "p:photoAlbum",
  "p:custDataLst",
  "p:kinsoku",
  "p:defaultTextStyle",
  "p:modifyVerifier",
  "p:extLst",
];


function block(xml: string, tag: string): { start: number; end: number; text: string } | null {
  const open = new RegExp(`<${tag}\\b[^>]*?(/?)>`);
  const m = open.exec(xml);
  if (!m) return null;
  if (m[1] === "/") {
    return { start: m.index, end: m.index + m[0].length, text: m[0] };
  }
  const closeIdx = xml.indexOf(`</${tag}>`, m.index);
  if (closeIdx === -1) return null;
  const end = closeIdx + `</${tag}>`.length;
  return { start: m.index, end, text: xml.slice(m.index, end) };
}

/**
 * Returns the XML with `<p:presentation>`'s children re-sequenced into the
 * accepted order. Idempotent; a no-op when fewer than two known children are
 * present, and it never invents, drops or rewrites an element.
 */
export function orderPresentationLists(xml: string): string {
  const found = PRES_ORDER.map((tag) => ({ tag, ...(block(xml, tag) ?? {}) })).filter(
    (b): b is { tag: string; start: number; end: number; text: string } =>
      typeof b.start === "number",
  );
  if (found.length < 2) return xml;

  const positional = [...found].sort((a, b) => a.start - b.start);
  const alreadyOrdered = positional.every(
    (b, i) => PRES_ORDER.indexOf(b.tag) >= (i ? PRES_ORDER.indexOf(positional[i - 1].tag) : -1),
  );
  if (alreadyOrdered) return xml;

  // Anything between the first and last known child that we did not account for
  // (unexpected element, comment) means we cannot safely rebuild the region.
  const first = positional[0].start;
  const last = positional[positional.length - 1].end;
  const covered = positional.reduce((n, b) => n + (b.end - b.start), 0);
  const between = xml.slice(first, last).replace(/\s+/g, "");
  const consumed = positional.reduce((n, b) => n + b.text.replace(/\s+/g, "").length, 0);
  if (between.length !== consumed || covered <= 0) return xml;

  const rebuilt = PRES_ORDER.map((tag) => found.find((b) => b.tag === tag)?.text ?? "").join("");
  return xml.slice(0, first) + rebuilt + xml.slice(last);
}

/** Applies {@link orderPresentationLists} in place. Returns 1 when it changed. */
export async function repairPresentationOrder(zip: JSZip): Promise<number> {
  const file = zip.file(PRES_PATH);
  if (!file) return 0;
  const xml = await file.async("string");
  const next = orderPresentationLists(xml);
  if (next === xml) return 0;
  zip.file(PRES_PATH, next);
  return 1;
}
