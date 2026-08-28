// -----------------------------------------------------------------------------
// NATIVE MEDIA REPAIR — make embedded movies actually play in PowerPoint.
//
// pptxgenjs writes a usable `<p:pic>` with `<a:videoFile>` + `<p14:media>`, but
// leaves out two things real PowerPoint needs, and both are silent failures:
//
//   1. No `<p:timing>` tree. PowerPoint's media player is driven by the slide's
//      timing tree; without a `p:video` node in it, desktop PowerPoint (Win and
//      Mac) shows the poster frame with inert playback controls, and "Play in
//      background"/autoplay is unavailable. We append a minimal timing tree
//      with one media node per movie, click-triggered, so the play button works
//      and the slide behaves like a natively inserted video.
//   2. Duplicate `<p:cNvPr id>` values. `addMedia` does not advance the shape-id
//      counter, so the next shape on the slide reuses the movie's id — which is
//      exactly the corruption that triggers PowerPoint's "repair" prompt on
//      open. We renumber every duplicate id per slide.
//
// Runs on the finished bytes and never throws: any failure returns the input
// package untouched so an export is never blocked by this pass.
// -----------------------------------------------------------------------------

import { repackPptxBlob } from "./pptx-repack";

export interface MediaRepairReport {
  /** Slides carrying at least one embedded movie. */
  slidesWithMedia: number;
  /** Movies given a timing entry. */
  timingAdded: number;
  /** Duplicate shape ids renumbered. */
  idsRenumbered: number;
}

const PIC_RE = /<p:pic>[\s\S]*?<\/p:pic>/g;

/** Shape ids of every embedded movie on the slide, in document order. */
export function mediaShapeIds(slideXml: string): string[] {
  const ids: string[] = [];
  for (const pic of slideXml.match(PIC_RE) ?? []) {
    if (!/<a:videoFile|p14:media/.test(pic)) continue;
    const id = pic.match(/<p:cNvPr\s+id="(\d+)"/)?.[1];
    if (id) ids.push(id);
  }
  return ids;
}

/** Renumber duplicate `<p:cNvPr id>` values so every shape id is unique. */
export function dedupeShapeIds(slideXml: string): { xml: string; renumbered: number } {
  const seen = new Set<string>();
  let max = 1;
  for (const m of slideXml.matchAll(/<p:cNvPr\s+id="(\d+)"/g)) max = Math.max(max, +m[1]);
  let renumbered = 0;
  const xml = slideXml.replace(/<p:cNvPr\s+id="(\d+)"/g, (all, id: string) => {
    if (!seen.has(id)) {
      seen.add(id);
      return all;
    }
    max += 1;
    renumbered += 1;
    seen.add(String(max));
    return all.replace(`id="${id}"`, `id="${max}"`);
  });
  return { xml, renumbered };
}

/**
 * Append a timing tree that registers each movie as a click-triggered media
 * node. Skips slides that already carry one (imported decks, future pptxgenjs).
 */
export function addMediaTiming(slideXml: string, ids: string[]): string {
  if (ids.length === 0) return slideXml;
  if (/<p:timing\b/.test(slideXml)) return slideXml;
  const videos = ids
    .map(
      (id) =>
        `<p:video><p:cMediaNode vol="80"><p:cTn id="${Number(id) + 1000}" fill="hold" display="0">` +
        `<p:stCondLst><p:cond delay="indefinite"/></p:stCondLst>` +
        `<p:endCondLst><p:cond evt="onStopAudio" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:endCondLst>` +
        `</p:cTn><p:tgtEl><p:spTgt spid="${id}"/></p:tgtEl></p:cMediaNode></p:video>`,
    )
    .join("");
  const timing =
    `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">` +
    `<p:childTnLst><p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq">` +
    `<p:childTnLst/></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>` +
    `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>` +
    `${videos}</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>`;
  return slideXml.replace("</p:sld>", `${timing}</p:sld>`);
}

/** Repair every slide's media objects on a finished .pptx blob. */
export async function repairPptxMedia(
  blob: Blob,
  onReport?: (r: MediaRepairReport) => void,
): Promise<Blob> {
  try {
    const report: MediaRepairReport = { slidesWithMedia: 0, timingAdded: 0, idsRenumbered: 0 };
    const out = await repackPptxBlob(blob, async (zip) => {
      const slides = Object.keys(zip.files).filter((n) =>
        /^ppt\/slides\/slide\d+\.xml$/.test(n),
      );
      for (const path of slides) {
        const xml = await zip.file(path)!.async("string");
        const ids = mediaShapeIds(xml);
        if (ids.length === 0) continue;
        report.slidesWithMedia += 1;
        const deduped = dedupeShapeIds(xml);
        report.idsRenumbered += deduped.renumbered;
        // Re-read ids after renumbering so timing targets the surviving ids.
        const finalIds = mediaShapeIds(deduped.xml);
        const withTiming = addMediaTiming(deduped.xml, finalIds);
        if (withTiming !== deduped.xml) report.timingAdded += finalIds.length;
        zip.file(path, withTiming);
      }
    });
    if (report.slidesWithMedia === 0) return blob;
    console.info("[pptx-media-repair]", report);
    onReport?.(report);
    return out;
  } catch (err) {
    console.warn("[pptx-media-repair] skipped:", err);
    return blob;
  }
}
