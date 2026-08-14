/**
 * Embed the app's exact fonts (Geist) into a generated PPTX so PowerPoint
 * does not substitute typography on machines that don't have Geist installed.
 *
 * OOXML approach:
 *  - Store each font weight/style as a .fntdata part under ppt/fonts/
 *  - Register a Default content type for .fntdata
 *  - Add a font relationship per part to presentation.xml.rels
 *  - Inject <p:embeddedFontLst> into presentation.xml linking the parts
 *  - Reorder the <p:presentation> children into CT_Presentation schema order
 *
 * FONT DATA IS *NOT* OBFUSCATED HERE. The XOR/GUID obfuscation described in
 * ECMA-376 is the WORD convention: Word declares
 * `application/vnd.openxmlformats-officedocument.obfuscatedFont` and carries the
 * key in `w:fontKey`. PowerPoint has no place to put that key — it writes raw
 * TTF/OTF bytes under the `application/x-fontdata` content type, and its font
 * loader silently rejects a part whose sfnt header has been scrambled (verified
 * by scripts/verify-font-compat.mjs, which also caught the earlier obfuscated
 * variant being dropped by LibreOffice).
 */

import JSZip from "jszip";
import {
  CANONICAL_FONTS,
  FONT_PANOSE,
  normalizeTypefacesInXml,
  patchThemeFontScheme,
} from "./pptx-font-map";

const FONT_URLS: Record<"regular" | "bold" | "italic" | "boldItalic", string> = {
  regular: "/fonts/Geist-Regular.ttf",
  bold: "/fonts/Geist-Bold.ttf",
  italic: "/fonts/Geist-Italic.ttf",
  boldItalic: "/fonts/Geist-BoldItalic.ttf",
};

const fontCache: Partial<Record<keyof typeof FONT_URLS, Uint8Array>> = {};

async function fetchFont(kind: keyof typeof FONT_URLS): Promise<Uint8Array | null> {
  if (fontCache[kind]) return fontCache[kind]!;
  try {
    const res = await fetch(FONT_URLS[kind]);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    fontCache[kind] = buf;
    return buf;
  } catch {
    return null;
  }
}

/** PowerPoint's own content type for an embedded font part. */
const FNTDATA_CONTENT_TYPE = "application/x-fontdata";

/**
 * Child order of CT_Presentation (ECMA-376 Part 1 §19.2.1.26). PowerPoint 2007
 * validates this strictly and refuses the file ("repair" prompt) when children
 * are out of sequence; pptxgenjs emits notesMasterIdLst after sldIdLst, so the
 * package is re-sequenced on the way out.
 */
const PRES_CHILD_ORDER = [
  "sldMasterIdLst",
  "notesMasterIdLst",
  "handoutMasterIdLst",
  "sldIdLst",
  "sldSz",
  "notesSz",
  "smartTags",
  "embeddedFontLst",
  "custShowLst",
  "photoAlbum",
  "custDataLst",
  "kinsoku",
  "defaultTextStyle",
  "modifyVerifier",
  "extLst",
] as const;

function reorderPresentationChildren(xml: string): string {
  const open = xml.match(/<p:presentation[^>]*>/);
  const closeIdx = xml.lastIndexOf("</p:presentation>");
  if (!open || closeIdx < 0) return xml;
  const head = xml.slice(0, (open.index ?? 0) + open[0].length);
  let body = xml.slice((open.index ?? 0) + open[0].length, closeIdx);

  const found: Array<{ name: string; xml: string }> = [];
  for (const name of PRES_CHILD_ORDER) {
    const paired = new RegExp(`<p:${name}(?:\\s[^>]*)?>[\\s\\S]*?<\\/p:${name}>`);
    const empty = new RegExp(`<p:${name}(?:\\s[^>]*)?\\/>`);
    const m = body.match(paired) ?? body.match(empty);
    if (!m) continue;
    found.push({ name, xml: m[0] });
    body = body.replace(m[0], "");
  }
  if (!found.length) return xml;
  const ordered = PRES_CHILD_ORDER.map((n) => found.find((f) => f.name === n)?.xml ?? "").join("");
  // `body` now holds only whatever we did not recognize — keep it after the
  // known children rather than dropping it.
  return `${head}${ordered}${body.trim()}</p:presentation>`;
}


/**
 * Post-process a pptxgenjs-produced Blob so PowerPoint renders the brand
 * typography. Returns a new Blob; on any failure the original blob is returned
 * so exports are never blocked.
 *
 * `embedFontData` (default true) controls only whether the Geist font FILES ride
 * along inside the package:
 *  · true  — the deck looks identical on machines without Geist installed,
 *            +~1 MB of file size.
 *  · false — smaller file; PowerPoint substitutes a system font on machines
 *            without Geist, so text can rewrap.
 * Typeface naming and the theme font scheme are normalized either way, so the
 * deck always ASKS for the brand face.
 */
