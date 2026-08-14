// -----------------------------------------------------------------------------
// [Content_Types].xml hygiene
//
// pptxgenjs emits one `slideMaster{n}.xml` Override per SLIDE while writing a
// single `slideMaster1.xml` part (see its makeXmlContTypes: the master Override
// is inside the per-slide loop). Any deck with more than one slide therefore
// declares content types for parts that do not exist in the package.
//
// LibreOffice ignores the phantom declarations, which is why our render-based QA
// never caught it. Real Office does not: the Office conversion service refuses
// the package outright (`cannotOpenFile`), and desktop PowerPoint shows the
// "found a problem with content" repair prompt. OPC requires every Override to
// name a part that is present.
//
// This pass drops Override entries whose PartName is absent from the zip, and
// (defensively) adds Overrides for present-but-undeclared presentation parts.
// -----------------------------------------------------------------------------

import type JSZip from "jszip";

const CONTENT_TYPES = "[Content_Types].xml";

/** ContentType strings for the presentation parts we may have to re-declare. */
const KNOWN: ReadonlyArray<{ test: RegExp; type: string }> = [
  {
    test: /^ppt\/slides\/slide\d+\.xml$/,
    type: "application/vnd.openxmlformats-officedocument.presentationml.slide+xml",
  },
  {
    test: /^ppt\/slideMasters\/slideMaster\d+\.xml$/,
    type: "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml",
  },
  {
    test: /^ppt\/slideLayouts\/slideLayout\d+\.xml$/,
    type: "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml",
  },
  {
    test: /^ppt\/notesSlides\/notesSlide\d+\.xml$/,
    type: "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml",
  },
  {
    test: /^ppt\/notesMasters\/notesMaster\d+\.xml$/,
    type: "application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml",
  },
  {
    test: /^ppt\/charts\/chart\d+\.xml$/,
    type: "application/vnd.openxmlformats-officedocument.drawingml.chart+xml",
  },
];

export interface ContentTypeFixResult {
  /** PartNames removed because the part is not in the package. */
  removed: string[];
  /** PartNames added because the part exists but was undeclared. */
  added: string[];
}

/**
 * Rewrite `[Content_Types].xml` so its Override list matches the parts actually
 * present in `zip`. Mutates the zip in place; safe to call on any package.
 */
export function fixContentTypes(zip: JSZip, xml: string): ContentTypeFixResult & { xml: string } {
  const present = new Set(
    Object.keys(zip.files)
      .filter((n) => !zip.files[n]!.dir)
      .map((n) => `/${n}`),
  );
  const removed: string[] = [];
  let out = xml.replace(
    /<Override\s+PartName="([^"]+)"[^>]*\/>/g,
    (whole, partName: string) => {
      if (present.has(partName)) return whole;
      removed.push(partName);
      return "";
    },
  );

  const declared = new Set(
    Array.from(out.matchAll(/<Override\s+PartName="([^"]+)"/g), (m) => m[1] as string),
  );
  const added: string[] = [];
  let insert = "";
  for (const name of Object.keys(zip.files)) {
    if (zip.files[name]!.dir) continue;
    const partName = `/${name}`;
    if (declared.has(partName)) continue;
    const known = KNOWN.find((k) => k.test.test(name));
    if (!known) continue;
    insert += `<Override PartName="${partName}" ContentType="${known.type}"/>`;
    added.push(partName);
  }
  if (insert) out = out.replace("</Types>", `${insert}</Types>`);

  return { removed, added, xml: out };
}

/**
 * Apply {@link fixContentTypes} to a loaded package. Returns the number of
 * Override entries changed (0 when the package was already consistent).
 */
export async function repairContentTypes(zip: JSZip): Promise<number> {
  const file = zip.file(CONTENT_TYPES);
  if (!file) return 0;
  const xml = await file.async("string");
  const res = fixContentTypes(zip, xml);
  if (!res.removed.length && !res.added.length) return 0;
  zip.file(CONTENT_TYPES, res.xml);
  if (res.removed.length) {
    console.info(
      `[pptx-content-types] dropped ${res.removed.length} orphan Override(s): ${res.removed.slice(0, 4).join(", ")}${res.removed.length > 4 ? "…" : ""}`,
    );
  }
  return res.removed.length + res.added.length;
}
