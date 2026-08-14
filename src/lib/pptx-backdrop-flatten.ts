// -----------------------------------------------------------------------------
// EXPORT SPEC #3 — the backdrop is a flat raster, and only the backdrop.
//
// OOXML has no mesh gradient. Every attempt to rebuild the aurora ground out of
// ellipses, gradient fills and blur effects produced hard-edged artifacts (the
// light cover showed a visible circle where a diffuse glow belongs) and buried
// the package in media parts. So the backdrop ships as one flat picture — and
// nothing else does: text, cards, icons, charts, stats, logos and process
// graphics all remain native editable objects.
//
// This pass runs on the finished bytes and enforces three invariants:
//
//  1. ONE media part per unique backdrop. pptxgenjs writes a fresh
//     `ppt/media/imageN` for every `addImage` call, so a 232-slide catalog
//     shipped 840 parts of which only 235 were unique — 282 MB of
//     byte-identical duplicates. Byte-identical parts are collapsed to a single
//     part and every `.rels` target is repointed at it.
//  2. NO `svgBlip` fallback on a backdrop blip. PowerPoint prefers the SVG
//     child inside `<a:extLst>` and ignores the PNG, which silently
//     reintroduces vector interpretation of the very thing we flattened. The
//     extension is stripped and the blip is emitted self-closing.
//  3. The backdrop is LOCKED and full-canvas: `picLocks` stop it being
//     selected, moved or resized while editing, and the frame is rewritten to
//     exactly x=0 y=0 cx=12192000 cy=6858000 EMU so no crop or aspect
//     distortion can survive.
//
// Content pictures (`TP Photo`, media tiles, logos, icons) are deliberately
// untouched by 2 and 3 — this spec must not bleed into content.
// -----------------------------------------------------------------------------

import type JSZipT from "jszip";

/** Full 16:9 canvas in EMU — the exact frame every backdrop must occupy. */
export const CANVAS_CX_EMU = 12192000;
export const CANVAS_CY_EMU = 6858000;

/** Object names the exporter gives to full-bleed backdrop pictures. */
const BACKDROP_NAMES = /^TP (Background|Design plate|Ground|Graphic plate)/i;

export type BackdropFlattenReport = {
  /** Media parts present before dedupe. */
  mediaPartsBefore: number;
  /** Media parts remaining after dedupe (== unique byte streams). */
  mediaPartsAfter: number;
  /** Byte-identical duplicate parts removed. */
  duplicatesRemoved: number;
  /** Bytes reclaimed by collapsing duplicates. */
  bytesReclaimed: number;
  /** Backdrop pictures normalized (locked + full canvas). */
  backdropsNormalized: number;
  /** `svgBlip` fallbacks stripped from backdrop blips. */
  svgFallbacksStripped: number;
};

async function sha1(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const view = new Uint8Array(bytes);
    const digest = await subtle.digest("SHA-1", view.buffer as ArrayBuffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Deterministic fallback (FNV-1a over the bytes plus the length) for runtimes
  // without WebCrypto. Length is folded in so same-hash/different-size parts
  // can never be collapsed.
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i += 1) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `fnv-${h.toString(16)}-${bytes.length}`;
}