export async function embedFontsInPptx(
  blob: Blob,
  opts?: { embedFontData?: boolean },
): Promise<Blob> {
  const embedFontData = opts?.embedFontData !== false;
  try {
    const [regular, bold, italic, boldItalic] = embedFontData
      ? await Promise.all([
          fetchFont("regular"),
          fetchFont("bold"),
          fetchFont("italic"),
          fetchFont("boldItalic"),
        ])
      : [null, null, null, null];
    if (embedFontData && !regular) return blob;

    const zip = await JSZip.loadAsync(blob);

    // Prepare font parts (only those we actually fetched).
    const parts: Array<{ kind: keyof typeof FONT_URLS; data: Uint8Array }> = [];
    if (regular) parts.push({ kind: "regular", data: regular });
    if (bold) parts.push({ kind: "bold", data: bold });
    if (italic) parts.push({ kind: "italic", data: italic });
    if (boldItalic) parts.push({ kind: "boldItalic", data: boldItalic });

    parts.forEach((p, idx) => {
      const fileName = `font${idx + 1}.fntdata`;
      // Raw sfnt bytes — see the header note: PowerPoint does not obfuscate.
      zip.file(`ppt/fonts/${fileName}`, p.data);
      (p as any).fileName = fileName;
    });

    const relIds: Record<string, string> = {};

    if (parts.length) {
      // --- [Content_Types].xml — ensure Default for .fntdata ---
      const ctPath = "[Content_Types].xml";
      let ct = await zip.file(ctPath)!.async("string");
      if (!/Extension="fntdata"/.test(ct)) {
        ct = ct.replace(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="fntdata" ContentType="${FNTDATA_CONTENT_TYPE}"/>`,
        );
        zip.file(ctPath, ct);
      }



      // --- presentation.xml.rels — add font relationships ---
      const relsPath = "ppt/_rels/presentation.xml.rels";
      let rels = await zip.file(relsPath)!.async("string");
      const existingIds = Array.from(rels.matchAll(/Id="rId(\d+)"/g)).map((m) => Number(m[1]));
      let nextId = (existingIds.length ? Math.max(...existingIds) : 0) + 1;
      let newRelXml = "";
      for (const p of parts) {
        const rid = `rId${nextId++}`;
        relIds[p.kind] = rid;
        newRelXml += `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/${(p as any).fileName}"/>`;
      }
      rels = rels.replace("</Relationships>", `${newRelXml}</Relationships>`);
      zip.file(relsPath, rels);
    }

    // --- theme + slide parts — canonical fonts and a brand font scheme ---
    // Theme scheme first (drives placeholder/reset behaviour), then rewrite any
    // stray typeface names in slides/layouts/masters through the alias table so
    // an unmapped source face can never reach the opening machine. This runs
    // whether or not the font files ride along.
    for (const path of Object.keys(zip.files)) {
      if (/^ppt\/theme\/theme\d+\.xml$/.test(path)) {
        const xml = await zip.file(path)!.async("string");
        zip.file(path, normalizeTypefacesInXml(patchThemeFontScheme(xml)));
      } else if (
        /^ppt\/(slides|slideLayouts|slideMasters|notesSlides|notesMasters)\/[^/]+\.xml$/.test(path)
      ) {
        const xml = await zip.file(path)!.async("string");
        zip.file(path, normalizeTypefacesInXml(xml));
      }
    }

    // --- presentation.xml — inject <p:embeddedFontLst> ---
    const presPath = "ppt/presentation.xml";
    let pres = await zip.file(presPath)!.async("string");
    if (parts.length && !/<p:embeddedFontLst/.test(pres)) {
      const fontEntries = parts
        .map((p) => {
          const tag =
            p.kind === "regular"
              ? "p:regular"
              : p.kind === "bold"
                ? "p:bold"
                : p.kind === "italic"
                  ? "p:italic"
                  : "p:boldItalic";
          return `<${tag} r:id="${relIds[p.kind]}"/>`;
        })
        .join("");
      const embedBlock =
        `<p:embeddedFontLst>` +
        `<p:embeddedFont>` +
        `<p:font typeface="${CANONICAL_FONTS.sans}" panose="${FONT_PANOSE[CANONICAL_FONTS.sans].panose}" pitchFamily="${FONT_PANOSE[CANONICAL_FONTS.sans].pitchFamily}" charset="0"/>` +
        fontEntries +
        `</p:embeddedFont>` +
        `</p:embeddedFontLst>`;

      // Insert before <p:defaultTextStyle> if present, otherwise before </p:presentation>
      if (/<p:defaultTextStyle/.test(pres)) {
        pres = pres.replace(/<p:defaultTextStyle/, `${embedBlock}<p:defaultTextStyle`);
      } else {
        pres = pres.replace("</p:presentation>", `${embedBlock}</p:presentation>`);
      }
    }
    // NOTE: do NOT re-sequence <p:presentation> children. pptxgenjs emits
    // notesMasterIdLst after sldIdLst, and although ECMA-376 lists it before,
    // Microsoft's own Office conversion service refuses the package outright
    // (cannotOpenFile / UnsupportedMediaType) when it is moved to the
    // schema-listed position, while accepting pptxgenjs's order. Verified by
    // bisecting a real PowerPoint render: moving that one element is the only
    // change needed to flip a good deck to rejected. The embed block above is
    // already inserted after notesSz / before defaultTextStyle, so no
    // reordering is required.
    if (parts.length) zip.file(presPath, pres);



    return await zip.generateAsync({
      type: "blob",
      mimeType:
        blob.type || "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
  } catch (e) {
    console.warn("[pptx-font-embed] failed, returning original blob", e);
    return blob;
  }
}
