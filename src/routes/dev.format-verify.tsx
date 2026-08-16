// -----------------------------------------------------------------------------
// All-formats export verification harness (dev only)
//
// The library export panel ships a representative module section in four
// formats: PPTX (light + dark), PDF, PNG, and a ZIP bundle of all of them.
// Nothing gated the non-PPTX paths, so a defect there (blank raster, missing
// industry backdrop, unreadable PDF) could ship while the PPTX audits stayed
// green.
//
// This harness exports ONE representative module through EVERY format for a
// given industry look, then audits each artifact:
//   * it opens (real container sniff: zip central directory / %PDF / PNG magic)
//   * it is non-trivially sized and structurally complete
//   * it carries the INDUSTRY background, proven by fingerprinting the painted
//     pixels against the pack's own rasterized sheet and against the house look
//
// Exposed as window.__tpFormatVerify so Playwright can drive the whole matrix
// without re-mounting React per format.
// -----------------------------------------------------------------------------

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import JSZip from "jszip";

import { BRAND_MODES, MODULE_VARIANTS, SECTION_FRAMEWORKS } from "@/lib/taxonomy";
import { resolveDivisionBrief, seedDivisionContent } from "@/lib/library-preview";
import { packToneBrand, stylePackById } from "@/lib/style-packs";
import type { StylePack } from "@/lib/style-packs";
import { INDUSTRY_PACKS } from "@/lib/design-skin-pack";
import { composeOverrideLayers } from "@/lib/template-background";
import { aspectFrame, getImageAspect, measureImageAspect } from "@/lib/export-image-aspect";

