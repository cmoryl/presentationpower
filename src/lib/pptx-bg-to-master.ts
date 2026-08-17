// -----------------------------------------------------------------------------
// EXPORT SPEC #4 — the background belongs to the MASTER SECTION, flat.
//
// Symptom this fixes: an exported slide arrived with the artwork visible as a
// stack of selectable pieces on the slide itself — a full-bleed plate plus
// leftover decor washes and full-height scaffold rules floating over the cards,
// all clickable, all draggable, and the topmost wash bleeding across content.
//
// Contract enforced here, on the finished bytes:
//   1. ONE flat background raster per slide, and it lives in the slide's LAYOUT
//      as `<p:bg><p:bgPr><a:blipFill>` — the master section, exactly where
//      PowerPoint expects a background. It cannot be selected, moved, or
//      deleted from the slide, and it never participates in z-order.
//   2. The slide's own shape tree keeps ONLY content: every full-bleed decor
//      object (background plate, aurora wash, full-height scaffold rule) is
//      dropped, because those pixels are already baked into the flat raster.
//   3. Layouts are shared by background image, so a 30-slide deck on one
//      backdrop adds exactly one layout and one media part.
//
// Never throws: any failure returns the input bytes untouched so an export is
// never blocked.
// -----------------------------------------------------------------------------

import type JSZip from "jszip";

/** Full 16:9 canvas in EMU. */
const CANVAS_CX = 12192000;
const CANVAS_CY = 6858000;

/**
 * Names the exporter gives to a PURE full-bleed ground — safe to move into the
 * layout background. `TP Design plate` / `TP Graphic plate` are deliberately
 * NOT here: those composite plates carry cards, photographs and the logo, so
 * promoting them would strip real content off the slide.
 */
const BACKDROP_NAMES = /^TP (Background|Backdrop|Ground)$/i;
/** Names that may legitimately be decor rather than user content. */
const DECOR_NAMES = /^TP (Effect|Rule|Decor|Scaffold|Background scrim|Ground)/i;


const LAYOUT_CT =
  "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml";
const LAYOUT_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout";
const IMAGE_REL_TYPE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

export interface BgToMasterReport {
  /** Slides whose background moved into a layout. */
  slidesPromoted: number;
  /** Layouts created (one per unique background image). */
  layoutsAdded: number;
  /** Full-bleed decor objects removed from slide shape trees. */
  decorRemoved: number;
  /** Full-bleed objects kept but locked out of selection. */
  fullBleedLocked: number;
}

interface Shape {
  start: number;
  end: number;
  xml: string;
  tag: "pic" | "sp" | "grpSp" | "graphicFrame" | "cxnSp";
  name: string;
  hasText: boolean;
  frame: { x: number; y: number; w: number; h: number } | null;
  embed: string | null;
}

const SHAPE_RE = /<p:(pic|sp|grpSp|graphicFrame|cxnSp)>[\s\S]*?<\/p:\1>/g;

/** Top-level children of `<p:spTree>`, in document (z) order. */
export function readShapes(slideXml: string): Shape[] {
  const treeStart = slideXml.indexOf("<p:spTree>");
  const treeEnd = slideXml.indexOf("</p:spTree>");
  if (treeStart === -1 || treeEnd === -1) return [];
  const tree = slideXml.slice(treeStart, treeEnd);
  const out: Shape[] = [];
  let depthSafe = 0;
  SHAPE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SHAPE_RE.exec(tree)) && depthSafe++ < 4000) {
    const xml = m[0];
    const nameMatch = xml.match(/<p:cNvPr[^>]*\sname="([^"]*)"/);
    const off = xml.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"\s*\/>/);
    const ext = xml.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"\s*\/>/);
    out.push({
      start: treeStart + m.index,
      end: treeStart + m.index + xml.length,
      xml,
      tag: m[1] as Shape["tag"],
      name: nameMatch?.[1] ?? "",
      hasText: /<a:t>[^<]/.test(xml),
      frame:
        off && ext
          ? { x: +off[1], y: +off[2], w: +ext[1], h: +ext[2] }
          : null,
      embed: xml.match(/r:embed="([^"]+)"/)?.[1] ?? null,
    });
  }
  return out;
}

function coversCanvas(f: Shape["frame"]): boolean {
  if (!f) return false;
  return f.w >= CANVAS_CX * 0.94 && f.h >= CANVAS_CY * 0.94;
}

/** A full-height hairline (scaffold grid rule) or a full-width band of decor. */
function isFullBleedDecor(s: Shape): boolean {
  if (s.hasText || !s.frame) return false;
  if (s.tag === "graphicFrame") return false;
  if (!DECOR_NAMES.test(s.name)) return false;
  const f = s.frame;
  if (coversCanvas(f)) return true;
  const fullHeight = f.h >= CANVAS_CY * 0.9;
  const fullWidth = f.w >= CANVAS_CX * 0.9;
  const hairlineW = f.w <= CANVAS_CX * 0.03;
  const hairlineH = f.h <= CANVAS_CY * 0.03;
  return (fullHeight && hairlineW) || (fullWidth && hairlineH && f.y <= 0);
}

