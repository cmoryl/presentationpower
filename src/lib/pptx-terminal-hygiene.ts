/**
 * Final PowerPoint package hygiene.
 *
 * This pass deliberately runs after every exporter transformation. Earlier
 * passes may add groups, move backgrounds to masters, deduplicate media, or add
 * movie timing; the bytes delivered to the user therefore need one final,
 * unconditional schema and identifier check.
 */
import { repairChartXml } from "./pptx-chart-repair";
import { repairContentTypes } from "./pptx-content-types";
import { dedupeShapeIds } from "./pptx-media-repair";
import { repairPresentationOrder } from "./pptx-presentation-order";
import { repackPptxBlob } from "./pptx-repack";

export interface TerminalHygieneReport {
  duplicateShapeIdsFixed: number;
  chartsFixed: number;
  packageEntriesFixed: number;
}

/** Re-assert invariants on the exact final package that will be downloaded. */
export async function applyTerminalPptxHygiene(
  blob: Blob,
  onReport?: (report: TerminalHygieneReport) => void,
): Promise<Blob> {
  const report: TerminalHygieneReport = {
    duplicateShapeIdsFixed: 0,
    chartsFixed: 0,
    packageEntriesFixed: 0,
  };

  try {
    const out = await repackPptxBlob(blob, async (zip) => {
      for (const name of Object.keys(zip.files)) {
        if (/^ppt\/slides\/slide\d+\.xml$/.test(name)) {
          const file = zip.file(name);
          if (!file) continue;
          const xml = await file.async("string");
          const fixed = dedupeShapeIds(xml);
          if (fixed.renumbered > 0) {
            zip.file(name, fixed.xml);
            report.duplicateShapeIdsFixed += fixed.renumbered;
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

      report.packageEntriesFixed += await repairPresentationOrder(zip);
      report.packageEntriesFixed += await repairContentTypes(zip);
    });
    onReport?.(report);
    if (
      report.duplicateShapeIdsFixed > 0 ||
      report.chartsFixed > 0 ||
      report.packageEntriesFixed > 0
    ) {
      console.info("[pptx-terminal-hygiene]", report);
    }
    return out;
  } catch (error) {
    console.warn("[pptx-terminal-hygiene] skipped:", error);
    return blob;
  }
}