/**
 * Slide Image Export — rasterize a live slide preview to PNG or image-PDF
 * using html-to-image. Companion to `pptx-export.ts`; use this when fidelity
 * matters more than editability (client review copies, share cards, single
 * module snapshots straight from the Library).
 *
 * Resilience layers:
 *  1. CORS images: pre-inline any cross-origin <img> as a data URL (fetch
 *     + FileReader) so html-to-image's internal fetch fallback can't taint
 *     the offscreen canvas.
 *  2. Web fonts: wait for `document.fonts.ready`, then explicitly probe the
 *     fonts actually declared on the node before giving up (with a hard
 *     timeout so we never hang the UI).
 *  3. backdrop-filter: html-to-image serializes DOM into an SVG
 *     <foreignObject>, and most browsers refuse to rasterize
 *     `backdrop-filter` inside foreignObject — you get a clear rectangle
 *     where the frosted-glass tile should sit. During capture we swap the
 *     backdrop-filter surface for a computed frosted approximation
 *     (semi-opaque background + subtle blur via box-shadow inset) and
 *     restore the original inline styles afterwards.
 *  4. Progress: every phase reports through an optional callback so the UI
 *     can show meaningful status ("Fonts…", "Images…", "Rendering…").
 */
import { getFontEmbedCSS, toPng } from "html-to-image";
import { jsPDF } from "jspdf";

/**
 * FONT EMBED CACHE
 * ----------------
 * html-to-image serializes the node into an SVG <foreignObject>, which cannot
 * see the page's webfonts — so it re-collects and inlines every @font-face on
 * EVERY capture. On a batch run (e.g. the 190-module catalog export) that
 * refetches the remote Google Fonts stylesheet and each woff2 once per slide,
 * which floods the network stack (`net::ERR_INSUFFICIENT_RESOURCES`) and aborts
 * the capture. Collect the embed CSS once per page and reuse it for every
 * slide. Cross-origin stylesheets we cannot read are skipped rather than fatal.
 */
let fontEmbedCssPromise: Promise<string> | null = null;

export async function getCachedFontEmbedCSS(node: HTMLElement): Promise<string> {
  if (!fontEmbedCssPromise) {
    fontEmbedCssPromise = getFontEmbedCSS(node)
      .then((css) => css ?? "")
      .catch((err) => {
        console.warn("[slide-image-export] font embed CSS unavailable; capturing without it", err);
        return "";
      });
  }
  return fontEmbedCssPromise;
}

/** Test/hook seam: drop the cached CSS (e.g. after a font stack change). */
export function resetFontEmbedCache(): void {
  fontEmbedCssPromise = null;
}

export type SlideExportMode = "light" | "dark";

export type ExportStage =
  | "prepare"
  | "fonts"
  | "images"
  | "backdrop"
  | "render"
  | "encode"
  | "done";

export interface ExportProgress {
  stage: ExportStage;
  /** 0..1 within the current phase (best effort). */
  progress?: number;
  /** Optional human-readable status. */
  message?: string;
}

export type ExportProgressCallback = (p: ExportProgress) => void;

export interface SlideCaptureOptions {
  mode: SlideExportMode;
  filename?: string;
  /**
   * Device pixel ratio multiplier. If `targetWidth` is also supplied, the
   * effective pixel ratio is derived from `targetWidth / node.offsetWidth`
   * and this option is ignored.
   */
  pixelRatio?: number;
  /**
   * Absolute output width in pixels (e.g. 1920 for HD, 3840 for 4K). This
   * is the preferred API — it makes the exporter render at a fixed pixel
   * size regardless of how large the on-screen preview happens to be, so
   * results are consistent across zoom levels and modal widths. Height is
   * driven by the node's aspect ratio.
   */
  targetWidth?: number;
  /** Optional CORS-safe cache buster for cross-origin images. */
  cacheBust?: boolean;
  /** Progress callback fired between phases. */
  onProgress?: ExportProgressCallback;
  /** Hard timeout (ms) for font/image readiness before we proceed anyway. */
  readyTimeoutMs?: number;
}

const MODE_BG: Record<SlideExportMode, string> = {
  light: "#F2F2F2",
  dark: "#03002C",
};

