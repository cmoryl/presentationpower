// -----------------------------------------------------------------------------
// Export verification harness (dev only)
//
// Drives the real PPTX exporter across the full matrix of approved modules ×
// alternate looks (style packs) and audits the produced bytes: does each slide
// part carry a background (rasterized pack sheet / image / solid fill), and do
// the content layers (shapes, pictures, text runs) survive the export?
//
// Exposed as window.__tpExportVerify so a headless run can batch through the
// matrix without re-mounting React for every combination.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import JSZip from "jszip";
import { BRAND_MODES, MODULE_VARIANTS, SECTION_FRAMEWORKS } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { STYLE_PACKS, packToneBrand, stylePackById, type StylePack } from "@/lib/style-packs";
import { buildLayerReport, type LayerReport } from "@/lib/layer-report";
import {
  diffLayerTrees,
  snapshotFromReports,
  summarizeTreeDiff,
  type LayerTreeSnapshot,
  type TreeDiffResult,
} from "@/lib/layer-tree-diff";

export const Route = createFileRoute("/dev/export-verify")({
  component: ExportVerifyHarness,
  head: () => ({
    meta: [
      { title: "Export verification harness · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Internal harness that exports every approved module against every alternate look and audits background and layer fidelity.",
      },
      { property: "og:title", content: "Export verification harness" },
      {
        property: "og:description",
        content: "Audits PPTX background and layer fidelity across the full module × look matrix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Audit = {
  variantId: string;
  packId: string | null;
  mode: "light" | "dark";
  ok: boolean;
  bg: "image" | "solid" | "none";
  shapes: number;
  pics: number;
  runs: number;
  bytes: number;
  /** Icon glyphs requested by the renderers, and how many were dropped. */
  iconsRequested: number;
  iconsMissing: number;
  problems: string[];
  /** Per-slide object inventory: what exported, and is it editable + layered? */
  layers: LayerReport[];
  error?: string;
};

/** Stable identity for one matrix cell: module × look × mode. */
function auditKey(a: Pick<Audit, "variantId" | "packId" | "mode">): string {
  return `${a.variantId}@${a.packId ?? "base"}@${a.mode}`;
}

const BASELINE_KEY = "tp.export.layer-tree.baselines";

function readBaselines(): Record<string, LayerTreeSnapshot> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(BASELINE_KEY) ?? "{}") as Record<
      string,
      LayerTreeSnapshot
    >;
  } catch {
    return {};
  }
}

function writeBaseline(snapshot: LayerTreeSnapshot) {
  const all = readBaselines();
  all[snapshot.key] = snapshot;
  localStorage.setItem(BASELINE_KEY, JSON.stringify(all));
}

function count(xml: string, re: RegExp): number {
  return (xml.match(re) ?? []).length;
}

async function auditBlob(
  blob: Blob,
): Promise<Omit<Audit, "variantId" | "packId" | "mode" | "iconsRequested" | "iconsMissing">> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const slideName = Object.keys(zip.files).find((n) => /^ppt\/slides\/slide1\.xml$/.test(n));
  const problems: string[] = [];
  if (!slideName) {
    return {
      ok: false,
      bg: "none",
      shapes: 0,
      pics: 0,
      runs: 0,
      bytes: blob.size,
      layers: [],
      problems: ["no slide part in package"],
    };
  }
  const xml = await zip.file(slideName)!.async("string");
  const presentationXml = (await zip.file("ppt/presentation.xml")?.async("string")) ?? "";
  const slideParts = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)/)![1]) - Number(b.match(/(\d+)/)![1]));
  const layers: LayerReport[] = [];
  for (const part of slideParts) {
    layers.push(buildLayerReport(await zip.file(part)!.async("string"), presentationXml));
  }
  layers.forEach((rep, idx) => {
    for (const p of rep.problems) problems.push(`slide ${idx + 1}: ${p}`);
  });
  const media = Object.keys(zip.files).filter((n) => /^ppt\/media\//.test(n));
  const pics = count(xml, /<p:pic>/g);
  const shapes = count(xml, /<p:sp>/g);
  const runs = count(xml, /<a:t>/g);
  const hasBlip = /<a:blip/.test(xml);
  const hasSolid = /<p:bg>[\s\S]*?<a:solidFill/.test(xml) || /<a:solidFill/.test(xml);
  const bg: "image" | "solid" | "none" = hasBlip && media.length > 0 ? "image" : hasSolid ? "solid" : "none";

  if (bg === "none") problems.push("slide has no background fill or image");
  // A layered module must contain a decor plate AND independently selectable
  // native objects. One full-slide picture plus text is the old flattened path
  // and must fail this harness even though it technically has a background.
  if (shapes === 0) problems.push("no native editable shapes on layered slide");
  if (pics === 0) problems.push("no pictures on slide");
  if (runs === 0) problems.push("no text runs on slide");
  return { ok: problems.length === 0, bg, shapes, pics, runs, bytes: blob.size, layers, problems };
}

