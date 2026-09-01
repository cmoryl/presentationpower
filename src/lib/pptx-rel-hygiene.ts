// -----------------------------------------------------------------------------
// Relationship hygiene — why PowerPoint says "found a problem with content"
//
// Every earlier pass rewrites package parts: media are deduplicated and
// repointed, backgrounds are promoted into layouts, decor is scrubbed off
// slides, groups are wrapped, movies get timing nodes. Each of those can leave
// the relationship graph one step out of sync with the drawing XML, and OOXML is
// unforgiving about exactly two cases:
//
//  1. A DANGLING reference — a `r:embed` / `r:id` in a slide whose relationship
//     no longer exists, or a relationship whose target part was removed. Either
//     one makes PowerPoint refuse the part and offer repair.
//  2. A DUPLICATE shape id inside a layout or master. Slides are already
//     deduplicated in terminal hygiene; layouts and masters were not, and a
//     background promoted into a layout collides with the layout's own ids.
//
// This pass is read-then-repair on the finished bytes: dangling references are
// removed together with the shape that carried them (leaving a blip with no
// image would draw an empty frame), orphan relationships are deleted, and ids
// are renumbered per part.
// -----------------------------------------------------------------------------

import type JSZipT from "jszip";

export interface RelHygieneReport {
  /** Shapes removed because their image relationship was missing. */
  danglingShapesRemoved: number;
  /** `r:id` attributes stripped from non-picture elements. */
  danglingRefsStripped: number;
  /** Relationships deleted because the target part does not exist. */
  orphanRelsRemoved: number;
  /** Duplicate shape ids renumbered in layouts / masters. */
  duplicateIdsFixed: number;
}

const DRAWING_PART =
  /^ppt\/(slides\/slide\d+|slideLayouts\/slideLayout\d+|slideMasters\/slideMaster\d+|notesSlides\/notesSlide\d+)\.xml$/;

/** `ppt/slides/slide1.xml` → `ppt/slides/_rels/slide1.xml.rels` */
export function relsPathFor(part: string): string {
  const slash = part.lastIndexOf("/");
  return `${part.slice(0, slash)}/_rels/${part.slice(slash + 1)}.rels`;
}

/**
 * Resolve a relationship Target to a zip path. Targets are normally relative to
 * the part's own folder, but a leading `/` means package-root absolute (which is
 * exactly how pptxgenjs writes chart parts: `/ppt/charts/chart1.xml`). Treating
 * those as relative resolved to `ppt/slides/ppt/charts/…`, so the chart looked
 * missing and the whole `p:graphicFrame` got scrubbed — native charts silently
 * vanished from the exported slide.
 */
export function resolveTarget(part: string, target: string): string {
  if (/^[a-z]+:\/\//i.test(target)) return target;
  const absolute = target.startsWith("/");
  const base = absolute ? [] : part.slice(0, part.lastIndexOf("/")).split("/");
  const segments = target.replace(/^\//, "").split("/");
  for (const seg of segments) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") base.pop();
    else base.push(seg);
  }
  return base.join("/");
}


export interface RelEntry {
  id: string;
  target: string;
  external: boolean;
}

/** Parse `<Relationship .../>` entries out of a .rels part. */
export function parseRels(xml: string): RelEntry[] {
  const out: RelEntry[] = [];
  for (const m of xml.matchAll(/<Relationship\b[^>]*\/>/g)) {
    const tag = m[0];
    const id = tag.match(/\sId="([^"]*)"/)?.[1];
    const target = tag.match(/\sTarget="([^"]*)"/)?.[1] ?? "";
    if (!id) continue;
    out.push({ id, target, external: /TargetMode="External"/.test(tag) });
  }
  return out;
}

/**
 * Remove every drawing element whose image relationship is missing, and strip
 * dangling `r:id` references from the elements that survive.
 */
