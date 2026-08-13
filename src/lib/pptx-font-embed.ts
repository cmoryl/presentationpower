/**
 * Embed the app's exact fonts (Geist) into a generated PPTX so PowerPoint
 * does not substitute typography on machines that don't have Geist installed.
 *
 * OOXML approach:
 *  - Store each font weight/style as an obfuscated .fntdata part under ppt/fonts/
 *  - Register a Default content type for .fntdata
 *  - Add a font relationship per part to presentation.xml.rels
 *  - Inject <p:embeddedFontLst> into presentation.xml linking the parts
 *
 * Per ECMA-376, embedded font data is obfuscated by XORing the first 32 bytes
 * of the raw font (TTF/OTF) with the file-name GUID's 16 bytes (reversed),
 * applied twice (bytes 0-15 and bytes 16-31).
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

function randomGuid(): { pretty: string; keyBytes: Uint8Array } {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // RFC 4122 variant/version bits (v4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const pretty = `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}}`;
  // Obfuscation key = GUID bytes in reversed order
  const keyBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) keyBytes[i] = bytes[15 - i];
  return { pretty, keyBytes };
}

function obfuscate(raw: Uint8Array, keyBytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(raw.length);
  out.set(raw);
  for (let i = 0; i < 16 && i < out.length; i++) out[i] ^= keyBytes[i];
  for (let i = 0; i < 16 && i + 16 < out.length; i++) out[i + 16] ^= keyBytes[i];
  return out;
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
      const { pretty, keyBytes } = randomGuid();
      const fileName = `font${idx + 1}.fntdata`;
      zip.file(`ppt/fonts/${fileName}`, obfuscate(p.data, keyBytes));
      // Track file name for rels
      (p as any).fileName = fileName;
      (p as any).guid = pretty;
    });

    const relIds: Record<string, string> = {};

    if (parts.length) {
      // --- [Content_Types].xml — ensure Default for .fntdata ---
      const ctPath = "[Content_Types].xml";
      let ct = await zip.file(ctPath)!.async("string");
      if (!/Extension="fntdata"/.test(ct)) {
        ct = ct.replace(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">',
          `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="fntdata" ContentType="application/vnd.openxmlformats-officedocument.obfuscatedFont"/>`,
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
      zip.file(presPath, pres);
    }

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
