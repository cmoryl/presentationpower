// Pack export for the Legal "bloom" ads.
//
// A pack is a single .zip holding every requested ad at every requested trim,
// filed the way a studio hands work to a media team, plus the copy deck and the
// layout settings that produced the artwork:
//
//   TP-LEGAL_BLOOM_PACK_<date>/
//     README.txt
//     manifest.json
//     01_Artwork/
//       LinkedIn-Post_1200x1200/
//         TP-LEGAL_BLOOM_TRICKY_LINKEDIN-POST_1200x1200_2x_v1.png
//     02_Copy/
//       copy-deck.csv
//       copy-deck.txt
//     03_Specifications/
//       placements.csv
//       layout-settings.json
//
// Naming follows the usual brand_campaign_asset_placement_dimensions_scale_version
// order so files sort and filter predictably in an asset manager.

import {
  LEGAL_BLOOM_CONCEPT,
  bloomHeadline,
  type BloomAperture,
  type BloomScene,
  type BloomSide,
} from "@/lib/social-legal-bloom";
import type { BloomAdLayout } from "@/lib/social-legal-bloom-layout";

export const BLOOM_PACK_BRAND = "TP-LEGAL";
export const BLOOM_PACK_CAMPAIGN = "BLOOM";
export const BLOOM_PACK_VERSION = "v1";

export type BloomPackSize = { id: string; label: string; w: number; h: number };

/** UPPER-KEBAB, safe in any filesystem and in every asset manager. */
export function packToken(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .toUpperCase() || "UNTITLED"
  );
}

/** Title-case-kebab, used for the folder a placement's files sit in. */
export function packFolderToken(text: string): string {
  return (
    text
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-") || "Untitled"
  );
}

/** The asset name for one ad at one trim, without the extension. */
export function bloomAssetStem(
  scene: BloomScene,
  size: BloomPackSize,
  scale: number,
): string {
  return [
    BLOOM_PACK_BRAND,
    BLOOM_PACK_CAMPAIGN,
    packToken(scene.turn),
    packToken(size.label),
    `${size.w}x${size.h}`,
    `${scale}x`,
    BLOOM_PACK_VERSION,
  ].join("_");
}

export function bloomPlacementFolder(size: BloomPackSize): string {
  return `${packFolderToken(size.label)}_${size.w}x${size.h}`;
}