/**
 * Decide what leaves the slide: the bottom-most PURE full-canvas ground picture
 * (which becomes the layout background) plus every full-bleed decor object. Any
 * full-bleed object we must keep (a legibility scrim, a composite design plate)
 * is locked instead of removed, so it can never be dragged around by accident.
 */
export function planSlideScrub(slideXml: string): {
  bgEmbed: string | null;
  drop: Shape[];
  lock: Shape[];
} {
  const shapes = readShapes(slideXml);
  let bgEmbed: string | null = null;
  const drop: Shape[] = [];
  const lock: Shape[] = [];

  for (const s of shapes) {
    if (s.hasText) continue;
    const isGround =
      s.tag === "pic" && !!s.embed && BACKDROP_NAMES.test(s.name) && coversCanvas(s.frame);
    if (isGround) {
      if (!bgEmbed) {
        bgEmbed = s.embed!;
        drop.push(s);
      } else {
        drop.push(s);
      }
      continue;
    }
    if (isFullBleedDecor(s)) {
      drop.push(s);
      continue;
    }
    if (coversCanvas(s.frame)) lock.push(s);
  }
  return { bgEmbed, drop, lock };
}

/** Remove planned shapes from the slide XML (right-to-left, offsets stay valid). */
export function stripShapes(slideXml: string, drop: Shape[]): string {
  let out = slideXml;
  for (const s of [...drop].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, s.start) + out.slice(s.end);
  }
  return out;
}

const LOCKS = 'noSelect="1" noMove="1" noResize="1" noRot="1"';

/** Make a full-bleed object that stays on the slide unselectable/immovable. */
export function lockShapes(slideXml: string, lock: Shape[]): string {
  let out = slideXml;
  for (const s of [...lock].sort((a, b) => b.start - a.start)) {
    let xml = s.xml;
    if (/<a:(pic|sp)Locks\b/.test(xml)) {
      xml = xml.replace(/<a:(pic|sp)Locks\b[^>]*\/>/, `<a:$1Locks ${LOCKS}/>`);
    } else if (/<p:cNvPicPr\s*\/>/.test(xml)) {
      xml = xml.replace(
        /<p:cNvPicPr\s*\/>/,
        `<p:cNvPicPr><a:picLocks ${LOCKS} noChangeAspect="1"/></p:cNvPicPr>`,
      );
    } else if (/<p:cNvSpPr([^>]*)\/>/.test(xml)) {
      xml = xml.replace(
        /<p:cNvSpPr([^>]*)\/>/,
        `<p:cNvSpPr$1><a:spLocks ${LOCKS}/></p:cNvSpPr>`,
      );
    } else {
      continue;
    }
    out = out.slice(0, s.start) + xml + out.slice(s.end);
  }
  return out;
}