export function stripDanglingRefs(
  xml: string,
  known: Set<string>,
): { xml: string; shapesRemoved: number; refsStripped: number } {
  let shapesRemoved = 0;
  let refsStripped = 0;

  // A picture (or a video/audio frame) is only valid with its blip; if the
  // relationship is gone the whole shape goes.
  let next = xml.replace(/<p:(pic|graphicFrame)>[\s\S]*?<\/p:\1>/g, (block) => {
    const refs = [...block.matchAll(/r:(?:embed|link|id)="([^"]+)"/g)].map((m) => m[1]);
    if (refs.length > 0 && refs.some((id) => !known.has(id))) {
      shapesRemoved += 1;
      return "";
    }
    return block;
  });

  // Anything else (hyperlinks, custom relationship references) can safely lose
  // just the attribute.
  next = next.replace(/\sr:(embed|link|id)="([^"]+)"/g, (all, _kind: string, id: string) => {
    if (known.has(id)) return all;
    refsStripped += 1;
    return "";
  });

  return { xml: next, shapesRemoved, refsStripped };
}

/** Renumber duplicate `<p:cNvPr id="…">` values inside one part. */
export function dedupeDrawingIds(xml: string): { xml: string; renumbered: number } {
  const used = new Set<number>();
  let max = 1;
  for (const m of xml.matchAll(/<p:cNvPr\b[^>]*\sid="(\d+)"/g)) {
    max = Math.max(max, Number(m[1]));
  }
  let renumbered = 0;
  const next = xml.replace(/(<p:cNvPr\b[^>]*\sid=")(\d+)(")/g, (all, pre: string, raw: string, post: string) => {
    const id = Number(raw);
    if (!used.has(id) && id > 0) {
      used.add(id);
      return all;
    }
    max += 1;
    used.add(max);
    renumbered += 1;
    return `${pre}${max}${post}`;
  });
  return { xml: next, renumbered };
}

/** Delete relationships whose target part is not in the package. */
export function pruneOrphanRels(xml: string, missing: Set<string>): { xml: string; removed: number } {
  if (missing.size === 0) return { xml, removed: 0 };
  let removed = 0;
  const next = xml.replace(/<Relationship\b[^>]*\/>/g, (tag) => {
    const id = tag.match(/\sId="([^"]*)"/)?.[1];
    if (id && missing.has(id)) {
      removed += 1;
      return "";
    }
    return tag;
  });
  return { xml: next, removed };
}

/** Repair the relationship graph of an open zip in place. */
export async function applyRelHygiene(zip: JSZipT): Promise<RelHygieneReport> {
  const report: RelHygieneReport = {
    danglingShapesRemoved: 0,
    danglingRefsStripped: 0,
    orphanRelsRemoved: 0,
    duplicateIdsFixed: 0,
  };

  for (const part of Object.keys(zip.files).filter((n) => DRAWING_PART.test(n))) {
    const file = zip.file(part);
    if (!file) continue;
    const xml = await file.async("string");

    const relsPath = relsPathFor(part);
    const relsFile = zip.file(relsPath);
    const relsXml = relsFile ? await relsFile.async("string") : "";
    const rels = relsXml ? parseRels(relsXml) : [];

    // Relationships whose target part vanished (media dedupe, decor scrub).
    const missing = new Set<string>();
    for (const rel of rels) {
      if (rel.external) continue;
      const resolved = resolveTarget(part, rel.target);
      if (!zip.file(resolved)) missing.add(rel.id);
    }
    const usable = new Set(rels.filter((r) => !missing.has(r.id)).map((r) => r.id));

    const stripped = stripDanglingRefs(xml, usable);
    const deduped = dedupeDrawingIds(stripped.xml);
    if (deduped.xml !== xml) zip.file(part, deduped.xml);
    report.danglingShapesRemoved += stripped.shapesRemoved;
    report.danglingRefsStripped += stripped.refsStripped;
    report.duplicateIdsFixed += deduped.renumbered;

    if (relsXml && missing.size > 0) {
      const pruned = pruneOrphanRels(relsXml, missing);
      if (pruned.removed > 0) {
        zip.file(relsPath, pruned.xml);
        report.orphanRelsRemoved += pruned.removed;
      }
    }
  }

  return report;
}