/** yyyy-mm-dd, the date the pack was written. */
export function packStamp(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function bloomPackRoot(now = new Date()): string {
  return `${BLOOM_PACK_BRAND}_${BLOOM_PACK_CAMPAIGN}_PACK_${packStamp(now)}`;
}

export function bloomAssetPath(
  scene: BloomScene,
  size: BloomPackSize,
  scale: number,
  format: "png" | "jpeg",
): string {
  const ext = format === "jpeg" ? "jpg" : "png";
  return `01_Artwork/${bloomPlacementFolder(size)}/${bloomAssetStem(scene, size, scale)}.${ext}`;
}

// ---------------------------------------------------------------------------
// The written sections

function csvCell(value: string | number | undefined): string {
  const text = value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRows(rows: (string | number | undefined)[][]): string {
  return `${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function bloomCopyDeckCsv(scenes: BloomScene[]): string {
  return csvRows([
    ["ad_id", "accent_word", "headline", "lead", "accent", "tail", "supporting_line", "photograph", "accent_colour"],
    ...scenes.map((s) => [
      s.id,
      s.turn,
      bloomHeadline(s),
      s.lead,
      s.turn,
      s.tail,
      s.support,
      s.shot,
      s.colour,
    ]),
  ]);
}

export function bloomCopyDeckText(scenes: BloomScene[]): string {
  const head = [
    `${LEGAL_BLOOM_CONCEPT.name}`,
    `${LEGAL_BLOOM_CONCEPT.line}`,
    "",
    "Copy deck. The accent word is the italic call-out in each ad. The division",
    "name is carried by the lockup and is never typed in the artwork.",
    "",
  ];
  const body = scenes.map((s, i) =>
    [
      `${String(i + 1).padStart(2, "0")}. ${s.id}`,
      `    Headline:   ${bloomHeadline(s)}`,
      `    Accent:     ${s.turn}`,
      `    Supporting: ${s.support}`,
      `    Photograph: ${s.shot}`,
      `    Colour:     ${s.colour}`,
    ].join("\n"),
  );
  return `${[...head, ...body].join("\n")}\n`;
}

export function bloomPlacementsCsv(sizes: BloomPackSize[], scale: number, format: "png" | "jpeg"): string {
  return csvRows([
    ["placement", "width_px", "height_px", "aspect", "export_scale", "file_format", "folder"],
    ...sizes.map((s) => [
      s.label,
      s.w,
      s.h,
      (s.w / s.h).toFixed(3),
      `${scale}x`,
      format === "jpeg" ? "JPG" : "PNG",
      bloomPlacementFolder(s),
    ]),
  ]);
}

export type BloomPackEntry = {
  scene: BloomScene;
  size: BloomPackSize;
  aperture: BloomAperture;
  side: BloomSide;
  layout: BloomAdLayout;
  arranged: boolean;
  path: string;
};

export function bloomLayoutSettingsJson(entries: BloomPackEntry[], scale: number): string {
  return `${JSON.stringify(
    {
      campaign: LEGAL_BLOOM_CONCEPT.name,
      variation: LEGAL_BLOOM_CONCEPT.line,
      exported: new Date().toISOString(),
      exportScale: scale,
      note: "Sizes are fractions of the trim: x/w against width, y/h against height. headPx, supportPx and the lockup height are fractions of the short edge. arranged=false means the composed automatic layout was used.",
      ads: entries.map((e) => ({
        ad: e.scene.id,
        placement: e.size.id,
        trim: { w: e.size.w, h: e.size.h },
        pictureCut: e.aperture,
        copySits: e.side,
        arranged: e.arranged,
        file: e.path,
        layout: e.layout,
      })),
    },
    null,
    2,
  )}\n`;
}

export function bloomPackManifestJson(entries: BloomPackEntry[], scale: number, format: "png" | "jpeg"): string {
  const ads = [...new Set(entries.map((e) => e.scene.id))];
  const placements = [...new Set(entries.map((e) => e.size.id))];
  return `${JSON.stringify(
    {
      pack: bloomPackRoot(),
      campaign: LEGAL_BLOOM_CONCEPT.name,
      variation: LEGAL_BLOOM_CONCEPT.line,
      version: BLOOM_PACK_VERSION,
      exported: new Date().toISOString(),
      fileFormat: format === "jpeg" ? "JPG" : "PNG",
      exportScale: `${scale}x`,
      adCount: ads.length,
      placementCount: placements.length,
      fileCount: entries.length,
      ads,
      placements,
      naming: "BRAND_CAMPAIGN_ACCENTWORD_PLACEMENT_WIDTHxHEIGHT_SCALE_VERSION",
      sections: {
        "01_Artwork": "Rendered ads, one folder per placement.",
        "02_Copy": "The copy deck as a spreadsheet and as plain text.",
        "03_Specifications": "Placement list and the layout settings behind each file.",
      },
      files: entries.map((e) => e.path),
    },
    null,
    2,
  )}\n`;
}

export function bloomPackReadme(entries: BloomPackEntry[], scale: number, format: "png" | "jpeg"): string {
  const ads = [...new Set(entries.map((e) => e.scene.id))];
  const placements = [...new Set(entries.map((e) => e.size.label))];
  return `${[
    LEGAL_BLOOM_CONCEPT.name,
    LEGAL_BLOOM_CONCEPT.line,
    "",
    `Pack:        ${bloomPackRoot()}`,
    `Written:     ${packStamp()}`,
    `Ads:         ${ads.length} (${ads.join(", ")})`,
    `Placements:  ${placements.length} (${placements.join(", ")})`,
    `Files:       ${entries.length} ${format === "jpeg" ? "JPG" : "PNG"} at ${scale}x`,
    "",
    "WHAT IS IN HERE",
    "  01_Artwork/           the ads, one folder per placement",
    "  02_Copy/              copy-deck.csv and copy-deck.txt",
    "  03_Specifications/    placements.csv and layout-settings.json",
    "  manifest.json         a machine-readable index of the pack",
    "",
    "FILE NAMING",
    "  BRAND_CAMPAIGN_ACCENTWORD_PLACEMENT_WIDTHxHEIGHT_SCALE_VERSION",
    `  e.g. ${entries[0] ? bloomAssetStem(entries[0].scene, entries[0].size, scale) : `${BLOOM_PACK_BRAND}_${BLOOM_PACK_CAMPAIGN}_TRICKY_LINKEDIN-POST_1200x1200_${scale}x_${BLOOM_PACK_VERSION}`}`,
    "",
    "HOW TO USE IT",
    "  These are screen renders, sized for social and digital placement. They are",
    "  proofs for on-screen use, not press-ready vector masters — anything going to",
    "  print should be rebuilt for the press specification.",
    "  The division name is carried by the lockup and is never typed in the artwork.",
    "",
  ].join("\n")}\n`;
}