const packCache = new Map<string, { data: string | null; surface: string }>();

async function packSheet(pack: StylePack, variantId: string, layoutId: string) {
  const key = `${pack.id}:${layoutId}`;
  const hit = packCache.get(key);
  if (hit) return hit;
  const { rasterizePackBackground } = await import("@/lib/pack-background-raster");
  const out = await rasterizePackBackground(pack, variantId, layoutId);
  packCache.set(key, out);
  return out;
}

function sectionFor(familyId: string): string {
  return SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(familyId))?.id ?? "SF-01";
}

async function verifyOne(
  variantId: string,
  packId: string | null,
  modeIn: "light" | "dark",
): Promise<Audit> {
  const variant = MODULE_VARIANTS.find((v) => v.id === variantId);
  const baseBrand = BRAND_MODES[0];
  const pack = packId ? stylePackById(packId) : null;
  const mode = pack ? pack.mode : modeIn;
  const base: Audit = {
    variantId,
    packId,
    mode,
    ok: false,
    bg: "none",
    shapes: 0,
    pics: 0,
    runs: 0,
    bytes: 0,
    iconsRequested: 0,
    iconsMissing: 0,
    layers: [],
    problems: [],
  };
  if (!variant) return { ...base, problems: ["unknown variant"], error: "unknown variant" };
  try {
    const brief = resolveDivisionBrief(baseBrand);
    const content = seedDivisionContent(
      variant.id,
      brief,
      "Verification section",
      baseBrand,
    ) as Record<string, unknown>;
    const layoutId = variant.permittedLayoutIds[0];
    const brand = pack ? packToneBrand(baseBrand, pack) : baseBrand;
    const packBackground = pack ? await packSheet(pack, variant.id, layoutId) : null;
    if (pack && !packBackground?.data) base.problems.push("pack sheet failed to rasterize");

    const { exportDeckToPptx } = await import("@/lib/pptx-export");
    const deck = {
      id: `verify-${variant.id}`,
      createdAt: new Date().toISOString(),
      title: `Verify ${variant.id}`,
      briefId: "export-verify",
      brandModeId: baseBrand.id,
      archetypeId: "single-module",
      slides: [
        {
          id: `slide-${variant.id}`,
          position: 0,
          sectionId: sectionFor(variant.familyId),
          variantId: variant.id,
          layoutId,
          content,
          changes: [],
        },
      ],
    } as unknown as Parameters<typeof exportDeckToPptx>[0];

    const res = await exportDeckToPptx(deck, brand, {
      output: "blob",
      forceMode: mode,
      packBackground,
      // Audit the product default itself: one decor-only image plate plus native
      // shapes, pictures, icons, logos and text. Using "editable" here previously
      // let regressions that flattened layered exports pass CI unnoticed.
      fidelity: "layered",
    });
    if (res.failedSlides?.length) base.problems.push(`renderer failed: ${res.failedSlides.join(",")}`);
    if (!res.blob) return { ...base, problems: [...base.problems, "no blob returned"] };
    const a = await auditBlob(res.blob);
    const problems = [...base.problems, ...a.problems];
    // A dropped glyph is a hard failure: an empty icon well reads as a broken
    // slide, and layer-presence auditing alone would let half a deck's icons
    // vanish while still passing green.
    base.iconsRequested = res.integrity?.iconsRequested ?? 0;
    base.iconsMissing = res.integrity?.iconsMissing ?? 0;
    if (base.iconsMissing > 0) {
      problems.push(
        `${base.iconsMissing} of ${base.iconsRequested} icon glyph(s) could not be embedded`,
      );
    }
    // Pack exports must carry the rasterized sheet, not a bare solid.
    if (pack && a.bg !== "image") problems.push(`pack export background is ${a.bg}, expected image`);
    return { ...base, ...a, problems, ok: problems.length === 0 };
  } catch (err) {
    return {
      ...base,
      problems: [...base.problems, "threw"],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// -----------------------------------------------------------------------------
// PATH-PARITY CAPTURE
//
// The single-slide download (`downloadSingleSlidePptx`, used by the library card
// chips and the public module wall) is a second entry point into the exporter.
// This helper exports the SAME module through both entry points with identical
// content so a headless run can diff the packages and prove the two paths agree
// on background, imagery and icon handling.
// -----------------------------------------------------------------------------

export interface PathPair {
  variantId: string;
  packId: string | null;
  mode: "light" | "dark";
  fidelity: string;
  deck: string | null;
  single: string | null;
  error?: string;
}

async function pairOne(
  variantId: string,
  packId: string | null,
  modeIn: "light" | "dark",
  fidelity: "editable" | "layered" | "exact",
): Promise<PathPair> {
  const variant = MODULE_VARIANTS.find((v) => v.id === variantId);
  const baseBrand = BRAND_MODES[0];
  const pack = packId ? stylePackById(packId) : null;
  const mode = pack ? pack.mode : modeIn;
  const out: PathPair = { variantId, packId, mode, fidelity, deck: null, single: null };
  if (!variant) return { ...out, error: "unknown variant" };
  try {
    const brief = resolveDivisionBrief(baseBrand);
    const content = seedDivisionContent(
      variant.id,
      brief,
      "Verification section",
      baseBrand,
    ) as Record<string, unknown>;
    const layoutId = variant.permittedLayoutIds[0];
    const sectionId = sectionFor(variant.familyId);
    const brand = pack ? packToneBrand(baseBrand, pack) : baseBrand;
    const packBackground = pack ? await packSheet(pack, variant.id, layoutId) : null;

    const [{ exportDeckToPptx }, { downloadSingleSlidePptx }] = await Promise.all([
      import("@/lib/pptx-export"),
      import("@/lib/single-slide-pptx"),
    ]);
    const deck = {
      id: `pair-${variant.id}`,
      createdAt: new Date().toISOString(),
      title: `Pair ${variant.id}`,
      briefId: "path-parity",
      brandModeId: baseBrand.id,
      archetypeId: "single-module",
      slides: [
        {
          id: `slide-${variant.id}`,
          position: 0,
          sectionId,
          variantId: variant.id,
          layoutId,
          content,
          changes: [],
        },
      ],
    } as unknown as Parameters<typeof exportDeckToPptx>[0];

    const deckRes = await exportDeckToPptx(deck, brand, {
      output: "blob",
      forceMode: mode,
      packBackground,
      fidelity,
    });
    if (deckRes.blob) out.deck = await blobToBase64(deckRes.blob);

    const singleRes = await downloadSingleSlidePptx({
      output: "blob",
      variantId: variant.id,
      layoutId,
      sectionId,
      content,
      brand: baseBrand,
      mode,
      label: variant.name,
      pack,
      fidelity,
      quality: "standard",
      debugObjectTree: false,
    });
    if (singleRes.blob) out.single = await blobToBase64(singleRes.blob);
    return out;
  } catch (err) {
    return { ...out, error: err instanceof Error ? err.message : String(err) };
  }
}



// -----------------------------------------------------------------------------
// PIXEL-DIFF CAPTURE (regression gate, NOT ground truth)
//
// HONEST FRAMING — read this before trusting any number produced here:
// LibreOffice is NOT a PowerPoint renderer. It has its own text layout engine,
// its own gradient/blend handling, and its own font substitution. A score
// produced from a LibreOffice render tells you only whether OUR export changed
// relative to a previously recorded LibreOffice render of the SAME cell. It is
// a drift detector. It is not evidence of PowerPoint fidelity, and nothing here
// should ever be described as such.
//
// This helper returns, for one matrix cell, the two artifacts the comparison
// needs: the exported .pptx bytes, and the build-side raster taken from the
// SAME offscreen stage the exporter itself rasterizes from
// (slide-exact-raster.tsx). Using a second, independent capture path would make
// the score measure the capture difference rather than the export.
// -----------------------------------------------------------------------------

export interface PixelCapture {
  variantId: string;
  packId: string | null;
  mode: "light" | "dark";
  /** Base64 (no data: prefix) of the exported .pptx. */
  pptx: string | null;
  /** Base64 PNG of the build-side stage, pre-normalized to PIXEL_DIFF_W/H. */
  build: string | null;
  /**
   * Normalized (0..1 of slide width/height) bounding boxes of every TEXT object
   * the exporter actually emitted on slide 1, read from the SAME object tree the
   * layering audit uses (buildLayerReport). The pixel-diff gate dilates these and
   * excludes them to get a text-free "surface" score.
   *
   * Deliberately derived from the exporter's own placement data rather than from
   * pixel heuristics: it is exact, it moves automatically when the exporter moves
   * a text box, and it cannot mistake a hard-edged surface detail for glyphs.
   */
  textRects: Array<{ x: number; y: number; w: number; h: number }>;
  error?: string;
}


/** Both sides are normalized to this size before comparison. */
const PIXEL_DIFF_W = 960;
const PIXEL_DIFF_H = 540;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("blob read failed"));
    fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
    fr.readAsDataURL(blob);
  });
}