/** Absolute-minimum pixel ratio the exporter will honor. */
const MIN_PIXEL_RATIO = 1;
// Modal preview nodes can be as narrow as ~300px, so hitting 4K (3840px)
// requires ratios of ~13×. Keep a generous ceiling so the exporter never
// silently downsamples the user's chosen target.
const MAX_PIXEL_RATIO = 16;

function resolvePixelRatio(
  node: HTMLElement,
  opts: { pixelRatio?: number; targetWidth?: number },
): number {
  if (opts.targetWidth && opts.targetWidth > 0) {
    const nodeWidth = node.offsetWidth || node.getBoundingClientRect().width;
    if (nodeWidth > 0) {
      const ratio = opts.targetWidth / nodeWidth;
      return Math.min(MAX_PIXEL_RATIO, Math.max(MIN_PIXEL_RATIO, ratio));
    }
  }
  return Math.min(MAX_PIXEL_RATIO, Math.max(MIN_PIXEL_RATIO, opts.pixelRatio ?? 2));
}

const DEFAULT_READY_TIMEOUT = 6000;

function report(cb: ExportProgressCallback | undefined, p: ExportProgress): void {
  if (cb) {
    try {
      cb(p);
    } catch {
      /* progress reporters must never break capture */
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, tag: string): Promise<T | null> {
  return new Promise((resolve) => {
    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      console.warn(`[slide-image-export] ${tag} readiness timed out after ${ms}ms — proceeding`);
      resolve(null);
    }, ms);
    promise
      .then((v) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(v);
      })
      .catch(() => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(null);
      });
  });
}

/**
 * Fetch a cross-origin image and inline it as a data URL. We keep the
 * original `src` so we can restore it after capture — otherwise a second
 * export from the same DOM would reuse the (now stale) data URL.
 */