/** Numeric suffix of `ppt/media/image12.png` — used for a stable canonical pick. */
function mediaOrdinal(name: string): number {
  const m = name.match(/image(\d+)/i);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

/**
 * Collapse byte-identical `ppt/media/*` parts into one part and repoint every
 * relationship at the survivor.
 */
async function dedupeMedia(zip: JSZipT): Promise<{
  before: number;
  after: number;
  removed: number;
  bytesReclaimed: number;
}> {
  const mediaNames = Object.keys(zip.files).filter(
    (n) => /^ppt\/media\//.test(n) && !zip.files[n].dir,
  );
  const byHash = new Map<string, string[]>();
  const sizes = new Map<string, number>();

  for (const name of mediaNames) {
    const bytes = await zip.file(name)!.async("uint8array");
    sizes.set(name, bytes.length);
    // Extension is part of the key: identical bytes with different extensions
    // would still confuse the [Content_Types] default mapping.
    const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
    const key = `${ext}:${await sha1(bytes)}`;
    const list = byHash.get(key);
    if (list) list.push(name);
    else byHash.set(key, [name]);
  }

  /** duplicate basename → canonical basename */
  const remap = new Map<string, string>();
  let removed = 0;
  let bytesReclaimed = 0;

  for (const group of byHash.values()) {
    if (group.length < 2) continue;
    const canonical = group.slice().sort((a, b) => mediaOrdinal(a) - mediaOrdinal(b))[0];
    for (const dup of group) {
      if (dup === canonical) continue;
      remap.set(dup.split("/").pop()!, canonical.split("/").pop()!);
      zip.remove(dup);
      removed += 1;
      bytesReclaimed += sizes.get(dup) ?? 0;
    }
  }

  if (remap.size > 0) {
    const relsNames = Object.keys(zip.files).filter((n) => n.endsWith(".rels"));
    for (const name of relsNames) {
      const xml = await zip.file(name)!.async("string");
      let next = xml;
      for (const [dup, canonical] of remap) {
        if (!next.includes(dup)) continue;
        // Only rewrite the media segment of a Target so a same-named part in
        // another folder can never be captured.
        next = next.replace(
          new RegExp(`(Target="[^"]*media/)${dup.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(")`, "g"),
          `$1${canonical}$2`,
        );
      }
      if (next !== xml) zip.file(name, next);
    }
  }

  return {
    before: mediaNames.length,
    after: mediaNames.length - removed,
    removed,
    bytesReclaimed,
  };
}

/**
 * Strip `svgBlip` fallbacks, lock the picture, and force the exact full-canvas
 * frame — for backdrop pictures only.
 */
export function normalizeBackdropPictures(xml: string): {
  xml: string;
  normalized: number;
  svgStripped: number;
} {
  let normalized = 0;
  let svgStripped = 0;

  const next = xml.replace(/<p:pic>[\s\S]*?<\/p:pic>/g, (pic) => {
    const nameMatch = pic.match(/<p:cNvPr[^>]*\sname="([^"]*)"/);
    if (!nameMatch || !BACKDROP_NAMES.test(nameMatch[1])) return pic;

    let out = pic;

    // 1. Self-closing blip: drop any extension list (svgBlip lives there).
    out = out.replace(/<a:blip([^>]*?)>([\s\S]*?)<\/a:blip>/g, (_all, attrs: string, inner: string) => {
      if (/svgBlip/i.test(inner)) svgStripped += 1;
      const embed = attrs.match(/r:embed="[^"]*"/);
      return `<a:blip ${embed ? embed[0] : ""}/>`;
    });

    // 2. Lock it at the bottom of the z-order: unselectable, immovable.
    if (/<a:picLocks\b/.test(out)) {
      out = out.replace(
        /<a:picLocks\b[^>]*\/>/,
        '<a:picLocks noSelect="1" noMove="1" noResize="1" noRot="1" noChangeAspect="1"/>',
      );
    } else {
      out = out.replace(
        /<p:cNvPicPr\s*\/>/,
        '<p:cNvPicPr><a:picLocks noSelect="1" noMove="1" noResize="1" noRot="1" noChangeAspect="1"/></p:cNvPicPr>',
      );
      out = out.replace(
        /<p:cNvPicPr([^>]*)>(?!<a:picLocks)/,
        '<p:cNvPicPr$1><a:picLocks noSelect="1" noMove="1" noResize="1" noRot="1" noChangeAspect="1"/>',
      );
    }

    // 3. Exact full canvas — no crop, no aspect distortion.
    out = out.replace(/<a:off\b[^>]*\/>/, '<a:off x="0" y="0"/>');
    out = out.replace(/<a:ext\b[^>]*\/>/, `<a:ext cx="${CANVAS_CX_EMU}" cy="${CANVAS_CY_EMU}"/>`);
    // A srcRect crop would re-introduce the stretch artifacts the flat render
    // exists to avoid; the source is already rendered at the target ratio.
    out = out.replace(/<a:srcRect\b[^>]*\/>/g, "<a:srcRect/>");

    normalized += 1;
    return out;
  });

  return { xml: next, normalized, svgStripped };
}

/**
 * Apply the backdrop contract to a finished PPTX blob. Never throws: a failure
 * here returns the original bytes so an export is not blocked.
 */
export async function flattenBackdrops(
  blob: Blob,
  onReport?: (report: BackdropFlattenReport) => void,
): Promise<Blob> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    let backdropsNormalized = 0;
    let svgFallbacksStripped = 0;
    for (const name of Object.keys(zip.files).filter((n) =>
      /^ppt\/(slides\/slide\d+|slideLayouts\/slideLayout\d+|slideMasters\/slideMaster\d+)\.xml$/.test(
        n,
      ),
    )) {
      const xml = await zip.file(name)!.async("string");
      const res = normalizeBackdropPictures(xml);
      backdropsNormalized += res.normalized;
      svgFallbacksStripped += res.svgStripped;
      if (res.xml !== xml) zip.file(name, res.xml);
    }

    const dedupe = await dedupeMedia(zip);

    const report: BackdropFlattenReport = {
      mediaPartsBefore: dedupe.before,
      mediaPartsAfter: dedupe.after,
      duplicatesRemoved: dedupe.removed,
      bytesReclaimed: dedupe.bytesReclaimed,
      backdropsNormalized,
      svgFallbacksStripped,
    };
    onReport?.(report);
    console.info("[pptx-backdrop-flatten]", report);

    if (
      dedupe.removed === 0 &&
      backdropsNormalized === 0 &&
      svgFallbacksStripped === 0
    ) {
      return blob;
    }

    return (await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })) as Blob;
  } catch (err) {
    console.warn("[pptx-backdrop-flatten] skipped", err);
    return blob;
  }
}