/** Downscale a stage PNG data URL to the comparison size, in-browser. */
async function normalizePng(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = PIXEL_DIFF_W;
  canvas.height = PIXEL_DIFF_H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, PIXEL_DIFF_W, PIXEL_DIFF_H);
  return canvas.toDataURL("image/png").split(",")[1] ?? "";
}

/**
 * Text-object bounding boxes for slide 1 of an exported package, read from the
 * exporter's own object tree (buildLayerReport) — no second capture path, no
 * pixel guessing.
 */
async function textRectsFromPptx(blob: Blob) {
  try {
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    const slide = await zip.file("ppt/slides/slide1.xml")?.async("string");
    if (!slide) return [];
    const presentationXml = (await zip.file("ppt/presentation.xml")?.async("string")) ?? "";
    return buildLayerReport(slide, presentationXml)
      .objects.filter((o) => o.type === "text")
      .map((o) => o.rect)
      .filter((r) => r.w > 0 && r.h > 0);
  } catch {
    return [];
  }
}

async function pixelOne(

  variantId: string,
  packId: string | null,
  modeIn: "light" | "dark",
): Promise<PixelCapture> {
  const variant = MODULE_VARIANTS.find((v) => v.id === variantId);
  const baseBrand = BRAND_MODES[0];
  const pack = packId ? stylePackById(packId) : null;
  const mode = pack ? pack.mode : modeIn;
  const out: PixelCapture = {
    variantId,
    packId,
    mode,
    pptx: null,
    build: null,
    textRects: [],
  };

  if (!variant) return { ...out, error: "unknown variant" };
  try {
    const brief = resolveDivisionBrief(baseBrand);
    const content = seedDivisionContent(
      variant.id,
      brief,
      "Verification section",
      baseBrand,
    ) as Record<string, unknown>;
    const layoutId = variant.permittedLayoutIds[0];
    const brand = pack ? packToneBrand(baseBrand, pack) : baseBrand;
    const packBackground = pack ? await packSheet(pack, variant.id, layoutId) : null;

    const slide = {
      id: `slide-${variant.id}`,
      position: 0,
      sectionId: sectionFor(variant.familyId),
      variantId: variant.id,
      layoutId,
      content,
      changes: [],
    };
    const deck = {
      id: `pixel-${variant.id}`,
      createdAt: new Date().toISOString(),
      title: `Pixel ${variant.id}`,
      briefId: "pixel-diff",
      brandModeId: baseBrand.id,
      archetypeId: "single-module",
      slides: [slide],
    } as unknown as Parameters<
      Awaited<typeof import("@/lib/pptx-export")>["exportDeckToPptx"]
    >[0];

    const [{ exportDeckToPptx }, { rasterizeExactSlide }] = await Promise.all([
      import("@/lib/pptx-export"),
      import("@/lib/slide-exact-raster"),
    ]);

    const res = await exportDeckToPptx(deck, brand, {
      output: "blob",
      forceMode: mode,
      packBackground,
      fidelity: "layered",
    });
    if (res.blob) {
      out.pptx = await blobToBase64(res.blob);
      out.textRects = await textRectsFromPptx(res.blob);
    }


    const plate = await rasterizeExactSlide({
      slide,
      variant,
      brand,
      mode,
      pack,
      pageNumber: 1,
      quality: "standard",
    });
    if (plate) out.build = await normalizePng(plate);
    if (!out.pptx || !out.build) out.error = "capture incomplete";
    return out;
  } catch (err) {
    return { ...out, error: err instanceof Error ? err.message : String(err) };
  }
}



