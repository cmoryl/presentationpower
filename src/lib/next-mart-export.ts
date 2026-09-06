// NEXT MART — production export bundles.
//
// One zip per run, holding a press package for every signage set in the mart:
//
//   pillars/<set>/pdf/<slug>.pdf        layered PDF/X-4 press file
//   pillars/<set>/ai/<slug>.ai          Illustrator-openable twin (same bytes)
//   pillars/<set>/ai/<slug>-ground.ai   editable vector gradient ground
//   pillars/<set>/PRINT-SPEC.txt        footprint, bleed, safe, substrate, qty
//   artwork/<code>-<slug>/<file>.svg    supplied Illustrator master (vector)
//   artwork/<code>-<slug>/PRINT-SPEC.txt
//   flat-signage/<set>/PRINT-SPEC.txt   measured trim specs for flat print
//   PRODUCTION-MANIFEST.txt             every set, quantity and print spec
//
// Pillar art is built from the layered vector pipeline, so each set exports at
// its own measured footprint (wide entrance tower, slim till, thin wayfinding,
// standard logo column) without re-drawing anything.

import { loadLondonSignageFace } from "@/lib/next-london-text-outline";
import JSZip from "jszip";

import { buildLondonPanelAi } from "./next-london-revise";
import type { LondonPanel } from "./next-london-signage";
import { buildPillarVectorPdf } from "./pillar-vector-pdf";
import {
  PILLAR_SPEC,
  pillarGeometry,
  pillarKind,
  pillarPanelSpec,
  pillarSlug,
  pillarStyleLabel,
} from "./next-pillar-masters";
import {
  NEXT_MART,
  NEXT_MART_ARTWORK,
  NEXT_MART_LOGOS,
  NEXT_MART_FLAT_SIGNS,
  NEXT_MART_PILLARS,
  martPillarConfig,
  type MartArtwork,
  type MartFlatSign,
  type MartPillarSign,
} from "./next-mart";
import { martFlatConfig, martFlatArtworkId, martArtwork } from "./next-mart-placement";
import {
  LONDON_STOP,
  martStopEventLabel,
  martStopFlats,
  martStopPillarConfig,
  martStopPillars,
  martStopSlug,
  type MartStop,
} from "./next-mart-stops";

export type MartExportProgress = { index: number; total: number; label: string };

export type MartExportEntry = {
  id: string;
  name: string;
  kind: "pillar" | "artwork" | "flat";
  spec: string;
  quantity: number;
  bytes: number;
  vector: boolean;
};

export type MartExportResult = {
  blob: Blob;
  filename: string;
  entries: MartExportEntry[];
  totalPanels: number;
};

