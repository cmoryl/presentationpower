/**
 * Final PowerPoint package hygiene.
 *
 * This pass deliberately runs after every exporter transformation. Earlier
 * passes may add groups, move backgrounds to masters, deduplicate media, or add
 * movie timing; the bytes delivered to the user therefore need one final,
 * unconditional schema and identifier check.
 */
import { repairChartXml } from "./pptx-chart-repair";
import { applyRelHygiene } from "./pptx-rel-hygiene";
import { repairContentTypes } from "./pptx-content-types";
import { dedupeShapeIds } from "./pptx-media-repair";
import { repairPresentationOrder } from "./pptx-presentation-order";
import { repackPptxBlob } from "./pptx-repack";

export interface TerminalHygieneReport {
  duplicateShapeIdsFixed: number;
  chartsFixed: number;
  textRunsFixed: number;
  packageEntriesFixed: number;
  /** Dangling refs, orphan relationships and duplicate ids repaired. */
  relationshipsRepaired: number;
  /** Non-positive <a:ext> extents clamped to a legal size. */
  invalidExtentsFixed: number;
}

/** Preserve intentional leading/trailing spaces per DrawingML's XML contract. */
export function preserveDrawingTextWhitespace(xml: string): { xml: string; fixed: number } {
  let fixed = 0;
  const next = xml.replace(/<a:t>([\s\S]*?)<\/a:t>/g, (all, text: string) => {
    if (!/^\s|\s$/.test(text)) return all;
    fixed += 1;
    return `<a:t xml:space="preserve">${text}</a:t>`;
  });
  return { xml: next, fixed };
}

/**
 * Clamp illegal shape extents.
 *
 * `<a:ext>` is unsigned in the schema: a negative (or zero) cx/cy makes
 * PowerPoint refuse the slide and "repair" the file, which collapses the
 * offending boxes on top of each other. A layout bug upstream must never cost
 * the user a repaired deck, so the final package is clamped unconditionally.
 * Group child extents (`chExt`) are clamped the same way.
 */
const MIN_EXT_EMU = 9525; // 1px at 96dpi

export function clampShapeExtents(xml: string): { xml: string; fixed: number } {
  let fixed = 0;
  const next = xml.replace(
    /<a:(ext|chExt) cx="(-?\d+)" cy="(-?\d+)"/g,
    (all, tag: string, cxRaw: string, cyRaw: string) => {
      const cx = Number(cxRaw);
      const cy = Number(cyRaw);
      if (cx > 0 && cy > 0) return all;
      // A legitimately empty group placeholder (0x0) is left alone.
      if (cx === 0 && cy === 0) return all;
      fixed += 1;
      return `<a:${tag} cx="${Math.max(cx, MIN_EXT_EMU)}" cy="${Math.max(cy, MIN_EXT_EMU)}"`;
    },
  );
  return { xml: next, fixed };
}


/** Re-assert invariants on the exact final package that will be downloaded. */
export async function applyTerminalPptxHygiene(
  blob: Blob,
  onReport?: (report: TerminalHygieneReport) => void,
): Promise<Blob> {
  const report: TerminalHygieneReport = {
    duplicateShapeIdsFixed: 0,
    chartsFixed: 0,
    textRunsFixed: 0,
    packageEntriesFixed: 0,
    relationshipsRepaired: 0,
    invalidExtentsFixed: 0,
  };

  try {
    const out = await repackPptxBlob(blob, async (zip) => {
      for (const name of Object.keys(zip.files)) {
        if (/^ppt\/(slides|slideLayouts|slideMasters|notesSlides)\/[^/]+\.xml$/.test(name)) {
          const file = zip.file(name);
          if (!file) continue;
          const xml = await file.async("string");
          const isSlide = /^ppt\/slides\/slide\d+\.xml$/.test(name);
          const fixed = isSlide ? dedupeShapeIds(xml) : { xml, renumbered: 0 };
          const spaced = isSlide
            ? preserveDrawingTextWhitespace(fixed.xml)
            : { xml: fixed.xml, fixed: 0 };
          const clamped = clampShapeExtents(spaced.xml);
          if (fixed.renumbered > 0 || spaced.fixed > 0 || clamped.fixed > 0) {
            zip.file(name, clamped.xml);
            report.duplicateShapeIdsFixed += fixed.renumbered;
            report.textRunsFixed += spaced.fixed;
            report.invalidExtentsFixed += clamped.fixed;
          }
          continue;
        }


        if (/^ppt\/charts\/chart\d+\.xml$/.test(name)) {
          const file = zip.file(name);
          if (!file) continue;
          const xml = await file.async("string");
          const fixed = repairChartXml(xml);
          if (fixed !== xml) {
            zip.file(name, fixed);
            report.chartsFixed += 1;
          }
        }
      }

      // Relationship graph: dangling r:embed / orphan rels / duplicate ids in
      // layouts and masters are the remaining causes of PowerPoint's
      // "found a problem with content" prompt on open.
      const rel = await applyRelHygiene(zip);
      report.relationshipsRepaired =
        rel.danglingShapesRemoved +
        rel.danglingRefsStripped +
        rel.orphanRelsRemoved +
        rel.duplicateIdsFixed;
      if (report.relationshipsRepaired > 0) console.info("[pptx-rel-hygiene]", rel);

      report.packageEntriesFixed += await repairPresentationOrder(zip);
      report.packageEntriesFixed += await repairContentTypes(zip);
    });
    onReport?.(report);
    if (
      report.duplicateShapeIdsFixed > 0 ||
      report.chartsFixed > 0 ||
      report.textRunsFixed > 0 ||
      report.packageEntriesFixed > 0 ||
      report.relationshipsRepaired > 0 ||
      report.invalidExtentsFixed > 0
    ) {

      console.info("[pptx-terminal-hygiene]", report);
    }
    return out;
  } catch (error) {
    console.warn("[pptx-terminal-hygiene] skipped:", error);
    return blob;
  }
}