/** Replace (or insert) `<p:bg>` in a layout with a stretched full-bleed blipFill. */
export function layoutWithImageBackground(
  layoutXml: string,
  relId: string,
  name: string,
): string {
  const bg =
    `<p:bg><p:bgPr>` +
    `<a:blipFill rotWithShape="0"><a:blip r:embed="${relId}"/>` +
    `<a:srcRect/><a:stretch><a:fillRect/></a:stretch></a:blipFill>` +
    `<a:effectLst/></p:bgPr></p:bg>`;

  let out = layoutXml.replace(/<p:bg>[\s\S]*?<\/p:bg>/, "");
  out = out.replace(/(<p:cSld\b[^>]*>)/, `$1${bg}`);
  if (!out.includes("<p:bg>")) {
    // `<p:cSld>` was self-closing or absent — leave the layout untouched.
    return layoutXml;
  }
  return out.replace(/<p:cSld(\s+name="[^"]*")?>/, `<p:cSld name="${name}">`);
}

function addRel(relsXml: string, id: string, type: string, target: string): string {
  return relsXml.replace(
    "</Relationships>",
    `<Relationship Id="${id}" Type="${type}" Target="${target}"/></Relationships>`,
  );
}

function nextRelId(relsXml: string): string {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map((m) => +m[1]);
  return `rId${(ids.length ? Math.max(...ids) : 0) + 1}`;
}

/**
 * Move every slide background into the master section as a flat layout
 * background and scrub full-bleed decor off the slides.
 */
export async function backgroundsToMaster(blob: Blob): Promise<Blob> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    const slideNames = Object.keys(zip.files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => mediaIndex(a) - mediaIndex(b));
    if (!slideNames.length) return blob;

    const masterPath = "ppt/slideMasters/slideMaster1.xml";
    const masterRelsPath = "ppt/slideMasters/_rels/slideMaster1.xml.rels";
    const masterFile = zip.file(masterPath);
    const masterRelsFile = zip.file(masterRelsPath);
    if (!masterFile || !masterRelsFile) return blob;

    let masterXml = await masterFile.async("string");
    let masterRels = await masterRelsFile.async("string");
    let ctXml = await zip.file("[Content_Types].xml")!.async("string");

    /** media target (e.g. `../media/image-1-1.png`) → layout part path */
    const layoutForMedia = new Map<string, string>();
    let nextLayoutIndex =
      Math.max(
        0,
        ...Object.keys(zip.files)
          .filter((n) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(n))
          .map(mediaIndex),
      ) + 1;

    const report: BgToMasterReport = {
      slidesPromoted: 0,
      layoutsAdded: 0,
      decorRemoved: 0,
      fullBleedLocked: 0,
    };

    for (const slidePath of slideNames) {
      const slideXml = await zip.file(slidePath)!.async("string");
      const relsPath = slidePath.replace(/slides\//, "slides/_rels/") + ".rels";
      const relsFile = zip.file(relsPath);
      if (!relsFile) continue;
      let relsXml = await relsFile.async("string");

      const { bgEmbed, drop, lock } = planSlideScrub(slideXml);
      if (!drop.length && !lock.length) continue;


      const mediaTarget = bgEmbed
        ? relsXml.match(
            new RegExp(`Id="${bgEmbed}"[^>]*Target="([^"]+)"`),
          )?.[1] ?? null
        : null;

      // --- background → layout -------------------------------------------
      if (mediaTarget) {
        let layoutPath = layoutForMedia.get(mediaTarget);
        if (!layoutPath) {
          const baseLayoutTarget = relsXml.match(
            /Type="[^"]*slideLayout"[^>]*Target="([^"]+)"/,
          )?.[1];
          const basePath = baseLayoutTarget
            ? `ppt/slideLayouts/${baseLayoutTarget.split("/").pop()}`
            : "ppt/slideLayouts/slideLayout1.xml";
          const baseFile = zip.file(basePath);
          if (!baseFile) continue;
          const baseXml = await baseFile.async("string");
          const baseRels =
            (await zip
              .file(basePath.replace("slideLayouts/", "slideLayouts/_rels/") + ".rels")
              ?.async("string")) ??
            `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

          const newIndex = nextLayoutIndex++;
          layoutPath = `ppt/slideLayouts/slideLayout${newIndex}.xml`;
          const imgRelId = nextRelId(baseRels);
          const layoutXml = layoutWithImageBackground(
            baseXml,
            imgRelId,
            `TP_BACKGROUND_${newIndex}`,
          );
          if (layoutXml === baseXml) continue;

          zip.file(layoutPath, layoutXml);
          zip.file(
            layoutPath.replace("slideLayouts/", "slideLayouts/_rels/") + ".rels",
            addRel(baseRels, imgRelId, IMAGE_REL_TYPE, mediaTarget),
          );

          // register with the master and the package
          const masterRelId = nextRelId(masterRels);
          masterRels = addRel(
            masterRels,
            masterRelId,
            LAYOUT_REL_TYPE,
            `../slideLayouts/slideLayout${newIndex}.xml`,
          );
          const maxLayoutId = Math.max(
            2147483648,
            ...[...masterXml.matchAll(/<p:sldLayoutId id="(\d+)"/g)].map((m) => +m[1]),
          );
          masterXml = masterXml.replace(
            "</p:sldLayoutIdLst>",
            `<p:sldLayoutId id="${maxLayoutId + 1}" r:id="${masterRelId}"/></p:sldLayoutIdLst>`,
          );
          if (!ctXml.includes(`PartName="/${layoutPath}"`)) {
            ctXml = ctXml.replace(
              "</Types>",
              `<Override PartName="/${layoutPath}" ContentType="${LAYOUT_CT}"/></Types>`,
            );
          }
          layoutForMedia.set(mediaTarget, layoutPath);
          report.layoutsAdded += 1;
        }

        // point the slide at the background-bearing layout
        relsXml = relsXml.replace(
          /(Type="[^"]*slideLayout"[^>]*Target=")[^"]+(")/,
          `$1../slideLayouts/${layoutPath.split("/").pop()}$2`,
        );
        report.slidesPromoted += 1;
      }

      report.decorRemoved += drop.length - (mediaTarget ? 1 : 0);
      report.fullBleedLocked += lock.length;
      // Strip the planned objects FIRST (their offsets come from this exact
      // string), then drop the slide's own `<p:bg>` — pptxgenjs writes a solid
      // fallback there and it would paint over the inherited layout background —
      // then re-measure the shrunken tree before locking what stayed.
      let next = stripShapes(slideXml, drop);
      if (mediaTarget) next = next.replace(/<p:bg>[\s\S]*?<\/p:bg>/, "");
      zip.file(slidePath, lockShapes(next, planSlideScrub(next).lock));

      zip.file(relsPath, relsXml);
    }

    if (!report.slidesPromoted && !report.decorRemoved && !report.fullBleedLocked) {
      return blob;
    }


    zip.file(masterPath, masterXml);
    zip.file(masterRelsPath, masterRels);
    zip.file("[Content_Types].xml", ctXml);
    console.info("[pptx-bg-to-master]", report);

    return (await zip.generateAsync({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })) as Blob;
  } catch (err) {
    console.warn("[pptx-bg-to-master] skipped", err);
    return blob;
  }
}

function mediaIndex(name: string): number {
  return Number(name.match(/(\d+)\.xml$/)?.[1] ?? 0);
}
