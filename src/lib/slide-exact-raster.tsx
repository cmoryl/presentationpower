// -----------------------------------------------------------------------------
// Design-exact slide rasterizer
//
// The OOXML reconstruction path (pptx-export.ts) rebuilds each module out of
// native PowerPoint text boxes and shapes. That keeps a deck editable, but it
// can only ever approximate the design system: CSS gradients, mask seams,
// blend modes, frosted tiles, icon strokes, open-bottom frames and photographic
// plates have no OOXML equivalent, so exports drifted from the build.
//
// This module closes that gap. It mounts the REAL renderer (ExactSlideStage →
// VariantRenderer) offscreen at the true 1920×1080 stage, waits for fonts and
// imagery, and rasterizes one full-bleed plate per slide at the chosen export
// DPI. The PPTX exporter drops that plate on the slide, so what lands in
// PowerPoint is pixel-identical to the app — by construction, for every module,
// every alternate look and both modes.
// -----------------------------------------------------------------------------

import { createRoot, type Root } from "react-dom/client";

import { ExactSlideStage } from "@/components/slide/ExactSlideStage";
import {
  backdropRasterSize,
  rasterSize,
  STAGE_H,
  STAGE_W,
  type ExportQualityId,
} from "./export-quality";
import type { StylePack } from "./style-packs";
import type { TextRun } from "./export-text-layer";
import type { BrandMode, ModuleVariant } from "./taxonomy";

export interface ExactPlateArgs {
  slide: unknown;
  variant: ModuleVariant;
  brand: BrandMode;
  mode: "light" | "dark";
  pack?: StylePack | null;
  pageNumber?: number;
  quality?: ExportQualityId | null;
  /** Layered export: rasterize the decor planes only (no content/logo/footer). */
  decorOnly?: boolean;
}

/** Offscreen host that keeps the stage laid out at full size but out of view. */
function makeHost(): { shell: HTMLDivElement; mount: HTMLDivElement } {
  const shell = document.createElement("div");
  shell.setAttribute("aria-hidden", "true");
  shell.style.position = "fixed";
  shell.style.left = "-20000px";
  shell.style.top = "0";
  shell.style.width = `${STAGE_W}px`;
  shell.style.height = `${STAGE_H}px`;
  shell.style.pointerEvents = "none";
  shell.style.zIndex = "-1";
  // Never let ancestor CSS (dark class, container queries, transforms) leak in.
  shell.style.contain = "layout paint";

  const mount = document.createElement("div");
  mount.style.width = `${STAGE_W}px`;
  mount.style.height = `${STAGE_H}px`;
  shell.appendChild(mount);
  document.body.appendChild(shell);
  return { shell, mount };
}

