// -----------------------------------------------------------------------------
// NEXT pillar signs — batch production export.
//
// Generates one zip holding a press package per selected pillar size, plus a
// production manifest listing the quantity to print for each size. Everything
// in the batch is built from the layered vector pipeline (no DOM capture), so
// each size scales cleanly and opens in Illustrator with live layers.
//
//   <size-slug>/pdf/<name>.pdf          layered PDF/X-4 press file
//   <size-slug>/ai/<name>.ai            Illustrator-openable twin
//   <size-slug>/ai/<name>-ground.ai     editable vector gradient ground
//   PRODUCTION-MANIFEST.txt             sizes, quantities, geometry, notes
// -----------------------------------------------------------------------------

import JSZip from "jszip";

import { buildLondonPanelAi } from "./next-london-revise";
import type { LondonPanel } from "./next-london-signage";
import { buildPillarVectorPdf } from "./pillar-vector-pdf";
import {
  PILLAR_SPEC,
  pillarDivision,
  pillarFace,
  pillarGeometry,
  pillarKind,
  pillarName,
  pillarPanelSpec,
  pillarSize,
  pillarSlug,
  pillarStyleLabel,
  type PillarConfig,
} from "./next-pillar-masters";

export type PillarBatchItem = {
  /** Pillar size id from PILLAR_SIZES. */
  sizeId: string;
  /** Custom trim, only used when sizeId is "custom". */
  trimW?: number;
  trimH?: number;
  /** How many of this pillar to print. */
  quantity: number;
};

export type PillarBatchProgress = {
  index: number;
  total: number;
  label: string;
};

export type PillarBatchResult = {
  blob: Blob;
  filename: string;
  entries: { sizeId: string; sizeName: string; quantity: number; slug: string; bytes: number }[];
  totalQuantity: number;
};

function itemConfig(base: PillarConfig, item: PillarBatchItem): PillarConfig {
  const size = pillarSize(item.sizeId);
  return {
    ...base,
    sizeId: item.sizeId,
    trimW: item.sizeId === "custom" ? (item.trimW ?? size.trimW) : size.trimW,
    trimH: item.sizeId === "custom" ? (item.trimH ?? size.trimH) : size.trimH,
  } as PillarConfig;
}

function manifest(
  base: PillarConfig,
  rows: { config: PillarConfig; item: PillarBatchItem; vector: boolean }[],
): string {
  const total = rows.reduce((n, r) => n + r.item.quantity, 0);
  const lines = [
    "TransPerfect NEXT — pillar sign batch production manifest",
    "",
    `Event:           ${(base.eventLabel ?? "").trim() || "not filed to an event"}`,
    `Sign kind:       ${pillarKind(base.kind).name}`,
    `Division area:   ${pillarDivision(base.divisionId).name}`,
    `Gradient:        ${pillarStyleLabel(base.styleId)} (${base.styleId})`,
    `Face:            ${pillarFace(base.face).name}`,
    `Headline:        ${(base.headline ?? "").trim() || "none"}`,
    `Sub-line:        ${(base.subheadline ?? "").trim() || "none"}`,
    `QR payload:      ${(base.qrData ?? "").trim() || "none"}`,
    "",
    `Pillars in batch: ${rows.length} size${rows.length === 1 ? "" : "s"} · ${total} printed panel${total === 1 ? "" : "s"}`,
    "",
  ];
  for (const r of rows) {
    const geo = pillarGeometry(r.config);
    lines.push(
      `— ${geo.sizeName} · QTY ${r.item.quantity}`,
      `   folder:  ${pillarSlug(r.config)}/`,
      `   trim:    ${geo.trimW} x ${geo.trimH} mm`,
      `   bleed:   ${geo.bleedW} x ${geo.bleedH} mm (${geo.bleedEdge} mm per edge)`,
      `   safe:    ${Math.round(geo.safeInset)} mm inside trim`,
      `   artwork: ${r.vector ? "100% vector, layered, live Geist type" : "vector build unavailable — re-export this size on its own"}`,
      "",
    );
  }
  lines.push(
    `Colour:          convert to ${PILLAR_SPEC.colorMode} at output; body text 100K`,
    `Export preset:   ${PILLAR_SPEC.exportPreset}`,
    "Standard:        PDF/X-4, MediaBox / BleedBox / TrimBox set numerically",
    "",
    "Palette and geometry are fixed across every NEXT division area — only the",
    "approved division lockup and the copy change.",
  );
  return lines.join("\n");
}

export async function exportPillarBatch(opts: {
  config: PillarConfig;
  items: PillarBatchItem[];
  onProgress?: (p: PillarBatchProgress) => void;
}): Promise<PillarBatchResult> {
  const items = opts.items.filter((i) => i.quantity > 0);
  if (items.length === 0) throw new Error("Pick at least one pillar size with a quantity");

  const zip = new JSZip();
  const rows: { config: PillarConfig; item: PillarBatchItem; vector: boolean }[] = [];
  const entries: PillarBatchResult["entries"] = [];

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const config = itemConfig(opts.config, item);
    const geo = pillarGeometry(config);
    const slug = pillarSlug(config);
    opts.onProgress?.({
      index: i + 1,
      total: items.length,
      label: `Building ${geo.sizeName} (${i + 1}/${items.length})`,
    });

    let bytes: Uint8Array | null = null;
    try {
      bytes = (await buildPillarVectorPdf(config)).bytes;
    } catch {
      bytes = null;
    }
    const folder = `${slug}`;
    if (bytes) {
      const buf = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      zip.file(`${folder}/pdf/${slug}.pdf`, buf);
      zip.file(`${folder}/ai/${slug}.ai`, buf);
    } else {
      zip.file(
        `${folder}/pdf/BUILD-FAILED.txt`,
        "The layered vector build failed for this size in this session.\n" +
          "Open the pillar studio at this size and export it on its own to get the press file.\n",
      );
    }
    try {
      zip.file(
        `${folder}/ai/${slug}-ground.ai`,
        buildLondonPanelAi(pillarPanelSpec(config) as LondonPanel),
      );
    } catch {
      // Ground art is a convenience layer; skip it rather than failing the batch.
    }
    zip.file(
      `${folder}/QUANTITY.txt`,
      `${geo.sizeName}\nPrint quantity: ${item.quantity}\nTrim: ${geo.trimW} x ${geo.trimH} mm\n`,
    );

    rows.push({ config, item, vector: Boolean(bytes) });
    entries.push({
      sizeId: item.sizeId,
      sizeName: geo.sizeName,
      quantity: item.quantity,
      slug,
      bytes: bytes?.byteLength ?? 0,
    });
  }

  opts.onProgress?.({ index: items.length, total: items.length, label: "Packaging the batch zip" });
  zip.file("PRODUCTION-MANIFEST.txt", manifest(opts.config, rows));
  const blob = await zip.generateAsync({ type: "blob" });

  const eventSlug = (opts.config.eventLabel ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return {
    blob,
    filename: `next-pillar-batch${eventSlug ? `-${eventSlug}` : ""}-${pillarName(opts.config)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.zip`,
    entries,
    totalQuantity: entries.reduce((n, e) => n + e.quantity, 0),
  };
}
