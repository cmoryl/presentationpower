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
    // Root-relative on the server has no base URL, so resolve against the
    // export's configured origin before fetching.
    const { resolveAssetUrl } = await import("./asset-base-url");
    const res = await fetch(resolveAssetUrl(FONT_URLS[kind]));
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

    // Read the bytes first: JSZip only accepts a Blob where the runtime has
    // Blob-reading support (browser). On the server (headless MCP export) a
    // Blob argument throws, which silently dropped font embedding.
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());


    // Prepare font parts (only those we actually fetched).
    const parts: Array<{ kind: keyof typeof FONT_URLS; data: Uint8Array; fileName?: string }> = [];
    if (regular) parts.push({ kind: "regular", data: regular });
    if (bold) parts.push({ kind: "bold", data: bold });
    if (italic) parts.push({ kind: "italic", data: italic });
    if (boldItalic) parts.push({ kind: "boldItalic", data: boldItalic });

    parts.forEach((p, idx) => {
      const fileName = `font${idx + 1}.fntdata`;
      // Raw sfnt bytes — see the header note: PowerPoint does not obfuscate.
      zip.file(`ppt/fonts/${fileName}`, p.data);
      p.fileName = fileName;
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
        newRelXml += `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/font" Target="fonts/${p.fileName}"/>`;
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

      // Insert as the LAST child of <p:presentation>. Office refuses the
      // package (`invalidFileFormat`) when the list sits in its schema slot
      // (before defaultTextStyle) and accepts it when it trails everything.
      pres = pres.replace("</p:presentation>", `${embedBlock}</p:presentation>`);
    }
    // NOTE: do NOT hoist notesMasterIdLst. pptxgenjs emits it after sldIdLst,
    // and although ECMA-376 lists it before, Microsoft's own Office conversion
    // service refuses the package outright (cannotOpenFile /
    // UnsupportedMediaType) when it is moved to the schema-listed position,
    // while accepting pptxgenjs's order. Verified by bisecting a real
    // PowerPoint render. The embed block above trails defaultTextStyle for the
    // same empirical reason, so no further reordering is required.
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