declare global {
  interface Window {
    __tpExportVerify?: {
      variants: string[];
      packs: (string | null)[];
      run: (jobs: Array<[string, string | null, "light" | "dark"]>) => Promise<Audit[]>;
      /** Compact object tree of one audit, for storing as a baseline. */
      snapshot: (audit: Audit) => LayerTreeSnapshot;
      /** Element-level diff of one audit against a stored baseline. */
      diff: (baseline: LayerTreeSnapshot, audit: Audit) => TreeDiffResult;
      /**
       * Regression-gate capture: exported .pptx bytes + the build-side raster
       * from the exporter's own stage. See PixelCapture for why this is drift
       * detection and not a PowerPoint fidelity measurement.
       */
      pixel: (
        jobs: Array<[string, string | null, "light" | "dark"]>,
      ) => Promise<PixelCapture[]>;
      /** Same module through the deck path and the single-slide path, for diffing. */
      pair: (
        variantId: string,
        packId: string | null,
        mode: "light" | "dark",
        fidelity: "editable" | "layered" | "exact",
      ) => Promise<PathPair>;



    };
  }
}

const TYPE_LABEL: Record<string, string> = {
  text: "Text",
  image: "Image",
  icon: "Icon",
  logo: "Logo",
  shape: "Shape",
  plate: "Design plate",
};