async function inlineCrossOriginImages(
  node: HTMLElement,
  onProgress?: ExportProgressCallback,
): Promise<() => void> {
  const imgs = Array.from(node.querySelectorAll("img"));
  const restorers: Array<() => void> = [];
  const remote = imgs.filter((img) => {
    const src = img.currentSrc || img.src;
    if (!src) return false;
    if (src.startsWith("data:")) return false;
    if (src.startsWith("blob:")) return false;
    try {
      const u = new URL(src, window.location.href);
      return u.origin !== window.location.origin;
    } catch {
      return false;
    }
  });

  if (remote.length === 0) {
    report(onProgress, { stage: "images", progress: 1, message: "No remote images" });
    return () => {};
  }

  let done = 0;
  await Promise.all(
    remote.map(async (img) => {
      const original = img.getAttribute("src");
      try {
        const res = await fetch(img.src, { mode: "cors" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const blob = await res.blob();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        img.setAttribute("src", dataUrl);
        // ensure decoded before capture
        if (typeof img.decode === "function") {
          try {
            await img.decode();
          } catch {
            /* non-fatal */
          }
        }
        restorers.push(() => {
          if (original === null) img.removeAttribute("src");
          else img.setAttribute("src", original);
        });
      } catch (err) {
        // Fall back to hiding the tainted image so the canvas doesn't fail
        // wholesale — a missing hero is better than an aborted export.
        console.warn("[slide-image-export] failed to inline image", img.src, err);
        const originalVisibility = img.style.visibility;
        img.style.visibility = "hidden";
        restorers.push(() => {
          img.style.visibility = originalVisibility;
        });
      } finally {
        done += 1;
        report(onProgress, {
          stage: "images",
          progress: done / remote.length,
          message: `Inlined ${done}/${remote.length} image${remote.length === 1 ? "" : "s"}`,
        });
      }
    }),
  );

  return () => {
    for (const r of restorers) r();
  };
}

/**
 * Wait for web fonts. Uses `document.fonts.ready` for the coarse signal,
 * then probes each font-family declared on the node with `document.fonts.check`.
 */
async function ensureFontsReady(
  node: HTMLElement,
  timeoutMs: number,
  onProgress?: ExportProgressCallback,
): Promise<void> {
  report(onProgress, { stage: "fonts", progress: 0, message: "Waiting for fonts…" });
  if (typeof document === "undefined" || !document.fonts) {
    report(onProgress, { stage: "fonts", progress: 1 });
    return;
  }
  await withTimeout(document.fonts.ready, timeoutMs, "document.fonts.ready");

  const families = new Set<string>();
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
  let el: Element | null = walker.currentNode as Element;
  while (el) {
    if (el instanceof HTMLElement) {
      const cs = window.getComputedStyle(el);
      cs.fontFamily
        .split(",")
        .map((f) => f.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean)
        .slice(0, 2) // primary + first fallback is enough
        .forEach((f) => families.add(f));
    }
    el = walker.nextNode() as Element | null;
  }

  const start = performance.now();
  for (const family of families) {
    if (performance.now() - start > timeoutMs) break;
    try {
      // Probe two common weights at body size.
      const ok400 = document.fonts.check(`400 16px "${family}"`);
      const ok700 = document.fonts.check(`700 16px "${family}"`);
      if (!ok400 || !ok700) {
        await withTimeout(
          Promise.all([
            document.fonts.load(`400 16px "${family}"`),
            document.fonts.load(`700 16px "${family}"`),
          ]).then(() => undefined as unknown as void),
          Math.max(400, timeoutMs - (performance.now() - start)),
          `font ${family}`,
        );
      }
    } catch {
      /* opportunistic */
    }
  }
  report(onProgress, { stage: "fonts", progress: 1, message: "Fonts ready" });
}

/**
 * Swap `backdrop-filter` surfaces for a rasterization-safe approximation
 * so foreignObject-based capture doesn't render them as clear rectangles.
 * Returns a restore function.
 */
function neutralizeBackdropFilters(root: HTMLElement, mode: SlideExportMode): () => void {
  const affected: Array<{ el: HTMLElement; prev: string; prevBg: string; prevBoxShadow: string }> =
    [];
  const nodes = root.querySelectorAll<HTMLElement>("*");
  const glassTint = mode === "dark" ? "rgba(20, 24, 60, 0.55)" : "rgba(255, 255, 255, 0.62)";
  const glassEdge =
    mode === "dark" ? "0 0 0 1px rgba(255,255,255,0.06)" : "0 0 0 1px rgba(0,0,0,0.04)";
  nodes.forEach((el) => {
    const cs = window.getComputedStyle(el);
    const bf =
      cs.backdropFilter ||
      (cs as unknown as { webkitBackdropFilter?: string }).webkitBackdropFilter ||
      "";
    if (!bf || bf === "none") return;
    affected.push({
      el,
      prev: el.style.backdropFilter,
      prevBg: el.style.backgroundColor,
      prevBoxShadow: el.style.boxShadow,
    });
    // Kill the property in both prefixed forms so foreignObject stops trying to honor it.
    el.style.backdropFilter = "none";
    (el.style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter =
      "none";
    // If the element has no meaningful background, apply the tint so the
    // glass panel remains legible in the raster.
    const bgAlpha = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*0(?:\.0+)?)?\s*\)/.test(
      cs.backgroundColor,
    );
    if (!cs.backgroundColor || cs.backgroundColor === "rgba(0, 0, 0, 0)" || bgAlpha) {
      el.style.backgroundColor = glassTint;
    }
    if (!cs.boxShadow || cs.boxShadow === "none") {
      el.style.boxShadow = glassEdge;
    }
  });
  return () => {
    for (const { el, prev, prevBg, prevBoxShadow } of affected) {
      el.style.backdropFilter = prev;
      (el.style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter =
        prev;
      el.style.backgroundColor = prevBg;
      el.style.boxShadow = prevBoxShadow;
    }
  };
}

/**
 * Wait for all <img> descendants to finish loading (or error). Runs after
 * inlining so we're really waiting on decode of the swapped data URLs.
 */
async function waitForImages(node: HTMLElement, timeoutMs: number): Promise<void> {
  const images = Array.from(node.querySelectorAll("img"));
  const pending = images.filter((img) => !(img.complete && img.naturalWidth > 0));
  if (pending.length === 0) return;
  await withTimeout(
    Promise.all(
      pending.map(
        (img) =>
          new Promise<void>((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
          }),
      ),
    ).then(() => undefined as unknown as void),
    timeoutMs,
    "images",
  );
}

export interface CaptureSlideOptions {
  /**
   * Device pixel ratio multiplier. If `targetWidth` is also supplied, the
   * effective pixel ratio is derived from `targetWidth / node.offsetWidth`
   * and this option is ignored.
   */
  pixelRatio?: number;
  /** Absolute output width in pixels; overrides `pixelRatio` when set. */
  targetWidth?: number;
  backgroundColor?: string;
  onProgress?: ExportProgressCallback;
}

/**
 * Minimal reusable capture helper. Awaits `document.fonts.ready`, then
 * `img.decode()` on every descendant <img> (falling back to load events for
 * browsers without decode), and rasterizes the node to a PNG data URL at the
 * requested `pixelRatio` (default 2×). Use this when you just need a snapshot
 * and don't need the full progress/backdrop/CORS pipeline of
 * `captureSlideAsDataUrl`.
 */
export async function captureSlide(
  node: HTMLElement,
  opts: CaptureSlideOptions = {},
): Promise<string> {
  if (!node) throw new Error("captureSlide: node is required");
  const { onProgress } = opts;

  report(onProgress, { stage: "fonts", progress: 0, message: "Waiting for fonts…" });
  if (typeof document !== "undefined" && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* best effort */
    }
  }
  report(onProgress, { stage: "fonts", progress: 1, message: "Fonts ready" });

  const images = Array.from(node.querySelectorAll("img"));
  const total = images.length;
  report(onProgress, {
    stage: "images",
    progress: total === 0 ? 1 : 0,
    message: total === 0 ? "No images" : `Decoding ${total} image${total === 1 ? "" : "s"}…`,
  });
  let decoded = 0;
  await Promise.all(
    images.map(async (img) => {
      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {
          /* fall through to load event */
        }
      }
      if (!(img.complete && img.naturalWidth > 0)) {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        });
      }
      decoded += 1;
      if (total > 0) {
        report(onProgress, { stage: "images", progress: decoded / total });
      }
    }),
  );

  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  report(onProgress, { stage: "render", progress: 0.1, message: "Rasterizing…" });
  const effectiveRatio = resolvePixelRatio(node, opts);
  const dataUrl = await toPng(node, {
    pixelRatio: effectiveRatio,
    fontEmbedCSS: await getCachedFontEmbedCSS(node),
    cacheBust: false,
    backgroundColor: opts.backgroundColor,
    filter: (el) => !(el instanceof HTMLElement) || el.dataset?.exportIgnore !== "true",
  });

  report(onProgress, { stage: "encode", progress: 1, message: "Encoded" });
  return dataUrl;
}