export const Route = createFileRoute("/dev/format-verify")({
  component: FormatVerifyHarness,
  head: () => ({
    meta: [
      { title: "All-format export harness · TransPerfect Modular" },
      {
        name: "description",
        content:
          "Internal harness that exports a representative module to PPTX, PDF, PNG and ZIP and audits that each file opens and carries its industry background.",
      },
      { property: "og:title", content: "All-format export harness" },
      {
        property: "og:description",
        content: "Audits PPTX, PDF, PNG and ZIP exports for openability and industry backgrounds.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

/** Default representative module: rich enough to carry background + content. */
export const REPRESENTATIVE_VARIANT = "MV-BENTO-6";

export type FormatKey = "pptx-light" | "pptx-dark" | "pdf" | "png" | "zip";

export interface FormatArtifact {
  format: FormatKey;
  /** True container sniff, never the extension. */
  container: "ooxml-zip" | "pdf" | "png" | "zip" | "unknown";
  bytes: number;
  opens: boolean;
  /** Format-specific structural facts (slide count, pages, pixel size, entries). */
  detail: Record<string, number | string | boolean>;
  /** 8×8 mean-RGB fingerprint of the painted artwork, when rasterizable. */
  fingerprint: number[] | null;
  /** Mean channel distance from the same module rendered in the house look. */
  houseDistance: number | null;
  /** Mean channel distance from the pack's own rasterized background sheet. */
  packDistance: number | null;
  problems: string[];
}

export interface FormatRunResult {
  variantId: string;
  packId: string;
  packLabel: string;
  /** The look's own light/dark mode: the pack sheet is rasterized in it. */
  packMode: "light" | "dark";
  ok: boolean;
  artifacts: FormatArtifact[];
  problems: string[];
  /** Blended runs only: distance between the composed ground and pack A's sheet. */
  blendDistance?: number | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Fingerprinting
// ---------------------------------------------------------------------------

const FP_N = 8;

async function fingerprintDataUrl(dataUrl: string): Promise<number[] | null> {
  try {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = FP_N;
    canvas.height = FP_N;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, FP_N, FP_N);
    const { data } = ctx.getImageData(0, 0, FP_N, FP_N);
    const out: number[] = [];
    for (let i = 0; i < data.length; i += 4) out.push(data[i], data[i + 1], data[i + 2]);
    return out;
  } catch {
    return null;
  }
}

/** Mean absolute per-channel distance (0..255) between two fingerprints. */
function fpDistance(a: number[] | null, b: number[] | null): number | null {
  if (!a || !b || a.length !== b.length || a.length === 0) return null;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += Math.abs(a[i] - b[i]);
  return sum / a.length;
}

/** A blank/flat artifact has near-zero variance across the whole grid. */
function fpVariance(fp: number[] | null): number {
  if (!fp || fp.length === 0) return 0;
  const mean = fp.reduce((s, v) => s + v, 0) / fp.length;
  return Math.sqrt(fp.reduce((s, v) => s + (v - mean) ** 2, 0) / fp.length);
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return "image/png";
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  return null;
}

// ---------------------------------------------------------------------------
// Deck construction (identical inputs for every format, so a difference in the
// audit is a difference in the export path, not in the content)
// ---------------------------------------------------------------------------

/**
 * Edge-case switches for the format matrix. Each one reproduces a real defect
 * class reviewers hit in the wild rather than the happy path:
 *
 *  * `blend`      — a BLENDED industry ground: one pack's geometry veiled and
 *                   tinted by a second industry's accent, plus a scene swap.
 *                   Proves a composed (not authored) background still
 *                   rasterizes, embeds and reads as the pack, in every format.
 *  * `quality`    — an unusual export resolution (lowest / ultra) so the
 *                   embedded raster DPI is far from the tuned default.
 */
export interface EdgeOptions {
  blend?: boolean;
  quality?: "standard" | "high" | "ultra";
}

/**
 * Blend two industry looks into one ground: pack A's layers, veiled/deepened
 * and tinted with pack B's accent, painted on pack B's scene. This is the
 * composition path admin background overrides use, so it must survive export.
 */
export function blendedPack(pack: StylePack, other: StylePack): StylePack {
  const base = pack.ground;
  return {
    ...pack,
    // Keep pack A's id (StylePackId is a closed union); the ground is the blend.
    id: pack.id,
    ground: (seed: string) =>
      composeOverrideLayers(
        base(`${other.id}-${seed}`),
        {
          intensity: 1.3,
          tint: other.tokens.accent,
          tintStrength: 0.22,
          sceneSwap: null,
          imageUrl: null,
        } as never,
        pack.tokens.surface,
      ),
  };
}

function sectionFor(familyId: string): string {
  return SECTION_FRAMEWORKS.find((s) => s.permittedFamilyIds.includes(familyId))?.id ?? "SF-01";
}

function buildJob(variantId: string, packId: string | null, packOverride?: StylePack | null) {
  const variant = MODULE_VARIANTS.find((v) => v.id === variantId);
  if (!variant) throw new Error(`unknown variant ${variantId}`);
  const baseBrand = BRAND_MODES[0];
  const pack = packOverride ?? (packId ? stylePackById(packId) : null);
  const brief = resolveDivisionBrief(baseBrand);
  const content = seedDivisionContent(
    variant.id,
    brief,
    "Format verification section",
    baseBrand,
  ) as Record<string, unknown>;
  const layoutId = variant.permittedLayoutIds[0];
  const sectionId = sectionFor(variant.familyId);
  const brand = pack ? packToneBrand(baseBrand, pack) : baseBrand;
  const slide = {
    id: `slide-${variant.id}`,
    position: 0,
    sectionId,
    variantId: variant.id,
    layoutId,
    content,
    changes: [],
  };
  const deck = {
    id: `format-${variant.id}`,
    createdAt: new Date().toISOString(),
    title: `Format verify ${variant.id}`,
    briefId: "format-verify",
    brandModeId: baseBrand.id,
    archetypeId: "single-module",
    slides: [slide],
  };
  return { variant, pack, brand, baseBrand, layoutId, slide, deck };
}

async function packSheetFingerprint(
  packId: string,
  variantId: string,
  layoutId: string,
  packOverride?: StylePack | null,
): Promise<number[] | null> {
  const pack = packOverride ?? stylePackById(packId);
  if (!pack) return null;
  const { rasterizePackBackground } = await import("@/lib/pack-background-raster");
  const sheet = await rasterizePackBackground(pack, variantId, layoutId);
  return sheet.data ? await fingerprintDataUrl(sheet.data) : null;
}

/** Rasterize the module through the SAME offscreen stage the exporter uses. */
async function stagePng(
  variantId: string,
  packId: string | null,
  packOverride?: StylePack | null,
): Promise<string | null> {
  const { variant, pack, brand, slide } = buildJob(variantId, packId, packOverride);
  const { rasterizeExactSlide } = await import("@/lib/slide-exact-raster");
  return rasterizeExactSlide({
    slide,
    variant,
    brand,
    mode: pack ? pack.mode : "light",
    pack,
    pageNumber: 1,
    quality: "standard",
  });
}

// ---------------------------------------------------------------------------
// Per-format audits
// ---------------------------------------------------------------------------

async function auditPptx(
  blob: Blob,
  format: FormatKey,
): Promise<{ artifact: FormatArtifact; zip: JSZip | null }> {
  const problems: string[] = [];
  const buf = new Uint8Array(await blob.arrayBuffer());
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  const artifact: FormatArtifact = {
    format,
    container: isZip ? "ooxml-zip" : "unknown",
    bytes: blob.size,
    opens: false,
    detail: {},
    fingerprint: null,
    houseDistance: null,
    packDistance: null,
    problems,
  };
  if (!isZip) {
    problems.push("not an OOXML zip container");
    return { artifact, zip: null };
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buf);
  } catch (err) {
    problems.push(`zip failed to open: ${err instanceof Error ? err.message : String(err)}`);
    return { artifact, zip: null };
  }
  const names = Object.keys(zip.files);
  const required = ["[Content_Types].xml", "ppt/presentation.xml", "ppt/slides/slide1.xml"];
  for (const part of required) if (!names.includes(part)) problems.push(`missing part ${part}`);
  const slides = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const media = names.filter((n) => /^ppt\/media\/./.test(n) && !zip.files[n].dir);
  artifact.detail = { slides: slides.length, media: media.length };
  if (slides.length === 0) problems.push("package has no slides");

  const slideXml = names.includes("ppt/slides/slide1.xml")
    ? await zip.file("ppt/slides/slide1.xml")!.async("string")
    : "";
  const runs = (slideXml.match(/<a:t>/g) ?? []).length;
  const pics = (slideXml.match(/<p:pic>/g) ?? []).length;
  const shapes = (slideXml.match(/<p:sp>/g) ?? []).length;
  artifact.detail.runs = runs;
  artifact.detail.pics = pics;
  artifact.detail.shapes = shapes;
  if (runs === 0) problems.push("no text runs on slide 1");
  if (pics === 0) problems.push("no pictures on slide 1 (background never landed)");

  // Background evidence: resolve the picture PowerPoint actually paints as the
  // full-bleed backdrop (by object name → relationship → media part), never
  // "the biggest file", which on an imagery module is a photograph.
  const rels = names.includes("ppt/slides/_rels/slide1.xml.rels")
    ? await zip.file("ppt/slides/_rels/slide1.xml.rels")!.async("string")
    : "";
  const relTarget = new Map<string, string>();
  for (const m of rels.matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)) {
    relTarget.set(m[1], m[2].replace(/^\.\.\//, "ppt/"));
  }
  let bgPart: string | null = null;
  for (const m of slideXml.matchAll(/<p:pic>[\s\S]*?<\/p:pic>/g)) {
    const block = m[0];
    const name = /name="([^"]*)"/.exec(block)?.[1] ?? "";
    if (!/^TP (Background|Design plate)$/.test(name)) continue;
    const rid = /r:embed="([^"]+)"/.exec(block)?.[1];
    const target = rid ? relTarget.get(rid) : undefined;
    if (target) {
      bgPart = target;
      break;
    }
  }
  const bgBytes = bgPart && zip.file(bgPart) ? await zip.file(bgPart)!.async("uint8array") : null;
  if (!bgBytes || !sniffImageMime(bgBytes)) {
    problems.push("no full-bleed background picture embedded in package");
  } else {
    artifact.detail.backgroundMedia = bgPart!.split("/").pop()!;
    artifact.fingerprint = await fingerprintDataUrl(
      bytesToDataUrl(bgBytes, sniffImageMime(bgBytes)!),
    );
    if (!artifact.fingerprint) problems.push("embedded background could not be decoded");
  }

  artifact.opens = problems.length === 0;
  return { artifact, zip };
}

function pdfArtifact(blob: Blob, buf: Uint8Array, pngFingerprint: number[] | null): FormatArtifact {
  const problems: string[] = [];
  const head = String.fromCharCode(...buf.subarray(0, 5));
  const text = new TextDecoder("latin1").decode(buf);
  const isPdf = head === "%PDF-";
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  const images = (text.match(/\/Subtype\s*\/Image/g) ?? []).length;
  const widths = [...text.matchAll(/\/Width\s+(\d+)/g)].map((m) => Number(m[1]));
  const maxWidth = widths.length ? Math.max(...widths) : 0;
  if (!isPdf) problems.push("missing %PDF- header");
  if (!text.includes("%%EOF")) problems.push("missing %%EOF trailer (truncated file)");
  if (pages < 1) problems.push("no page objects");
  if (images < 1) problems.push("no image XObject (slide raster never embedded)");
  if (maxWidth < 960) problems.push(`embedded raster only ${maxWidth}px wide`);
  return {
    format: "pdf",
    container: isPdf ? "pdf" : "unknown",
    bytes: blob.size,
    opens: problems.length === 0,
    detail: { pages, images, rasterWidth: maxWidth },
    // The page raster comes from the same stage capture the PNG audit decodes,
    // so its fingerprint is the honest content signal for the PDF page.
    fingerprint: pngFingerprint,
    houseDistance: null,
    packDistance: null,
    problems,
  };
}

// ---------------------------------------------------------------------------
// Full run: one module × one industry look → every format
// ---------------------------------------------------------------------------

async function runFormats(
  variantId: string,
  packId: string,
  edge: EdgeOptions = {},
): Promise<FormatRunResult> {
  const authored = stylePackById(packId);
  // Blended ground: mix in the NEXT industry look so the composed background is
  // provably neither pack's authored sheet.
  const other = edge.blend
    ? (INDUSTRY_PACKS.find((p) => p.id !== packId)
        ? stylePackById(INDUSTRY_PACKS.find((p) => p.id !== packId)!.id)
        : null)
    : null;
  const pack = authored && other ? blendedPack(authored, other) : authored;
  const result: FormatRunResult = {
    variantId,
    packId,
    packLabel: pack?.label ?? packId,
    packMode: pack?.mode ?? "light",
    ok: false,
    artifacts: [],
    problems: [],
  };
  if (!pack) return { ...result, error: `unknown pack ${packId}` };

  try {
    const { variant, brand, layoutId, slide, deck } = buildJob(variantId, packId, pack);
    const { rasterizePackBackground } = await import("@/lib/pack-background-raster");
    const quality = (edge.quality ?? "standard") as never;
    const packBackground = await rasterizePackBackground(pack, variant.id, layoutId, quality);
    if (!packBackground.data) result.problems.push("pack background failed to rasterize");
    const packFp = await packSheetFingerprint(packId, variant.id, layoutId, pack);

    // House-look reference: proves the exported artwork is pack-SPECIFIC and
    // not the default brand backdrop wearing a different label.
    const housePng = await stagePng(variantId, null);
    // Authored (unblended) reference: only needed by the blended run.
    const authoredFp = edge.blend
      ? await packSheetFingerprint(packId, variant.id, layoutId, authored)
      : null;
    const houseFp = housePng ? await fingerprintDataUrl(housePng) : null;

    const { exportDeckToPptx } = await import("@/lib/pptx-export");
    const bundleFiles: Array<{ name: string; blob: Blob }> = [];

    // --- PPTX, both modes -------------------------------------------------
    for (const mode of ["light", "dark"] as const) {
      const res = await exportDeckToPptx(deck as never, brand, {
        output: "blob",
        forceMode: mode,
        packBackground,
        quality,
        fidelity: "editable",
      });
      const format: FormatKey = mode === "light" ? "pptx-light" : "pptx-dark";
      if (!res.blob) {
        result.artifacts.push({
          format,
          container: "unknown",
          bytes: 0,
          opens: false,
          detail: {},
          fingerprint: null,
          houseDistance: null,
          packDistance: null,
          problems: ["exporter returned no blob"],
        });
        continue;
      }
      const { artifact } = await auditPptx(res.blob, format);
      artifact.packDistance = fpDistance(artifact.fingerprint, packFp);
      artifact.houseDistance = fpDistance(artifact.fingerprint, houseFp);
      result.artifacts.push(artifact);
      bundleFiles.push({ name: `module-${variant.id}-${mode}.pptx`, blob: res.blob });
    }

    // --- PNG (the exact stage raster the panel downloads) ------------------
    const png = await stagePng(variantId, packId, pack);
    const pngProblems: string[] = [];
    let pngFp: number[] | null = null;
    let pngBytes = 0;
    let pngW = 0;
    let pngH = 0;
    if (!png) {
      pngProblems.push("stage raster returned nothing");
    } else {
      const raw = Uint8Array.from(atob(png.split(",")[1] ?? ""), (c) => c.charCodeAt(0));
      pngBytes = raw.length;
      if (!(raw[0] === 0x89 && raw[1] === 0x50)) pngProblems.push("not a PNG stream");
      else {
        pngW = new DataView(raw.buffer).getUint32(16);
        pngH = new DataView(raw.buffer).getUint32(20);
        if (pngW < 960) pngProblems.push(`PNG only ${pngW}px wide`);
        if (Math.abs(pngW / pngH - 16 / 9) > 0.02) pngProblems.push("PNG is not 16:9");
      }
      pngFp = await fingerprintDataUrl(png);
      if (!pngFp) pngProblems.push("PNG could not be decoded");
      if (fpVariance(pngFp) < 4) pngProblems.push("PNG is visually flat (blank capture)");
      bundleFiles.push({
        name: `module-${variant.id}.png`,
        blob: new Blob([raw], { type: "image/png" }),
      });
    }
    result.artifacts.push({
      format: "png",
      container: pngBytes > 0 ? "png" : "unknown",
      bytes: pngBytes,
      opens: pngProblems.length === 0,
      detail: { width: pngW, height: pngH, variance: Math.round(fpVariance(pngFp)) },
      fingerprint: pngFp,
      houseDistance: fpDistance(pngFp, houseFp),
      packDistance: fpDistance(pngFp, packFp),
      problems: pngProblems,
    });

    // --- PDF --------------------------------------------------------------
    const { withExactStage } = await import("@/lib/slide-exact-raster");
    const { exportSlidesAsImagePdf } = await import("@/lib/slide-image-export");
    const pdfBlob = await withExactStage(
      { slide, variant, brand, mode: pack.mode, pack, pageNumber: 1, quality },
      async (stage) =>
        (await exportSlidesAsImagePdf([{ node: stage, mode: pack.mode }], {
          returnBlob: true,
          targetWidth: 1920,
        })) as Blob,
    );
    if (!pdfBlob) {
      result.artifacts.push({
        format: "pdf",
        container: "unknown",
        bytes: 0,
        opens: false,
        detail: {},
        fingerprint: null,
        houseDistance: null,
        packDistance: null,
        problems: ["PDF export returned nothing"],
      });
    } else {
      const pdfBuf = new Uint8Array(await pdfBlob.arrayBuffer());
      const art = pdfArtifact(pdfBlob, pdfBuf, pngFp);
      art.houseDistance = fpDistance(pngFp, houseFp);
      art.packDistance = fpDistance(pngFp, packFp);
      result.artifacts.push(art);
      bundleFiles.push({ name: `module-${variant.id}.pdf`, blob: pdfBlob });
    }

    // --- ZIP bundle -------------------------------------------------------
    const zipProblems: string[] = [];
    const out = new JSZip();
    for (const f of bundleFiles) out.file(f.name, f.blob);
    const zipBlob = await out.generateAsync({ type: "blob", compression: "DEFLATE" });
    let entries = 0;
    let smallest = Number.POSITIVE_INFINITY;
    try {
      const reopened = await JSZip.loadAsync(await zipBlob.arrayBuffer());
      const names = Object.keys(reopened.files).filter((n) => !reopened.files[n].dir);
      entries = names.length;
      for (const n of names) {
        const bytes = await reopened.file(n)!.async("uint8array");
        smallest = Math.min(smallest, bytes.length);
        if (bytes.length === 0) zipProblems.push(`bundle entry ${n} is empty`);
      }
      for (const expect of [".pptx", ".pdf", ".png"]) {
        if (!names.some((n) => n.endsWith(expect))) {
          zipProblems.push(`bundle is missing a ${expect} file`);
        }
      }
      if (names.filter((n) => n.endsWith(".pptx")).length < 2) {
        zipProblems.push("bundle is missing a light/dark PPTX pair");
      }
    } catch (err) {
      zipProblems.push(`bundle failed to reopen: ${err instanceof Error ? err.message : String(err)}`);
    }
    result.artifacts.push({
      format: "zip",
      container: "zip",
      bytes: zipBlob.size,
      opens: zipProblems.length === 0,
      detail: { entries, smallestEntryBytes: Number.isFinite(smallest) ? smallest : 0 },
      fingerprint: null,
      houseDistance: null,
      packDistance: null,
      problems: zipProblems,
    });

    for (const a of result.artifacts) {
      for (const p of a.problems) result.problems.push(`${a.format}: ${p}`);
    }
    result.ok = result.problems.length === 0;
    // Blended runs additionally report how far the composed ground sits from
    // the authored sheet, so a blend that silently collapses back to pack A
    // (or paints nothing new) is detectable.
    if (edge.blend) {
      const bg = result.artifacts.find((a) => a.format === `pptx-${pack.mode}`);
      result.blendDistance = fpDistance(bg?.fingerprint ?? null, authoredFp);
    }
    return result;
  } catch (err) {
    return { ...result, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Unusual-DPI probe.
 *
 * Reviewers upload logos and imagery at wild pixel densities: a 3px-tall
 * 1200px-wide wordmark strip, a 4000×9 rule, a 1×1 tracking pixel. The export
 * path measures intrinsic size once and derives an aspect-correct frame from
 * it, so this probe decodes synthetic bitmaps at those densities THROUGH the
 * real registry and returns the frame the exporter would emit.
 */
export interface DpiProbeResult {
  w: number;
  h: number;
  ratio: number | null;
  frame: { x: number; y: number; w: number; h: number; exact: boolean } | null;
  /** Frame stays inside the 4×3 (inch) placeholder box, ratio preserved. */
  insideBox: boolean;
  ratioError: number | null;
  finite: boolean;
}

function syntheticPng(w: number, h: number): string {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#003FC7";
  ctx.fillRect(0, 0, c.width, c.height);
  return c.toDataURL("image/png");
}

async function dpiProbe(sizes: Array<[number, number]>): Promise<DpiProbeResult[]> {
  const BOX = { x: 1, y: 1, w: 4, h: 3 };
  const out: DpiProbeResult[] = [];
  for (const [w, h] of sizes) {
    const src = syntheticPng(w, h);
    await measureImageAspect(src);
    const ratio = getImageAspect(src) ?? null;
    const frame = aspectFrame(ratio ?? undefined, "contain", BOX.x, BOX.y, BOX.w, BOX.h);
    const finite = [frame.x, frame.y, frame.w, frame.h].every(
      (n) => Number.isFinite(n) && n >= 0,
    );
    const insideBox =
      finite &&
      frame.w <= BOX.w + 1e-6 &&
      frame.h <= BOX.h + 1e-6 &&
      frame.x >= BOX.x - 1e-6 &&
      frame.y >= BOX.y - 1e-6 &&
      frame.x + frame.w <= BOX.x + BOX.w + 1e-6 &&
      frame.y + frame.h <= BOX.y + BOX.h + 1e-6;
    out.push({
      w,
      h,
      ratio,
      frame,
      insideBox,
      finite,
      ratioError:
        ratio && frame.h > 0 ? Math.abs(frame.w / frame.h - ratio) / ratio : null,
    });
  }
  return out;
}

declare global {
  interface Window {
    __tpFormatVerify?: {
      variant: string;
      industryPacks: string[];
      run: (
        variantId: string,
        packId: string,
        edge?: EdgeOptions,
      ) => Promise<FormatRunResult>;
      dpiProbe: (sizes: Array<[number, number]>) => Promise<DpiProbeResult[]>;
    };
  }
}

function FormatVerifyHarness() {
  const [ready, setReady] = useState(false);
  const [variantId, setVariantId] = useState<string>(
    MODULE_VARIANTS.some((v) => v.id === REPRESENTATIVE_VARIANT)
      ? REPRESENTATIVE_VARIANT
      : (MODULE_VARIANTS[0]?.id ?? ""),
  );
  const [packId, setPackId] = useState<string>(INDUSTRY_PACKS[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FormatRunResult | null>(null);

  useEffect(() => {
    window.__tpFormatVerify = {
      variant: REPRESENTATIVE_VARIANT,
      industryPacks: INDUSTRY_PACKS.map((p) => p.id),
      run: (v, p, edge) => runFormats(v, p, edge),
      dpiProbe,
    };
    setReady(true);
    return () => {
      delete window.__tpFormatVerify;
    };
  }, []);

  return (
    <main className="mx-auto max-w-3xl p-10 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">All-format export harness</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {ready ? "Ready" : "Loading"} · exports one module to PPTX (light + dark), PDF, PNG and a ZIP
        bundle, then audits that each file opens and carries its industry background. Driven
        headlessly via <code>window.__tpFormatVerify.run()</code>.
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
          Industry look
          <select
            className="rounded border border-border bg-background px-2 py-1 text-sm"
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
          >
            {INDUSTRY_PACKS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label ?? p.id}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
          disabled={busy || !variantId || !packId}
          onClick={async () => {
            setBusy(true);
            try {
              setResult(await runFormats(variantId, packId));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Exporting every format…" : "Run all-format audit"}
        </button>
      </div>

      {result && (
        <section className="mt-6">
          <p className="text-sm">
            {result.ok ? "PASS" : "FAIL"} · {result.variantId} · {result.packLabel}
          </p>
          {result.error && <p className="mt-1 text-xs text-destructive">{result.error}</p>}
          <table className="mt-3 w-full border-collapse text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-3 font-medium">Format</th>
                <th className="py-1 pr-3 font-medium">Opens</th>
                <th className="py-1 pr-3 font-medium">Size</th>
                <th className="py-1 pr-3 font-medium">Δ pack sheet</th>
                <th className="py-1 pr-3 font-medium">Δ house look</th>
                <th className="py-1 pr-3 font-medium">Problems</th>
              </tr>
            </thead>
            <tbody>
              {result.artifacts.map((a) => (
                <tr key={a.format} className="border-t border-border/60 align-top">
                  <td className="py-1 pr-3">{a.format}</td>
                  <td className={`py-1 pr-3 ${a.opens ? "" : "text-destructive"}`}>
                    {a.opens ? "yes" : "no"}
                  </td>
                  <td className="py-1 pr-3">{Math.round(a.bytes / 1024)} KB</td>
                  <td className="py-1 pr-3">
                    {a.packDistance == null ? "—" : a.packDistance.toFixed(1)}
                  </td>
                  <td className="py-1 pr-3">
                    {a.houseDistance == null ? "—" : a.houseDistance.toFixed(1)}
                  </td>
                  <td className="py-1 pr-3 text-destructive">
                    {a.problems.length === 0 ? "—" : a.problems.join("; ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