function nextFrames(n: number): Promise<void> {
  return new Promise((resolve) => {
    let left = n;
    const step = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
/**
 * Wait until every picture on a mounted stage has actually decoded.
 *
 * Batch exports mount slide after slide, and under resource pressure a photo
 * fetch can fail outright (`ERR_INSUFFICIENT_RESOURCES`). The capture then
 * rasterized an empty frame: copy perfect, imagery gone. Each unfinished or
 * failed image gets one cache-busted retry before the plate is taken.
 */
async function settleStageImages(stage: HTMLElement, timeoutMs = 8000): Promise<void> {
  const imgs = Array.from(stage.querySelectorAll("img"));
  if (imgs.length === 0) return;
  const settle = (img: HTMLImageElement, allowRetry: boolean): Promise<void> =>
    new Promise<void>((resolve) => {
      if (img.complete && img.naturalWidth > 0) return resolve();
      if (!img.src) return resolve();
      const done = () => {
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onError);
        resolve();
      };
      const onLoad = () => done();
      const onError = () => {
        img.removeEventListener("load", onLoad);
        img.removeEventListener("error", onError);
        if (!allowRetry) return resolve();
        const base = img.src.split("#")[0];
        const retryUrl = `${base}${base.includes("?") ? "&" : "?"}tpRetry=${Date.now()}`;
        img.src = retryUrl;
        void settle(img, false).then(resolve);
      };
      img.addEventListener("load", onLoad);
      img.addEventListener("error", onError);
    });
  await Promise.race([
    Promise.all(imgs.map((img) => settle(img, true))),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
  // One extra frame so the decoded bitmaps are composited before capture.
  await nextFrames(1);
}


/**
 * Mount the exact stage offscreen, settle it (layout + readability auto-fix),
 * hand the settled stage element to `fn`, then tear the host down.
 *
 * Exported so the placement-verification harness measures the SAME tree the
 * exporter rasterizes — a geometry baseline taken from a different mount would
 * prove nothing about the export.
 */
export async function withExactStage<T>(
  args: ExactPlateArgs,
  fn: (stage: HTMLElement) => Promise<T> | T,
): Promise<T | null> {
  if (typeof document === "undefined") return null;
  const { shell, mount } = makeHost();
  let root: Root | null = null;
  try {
    root = createRoot(mount);
    root.render(
      <ExactSlideStage
        slide={args.slide}
        variant={args.variant}
        brand={args.brand}
        mode={args.mode}
        pack={args.pack ?? null}
        pageNumber={args.pageNumber ?? 1}
        decorOnly={args.decorOnly ?? false}
      />,
    );
    // Let React commit, then let layout/paint settle (masks, gradients, SVG
    // measurement inside figures all need a frame or two).
    await nextFrames(3);

    const stage = mount.querySelector<HTMLElement>("[data-exact-slide-stage]") ?? mount;

    // Photographs must be decoded BEFORE the plate is rasterized. A tile that
    // is still in flight (or that lost its fetch to resource pressure during a
    // batch export) rasterized as empty, which is how a photographic quote or
    // image-strip slide shipped with its imagery missing while the copy landed
    // perfectly. Wait for every picture, and give any failure one clean retry.
    await settleStageImages(stage);


    // Readability + typography auto-fix run on screen too, so the plate must
    // include them or the export would be *better* aligned than the build.
    try {
      const { applyAutoFix, auditAndFixTypography } = await import("@/lib/wcag");
      auditAndFixTypography(stage);
      applyAutoFix(stage);
      await nextFrames(2);
    } catch {
      /* auto-fix is opportunistic */
    }

    return await fn(stage);
  } catch (err) {
    console.error("[exact-export] offscreen stage failed", args.variant?.id, err);
    return null;
  } finally {
    try {
      root?.unmount();
    } catch {
      /* ignore */
    }
    shell.remove();
  }
}

/**
 * Render one module offscreen and return a PNG data URL of the exact slide,
 * or null when rasterization is unavailable (SSR) or fails.
 */
export async function rasterizeExactSlide(args: ExactPlateArgs): Promise<string | null> {
  return withExactStage(args, async (stage) => {
    const { captureSlideAsDataUrl } = await import("./slide-image-export");
    const effMode = args.pack ? args.pack.mode : args.mode;
    const { width } = rasterSize(args.quality ?? null);
    const data = await captureSlideAsDataUrl(stage, {
      mode: effMode,
      targetWidth: width,
      cacheBust: true,
      readyTimeoutMs: 9000,
    });
    return data || null;
  });
}

/**
 * Rasterize a list of slides sequentially. Sequential is deliberate: each
 * capture briefly mounts a full 1920×1080 tree with photographs, and running
 * them in parallel starved the compositor and produced half-painted plates.
 */
export async function rasterizeExactSlides(
  items: ExactPlateArgs[],
  onProgress?: (done: number, total: number) => void,
): Promise<Array<string | null>> {
  const out: Array<string | null> = [];
  for (let i = 0; i < items.length; i += 1) {
    out.push(await rasterizeExactSlide(items[i]));
    onProgress?.(i + 1, items.length);
  }
  return out;
}

/**
 * Layered export helper: one decor-only plate per slide. The plate carries every
 * CSS-only design plane, and the exporter draws native, editable PowerPoint
 * content over it — so the deck looks like the build AND stays editable.
 */
export async function rasterizeDecorPlates(
  items: ExactPlateArgs[],
  onProgress?: (done: number, total: number) => void,
): Promise<Array<string | null>> {
  return rasterizeExactSlides(
    items.map((it) => ({ ...it, decorOnly: true })),
    onProgress,
  );
}

/**
 * Default (editable) export helper: capture the slide's REAL decor ground and,
 * in the same mount, measure every inset media tile.
 *
 * Two bugs made this necessary. The ground used to be re-synthesized from
 * `aurora-svg.ts`, which produced a flat pale wash instead of the aurora the
 * build paints — the object was right, its content was wrong. And inset photo
 * tiles were placed from a hand-written frame table that covered three modules,
 * so every other module's media tile exported as an empty rectangle. Both are
 * answered by measuring the actual renderer rather than approximating it.
 */
export async function captureGroundPlates(
  items: ExactPlateArgs[],
  onProgress?: (done: number, total: number) => void,
): Promise<Array<{ plate: string | null; media: import("./export-media-frames").MediaTileMeasurement[] } | null>> {
  const out: Array<{ plate: string | null; media: import("./export-media-frames").MediaTileMeasurement[] } | null> = [];
  // EXPORT SPEC #3: one backdrop raster per background variant per mode. Two
  // slides on the same variant + brand + mode + pack paint the same ground, so
  // they must reference the SAME bytes — the previous per-slide capture is what
  // produced 840 media parts for 235 unique images. Media tiles are still
  // measured per slide (they carry per-slide photographs).
  const plateCache = new Map<string, string | null>();
  const plateKey = (it: ExactPlateArgs) =>
    [it.variant.id, it.brand.id, it.pack ? it.pack.mode : it.mode, it.pack?.id ?? "-", it.quality ?? "-"].join(
      "|",
    );
  for (let i = 0; i < items.length; i += 1) {
    const key = plateKey(items[i]);
    const res = await withExactStage({ ...items[i], decorOnly: true }, async (stage) => {
      const [{ captureSlideAsDataUrl }, { measureMediaFrames }] = await Promise.all([
        import("./slide-image-export"),
        import("./export-media-frames"),
      ]);
      const media = measureMediaFrames(stage);
      if (plateCache.has(key)) return { plate: plateCache.get(key) ?? null, media };
      const effMode = items[i].pack ? items[i].pack!.mode : items[i].mode;
      const { width } = backdropRasterSize(items[i].quality ?? null);
      const plate = await captureSlideAsDataUrl(stage, {
        mode: effMode,
        targetWidth: width,
        cacheBust: true,
        readyTimeoutMs: 9000,
      });
      plateCache.set(key, plate || null);
      return { plate: plate || null, media };
    });
    out.push(res);
    onProgress?.(i + 1, items.length);
  }
  return out;
}


/**
 * Layered-editable export: one plate per slide carrying every designed pixel
 * EXCEPT glyphs, plus the measured text runs the exporter re-emits as native
 * PowerPoint text boxes. This is the fidelity path — the plate comes from the
 * real renderer, so nothing about the design can drift, while the copy stays
 * fully editable in PowerPoint.
 */
export async function rasterizeTextEditablePlate(
  args: ExactPlateArgs,
): Promise<{ plate: string; runs: TextRun[] } | null> {
  return withExactStage(args, async (stage) => {
    const [{ captureSlideAsDataUrl }, textLayer] = await Promise.all([
      import("./slide-image-export"),
      import("./export-text-layer"),
    ]);
    const { runs, nodes } = textLayer.extractTextRuns(stage);
    textLayer.hideTextRuns(nodes);
    await nextFrames(2);
    const effMode = args.pack ? args.pack.mode : args.mode;
    const { width } = rasterSize(args.quality ?? null);
    const data = await captureSlideAsDataUrl(stage, {
      mode: effMode,
      targetWidth: width,
      cacheBust: true,
      readyTimeoutMs: 9000,
    });
    if (!data) return null;
    return { plate: data, runs };
  });
}

/**
 * FULLY-LAYERED capture (the fidelity default for modules with no bespoke OOXML
 * renderer): measure the text AND decompose every painted box, picture and
 * vector in the content planes, neutralise exactly that paint, then rasterize
 * what is left as the plate.
 *
 * The result is a slide whose cards, bars, pills, photographs, icons and copy
 * are all independent PowerPoint objects, with only genuinely CSS-only artwork
 * (aurora grounds, masks, filters, radial washes) remaining as a backdrop.
 */
export async function rasterizeObjectPlate(
  args: ExactPlateArgs,
): Promise<{ plate: string; runs: TextRun[]; shapes: import("./export-dom-decompose").DomShape[] } | null> {
  return withExactStage(args, async (stage) => {
    const [{ captureSlideAsDataUrl }, textLayer, dom] = await Promise.all([
      import("./slide-image-export"),
      import("./export-text-layer"),
      import("./export-dom-decompose"),
    ]);
    const { runs, nodes } = textLayer.extractTextRuns(stage);
    const measured = dom.decomposeStage(stage);
    // Inline every picture BEFORE neutralising: anything that will not embed
    // must stay on the plate rather than disappear from both layers.
    const droppedNodes: Element[] = [];
    const resolved = await dom.resolveShapeImages(measured, droppedNodes);
    // Anything staying on the plate (unembeddable pictures, filtered subtrees)
    // must not be covered by an opaque ancestor box re-emitted natively — that
    // is what erased full-bleed photographs in PowerPoint. Frosted/wash
    // surfaces prune only what overlaps them, so the boxes, icons and accents
    // layered on the glass stay editable native objects.
    const shapes = dom.pruneOccludingPaint(
      resolved,
      [...droppedNodes, ...dom.platedPaintRoots(stage)],
      dom.surfacePaintRoots(stage),
    );

    textLayer.hideTextRuns(nodes);
    dom.neutralizeCapturedPaint(shapes);
    await nextFrames(2);
    const effMode = args.pack ? args.pack.mode : args.mode;
    const { width } = rasterSize(args.quality ?? null);
    const data = await captureSlideAsDataUrl(stage, {
      mode: effMode,
      targetWidth: width,
      cacheBust: true,
      readyTimeoutMs: 9000,
    });
    if (!data) return null;
    return { plate: data, runs, shapes: shapes.map(({ node: _node, ...rest }) => rest) };
  });
}

export async function rasterizeObjectPlates(
  items: ExactPlateArgs[],
  onProgress?: (done: number, total: number) => void,
): Promise<Array<{ plate: string; runs: TextRun[]; shapes: import("./export-dom-decompose").DomShape[] } | null>> {
  const out: Array<{ plate: string; runs: TextRun[]; shapes: import("./export-dom-decompose").DomShape[] } | null> = [];
  for (let i = 0; i < items.length; i += 1) {
    out.push(await rasterizeObjectPlate(items[i]));
    onProgress?.(i + 1, items.length);
  }
  return out;
}

export async function rasterizeTextEditablePlates(
  items: ExactPlateArgs[],
  onProgress?: (done: number, total: number) => void,
): Promise<Array<{ plate: string; runs: TextRun[] } | null>> {
  const out: Array<{ plate: string; runs: TextRun[] } | null> = [];
  for (let i = 0; i < items.length; i += 1) {
    out.push(await rasterizeTextEditablePlate(items[i]));
    onProgress?.(i + 1, items.length);
  }
  return out;
}
