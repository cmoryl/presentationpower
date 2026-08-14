/**
 * Enforce the child ordering of `<p:presentation>` that PowerPoint (and
 * Microsoft's own Office conversion service) actually accepts:
 *
 *   sldMasterIdLst → sldIdLst → notesMasterIdLst → …
 *
 * pptxgenjs already emits `notesMasterIdLst` after `sldIdLst`, and Office
 * refuses the package outright (`cannotOpenFile` / UnsupportedMediaType) when
 * that element is hoisted to the schema-listed position ahead of `sldIdLst`
 * — verified by bisecting a real PowerPoint render. Any pass that rewrites
 * `ppt/presentation.xml` (font embedding, master background, future work) can
 * accidentally reshuffle it, so this post-pass re-asserts the accepted order
 * instead of trusting the generator.
 */

import type JSZip from "jszip";

const PRES_PATH = "ppt/presentation.xml";

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
 * Returns the XML with `<p:notesMasterIdLst>` positioned immediately after
 * `<p:sldIdLst>`. Idempotent, and a no-op when either element is absent.
 */
export function orderPresentationLists(xml: string): string {
  const notes = block(xml, "p:notesMasterIdLst");
  const slides = block(xml, "p:sldIdLst");
  if (!notes || !slides) return xml;
  // Already in the accepted order.
  if (notes.start > slides.end) return xml;

  const withoutNotes = xml.slice(0, notes.start) + xml.slice(notes.end);
  const shift = notes.end - notes.start;
  const insertAt = slides.end - (slides.start > notes.start ? shift : 0);
  return withoutNotes.slice(0, insertAt) + notes.text + withoutNotes.slice(insertAt);
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