/**
 * Rasterize a slide DOM node to a PNG data URL. The node must be attached
 * to the document (visible) so styles resolve.
 */
export async function captureSlideAsDataUrl(
  node: HTMLElement,
  opts: SlideCaptureOptions,
): Promise<string> {
  const { onProgress } = opts;
  const timeoutMs = opts.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT;

  report(onProgress, { stage: "prepare", progress: 0, message: "Preparing capture…" });

  await ensureFontsReady(node, timeoutMs, onProgress);

  report(onProgress, { stage: "images", progress: 0, message: "Inlining images…" });
  const restoreImages = await inlineCrossOriginImages(node, onProgress);
  await waitForImages(node, timeoutMs);

  report(onProgress, { stage: "backdrop", progress: 0.4, message: "Flattening glass surfaces…" });
  const restoreBackdrop = neutralizeBackdropFilters(node, opts.mode);

  // Give the browser one paint cycle so the neutralized styles settle.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    report(onProgress, { stage: "render", progress: 0.1, message: "Rasterizing…" });
    let dataUrl: string;
    const effectiveRatio = resolvePixelRatio(node, opts);
    // Collected once per page and reused for every slide in a batch export.
    const fontEmbedCSS = await getCachedFontEmbedCSS(node);
    try {
      dataUrl = await toPng(node, {
        pixelRatio: effectiveRatio,
        fontEmbedCSS,
        // cacheBust appends a unique query per asset, which defeats the HTTP
        // cache and re-downloads every image on every slide in a batch run.
        cacheBust: opts.cacheBust ?? false,
        backgroundColor: MODE_BG[opts.mode],
        // filter external stylesheets/nodes that break serialization
        filter: (el) => {
          if (!(el instanceof HTMLElement)) return true;
          if (el.dataset?.exportIgnore === "true") return false;
          return true;
        },
      });
    } catch (err) {
      // Retry once at a lower ratio — a browser occasionally OOMs on
      // complex slides above ~3× density.
      const fallbackRatio = Math.max(1, Math.min(2, effectiveRatio / 2));
      console.warn(
        `[slide-image-export] first pass failed at pixelRatio=${effectiveRatio.toFixed(2)}, retrying at ${fallbackRatio.toFixed(2)}`,
        err,
      );
      report(onProgress, {
        stage: "render",
        progress: 0.5,
        message: "Retrying at lower resolution…",
      });
      dataUrl = await toPng(node, {
        pixelRatio: fallbackRatio,
        fontEmbedCSS,
        cacheBust: false,
        backgroundColor: MODE_BG[opts.mode],
        filter: (el) => !(el instanceof HTMLElement) || el.dataset?.exportIgnore !== "true",
      });
    }

    report(onProgress, { stage: "encode", progress: 1, message: "Encoding…" });
    return dataUrl;
  } finally {
    restoreBackdrop();
    restoreImages();
  }
}