function slugify(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pillarSpecSheet(sign: MartPillarSign, stop: MartStop): string {
  const config = martStopPillarConfig(stop, sign);
  const geo = pillarGeometry(config);
  return [
    `NEXT MART — ${sign.name}`,
    "",
    `Event:        ${martStopEventLabel(stop)}`,
    `Venue:        ${stop.venue} · ${stop.dates}`,
    `Role:         ${sign.role}`,
    `Placement:    ${sign.placement}`,
    `Sign kind:    ${pillarKind(config.kind).name}`,
    `Footprint:    ${geo.sizeName}`,
    `Trim:         ${geo.trimW} x ${geo.trimH} mm`,
    `Bleed:        ${geo.bleedW} x ${geo.bleedH} mm (${geo.bleedEdge} mm per edge)`,
    `Safe area:    ${Math.round(geo.safeInset)} mm inside trim`,
    `Gradient:     ${pillarStyleLabel(config.styleId)} (${config.styleId})`,
    `Face:         ${config.face}`,
    `Headline:     ${(config.headline ?? "").trim() || "none"}${config.verticalHeadline ? " (runs vertically)" : ""}`,
    `Sub-line:     ${(config.subheadline ?? "").trim() || "none"}`,
    `QR payload:   ${(config.qrData ?? "").trim() || "none"}`,
    `Substrate:    ${sign.substrate}`,
    `Quantity:     ${sign.quantity}`,
    "",
    `Colour:       convert to ${PILLAR_SPEC.colorMode} at output; body text 100K`,
    `Preset:       ${PILLAR_SPEC.exportPreset}`,
    "Standard:     PDF/X-4, layered (OCG), MediaBox / BleedBox / TrimBox set numerically",
    "Artwork:      100% vector — gradients as mesh shading, type embedded",
    "",
  ].join("\n");
}

function artworkSpecSheet(art: MartArtwork): string {
  return [
    `NEXT MART — ${art.headline} (${art.code} · ${art.category})`,
    "",
    `Supplied master: ${art.filename}`,
    `Trim:            ${art.trimW} x ${art.trimH} mm`,
    `Bleed:           ${art.bleed} mm per edge`,
    `Die:             ${art.die}`,
    `Substrate:       ${art.substrate}`,
    `Finishing:       ${art.finishing}`,
    `Quantity:        ${art.quantity}`,
    "",
    "Layers:          01_BLEED · 02_BOARD · 04_ICON · 05_TYPE · 07_CUT-CONTOUR",
    "Cut path:        07_CUT-CONTOUR is a magenta spot path — 100% M, do not print",
    `Colour:          convert to ${PILLAR_SPEC.colorMode} at output; body text 100K`,
    "",
  ].join("\n");
}

function flatSpecSheet(sign: MartFlatSign): string {
  return [
    `NEXT MART — ${sign.name}`,
    "",
    `Role:        ${sign.role}`,
    `Trim:        ${sign.trimW} x ${sign.trimH} mm`,
    `Bleed:       ${sign.bleed} mm per edge`,
    `Sheet:       ${sign.trimW + sign.bleed * 2} x ${sign.trimH + sign.bleed * 2} mm`,
    `Face:        ${sign.face}`,
    `Substrate:   ${sign.substrate}`,
    `Finishing:   ${sign.finishing}`,
    `Quantity:    ${sign.quantity}`,
    `Copy:        ${sign.copy.join(" · ")}`,
    "",
    `Colour:      convert to ${PILLAR_SPEC.colorMode} at output; body text 100K`,
    `Preset:      ${PILLAR_SPEC.exportPreset}`,
    "Ground:      approved NEXT gradient — no separate mart palette",
    "",
  ].join("\n");
}

function manifest(entries: MartExportEntry[], stop: MartStop): string {
  const total = entries.reduce((n, e) => n + e.quantity, 0);
  const lines = [
    "TransPerfect NEXT MART — signage production manifest",
    "",
    `Event:   ${martStopEventLabel(stop)}`,
    `Venue:   ${stop.venue} · ${stop.dates}`,
    `Sets:    ${entries.length}`,
    `Panels:  ${total}`,
    "",
    "Pillar sets ship as layered PDF/X-4 with an Illustrator-openable .ai twin and",
    "an editable vector gradient ground. Supplied die-cut artwork ships as the",
    "original layered Illustrator master. Flat signage ships as measured print",
    "specs for the printer's own build.",
    "",
  ];
  for (const e of entries) {
    lines.push(
      `— ${e.name} · ${e.kind.toUpperCase()} · QTY ${e.quantity}`,
      `   spec:    ${e.spec}`,
      `   artwork: ${
        e.vector
          ? e.kind === "pillar"
            ? "layered vector PDF/X-4 + .ai"
            : "layered Illustrator vector master"
          : "spec only — printer builds to these measurements"
      }`,
      "",
    );
  }
  lines.push(
    "Palette and geometry are fixed across every NEXT area — only the approved",
    "lockup and the copy change.",
  );
  return lines.join("\n");
}

function readme(entries: MartExportEntry[], stop: MartStop): string {
  return [
    `TransPerfect NEXT MART — ${martStopEventLabel(stop)} · complete signage pack`,
    "",
    "Folders",
    "  pillars/        layered PDF/X-4 press files + Illustrator .ai twins + editable grounds",
    "  artwork/        supplied die-cut Illustrator masters, cut contour preserved",
    "  flat-signage/   measured trim/bleed print specs (and placed masters where supplied)",
    "  logos/          approved NEXT MART lockups (EPS, SVG, PNG) + usage notes",
    "  PRODUCTION-MANIFEST.txt   every set, quantity and print spec",
    "",
    `Sets: ${entries.length} · Panels: ${entries.reduce((n, e) => n + e.quantity, 0)}`,
    `Colour: convert to ${PILLAR_SPEC.colorMode} at output; body text 100K.`,
    `Preset: ${PILLAR_SPEC.exportPreset}`,
    "",
  ].join("\n");
}

/** Build the full NEXT MART press bundle: every signage set, correct sizes. */
export async function exportMartBundle(opts?: {
  onProgress?: (p: MartExportProgress) => void;
  /** Limit to specific pillar set ids (defaults to every set). */
  pillarIds?: string[];
  /** Include the supplied die-cut artwork masters. Default true. */
  includeArtwork?: boolean;
  /** Include measured flat-signage print specs. Default true. */
  includeFlat?: boolean;
  /** Include the approved NEXT MART logo pack. Default true. */
  includeLogos?: boolean;
  /** City/stop template to build. Defaults to the London reference kit. */
  stop?: MartStop;
}): Promise<MartExportResult> {
  const stop = opts?.stop ?? LONDON_STOP;
  const allPillars = martStopPillars(stop);
  const pillars = opts?.pillarIds?.length
    ? allPillars.filter((p) => opts.pillarIds!.includes(p.id))
    : allPillars;
  const artwork = opts?.includeArtwork === false ? [] : NEXT_MART_ARTWORK;
  const flat = opts?.includeFlat === false ? [] : martStopFlats(stop);

  const total = pillars.length + artwork.length + flat.length + 1;
  let step = 0;
  const tick = (label: string) => {
    step += 1;
    opts?.onProgress?.({ index: step, total, label });
  };

  const zip = new JSZip();
  const entries: MartExportEntry[] = [];

  // ─────────────────────────────────────────────── pillar sets (vector build)
  for (const sign of pillars) {
  // Copy is outlined into vector paths, so the signage face must be in memory
  // before any master is built.
  await loadLondonSignageFace();
    tick(`Building ${sign.name}`);
    const config = martStopPillarConfig(stop, sign);
    const geo = pillarGeometry(config);
    const folder = `pillars/${slugify(sign.name)}`;
    const slug = pillarSlug(config);

    let bytes: Uint8Array | null = null;
    try {
      bytes = (await buildPillarVectorPdf(config)).bytes;
    } catch {
      bytes = null;
    }
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
        "The layered vector build failed for this set in this session.\n" +
          "Open the pillar studio at this footprint and export it on its own.\n",
      );
    }
    try {
      zip.file(
        `${folder}/ai/${slug}-ground.ai`,
        buildLondonPanelAi(pillarPanelSpec(config) as LondonPanel),
      );
    } catch {
      /* ground art is a convenience layer */
    }
    zip.file(`${folder}/PRINT-SPEC.txt`, pillarSpecSheet(sign, stop));

    entries.push({
      id: sign.id,
      name: sign.name,
      kind: "pillar",
      spec: `${geo.sizeName} · trim ${geo.trimW} x ${geo.trimH} mm · bleed ${geo.bleedEdge} mm`,
      quantity: sign.quantity,
      bytes: bytes?.byteLength ?? 0,
      vector: Boolean(bytes),
    });
  }

  // ───────────────────────────────────────── supplied die-cut artwork masters
  for (const art of artwork) {
    tick(`Packing ${art.headline}`);
    const folder = `artwork/${art.code}-${slugify(art.headline)}`;
    let ok = false;
    let size = 0;
    try {
      const res = await fetch(art.url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        zip.file(`${folder}/${art.filename}`, buf);
        size = buf.byteLength;
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      zip.file(
        `${folder}/DOWNLOAD-FAILED.txt`,
        `The supplied master could not be fetched in this session.\nSource: ${art.url}\n`,
      );
    }
    zip.file(`${folder}/PRINT-SPEC.txt`, artworkSpecSheet(art));
    entries.push({
      id: art.id,
      name: `${art.headline} (${art.category})`,
      kind: "artwork",
      spec: `trim ${art.trimW} x ${art.trimH} mm · bleed ${art.bleed} mm · ${art.die}`,
      quantity: art.quantity,
      bytes: size,
      vector: ok,
    });
  }

  // ──────────────────────── flat signage: editable master + measured spec
  // Flat panels run through the same layered vector engine as the pillars, at
  // their own measured footprint, with the supplied category artwork placed on
  // its own layer where the set carries one.
  for (const sign of flat) {
    tick(`Building ${sign.name}`);
    const folder = `flat-signage/${slugify(sign.name)}`;
    zip.file(`${folder}/PRINT-SPEC.txt`, flatSpecSheet(sign));

    const config = { ...martFlatConfig(sign), eventLabel: martStopEventLabel(stop) };
    const artId = martFlatArtworkId(sign);
    const art = martArtwork(artId);
    let bytes: Uint8Array | null = null;
    try {
      bytes = (await buildPillarVectorPdf(config)).bytes;
    } catch {
      bytes = null;
    }
    if (bytes) {
      const buf = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      zip.file(`${folder}/pdf/${slugify(sign.name)}.pdf`, buf);
      zip.file(`${folder}/ai/${slugify(sign.name)}.ai`, buf);
    }

    entries.push({
      id: sign.id,
      name: sign.name,
      kind: "flat",
      spec:
        `trim ${sign.trimW} x ${sign.trimH} mm · bleed ${sign.bleed} mm · ${sign.substrate}` +
        (art ? ` · placed art: ${art.headline}` : ""),
      quantity: sign.quantity,
      bytes: bytes?.byteLength ?? 0,
      vector: Boolean(bytes),
    });
  }

  // ─────────────────────────────────────────── approved NEXT MART logo pack
  if (opts?.includeLogos !== false) {
    for (const logo of NEXT_MART_LOGOS) {
      const folder = `logos/${logo.id}`;
      for (const [ext, url] of [
        ["eps", logo.epsUrl],
        ["svg", logo.svgUrl],
        ["png", logo.pngUrl],
      ] as const) {
        try {
          const res = await fetch(url);
          if (res.ok) zip.file(`${folder}/${logo.id}.${ext}`, await res.arrayBuffer());
        } catch {
          /* keep packing the rest of the pack */
        }
      }
      zip.file(
        `${folder}/USAGE.txt`,
        [
          logo.name,
          "",
          `Face:  ${logo.face}`,
          `Usage: ${logo.usage}`,
          "",
          "Never recolour, distort, keyline or rebuild the lockup.",
          "",
        ].join("\n"),
      );
    }
  }

  tick("Packaging the bundle");
  zip.file("PRODUCTION-MANIFEST.txt", manifest(entries, stop));
  zip.file("READ-ME-FIRST.txt", readme(entries, stop));

  const blob = await zip.generateAsync({ type: "blob" });

  return {
    blob,
    filename: `next-mart-signage-${martStopSlug(stop)}.zip`,
    entries,
    totalPanels: entries.reduce((n, e) => n + e.quantity, 0),
  };
}