function LayerReportTable({ report, index }: { report: LayerReport; index: number }) {
  return (
    <section className="mt-6 rounded-lg border border-border p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Slide {index + 1} layering report</h3>
        <p className="text-xs text-muted-foreground">
          {report.objects.length} objects · {report.editableCount} editable ·{" "}
          {report.layeredCount} layered
          {report.flattened ? " · FLATTENED" : ""}
        </p>
      </header>
      <p className="mt-1 text-xs text-muted-foreground">
        {(Object.keys(TYPE_LABEL) as Array<keyof typeof report.counts>)
          .map((k) => `${TYPE_LABEL[k]}: ${report.counts[k]}`)
          .join(" · ")}
      </p>
      {report.problems.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
          {report.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 pr-3 font-medium">#</th>
              <th className="py-1 pr-3 font-medium">Type</th>
              <th className="py-1 pr-3 font-medium">Name / content</th>
              <th className="py-1 pr-3 font-medium">Editable</th>
              <th className="py-1 pr-3 font-medium">Layered</th>
              <th className="py-1 pr-3 font-medium">Rect (x, y, w, h)</th>
            </tr>
          </thead>
          <tbody>
            {report.objects.map((o) => (
              <tr key={`${o.id}-${o.rect.x}-${o.rect.y}`} className="border-t border-border/60">
                <td className="py-1 pr-3 tabular-nums">{o.id}</td>
                <td className="py-1 pr-3">{TYPE_LABEL[o.type] ?? o.type}</td>
                <td className="py-1 pr-3">
                  {o.text ?? o.name ?? "—"}
                  {o.note ? <span className="text-muted-foreground"> — {o.note}</span> : null}
                </td>
                <td className="py-1 pr-3">{o.editable ? "yes" : "no"}</td>
                <td className="py-1 pr-3">{o.layered ? "yes" : "no"}</td>
                <td className="py-1 pr-3 tabular-nums">
                  {[o.rect.x, o.rect.y, o.rect.w, o.rect.h].map((n) => n.toFixed(3)).join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const SEVERITY_STYLE: Record<string, string> = {
  regression: "text-destructive font-medium",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-muted-foreground",
  ok: "text-muted-foreground",
};

const KIND_LABEL: Record<string, string> = {
  added: "+ added",
  removed: "− removed",
  changed: "~ changed",
  unchanged: "= same",
};

/**
 * Element-level object-tree diff: which exact object regressed, and how. Only
 * rows that actually differ are listed by default — an unchanged tree is the
 * expected state and would otherwise bury the signal.
 */
function TreeDiffPanel({ result }: { result: TreeDiffResult }) {
  const [showAll, setShowAll] = useState(false);
  return (
    <section className="mt-6 rounded-lg border border-border p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Object-tree diff vs baseline · {result.ok ? "PASS" : "REGRESSION"}
        </h3>
        <button
          type="button"
          className="text-xs underline"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? "Only differences" : "Show unchanged objects"}
        </button>
      </header>
      <p className="mt-1 text-xs text-muted-foreground">{summarizeTreeDiff(result)}</p>
      {result.regressions.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
          {result.regressions.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
      {result.slides.map((slide) => {
        const rows = showAll
          ? slide.objects
          : slide.objects.filter((o) => o.kind !== "unchanged");
        return (
          <div key={slide.index} className="mt-3">
            <p className="text-xs font-medium">
              Slide {slide.index + 1} · +{slide.counts.added} / −{slide.counts.removed} / ~
              {slide.counts.changed} · {slide.counts.unchanged} unchanged
            </p>
            {rows.length === 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Object tree identical to the baseline.
              </p>
            ) : (
              <div className="mt-1 overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-3 font-medium">Change</th>
                      <th className="py-1 pr-3 font-medium">Element</th>
                      <th className="py-1 pr-3 font-medium">Fields</th>
                      <th className="py-1 pr-3 font-medium">Why it matters</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o, i) => (
                      <tr key={`${o.label}-${i}`} className="border-t border-border/60 align-top">
                        <td className={`py-1 pr-3 ${SEVERITY_STYLE[o.severity]}`}>
                          {KIND_LABEL[o.kind]}
                        </td>
                        <td className="py-1 pr-3">{o.label}</td>
                        <td className="py-1 pr-3">
                          {o.changes.length === 0
                            ? "—"
                            : o.changes.map((c) => (
                                <span key={c.field} className="block">
                                  {c.field}: {c.before} → {c.after}
                                </span>
                              ))}
                        </td>
                        <td className={`py-1 pr-3 ${SEVERITY_STYLE[o.severity]}`}>
                          {o.reason ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}

function ExportVerifyHarness() {
  const [ready, setReady] = useState(false);
  const [variantId, setVariantId] = useState(MODULE_VARIANTS[0]?.id ?? "");
  const [packId, setPackId] = useState<string>("");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<Audit | null>(null);
  const [treeDiff, setTreeDiff] = useState<TreeDiffResult | null>(null);
  const [baselineNote, setBaselineNote] = useState<string>("");
  useEffect(() => {
    window.__tpExportVerify = {
      variants: MODULE_VARIANTS.map((v) => v.id),
      packs: [null, ...STYLE_PACKS.map((p) => p.id)],
      run: async (jobs) => {
        const out: Audit[] = [];
        for (const [v, p, m] of jobs) out.push(await verifyOne(v, p, m));
        return out;
      },
      snapshot: (audit) => snapshotFromReports(auditKey(audit), audit.layers, audit.variantId),
      diff: (baseline, audit) => diffLayerTrees(baseline, audit.layers, audit.variantId),
      pixel: async (jobs) => {
        const out: PixelCapture[] = [];
        for (const [v, p, m] of jobs) out.push(await pixelOne(v, p, m));
        return out;
      },
      pair: (variantId, packId, mode, fidelity) => pairOne(variantId, packId, mode, fidelity),


    };
    setReady(true);
    return () => {
      delete window.__tpExportVerify;
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl p-10 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">Export verification harness</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {ready ? "Ready" : "Loading"} · {MODULE_VARIANTS.length} modules ·{" "}
        {STYLE_PACKS.length} alternate looks. Driven headlessly via{" "}
        <code>window.__tpExportVerify.run()</code>.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <label className="flex flex-col gap-1 text-xs">
          Module
          <select
            className="rounded border border-border bg-background px-2 py-1 text-sm"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            {MODULE_VARIANTS.map((v) => (
              <option key={v.id} value={v.id}>
                {v.id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Look
          <select
            className="rounded border border-border bg-background px-2 py-1 text-sm"
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
          >
            <option value="">House</option>
            {STYLE_PACKS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label ?? p.id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Mode
          <select
            className="rounded border border-border bg-background px-2 py-1 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as "light" | "dark")}
          >
            <option value="light">light</option>
            <option value="dark">dark</option>
          </select>
        </label>
        <button
          type="button"
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          disabled={busy || !variantId}
          onClick={async () => {
            setBusy(true);
            try {
              const next = await verifyOne(variantId, packId || null, mode);
              setAudit(next);
              // Auto-diff against the stored baseline for this exact matrix cell
              // so a regression names its element without a second click.
              const baseline = readBaselines()[auditKey(next)];
              setTreeDiff(baseline ? diffLayerTrees(baseline, next.layers, next.variantId) : null);
              setBaselineNote(
                baseline
                  ? `Baseline from ${baseline.slides.length} slide(s)`
                  : "No baseline stored for this module × look × mode yet.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Exporting…" : "Run layering report"}
        </button>
      </div>

      {audit && (
        <div className="mt-4">
          <p className="text-sm">
            {audit.ok ? "PASS" : "FAIL"} · {audit.variantId} · {audit.packId ?? "house"} ·{" "}
            {audit.mode} · background {audit.bg} · {Math.round(audit.bytes / 1024)} KB
          </p>
          {audit.error && <p className="mt-1 text-xs text-destructive">{audit.error}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded border border-border px-3 py-1.5 text-xs font-medium"
              onClick={() => {
                writeBaseline(snapshotFromReports(auditKey(audit), audit.layers, audit.variantId));
                setTreeDiff(null);
                setBaselineNote("Baseline saved from this export.");
              }}
            >
              Save as baseline
            </button>
            <button
              type="button"
              className="rounded border border-border px-3 py-1.5 text-xs font-medium"
              onClick={() => {
                const baseline = readBaselines()[auditKey(audit)];
                setTreeDiff(
                  baseline ? diffLayerTrees(baseline, audit.layers, audit.variantId) : null,
                );
                setBaselineNote(
                  baseline ? "" : "No baseline stored for this module × look × mode yet.",
                );
              }}
            >
              Diff vs baseline
            </button>
            {baselineNote && (
              <span className="text-xs text-muted-foreground">{baselineNote}</span>
            )}
          </div>
          {treeDiff && <TreeDiffPanel result={treeDiff} />}
          {audit.layers.map((r, i) => (
            <LayerReportTable key={i} report={r} index={i} />
          ))}
        </div>
      )}
    </main>
  );
}