function triggerDownload(dataUrl: string, filename: string): void {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Rasterize a slide node and trigger a browser download as PNG.
 */
export async function exportSlideAsPng(
  node: HTMLElement,
  opts: SlideCaptureOptions,
): Promise<void> {
  const dataUrl = await captureSlideAsDataUrl(node, opts);
  const filename = opts.filename ?? `slide-${opts.mode}.png`;
  triggerDownload(dataUrl, filename);
  report(opts.onProgress, { stage: "done", progress: 1, message: "Saved" });
}

/**
 * Minimum raster width for a PDF page.
 *
 * A PDF page is 13.333in wide, so the HD target (1920px) lands at ~144 DPI —
 * below the ~200 DPI where a 1px hairline survives. Icon glyphs are drawn with
 * sub-pixel outline strokes, and at 144 DPI each stroke blurs into a thick
 * light smear on the dark plate: the "icons render with outlines" report. PNG
 * downloads keep the user's HD/4K choice; PDF pages are always rasterized at
 * print resolution (~288 DPI) so hairlines and glyph strokes stay hairlines.
 */
const PDF_MIN_TARGET_WIDTH = 3840;

/**
 * Rasterize one or many slide nodes into a 16:9 landscape PDF (one node per
 * page). Uses a fixed 13.333 × 7.5 inch page — the standard PPTX widescreen
 * size — so the output matches PowerPoint's aspect ratio.
 */
export async function exportSlidesAsImagePdf(
  nodes: Array<{ node: HTMLElement; mode: SlideExportMode }>,
  opts: {
    filename?: string;
    pixelRatio?: number;
    /** Absolute output width in pixels; overrides `pixelRatio` when set. */
    targetWidth?: number;
    onProgress?: ExportProgressCallback;
    returnBlob?: boolean;
  } = {},
): Promise<Blob | void> {
  if (nodes.length === 0) return;
  // Never rasterize a PDF page below print resolution, whatever the caller asked
  // for; a larger request (e.g. 4K) is honoured as-is.
  const pageTargetWidth = Math.max(PDF_MIN_TARGET_WIDTH, opts.targetWidth ?? 0);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [13.333, 7.5],
    compress: true,
  });
  for (let i = 0; i < nodes.length; i++) {
    const { node, mode } = nodes[i];
    const perSlide: ExportProgressCallback | undefined = opts.onProgress
      ? (p) =>
          opts.onProgress!({
            ...p,
            message: `Slide ${i + 1}/${nodes.length} · ${p.message ?? p.stage}`,
          })
      : undefined;
    const dataUrl = await captureSlideAsDataUrl(node, {
      mode,
      // `targetWidth` wins over `pixelRatio` inside the capture, so the floor is
      // enforced by always passing a resolved absolute width.
      targetWidth: pageTargetWidth,
      onProgress: perSlide,
    });

    if (i > 0) pdf.addPage([13.333, 7.5], "landscape");
    // Use "SLOW" (loss-less DEFLATE) so the embedded PNG keeps every pixel
    // of the true high-res raster — "FAST" re-encodes as lossy JPEG.
    pdf.addImage(dataUrl, "PNG", 0, 0, 13.333, 7.5, undefined, "SLOW");
  }

  report(opts.onProgress, { stage: "encode", progress: 1, message: "Assembling PDF…" });
  const filename = opts.filename ?? `slides-${Date.now()}.pdf`;
  if (opts.returnBlob) {
    const blob = pdf.output("blob");
    report(opts.onProgress, { stage: "done", progress: 1, message: "Ready" });
    return blob;
  }
  pdf.save(filename);
  report(opts.onProgress, { stage: "done", progress: 1, message: "Saved" });
}
