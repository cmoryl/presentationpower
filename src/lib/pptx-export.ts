// Client-side PPTX export using pptxgenjs.
// Family/variant-aware renderers so exported decks look intentional, not
// templated. Renderer routing is by variant ID prefix, with a generic
// fallback for anything unrecognized. Everything is guarded — missing or
// oddly-shaped content falls back gracefully rather than throwing.

import PptxGenJS from "pptxgenjs";
import type { Deck, DeckSlide, DeckStrategySnapshot } from "./deck-store";
import type { BrandMode } from "./taxonomy";
import { getDivisionLogos } from "./division-logos";
import {
  resolveLogoPlacement,
  LOGO_POSITION_BY_VARIANT,
  type ChromeVariant,
  type LogoPosition,
} from "./logo-placement";

import { pickDivisionImage } from "@/assets/backdrops/divisions";
import { variantSupportsImagery } from "./variant-media";
import {
  readExportFidelity,
  STAGE_W,
  type ExportFidelityId,
  type ExportQualityId,
} from "./export-quality";
import {
  planPptxBackground,
  scrimRectSpec,
  imageBackgroundSizing,
  type PptxBackgroundPlan,
} from "./pptx-background";
import { backdropForVariant } from "@/components/slide/variantBackdrop";
import { MODULE_VARIANTS, byId } from "./taxonomy";
import { SEAM_HEIGHT_PX } from "./surface-tokens";
import { auroraSvgDataUrl } from "./aurora-svg";
import { embedFontsInPptx } from "./pptx-font-embed";
import { applyNativePptxFeatures } from "./pptx-native-xml";
import { withDesignSurfaces } from "./pptx-shape-normalize";
import { groupTag, stripGroupTag } from "./pptx-group-xml";
import { resolveSlideTransition } from "./deck-store";
import { resolveSlideAccent } from "@/lib/slide-accent";
import { iconGlyphDataUrl, warmIconPacks } from "./pptx-icons";
import { ExportIntegrity, retryAsset } from "./pptx-integrity";
import type { DebugManifest } from "./export-debug";
import { ExportTelemetry, type ExportTelemetryReport } from "./export-telemetry";

// Cursor for the slide currently being emitted. The exporter draws through many
// module-level helpers (glyphs, logo lockups, imagery) that have no access to
// the export scope; this lets them report embedded-vs-dropped assets so a
// degraded deck is never handed to the user silently.
let activeIntegrity: ExportIntegrity | null = null;
let activeSlideIndex = 0;
let activeVariantId = "";

function noteExportAsset(asset: "icon" | "image", ok: boolean) {
  activeIntegrity?.noteAsset(activeSlideIndex, asset, ok, activeVariantId);
}

function noteExportLogo(ok: boolean) {
  activeIntegrity?.noteLogo(activeSlideIndex, ok, activeVariantId);
}
import { EXPORT_RADIUS_IN, pillRadiusIn } from "@/lib/export-radius";

// Rasterize an SVG data URL to a PNG data URL via <canvas> so PowerPoint
// renders our aurora backdrops reliably (some viewers ignore embedded SVG
// image fills).
async function svgDataUrlToPng(svgUrl: string, w = 2560, h = 1440): Promise<string | null> {
  if (typeof document === "undefined") return null;
  return await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    // Explicit size hint so browsers rasterize the SVG's feGaussianBlur and
    // fill-opacity layers at target resolution instead of the default 300×150
    // fallback (which loses the aurora blur + glass wash on export).
    img.width = w;
    img.height = h;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = svgUrl;
  });
}

const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

// Deterministic seed→index hash, matches MediaTile in VariantRenderer so
// the exported PPTX uses the same photograph the editor previewed.
function seedHash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Resolve the best photograph to embed for a slide. Priority:
 *  1. `content.mediaUrl` — usually set by PPTX import to preserve the
 *     original picture round-trip.
 *  2. `content.mediaSeed` — curated kits and generated decks pick from
 *     the division-specific imagery library via a deterministic hash.
 *  Returns null when no imagery is warranted (agenda / stats / etc.).
 */
function resolveSlideImageUrl(
  variantId: string,
  brandId: string,
  c: Record<string, unknown>,
): string | null {
  // Only variants that render slide-level imagery are eligible. This
  // matches `variantSupportsImagery` in src/lib/variant-media.ts and
  // prevents non-image variants from surfacing an orphaned photograph
  // during export even if `mediaUrl` / `mediaSeed` accidentally leaked
  // through from an older deck record.
  if (!variantSupportsImagery(variantId)) return null;
  // If the slide has a video, prefer its poster as the static image for
  // PPTX/PDF fallback — the video itself is linked in speaker notes below.
  const poster =
    typeof c.videoPosterUrl === "string" && c.videoPosterUrl.length > 0 ? c.videoPosterUrl : null;
  if (poster) return poster;
  const url = typeof c.mediaUrl === "string" && c.mediaUrl.length > 0 ? c.mediaUrl : null;
  if (url) return url;
  const seed = typeof c.mediaSeed === "string" && c.mediaSeed.length > 0 ? c.mediaSeed : null;
  if (!seed) return null;
  return pickDivisionImage(brandId, seedHash(seed));
}

// Rasterize an SVG data URL (or SVG text blob) to a PNG data URL via canvas.
// PowerPoint's SVG support is inconsistent across versions; the editor and
// print/present paths keep the crisp vector, but export flattens to PNG so
// every audience sees the same picture. Runs in the browser only; the export
// helper is invoked from client code.
async function rasterizeSvgToPngDataUrl(svgDataUrl: string): Promise<string | null> {
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("SVG decode failed"));
      el.src = svgDataUrl;
    });
    // SVGs without intrinsic size default to 300×150 in most browsers; scale
    // up so slide-sized embeds stay crisp.
    let w = img.naturalWidth || 1600;
    let h = img.naturalHeight || 900;
    const longest = Math.max(w, h);
    if (longest < 1600) {
      const scale = 1600 / longest;
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png", 0.95);
  } catch (e) {
    console.warn("[pptx-export] SVG rasterization failed", e);
    return null;
  }
}

async function fetchAsDataUrl(url: string, label?: string): Promise<string | null> {
  // Backgrounds, logos and imagery are load-bearing for the export, so a single
  // transient failure (signed URL racing its refresh, proxy hiccup) must not
  // silently drop the asset — retry with a cache-buster before giving up.
  const { retryAsset } = await import("./pptx-integrity");
  return retryAsset<string>((tryIndex) => fetchAsDataUrlOnce(url, label, tryIndex), {
    attempts: 3,
  });
}

async function fetchAsDataUrlOnce(
  url: string,
  label?: string,
  tryIndex = 0,
): Promise<string | null> {
  try {
    // `mode: "cors"` is the default for cross-origin fetches, but stating it
    // explicitly makes the failure mode obvious in devtools when a pasted
    // image URL lacks CORS headers. Supabase signed URLs and most CDNs
    // (Unsplash, Cloudinary, etc.) send `access-control-allow-origin: *`.
    // NOTE: do NOT pass `credentials: "omit"` — the Lovable preview proxy
    // rejects same-origin fetches without credentials (they fail as
    // `TypeError: Failed to fetch`), which was silently dropping every
    // logo/backdrop/imagery embed. Default `same-origin` credentials work
    // for /brand-logos, /public assets, and cross-origin CDNs alike.
    const res = await fetch(url, { mode: "cors", cache: tryIndex > 0 ? "reload" : "default" });

    if (!res.ok) {
      console.warn(`[pptx-export] ${label ?? "image"} fetch ${res.status}: ${url}`);
      return null;
    }
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    });
    // PowerPoint 2019+/M365 render SVG via addImage; older PPT and Google
    // Slides flatten inconsistently. Respect the vector-first preference:
    // when on, pass SVG through untouched (crisp + tiny); when off, fall
    // back to canvas rasterization for maximum compatibility.
    const isSvg =
      blob.type === "image/svg+xml" ||
      /^data:image\/svg\+xml/i.test(dataUrl) ||
      /\.svg(\?|#|$)/i.test(url);
    if (isSvg) {
      const { getPreferVector } = await import("./pptx-vector-pref");
      if (getPreferVector()) return dataUrl;
      const png = await rasterizeSvgToPngDataUrl(dataUrl);
      if (png) return png;
      console.warn(`[pptx-export] ${label ?? "image"} SVG rasterization failed, skipping: ${url}`);
      return null;
    }
    return dataUrl;
  } catch (e) {
    console.warn(`[pptx-export] ${label ?? "image"} fetch failed (likely CORS): ${url}`, e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Aspect-ratio registry
//
// PowerPoint stretches an <a:blip> to whatever extent we give it. pptxgenjs'
// `sizing: { type: "contain" }` only works when it can read the image's
// intrinsic size — which it cannot for base64 data URLs — so every logo was
// being squashed/stretched to the placeholder box (the "skewed logos on open"
// bug). We instead measure each embedded image once in the browser, cache the
// ratio, and compute an exact centered contain-fit box at render time.
// ---------------------------------------------------------------------------
const aspectCache = new Map<string, number>();

async function measureAspect(dataUrl: string | null | undefined): Promise<void> {
  if (!dataUrl || typeof document === "undefined" || aspectCache.has(dataUrl)) return;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image decode failed"));
      el.src = dataUrl;
    });
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w > 0 && h > 0) aspectCache.set(dataUrl, w / h);
  } catch {
    /* leave unmeasured — callers fall back to the box */
  }
}

/**
 * Centered contain-fit rectangle for an embedded image inside a box.
 * Returns spreadable `{ x, y, w, h }` in inches; never distorts the artwork.
 */
function containFrame(
  data: string,
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const ratio = aspectCache.get(data);
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return { x, y, w, h };
  const boxRatio = w / h;
  let fw = w;
  let fh = h;
  if (ratio > boxRatio) fh = w / ratio;
  else fw = h * ratio;
  return { x: x + (w - fw) / 2, y: y + (h - fh) / 2, w: fw, h: fh };
}

/**
 * Centered cover-fit rectangle: fills the box completely, preserving aspect
 * (overflow bleeds past the box, which is what full-bleed slide art wants).
 */
function coverFrame(
  data: string,
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number; w: number; h: number } {
  const ratio = aspectCache.get(data);
  if (!ratio || !Number.isFinite(ratio) || ratio <= 0) return { x, y, w, h };
  const boxRatio = w / h;
  // Rasterized slide plates are generated at the slide aspect, but integer
  // pixel rounding can leave a ~0.02% ratio drift. Snapping that to the box
  // keeps a full-bleed background exactly on the slide rect instead of
  // overflowing (and so cropping) by a fraction of an inch.
  if (Math.abs(ratio - boxRatio) / boxRatio < 0.002) return { x, y, w, h };
  let fw = w;
  let fh = h;
  if (ratio > boxRatio) fw = h * ratio;
  else fh = w / ratio;
  return { x: x + (w - fw) / 2, y: y + (h - fh) / 2, w: fw, h: fh };

}

async function tintImageDataUrl(dataUrl: string | null, color: string): Promise<string | null> {

  if (!dataUrl || typeof document === "undefined") return dataUrl;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("logo decode failed"));
      el.src = dataUrl;
    });
    const w = img.naturalWidth || img.width || 600;
    const h = img.naturalHeight || img.height || 160;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    return canvas.toDataURL("image/png");
  } catch {
    return dataUrl;
  }
}

export type Palette = { primary: string; accent: string; surface: string; ink: string };

// Derive a mode-aware palette so dark-mode exports don't render light-surface
// tiles with dark-navy text (invisible on a dark background). The base palette
// comes from the brand tokens (light-mode Blue White surface, dark navy ink);
// in dark mode we flip surface to a slightly-elevated navy tile and text to
// white/light-ink so cards, numbers and body copy read like the on-screen
// preview.
export function adaptPaletteForMode(base: Palette, isDark: boolean): Palette {
  if (!isDark) return base;
  return {
    // Big numbers, headings and title text (renderers use p.primary for these)
    // must be white on a dark backdrop, not brand blue.
    primary: "FFFFFF",
    // Accent stays brand accent — used for eyebrows, rules and highlights.
    accent: base.accent,
    // Elevated tile surface: a step lighter than the navy primary background
    // so cards/glass panels are visible without being pure white. Byte-locked
    // to the `.glass-dark` gradient top stop in `src/styles.css` — the
    // preview↔export glass-token parity test enforces this equality.
    surface: "141435",

    // Body/ink text becomes a soft light gray, legible on navy.
    ink: "D6DEF2",
  };
}

/** Rough relative luminance of a 6-digit hex, used for light/dark decisions. */
function relLuminanceHex(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 1;
  const n = parseInt(h.slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Light-slide ink guard.
 *
 * Many per-variant vector renderers were written when covers, dividers and
 * imagery slides were always dark, so they hardcode white text. On a LIGHT
 * slide (light mode, or a light layered decor plate) that copy disappears.
 * This wraps `addText` for the slide and remaps hardcoded white to the brand
 * ink, unless the text sits over a full-bleed photograph, where white is the
 * legible choice. Applied per slide, so it can never affect dark exports.
 */
function installLightInkGuard(s: PptxGenJS.Slide, ink: string) {
  const target = s as unknown as {
    addText: (...args: unknown[]) => unknown;
    __inkGuarded?: boolean;
    __lightInk?: string;
  };
  // Recorded on the slide so non-text emitters (icon glyphs) can consult the
  // same guard: an icon handed hardcoded white onto a light layered plate
  // disappears exactly the way white text used to.
  target.__lightInk = ink;
  if (target.__inkGuarded) return;
  const orig = target.addText.bind(target);
  target.addText = (text: unknown, opts?: unknown) => {
    if (opts && typeof opts === "object") {
      const o = opts as Record<string, unknown>;
      const col = typeof o.color === "string" ? o.color.replace("#", "").toUpperCase() : null;
      if (col === "FFFFFF" || col === "FFF") o.color = ink;
    }
    return orig(text, opts);
  };
  target.__inkGuarded = true;
}

export type PptxExportResult = {
  blob?: Blob;
  failedSlides: string[];
  fileName?: string;
  /**
   * Anything that could not be embedded exactly as designed (a background plate
   * that would not rasterize, a dropped logo or icon). Empty means the file
   * matches the build.
   */
  warnings?: string[];
  integrity?: {
    slides: number;
    platedBackgrounds: number;
    retries: number;
    warnings: number;
    /** Icon glyphs requested, and how many failed to embed (empty icon wells). */
    iconsRequested: number;
    iconsMissing: number;
  };
  /**
   * Per-slide render/assembly timings, retries and ranked bottlenecks for this
   * export run. Surfaced in the export UI so a slow deck can be diagnosed
   * without a devtools profile.
   */
  telemetry?: ExportTelemetryReport;
  /**
   * Per-slide object-tree metadata, present only when `debugObjectTree` was
   * requested. Mirrors the sidecar JSON and the notes injected into the debug
   * .pptx.
   */
  debugManifest?: DebugManifest;
};

/**
 * Flatten a slide's copy into plain text for speaker notes. Used by the
 * design-exact path, where the visible slide is a plate: the words still have
 * to travel with the deck so it stays searchable, translatable and reusable.
 */
function slideTextDigest(slide: { variantId?: string; content?: unknown }): string {
  const lines: string[] = [];
  const seen = new Set<unknown>();
  const walk = (value: unknown, depth: number) => {
    if (depth > 5 || value == null) return;
    if (typeof value === "string") {
      const t = value.trim();
      // Skip URLs, data URLs, ids and colour tokens — notes are for copy.
      if (!t || t.length > 600) return;
      if (/^(https?:|data:|blob:|#[0-9a-f]{3,8}$)/i.test(t)) return;
      lines.push(t);
      return;
    }
    if (typeof value === "number") return;
    if (Array.isArray(value)) {
      for (const v of value) walk(v, depth + 1);
      return;
    }
    if (typeof value === "object") {
      if (seen.has(value)) return;
      seen.add(value);
      for (const v of Object.values(value as Record<string, unknown>)) walk(v, depth + 1);
    }
  };
  walk(slide.content, 0);
  const body = Array.from(new Set(lines)).join("\n");
  return body ? `${slide.variantId ?? "Slide"}\n\n${body}` : "";
}


export async function exportDeckToPptx(
  deck: Deck,
  brand: BrandMode,
  opts?: {
    strategy?: DeckStrategySnapshot | null;
    output?: "download" | "blob";
    forceMode?: "light" | "dark";
    /**
     * Style-pack ("alternate look") sheet, pre-rasterized to a PNG data URL.
     * Applied as every slide's background so pack exports keep the field,
     * ground, scaffold, motif and grain planes the screen shows.
     */
    packBackground?: { data: string | null; surface: string } | null;
    /**
     * Rasterization DPI for the parts of a slide that cannot be vectors
     * (gradient / pattern / preset backgrounds). Text, shapes and icons stay
     * vector at every setting, so this only trades file size for crispness.
     */
    quality?: ExportQualityId | null;
    /**
     * Design-exact plates: one full-bleed PNG per deck slide, rasterized from
     * the real app renderer (see `slide-exact-raster.tsx`). When a slide has a
     * plate, it IS the slide — the OOXML reconstruction is skipped entirely so
     * the export cannot drift from the build. Indexed by slide position; a null
     * entry falls back to the editable vector path for that slide alone.
     */
    exactPlates?: Array<string | null> | null;
    /**
     * Fidelity mode. Defaults to the reviewer's saved preference ("exact").
     * In "exact" mode, and when no plates were supplied by the caller, the
     * exporter rasterizes them itself from the live renderer — so every export
     * surface in the app (deck export, share menu, library, single module)
     * gets design-exact output without each caller opting in.
     */
    fidelity?: ExportFidelityId | null;
    /** Progress hook for the plate pass (slides can take ~1s each). */
    onPlateProgress?: (done: number, total: number) => void;
    /** Receives the performance report as soon as the file is written. */
    onTelemetry?: (report: ExportTelemetryReport) => void;
    /** Style pack in play, so self-rasterized plates carry the alternate look. */
    pack?: unknown;
    /**
     * Debug object tree. When true the exporter derives a per-slide layering
     * report from the finished bytes and returns it as `debugManifest`. In
     * download mode it also writes a `<deck>.layers.json` sidecar and swaps the
     * delivered file for a debug .pptx whose speaker notes list every object
     * (type, editable, layered, rect) so layering is inspectable in PowerPoint.
     */
    debugObjectTree?: boolean;
  },



): Promise<PptxExportResult> {
  const forceMode = opts?.forceMode;

  // Resolved up front because the LAYERED default needs a decor-plate pass while
  // the background plans are still being assembled.
  const fidelity: ExportFidelityId =
    opts?.fidelity ?? (typeof document === "undefined" ? "editable" : readExportFidelity());

  // Tracks, per slide, that the designed background plate, brand lockup, icon
  // glyphs and imagery all actually made it into the file. Reported back to the
  // caller so a degraded export is visible instead of silent.
  const integrity = new ExportIntegrity(fidelity);
  deck.slides.forEach((sl, i) => integrity.track(i, sl.variantId));

  // Performance bookkeeping: which phase, and which slide, spent the time.
  const telemetry = new ExportTelemetry(fidelity, String(opts?.quality ?? "standard"));
  deck.slides.forEach((sl, i) => telemetry.track(i, sl.variantId));
  const endPrepare = telemetry.phase("prepare");

  // Warm every icon pack this deck references. `iconGlyphDataUrl` resolves pack
  // glyphs synchronously off the pack cache, so without this pass a
  // `pack:name` override renders the loading placeholder and the icon well
  // exports empty.
  try {
    const refs = new Set<string>();
    const json = JSON.stringify(deck.slides ?? []);
    for (const m of json.matchAll(/"([a-z0-9][a-z0-9-]{1,24}):([a-zA-Z0-9][\w.-]{1,48})"/g)) {
      if (/^(https?|data|blob|file|mailto|tel)$/i.test(m[1])) continue;
      refs.add(`${m[1]}:${m[2]}`);
    }
    if (refs.size) await warmIconPacks(refs);
  } catch (e) {
    console.warn("[pptx-export] icon pack warm-up skipped", e);
  }




  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = deck.title;
  pptx.company = "TransPerfect";

  const palette: Palette = {
    primary: brand.tokens.primary.replace("#", ""),
    accent: brand.tokens.accent.replace("#", ""),
    surface: brand.tokens.surface.replace("#", ""),
    ink: brand.tokens.ink.replace("#", ""),
  };

  // ---------------------------------------------------------------------------
  // Brand slide masters
  //
  // Every exported slide is parented to a real PowerPoint slide master carrying
  // the brand background, so a deck opened in PowerPoint inherits a background
  // from View > Slide Master instead of the default white master. Per-slide
  // backgrounds (photographs, design plates, solids) still paint on top; the
  // master is the floor that guarantees a slide is never blank white when a
  // plate or photo fails to embed, and it is what makes "Reset background" in
  // PowerPoint land on brand rather than white.
  // ---------------------------------------------------------------------------
  const MASTER_DARK = "TP_BRAND_DARK";
  const MASTER_LIGHT = "TP_BRAND_LIGHT";
  pptx.defineSlideMaster({
    title: MASTER_DARK,
    background: { color: palette.primary },
    objects: [],
  });
  pptx.defineSlideMaster({
    title: MASTER_LIGHT,
    background: { color: "FFFFFF" },
    objects: [],
  });
  /** Master a slide should inherit, decided from the resolved background plan. */
  const masterFor = (dark: boolean) => (dark ? MASTER_DARK : MASTER_LIGHT);

  const strategy = opts?.strategy ?? deck.context?.strategy ?? null;
  const keyMessageBySection = new Map<string, string>();
  strategy?.recommendedSections?.forEach((r) => {
    if (r.sectionId && r.keyMessage) keyMessageBySection.set(r.sectionId, r.keyMessage);
  });

  const logos = getDivisionLogos(deck.brandModeId) ?? getDivisionLogos("tp");
  const [rawLogoColor, rawLogoWhite, rawLogoStackedColor, rawLogoStackedWhite] = await Promise.all([
    // Light slides use the approved black lockup, matching the app.
    logos?.black ?? logos?.color
      ? fetchAsDataUrl((logos?.black ?? logos?.color)!)
      : Promise.resolve(null),
    logos?.white
      ? fetchAsDataUrl(logos.white)
      : logos?.color
        ? fetchAsDataUrl(logos.color)
        : Promise.resolve(null),
    logos?.stackedColor ? fetchAsDataUrl(logos.stackedColor) : Promise.resolve(null),
    logos?.stackedWhite
      ? fetchAsDataUrl(logos.stackedWhite)
      : logos?.stackedColor
        ? fetchAsDataUrl(logos.stackedColor)
        : Promise.resolve(null),
  ]);
  const [logoColor, logoWhite, logoStackedColor, logoStackedWhite] = await Promise.all([
    tintImageDataUrl(rawLogoColor, "#000000"),
    tintImageDataUrl(rawLogoWhite ?? rawLogoColor, "#FFFFFF"),
    tintImageDataUrl(rawLogoStackedColor, "#000000"),
    tintImageDataUrl(rawLogoStackedWhite ?? rawLogoStackedColor, "#FFFFFF"),
  ]);
  // Measure the tinted lockups so placement can contain-fit them exactly.
  await Promise.all(
    [logoColor, logoWhite, logoStackedColor, logoStackedWhite].map((d) => measureAspect(d)),
  );

  const deckLogoOrientation: "horizontal" | "stacked" =
    deck.context?.logoOrientation === "stacked" ? "stacked" : "horizontal";

  // Prefetch all slide imagery in parallel so the export runs quickly.
  // Custom `content.mediaUrl` failures are logged with the slide index so a
  // client-photo-drop is visible in the console, not silent.
  const slideImages: Array<string | null> = await Promise.all(
    deck.slides.map((slide, idx) => {
      const c = slide.content as Record<string, unknown>;
      const url = resolveSlideImageUrl(slide.variantId, deck.brandModeId, c);
      if (!url) return Promise.resolve(null);
      const isCustom =
        typeof c.mediaUrl === "string" && c.mediaUrl.length > 0 && c.mediaUrl === url;
      return fetchAsDataUrl(
        url,
        isCustom ? `slide ${idx + 1} custom image` : `slide ${idx + 1} imagery`,
      );
    }),
  );

  // Rasterize each slide's Backgrounds & Imagery selection in parallel. This
  // covers library presets, solid/gradient/pattern, and image (upload/ai)
  // choices — everything set through the Background & Imagery panel.
  endPrepare();
  const endBackgrounds = telemetry.phase("backgrounds");
  const backgroundPlans: PptxBackgroundPlan[] = await Promise.all(
    deck.slides.map((slide) => {
      const c = slide.content as Record<string, unknown>;
      return planPptxBackground(c.background, opts?.quality ?? null);
    }),
  );

  /**
   * Light/dark decision BEFORE any background is resolved. A forced export mode
   * wins, then the slide's own per-slide mode override (set in the editor and in
   * bulk actions — previously ignored by every export path, which is why decks
   * came back with the wrong background), then the variant's role.
   */
  const baseModeFor = (i: number): "light" | "dark" => {
    if (forceMode) return forceMode;
    const own = (deck.slides[i] as { mode?: "light" | "dark" }).mode;
    if (own === "light" || own === "dark") return own;
    const kind = classifyVariant(deck.slides[i].variantId, i);
    return kind === "cover" || kind === "divider" ? "dark" : "light";
  };

  // Fallback: when a slide has no explicit Backgrounds & Imagery selection,
  // honor the variant's deterministic backdrop (curated corporate-dark set,
  // division photograph, or abstract atmospheric — same asset the editor's
  // dark-mode preview and Present view render). Without this the exported
  // PPTX/PDF drops the entire backdrop layer and slides land on a flat
  // color, which is the "no background/imagery in exports" symptom.
  await Promise.all(
    backgroundPlans.map(async (plan, i) => {
      // A style pack owns the whole sheet — never layer a division photo
      // backdrop under an alternate look.
      if (opts?.packBackground) return;
      if (plan.kind !== "none") return;

      const slide = deck.slides[i];
      const variant = byId(MODULE_VARIANTS, slide.variantId);
      if (!variant) return;
      const backdrop = backdropForVariant(variant, deck.brandModeId, baseModeFor(i));
      if (!backdrop) return;

      // Aurora backdrops have no url — render the AuroraLayer SVG for this
      // brand+seed, rasterize to PNG, and embed so PPTX/PDF gets the same
      // brand-accented atmosphere the editor shows (previously exports for
      // non-Corporate/Media/Games brands landed on a flat white slide with
      // zero backdrop, formatting or brand signature).
      if (backdrop.aurora) {
        const seed = backdrop.auroraSeed ?? variant.id;
        const tint = (
          backdrop.tint ?? (backdrop.darkChrome ? "#03002C" : brand.tokens.surface)
        ).replace(/^#/, "");
        const svgUrl = auroraSvgDataUrl(
          seed,
          brand,
          backdrop.darkChrome ? "dark" : "light",
          `#${tint}`,
        );
        const png = await svgDataUrlToPng(svgUrl);
        if (!png) {
          backgroundPlans[i] = { kind: "solid", color: tint };
          return;
        }
        backgroundPlans[i] = {
          kind: "image",
          data: png,
          solidFallback: tint,
          fit: "cover",
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        };
        return;
      }

      if (!backdrop.url) return;
      const data = await fetchAsDataUrl(backdrop.url, `slide ${i + 1} variant backdrop`);
      if (!data) return;
      const tint = (backdrop.tint ?? "#03002C").replace("#", "");
      const strength = typeof backdrop.scrimStrength === "number" ? backdrop.scrimStrength : 0.6;
      backgroundPlans[i] = {
        kind: "image",
        data,
        solidFallback: tint,
        scrim: {
          color: tint,
          strengthTop:
            backdrop.scrim === "top" || backdrop.scrim === "full" ? strength : strength * 0.15,
          strengthMiddle: strength * 0.55,
          strengthBottom:
            backdrop.scrim === "bottom" || backdrop.scrim === "full" ? strength : strength * 0.15,
          side: backdrop.scrim ?? "bottom",
        },
        fit: "cover",
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      };
    }),
  );

  // Style-pack sheet wins over everything: it IS the look. Rasterized once by
  // the caller and reused for every slide in the export.
  if (opts?.packBackground) {
    const pb = opts.packBackground;
    for (let i = 0; i < backgroundPlans.length; i += 1) {
      backgroundPlans[i] = pb.data
        ? {
            kind: "image",
            data: pb.data,
            solidFallback: pb.surface.replace("#", ""),
            fit: "cover",
            zoom: 1,
            offsetX: 0,
            offsetY: 0,
          }
        : { kind: "solid", color: pb.surface.replace("#", "") };
    }
  }

  // ---------------------------------------------------------------------------
  // Layered pass (default fidelity) — design-exact DECOR plate + native objects
  //
  // The plate is rasterized from the REAL renderer with the complete content,
  // logo and footer planes hidden. It therefore carries only CSS-only artwork:
  // gradient grounds, glass washes, masks, grain and alternate-look motifs.
  // The normal OOXML render path then emits tiles, figures, rules, photographs,
  // icons, logos and text as separate native PowerPoint objects over that plate.
  // This is deliberately different from the flat design-exact path below.
  // ---------------------------------------------------------------------------
  endBackgrounds();
  const layeredPlates: Record<number, string> = {};
  /**
   * Layered-editable capture: the plate carries every designed pixel EXCEPT the
   * glyphs, and `runs` are the measured text runs the slide loop re-emits as
   * native PowerPoint text boxes. This is what makes exported copy match the
   * build's size, weight, tracking and line height — the hand-written module
   * renderers could only approximate them.
   */
  const layeredText: Record<number, { plate: string; runs: import("./export-text-layer").TextRun[] }> =
    {};
  if (fidelity === "layered" && typeof document !== "undefined") {
    const endPlates = telemetry.phase("plates");
    try {
      const { rasterizeDecorPlates, rasterizeTextEditablePlates } = await import(
        "./slide-exact-raster"
      );
      const packArg = (opts?.pack ?? null) as null | { mode: "light" | "dark" };
      // Every module slide gets a plate — including ones with photographic
      // backgrounds, since the plate is captured from the renderer and already
      // contains that photograph exactly as the build paints it.
      const targets = deck.slides
        .map((sl, i) => ({ sl, i }))
        .filter(({ i }) => Boolean(byId(MODULE_VARIANTS, deck.slides[i].variantId)));
      const plateArgsFor = (sl: (typeof deck.slides)[number], i: number) => {
        const variant = byId(MODULE_VARIANTS, sl.variantId)!;
        return {
          slide: sl,
          variant,
          brand,
          mode: baseModeFor(i),
          pack: packArg as never,
          pageNumber: i + 1,
          quality: opts?.quality ?? null,
        };
      };
      const applyPlate = (i: number, data: string) => {
        const solidFallback =
          backgroundPlans[i].kind === "solid"
            ? (backgroundPlans[i] as { color: string }).color
            : baseModeFor(i) === "light"
              ? "FFFFFF"
              : palette.primary;
        backgroundPlans[i] = {
          kind: "image",
          data,
          solidFallback,
          fit: "cover",
          zoom: 1,
          offsetX: 0,
          offsetY: 0,
        };
        layeredPlates[i] = data;
        telemetry.notePlateBytes(i, data, deck.slides[i].variantId);
        integrity.noteBackground(i, "plate", deck.slides[i].variantId);
      };

      if (targets.length > 0) {
        // The batch rasterizer reports (done, total); each tick closes the
        // slide that just finished, which is how per-slide render time is
        // attributed without mounting them one at a time.
        const platePerSlide = telemetry.plateProgressTimer(
          targets.map(({ sl, i }) => ({ slideIndex: i, variantId: sl.variantId })),
        );
        const captured = await rasterizeTextEditablePlates(
          targets.map(({ sl, i }) => plateArgsFor(sl, i)),
          (done, total) => {
            platePerSlide(done, total);
            opts?.onPlateProgress?.(done, total);
          },
        );
        const missed: Array<{ sl: (typeof deck.slides)[number]; i: number }> = [];
        targets.forEach(({ sl, i }, n) => {
          const res = captured[n];
          if (res?.plate) {
            applyPlate(i, res.plate);
            layeredText[i] = { plate: res.plate, runs: res.runs ?? [] };
            telemetry.noteTextRuns?.(i, res.runs?.length ?? 0);
          } else missed.push({ sl, i });
        });

        // A dropped capture means the design would be approximated. Retry each
        // miss on its own mount; if even that fails, fall back to a decor-only
        // plate so the native OOXML renderers still carry the content.
        for (const { sl, i } of missed) {
          integrity.noteRetry(i, sl.variantId);
          telemetry.noteRetry(i, sl.variantId);
          const retryStart = Date.now();
          const retried = await retryAsset<{ plate: string; runs: unknown[] } | null>(
            () =>
              rasterizeTextEditablePlates([plateArgsFor(sl, i)]).then(
                (r) => r[0] as { plate: string; runs: unknown[] } | null,
              ),
            { attempts: 2, delayMs: 300 },
          );
          if (retried?.plate) {
            applyPlate(i, retried.plate);
            layeredText[i] = {
              plate: retried.plate,
              runs: (retried.runs ?? []) as import("./export-text-layer").TextRun[],
            };
            telemetry.notePlate(i, Date.now() - retryStart, sl.variantId);
            continue;
          }
          const decor = await rasterizeDecorPlates([plateArgsFor(sl, i)]).then((r) => r[0]);
          if (decor) applyPlate(i, decor);
          telemetry.notePlate(i, Date.now() - retryStart, sl.variantId);
          if (!decor)
            integrity.noteGlobal(
              `Slide ${i + 1} (${sl.variantId}): design plate failed; native editable objects were preserved.`,
            );
        }
      }
    } catch (err) {
      console.error("[pptx-export] layered decor pass failed; using vector decor", err);
      integrity.noteGlobal(
        "The designed background plates could not be rendered; slides fell back to vector backgrounds.",
      );
    } finally {
      endPlates();
    }
  }



  // Prefetch per-item client logos for the six client-listing variants so the
  // export renderers can embed real wordmarks (falling back to the initials

  // tile only when a slot has no logoUrl set).
  const LOGO_ITEM_VARIANTS = new Set([
    "MV-PROOF-LOGOS",
    "MV-PROOF-LOGOS-STRIP",
    "MV-PROOF-LOGOS-MARQUEE",
    "MV-PROOF-LOGOS-FEATURED",
    "MV-PROOF-LOGOS-CATEGORIZED",
    "MV-PROOF-LOGOS-MOSAIC",
    "MV-CASE-LOGO-GRID",
    "MV-LOGO-WALL",
    "MV-CLIENT-MATRIX",
    "MV-CLIENT-DETAIL-3",
    "MV-CLIENT-COMPARE",
  ]);
  // Pre-resolve logoPath → fresh signed URL for the 1-hour client-logos
  // bucket, so exports that run more than an hour after picking a logo
  // still embed real wordmarks (falling back to the stored logoUrl and
  // then the initials tile).
  const logoPathSet = new Set<string>();
  for (const slide of deck.slides) {
    if (!LOGO_ITEM_VARIANTS.has(slide.variantId)) continue;
    const items = Array.isArray((slide.content as Record<string, unknown>).items)
      ? ((slide.content as Record<string, unknown>).items as Array<Record<string, unknown>>)
      : [];
    for (const it of items) {
      if (typeof it.logoPath === "string" && it.logoPath) logoPathSet.add(it.logoPath);
    }
  }
  const logoPathUrls: Record<string, string> = {};
  if (logoPathSet.size > 0) {
    try {
      const { signClientLogoPaths } = await import("@/lib/client-logos.functions");
      const res = await signClientLogoPaths({ data: { paths: [...logoPathSet] } });
      Object.assign(logoPathUrls, res?.urls ?? {});
    } catch {
      // Best-effort — fall through to whatever URL is stored on the item.
    }
  }
  // Per-slide dark/light decision must match the render loop below so that
  // the prefetched item-logo picks the correct color variant (white marks on
  // dark chrome, color marks on light chrome).
  const slideIsDark: boolean[] = deck.slides.map((slide, i) => {
    const kind = classifyVariant(slide.variantId, i);
    const advancedDark = slide.variantId === "MV-COUNTDOWN";
    const bgIsImage = backgroundPlans[i].kind === "image";
    return advancedDark || kind === "cover" || kind === "divider" || bgIsImage;
  });
  const slideItemLogos: Array<Array<string | null>> = await Promise.all(
    deck.slides.map(async (slide, idx) => {
      if (!LOGO_ITEM_VARIANTS.has(slide.variantId)) return [];
      const items = Array.isArray((slide.content as Record<string, unknown>).items)
        ? ((slide.content as Record<string, unknown>).items as Array<Record<string, unknown>>)
        : [];
      const wantDark = slideIsDark[idx];
      return Promise.all(
        items.map((it, k) => {
          const path = typeof it.logoPath === "string" ? it.logoPath : "";
          const light = typeof it.logoUrl === "string" ? it.logoUrl : "";
          const dark =
            (typeof it.logoUrlDark === "string" && it.logoUrlDark) ||
            (typeof (it as Record<string, unknown>).logoWhite === "string"
              ? ((it as Record<string, unknown>).logoWhite as string)
              : "");
          const signed = path ? logoPathUrls[path] : "";
          // Prefer the mode-appropriate mark; fall back through the other
          // variant, then the signed storage URL, so exports never show a
          // black mark on a dark slide when a white variant exists.
          const url = wantDark ? dark || signed || light : light || signed || dark;
          if (!url) return Promise.resolve(null);
          return fetchAsDataUrl(url, `slide ${idx + 1} item ${k + 1} logo`);
        }),
      );
    }),
  );
  // Measure every client wordmark so tile placement keeps the true ratio.
  await Promise.all(slideItemLogos.flat().map((d) => measureAspect(d)));
  // Measure slide imagery too, so full-bleed photos cover without stretching.
  await Promise.all(slideImages.map((d) => measureAspect(d)));
  // …and every resolved background raster/photograph.
  await Promise.all(
    backgroundPlans.map((plan) => (plan.kind === "image" ? measureAspect(plan.data) : undefined)),
  );


  // Pre-render MV-VIZ-* infographic specs to vector SVG (browser-only,
  // via ECharts). Ships as an image on the slide — pptxgenjs accepts SVG
  // data URLs and PowerPoint preserves them as vectors.
  const slideVizSvg: Record<string, string> = {};
  const vizSlides = deck.slides.filter(
    (sl) => typeof sl.variantId === "string" && sl.variantId.startsWith("MV-VIZ-"),
  );
  if (vizSlides.length > 0 && typeof window !== "undefined") {
    try {
      const [{ renderSpecToSvg, svgToDataUrl }, { ensureA11y }, { vizKindForVariant }] =
        await Promise.all([
          import("@/lib/infographics/svg"),
          import("@/lib/infographics/a11y"),
          import("@/lib/infographics/variant-kinds"),
        ]);
      await Promise.all(
        vizSlides.map(async (sl) => {
          try {
            const content = (sl.content ?? {}) as Record<string, unknown>;
            const declared = content.spec as Record<string, unknown> | undefined;
            const kind = (declared?.kind as string) ?? vizKindForVariant(sl.variantId);
            const rows =
              ((declared?.data as Record<string, unknown> | undefined)?.rows as unknown[]) ??
              (content.rows as unknown[]) ??
              [];
            // No data means an empty canvas — skip the SVG so the slide renders
            // its visible text fallback instead of a blank chart frame.
            if (!Array.isArray(rows) || rows.length === 0) return;
            const encoding =
              (declared?.encoding as Record<string, unknown>) ??
              (content.encoding as Record<string, unknown>) ??
              {};
            // Chart ink must follow the exported slide's own mode, otherwise
            // light-mode decks get dark-mode axis/label colors.
            const slideMode: "light" | "dark" =
              forceMode ?? ((sl as { mode?: string }).mode === "dark" ? "dark" : "light");
            const spec = ensureA11y({
              id: `${sl.id}-viz`,
              kind: kind as never,
              title: typeof content.title === "string" ? content.title : "",
              data: {
                rows: rows as never,
                source: typeof content.source === "string" ? content.source : undefined,
              },
              encoding: encoding as never,
              theme: {
                divisionId: brand.id,
                mode: slideMode,
                accent: resolveSlideAccent(sl, brand),
                primary: `#${palette.primary}`,
                ink: slideMode === "dark" ? "#FFFFFF" : `#${palette.ink}`,
                surface: slideMode === "dark" ? `#${palette.primary}` : "#FFFFFF",
              },
              accessibility: { shortAlt: "", longDesc: "" },
              export: { preferredFormat: "svg", rasterFallback: true },
            });
            const svg = await renderSpecToSvg(spec, { width: 1600, height: 900 });
            if (svg) slideVizSvg[sl.id] = svgToDataUrl(svg);
          } catch {
            /* per-slide failure — falls back to title-only */
          }
        }),
      );
    } catch {
      /* module load failure — leave slideVizSvg empty */
    }
  }

  // ---------------------------------------------------------------------------
  // Design-exact plate pass
  //
  // Accurate exports are the product, so unless the caller explicitly asks for
  // editable text (or already supplied plates), rasterize every slide from the
  // live renderer. This is what makes a .pptx look exactly like the build:
  // gradients, masks, blend modes, frosted tiles, icon strokes, seams, photos
  // and logo placement all come from the same DOM the reviewer approved.
  // ---------------------------------------------------------------------------
  // Exact plates are legal only for the explicitly flat fidelity. A supplied
  // plate must never silently flatten a layered/editable export.
  let exactPlates: Array<string | null> | null =
    fidelity === "exact" ? (opts?.exactPlates ?? null) : null;
  if (!exactPlates && fidelity === "exact" && typeof document !== "undefined") {
    const endExact = telemetry.phase("plates");
    const exactPerSlide = telemetry.plateProgressTimer(
      deck.slides.map((sl, i) => ({ slideIndex: i, variantId: sl.variantId })),
    );
    try {
      const { rasterizeExactSlides } = await import("./slide-exact-raster");
      const packArg = (opts?.pack ?? null) as null | { mode: "light" | "dark" };
      exactPlates = await rasterizeExactSlides(
        deck.slides.map((sl, i) => {
          const variant = byId(MODULE_VARIANTS, sl.variantId);
          const kind = classifyVariant(sl.variantId, i);
          const bgIsImage = backgroundPlans[i].kind === "image";
          const mode: "light" | "dark" =
            forceMode ??
            (kind === "cover" || kind === "divider" || bgIsImage ? "dark" : "light");
          return {
            slide: sl,
            variant: variant!,
            brand,
            mode,
            pack: packArg as never,
            pageNumber: i + 1,
            quality: opts?.quality ?? null,
          };
        }),
        (done, total) => {
          exactPerSlide(done, total);
          opts?.onPlateProgress?.(done, total);
        },
      );
      exactPlates.forEach((plate, i) =>
        telemetry.notePlateBytes(i, plate, deck.slides[i].variantId),
      );
      // Slides whose variant is unknown can't be rendered — keep them on the
      // vector path rather than emitting a blank plate.
      exactPlates = exactPlates.map((p, i) =>
        byId(MODULE_VARIANTS, deck.slides[i].variantId) ? p : null,
      );
    } catch (err) {
      console.error("[pptx-export] design-exact pass failed; falling back to vectors", err);
      exactPlates = null;
    } finally {
      endExact();
    }
  }

  // Whatever the fidelity path decided, every slide must now own a background.
  // Record what it ended up with so a flat fill (the one thing that does NOT
  // look like the build) is reported instead of shipped quietly.
  deck.slides.forEach((sl, i) => {
    const s = integrity.track(i, sl.variantId);
    if (s.background) return;
    const plan = backgroundPlans[i];
    if (exactPlates?.[i]) integrity.noteBackground(i, "plate", sl.variantId);
    else if (plan?.kind === "image") integrity.noteBackground(i, "photo", sl.variantId);
    else if (plan?.kind === "solid") integrity.noteBackground(i, "solid", sl.variantId);
    else integrity.noteBackground(i, "gradient", sl.variantId);

  });

  /**
   * Resolved light/dark decision per slide, shared by the slide master choice
   * and the chrome palette below so a slide's inherited master background can
   * never disagree with the ink painted on it.
   */
  const resolveSlideDark = (i: number): boolean => {
    const plan = backgroundPlans[i];
    const kind = classifyVariant(deck.slides[i].variantId, i);
    const advancedDark = deck.slides[i].variantId === "MV-COUNTDOWN";
    const bgIsImage = plan.kind === "image";
    const plateColor =
      plan.kind === "solid"
        ? (plan as { color: string }).color
        : plan.kind === "image"
          ? (plan as { solidFallback: string }).solidFallback
          : null;
    const plateLum = plateColor ? relLuminanceHex(plateColor) : null;
    if (forceMode) return forceMode === "dark";
    const own = (deck.slides[i] as { mode?: "light" | "dark" }).mode;
    if (own === "light" || own === "dark") return own === "dark";
    if (plateLum != null) return plateLum < 0.45;
    return advancedDark || kind === "cover" || kind === "divider" || bgIsImage;
  };

  const failedSlides: string[] = [];


  const endOoxml = telemetry.phase("ooxml");
  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    const slideStart = Date.now();
    // Parent every slide to a brand master so the background is inherited at
    // the master level too, not only painted per slide.
    const s = pptx.addSlide({ masterName: masterFor(resolveSlideDark(i)) });
    // Module-scoped cursor so the shared glyph/logo helpers (which are plain
    // functions far below) can report what they embedded for THIS slide.
    activeIntegrity = integrity;
    activeSlideIndex = i;
    activeVariantId = slide.variantId;


    // Design-exact (explicitly flat) path: the plate contains every layer
    // (background planes, tiles, figures, icons, imagery, logo, footer), so it
    // is placed edge-to-edge and nothing else is drawn on top. Slide text is
    // carried in the speaker notes so the deck stays searchable and reusable.
    const exactPlate = exactPlates?.[i] ?? null;
    if (exactPlate) {
      const fallback =
        backgroundPlans[i].kind === "solid"
          ? (backgroundPlans[i] as { color: string }).color
          : backgroundPlans[i].kind === "image"
            ? (backgroundPlans[i] as { solidFallback: string }).solidFallback
            : forceMode === "light"
              ? "FFFFFF"
              : palette.primary;
      s.background = { color: fallback };
      s.addImage({ data: exactPlate, x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, objectName: "TP Design plate" });
      const notes = slideTextDigest(slide);
      if (notes) s.addNotes(notes);
      continue;
    }

    // Layered-editable path: the plate holds every designed pixel except the
    // glyphs (so backgrounds, plates, tiles, photographs and icons are exactly
    // the build), and the measured runs land as native, editable text boxes at
    // the build's own geometry, size, weight, tracking and line height.
    const layered = layeredText[i];
    if (layered?.plate) {
      const fallback =
        backgroundPlans[i].kind === "solid"
          ? (backgroundPlans[i] as { color: string }).color
          : backgroundPlans[i].kind === "image"
            ? (backgroundPlans[i] as { solidFallback: string }).solidFallback
            : resolveSlideDark(i)
              ? palette.primary
              : "FFFFFF";
      s.background = { color: fallback };
      s.addImage({
        data: layered.plate,
        x: 0,
        y: 0,
        w: SLIDE_W,
        h: SLIDE_H,
        objectName: "TP Design plate",
      });
      const { placeTextRuns } = await import("./export-text-place");
      placeTextRuns(s as unknown as { addText: (t: string, o: Record<string, unknown>) => unknown }, layered.runs);
      const notes = slideTextDigest(slide);
      if (notes) s.addNotes(notes);
      telemetry.noteAssembly(i, Date.now() - slideStart, slide.variantId);
      continue;
    }




    try {

      const kind = classifyVariant(slide.variantId, i);
      const advancedDark = slide.variantId === "MV-COUNTDOWN";
      const plan = backgroundPlans[i];
      const bgIsImage = plan.kind === "image";
      // Slide chrome dark/light selection: honor an explicit background choice
      // (color solid, image tint) so text/logos flip to legible palettes.
      // The RESOLVED backdrop wins over the old "covers and dividers are always
      // dark" assumption: a light solid or light-tinted plate is a light slide,
      // and treating it as dark is what made white cover copy disappear.
      const plateColor =
        plan.kind === "solid"
          ? (plan as { color: string }).color
          : plan.kind === "image"
            ? (plan as { solidFallback: string }).solidFallback
            : null;
      const isDark = resolveSlideDark(i);
      // Per-slide accent override (`content.accentOverride`) — resolved with
      // the shared helper so PPTX matches the on-screen renderer exactly.
      const slideAccent = resolveSlideAccent(slide, brand).replace("#", "");
      const slidePalette = adaptPaletteForMode({ ...palette, accent: slideAccent }, isDark);
      const useWhiteLogo = isDark || slide.variantId === "MV-SPLIT-MANIFESTO";
      const hideFooter = useWhiteLogo;

      // 1. Native PPTX background fill — always set so exported slides never
      //    default to opaque white when the editor showed a dark scene.
      if (plan.kind === "solid") {
        s.background = { color: plan.color };
      } else if (plan.kind === "image") {
        s.background = { color: plan.solidFallback };
      } else {
        s.background = { color: isDark ? palette.primary : "FFFFFF" };
      }

      // 2. Full-bleed rasterized background image — covers gradients, patterns,
      //    library presets, and user-picked photographs alike. Positioning
      //    mirrors CSS object-fit / zoom / offset from SlideChrome.
      if (plan.kind === "image") {
        const sz = imageBackgroundSizing(plan, SLIDE_W, SLIDE_H);
        // Fit by measured intrinsic ratio rather than pptxgenjs `sizing`,
        // which cannot read data-URL dimensions and therefore stretches art.
        const frame =
          sz.fit === "contain"
            ? containFrame(plan.data, sz.x, sz.y, sz.w, sz.h)
            : coverFrame(plan.data, sz.x, sz.y, sz.w, sz.h);
        // Name the full-bleed ground "TP Background" so a reviewer clicking it
        // in PowerPoint can tell the separate background object apart from an
        // inset photograph. It is emitted first, so it sits behind every card,
        // icon, logo and text run rather than being composited with them.
        const isGround =
          frame.x <= 0.02 &&
          frame.y <= 0.02 &&
          frame.w >= SLIDE_W - 0.04 &&
          frame.h >= SLIDE_H - 0.04;
        s.addImage({
          data: plan.data,
          ...frame,
          objectName:
            layeredPlates[i] === plan.data
              ? "TP Design plate"
              : isGround
                ? "TP Background"
                : "TP Photo",
        });

        for (const rect of scrimRectSpec(plan, SLIDE_W, SLIDE_H)) {
          s.addShape("rect", {
            x: rect.x,
            y: rect.y,
            w: rect.w,
            h: rect.h,
            fill: { color: rect.color, transparency: rect.transparency },
            line: { color: rect.color, transparency: 100 },
          });
        }
      }

      // 3. Slide-imagery underlay — a full-bleed photograph with a palette
      //    scrim. Fires for every variant whose editor renderer surfaces a
      //    photograph (see `variantSupportsImagery`), so custom `mediaUrl`
      //    uploads from SlideImageryPanel survive PPTX export the same way
      //    covers and dividers already do. Skipped when the slide already
      //    carries an explicit image-typed Backgrounds & Imagery selection.
      const imgData = slideImages[i];
      if (!bgIsImage && imgData && variantSupportsImagery(slide.variantId)) {
        s.addImage({ data: imgData, ...coverFrame(imgData, 0, 0, SLIDE_W, SLIDE_H), objectName: "TP Photo" });
        // Cover/divider get the strong brand wash they historically had;
        // other image variants use a lighter scrim so the picture reads
        // through while remaining legible under the renderer's text.
        const scrimTransparency = kind === "cover" || kind === "divider" ? 35 : 55;
        s.addShape("rect", {
          x: 0,
          y: 0,
          w: SLIDE_W,
          h: SLIDE_H,
          fill: { color: palette.primary, transparency: scrimTransparency },
          line: { color: palette.primary, transparency: 100 },
        });
      }

      // Light slides: remap hardcoded white copy to brand ink so no text can
      // vanish against a light decor plate or light-mode surface. Skipped when a
      // full-bleed photograph is carrying the slide, where white reads best.
      // Only a genuinely DARK plate keeps white copy: a light aurora backdrop or
      // a light decor plate is still a light slide, and that is exactly where
      // hardcoded white text used to disappear.
      const overDarkPhoto = Boolean(
        imgData && variantSupportsImagery(slide.variantId) && !bgIsImage,
      );
      if (!isDark && !overDarkPhoto) installLightInkGuard(s, slidePalette.ink);

      // Content renderers draw through the design-surface facade: square cards
      // become rounded surfaces with the app's own radius tokens, and photos
      // get a native rounded crop. Backgrounds/scrims above stay on raw `s`.
      const sd = withDesignSurfaces(s, { dark: isDark });
      try {
        if (
          !renderAdvancedVariant(sd, slide, slidePalette, slideItemLogos[i], slideVizSvg[slide.id])
        ) {
          switch (kind) {
            case "cover":
              renderCover(sd, slide, slidePalette);
              break;
            case "divider":
              renderDivider(sd, slide, slidePalette);
              break;
            case "agenda":
              renderAgenda(sd, slide, slidePalette);
              break;
            case "stats":
              renderStats(sd, slide, slidePalette);
              break;
            case "quote":
              renderQuote(sd, slide, slidePalette);
              break;
            case "callout":
              renderCallout(sd, slide, slidePalette);
              break;
            case "cards":
              renderCards(sd, slide, slidePalette);
              break;
            case "timeline":
              renderTimeline(sd, slide, slidePalette);
              break;
            case "compare":
              renderCompare(sd, slide, slidePalette);
              break;
            default:
              renderContent(sd, slide, slidePalette);
          }
        }
      } catch {
        // Any per-slide renderer bug falls back to the generic mapping.
        renderContent(sd, slide, slidePalette);
      }

      // Per-slide logo placement — mirrors SlideChrome's contract:
      //  · position honors per-slide override → layout default → chrome default
      //  · orientation honors per-slide override → deck default; per-slide
      //    orientation may extend to vertical-left / vertical-right (rotated
      //    lockup along the corresponding edge) and mark-only (monogram tile).
      //  · top/bottom-center + left-side positions render at half size
      //  · logo is added AFTER content so it renders as the top-most layer
      const chrome: ChromeVariant =
        kind === "cover"
          ? "cover"
          : kind === "divider"
            ? "divider"
            : slide.variantId?.startsWith("MV-CLOSE-")
              ? "close"
              : "content";
      const perSlidePos =
        slide.logoPosition && slide.logoPosition !== "auto"
          ? (slide.logoPosition as LogoPosition)
          : undefined;
      const variantPos = slide.variantId
        ? LOGO_POSITION_BY_VARIANT[slide.variantId.toUpperCase()]
        : undefined;
      const placement = resolveLogoPlacement(
        chrome,
        slide.layoutId,
        perSlidePos ?? variantPos,
      );

      const perSlideOrient =
        slide.logoOrientation && slide.logoOrientation !== "auto"
          ? slide.logoOrientation
          : deckLogoOrientation;
      // Legacy vertical-* values fall back to horizontal — the lockup is
      // never rotated in export either.
      const orient: "horizontal" | "stacked" | "mark-only" =
        perSlideOrient === "stacked"
          ? "stacked"
          : perSlideOrient === "mark-only"
            ? "mark-only"
            : "horizontal";

      const isMarkOnly = orient === "mark-only";
      const sourceOrient: "horizontal" | "stacked" =
        orient === "stacked" ? "stacked" : "horizontal";
      // Cross-fallback across orientation AND colourway: a brand lockup must
      // never be missing from an exported slide just because one variant of the
      // mark failed to fetch.
      const logoData =
        (sourceOrient === "stacked"
          ? useWhiteLogo
            ? (logoStackedWhite ?? logoWhite)
            : (logoStackedColor ?? logoColor)
          : useWhiteLogo
            ? logoWhite
            : logoColor) ??
        (useWhiteLogo
          ? (logoWhite ?? logoStackedWhite ?? logoColor ?? logoStackedColor)
          : (logoColor ?? logoStackedColor ?? logoWhite ?? logoStackedWhite));
      noteExportLogo(Boolean(logoData));


      if (placement.position !== "hidden") {
        const isHalf =
          placement.position === "top-center" ||
          placement.position === "bottom-center" ||
          placement.position === "top-left" ||
          placement.position === "bottom-left";
        const base: "sm" | "md" | "xl" =
          chrome === "content" ? "sm" : chrome === "cover" ? "xl" : "md";
        const wTable: Record<string, number> = { sm: 1.4, md: 1.9, xl: 2.8 };
        const shrunk: Record<string, string> = { xl: "sm", md: "sm", sm: "sm" };
        const sizeKey = isHalf ? shrunk[base] : base;
        const inset = 0.45;

        if (isMarkOnly) {
          // Render a rounded-square monogram tile so mark-only works for any
          // brand, since ship-in artwork always bundles the wordmark.
          const tile = isHalf ? 0.42 : 0.6;
          const pos = (() => {
            switch (placement.position) {
              case "top-left":
                return { x: inset, y: inset };
              case "top-right":
                return { x: SLIDE_W - inset - tile, y: inset };
              case "top-center":
                return { x: (SLIDE_W - tile) / 2, y: inset };
              case "bottom-left":
                return { x: inset, y: SLIDE_H - inset - tile };
              case "bottom-right":
                return { x: SLIDE_W - inset - tile, y: SLIDE_H - inset - tile };
              case "bottom-center":
                return { x: (SLIDE_W - tile) / 2, y: SLIDE_H - inset - tile };
              default:
                return { x: inset, y: inset };
            }
          })();
          const strokeColor = useWhiteLogo ? "FFFFFF" : palette.primary;
          s.addShape("roundRect", {
            x: pos.x,
            y: pos.y,
            w: tile,
            h: tile,
            fill: { color: "FFFFFF", transparency: 100 },
            line: { color: strokeColor, width: 1.75 },
            rectRadius: EXPORT_RADIUS_IN.chip,
          });
          const markChar = brand.logo?.mark ?? brand.name.slice(0, 1).toUpperCase();
          s.addText(markChar, {
            x: pos.x,
            y: pos.y,
            w: tile,
            h: tile,
            align: "center",
            valign: "middle",
            fontSize: Math.round(tile * 30),
            bold: true,
            color: strokeColor,
            fontFace: "Geist",
          });
        } else if (logoData) {
          const w = wTable[sizeKey] ?? 1.4;
          const h = sourceOrient === "stacked" ? w / 1.4 : w / 3.4;
          const pos = (() => {
            switch (placement.position) {
              case "top-left":
                return { x: inset, y: inset };
              case "top-right":
                return { x: SLIDE_W - inset - w, y: inset };
              case "top-center":
                return { x: (SLIDE_W - w) / 2, y: inset };
              case "bottom-left":
                return { x: inset, y: SLIDE_H - inset - h };
              case "bottom-right":
                return { x: SLIDE_W - inset - w, y: SLIDE_H - inset - h };
              case "bottom-center":
                return { x: (SLIDE_W - w) / 2, y: SLIDE_H - inset - h };
              default:
                return { x: inset, y: inset };
            }
          })();
          s.addImage({
            data: logoData,
            ...containFrame(logoData, pos.x, pos.y, w, h),
            objectName: "TP Logo",
          });
        }
      }

      if (!hideFooter) {
        s.addText("TransPerfect", {
          x: 0.5,
          y: 7.05,
          w: 4,
          h: 0.3,
          fontSize: 9,
          color: "666666",
          fontFace: "Geist",
        });
        s.addText(String(i + 1).padStart(2, "0"), {
          x: SLIDE_W - 1.0,
          y: 7.05,
          w: 0.5,
          h: 0.3,
          fontSize: 9,
          color: "666666",
          align: "right",
          fontFace: "Geist",
        });
      }

      const km = slide.sectionId ? keyMessageBySection.get(slide.sectionId) : undefined;
      let noteText = slide.notes && slide.notes.trim() ? slide.notes.trim() : (km ?? "");
      // Video fallback path: PPTX embeds the poster (see resolveSlideImageUrl)
      // and links the source video in speaker notes so the presenter can open
      // it out-of-band. pptxgenjs's addMedia has spotty PowerPoint fidelity for
      // large/hosted files, so we ship reliable poster + link instead.
      const videoUrl = (slide.content as Record<string, unknown>).videoUrl;
      if (typeof videoUrl === "string" && videoUrl.trim()) {
        const line = `▶ Video: ${videoUrl.trim()}`;
        noteText = noteText ? `${noteText}\n\n${line}` : line;
      }
      if (noteText) s.addNotes(noteText);
    } catch (err) {
      // Per-slide resilience: one bad variant renderer must not fail the
      // whole export. Log server-side, record the slide id, and drop a
      // minimal fallback so the slide count still matches the deck.
      const slideId = slide.id ?? `slide-${i + 1}`;
      failedSlides.push(slideId);
      console.error(`[pptx-export] slide ${slideId} (${slide.variantId}) failed to render:`, err);
      try {
        s.background = { color: "FFFFFF" };
        s.addText(
          [
            { text: `Slide ${i + 1}`, options: { bold: true, fontSize: 24, color: "0B0B12" } },
            {
              text: "\nThis slide could not be rendered in the PPTX export.",
              options: { fontSize: 14, color: "666666", breakLine: true },
            },
          ],
          { x: 0.75, y: 0.75, w: SLIDE_W - 1.5, h: SLIDE_H - 1.5, valign: "middle", align: "left" },
        );
      } catch {
        /* fallback rendering itself failed — nothing more we can do */
      }
    }
    telemetry.noteAssembly(i, Date.now() - slideStart, slide.variantId);
  }
  endOoxml();

  const fileName = `${sanitize(deck.title)}.pptx`;
  // Always embed Geist so PowerPoint renders the exact app typography instead
  // of substituting Calibri/Arial. Falls back to the raw blob if embedding
  // fails so exports are never blocked.
  const endFonts = telemetry.phase("fonts");
  const rawBlob = (await pptx.write({ outputType: "blob" })) as unknown as Blob;
  const fontBlob = await embedFontsInPptx(rawBlob);
  // pptxgenjs cannot emit slide transitions or per-object alt text, so both are
  // patched into the finished bytes: the deck's configured transitions play in
  // PowerPoint's slide show, and every object carries alt text for the
  // Accessibility Checker / screen readers.
  // Vector preference: with it OFF, inline icon glyphs flatten to PNG in the
  // same pass, matching what logos and backdrops already do in fetchAsDataUrl.
  let preferVector = true;
  try {
    preferVector = (await import("./pptx-vector-pref")).getPreferVector();
  } catch {
    /* preference unreadable (SSR) — keep vectors */
  }
  const finalBlob = await applyNativePptxFeatures(fontBlob, {
    transitions: deck.slides.map((sl) => resolveSlideTransition(sl, deck.context)),
    // PowerPoint "Hide Slide" parity — hidden slides export but are skipped in
    // the slide show, exactly like the on-screen presenter.
    hidden: deck.slides.map((sl) => sl.hidden === true),
    // Slide Master background: follow whatever the deck predominantly is, so a
    // dark deck's master is brand navy and a light deck's master is white.
    masterBackground: (() => {
      const darkCount = deck.slides.reduce((n, _sl, i) => n + (resolveSlideDark(i) ? 1 : 0), 0);
      return darkCount * 2 >= deck.slides.length ? palette.primary : "FFFFFF";
    })(),
    altText: true,
    flattenVectors: !preferVector,
    quality: opts?.quality ?? null,
  });
  endFonts();
  activeIntegrity = null;
  const warnings = integrity.warnings();
  const integritySummary = integrity.summary();
  const perf = telemetry.report();
  opts?.onTelemetry?.(perf);
  console.info("[pptx-export] performance", {
    totalMs: perf.totalMs,
    slides: perf.slideCount,
    slowest: perf.totals.slowestSlideMs,
    phases: perf.phases.map((ph) => `${ph.label} ${ph.ms}ms`),
  });
  if (warnings.length) {
    console.warn("[pptx-export] export integrity warnings", warnings);
  } else {
    console.info("[pptx-export] export integrity clean", integritySummary);
  }
  // Debug object tree: derived from the bytes we just wrote, so the report can
  // never disagree with the delivered file.
  let debugManifest: DebugManifest | undefined;
  let deliverBlob = finalBlob;
  let deliverName = fileName;
  if (opts?.debugObjectTree) {
    try {
      const { buildDebugManifest, annotateDebugPptx, downloadManifest } = await import(
        "./export-debug"
      );
      const built = await buildDebugManifest(finalBlob, {
        deckTitle: deck.title,
        fidelity,
        quality: String(opts?.quality ?? "standard"),
        slides: deck.slides.map((sl) => ({ id: sl.id, variantId: sl.variantId })),
      });
      debugManifest = built.manifest;
      deliverBlob = await annotateDebugPptx(built.zip, built.manifest);
      deliverName = `${sanitize(deck.title)}.debug.pptx`;
      if (opts?.output !== "blob") {
        downloadManifest(built.manifest, `${sanitize(deck.title)}.layers.json`);
      }
      console.info("[pptx-export] debug object tree", built.manifest.totals);
    } catch (err) {
      console.error("[pptx-export] debug object tree failed", err);
    }
  }

  if (opts?.output === "blob") {
    return {
      blob: deliverBlob,
      failedSlides,
      fileName: deliverName,
      warnings,
      integrity: integritySummary,
      telemetry: perf,
      debugManifest,
    };
  }
  if (typeof document !== "undefined") {
    const url = URL.createObjectURL(deliverBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = deliverName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return {
    failedSlides,
    fileName: deliverName,
    warnings,
    integrity: integritySummary,
    telemetry: perf,
    debugManifest,
  };
}

type SlideKind =
  | "cover"
  | "divider"
  | "agenda"
  | "stats"
  | "quote"
  | "callout"
  | "cards"
  | "timeline"
  | "compare"
  | "content";

function classifyVariant(id: string, index: number): SlideKind {
  const v = id || "";
  if (index === 0 && !v) return "cover";
  if (v.startsWith("MV-OP-COVER")) return "cover";
  if (v.startsWith("MV-OP-DIVIDER") || v === "MV-CLOSE-THANKS" || v === "MV-CLOSE-STATEMENT")
    return "divider";
  if (v.startsWith("MV-OP-AGENDA")) return "agenda";
  if (
    v.startsWith("MV-PROOF-STATS") ||
    v.startsWith("MV-STAT-") ||
    v === "MV-CTX-STAT-GRID" ||
    v === "MV-INS-OPPORTUNITY-SIZE" ||
    v === "MV-CASE-METRICS" ||
    v === "MV-IMG-STAT-CALLOUT"
  )
    return "stats";
  if (v.startsWith("MV-QUOTE") || v === "MV-INS-QUOTE" || v === "MV-PROOF-TESTIMONIAL")
    return "quote";
  if (
    v === "MV-INS-CALLOUT" ||
    v === "MV-INS-BIG-IDEA" ||
    v === "MV-INS-SO-WHAT" ||
    v === "MV-CLOSE-CTA" ||
    v === "MV-CLOSE-DUAL-CTA" ||
    v === "MV-CLOSE-CONTACT" ||
    v === "MV-CLOSE-DECISION" ||
    v === "MV-CLOSE-METRIC-PROMISE"
  )
    return "callout";
  if (
    v.startsWith("MV-SOL-PILLARS") ||
    v.startsWith("MV-CTX-CARDS") ||
    v === "MV-SOL-FEATURE-LIST" ||
    v === "MV-CTX-CHALLENGE-STACK" ||
    v.startsWith("MV-TEAM-BIOS") ||
    v === "MV-CLOSE-CHECKLIST" ||
    v === "MV-DEC-CHECKLIST" ||
    v === "MV-REC-NEXT"
  )
    return "cards";
  if (
    v === "MV-PROC-TIMELINE" ||
    v === "MV-PROC-PHASES" ||
    v === "MV-PROC-STEP-CHAIN" ||
    v === "MV-PROC-STEP-SPOTLIGHT" ||
    v === "MV-PROC-STAGE-ORBITS" ||
    v === "MV-CLOSE-TIMELINE"
  )
    return "timeline";
  if (
    v === "MV-PROC-BEFORE-AFTER" ||
    v === "MV-PROC-BEFORE-AFTER-SPLIT" ||
    v === "MV-DEC-COMPARE-TABLE" ||
    v === "MV-DEC-MATRIX" ||
    v === "MV-CLIENT-COMPARE" ||
    v === "MV-CLOSE-SPLIT"
  )
    return "compare";
  return "content";
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return typeof v === "string" ? v : String(v);
}
function arr(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [];
}

// ────────────────────────── Renderers ──────────────────────────

function renderCover(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const title = str(c.title);
  const subtitle = str(c.subtitle || c.kicker);
  const date = str(c.date);
  s.addShape("rect", {
    x: 0.6,
    y: 3.2,
    w: 0.15,
    h: 1.6,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(title || "Untitled", {
    x: 1.0,
    y: 2.8,
    w: SLIDE_W - 2,
    h: 2.4,
    fontSize: 54,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "middle",
  });
  if (subtitle) {
    s.addText(subtitle, {
      x: 1.0,
      y: 5.0,
      w: SLIDE_W - 2,
      h: 0.8,
      fontSize: 22,
      color: "FFFFFF",
      fontFace: "Geist",
    });
  }
  if (date)
    s.addText(date, {
      x: 1.0,
      y: 6.6,
      w: 4,
      h: 0.4,
      fontSize: 12,
      color: "FFFFFF",
      fontFace: "Geist",
    });
}

function renderDivider(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const title = str(c.title || c.headline);
  const eyebrow = str(c.kicker || c.eyebrow || c.number);
  if (eyebrow) {
    s.addText(eyebrow.toUpperCase(), {
      x: 0.8,
      y: 3.0,
      w: SLIDE_W - 1.6,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 6,
    });
  }
  s.addText(title || "Section", {
    x: 0.8,
    y: 3.5,
    w: SLIDE_W - 1.6,
    h: 1.8,
    fontSize: 48,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "middle",
  });
}

function renderAgenda(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  renderTitleZone(s, c, p);
  const items = arr(c.items);
  if (!items.length) return renderContent(s, slide, p);
  const startY = 2.0;
  const rowH = Math.min(0.9, (5.4 - startY) / Math.max(items.length, 1));
  items.forEach((it, k) => {
    const y = startY + k * rowH;
    s.addText(String(k + 1).padStart(2, "0"), {
      x: 0.6,
      y,
      w: 1.0,
      h: rowH,
      fontSize: 22,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      valign: "middle",
    });
    s.addText(str(it.label || it.title || it.name), {
      x: 1.5,
      y,
      w: SLIDE_W - 2.5,
      h: rowH,
      fontSize: 20,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      valign: "middle",
    });
  });
}

function renderStats(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  renderTitleZone(s, c, p);
  // `stat` is either a scalar (older variants) or a { value, unit, label }
  // object (MV-STAT-* typographic family). Unwrap both shapes, and treat the
  // object stat as the lead figure ahead of any supporting items.
  const statObj =
    c.stat != null && typeof c.stat === "object" ? (c.stat as Record<string, unknown>) : null;
  const leadStat: Record<string, unknown>[] = statObj
    ? [{ value: statObj.value, unit: statObj.unit, label: statObj.label }]
    : c.stat != null
      ? [{ value: c.stat, unit: c.unit, label: c.label || c.narrative }]
      : [];
  const actualTarget = ["actual", "target", "delta"]
    .map((k) => (c[k] && typeof c[k] === "object" ? (c[k] as Record<string, unknown>) : null))
    .filter(Boolean)
    .map((o) => ({ value: o!.value, unit: o!.unit, label: o!.label }) as Record<string, unknown>);
  const items: Record<string, unknown>[] = actualTarget.length
    ? actualTarget
    : leadStat.length
      ? [...leadStat, ...arr(c.items)]
      : arr(c.items);
  if (!items.length) return renderContent(s, slide, p);
  const cols = Math.min(items.length, 4);
  const colW = (SLIDE_W - 1.2 - (cols - 1) * 0.3) / cols;
  const y = 2.3;
  items.slice(0, cols).forEach((it, k) => {
    const x = 0.6 + k * (colW + 0.3);
    s.addText(`${str(it.value ?? it.stat ?? it.amount)}${str(it.unit ?? "")}`, {
      x,
      y,
      w: colW,
      h: 2.0,
      fontSize: 56,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
    s.addText(str(it.label ?? it.narrative ?? ""), {
      x,
      y: y + 2.1,
      w: colW,
      h: 1.8,
      fontSize: 14,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

function renderQuote(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const quote = str(c.quote || c.body);
  const attribution = str(c.attribution || c.author);
  const role = str(c.role || c.title);
  s.addText("\u201C", {
    x: 0.8,
    y: 1.2,
    w: 1.5,
    h: 1.5,
    fontSize: 120,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
  });
  s.addText(quote || "", {
    x: 1.5,
    y: 2.2,
    w: SLIDE_W - 3.0,
    h: 3.4,
    fontSize: 28,
    italic: true,
    color: p.primary,
    fontFace: "Geist",
    valign: "middle",
  });
  if (attribution) {
    s.addText(`${attribution}${role ? ` \u00b7 ${role}` : ""}`, {
      x: 1.5,
      y: 5.7,
      w: SLIDE_W - 3.0,
      h: 0.5,
      fontSize: 14,
      color: p.ink,
      fontFace: "Geist",
      charSpacing: 2,
    });
  }
}

function renderCallout(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const kicker = str(c.kicker);
  const headline = str(c.title || c.headline || c.insight || c.idea);
  const body = str(c.narrative || c.body || c.soWhat);
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.8,
      y: 2.2,
      w: SLIDE_W - 1.6,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 4,
    });
  }
  s.addText(headline || "", {
    x: 0.8,
    y: 2.7,
    w: SLIDE_W - 1.6,
    h: 2.4,
    fontSize: 44,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    valign: "middle",
  });
  if (body) {
    s.addText(body, {
      x: 0.8,
      y: 5.3,
      w: SLIDE_W - 1.6,
      h: 1.4,
      fontSize: 16,
      color: p.ink,
      fontFace: "Geist",
    });
  }
}

// ─── Native grouping ────────────────────────────────────────────────────────
// pptxgenjs cannot emit <p:grpSp>, so composite "cards" (plate + accent rule +
// title + body + chart) would land in PowerPoint as loose shapes that cannot be
// moved or resized as one unit — and come back the same way on re-import. The
// fix is a naming convention: every object drawn through a group scope gets its
// objectName prefixed with `[g:<id>|<label>]`, and the post-processor in
// pptx-group-xml.ts wraps each tagged run of siblings in a real group whose
// bounding box is the union of its children.
const GROUP_ARG_INDEX: Record<string, number> = {
  addText: 1,
  addShape: 1,
  addImage: 0,
  addTable: 1,
  addChart: 2,
  addMedia: 0,
};

/**
 * A slide facade that tags everything drawn through it as one group. Draw the
 * whole card through the returned object; anything drawn on the raw slide stays
 * ungrouped.
 */
function groupScope(s: PptxGenJS.Slide, id: string, label: string): PptxGenJS.Slide {
  const tag = groupTag(id, label);
  return new Proxy(s, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      const key = String(prop);
      if (typeof value !== "function" || !(key in GROUP_ARG_INDEX)) return value;
      const index = GROUP_ARG_INDEX[key]!;
      return (...args: unknown[]) => {
        const opts = args[index];
        if (opts && typeof opts === "object") {
          const o = opts as { objectName?: string };
          const base =
            typeof o.objectName === "string" && o.objectName.trim()
              ? stripGroupTag(o.objectName)
              : label;
          o.objectName = `${tag} ${base}`;
        }
        return (value as (...a: unknown[]) => unknown).apply(target, args);
      };
    },
  }) as PptxGenJS.Slide;
}

function renderCards(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const titleY = renderTitleZone(s, c, p);
  const items = arr(c.items);
  if (!items.length) return renderContent(s, slide, p);
  const n = Math.min(items.length, 6);
  const cols = n <= 2 ? n : n <= 4 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const colW = (SLIDE_W - 1.2 - (cols - 1) * 0.3) / cols;
  const availH = 5.9 - titleY - (rows - 1) * 0.3;
  const rowH = Math.max(1.2, availH / rows);
  items.slice(0, n).forEach((it, k) => {
    const g = groupScope(s, `card-${k}`, `Card ${k + 1}`);
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * (colW + 0.3);
    const y = titleY + r * (rowH + 0.3);
    g.addShape("rect", {
      x,
      y,
      w: colW,
      h: rowH,
      fill: { color: p.surface },
      line: { color: "E5E1DA" },
    });
    g.addShape("rect", {
      x,
      y,
      w: 0.08,
      h: rowH,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    addIconBadge(g, str(it.title || it.label || it.name), {
      x: x + 0.3,
      y: y + 0.22,
      size: 0.28,
      accent: p.accent,
      index: k,
      icon: it.icon,
    });
    g.addText(str(it.title || it.label || it.name), {
      x: x + 0.82,
      y: y + 0.2,
      w: colW - 1.02,
      h: 0.6,
      fontSize: 16,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    g.addText(str(it.body || it.description || it.detail), {
      x: x + 0.3,
      y: y + 0.85,
      w: colW - 0.5,
      h: rowH - 1.0,
      fontSize: 12,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

function renderTimeline(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const titleY = renderTitleZone(s, c, p);
  // MV-PROC-STAGE-ORBITS authors its steps as `stages[]`, each with its own
  // task chain. Flatten them onto the timeline so every stage label and task
  // still exports as native, editable text.
  const items = arr(c.items).length
    ? arr(c.items)
    : arr(c.stages).map((st) => ({
        label: st.label ?? st.title,
        body: arr(st.items)
          .map((t) => str(t.label ?? t.title))
          .filter(Boolean)
          .join("\n"),
      }));
  if (!items.length) return renderContent(s, slide, p);
  const n = Math.min(items.length, 6);
  const trackY = titleY + 1.0;
  const dot = 0.7;
  const marginX = 0.8;
  const usableW = SLIDE_W - marginX * 2;
  const step = n > 1 ? usableW / (n - 1) : 0;

  // Connecting line
  s.addShape("rect", {
    x: marginX + dot / 2,
    y: trackY + dot / 2 - 0.02,
    w: usableW - dot,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });

  items.slice(0, n).forEach((it, k) => {
    const cx = marginX + step * k;
    s.addShape("ellipse", {
      x: cx,
      y: trackY,
      w: dot,
      h: dot,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText(String(k + 1), {
      x: cx,
      y: trackY,
      w: dot,
      h: dot,
      fontSize: 20,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    const boxX = cx + dot / 2 - 1.3;
    s.addText(str(it.label || it.title || it.name), {
      x: boxX,
      y: trackY + dot + 0.15,
      w: 2.6,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.body || it.description || it.detail), {
      x: boxX,
      y: trackY + dot + 0.7,
      w: 2.6,
      h: 2.0,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      align: "center",
      valign: "top",
    });
  });
}

function renderCompare(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const c = slide.content as Record<string, unknown>;
  const titleY = renderTitleZone(s, c, p);
  const items = arr(c.items).length
    ? arr(c.items)
    : [c.left, c.right].filter(Boolean).map((v) => v as Record<string, unknown>);
  const cols = items.length >= 2 ? 2 : 1;
  if (!items.length) return renderContent(s, slide, p);
  const gap = 0.4;
  const colW = (SLIDE_W - 1.2 - gap) / cols;
  const y = titleY + 0.2;
  const h = 5.8 - y;

  // Divider
  if (cols === 2) {
    s.addShape("rect", {
      x: SLIDE_W / 2 - 0.01,
      y: y + 0.3,
      w: 0.02,
      h: h - 0.6,
      fill: { color: "E5E1DA" },
      line: { color: "E5E1DA" },
    });
  }

  items.slice(0, cols).forEach((it, k) => {
    const x = 0.6 + k * (colW + gap);
    const label = str(it.label || it.title || it.name || (k === 0 ? "Today" : "Tomorrow"));
    s.addText(label.toUpperCase(), {
      x,
      y,
      w: colW,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addText(str(it.headline || it.title2 || ""), {
      x,
      y: y + 0.5,
      w: colW,
      h: 1.0,
      fontSize: 22,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    const bullets = arr(it.items);
    if (bullets.length) {
      s.addText(
        bullets.map((b) => ({
          text: str(b.label || b.body || b.name),
          options: { bullet: { code: "25CF" }, fontFace: "Geist", fontSize: 13, color: p.ink },
        })),
        { x, y: y + 1.6, w: colW, h: h - 1.8, fontSize: 13, color: p.ink, paraSpaceAfter: 6 },
      );
    } else {
      s.addText(str(it.body || it.description || ""), {
        x,
        y: y + 1.6,
        w: colW,
        h: h - 1.8,
        fontSize: 14,
        color: p.ink,
        fontFace: "Geist",
        valign: "top",
      });
    }
  });
}

// Returns the y offset below the title zone for content to start.
function renderTitleZone(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette): number {
  // `subtitle` is the manifest field name on several modules (stage orbits,
  // step spotlight); without the fallback that copy never reached the file.
  const kicker = str(c.kicker || c.subtitle);
  const title = str(c.title || c.headline || c.insight || c.idea);
  let y = 0.55;
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.6,
      y,
      w: SLIDE_W - 1.2,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 3,
    });
    y += 0.35;
  }
  if (title) {
    s.addText(title, {
      x: 0.6,
      y,
      w: SLIDE_W - 1.2,
      h: 1.0,
      fontSize: 30,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    y += 1.1;
  }
  return Math.max(y, 1.6);
}

// Legacy generic fallback (used when classifier returns "content" or a
// renderer throws).
function renderContent(s: PptxGenJS.Slide, slide: DeckSlide, p: Palette) {
  const content = slide.content as Record<string, unknown>;
  const cursorY = renderTitleZone(s, content, p);
  const items = Array.isArray(content.items)
    ? (content.items as Array<Record<string, unknown>>)
    : null;
  const stat = content.stat ?? content.amount;
  const quote = content.quote;

  if (typeof stat === "string" || typeof stat === "number") {
    const unit = str(content.unit);
    const label = str(content.label || content.narrative);
    s.addText(`${stat}${unit}`, {
      x: 0.6,
      y: cursorY + 0.3,
      w: SLIDE_W - 1.2,
      h: 3.0,
      fontSize: 140,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    if (label)
      s.addText(label, {
        x: 0.6,
        y: cursorY + 3.6,
        w: SLIDE_W - 1.2,
        h: 1.5,
        fontSize: 18,
        color: p.ink,
        fontFace: "Geist",
      });
    return;
  }

  if (typeof quote === "string") return renderQuote(s, slide, p);

  if (items && items.length > 0) {
    const bullets = items.map((it) => ({
      text: `${str(it.label ?? it.name ?? it.title)}${it.body ? ` \u2014 ${str(it.body)}` : ""}`,
      options: { bullet: { code: "25CF" }, fontFace: "Geist", fontSize: 14, color: p.ink },
    }));
    s.addText(bullets, {
      x: 0.6,
      y: cursorY + 0.3,
      w: SLIDE_W - 1.2,
      h: 5.5 - cursorY,
      fontSize: 14,
      color: p.ink,
      fontFace: "Geist",
      paraSpaceAfter: 8,
    });
    return;
  }

  const narrative = str(content.narrative || content.body || content.soWhat);
  if (narrative) {
    s.addText(narrative, {
      x: 0.6,
      y: cursorY + 0.3,
      w: SLIDE_W - 1.2,
      h: 4.5,
      fontSize: 18,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
    return;
  }

  // Last-resort prose fallback. Some variants carry their copy under bespoke
  // keys (e.g. MV-REC-NEXT: recommendation + rationale) with no items, stat,
  // quote or narrative — those slides used to export completely blank. Emit
  // every remaining string field as a paragraph so no copy is ever lost.
  const skip = new Set(["title", "kicker", "eyebrow", "subtitle", "section", "notes"]);
  const paras = Object.entries(content)
    .filter(([k, v]) => !k.startsWith("__") && !skip.has(k) && typeof v === "string" && v.trim())
    .map(([, v]) => (v as string).trim());
  if (paras.length) {
    s.addText(
      paras.map((t, i) => ({
        text: t,
        options: {
          fontFace: "Geist",
          fontSize: i === 0 ? 22 : 17,
          bold: i === 0,
          color: i === 0 ? p.primary : p.ink,
          breakLine: true,
          paraSpaceAfter: 10,
        },
      })),
      {
        x: 0.6,
        y: cursorY + 0.3,
        w: SLIDE_W - 1.2,
        h: 4.6,
        valign: "top",
        color: p.ink,
        fontFace: "Geist",
      },
    );
  }
}


function sanitize(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60) || "deck";
}

// ────────────────── Advanced variant renderers (Batch 1 + 2) ──────────────────

const LIGHT_GRAY = "E5E1DA";
const MID_GRAY = "9CA3AF";
const DARK_GRAY = "4B5563";

function renderAdvancedVariant(
  s: PptxGenJS.Slide,
  slide: DeckSlide,
  p: Palette,
  itemLogos: Array<string | null> = [],
  vizSvg?: string,
): boolean {
  const c = (slide.content ?? {}) as Record<string, unknown>;
  // MV-VIZ-* spec-driven infographics — embed pre-rendered vector SVG.
  if (typeof slide.variantId === "string" && slide.variantId.startsWith("MV-VIZ-")) {
    renderVizSpec(s, c, p, vizSvg);
    return true;
  }
  switch (slide.variantId) {
    case "MV-BENTO-5":
      renderBento5(s, c, p);
      return true;
    case "MV-BENTO-6":
      renderBento5(s, c, p, 6);
      return true;
    case "MV-BENTO-7":
      renderBento5(s, c, p, 7);
      return true;
    case "MV-BENTO-8":
      renderBento5(s, c, p, 8);
      return true;
    case "MV-BENTO-VALUE-CLOSE":
      renderBentoValueClose(s, c, p);
      return true;

    case "MV-KPI-DASHBOARD":
      renderKpiDashboard(s, c, p);
      return true;
    case "MV-ROADMAP-QUARTERS":
      renderRoadmapQuarters(s, c, p);
      return true;
    case "MV-FUNNEL":
      renderFunnel(s, c, p);
      return true;
    case "MV-FLYWHEEL":
      renderFlywheel(s, c, p);
      return true;
    case "MV-MATURITY-CURVE":
      renderMaturityCurve(s, c, p);
      return true;
    case "MV-JOURNEY-MAP":
      renderJourneyMap(s, c, p);
      return true;
    case "MV-LOGO-WALL":
      renderLogoWall(s, c, p, itemLogos);
      return true;
    case "MV-MATRIX-2X2":
      renderMatrix2x2(s, c, p);
      return true;
    case "MV-ICEBERG":
      renderIceberg(s, c, p);
      return true;
    case "MV-EDITORIAL-SPREAD":
      renderEditorialSpread(s, c, p);
      return true;
    case "MV-SPLIT-MANIFESTO":
      renderSplitManifesto(s, c, p);
      return true;
    case "MV-NUMBERS-TRIPTYCH":
      renderNumbersTriptych(s, c, p);
      return true;
    case "MV-TIMELINE-VERTICAL":
      renderTimelineVertical(s, c, p);
      return true;
    case "MV-COMPARE-VS-LISTS":
      renderCompareVsLists(s, c, p);
      return true;
    case "MV-INFO-HUB-PILL-ORBIT":
      renderHubPillOrbit(s, c, p);
      return true;
    case "MV-PROC-LAYER-STACK":
      renderLayerStack(s, c, p);
      return true;
    case "MV-PROC-PROOF-PAIRS":
      renderProofPairs(s, c, p);
      return true;
    case "MV-PROC-PLATFORM-LOOP":
      renderPlatformLoop(s, c, p);
      return true;
    case "MV-COMPARE-SLIDER":
      renderCompareSlider(s, c, p);
      return true;
    case "MV-PULL-QUOTE-STACK":
      renderPullQuoteStack(s, c, p);
      return true;
    case "MV-DEFINITION":
      renderDefinition(s, c, p);
      return true;
    case "MV-PRINCIPLES":
      renderPrinciples(s, c, p);
      return true;
    case "MV-COUNTDOWN":
      renderCountdown(s, c, p);
      return true;
    case "MV-HORIZON":
      renderHorizon(s, c, p);
      return true;
    case "MV-DASH-SUMMARY":
      renderDashSummary(s, c, p);
      return true;
    case "MV-DASH-DONUT-TRIO":
      renderDashDonutTrio(s, c, p);
      return true;
    case "MV-DASH-SALES-CHART":
      renderDashSalesChart(s, c, p);
      return true;
    case "MV-DASH-GAUGE-ROW":
      renderDashGaugeRow(s, c, p);
      return true;
    case "MV-DASH-PERFORMANCE":
      renderDashPerformance(s, c, p);
      return true;
    case "MV-DASH-REPORT-CARDS":
      renderDashReportCards(s, c, p);
      return true;
    case "MV-DASH-GROWTH-COLUMNS":
      renderDashGrowthColumns(s, c, p);
      return true;
    case "MV-DASH-BREAKDOWN":
      renderDashBreakdown(s, c, p);
      return true;
    case "MV-DASH-REGION-STATS":
      renderDashRegionStats(s, c, p);
      return true;
    case "MV-GRAPH-YEAR-SERIES":
      renderGraphYearSeries(s, c, p);
      return true;
    case "MV-GRAPH-AXIS-BARS":
      renderGraphAxisBars(s, c, p);
      return true;
    case "MV-GRAPH-CATEGORY-BARS":
      renderGraphCategoryBars(s, c, p);
      return true;
    case "MV-GRAPH-DUAL-DONUT":
      renderGraphDualDonut(s, c, p);
      return true;
    case "MV-GRAPH-RINGS":
      renderGraphRings(s, c, p);
      return true;
    case "MV-GRAPH-TASK-CARDS":
      renderGraphTaskCards(s, c, p);
      return true;
    case "MV-GRAPH-DECADE-AREA":
      renderGraphDecadeArea(s, c, p);
      return true;
    case "MV-GRAPH-PERCENT-COMPARE":
      renderGraphPercentCompare(s, c, p);
      return true;
    case "MV-GRAPH-LINE-MULTI":
      renderGraphLineMulti(s, c, p);
      return true;
    case "MV-GRAPH-STACKED-BAR":
      renderGraphStackedBar(s, c, p);
      return true;
    case "MV-GRAPH-AREA-STACK":
      renderGraphAreaStack(s, c, p);
      return true;
    case "MV-GRAPH-WATERFALL":
      renderGraphWaterfall(s, c, p);
      return true;
    case "MV-GRAPH-BUBBLE":
      renderGraphBubble(s, c, p);
      return true;
    case "MV-GRAPH-HEATMAP":
      renderGraphHeatmap(s, c, p);
      return true;
    case "MV-GRAPH-TREEMAP":
      renderGraphTreemap(s, c, p);
      return true;
    case "MV-GRAPH-COMBO":
      renderGraphCombo(s, c, p);
      return true;
    // M1 batch — bespoke shape/chart renderers for high-loss variants
    case "MV-INFO-DONUT":
      renderInfoDonut(s, c, p);
      return true;
    case "MV-INFO-FUNNEL":
      renderInfoFunnelStack(s, c, p);
      return true;
    case "MV-INFO-PYRAMID":
      renderInfoPyramid(s, c, p);
      return true;
    case "MV-INFO-VENN":
      renderInfoVenn(s, c, p);
      return true;
    case "MV-INFO-CIRCULAR-FLOW":
      renderInfoCircularFlow(s, c, p);
      return true;
    case "MV-INFO-BAR-COMPARE":
      renderInfoBarCompare(s, c, p);
      return true;
    case "MV-IMG-GRID-3":
      renderImgGrid(s, c, p, 3);
      return true;
    case "MV-IMG-GRID-6":
      renderImgGrid(s, c, p, 6);
      return true;
    case "MV-IMG-MATRIX-4":
      renderImgMatrix(s, c, p, 4);
      return true;
    case "MV-IMG-MATRIX-6":
      renderImgMatrix(s, c, p, 6);
      return true;
    case "MV-IMG-STRIP":
      renderImgStrip(s, c, p);
      return true;
    case "MV-IMG-BEFORE-AFTER":
      renderImgBeforeAfter(s, c, p);
      return true;
    case "MV-CASE-SPREAD":
      renderCaseSpread(s, c, p);
      return true;
    case "MV-CASE-METRICS":
      renderCaseMetrics(s, c, p);
      return true;
    case "MV-CASE-STORY":
      renderCaseStory(s, c, p);
      return true;
    case "MV-CASE-LOGO-GRID":
      renderCaseLogoGrid(s, c, p, itemLogos);
      return true;
    case "MV-CLIENT-MATRIX":
      renderClientMatrix(s, c, p, itemLogos);
      return true;
    case "MV-CLIENT-DETAIL-3":
      renderClientDetail3(s, c, p, itemLogos);
      return true;
    case "MV-CLIENT-COMPARE":
      renderClientCompare(s, c, p, itemLogos);
      return true;
    case "MV-GOV-RACI":
      renderGovRaci(s, c, p);
      return true;
    case "MV-COMM-PRICING":
      renderCommPricing(s, c, p);
      return true;
    case "MV-COMM-INVESTMENT":
      renderCommInvestment(s, c, p);
      return true;
    case "MV-DEC-MATRIX":
      renderDecMatrix(s, c, p);
      return true;
    case "MV-DEC-COMPARE-TABLE":
      renderDecCompareTable(s, c, p);
      return true;
    case "MV-DEC-CHECKLIST":
      renderDecChecklist(s, c, p);
      return true;
    case "MV-PROOF-LOGOS":
      renderProofLogos(s, c, p, itemLogos);
      return true;
    case "MV-PROOF-LOGOS-STRIP":
      renderProofLogos(s, c, p, itemLogos);
      return true;
    case "MV-PROOF-LOGOS-MARQUEE":
      renderProofLogos(s, c, p, itemLogos);
      return true;
    case "MV-PROOF-LOGOS-FEATURED":
      renderProofLogos(s, c, p, itemLogos);
      return true;
    case "MV-PROOF-LOGOS-CATEGORIZED":
      renderProofLogos(s, c, p, itemLogos);
      return true;
    case "MV-PROOF-LOGOS-MOSAIC":
      renderProofLogos(s, c, p, itemLogos);
      return true;
    case "MV-PROOF-TESTIMONIAL":
      renderProofTestimonial(s, c, p);
      return true;
    case "MV-RISK-MITIGATION":
      renderRiskMitigation(s, c, p);
      return true;
    case "MV-TEAM-BIOS-3":
      renderTeamBios(s, c, p, 3);
      return true;
    case "MV-TEAM-BIOS-4":
      renderTeamBios(s, c, p, 4);
      return true;
    case "MV-SOL-ARCHITECTURE":
      renderSolArchitecture(s, c, p);
      return true;
    case "MV-SOL-FEATURE-LIST":
      renderSolFeatureList(s, c, p);
      return true;
    case "MV-PROC-BEFORE-AFTER":
      renderProcBeforeAfter(s, c, p);
      return true;
    // M2 batch — bespoke cover/agenda/divider/close/quote treatments
    case "MV-OP-COVER-DOSSIER":
      renderCoverDossier(s, c, p);
      return true;
    case "MV-OP-COVER-EDITORIAL":
      renderCoverEditorial(s, c, p);
      return true;
    case "MV-OP-COVER-GRADIENT":
      renderCoverGradient(s, c, p);
      return true;
    case "MV-OP-COVER-GRID":
      renderCoverGrid(s, c, p);
      return true;
    case "MV-OP-COVER-MEDIA":
      renderCoverMedia(s, c, p);
      return true;
    case "MV-OP-COVER-MINIMAL":
      renderCoverMinimal(s, c, p);
      return true;
    case "MV-OP-COVER-MONOGRAM":
      renderCoverMonogram(s, c, p);
      return true;
    case "MV-OP-COVER-POSTER":
      renderCoverPoster(s, c, p);
      return true;
    case "MV-OP-COVER-SPLIT":
      renderCoverSplit(s, c, p);
      return true;
    case "MV-OP-COVER-STACKED":
      renderCoverStacked(s, c, p);
      return true;
    case "MV-OP-AGENDA-VERTICAL":
      renderAgendaVertical(s, c, p);
      return true;
    case "MV-OP-DIVIDER-NUMBERED":
      renderDividerNumbered(s, c, p);
      return true;
    case "MV-OP-INTRO-TEAM":
      renderIntroTeam(s, c, p);
      return true;
    case "MV-CLOSE-CTA":
      renderCloseCta(s, c, p);
      return true;
    case "MV-CLOSE-DUAL-CTA":
      renderCloseDualCta(s, c, p);
      return true;
    case "MV-CLOSE-CONTACT":
      renderCloseContact(s, c, p);
      return true;
    case "MV-CLOSE-DECISION":
      renderCloseDecision(s, c, p);
      return true;
    case "MV-CLOSE-METRIC-PROMISE":
      renderCloseMetricPromise(s, c, p);
      return true;
    case "MV-CLOSE-QNA":
      renderCloseQna(s, c, p);
      return true;
    case "MV-CLOSE-CALENDAR":
      renderCloseCalendar(s, c, p);
      return true;
    case "MV-CLOSE-SPLIT":
      renderCloseSplit(s, c, p);
      return true;
    case "MV-CLOSE-TIMELINE":
      renderCloseTimeline(s, c, p);
      return true;
    case "MV-QUOTE-PORTRAIT":
      renderQuotePortrait(s, c, p);
      return true;
    case "MV-QUOTE-POSTER":
      renderQuotePoster(s, c, p);
      return true;
    case "MV-QUOTE-METRIC":
      renderQuoteMetric(s, c, p);
      return true;
    case "MV-QUOTE-MULTI":
      renderQuoteMulti(s, c, p);
      return true;
    default:
      return false;
  }
}

function drawTitle(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette): number {
  return renderTitleZone(s, c, p);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// MV-VIZ-* — render a pre-rasterized/vector SVG under the shared title zone.
function renderVizSpec(
  s: PptxGenJS.Slide,
  c: Record<string, unknown>,
  p: Palette,
  vizSvg?: string,
) {
  const y0 = drawTitle(s, c, p);
  const y = Math.max(y0, 1.6);
  const h = 6.0 - y;
  if (vizSvg) {
    s.addImage({ data: vizSvg, x: 0.6, y, w: 12.13, h, sizing: { type: "contain", w: 12.13, h } });
  } else {
    // Fallback: subtitle so the slide isn't blank when SVG capture fails.
    const subtitle =
      typeof c.subtitle === "string" ? c.subtitle : "Chart preview unavailable in this export.";
    s.addText(subtitle, {
      x: 0.6,
      y: y + 0.3,
      w: 12.13,
      h: 0.6,
      fontFace: "Geist",
      fontSize: 14,
      color: p.ink,
    });
  }
  const source = typeof c.source === "string" ? c.source : "";
  if (source) {
    s.addText(`Source · ${source}`, {
      x: 0.6,
      y: 6.4,
      w: 12.13,
      h: 0.35,
      fontFace: "Geist",
      fontSize: 10,
      color: p.ink,
    });
  }
}

// 1. MV-BENTO-5 / 6 / 7 / 8 — asymmetric bento mosaics
// The area matrices mirror the on-screen renderer exactly, so an exported deck
// keeps the same reading order and cell weighting as the preview.
const BENTO_AREAS: Record<number, { units: number[]; rows: string[][] }> = {
  5: { units: [1.5, 1, 1], rows: [["a", "b", "c"], ["a", "d", "e"]] },
  6: {
    units: [1, 1, 1, 1, 1],
    rows: [
      ["a", "a", "b", "c", "d"],
      ["a", "a", "e", "f", "d"],
    ],
  },
  7: {
    units: [1, 1, 1, 1, 1, 1],
    rows: [
      ["a", "a", "b", "c", "d", "e"],
      ["a", "a", "f", "f", "g", "g"],
    ],
  },
  8: {
    units: [1, 1, 1, 1],
    rows: [
      ["a", "a", "b", "c"],
      ["a", "a", "d", "e"],
      ["f", "f", "g", "h"],
    ],
  },
};

function bentoCells(count: number, y0: number) {
  const spec = BENTO_AREAS[count] ?? BENTO_AREAS[5]!;
  const gutter = 0.16;
  const x0 = 0.6;
  const totalW = 12.13;
  const contentH = 5.9 - y0;
  const cols = spec.units.length;
  const rows = spec.rows.length;
  const unitTotal = spec.units.reduce((a, b) => a + b, 0);
  const usableW = totalW - gutter * (cols - 1);
  const colW = spec.units.map((u) => (u / unitTotal) * usableW);
  const colX: number[] = [];
  let cx = x0;
  for (let i = 0; i < cols; i++) {
    colX.push(cx);
    cx += colW[i]! + gutter;
  }
  const rowH = (contentH - gutter * (rows - 1)) / rows;
  const out: Record<string, { x: number; y: number; w: number; h: number }> = {};
  spec.rows.forEach((row, r) => {
    row.forEach((letter, ci) => {
      const x = colX[ci]!;
      const y = y0 + r * (rowH + gutter);
      const prev = out[letter];
      const box = { x, y, w: colW[ci]!, h: rowH };
      out[letter] = prev
        ? {
            x: Math.min(prev.x, box.x),
            y: Math.min(prev.y, box.y),
            w: Math.max(prev.x + prev.w, box.x + box.w) - Math.min(prev.x, box.x),
            h: Math.max(prev.y + prev.h, box.y + box.h) - Math.min(prev.y, box.y),
          }
        : box;
    });
  });
  // Reading order: anchor first, then b, c, d …
  return Array.from({ length: count }, (_, i) => out[String.fromCharCode(97 + i)]!);
}

function renderBento5(
  s: PptxGenJS.Slide,
  c: Record<string, unknown>,
  p: Palette,
  count = 5,
) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const cells = bentoCells(count, y0);
  // Mirrors the on-screen engine: 22px card radius, accent tick along the top
  // edge, soft-tile icon badge + index numeral in the header row, accent
  // gradient rule above the title, and the same px→pt type ladder (1px = 0.5pt
  // on the 1920×1080 stage), scaled down for denser mosaics exactly like `k`.
  const k7 = count >= 8 ? 0.84 : count === 7 ? 0.89 : count === 6 ? 0.94 : 1;
  const px = (n: number) => PT(Math.round(n * k7));
  const pad = (count >= 7 ? 28 : count === 6 ? 32 : 40) / 144;
  items.slice(0, count).forEach((it, i) => {
    const cell = cells[i]!;
    const g = groupScope(s, `bento-${i}`, `Bento tile ${i + 1}`);
    const kind = str(it.kind);
    const isAnchor = i === 0;
    const idx = String(i + 1).padStart(2, "0");

    if (kind === "media") {
      g.addShape("roundRect", {
        x: cell.x,
        y: cell.y,
        w: cell.w,
        h: cell.h,
        rectRadius: EXPORT_RADIUS_IN.media,
        fill: { color: p.primary, transparency: 88 },
        line: { type: "none" },
        objectName: `Bento media ${i + 1}`,
      });
      g.addShape("rect", {
        x: cell.x + cell.w * 0.16,
        y: cell.y,
        w: cell.w * 0.68,
        h: 3 / 144,
        fill: { color: p.accent },
        line: { type: "none" },
        sharp: true,
      } as never);
      g.addShape("rect", {
        x: cell.x + pad,
        y: cell.y + cell.h - pad - 0.34,
        w: 56 / 144,
        h: 2 / 144,
        fill: { color: p.accent },
        line: { type: "none" },
        sharp: true,
      } as never);
      g.addText(str(it.title).toUpperCase(), {
        x: cell.x + pad,
        y: cell.y + cell.h - pad - 0.28,
        w: cell.w - pad * 2,
        h: 0.28,
        fontSize: px(18),
        color: p.primary,
        fontFace: "Geist",
        charSpacing: 4,
      });
      return;
    }

    // Card surface + top accent tick (AccentTick, 3px, radius 22).
    g.addShape("roundRect", {
      x: cell.x,
      y: cell.y,
      w: cell.w,
      h: cell.h,
      rectRadius: EXPORT_RADIUS_IN.media,
      fill: { color: "FFFFFF" },
      line: { color: LIGHT_GRAY, width: 0.75 },
      objectName: `Bento tile ${i + 1}`,
    });
    g.addShape("rect", {
      x: cell.x + cell.w * 0.16,
      y: cell.y,
      w: cell.w * 0.68,
      h: 3 / 144,
      fill: { color: p.accent },
      line: { type: "none" },
      sharp: true,
    } as never);

    // Header row: soft-tile icon badge + right-aligned index numeral.
    const badgeSize = isAnchor ? 0.4 : 0.32;
    addIconBadge(g, str(isAnchor ? it.title : kind === "stat" ? it.label : it.title), {
      x: cell.x + pad,
      y: cell.y + pad,
      size: badgeSize,
      accent: p.accent,
      index: i,
      icon: it.icon,
    });
    g.addText(idx, {
      x: cell.x + cell.w - pad - 0.7,
      y: cell.y + pad,
      w: 0.7,
      h: 0.3,
      fontSize: px(isAnchor ? 16 : 15),
      color: MID_GRAY,
      fontFace: "Geist",
      charSpacing: 4,
      align: "right",
    });

    if (kind === "stat") {
      g.addText(`${str(it.value)}${str(it.unit)}`, {
        x: cell.x + pad,
        y: cell.y + cell.h - pad - 1.0,
        w: cell.w - pad * 2,
        h: 0.66,
        fontSize: px(isAnchor ? 96 : 72),
        bold: true,
        color: p.accent,
        fontFace: "Geist",
        valign: "bottom",
      });
      g.addText(str(it.label).toUpperCase(), {
        x: cell.x + pad,
        y: cell.y + cell.h - pad - 0.3,
        w: cell.w - pad * 2,
        h: 0.3,
        fontSize: px(16),
        color: MID_GRAY,
        fontFace: "Geist",
        charSpacing: 3,
      });
      return;
    }

    // Body cell: accent gradient rule, title, supporting copy — bottom-aligned
    // like the screen's `mt-auto` block.
    const titlePt = px(isAnchor ? 46 : 28);
    const bodyPt = px(isAnchor ? 24 : 20);
    const bodyH = Math.min(cell.h - pad * 2 - 1.1, (isAnchor ? 3 : 2) * 0.44);
    const titleH = isAnchor ? 0.9 : 0.6;
    const blockY = cell.y + cell.h - pad - bodyH - titleH;
    g.addShape("rect", {
      x: cell.x + pad,
      y: blockY - 0.2,
      w: (isAnchor ? 96 : 56) / 144,
      h: 3 / 144,
      fill: { color: p.accent },
      line: { type: "none" },
      sharp: true,
    } as never);
    g.addText(str(it.title), {
      x: cell.x + pad,
      y: blockY,
      w: cell.w - pad * 2,
      h: titleH,
      fontSize: titlePt,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      valign: "top",
      lineSpacingMultiple: 1.08,
    });
    g.addText(str(it.body), {
      x: cell.x + pad,
      y: blockY + titleH,
      w: cell.w - pad * 2,
      h: bodyH,
      fontSize: bodyPt,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
      lineSpacingMultiple: 1.4,
    });
  });
}

// 1b. MV-BENTO-VALUE-CLOSE — promise band, value grid, close band.
// Geometry/typography mirror the on-screen renderer: the stage is 1920x1080 px
// mapped to 13.33x7.5in, so 1px = 1/144in and 1px of type = 0.5pt.
const PX = 1 / 144;
const PT = (px: number) => px * 0.5;

/**
 * Draw the same Lucide glyph the on-screen renderer picks, as an SVG whose
 * stroke width is renormalized for the drawn box (see pptx-icons) so outlines
 * never export too thick in small badges or too thin in large discs.
 */
/**
 * The light-ink guard, for colours that never pass through `addText`: white on a
 * light slide is invisible, so it is remapped to the slide's brand ink.
 */
function guardedInk(s: PptxGenJS.Slide, color: string): string {
  const ink = (s as unknown as { __lightInk?: string }).__lightInk;
  if (!ink) return color;
  const c = color.replace("#", "").toUpperCase();
  return c === "FFFFFF" || c === "FFF" ? ink : color;
}

function addIconGlyph(
  s: PptxGenJS.Slide,
  label: string,
  opts: { x: number; y: number; size: number; color: string; index?: number; icon?: unknown },
): boolean {
  const color = guardedInk(s, opts.color);
  const override = typeof opts.icon === "string" && opts.icon.length > 0 ? opts.icon : null;
  const glyph = (ovr: string | null) =>
    iconGlyphDataUrl(label, {
      index: opts.index ?? 0,
      override: ovr,
      color,
      boxIn: opts.size,
    });
  // An icon well that opens empty in PowerPoint reads as a broken slide, so an
  // unresolvable override falls back to the renderer's label-derived glyph
  // before we ever give up on the slot.
  const data = glyph(override) ?? (override ? glyph(null) : null);
  if (!data) {
    noteExportAsset("icon", false);
    return false;
  }
  s.addImage({ data, x: opts.x, y: opts.y, w: opts.size, h: opts.size, objectName: "TP Icon" });
  noteExportAsset("icon", true);
  return true;

}

/**
 * The on-screen `IconBadge` with `treatment="soft-tile"`: a rounded accent wash
 * tile with the glyph centred inside it. Exports as two native objects (tile +
 * vector glyph) so the badge stays editable and recolourable in PowerPoint.
 * Returns the badge width so callers can offset the copy next to it.
 */
function addIconBadge(
  s: PptxGenJS.Slide,
  label: string,
  opts: {
    x: number;
    y: number;
    size?: number;
    accent: string;
    index?: number;
    icon?: unknown;
    onDark?: boolean;
  },
): number {
  const box = opts.size ?? 0.42;
  const pad = box * 0.22;
  const tile = box + pad * 2;
  s.addShape("roundRect", {
    x: opts.x,
    y: opts.y,
    w: tile,
    h: tile,
    rectRadius: EXPORT_RADIUS_IN.chip,
    fill: { color: opts.onDark ? "FFFFFF" : opts.accent, transparency: opts.onDark ? 86 : 88 },
    line: { type: "none" },
    objectName: "TP Icon tile",
  });
  addIconGlyph(s, label, {
    x: opts.x + pad,
    y: opts.y + pad,
    size: box,
    color: opts.onDark ? "FFFFFF" : opts.accent,
    index: opts.index,
    icon: opts.icon,
  });
  return tile;
}

/** House "open-bottom" band: accent wash, no outline, centred accent top seam. */
function drawHouseBand(
  s: PptxGenJS.Slide,
  p: Palette,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  s.addShape("roundRect", {
    x,
    y,
    w,
    h,
    rectRadius: EXPORT_RADIUS_IN.band,
    fill: { color: p.accent, transparency: 92 },
    line: { type: "none" },
  });
  const inset = w * 0.12;
  s.addShape("rect", {
    x: x + inset,
    y,
    w: w - inset * 2,
    h: SEAM_HEIGHT_PX * PX,
    fill: { color: p.accent },
    line: { type: "none" },
  });
}

function renderBentoValueClose(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  let y = drawTitle(s, c, p);
  const promise = obj(c.promise);
  const close = obj(c.close);
  const items = arr(c.items).slice(0, 6);
  const x0 = 0.6;
  const totalW = 12.13;
  // Restrained tone rotation, identical to the renderer's toneFor().
  const cool = "3E7BD1";
  const toneFor = (i: number) => [p.accent, cool, p.accent, p.ink, cool, p.accent][i % 6]!;

  if (str(c.subtitle)) {
    s.addText(str(c.subtitle), {
      x: x0,
      y,
      w: totalW,
      h: 0.45,
      fontSize: PT(34),
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
    y += 0.55;
  }

  const promiseLead = str(promise.lead);
  const promiseEmph = str(promise.emphasis);
  if (promiseLead || promiseEmph) {
    y += 22 * PX;
    const bandH = 0.62;
    drawHouseBand(s, p, x0, y, totalW, bandH);
    s.addText(
      [
        promiseLead ? { text: promiseLead, options: { color: p.ink } } : null,
        promiseEmph ? { text: `${promiseLead ? " " : ""}${promiseEmph}`, options: { color: p.accent } } : null,
      ].filter(Boolean) as PptxGenJS.TextProps[],
      {
        x: x0 + 0.3,
        y,
        w: totalW - 0.6,
        h: bandH,
        fontSize: PT(24),
        bold: true,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      },
    );
    y += bandH + 0.16;
  }

  if (str(c.itemsLabel)) {
    s.addText(str(c.itemsLabel).toUpperCase(), {
      x: x0,
      y,
      w: totalW,
      h: 0.3,
      fontSize: PT(19),
      bold: true,
      charSpacing: PT(19 * 0.18),
      color: p.ink,
      fontFace: "Geist",
      align: "center",
    });
    y += 0.4;
  }

  const cols = items.length >= 5 ? 3 : items.length >= 3 ? 3 : 2;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const gutter = 16 * PX;
  const closeH = 0.95;
  const gridH = Math.max(1.2, 6.5 - closeH - 0.28 - y);
  const cellW = (totalW - gutter * (cols - 1)) / cols;
  const cellH = (gridH - gutter * (rows - 1)) / rows;
  items.forEach((it, i) => {
    const tone = toneFor(i);
    const cx = x0 + (i % cols) * (cellW + gutter);
    const cy = y + Math.floor(i / cols) * (cellH + gutter);
    // Tile: accent wash, no outline (open-bottom look), accent top seam tick.
    s.addShape("roundRect", {
      x: cx,
      y: cy,
      w: cellW,
      h: cellH,
      rectRadius: EXPORT_RADIUS_IN.media,
      fill: { color: p.surface },
      line: { type: "none" },
    });
    const tickInset = cellW * 0.12;
    s.addShape("rect", {
      x: cx + tickInset,
      y: cy,
      w: cellW - tickInset * 2,
      h: 3 * PX,
      fill: { color: p.accent },
      line: { type: "none" },
    });
    // Cell glyph, top-left, matching the on-screen icon pick.
    addIconGlyph(s, str(it.title), {
      x: cx + 20 * PX,
      y: cy + 10 * PX,
      size: 0.2,
      color: tone,
      index: i,
      icon: it.icon,
    });
    s.addText(str(it.title), {
      x: cx + 24 * PX,
      y: cy + 0.24,
      w: cellW - 48 * PX,
      h: 0.44,
      fontSize: PT(23),
      bold: true,
      color: tone,
      fontFace: "Geist",
      align: "center",
      valign: "bottom",
    });
    // Per-cell underline seam beneath the title (56px wide, tone-coloured).
    s.addShape("rect", {
      x: cx + cellW / 2 - 28 * PX,
      y: cy + 0.72,
      w: 56 * PX,
      h: SEAM_HEIGHT_PX * PX,
      fill: { color: tone },
      line: { type: "none" },
    });
    s.addText(str(it.body), {
      x: cx + 24 * PX,
      y: cy + 0.82,
      w: cellW - 48 * PX,
      h: cellH - 0.95,
      fontSize: PT(17),
      color: p.ink,
      fontFace: "Geist",
      align: "center",
      valign: "top",
    });
  });

  const closeY = y + gridH + 0.28;
  const closeLead = str(close.lead);
  const closeEmph = str(close.emphasis);
  if (closeLead || closeEmph || str(close.ctaTitle)) {
    drawHouseBand(s, p, x0, closeY, totalW, closeH);
    const colW = totalW / 2 - 0.55;
    s.addText(
      [
        closeLead ? { text: closeLead, options: { color: p.ink, breakLine: !!closeEmph } } : null,
        closeEmph ? { text: closeEmph, options: { color: p.accent } } : null,
      ].filter(Boolean) as PptxGenJS.TextProps[],
      {
        x: x0 + 0.34,
        y: closeY,
        w: colW,
        h: closeH,
        fontSize: PT(24),
        bold: true,
        fontFace: "Geist",
        valign: "middle",
      },
    );
    // Hairline divider between the two clauses.
    s.addShape("rect", {
      x: x0 + totalW / 2,
      y: closeY + closeH * 0.14,
      w: 1 * PX,
      h: closeH * 0.72,
      fill: { color: p.accent, transparency: 68 },
      line: { type: "none" },
    });
    s.addText(
      [
        str(close.ctaTitle)
          ? {
              text: str(close.ctaTitle),
              options: { color: p.ink, bold: true, fontSize: PT(24), breakLine: !!str(close.ctaBody) },
            }
          : null,
        str(close.ctaBody)
          ? { text: str(close.ctaBody), options: { color: p.ink, fontSize: PT(19) } }
          : null,
      ].filter(Boolean) as PptxGenJS.TextProps[],
      {
        x: x0 + totalW / 2 + 0.24,
        y: closeY,
        w: colW,
        h: closeH,
        fontFace: "Geist",
        valign: "middle",
      },
    );
  }
}

// 2. MV-KPI-DASHBOARD
function renderKpiDashboard(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 8);
  if (!items.length) return;
  const cols = items.length <= 3 ? items.length : items.length <= 4 ? 4 : items.length <= 6 ? 3 : 4;
  const rows = Math.ceil(items.length / cols);
  const gap = 0.3;
  const colW = (SLIDE_W - 1.2 - (cols - 1) * gap) / cols;
  const availH = 5.9 - y0;
  const rowH = Math.min(2.4, (availH - (rows - 1) * gap) / rows);
  items.forEach((it, k) => {
    const r = Math.floor(k / cols);
    const g = groupScope(s, `kpi-${k}`, `KPI card ${k + 1}`);
    const col = k % cols;
    const x = 0.6 + col * (colW + gap);
    const y = y0 + r * (rowH + gap);
    // Card surface, accent tick and icon badge — mirrors the on-screen KPI tile.
    g.addShape("roundRect", {
      x,
      y,
      w: colW,
      h: rowH,
      rectRadius: EXPORT_RADIUS_IN.band,
      fill: { color: "FFFFFF" },
      line: { color: LIGHT_GRAY, width: 0.75 },
      objectName: `KPI surface ${k + 1}`,
    });
    g.addShape("rect", {
      x: x + colW * 0.16,
      y,
      w: colW * 0.68,
      h: 3 / 144,
      fill: { color: p.accent },
      line: { type: "none" },
      sharp: true,
    } as never);
    addIconBadge(g, str(it.label), {
      x: x + 0.22,
      y: y + 0.2,
      size: 0.26,
      accent: p.accent,
      index: k,
      icon: it.icon,
    });
    g.addText(str(it.label).toUpperCase(), {
      x: x + 0.9,
      y: y + 0.2,
      w: colW - 1.1,
      h: 0.35,
      fontSize: 10,
      bold: true,
      color: p.ink,
      fontFace: "Geist",
      charSpacing: 4,
    });
    g.addText(`${str(it.value)}${str(it.unit)}`, {
      x: x + 0.22,
      y: y + 0.62,
      w: colW - 0.44,
      h: rowH * 0.5,
      fontSize: 40,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
    const trend = str(it.trend);
    const arrow = trend === "down" ? "▼" : trend === "up" ? "▲" : "•";
    const deltaColor = trend === "down" ? "DC2626" : trend === "up" ? "16A34A" : p.ink;
    const delta = str(it.delta);
    if (delta) {
      g.addText(`${arrow} ${delta}`, {
        x: x + 0.22,
        y: y + rowH - 0.55,
        w: colW - 0.44,
        h: 0.4,
        fontSize: 12,
        bold: true,
        color: deltaColor,
        fontFace: "Geist",
      });
    }
  });
}

// 3. MV-ROADMAP-QUARTERS
function renderRoadmapQuarters(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const quarters =
    Array.isArray(c.quarters) && c.quarters.length
      ? (c.quarters as unknown[]).map(String)
      : ["Q1", "Q2", "Q3", "Q4"];
  const items = arr(c.items);
  const marginX = 0.6;
  const labelW = 3.0;
  const gridX = marginX + labelW;
  const gridW = SLIDE_W - gridX - marginX;
  const colW = gridW / quarters.length;
  // Quarter headers
  quarters.forEach((q, k) => {
    const x = gridX + k * colW;
    s.addText(q, {
      x,
      y: y0,
      w: colW,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      charSpacing: 3,
      align: "left",
    });
    s.addShape("rect", {
      x,
      y: y0 + 0.42,
      w: colW - 0.1,
      h: 0.02,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
  });
  const rowY = y0 + 0.7;
  const availH = 5.9 - rowY;
  const rowH = Math.min(0.9, availH / Math.max(items.length, 1));
  items.slice(0, 6).forEach((it, k) => {
    const y = rowY + k * rowH;
    s.addText(str(it.label), {
      x: marginX,
      y,
      w: labelW - 0.15,
      h: rowH,
      fontSize: 12,
      bold: true,
      color: p.ink,
      fontFace: "Geist",
      valign: "middle",
    });
    const start = Math.max(1, Number(it.start) || 1);
    const end = Math.min(quarters.length, Number(it.end) || start);
    const barX = gridX + (start - 1) * colW + 0.05;
    const barW = (end - start + 1) * colW - 0.15;
    s.addShape("roundRect", {
      x: barX,
      y: y + rowH * 0.25,
      w: Math.max(0.4, barW),
      h: rowH * 0.5,
      fill: { color: p.primary },
      line: { color: p.primary },
      rectRadius: EXPORT_RADIUS_IN.chip,
    });
    if (it.note) {
      s.addText(str(it.note), {
        x: barX + 0.15,
        y: y + rowH * 0.25,
        w: Math.max(0.4, barW) - 0.3,
        h: rowH * 0.5,
        fontSize: 9,
        color: "FFFFFF",
        fontFace: "Geist",
        valign: "middle",
      });
    }
  });
}

// 4. MV-FUNNEL
function renderFunnel(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  if (!items.length) return;
  const availH = 5.7 - y0;
  const barH = Math.min(0.9, (availH - (items.length - 1) * 0.12) / items.length);
  const maxW = 9.0;
  const minW = 3.5;
  items.forEach((it, k) => {
    const t = items.length > 1 ? k / (items.length - 1) : 0;
    const w = maxW - (maxW - minW) * t;
    const x = (SLIDE_W - w) / 2;
    const y = y0 + k * (barH + 0.12);
    const transparency = Math.min(70, k * 15);
    s.addShape("rect", {
      x,
      y,
      w,
      h: barH,
      fill: { color: p.primary, transparency },
      line: { color: p.primary, transparency },
    });
    addIconBadge(s, str(it.label), {
      x: x + 0.22,
      y: y + (barH - 0.34) / 2,
      size: 0.26,
      accent: p.accent,
      index: k,
      icon: it.icon,
      onDark: true,
    });
    s.addText(str(it.label), {
      x: x + 0.72,
      y,
      w: w * 0.65 - 0.5,
      h: barH,
      fontSize: 14,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "middle",
    });
    s.addText(`${str(it.value)}${str(it.unit)}`, {
      x: x + w * 0.6,
      y,
      w: w * 0.35 - 0.2,
      h: barH,
      fontSize: 18,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "middle",
      align: "right",
    });
    if (it.note) {
      s.addText(str(it.note), {
        x: SLIDE_W - 3.6,
        y: y + barH * 0.25,
        w: SLIDE_W - x - w - 0.2,
        h: barH * 0.7,
        fontSize: 9,
        color: p.ink,
        fontFace: "Geist",
        valign: "middle",
      });
    }
  });
}

// 5. MV-FLYWHEEL
function renderFlywheel(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const hub = str(c.hub);
  const cx = SLIDE_W / 2;
  const cy = y0 + (6.0 - y0) / 2;
  const r = Math.min(2.4, (6.0 - y0) / 2 - 0.3);
  s.addShape("ellipse", {
    x: cx - r,
    y: cy - r,
    w: r * 2,
    h: r * 2,
    fill: { color: "FFFFFF", transparency: 100 } as unknown as { color: string },
    line: { color: p.accent, width: 1.5 },
  });
  if (hub) {
    s.addText(hub, {
      x: cx - 1.5,
      y: cy - 0.4,
      w: 3.0,
      h: 0.8,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
  }
  const n = items.length;
  items.forEach((it, k) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / Math.max(n, 1);
    const nx = cx + Math.cos(angle) * r;
    const ny = cy + Math.sin(angle) * r;
    s.addShape("ellipse", {
      x: nx - 0.12,
      y: ny - 0.12,
      w: 0.24,
      h: 0.24,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    const lx = cx + Math.cos(angle) * (r + 0.4);
    const ly = cy + Math.sin(angle) * (r + 0.4);
    const align: "left" | "right" | "center" =
      Math.abs(Math.cos(angle)) < 0.3 ? "center" : Math.cos(angle) > 0 ? "left" : "right";
    const boxW = 2.6;
    const boxX =
      align === "left" ? lx + 0.05 : align === "right" ? lx - boxW - 0.05 : lx - boxW / 2;
    s.addText(str(it.label), {
      x: boxX,
      y: ly - 0.35,
      w: boxW,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align,
    });
    s.addText(str(it.note), {
      x: boxX,
      y: ly,
      w: boxW,
      h: 0.7,
      fontSize: 10,
      color: p.ink,
      fontFace: "Geist",
      align,
    });
  });
}

// 6. MV-MATURITY-CURVE
function renderMaturityCurve(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const n = items.length;
  if (!n) return;
  const marginX = 1.0;
  const bottomY = 6.2;
  const topY = y0 + 0.5;
  const step = (SLIDE_W - marginX * 2) / Math.max(n - 1, 1);
  const points = items.map((_, k) => {
    const t = n > 1 ? k / (n - 1) : 0;
    const eased = t * t;
    return { x: marginX + k * step, y: bottomY - eased * (bottomY - topY) };
  });
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k];
    const b = points[k + 1];
    s.addShape("line", {
      x: a.x,
      y: a.y,
      w: b.x - a.x,
      h: b.y - a.y,
      line: { color: p.accent, width: 2 },
    });
  }
  items.forEach((it, k) => {
    const pt = points[k];
    const isCurrent = Boolean(it.current);
    s.addShape("ellipse", {
      x: pt.x - 0.15,
      y: pt.y - 0.15,
      w: 0.3,
      h: 0.3,
      fill: { color: isCurrent ? p.accent : p.primary },
      line: { color: p.primary },
    });
    s.addText(str(it.label), {
      x: pt.x - 1.3,
      y: pt.y - 0.85,
      w: 2.6,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.note), {
      x: pt.x - 1.3,
      y: pt.y - 0.5,
      w: 2.6,
      h: 0.4,
      fontSize: 9,
      color: p.ink,
      fontFace: "Geist",
      align: "center",
    });
    if (isCurrent) {
      s.addText("YOU ARE HERE", {
        x: pt.x - 1.3,
        y: pt.y + 0.2,
        w: 2.6,
        h: 0.3,
        fontSize: 9,
        bold: true,
        color: p.accent,
        fontFace: "Geist",
        align: "center",
        charSpacing: 4,
      });
    }
  });
}

// 7. MV-JOURNEY-MAP
function renderJourneyMap(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const n = items.length;
  if (!n) return;
  const marginX = 0.6;
  const colW = (SLIDE_W - marginX * 2) / n;
  const phaseY = y0;
  items.forEach((it, k) => {
    const x = marginX + k * colW;
    addIconBadge(s, str(it.phase || it.touchpoint), {
      x,
      y: phaseY - 0.5,
      size: 0.26,
      accent: p.accent,
      index: k,
      icon: it.icon,
    });
    s.addText(str(it.phase).toUpperCase(), {
      x,
      y: phaseY,
      w: colW - 0.1,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addShape("rect", {
      x,
      y: phaseY + 0.42,
      w: colW - 0.2,
      h: 0.02,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(it.touchpoint), {
      x,
      y: phaseY + 0.55,
      w: colW - 0.15,
      h: 1.2,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
  // sentiment polyline in bottom half
  const chartTop = y0 + 2.2;
  const chartBottom = 6.4;
  const sentY = (v: number) => chartBottom - ((v - 1) / 4) * (chartBottom - chartTop);
  const pts = items.map((it, k) => ({
    x: marginX + k * colW + (colW - 0.2) / 2,
    y: sentY(Math.max(1, Math.min(5, Number(it.sentiment) || 3))),
  }));
  // baseline
  s.addShape("rect", {
    x: marginX,
    y: chartBottom,
    w: SLIDE_W - marginX * 2,
    h: 0.01,
    fill: { color: LIGHT_GRAY },
    line: { color: LIGHT_GRAY },
  });
  for (let k = 0; k < pts.length - 1; k++) {
    const a = pts[k],
      b = pts[k + 1];
    s.addShape("line", {
      x: a.x,
      y: a.y,
      w: b.x - a.x,
      h: b.y - a.y,
      line: { color: p.accent, width: 2 },
    });
  }
  pts.forEach((pt) => {
    s.addShape("ellipse", {
      x: pt.x - 0.1,
      y: pt.y - 0.1,
      w: 0.2,
      h: 0.2,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
  });
}

// 8. MV-LOGO-WALL
function renderLogoWall(
  s: PptxGenJS.Slide,
  c: Record<string, unknown>,
  p: Palette,
  itemLogos: Array<string | null> = [],
) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 12);
  if (!items.length) return;
  const cols = items.length <= 4 ? items.length : items.length <= 6 ? 3 : 4;
  const rows = Math.ceil(items.length / cols);
  const colW = (SLIDE_W - 1.2) / cols;
  const availH = 5.9 - y0;
  const rowH = availH / rows;
  items.forEach((it, k) => {
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * colW;
    const y = y0 + r * rowH;
    s.addShape("rect", {
      x,
      y,
      w: colW - 0.1,
      h: rowH - 0.1,
      fill: { color: "FFFFFF" },
      line: { color: LIGHT_GRAY, width: 0.5 },
    });
    const logoData = itemLogos[k];
    const name = str(it.name);
    if (logoData) {
      // Real client wordmark, contained inside the top portion of the tile.
      s.addImage({
        data: logoData,
        ...containFrame(logoData, x + 0.2, y + 0.15, colW - 0.5, rowH * 0.55),
      });
    } else {
      s.addText(initials(name), {
        x,
        y: y + 0.15,
        w: colW - 0.1,
        h: rowH * 0.55,
        fontSize: 32,
        bold: true,
        color: p.primary,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
    }
    s.addText(name.toUpperCase(), {
      x,
      y: y + rowH - 0.55,
      w: colW - 0.1,
      h: 0.4,
      fontSize: 10,
      color: p.ink,
      fontFace: "Geist",
      align: "center",
      charSpacing: 3,
    });
  });
}

// 9. MV-MATRIX-2X2
function renderMatrix2x2(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const quadrants = Array.isArray(c.quadrants)
    ? (c.quadrants as unknown[]).map(String)
    : ["", "", "", ""];
  const target = Number(c.target) || 0;
  const items = arr(c.items);
  const size = Math.min(5.4, 6.2 - y0);
  const gridX = (SLIDE_W - size) / 2;
  const gridY = y0;
  const half = size / 2;
  // Quadrant order: 1=TL 2=TR 3=BL 4=BR (per matrix convention). Target quadrant filled.
  const quads = [
    { i: 1, x: gridX, y: gridY }, // TL
    { i: 2, x: gridX + half, y: gridY }, // TR
    { i: 3, x: gridX, y: gridY + half }, // BL
    { i: 4, x: gridX + half, y: gridY + half }, // BR
  ];
  quads.forEach((q, idx) => {
    const isTarget = q.i === target;
    s.addShape("rect", {
      x: q.x,
      y: q.y,
      w: half,
      h: half,
      fill: isTarget ? { color: p.accent, transparency: 88 } : { color: "FFFFFF" },
      line: { color: MID_GRAY, width: 0.75 },
    });
    const label = str(quadrants[idx] ?? "");
    if (label) {
      s.addText(label.toUpperCase(), {
        x: q.x + 0.15,
        y: q.y + 0.12,
        w: half - 0.3,
        h: 0.4,
        fontSize: 10,
        bold: true,
        color: p.primary,
        fontFace: "Geist",
        charSpacing: 3,
      });
    }
  });
  // Axis labels
  s.addText(str(c.axisX).toUpperCase(), {
    x: gridX,
    y: gridY + size + 0.1,
    w: size,
    h: 0.3,
    fontSize: 9,
    bold: true,
    color: p.ink,
    fontFace: "Geist",
    charSpacing: 3,
    align: "center",
  });
  s.addText(str(c.axisY).toUpperCase(), {
    x: gridX - 0.5,
    y: gridY,
    w: 0.4,
    h: size,
    fontSize: 9,
    bold: true,
    color: p.ink,
    fontFace: "Geist",
    charSpacing: 3,
    align: "center",
    valign: "middle",
    rotate: 270,
  });
  // Plotted items
  items.forEach((it) => {
    const xn = Math.max(0, Math.min(1, Number(it.x)));
    const yn = Math.max(0, Math.min(1, Number(it.y)));
    const px = gridX + xn * size;
    const py = gridY + (1 - yn) * size;
    s.addShape("ellipse", {
      x: px - 0.08,
      y: py - 0.08,
      w: 0.16,
      h: 0.16,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText(str(it.label), {
      x: px + 0.12,
      y: py - 0.15,
      w: 2.0,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: p.ink,
      fontFace: "Geist",
    });
  });
}

// 10. MV-ICEBERG
function renderIceberg(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const above = arr(c.above);
  const below = arr(c.below);
  const waterline = str(c.waterline);
  const availH = 6.3 - y0;
  const aboveH = availH * 0.35;
  const belowH = availH * 0.62;
  // Above rows
  above.slice(0, 3).forEach((it, k) => {
    const rowW = (SLIDE_W - 1.2) / Math.min(above.length, 3);
    const x = 0.6 + k * rowW;
    s.addText(str(it.label), {
      x,
      y: y0 + 0.1,
      w: rowW - 0.2,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.body), {
      x,
      y: y0 + 0.65,
      w: rowW - 0.2,
      h: aboveH - 0.7,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
  // Waterline
  const wlY = y0 + aboveH;
  s.addShape("rect", {
    x: 0.4,
    y: wlY,
    w: SLIDE_W - 0.8,
    h: 0.03,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  if (waterline) {
    s.addShape("rect", {
      x: SLIDE_W / 2 - 1.7,
      y: wlY - 0.15,
      w: 3.4,
      h: 0.3,
      fill: { color: "FFFFFF" },
      line: { color: "FFFFFF" },
    });
    s.addText(waterline.toUpperCase(), {
      x: SLIDE_W / 2 - 1.7,
      y: wlY - 0.15,
      w: 3.4,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
      charSpacing: 5,
    });
  }
  // Below band tinted
  const belowY = wlY + 0.05;
  s.addShape("rect", {
    x: 0.4,
    y: belowY,
    w: SLIDE_W - 0.8,
    h: belowH,
    fill: { color: LIGHT_GRAY, transparency: 60 },
    line: { color: LIGHT_GRAY, width: 0 },
  });
  const bCols = Math.min(below.length, 4) || 1;
  const bColW = (SLIDE_W - 1.2) / bCols;
  below.slice(0, bCols).forEach((it, k) => {
    const x = 0.6 + k * bColW;
    s.addText(str(it.label), {
      x,
      y: belowY + 0.2,
      w: bColW - 0.2,
      h: 0.5,
      fontSize: 13,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.body), {
      x,
      y: belowY + 0.75,
      w: bColW - 0.2,
      h: belowH - 0.9,
      fontSize: 10,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// 11. MV-EDITORIAL-SPREAD
function renderEditorialSpread(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const kicker = str(c.kicker);
  const title = str(c.title);
  const pullValue = str(c.pullValue);
  const pullUnit = str(c.pullUnit);
  const pullLabel = str(c.pullLabel);
  const bodyLeft = str(c.bodyLeft);
  const bodyRight = str(c.bodyRight);
  const folio = str(c.folio);
  const leftW = 5.0;
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.6,
      y: 0.6,
      w: SLIDE_W - 1.2,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 5,
    });
  }
  s.addText(`${pullValue}${pullUnit}`, {
    x: 0.6,
    y: 1.3,
    w: leftW,
    h: 3.2,
    fontSize: 180,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
  });
  s.addText(pullLabel, {
    x: 0.6,
    y: 4.6,
    w: leftW,
    h: 1.0,
    fontSize: 13,
    bold: true,
    color: p.ink,
    fontFace: "Geist",
    charSpacing: 3,
  });
  s.addText(title, {
    x: leftW + 0.9,
    y: 1.3,
    w: SLIDE_W - leftW - 1.5,
    h: 1.4,
    fontSize: 26,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  // hairline column rule
  const colGap = (SLIDE_W - leftW - 1.5) / 2;
  s.addShape("rect", {
    x: leftW + 0.9 + colGap - 0.02,
    y: 2.9,
    w: 0.01,
    h: 3.5,
    fill: { color: LIGHT_GRAY },
    line: { color: LIGHT_GRAY },
  });
  s.addText(bodyLeft, {
    x: leftW + 0.9,
    y: 2.9,
    w: colGap - 0.15,
    h: 3.5,
    fontSize: 11,
    color: p.ink,
    fontFace: "Geist",
    valign: "top",
  });
  s.addText(bodyRight, {
    x: leftW + 0.9 + colGap + 0.15,
    y: 2.9,
    w: colGap - 0.15,
    h: 3.5,
    fontSize: 11,
    color: p.ink,
    fontFace: "Geist",
    valign: "top",
  });
  if (folio) {
    s.addShape("rect", {
      x: 0.6,
      y: 6.7,
      w: SLIDE_W - 1.2,
      h: 0.01,
      fill: { color: LIGHT_GRAY },
      line: { color: LIGHT_GRAY },
    });
    s.addText(folio.toUpperCase(), {
      x: 0.6,
      y: 6.75,
      w: SLIDE_W - 1.2,
      h: 0.3,
      fontSize: 9,
      color: p.ink,
      fontFace: "Geist",
      charSpacing: 4,
    });
  }
}

// 12. MV-SPLIT-MANIFESTO
function renderSplitManifesto(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const kicker = str(c.kicker);
  const statement = str(c.statement);
  const signoff = str(c.signoff);
  const items = arr(c.items);
  const leftW = SLIDE_W * 0.42;
  // Left panel
  s.addShape("rect", {
    x: 0,
    y: 0,
    w: leftW,
    h: SLIDE_H,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.6,
      y: 0.8,
      w: leftW - 1.0,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 5,
    });
  }
  s.addText(statement, {
    x: 0.6,
    y: 1.4,
    w: leftW - 1.0,
    h: SLIDE_H - 2.6,
    fontSize: 30,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "middle",
  });
  if (signoff) {
    s.addText(`— ${signoff}`, {
      x: 0.6,
      y: SLIDE_H - 1.0,
      w: leftW - 1.0,
      h: 0.4,
      fontSize: 12,
      color: "FFFFFF",
      fontFace: "Geist",
      charSpacing: 3,
    });
  }
  // Right proof points
  const rightX = leftW + 0.6;
  const rightW = SLIDE_W - rightX - 0.6;
  const n = Math.min(items.length, 4) || 1;
  const availH = SLIDE_H - 1.4;
  const rowH = availH / n;
  items.slice(0, n).forEach((it, k) => {
    const y = 0.8 + k * rowH;
    s.addShape("rect", {
      x: rightX,
      y,
      w: rightW,
      h: 0.03,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(it.title), {
      x: rightX,
      y: y + 0.2,
      w: rightW,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.body), {
      x: rightX,
      y: y + 0.8,
      w: rightW,
      h: rowH - 1.0,
      fontSize: 12,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// 13. MV-NUMBERS-TRIPTYCH
function renderNumbersTriptych(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  if (!items.length) return;
  const n = items.length;
  const marginX = 0.6;
  const colW = (SLIDE_W - marginX * 2) / n;
  const cellY = y0 + 0.3;
  const cellH = 6.2 - cellY;
  items.forEach((it, k) => {
    const x = marginX + k * colW;
    if (k > 0) {
      s.addShape("rect", {
        x: x - 0.005,
        y: cellY + 0.2,
        w: 0.01,
        h: cellH - 0.4,
        fill: { color: LIGHT_GRAY },
        line: { color: LIGHT_GRAY },
      });
    }
    s.addText(
      [
        { text: str(it.value), options: { bold: true, color: p.primary } },
        { text: str(it.unit), options: { bold: true, color: p.accent } },
      ],
      {
        x: x + 0.2,
        y: cellY,
        w: colW - 0.4,
        h: cellH * 0.45,
        fontSize: 96,
        fontFace: "Geist",
      },
    );
    s.addText(str(it.label).toUpperCase(), {
      x: x + 0.2,
      y: cellY + cellH * 0.5,
      w: colW - 0.4,
      h: 0.5,
      fontSize: 12,
      bold: true,
      color: p.ink,
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addText(str(it.note), {
      x: x + 0.2,
      y: cellY + cellH * 0.62,
      w: colW - 0.4,
      h: 1.4,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
    if (it.source) {
      s.addText(str(it.source), {
        x: x + 0.2,
        y: cellY + cellH - 0.4,
        w: colW - 0.4,
        h: 0.3,
        fontSize: 8,
        italic: true,
        color: MID_GRAY,
        fontFace: "Geist",
      });
    }
  });
}

// 14. MV-TIMELINE-VERTICAL
function renderTimelineVertical(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const spineX = 1.4;
  const topY = y0 + 0.2;
  const bottomY = 6.4;
  s.addShape("rect", {
    x: spineX,
    y: topY,
    w: 0.03,
    h: bottomY - topY,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  const n = items.length || 1;
  const rowH = (bottomY - topY) / n;
  items.forEach((it, k) => {
    const y = topY + k * rowH;
    s.addShape("ellipse", {
      x: spineX - 0.09,
      y: y + 0.15,
      w: 0.21,
      h: 0.21,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText(str(it.date).toUpperCase(), {
      x: 0.4,
      y: y + 0.05,
      w: 0.95,
      h: 0.4,
      fontSize: 10,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 3,
      align: "right",
    });
    s.addText(str(it.label), {
      x: spineX + 0.35,
      y: y + 0.05,
      w: SLIDE_W - spineX - 1.0,
      h: 0.4,
      fontSize: 15,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.body), {
      x: spineX + 0.35,
      y: y + 0.5,
      w: SLIDE_W - spineX - 1.0,
      h: rowH - 0.55,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// 15b. MV-COMPARE-VS-LISTS
function renderCompareVsLists(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  let y0 = drawTitle(s, c, p);
  const sub = str(c.subtitle);
  if (sub) {
    s.addText(sub, {
      x: 0.6,
      y: y0,
      w: SLIDE_W - 1.2,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
    y0 += 0.5;
  }
  const left = (c.left ?? {}) as Record<string, unknown>;
  const right = (c.right ?? {}) as Record<string, unknown>;
  const rows = (o: Record<string, unknown>) =>
    (Array.isArray(o.items) ? (o.items as unknown[]) : [])
      .map((it) =>
        str(typeof it === "string" ? it : ((it ?? {}) as Record<string, unknown>).label),
      )
      .filter(Boolean)
      .slice(0, 8);
  const colW = (SLIDE_W - 1.2 - 1.1) / 2;
  const cols: Array<[Record<string, unknown>, number, string, string]> = [
    [left, 0.6, MID_GRAY, "Option A"],
    [right, 0.6 + colW + 1.1, p.accent, "Option B"],
  ];
  const bodyTop = y0 + 0.75;
  const bodyH = 5.9 - bodyTop;
  cols.forEach(([col, x, tone, fallback]) => {
    s.addText(str(col.label, fallback).toUpperCase(), {
      x,
      y: y0 + 0.05,
      w: colW,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: tone,
      fontFace: "Geist",
      charSpacing: 4,
      align: "center",
    });
    s.addShape("rect", {
      x: x + colW * 0.19,
      y: y0 + 0.46,
      w: colW * 0.62,
      h: 0.03,
      fill: { color: tone },
      line: { color: tone },
    });
    const list = rows(col);
    const rowH = list.length ? Math.min(0.62, bodyH / list.length) : 0;
    list.forEach((label, i) => {
      const ry = bodyTop + i * rowH;
      s.addShape("ellipse", {
        x: x + 0.22,
        y: ry + rowH / 2 - 0.06,
        w: 0.12,
        h: 0.12,
        fill: { color: tone },
        line: { color: tone },
      });
      s.addText(label, {
        x: x + 0.5,
        y: ry,
        w: colW - 0.7,
        h: rowH,
        fontSize: 14,
        bold: true,
        color: p.ink,
        fontFace: "Geist",
        valign: "middle",
      });
      if (i > 0) {
        s.addShape("rect", {
          x: x + 0.22,
          y: ry,
          w: colW - 0.44,
          h: 0.01,
          fill: { color: tone, transparency: 82 },
          line: { color: tone, transparency: 82 },
        });
      }
    });
  });
  // Centre VS disc
  const cx = SLIDE_W / 2;
  const cy = bodyTop + bodyH / 2;
  s.addShape("ellipse", {
    x: cx - 0.45,
    y: cy - 0.45,
    w: 0.9,
    h: 0.9,
    fill: { color: p.accent, transparency: 88 },
    line: { color: p.accent },
  });
  s.addText("VS", {
    x: cx - 0.45,
    y: cy - 0.45,
    w: 0.9,
    h: 0.9,
    fontSize: 18,
    bold: true,
    color: p.ink,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
  });
  // Close band
  const summary = (c.summary ?? {}) as Record<string, unknown>;
  const lead = str(summary.lead);
  const emph = str(summary.emphasis);
  if (lead || emph) {
    s.addShape("rect", {
      x: 0.6,
      y: 6.05,
      w: SLIDE_W - 1.2,
      h: 0.03,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(
      [
        { text: lead ? lead + " " : "", options: { color: p.ink, bold: true } },
        { text: emph, options: { color: p.accent, bold: true } },
      ],
      {
        x: 0.6,
        y: 6.15,
        w: SLIDE_W - 1.2,
        h: 0.5,
        fontSize: 16,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      },
    );
  }
}

// Shared close band used by the process modules below.
function drawCloseBand(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette, y: number) {
  const summary = (c.summary ?? {}) as Record<string, unknown>;
  const lead = str(summary.lead);
  const emph = str(summary.emphasis);
  if (!lead && !emph) return;
  s.addShape("rect", {
    x: 0.6,
    y,
    w: SLIDE_W - 1.2,
    h: 0.03,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(
    [
      { text: lead ? lead + " " : "", options: { color: p.ink, bold: true } },
      { text: emph, options: { color: p.accent, bold: true } },
    ],
    {
      x: 0.6,
      y: y + 0.1,
      w: SLIDE_W - 1.2,
      h: 0.5,
      fontSize: 15,
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    },
  );
}

// Sub-line under the title zone ("question" prompt) — returns the new baseline.
function drawQuestionLine(
  s: PptxGenJS.Slide,
  c: Record<string, unknown>,
  p: Palette,
  y0: number,
): number {
  let y = y0;
  const sub = str(c.subtitle);
  if (sub) {
    s.addText(sub, {
      x: 0.6,
      y,
      w: SLIDE_W - 1.2,
      h: 0.38,
      fontSize: 15,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
    y += 0.44;
  }
  const q = str(c.question);
  if (q) {
    s.addText(q, {
      x: 0.6,
      y,
      w: SLIDE_W - 1.2,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: p.ink,
      fontFace: "Geist",
    });
    y += 0.5;
  }
  return y;
}

// 15d. MV-PROC-LAYER-STACK — arrow-headed architecture lanes.
function renderLayerStack(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawQuestionLine(s, c, p, drawTitle(s, c, p));
  const lanes = arr(c.items).slice(0, 5);
  const tones = [p.accent, "0E7A86", "EC388A", "5B3FBF", "2F7A3C"];
  const bandTop = Math.max(y0, 1.9);
  const bandBottom = 5.95;
  const count = Math.max(lanes.length, 1);
  const gap = 0.16;
  const laneH = (bandBottom - bandTop - gap * (count - 1)) / count;
  const headW = 3.3;
  lanes.forEach((laneRaw, li) => {
    const lane = laneRaw ?? {};
    const tone = tones[li % tones.length];
    const y = bandTop + li * (laneH + gap);
    // Lane body
    s.addShape("roundRect", {
      x: 0.6,
      y,
      w: SLIDE_W - 1.2,
      h: laneH,
      rectRadius: EXPORT_RADIUS_IN.media,
      fill: { color: tone, transparency: 90 },
      line: { color: tone, transparency: 62 },
    });
    // Arrow-headed lane head (pentagon = the direction cue). Deepened tone so
    // the lane label copy stays white and legible in both modes.
    const headTone = mixHex(tone, "03002C", 0.32);
    s.addShape("pentagon", {
      x: 0.6,
      y,
      w: headW,
      h: laneH,
      fill: { color: headTone },
      line: { color: headTone },
    });

    s.addText(str(lane.meta, `Layer ${li + 1}`).toUpperCase(), {
      x: 0.85,
      y: y + laneH * 0.18,
      w: headW - 0.85,
      h: 0.28,
      fontSize: 10,
      bold: true,
      charSpacing: 3,
      color: "FFFFFF",
      fontFace: "Geist",
    });
    s.addText(str(lane.label), {
      x: 0.85,
      y: y + laneH * 0.42,
      w: headW - 0.85,
      h: laneH * 0.5,
      fontSize: 14,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "top",
    });
    const cells = arr(lane.cells).slice(0, 4);
    const cellsX = 0.6 + headW + 0.25;
    const cellsW = SLIDE_W - 0.6 - cellsX - 0.3;
    const cellW = cellsW / Math.max(cells.length, 1);
    cells.forEach((cellRaw, ci) => {
      const cell = cellRaw ?? {};
      const cx = cellsX + ci * cellW;
      s.addText(str(typeof cellRaw === "string" ? cellRaw : cell.label), {
        x: cx + 0.14,
        y,
        w: cellW - 0.28,
        h: laneH,
        fontSize: 12,
        bold: true,
        color: p.ink,
        fontFace: "Geist",
        valign: "middle",
      });
      if (ci > 0) {
        s.addShape("rect", {
          x: cx,
          y: y + laneH * 0.16,
          w: 0.01,
          h: laneH * 0.68,
          fill: { color: tone, transparency: 60 },
          line: { color: tone, transparency: 60 },
        });
      }
    });
  });
  drawCloseBand(s, c, p, 6.05);
}

// 15e. MV-PROC-PROOF-PAIRS — problem → outcome pill pairs.
function renderProofPairs(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  let y0 = drawQuestionLine(s, c, p, drawTitle(s, c, p));
  const before = (c.before ?? {}) as Record<string, unknown>;
  const after = (c.after ?? {}) as Record<string, unknown>;
  const rows = arr(c.items).slice(0, 6);
  const colW = (SLIDE_W - 1.2 - 1.0) / 2;
  const rightX = 0.6 + colW + 1.0;
  if (str(before.label) || str(after.label)) {
    [
      [str(before.label), 0.6, MID_GRAY],
      [str(after.label), rightX, p.accent],
    ].forEach(([label, x, tone]) => {
      if (!label) return;
      s.addText(String(label).toUpperCase(), {
        x: Number(x) + 0.75,
        y: y0,
        w: colW - 0.75,
        h: 0.3,
        fontSize: 10,
        bold: true,
        charSpacing: 3,
        color: String(tone),
        fontFace: "Geist",
      });
    });
    y0 += 0.38;
  }
  const bandTop = Math.max(y0, 1.9);
  const count = Math.max(rows.length, 1);
  const gap = 0.14;
  const rowH = Math.min(0.95, (5.95 - bandTop - gap * (count - 1)) / count);
  rows.forEach((rowRaw, i) => {
    const row = rowRaw ?? {};
    const y = bandTop + i * (rowH + gap);
    const pair: Array<[string, number, string, boolean]> = [
      [str(row.before), 0.6, MID_GRAY, false],
      [str(row.after), rightX, p.accent, true],
    ];
    pair.forEach(([text, x, tone, emphasis]) => {
      const discD = Math.min(0.62, rowH * 0.7);
      s.addShape("roundRect", {
        x: x + discD * 0.55,
        y,
        w: colW - discD * 0.55,
        h: rowH,
        rectRadius: EXPORT_RADIUS_IN.media,
        fill: { color: tone, transparency: emphasis ? 78 : 90 },
        line: { color: tone, transparency: emphasis ? 40 : 62 },
      });
      s.addShape("ellipse", {
        x,
        y: y + (rowH - discD) / 2,
        w: discD,
        h: discD,
        fill: emphasis ? { color: tone } : { color: tone, transparency: 92 },
        line: { color: tone, width: 1.5 },
      });
      s.addText(emphasis ? "\u2713" : "\u2715", {
        x,
        y: y + (rowH - discD) / 2,
        w: discD,
        h: discD,
        fontSize: 16,
        bold: true,
        color: emphasis ? "FFFFFF" : tone,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
      s.addText(text, {
        x: x + discD + 0.2,
        y,
        w: colW - discD - 0.35,
        h: rowH,
        fontSize: 13,
        bold: emphasis,
        color: p.ink,
        fontFace: "Geist",
        valign: "middle",
      });
    });
    // Transition marker between the two pills.
    s.addText("\u00BB", {
      x: 0.6 + colW,
      y,
      w: 1.0,
      h: rowH,
      fontSize: 20,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
  });
  drawCloseBand(s, c, p, 6.05);
}

// 15f. MV-PROC-PLATFORM-LOOP — serpentine capability pipeline + pillars.
function renderPlatformLoop(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawQuestionLine(s, c, p, drawTitle(s, c, p));
  const chips = arr(c.items).slice(0, 16);
  const pillars = arr(c.pillars).slice(0, 3);
  const half = Math.ceil(chips.length / 2) || 1;
  const chipRows = [chips.slice(0, half), chips.slice(half)].filter((r) => r.length);
  const perRow = Math.max(...chipRows.map((r) => r.length), 1);
  const bandTop = Math.max(y0, 1.85);
  const chipH = 0.82;
  const rowGap = 0.3;
  chipRows.forEach((row, ri) => {
    const indent = ri === 1 ? 0.7 : 0;
    const y = bandTop + ri * (chipH + rowGap);
    const usable = SLIDE_W - 1.2 - indent;
    const chipW = (usable - 0.12 * (perRow - 1)) / perRow;
    // Dotted travel rail behind the row.
    s.addShape("line", {
      x: 0.6 + indent,
      y: y + chipH / 2,
      w: usable,
      h: 0,
      line: { color: p.accent, width: 1, dashType: "sysDot", transparency: 45 },
    });
    row.forEach((chipRaw, ci) => {
      const chip = chipRaw ?? {};
      const x = 0.6 + indent + ci * (chipW + 0.12);
      s.addShape("roundRect", {
        x,
        y,
        w: chipW,
        h: chipH,
        rectRadius: EXPORT_RADIUS_IN.chip,
        fill: { color: p.accent, transparency: 92 },
        line: { color: p.accent, transparency: 55 },
      });
      s.addText(str(typeof chipRaw === "string" ? chipRaw : chip.label), {
        x: x + 0.06,
        y,
        w: chipW - 0.12,
        h: chipH,
        fontSize: 10,
        bold: true,
        color: p.ink,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
    });
  });
  if (pillars.length) {
    const py = bandTop + chipRows.length * (chipH + rowGap) + 0.3;
    const tones = [p.accent, "0E7A86", "EC388A"];
    const pw = (SLIDE_W - 1.2 - 0.16 * (pillars.length - 1)) / pillars.length;
    pillars.forEach((pillarRaw, pi) => {
      const pillar = pillarRaw ?? {};
      const tone = tones[pi % tones.length];
      const x = 0.6 + pi * (pw + 0.16);
      s.addShape("roundRect", {
        x,
        y: py,
        w: pw,
        h: 0.72,
        rectRadius: EXPORT_RADIUS_IN.band,
        fill: { color: tone },
        line: { color: tone },
      });
      s.addText(str(typeof pillarRaw === "string" ? pillarRaw : pillar.label), {
        x,
        y: py,
        w: pw,
        h: 0.72,
        fontSize: 15,
        bold: true,
        color: "FFFFFF",
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
    });
  }
  drawCloseBand(s, c, p, 6.15);
}


// 15c. MV-INFO-HUB-PILL-ORBIT
function renderHubPillOrbit(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  let y0 = drawTitle(s, c, p);
  const sub = str(c.subtitle);
  if (sub) {
    s.addText(sub, {
      x: 0.6,
      y: y0,
      w: SLIDE_W - 1.2,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
    y0 += 0.5;
  }
  const hub = (c.hub ?? {}) as Record<string, unknown>;
  const chips = (Array.isArray(c.items) ? (c.items as unknown[]) : [])
    .map((it) => str(typeof it === "string" ? it : ((it ?? {}) as Record<string, unknown>).label))
    .filter(Boolean)
    .slice(0, 12);
  const half = Math.ceil(chips.length / 2);
  const sides: Array<[string[], "left" | "right"]> = [
    [chips.slice(0, half), "left"],
    [chips.slice(half), "right"],
  ];
  const bodyTop = y0 + 0.35;
  const bodyH = 5.95 - bodyTop;
  const cx = SLIDE_W / 2;
  const cy = bodyTop + bodyH / 2;
  // Hub disc — matches the on-screen OrbitDisc proportions.
  const discD = chips.length >= 10 ? 1.7 : chips.length >= 8 ? 1.85 : 2.0;
  const clearR = (discD * 1.347) / 2 + 0.1;
  s.addShape("ellipse", {
    x: cx - (discD * 1.347) / 2,
    y: cy - (discD * 1.347) / 2,
    w: discD * 1.347,
    h: discD * 1.347,
    fill: { color: p.accent, transparency: 94 },
    line: { color: p.accent, transparency: 72, dashType: "dash" },
  });
  s.addShape("ellipse", {
    x: cx - discD / 2,
    y: cy - discD / 2,
    w: discD,
    h: discD,
    fill: { color: p.accent, transparency: 82 },
    line: { color: p.accent },
  });
  s.addText(
    [
      { text: str(hub.title), options: { fontSize: 20, bold: true, color: p.ink, breakLine: true } },
      {
        text: str(hub.subtitle).toUpperCase(),
        options: { fontSize: 10, bold: true, color: p.accent, charSpacing: 3 },
      },
    ],
    {
      x: cx - discD / 2,
      y: cy - discD / 2,
      w: discD,
      h: discD,
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    },
  );
  const pillW = 2.35;
  const pillH = Math.min(0.46, bodyH / Math.max(half, 1) - 0.12);
  sides.forEach(([list, side]) => {
    const total = list.length || 1;
    const step = total > 1 ? Math.min(pillH + 0.2, (bodyH - pillH) / (total - 1)) : 0;
    list.forEach((label, i) => {
      const dy = (i - (total - 1) / 2) * step;
      const inside = clearR * clearR - dy * dy;
      const edge = Math.max(inside > 0 ? Math.sqrt(inside) : 0, clearR * 0.34) + 0.22;
      const x = side === "left" ? cx - edge - pillW : cx + edge;
      const y = cy + dy - pillH / 2;
      s.addShape("roundRect", {
        x,
        y,
        w: pillW,
        h: pillH,
        rectRadius: pillRadiusIn(pillH),
        fill: { color: p.accent, transparency: 90 },
        line: { color: p.accent, transparency: 62 },
      });
      s.addText(label, {
        x: x + 0.14,
        y,
        w: pillW - 0.28,
        h: pillH,
        fontSize: 13,
        bold: true,
        color: p.ink,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
      // Hand-off tick toward the hub.
      s.addShape("rect", {
        x: side === "left" ? x + pillW : cx + edge - 0.18,
        y: y + pillH / 2 - 0.005,
        w: 0.18,
        h: 0.01,
        fill: { color: p.accent, transparency: 45 },
        line: { color: p.accent, transparency: 45 },
      });
    });
  });
  const summary = (c.summary ?? {}) as Record<string, unknown>;
  const lead = str(summary.lead);
  const emph = str(summary.emphasis);
  if (lead || emph) {
    s.addShape("rect", {
      x: 0.6,
      y: 6.05,
      w: SLIDE_W - 1.2,
      h: 0.03,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(
      [
        { text: lead ? lead + " " : "", options: { color: p.ink, bold: true } },
        { text: emph, options: { color: p.accent, bold: true } },
      ],
      {
        x: 0.6,
        y: 6.15,
        w: SLIDE_W - 1.2,
        h: 0.5,
        fontSize: 16,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      },
    );
  }
}

// 15. MV-COMPARE-SLIDER
function renderCompareSlider(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const before = (c.before ?? {}) as Record<string, unknown>;
  const after = (c.after ?? {}) as Record<string, unknown>;
  const cellY = y0 + 0.2;
  const cellH = 6.2 - cellY;
  const midX = SLIDE_W / 2;
  // Before (left) - muted
  s.addText(str(before.label).toUpperCase(), {
    x: 0.6,
    y: cellY,
    w: midX - 0.9,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: MID_GRAY,
    fontFace: "Geist",
    charSpacing: 4,
  });
  s.addText(`${str(before.value)}${str(before.unit)}`, {
    x: 0.6,
    y: cellY + 0.5,
    w: midX - 0.9,
    h: 2.4,
    fontSize: 84,
    bold: true,
    color: DARK_GRAY,
    fontFace: "Geist",
  });
  s.addText(str(before.body), {
    x: 0.6,
    y: cellY + 3.2,
    w: midX - 0.9,
    h: cellH - 3.4,
    fontSize: 12,
    color: MID_GRAY,
    fontFace: "Geist",
    valign: "top",
  });
  // Divider line
  s.addShape("rect", {
    x: midX - 0.01,
    y: cellY + 0.2,
    w: 0.02,
    h: cellH - 0.4,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  // Arrow marker
  const arrowY = cellY + cellH / 2;
  s.addShape("ellipse", {
    x: midX - 0.25,
    y: arrowY - 0.25,
    w: 0.5,
    h: 0.5,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText("→", {
    x: midX - 0.25,
    y: arrowY - 0.25,
    w: 0.5,
    h: 0.5,
    fontSize: 20,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    align: "center",
    valign: "middle",
  });
  // After (right) - full color, accent top rule
  s.addShape("rect", {
    x: midX + 0.3,
    y: cellY,
    w: SLIDE_W - midX - 0.9,
    h: 0.03,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(str(after.label).toUpperCase(), {
    x: midX + 0.3,
    y: cellY + 0.1,
    w: SLIDE_W - midX - 0.9,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 4,
  });
  s.addText(`${str(after.value)}${str(after.unit)}`, {
    x: midX + 0.3,
    y: cellY + 0.55,
    w: SLIDE_W - midX - 0.9,
    h: 2.7,
    fontSize: 110,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(str(after.body), {
    x: midX + 0.3,
    y: cellY + 3.4,
    w: SLIDE_W - midX - 0.9,
    h: cellH - 3.6,
    fontSize: 13,
    color: p.ink,
    fontFace: "Geist",
    valign: "top",
  });
}

// 16. MV-PULL-QUOTE-STACK
function renderPullQuoteStack(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const hero = (c.hero ?? {}) as Record<string, unknown>;
  const items = arr(c.items).slice(0, 2);
  // Decorative quote mark
  s.addText("\u201C", {
    x: 0.4,
    y: 0.2,
    w: 2.5,
    h: 2.5,
    fontSize: 240,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    transparency: 70,
  } as unknown as PptxGenJS.TextPropsOptions);
  s.addText(str(hero.quote), {
    x: 0.8,
    y: 1.0,
    w: SLIDE_W - 1.6,
    h: 3.4,
    fontSize: 32,
    italic: true,
    color: p.primary,
    fontFace: "Geist",
    valign: "middle",
  });
  const attrParts = [str(hero.name), str(hero.role), str(hero.org)].filter(Boolean);
  s.addText(attrParts.join(" · ").toUpperCase(), {
    x: 0.8,
    y: 4.4,
    w: SLIDE_W - 1.6,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.ink,
    fontFace: "Geist",
    charSpacing: 4,
  });
  // Divider
  s.addShape("rect", {
    x: 0.8,
    y: 5.0,
    w: SLIDE_W - 1.6,
    h: 0.01,
    fill: { color: LIGHT_GRAY },
    line: { color: LIGHT_GRAY },
  });
  // Two smaller quotes
  const smallW = (SLIDE_W - 1.6 - 0.4) / 2;
  items.forEach((it, k) => {
    const x = 0.8 + k * (smallW + 0.4);
    s.addText(`"${str(it.quote)}"`, {
      x,
      y: 5.2,
      w: smallW,
      h: 1.2,
      fontSize: 14,
      italic: true,
      color: p.primary,
      fontFace: "Geist",
      valign: "top",
    });
    const parts = [str(it.name), str(it.role), str(it.org)].filter(Boolean);
    s.addText(parts.join(" · ").toUpperCase(), {
      x,
      y: 6.5,
      w: smallW,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: p.ink,
      fontFace: "Geist",
      charSpacing: 3,
    });
    if (k === 0 && items.length > 1) {
      s.addShape("rect", {
        x: x + smallW + 0.19,
        y: 5.2,
        w: 0.01,
        h: 1.5,
        fill: { color: LIGHT_GRAY },
        line: { color: LIGHT_GRAY },
      });
    }
  });
}

// 17. MV-DEFINITION
function renderDefinition(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const term = str(c.term);
  const pronunciation = str(c.pronunciation);
  const pos = str(c.partOfSpeech);
  const definition = str(c.definition);
  const usage = str(c.usage);
  s.addText(term, {
    x: 0.8,
    y: 1.2,
    w: SLIDE_W - 1.6,
    h: 1.6,
    fontSize: 48,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(
    [
      { text: pronunciation, options: { color: MID_GRAY, charSpacing: 3 } },
      { text: pos ? `   ${pos}` : "", options: { italic: true, color: p.accent, bold: true } },
    ],
    {
      x: 0.8,
      y: 2.9,
      w: SLIDE_W - 1.6,
      h: 0.4,
      fontSize: 14,
      fontFace: "Geist",
    },
  );
  s.addText(definition, {
    x: 0.8,
    y: 3.6,
    w: SLIDE_W - 1.6,
    h: 2.0,
    fontSize: 22,
    color: p.ink,
    fontFace: "Geist",
    valign: "top",
  });
  s.addShape("rect", {
    x: 0.8,
    y: 5.9,
    w: 3.0,
    h: 0.01,
    fill: { color: LIGHT_GRAY },
    line: { color: LIGHT_GRAY },
  });
  s.addText(usage, {
    x: 0.8,
    y: 6.0,
    w: SLIDE_W - 1.6,
    h: 0.8,
    fontSize: 14,
    italic: true,
    color: MID_GRAY,
    fontFace: "Geist",
  });
}

// 18. MV-PRINCIPLES
function renderPrinciples(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  if (!items.length) return;
  const rowH = (6.2 - y0) / items.length;
  items.forEach((it, k) => {
    const y = y0 + k * rowH;
    if (k > 0) {
      s.addShape("rect", {
        x: 0.6,
        y,
        w: SLIDE_W - 1.2,
        h: 0.01,
        fill: { color: LIGHT_GRAY },
        line: { color: LIGHT_GRAY },
      });
    }
    // Oversized numeral behind
    s.addText(String(k + 1).padStart(2, "0"), {
      x: 0.6,
      y: y + 0.05,
      w: 2.4,
      h: rowH - 0.1,
      fontSize: 96,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      transparency: 82,
    } as unknown as PptxGenJS.TextPropsOptions);
    s.addText(str(it.statement), {
      x: 3.0,
      y: y + 0.15,
      w: SLIDE_W - 3.6,
      h: 0.7,
      fontSize: 26,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.body), {
      x: 3.0,
      y: y + 0.95,
      w: SLIDE_W - 3.6,
      h: rowH - 1.05,
      fontSize: 13,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// 19. MV-COUNTDOWN (dark)
function renderCountdown(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const kicker = str(c.kicker);
  const title = str(c.title);
  const items = arr(c.items).slice(0, 3);
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.8,
      y: 0.7,
      w: SLIDE_W - 1.6,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 5,
    });
  }
  if (title) {
    s.addText(title, {
      x: 0.8,
      y: 1.15,
      w: SLIDE_W - 1.6,
      h: 1.0,
      fontSize: 30,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
    });
  }
  const startY = 2.5;
  const rowH = (6.2 - startY) / Math.max(items.length, 1);
  items.forEach((it, k) => {
    const y = startY + k * rowH;
    const numeral = String(items.length - k); // 3, 2, 1
    if (k > 0) {
      s.addShape("rect", {
        x: 0.8,
        y,
        w: SLIDE_W - 1.6,
        h: 0.01,
        fill: { color: "FFFFFF", transparency: 80 },
        line: { color: "FFFFFF", transparency: 80 },
      });
    }
    s.addText(numeral, {
      x: 0.8,
      y: y + 0.1,
      w: 2.0,
      h: rowH - 0.2,
      fontSize: 110,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
    s.addText(str(it.statement), {
      x: 3.0,
      y: y + 0.2,
      w: SLIDE_W - 3.6,
      h: 0.8,
      fontSize: 24,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
    });
    s.addText(str(it.body), {
      x: 3.0,
      y: y + 1.05,
      w: SLIDE_W - 3.6,
      h: rowH - 1.15,
      fontSize: 13,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "top",
      transparency: 20,
    } as unknown as PptxGenJS.TextPropsOptions);
  });
}

// 20. MV-HORIZON
function renderHorizon(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  if (!items.length) return;
  const bandH = (6.3 - y0) / items.length;
  const headlineColors = [p.primary, "4B5563", "9CA3AF"];
  const labelColors = [p.accent, "6B7280", "9CA3AF"];
  items.forEach((it, k) => {
    const y = y0 + k * bandH;
    if (k > 0) {
      s.addShape("rect", {
        x: 0.6,
        y,
        w: SLIDE_W - 1.2,
        h: 0.01,
        fill: { color: LIGHT_GRAY },
        line: { color: LIGHT_GRAY },
      });
    }
    s.addText(str(it.label).toUpperCase(), {
      x: 0.6,
      y: y + 0.2,
      w: 2.0,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: labelColors[k] ?? p.ink,
      fontFace: "Geist",
      charSpacing: 5,
    });
    s.addText(str(it.headline), {
      x: 2.8,
      y: y + 0.15,
      w: SLIDE_W - 3.4,
      h: 0.7,
      fontSize: 22,
      bold: true,
      color: headlineColors[k] ?? p.ink,
      fontFace: "Geist",
    });
    s.addText(str(it.body), {
      x: 2.8,
      y: y + 0.9,
      w: SLIDE_W - 3.4,
      h: bandH - 1.05,
      fontSize: 12,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ────────────────── Advanced variant renderers (Batch 3 — dashboard) ──────────────────

function numArr(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "number" ? x : Number(x))).filter((n) => Number.isFinite(n));
}
function num(v: unknown, fb = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fb;
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

// ── MV-DASH-SUMMARY ──
function renderDashSummary(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const primary = obj(c.primary);
  const secondary = obj(c.secondary);
  const balance = obj(c.balance);
  const bItems = arr(balance.items);
  const colW = 5.9;
  const rightX = 6.9;
  // Left column: two stat cards stacked
  [primary, secondary].forEach((card, i) => {
    const cy = y0 + i * 2.6;
    s.addShape("rect", {
      x: 0.6,
      y: cy,
      w: 2.2,
      h: 0.04,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(card.label).toUpperCase(), {
      x: 0.6,
      y: cy + 0.15,
      w: colW,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: DARK_GRAY,
      charSpacing: 3,
      fontFace: "Geist",
    });
    s.addText(`${str(card.value)}${str(card.unit) ? ` ${str(card.unit)}` : ""}`, {
      x: 0.6,
      y: cy + 0.5,
      w: colW,
      h: 1.1,
      fontSize: 60,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    // Sparkline via native line chart
    const series = numArr(card.series);
    if (series.length >= 2) {
      try {
        s.addChart(
          "line" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
          [{ name: "series", labels: series.map((_, i) => String(i + 1)), values: series }],
          {
            x: 0.6,
            y: cy + 1.7,
            w: colW,
            h: 0.7,
            chartColors: [p.accent],
            lineSize: 2,
            showLegend: false,
            showTitle: false,
            catAxisHidden: true,
            valAxisHidden: true,
            showValue: false,
          },
        );
      } catch {
        /* no-op */
      }
    }
  });
  // Right: balance panel
  s.addShape("rect", {
    x: rightX,
    y: y0,
    w: 2.2,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText("BALANCE", {
    x: rightX,
    y: y0 + 0.15,
    w: colW,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: p.accent,
    charSpacing: 3,
    fontFace: "Geist",
  });
  s.addText(`${str(balance.value)}${str(balance.unit) ? ` ${str(balance.unit)}` : ""}`, {
    x: rightX,
    y: y0 + 0.55,
    w: colW,
    h: 1.6,
    fontSize: 96,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(str(balance.label), {
    x: rightX,
    y: y0 + 2.2,
    w: colW,
    h: 0.4,
    fontSize: 14,
    color: DARK_GRAY,
    fontFace: "Geist",
  });
  bItems.slice(0, 4).forEach((it, i) => {
    const ry = y0 + 2.9 + i * 0.55;
    s.addShape("line", { x: rightX, y: ry, w: colW, h: 0, line: { color: LIGHT_GRAY, width: 1 } });
    s.addText(str(it.label).toUpperCase(), {
      x: rightX,
      y: ry + 0.08,
      w: colW - 1.5,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: DARK_GRAY,
      charSpacing: 3,
      fontFace: "Geist",
    });
    s.addText(str(it.value), {
      x: rightX + colW - 1.5,
      y: ry + 0.05,
      w: 1.5,
      h: 0.4,
      fontSize: 18,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "right",
    });
  });
}

// ── MV-DASH-DONUT-TRIO ──
function renderDashDonutTrio(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  const colW = (SLIDE_W - 1.2) / Math.max(items.length, 1);
  items.forEach((it, i) => {
    const cx = 0.6 + i * colW;
    const pct = Math.max(0, Math.min(100, num(it.value)));
    s.addShape("rect", {
      x: cx,
      y: y0,
      w: colW - 0.4,
      h: 0.04,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    try {
      s.addChart(
        "doughnut" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
        [{ name: "d", labels: ["value", "rest"], values: [pct, 100 - pct] }],
        {
          x: cx + (colW - 3) / 2,
          y: y0 + 0.3,
          w: 3,
          h: 3,
          chartColors: [p.accent, LIGHT_GRAY],
          showLegend: false,
          showTitle: false,
          dataLabelPosition: "outEnd",
          showValue: false,
          holeSize: 70,
        },
      );
    } catch {
      /* no-op */
    }
    s.addText(`${Math.round(pct)}%`, {
      x: cx,
      y: y0 + 1.4,
      w: colW - 0.4,
      h: 0.8,
      fontSize: 36,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.label).toUpperCase(), {
      x: cx,
      y: y0 + 3.5,
      w: colW - 0.4,
      h: 0.35,
      fontSize: 12,
      bold: true,
      color: p.primary,
      charSpacing: 3,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.body), {
      x: cx + 0.2,
      y: y0 + 3.9,
      w: colW - 0.8,
      h: 1.2,
      fontSize: 12,
      color: DARK_GRAY,
      fontFace: "Geist",
      align: "center",
    });
  });
}

// ── MV-DASH-SALES-CHART ──
function renderDashSalesChart(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const series = arr(c.series).map((pt) => ({ label: str(pt.label), value: num(pt.value) }));
  const stat = obj(c.stat);
  const chartW = 8.0;
  try {
    s.addChart(
      "line" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "series", labels: series.map((p) => p.label), values: series.map((p) => p.value) }],
      {
        x: 0.6,
        y: y0 + 0.1,
        w: chartW,
        h: 4.6,
        chartColors: [p.accent],
        lineSize: 3,
        showLegend: false,
        showTitle: false,
        catAxisLabelFontFace: "Inter",
        catAxisLabelFontSize: 10,
        catAxisLabelColor: DARK_GRAY,
        valAxisLabelFontFace: "Inter",
        valAxisLabelFontSize: 10,
        valAxisLabelColor: DARK_GRAY,
        showValue: false,
      },
    );
  } catch {
    /* no-op */
  }
  const rx = 9.0;
  s.addShape("rect", {
    x: rx,
    y: y0,
    w: 2.0,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(str(c.kicker).toUpperCase(), {
    x: rx,
    y: y0 + 0.15,
    w: 3.5,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: p.accent,
    charSpacing: 3,
    fontFace: "Geist",
  });
  s.addText(str(c.headline), {
    x: rx,
    y: y0 + 0.5,
    w: 3.7,
    h: 1.8,
    fontSize: 22,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(`${str(stat.value)}${str(stat.unit) ? ` ${str(stat.unit)}` : ""}`, {
    x: rx,
    y: y0 + 2.5,
    w: 3.7,
    h: 1.0,
    fontSize: 44,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(str(stat.label), {
    x: rx,
    y: y0 + 3.4,
    w: 3.7,
    h: 0.4,
    fontSize: 12,
    color: DARK_GRAY,
    fontFace: "Geist",
  });
  if (str(stat.delta)) {
    s.addText(str(stat.delta).toUpperCase(), {
      x: rx,
      y: y0 + 3.9,
      w: 3.7,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: p.accent,
      charSpacing: 3,
      fontFace: "Geist",
    });
  }
}

// ── MV-DASH-GAUGE-ROW ──
function renderDashGaugeRow(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  const cols = Math.max(items.length, 1);
  const colW = (SLIDE_W - 1.2) / cols;
  const gaugeSize = Math.min(2.6, colW - 0.4);
  items.forEach((it, i) => {
    const cx = 0.6 + i * colW;
    const pct = Math.max(0, Math.min(100, num(it.value)));
    try {
      // Half-doughnut simulated via doughnut chart with 50% invisible bottom
      s.addChart(
        "doughnut" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
        [{ name: "g", labels: ["v", "r", "hidden"], values: [pct / 2, (100 - pct) / 2, 50] }],
        {
          x: cx + (colW - gaugeSize) / 2,
          y: y0 + 0.3,
          w: gaugeSize,
          h: gaugeSize,
          chartColors: [p.accent, LIGHT_GRAY, "FFFFFF"],
          chartColorsOpacity: 100,
          showLegend: false,
          showTitle: false,
          holeSize: 65,
          firstSliceAng: 270,
        },
      );
    } catch {
      /* no-op */
    }
    s.addText(`${Math.round(pct)}%`, {
      x: cx,
      y: y0 + gaugeSize * 0.55,
      w: colW,
      h: 0.7,
      fontSize: 32,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.label).toUpperCase(), {
      x: cx + 0.1,
      y: y0 + gaugeSize + 0.5,
      w: colW - 0.2,
      h: 0.5,
      fontSize: 11,
      bold: true,
      color: DARK_GRAY,
      charSpacing: 3,
      fontFace: "Geist",
      align: "center",
    });
  });
}

// ── MV-DASH-PERFORMANCE ──
function renderDashPerformance(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const bars = arr(c.bars).map((b) => ({ label: str(b.label), value: num(b.value) }));
  const stat = obj(c.stat);
  const legend = arr(c.legend);
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "bars", labels: bars.map((b) => b.label), values: bars.map((b) => b.value) }],
      {
        x: 0.6,
        y: y0 + 0.1,
        w: 6.6,
        h: 4.6,
        barDir: "col",
        chartColors: [p.primary],
        showLegend: false,
        showTitle: false,
        catAxisLabelFontFace: "Inter",
        catAxisLabelFontSize: 10,
        valAxisLabelFontFace: "Inter",
        valAxisLabelFontSize: 10,
      },
    );
  } catch {
    /* no-op */
  }
  const rx = 7.6;
  s.addText(`${str(stat.value)}${str(stat.unit) ? ` ${str(stat.unit)}` : ""}`, {
    x: rx,
    y: y0 + 0.3,
    w: 5.0,
    h: 1.6,
    fontSize: 72,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(str(stat.label), {
    x: rx,
    y: y0 + 1.9,
    w: 5.0,
    h: 0.5,
    fontSize: 13,
    color: DARK_GRAY,
    fontFace: "Geist",
  });
  legend.slice(0, 4).forEach((l, i) => {
    const ry = y0 + 2.7 + i * 0.55;
    s.addShape("line", { x: rx, y: ry, w: 5.0, h: 0, line: { color: LIGHT_GRAY, width: 1 } });
    s.addShape("rect", {
      x: rx,
      y: ry + 0.18,
      w: 0.2,
      h: 0.2,
      fill: { color: i === 0 ? p.accent : p.primary },
      line: { color: i === 0 ? p.accent : p.primary },
    });
    s.addText(str(l.label), {
      x: rx + 0.35,
      y: ry + 0.1,
      w: 3.0,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(l.value), {
      x: rx + 3.4,
      y: ry + 0.1,
      w: 1.6,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: DARK_GRAY,
      fontFace: "Geist",
      align: "right",
    });
  });
}

// ── MV-DASH-REPORT-CARDS ──
function renderDashReportCards(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 2);
  const cardW = 5.9;
  items.forEach((it, i) => {
    const cx = 0.6 + i * 6.4;
    const g = groupScope(s, `report-${i}`, `Report card ${i + 1}`);
    const delta = str(it.delta);
    const negative = delta.trim().startsWith("-");
    g.addShape("rect", {
      x: cx,
      y: y0,
      w: 2.2,
      h: 0.04,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    g.addText(negative ? "REDUCTION" : "GROWTH", {
      x: cx,
      y: y0 + 0.15,
      w: cardW,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: negative ? "E53D2E" : p.accent,
      charSpacing: 3,
      fontFace: "Geist",
    });
    g.addText(delta, {
      x: cx,
      y: y0 + 0.55,
      w: cardW,
      h: 1.6,
      fontSize: 66,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    g.addText(str(it.label), {
      x: cx,
      y: y0 + 2.2,
      w: cardW,
      h: 0.9,
      fontSize: 15,
      color: DARK_GRAY,
      fontFace: "Geist",
    });
    const series = numArr(it.series);
    if (series.length >= 2) {
      try {
        g.addChart(
          "line" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
          [{ name: "s", labels: series.map((_, k) => String(k + 1)), values: series }],
          {
            x: cx,
            y: y0 + 3.3,
            w: cardW,
            h: 1.1,
            chartColors: [p.accent],
            lineSize: 2,
            showLegend: false,
            showTitle: false,
            catAxisHidden: true,
            valAxisHidden: true,
            showValue: false,
          },
        );
      } catch {
        /* no-op */
      }
    }
    g.addText(str(it.meta).toUpperCase(), {
      x: cx,
      y: y0 + 4.5,
      w: cardW,
      h: 0.35,
      fontSize: 10,
      bold: true,
      color: MID_GRAY,
      charSpacing: 3,
      fontFace: "Geist",
    });
  });
  // vertical hairline divider
  s.addShape("line", { x: 6.55, y: y0, w: 0, h: 4.8, line: { color: LIGHT_GRAY, width: 1 } });
}

// ── MV-DASH-GROWTH-COLUMNS ──
function renderDashGrowthColumns(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [
        {
          name: "growth",
          labels: items.map((it) => str(it.year)),
          values: items.map((it) => num(it.value)),
        },
      ],
      {
        x: 0.6,
        y: y0 + 0.4,
        w: SLIDE_W - 1.2,
        h: 4.6,
        barDir: "col",
        chartColors: [p.primary],
        showLegend: false,
        showTitle: false,
        catAxisLabelFontFace: "Inter",
        catAxisLabelFontSize: 12,
        catAxisLabelColor: DARK_GRAY,
        valAxisLabelFontFace: "Inter",
        valAxisLabelFontSize: 10,
        valAxisLabelColor: DARK_GRAY,
        showValue: true,
        dataLabelFontFace: "Inter",
        dataLabelFontSize: 12,
        dataLabelColor: p.primary,
        dataLabelPosition: "outEnd",
      },
    );
  } catch {
    /* no-op */
  }
  // Highlight final column with accent overlay by drawing a tag above it
  if (items.length > 0) {
    const last = items[items.length - 1];
    const cellW = (SLIDE_W - 1.2) / items.length;
    const cx = 0.6 + (items.length - 1) * cellW + cellW * 0.5 - 1;
    s.addText(`${str(last.value)}${str(last.unit) ? ` ${str(last.unit)}` : ""}`, {
      x: cx,
      y: y0 + 0.05,
      w: 2,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
    });
  }
}

// ── MV-DASH-BREAKDOWN ──
function renderDashBreakdown(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 4);
  const rowH = Math.min(1.35, (5.5 - y0) / Math.max(items.length, 1));
  items.forEach((it, i) => {
    const ry = y0 + i * rowH;
    const delta = str(it.delta);
    const negative = delta.trim().startsWith("-");
    const pct = Math.max(0, Math.min(100, num(it.percent)));
    s.addShape("line", {
      x: 0.6,
      y: ry,
      w: SLIDE_W - 1.2,
      h: 0,
      line: { color: LIGHT_GRAY, width: 1 },
    });
    s.addText(str(it.label), {
      x: 0.6,
      y: ry + 0.15,
      w: 5.0,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    if (delta)
      s.addText(delta.toUpperCase(), {
        x: 5.6,
        y: ry + 0.2,
        w: 1.6,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: negative ? "E53D2E" : p.accent,
        charSpacing: 3,
        fontFace: "Geist",
      });
    s.addText(`${str(it.value)}${str(it.unit) ? ` ${str(it.unit)}` : ""}`, {
      x: 8.5,
      y: ry + 0.05,
      w: 4.2,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "right",
    });
    // progress bar
    const barY = ry + rowH - 0.35;
    const barW = SLIDE_W - 1.2 - 0.8;
    s.addShape("rect", {
      x: 0.6,
      y: barY,
      w: barW,
      h: 0.12,
      fill: { color: LIGHT_GRAY },
      line: { color: LIGHT_GRAY },
    });
    s.addShape("rect", {
      x: 0.6,
      y: barY,
      w: (barW * pct) / 100,
      h: 0.12,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(`${pct}%`, {
      x: SLIDE_W - 1.2 - 0.6,
      y: barY - 0.08,
      w: 0.6,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "right",
    });
  });
}

// ── MV-DASH-REGION-STATS ──
function renderDashRegionStats(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const stat = obj(c.stat);
  const items = arr(c.items).slice(0, 6);
  s.addShape("rect", {
    x: 0.6,
    y: y0,
    w: 2.2,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(`${str(stat.value)}${str(stat.unit) ? ` ${str(stat.unit)}` : ""}`, {
    x: 0.6,
    y: y0 + 0.4,
    w: 5.5,
    h: 2.6,
    fontSize: 120,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(str(stat.label).toUpperCase(), {
    x: 0.6,
    y: y0 + 3.2,
    w: 5.5,
    h: 0.5,
    fontSize: 12,
    bold: true,
    color: DARK_GRAY,
    charSpacing: 3,
    fontFace: "Geist",
  });
  const rx = 6.8;
  const rowH = Math.min(0.85, (5.5 - y0) / Math.max(items.length, 1));
  items.forEach((it, i) => {
    const ry = y0 + i * rowH;
    const delta = str(it.delta);
    const negative = delta.trim().startsWith("-");
    const pct = Math.max(0, Math.min(100, num(it.percent)));
    s.addShape("line", {
      x: rx,
      y: ry,
      w: SLIDE_W - rx - 0.6,
      h: 0,
      line: { color: LIGHT_GRAY, width: 1 },
    });
    s.addText(str(it.label), {
      x: rx,
      y: ry + 0.1,
      w: 4.0,
      h: 0.4,
      fontSize: 15,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    if (delta)
      s.addText(delta.toUpperCase(), {
        x: SLIDE_W - 2.0,
        y: ry + 0.13,
        w: 1.4,
        h: 0.35,
        fontSize: 11,
        bold: true,
        color: negative ? "E53D2E" : p.accent,
        charSpacing: 3,
        fontFace: "Geist",
        align: "right",
      });
    const barW = SLIDE_W - rx - 0.6;
    s.addShape("rect", {
      x: rx,
      y: ry + rowH - 0.22,
      w: barW,
      h: 0.08,
      fill: { color: LIGHT_GRAY },
      line: { color: LIGHT_GRAY },
    });
    s.addShape("rect", {
      x: rx,
      y: ry + rowH - 0.22,
      w: (barW * pct) / 100,
      h: 0.08,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
  });
}

// ────────────────── Advanced variant renderers (Batch 4 — graph) ──────────────────

// ── MV-GRAPH-YEAR-SERIES ──
function renderGraphYearSeries(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  // left rail
  s.addShape("rect", {
    x: 0.6,
    y: y0,
    w: 2.0,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(str(c.kicker || "Trend").toUpperCase(), {
    x: 0.6,
    y: y0 + 0.15,
    w: 3.4,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: p.accent,
    charSpacing: 3,
    fontFace: "Geist",
  });
  s.addText(str(c.headline), {
    x: 0.6,
    y: y0 + 0.55,
    w: 3.4,
    h: 3.6,
    fontSize: 22,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    valign: "top",
  });
  // bars via native chart
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [
        {
          name: "years",
          labels: items.map((it) => str(it.year)),
          values: items.map((it) => num(it.value)),
        },
      ],
      {
        x: 4.2,
        y: y0 + 0.1,
        w: SLIDE_W - 4.8,
        h: 4.6,
        barDir: "col",
        chartColors: [p.primary],
        showLegend: false,
        showTitle: false,
        catAxisLabelFontFace: "Inter",
        catAxisLabelFontSize: 11,
        catAxisLabelColor: DARK_GRAY,
        valAxisLabelFontFace: "Inter",
        valAxisLabelFontSize: 10,
        valAxisLabelColor: DARK_GRAY,
        showValue: true,
        dataLabelFontFace: "Inter",
        dataLabelFontSize: 10,
        dataLabelColor: p.primary,
        dataLabelPosition: "outEnd",
      },
    );
  } catch {
    /* no-op */
  }
  // accent tag over last year
  if (items.length) {
    const cellW = (SLIDE_W - 4.8) / items.length;
    const cx = 4.2 + (items.length - 1) * cellW + cellW / 2 - 1;
    const last = items[items.length - 1];
    s.addText(`${str(last.value)}${str(last.unit) ? ` ${str(last.unit)}` : ""}`, {
      x: cx,
      y: y0 - 0.05,
      w: 2,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
    });
  }
}

// ── MV-GRAPH-AXIS-BARS ──
function renderGraphAxisBars(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const bars = arr(c.bars);
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [
        {
          name: "monthly",
          labels: bars.map((b) => str(b.label)),
          values: bars.map((b) => num(b.value)),
        },
      ],
      {
        x: 0.6,
        y: y0 + 0.1,
        w: SLIDE_W - 1.2,
        h: 4.4,
        barDir: "col",
        chartColors: [p.primary],
        showLegend: false,
        showTitle: false,
        catAxisLabelFontFace: "Inter",
        catAxisLabelFontSize: 11,
        valAxisLabelFontFace: "Inter",
        valAxisLabelFontSize: 10,
        valAxisLabelColor: DARK_GRAY,
        valGridLine: { style: "solid", size: 1, color: LIGHT_GRAY },
        showValue: false,
      },
    );
  } catch {
    /* no-op */
  }
  if (str(c.legend)) {
    s.addShape("rect", {
      x: 0.6,
      y: y0 + 4.7,
      w: 0.2,
      h: 0.2,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(c.legend).toUpperCase(), {
      x: 0.9,
      y: y0 + 4.65,
      w: SLIDE_W - 1.5,
      h: 0.35,
      fontSize: 11,
      bold: true,
      color: DARK_GRAY,
      charSpacing: 3,
      fontFace: "Geist",
    });
  }
}

// ── MV-GRAPH-CATEGORY-BARS ──
function renderGraphCategoryBars(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const stat = obj(c.stat);
  try {
    s.addChart(
      "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [
        {
          name: "cats",
          labels: items.map((it) => str(it.label)),
          values: items.map((it) => num(it.value)),
        },
      ],
      {
        x: 0.6,
        y: y0 + 0.1,
        w: 8.0,
        h: 4.6,
        barDir: "bar",
        chartColors: [p.primary],
        showLegend: false,
        showTitle: false,
        catAxisLabelFontFace: "Inter",
        catAxisLabelFontSize: 12,
        valAxisLabelFontFace: "Inter",
        valAxisLabelFontSize: 10,
        showValue: true,
        dataLabelFontFace: "Inter",
        dataLabelFontSize: 11,
        dataLabelColor: p.primary,
        dataLabelPosition: "outEnd",
      },
    );
  } catch {
    /* no-op */
  }
  const rx = 9.0;
  s.addShape("rect", {
    x: rx,
    y: y0,
    w: 2.0,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(`${str(stat.value)}${str(stat.unit) ? ` ${str(stat.unit)}` : ""}`, {
    x: rx,
    y: y0 + 0.4,
    w: 3.7,
    h: 2.4,
    fontSize: 96,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(str(stat.label).toUpperCase(), {
    x: rx,
    y: y0 + 3.0,
    w: 3.7,
    h: 0.5,
    fontSize: 12,
    bold: true,
    color: DARK_GRAY,
    charSpacing: 3,
    fontFace: "Geist",
  });
}

// ── MV-GRAPH-DUAL-DONUT ──
function renderGraphDualDonut(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 2);
  items.forEach((it, i) => {
    const cx = 0.6 + i * 6.4;
    const cardW = 5.9;
    const pct = Math.max(0, Math.min(100, num(it.value)));
    s.addShape("rect", {
      x: cx,
      y: y0,
      w: 2.0,
      h: 0.04,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(it.meta).toUpperCase(), {
      x: cx,
      y: y0 + 0.15,
      w: cardW,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: p.accent,
      charSpacing: 3,
      fontFace: "Geist",
    });
    try {
      s.addChart(
        "doughnut" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
        [{ name: "d", labels: ["v", "r"], values: [pct, 100 - pct] }],
        {
          x: cx + (cardW - 3) / 2,
          y: y0 + 0.5,
          w: 3,
          h: 3,
          chartColors: [p.accent, LIGHT_GRAY],
          showLegend: false,
          showTitle: false,
          holeSize: 70,
        },
      );
    } catch {
      /* no-op */
    }
    s.addText(`${Math.round(pct)}%`, {
      x: cx,
      y: y0 + 1.7,
      w: cardW,
      h: 0.8,
      fontSize: 44,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.label).toUpperCase(), {
      x: cx,
      y: y0 + 3.7,
      w: cardW,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: p.primary,
      charSpacing: 3,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.body), {
      x: cx + 0.2,
      y: y0 + 4.15,
      w: cardW - 0.4,
      h: 1.0,
      fontSize: 13,
      color: DARK_GRAY,
      fontFace: "Geist",
      align: "center",
    });
  });
  s.addShape("line", { x: 6.55, y: y0, w: 0, h: 5.0, line: { color: LIGHT_GRAY, width: 1 } });
}

// ── MV-GRAPH-RINGS ──
function renderGraphRings(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 4);
  // Row of 4 mini doughnuts (concentric is awkward in pptxgenjs — this is the clean fallback)
  const chartW = 7.0;
  const each = chartW / Math.max(items.length, 1);
  items.forEach((it, i) => {
    const cx = 0.6 + i * each;
    const pct = Math.max(0, Math.min(100, num(it.value)));
    const color = i === 0 ? p.accent : p.primary;
    try {
      s.addChart(
        "doughnut" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
        [{ name: "r", labels: ["v", "r"], values: [pct, 100 - pct] }],
        {
          x: cx,
          y: y0 + 0.5,
          w: each - 0.2,
          h: each - 0.2,
          chartColors: [color, LIGHT_GRAY],
          showLegend: false,
          showTitle: false,
          holeSize: 65,
        },
      );
    } catch {
      /* no-op */
    }
    s.addText(`${pct}%`, {
      x: cx,
      y: y0 + each * 0.4,
      w: each - 0.2,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
  });
  // Legend right side
  const lx = 8.0;
  s.addShape("rect", {
    x: lx,
    y: y0,
    w: 2.0,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText("BREAKDOWN", {
    x: lx,
    y: y0 + 0.15,
    w: 4.7,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: p.accent,
    charSpacing: 3,
    fontFace: "Geist",
  });
  items.forEach((it, i) => {
    const ry = y0 + 0.7 + i * 0.9;
    const color = i === 0 ? p.accent : p.primary;
    s.addShape("line", { x: lx, y: ry, w: 4.7, h: 0, line: { color: LIGHT_GRAY, width: 1 } });
    s.addShape("rect", { x: lx, y: ry + 0.18, w: 0.2, h: 0.2, fill: { color }, line: { color } });
    s.addText(str(it.label), {
      x: lx + 0.35,
      y: ry + 0.1,
      w: 3.0,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(`${num(it.value)}%`, {
      x: lx + 3.4,
      y: ry + 0.1,
      w: 1.3,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "right",
    });
    s.addText(str(it.body), {
      x: lx + 0.35,
      y: ry + 0.45,
      w: 4.3,
      h: 0.35,
      fontSize: 11,
      color: DARK_GRAY,
      fontFace: "Geist",
    });
  });
}

// ── MV-GRAPH-TASK-CARDS ──
function renderGraphTaskCards(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  const cardW = (SLIDE_W - 1.2 - 0.6) / 3;
  items.forEach((it, i) => {
    const cx = 0.6 + i * (cardW + 0.3);
    const done = num(it.done);
    const total = Math.max(1, num(it.total, 100));
    const pct = Math.min(100, Math.round((done / total) * 100));
    s.addShape("rect", {
      x: cx,
      y: y0,
      w: 2.0,
      h: 0.04,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(it.label).toUpperCase(), {
      x: cx,
      y: y0 + 0.15,
      w: cardW,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: DARK_GRAY,
      charSpacing: 3,
      fontFace: "Geist",
    });
    s.addText(`${pct}%`, {
      x: cx,
      y: y0 + 0.55,
      w: cardW,
      h: 1.5,
      fontSize: 64,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText("of 100%", {
      x: cx + 2.4,
      y: y0 + 1.4,
      w: 2,
      h: 0.4,
      fontSize: 12,
      color: MID_GRAY,
      fontFace: "Geist",
    });
    s.addText(`${done.toLocaleString()} / ${total.toLocaleString()}`, {
      x: cx,
      y: y0 + 2.1,
      w: cardW,
      h: 0.35,
      fontSize: 11,
      color: MID_GRAY,
      fontFace: "Geist",
    });
    const barW = cardW - 0.1;
    s.addShape("rect", {
      x: cx,
      y: y0 + 2.6,
      w: barW,
      h: 0.12,
      fill: { color: LIGHT_GRAY },
      line: { color: LIGHT_GRAY },
    });
    s.addShape("rect", {
      x: cx,
      y: y0 + 2.6,
      w: (barW * pct) / 100,
      h: 0.12,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(it.body), {
      x: cx,
      y: y0 + 2.95,
      w: cardW,
      h: 1.4,
      fontSize: 13,
      color: DARK_GRAY,
      fontFace: "Geist",
    });
  });
}

// ── MV-GRAPH-DECADE-AREA ──
function renderGraphDecadeArea(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  // Custom title zone with kicker + headline
  s.addShape("rect", {
    x: 0.6,
    y: 0.55,
    w: 2.0,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(str(c.kicker || "Trajectory").toUpperCase(), {
    x: 0.6,
    y: 0.7,
    w: SLIDE_W - 1.2,
    h: 0.3,
    fontSize: 11,
    bold: true,
    color: p.accent,
    charSpacing: 3,
    fontFace: "Geist",
  });
  s.addText(str(c.headline || c.title), {
    x: 0.6,
    y: 1.05,
    w: SLIDE_W - 1.2,
    h: 1.1,
    fontSize: 28,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  const y0 = 2.2;
  const series = arr(c.series);
  const callout = obj(c.callout);
  try {
    s.addChart(
      "area" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [
        {
          name: "decade",
          labels: series.map((pt) => str(pt.label)),
          values: series.map((pt) => num(pt.value)),
        },
      ],
      {
        x: 0.6,
        y: y0,
        w: SLIDE_W - 1.2,
        h: 4.6,
        chartColors: [p.accent],
        chartColorsOpacity: 30,
        lineSize: 3,
        showLegend: false,
        showTitle: false,
        catAxisLabelFontFace: "Inter",
        catAxisLabelFontSize: 11,
        catAxisLabelColor: DARK_GRAY,
        valAxisLabelFontFace: "Inter",
        valAxisLabelFontSize: 10,
        valAxisLabelColor: DARK_GRAY,
        showValue: false,
      },
    );
  } catch {
    /* no-op */
  }
  // Callout box (positioned above chart, roughly at callout year x-slot)
  const idx = series.findIndex((pt) => str(pt.label) === str(callout.year));
  if (idx >= 0 && series.length > 1) {
    const chartL = 0.6,
      chartW = SLIDE_W - 1.2;
    const cx = chartL + (idx / (series.length - 1)) * chartW;
    const boxX = Math.max(0.6, Math.min(SLIDE_W - 3.6, cx - 1.5));
    s.addShape("rect", {
      x: boxX,
      y: y0 + 0.3,
      w: 3.0,
      h: 0.9,
      fill: { color: "FFFFFF" },
      line: { color: p.accent, width: 2 },
    });
    s.addText(str(callout.year), {
      x: boxX + 0.1,
      y: y0 + 0.35,
      w: 2.8,
      h: 0.35,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(callout.note), {
      x: boxX + 0.1,
      y: y0 + 0.68,
      w: 2.8,
      h: 0.5,
      fontSize: 11,
      color: DARK_GRAY,
      fontFace: "Geist",
      align: "center",
    });
  }
}

// ── MV-GRAPH-PERCENT-COMPARE ──
function renderGraphPercentCompare(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  const rowH = Math.min(1.3, (5.4 - y0) / Math.max(items.length, 1));
  items.forEach((it, i) => {
    const ry = y0 + i * rowH;
    const cur = Math.max(0, Math.min(100, num(it.current)));
    const bench = Math.max(0, Math.min(100, num(it.benchmark)));
    s.addShape("line", {
      x: 0.6,
      y: ry,
      w: SLIDE_W - 1.2,
      h: 0,
      line: { color: LIGHT_GRAY, width: 1 },
    });
    s.addText(str(it.label), {
      x: 0.6,
      y: ry + 0.15,
      w: 5.0,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(`${cur}%`, {
      x: 8.0,
      y: ry + 0.1,
      w: 2.0,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "right",
    });
    s.addText(`${bench}%`, {
      x: 10.4,
      y: ry + 0.2,
      w: 2.0,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: MID_GRAY,
      fontFace: "Geist",
      align: "right",
    });
    const barW = SLIDE_W - 1.2;
    const barY = ry + 0.8;
    s.addShape("rect", {
      x: 0.6,
      y: barY,
      w: barW,
      h: 0.08,
      fill: { color: LIGHT_GRAY },
      line: { color: LIGHT_GRAY },
    });
    s.addShape("rect", {
      x: 0.6,
      y: barY,
      w: (barW * cur) / 100,
      h: 0.08,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addShape("rect", {
      x: 0.6,
      y: barY + 0.14,
      w: barW,
      h: 0.08,
      fill: { color: LIGHT_GRAY },
      line: { color: LIGHT_GRAY },
    });
    s.addShape("rect", {
      x: 0.6,
      y: barY + 0.14,
      w: (barW * bench) / 100,
      h: 0.08,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    if (str(it.range))
      s.addText(str(it.range).toUpperCase(), {
        x: 0.6,
        y: ry + rowH - 0.32,
        w: SLIDE_W - 1.2,
        h: 0.3,
        fontSize: 10,
        bold: true,
        color: MID_GRAY,
        charSpacing: 3,
        fontFace: "Geist",
      });
  });
}

// ────────────── H1 fix: 8 chart variants with real export fidelity ──────────────
// Palette hue rotation for multi-series charts (keeps within brand tones).
function seriesColors(p: Palette): string[] {
  return [p.primary, p.accent, DARK_GRAY, MID_GRAY, LIGHT_GRAY];
}

// ── MV-GRAPH-LINE-MULTI ──
function renderGraphLineMulti(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const series = arr(c.series);
  const axis = obj(c.axis);
  const labels = arr(axis.x).length
    ? arr(axis.x).map((v) => str(v))
    : Array.isArray(axis.x)
      ? (axis.x as unknown[]).map((v) => str(v))
      : [];
  const xLabels = labels.length
    ? labels
    : ((series[0]?.points as unknown[] | undefined)?.map((_, i) => `${i + 1}`) ?? []);
  const data = series.map((sr) => ({
    name: str(sr.label),
    labels: xLabels,
    values: numArr(sr.points),
  }));
  if (str(c.kicker)) {
    s.addShape("rect", {
      x: 0.6,
      y: y0,
      w: 2.0,
      h: 0.04,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(c.kicker).toUpperCase(), {
      x: 0.6,
      y: y0 + 0.15,
      w: SLIDE_W - 1.2,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: p.accent,
      charSpacing: 3,
      fontFace: "Geist",
    });
  }
  const chartY = y0 + (str(c.kicker) ? 0.55 : 0.1);
  try {
    s.addChart("line" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0], data, {
      x: 0.6,
      y: chartY,
      w: SLIDE_W - 1.2,
      h: 5.4 - chartY,
      chartColors: seriesColors(p),
      showLegend: true,
      legendPos: "b",
      legendFontFace: "Inter",
      legendFontSize: 11,
      legendColor: DARK_GRAY,
      showTitle: false,
      catAxisLabelFontFace: "Inter",
      catAxisLabelFontSize: 11,
      catAxisLabelColor: DARK_GRAY,
      valAxisLabelFontFace: "Inter",
      valAxisLabelFontSize: 10,
      valAxisLabelColor: DARK_GRAY,
      valGridLine: { style: "solid", size: 1, color: LIGHT_GRAY },
      lineDataSymbol: "circle",
      lineDataSymbolSize: 6,
      lineSize: 2,
    });
  } catch {
    /* no-op */
  }
}

// ── MV-GRAPH-STACKED-BAR ──
function renderGraphStackedBar(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const segments = arr(c.segments);
  const columns = arr(c.columns);
  const catLabels = columns.map((col) => str(col.label));
  const data = segments.map((seg, si) => ({
    name: str(seg.label),
    labels: catLabels,
    values: columns.map((col) => num((numArr(col.values) as number[])[si])),
  }));
  try {
    s.addChart("bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0], data, {
      x: 0.6,
      y: y0 + 0.1,
      w: SLIDE_W - 1.2,
      h: 5.2,
      barDir: "col",
      barGrouping: "stacked",
      chartColors: seriesColors(p),
      showLegend: true,
      legendPos: "b",
      legendFontFace: "Inter",
      legendFontSize: 11,
      legendColor: DARK_GRAY,
      showTitle: false,
      catAxisLabelFontFace: "Inter",
      catAxisLabelFontSize: 11,
      valAxisLabelFontFace: "Inter",
      valAxisLabelFontSize: 10,
      valAxisLabelColor: DARK_GRAY,
      valGridLine: { style: "solid", size: 1, color: LIGHT_GRAY },
    });
  } catch {
    /* no-op */
  }
  if (str(c.unit)) {
    s.addText(`Values in ${str(c.unit)}`, {
      x: 0.6,
      y: 5.35,
      w: SLIDE_W - 1.2,
      h: 0.3,
      fontSize: 10,
      italic: true,
      color: MID_GRAY,
      fontFace: "Geist",
    });
  }
}

// ── MV-GRAPH-AREA-STACK ──
function renderGraphAreaStack(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const series = arr(c.series);
  const axis = obj(c.axis);
  const xLabels = Array.isArray(axis.x) ? (axis.x as unknown[]).map((v) => str(v)) : [];
  const data = series.map((sr) => ({
    name: str(sr.label),
    labels: xLabels,
    values: numArr(sr.points),
  }));
  if (str(c.kicker)) {
    s.addShape("rect", {
      x: 0.6,
      y: y0,
      w: 2.0,
      h: 0.04,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(c.kicker).toUpperCase(), {
      x: 0.6,
      y: y0 + 0.15,
      w: SLIDE_W - 1.2,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: p.accent,
      charSpacing: 3,
      fontFace: "Geist",
    });
  }
  const chartY = y0 + (str(c.kicker) ? 0.55 : 0.1);
  try {
    s.addChart("area" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0], data, {
      x: 0.6,
      y: chartY,
      w: SLIDE_W - 1.2,
      h: 5.4 - chartY,
      chartColors: seriesColors(p),
      barGrouping: "stacked",
      showLegend: true,
      legendPos: "b",
      legendFontFace: "Inter",
      legendFontSize: 11,
      legendColor: DARK_GRAY,
      showTitle: false,
      catAxisLabelFontFace: "Inter",
      catAxisLabelFontSize: 11,
      valAxisLabelFontFace: "Inter",
      valAxisLabelFontSize: 10,
      valAxisLabelColor: DARK_GRAY,
      valGridLine: { style: "solid", size: 1, color: LIGHT_GRAY },
    });
  } catch {
    /* no-op */
  }
}

// ── MV-GRAPH-WATERFALL ──
// PowerPoint's native waterfall type isn't exposed by pptxgenjs; draw manually with rects.
function renderGraphWaterfall(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const steps = arr(c.steps);
  if (!steps.length) return;
  // Compute running totals for each step; start/end are absolute, up/down are deltas.
  const bars: Array<{ label: string; base: number; delta: number; abs: number; kind: string }> = [];
  let running = 0;
  steps.forEach((st) => {
    const kind = str(st.kind);
    const value = num(st.value);
    if (kind === "start" || kind === "end") {
      bars.push({ label: str(st.label), base: 0, delta: value, abs: value, kind });
      running = value;
    } else {
      const base = value >= 0 ? running : running + value;
      bars.push({
        label: str(st.label),
        base,
        delta: Math.abs(value),
        abs: running + value,
        kind: value >= 0 ? "up" : "down",
      });
      running += value;
    }
  });
  const chartX = 0.6,
    chartY = y0 + 0.4,
    chartW = SLIDE_W - 1.2,
    chartH = 4.4;
  const maxVal = Math.max(...bars.map((b) => b.base + b.delta), ...bars.map((b) => b.abs));
  const barW = ((chartW - 0.2) / bars.length) * 0.7;
  const gap = (chartW - 0.2) / bars.length;
  bars.forEach((b, i) => {
    const bx = chartX + 0.1 + i * gap + (gap - barW) / 2;
    const bh = (b.delta / Math.max(maxVal, 1)) * chartH;
    const by = chartY + chartH - ((b.base + b.delta) / Math.max(maxVal, 1)) * chartH;
    const fill =
      b.kind === "start" || b.kind === "end" ? p.primary : b.kind === "up" ? p.accent : MID_GRAY;
    s.addShape("rect", {
      x: bx,
      y: by,
      w: barW,
      h: bh,
      fill: { color: fill },
      line: { color: fill },
    });
    // connector line to next bar
    if (i < bars.length - 1) {
      const topY = chartY + chartH - (bars[i].abs / Math.max(maxVal, 1)) * chartH;
      s.addShape("line", {
        x: bx + barW,
        y: topY,
        w: gap - barW,
        h: 0,
        line: { color: LIGHT_GRAY, width: 1, dashType: "dash" },
      });
    }
    // value label
    const sign = b.kind === "down" ? "-" : b.kind === "up" ? "+" : "";
    s.addText(`${sign}${b.delta}${str(c.unit) ? ` ${str(c.unit)}` : ""}`, {
      x: bx - 0.3,
      y: by - 0.35,
      w: barW + 0.6,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    // x label
    s.addText(str(b.label), {
      x: chartX + 0.1 + i * gap,
      y: chartY + chartH + 0.1,
      w: gap,
      h: 0.5,
      fontSize: 10,
      color: DARK_GRAY,
      fontFace: "Geist",
      align: "center",
    });
  });
  // baseline
  s.addShape("line", {
    x: chartX,
    y: chartY + chartH,
    w: chartW,
    h: 0,
    line: { color: LIGHT_GRAY, width: 1 },
  });
}

// ── MV-GRAPH-BUBBLE ──
function renderGraphBubble(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const axis = obj(c.axis);
  // pptxgenjs bubble chart: series with values (y), xValues (x), sizes.
  try {
    s.addChart(
      "bubble" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [
        {
          name: "Markets",
          labels: items.map((it) => str(it.label)),
          values: items.map((it) => num(it.y)),
          xValues: items.map((it) => num(it.x)),
          sizes: items.map((it) => num(it.size, 20)),
        },
      ],
      {
        x: 0.6,
        y: y0 + 0.1,
        w: SLIDE_W - 1.2,
        h: 5.0,
        chartColors: [p.accent],
        showLegend: false,
        showTitle: false,
        catAxisTitle: str(axis.x),
        catAxisTitleFontFace: "Inter",
        catAxisTitleFontSize: 12,
        catAxisTitleColor: DARK_GRAY,
        showCatAxisTitle: !!str(axis.x),
        valAxisTitle: str(axis.y),
        valAxisTitleFontFace: "Inter",
        valAxisTitleFontSize: 12,
        valAxisTitleColor: DARK_GRAY,
        showValAxisTitle: !!str(axis.y),
        catAxisLabelFontFace: "Inter",
        catAxisLabelFontSize: 10,
        valAxisLabelFontFace: "Inter",
        valAxisLabelFontSize: 10,
        valGridLine: { style: "solid", size: 1, color: LIGHT_GRAY },
        showLabel: true,
        dataLabelFontFace: "Inter",
        dataLabelFontSize: 10,
        dataLabelColor: p.primary,
        dataLabelPosition: "ctr",
      },
    );
  } catch {
    /* no-op */
  }
}

// ── MV-GRAPH-HEATMAP ──
// No native heatmap in pptxgenjs; draw a colored grid with value interpolation.
function renderGraphHeatmap(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const rows = Array.isArray(c.rows) ? (c.rows as unknown[]).map((v) => str(v)) : [];
  const cols = Array.isArray(c.columns) ? (c.columns as unknown[]).map((v) => str(v)) : [];
  const cells = Array.isArray(c.cells)
    ? (c.cells as unknown[][]).map((row) => (Array.isArray(row) ? row.map((v) => num(v)) : []))
    : [];
  const scale = obj(c.scale);
  const smin = num(scale.min, Math.min(...cells.flat().filter((v) => Number.isFinite(v))));
  const smax = num(scale.max, Math.max(...cells.flat().filter((v) => Number.isFinite(v))));
  const gridX = 2.2,
    gridY = y0 + 0.5,
    gridW = SLIDE_W - gridX - 0.6,
    gridH = 4.4;
  const cellW = gridW / Math.max(cols.length, 1);
  const cellH = gridH / Math.max(rows.length, 1);
  // column headers
  cols.forEach((cl, i) => {
    s.addText(cl, {
      x: gridX + i * cellW,
      y: gridY - 0.35,
      w: cellW,
      h: 0.3,
      fontSize: 10,
      bold: true,
      color: DARK_GRAY,
      fontFace: "Geist",
      align: "center",
    });
  });
  // row labels + cells
  rows.forEach((rl, ri) => {
    s.addText(rl, {
      x: 0.6,
      y: gridY + ri * cellH + cellH / 2 - 0.15,
      w: gridX - 0.7,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    (cells[ri] ?? []).forEach((val, ci) => {
      const t = smax === smin ? 0.5 : Math.max(0, Math.min(1, (val - smin) / (smax - smin)));
      // interpolate accent (hot) with LIGHT_GRAY (cold)
      const fill = mixHex(LIGHT_GRAY, p.accent, t);
      const textColor = t > 0.55 ? "FFFFFF" : p.primary;
      s.addShape("rect", {
        x: gridX + ci * cellW + 0.02,
        y: gridY + ri * cellH + 0.02,
        w: cellW - 0.04,
        h: cellH - 0.04,
        fill: { color: fill },
        line: { color: "FFFFFF", width: 1 },
      });
      s.addText(`${val}`, {
        x: gridX + ci * cellW,
        y: gridY + ri * cellH + cellH / 2 - 0.15,
        w: cellW,
        h: 0.3,
        fontSize: 11,
        bold: true,
        color: textColor,
        fontFace: "Geist",
        align: "center",
      });
    });
  });
  // scale legend
  s.addText(`Scale: ${smin} — ${smax}`, {
    x: gridX,
    y: gridY + gridH + 0.1,
    w: gridW,
    h: 0.3,
    fontSize: 10,
    italic: true,
    color: MID_GRAY,
    fontFace: "Geist",
  });
}

function mixHex(a: string, b: string, t: number): string {
  const pa = [
    parseInt(a.slice(0, 2), 16),
    parseInt(a.slice(2, 4), 16),
    parseInt(a.slice(4, 6), 16),
  ];
  const pb = [
    parseInt(b.slice(0, 2), 16),
    parseInt(b.slice(2, 4), 16),
    parseInt(b.slice(4, 6), 16),
  ];
  const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return mix
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

// ── MV-GRAPH-TREEMAP ──
// No native treemap; draw a slice-and-dice layout (rows split by proportional weight).
function renderGraphTreemap(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).map((it) => ({
    label: str(it.label),
    value: num(it.value),
    meta: str(it.meta),
  }));
  const total = items.reduce((sum, it) => sum + it.value, 0) || 1;
  const gx = 0.6,
    gy = y0 + 0.3,
    gw = SLIDE_W - 1.2,
    gh = 4.8;
  // Simple squarified approximation: first (biggest) item takes left column, rest split right column vertically.
  items.sort((a, b) => b.value - a.value);
  if (items.length === 0) return;
  const colors = [p.primary, p.accent, DARK_GRAY, MID_GRAY, LIGHT_GRAY];
  const first = items[0];
  const firstW = gw * (first.value / total);
  s.addShape("rect", {
    x: gx,
    y: gy,
    w: firstW - 0.05,
    h: gh,
    fill: { color: colors[0] },
    line: { color: "FFFFFF", width: 2 },
  });
  s.addText(first.label, {
    x: gx + 0.2,
    y: gy + 0.3,
    w: firstW - 0.5,
    h: 0.5,
    fontSize: 20,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
  });
  s.addText(`${first.value}%`, {
    x: gx + 0.2,
    y: gy + 0.9,
    w: firstW - 0.5,
    h: 0.6,
    fontSize: 40,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
  });
  if (first.meta)
    s.addText(first.meta, {
      x: gx + 0.2,
      y: gy + 1.7,
      w: firstW - 0.5,
      h: 0.5,
      fontSize: 11,
      color: "FFFFFF",
      fontFace: "Geist",
    });
  // stack remaining vertically in right column
  const rest = items.slice(1);
  const restTotal = rest.reduce((sum, it) => sum + it.value, 0) || 1;
  const rx = gx + firstW + 0.05;
  const rw = gw - firstW - 0.05;
  let cy = gy;
  rest.forEach((it, i) => {
    const rh = gh * (it.value / restTotal);
    const color = colors[(i + 1) % colors.length];
    s.addShape("rect", {
      x: rx,
      y: cy,
      w: rw,
      h: rh - 0.05,
      fill: { color },
      line: { color: "FFFFFF", width: 2 },
    });
    const textColor = color === LIGHT_GRAY ? p.primary : "FFFFFF";
    s.addText(it.label, {
      x: rx + 0.2,
      y: cy + 0.15,
      w: rw - 0.4,
      h: 0.35,
      fontSize: 13,
      bold: true,
      color: textColor,
      fontFace: "Geist",
    });
    s.addText(`${it.value}%`, {
      x: rx + 0.2,
      y: cy + rh / 2 - 0.25,
      w: rw - 0.4,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: textColor,
      fontFace: "Geist",
    });
    if (it.meta && rh > 0.9)
      s.addText(it.meta, {
        x: rx + 0.2,
        y: cy + rh - 0.4,
        w: rw - 0.4,
        h: 0.3,
        fontSize: 10,
        color: textColor,
        fontFace: "Geist",
      });
    cy += rh;
  });
}

// ── MV-GRAPH-COMBO ──
// Bars + line on one plot via pptxgenjs multi-type addChart.
function renderGraphCombo(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const points = arr(c.points);
  const barsMeta = obj(c.bars);
  const lineMeta = obj(c.line);
  const labels = points.map((pt) => str(pt.label));
  try {
    s.addChart(
      [
        {
          type: "bar" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
          data: [
            {
              name: str(barsMeta.label) || "Bars",
              labels,
              values: points.map((pt) => num(pt.bar)),
            },
          ],
          options: { barDir: "col", chartColors: [p.primary], barGrouping: "clustered" },
        },
        {
          type: "line" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
          data: [
            {
              name: str(lineMeta.label) || "Line",
              labels,
              values: points.map((pt) => num(pt.line)),
            },
          ],
          options: {
            chartColors: [p.accent],
            secondaryValAxis: true,
            secondaryCatAxis: true,
            lineDataSymbol: "circle",
            lineDataSymbolSize: 8,
            lineSize: 3,
          },
        },
      ] as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      // Multi-type charts use the TWO-argument form: (types[], options).
      // Passing an empty data array here made pptxgenjs read our real options
      // as the data argument and fall back to a defaulted plotArea whose
      // border color is undefined — which threw at write time
      // ("(colorStr || '').replace is not a function") and lost the slide.
      {

        x: 0.6,
        y: y0 + 0.1,
        w: SLIDE_W - 1.2,
        h: 5.0,
        showLegend: true,
        legendPos: "b",
        legendFontFace: "Inter",
        legendFontSize: 11,
        legendColor: DARK_GRAY,
        showTitle: false,
        catAxisLabelFontFace: "Inter",
        catAxisLabelFontSize: 11,
        valAxisLabelFontFace: "Inter",
        valAxisLabelFontSize: 10,
        valAxisLabelColor: DARK_GRAY,
        valGridLine: { style: "solid", size: 1, color: LIGHT_GRAY },
        valAxes: [
          {
            showValAxisTitle: !!str(barsMeta.unit),
            valAxisTitle: str(barsMeta.unit),
            valAxisTitleFontFace: "Inter",
            valAxisTitleFontSize: 11,
          },
          {
            showValAxisTitle: !!str(lineMeta.unit),
            valAxisTitle: str(lineMeta.unit),
            valAxisTitleFontFace: "Inter",
            valAxisTitleFontSize: 11,
            valGridLine: { style: "none" },
          },
        ],
        catAxes: [
          { catAxisLabelFontFace: "Inter", catAxisLabelFontSize: 11 },
          { catAxisHidden: true },
        ],
      } as unknown as Parameters<PptxGenJS.Slide["addChart"]>[1],

    );
  } catch {
    /* no-op */
  }
}

// ═══════════════════════════════════════════════════════════════════════
// M1 batch — bespoke variant renderers
// Each mirrors the on-screen layout in VariantRenderer for a specific
// variant instead of collapsing into a family-generic fallback.
// ═══════════════════════════════════════════════════════════════════════

// ── MV-INFO-DONUT ── center callout + native doughnut
function renderInfoDonut(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).map((it) => ({
    label: str(it.label),
    value: num(it.value),
    note: str(it.note),
  }));
  const colors = [p.primary, p.accent, DARK_GRAY, MID_GRAY, LIGHT_GRAY];
  try {
    s.addChart(
      "doughnut" as unknown as Parameters<PptxGenJS.Slide["addChart"]>[0],
      [{ name: "Share", labels: items.map((it) => it.label), values: items.map((it) => it.value) }],
      {
        x: 0.6,
        y: y0 + 0.1,
        w: 6.5,
        h: 5.2,
        chartColors: items.map((_, i) => colors[i % colors.length]),
        showLegend: false,
        holeSize: 60,
        dataLabelFontFace: "Inter",
        dataLabelFontSize: 10,
        dataLabelColor: "FFFFFF",
        showValue: true,
        dataLabelFormatCode: "0'%'",
      } as unknown as Parameters<PptxGenJS.Slide["addChart"]>[2],
    );
  } catch {
    /* no-op */
  }
  // center readout
  const centerValue = str(c.centerValue);
  const centerUnit = str(c.centerUnit);
  const centerLabel = str(c.centerLabel);
  if (centerValue) {
    s.addText(`${centerValue}${centerUnit}`, {
      x: 1.4,
      y: y0 + 1.8,
      w: 5.0,
      h: 1.4,
      fontSize: 60,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    if (centerLabel)
      s.addText(centerLabel, {
        x: 1.4,
        y: y0 + 3.1,
        w: 5.0,
        h: 0.6,
        fontSize: 11,
        color: p.ink,
        fontFace: "Geist",
        align: "center",
      });
  }
  // legend on the right
  const legX = 7.5;
  const rowH = Math.min(0.7, 5.0 / Math.max(items.length, 1));
  items.forEach((it, k) => {
    const y = y0 + 0.2 + k * rowH;
    s.addShape("rect", {
      x: legX,
      y: y + 0.12,
      w: 0.22,
      h: 0.22,
      fill: { color: colors[k % colors.length] },
      line: { color: colors[k % colors.length] },
    });
    s.addText(`${it.label} — ${it.value}%`, {
      x: legX + 0.35,
      y,
      w: SLIDE_W - legX - 0.4,
      h: 0.35,
      fontSize: 13,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    if (it.note)
      s.addText(it.note, {
        x: legX + 0.35,
        y: y + 0.32,
        w: SLIDE_W - legX - 0.4,
        h: 0.32,
        fontSize: 10,
        color: p.ink,
        fontFace: "Geist",
      });
  });
}

// ── MV-INFO-FUNNEL ── trapezoid stack with value column
function renderInfoFunnelStack(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  if (!items.length) return;
  const availH = 5.7 - y0;
  const rowH = availH / items.length;
  const cxSlide = SLIDE_W / 2;
  const maxW = 8.5;
  const minW = 3.0;
  items.forEach((it, k) => {
    const t = items.length > 1 ? k / (items.length - 1) : 0;
    const w = maxW - (maxW - minW) * t;
    const wNext = maxW - (maxW - minW) * (items.length > 1 ? (k + 1) / (items.length - 1) : 0);
    const x = cxSlide - w / 2;
    const y = y0 + k * rowH;
    // trapezoid via 4-point pentagon-ish shape (use rect for simplicity, adjacent widths still communicate the taper)
    const color =
      k === 0
        ? p.primary
        : k === items.length - 1
          ? p.accent
          : mixHex(p.primary.replace("#", ""), p.accent.replace("#", ""), t);
    s.addShape("rect", {
      x,
      y: y + 0.05,
      w,
      h: rowH - 0.1,
      fill: { color },
      line: { color: "FFFFFF", width: 2 },
    });
    s.addText(str(it.label), {
      x: x + 0.25,
      y: y + 0.05,
      w: w * 0.55,
      h: rowH - 0.1,
      fontSize: 15,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "middle",
    });
    s.addText(`${str(it.value)} ${str(it.unit)}`.trim(), {
      x: x + w * 0.5,
      y: y + 0.05,
      w: w * 0.48 - 0.25,
      h: rowH - 0.1,
      fontSize: 20,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "right",
      valign: "middle",
    });
    if (it.note)
      s.addText(str(it.note), {
        x: x + w + 0.2,
        y: y + rowH / 2 - 0.2,
        w: SLIDE_W - (x + w) - 0.5,
        h: 0.6,
        fontSize: 10,
        color: p.ink,
        fontFace: "Geist",
        valign: "middle",
      });
    void wNext;
  });
}

// ── MV-INFO-PYRAMID ── stacked triangles
function renderInfoPyramid(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  if (!items.length) return;
  const availH = 5.6 - y0;
  const rowH = availH / items.length;
  const cxSlide = 5.2;
  const maxW = 6.5;
  const minW = 1.5;
  items.forEach((it, k) => {
    const t = items.length > 1 ? k / (items.length - 1) : 0;
    const w = minW + (maxW - minW) * t;
    const x = cxSlide - w / 2;
    const y = y0 + (items.length - 1 - k) * rowH;
    const color = k === items.length - 1 ? p.accent : p.primary;
    const transparency = k === items.length - 1 ? 0 : Math.min(60, (items.length - 1 - k) * 15);
    s.addShape("rect", {
      x,
      y: y + 0.04,
      w,
      h: rowH - 0.08,
      fill: { color, transparency },
      line: { color: "FFFFFF", width: 2 },
    });
    s.addText(str(it.label), {
      x: x + 0.1,
      y: y + 0.04,
      w: w - 0.2,
      h: rowH - 0.08,
      fontSize: 14,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    // right-side description
    if (it.body)
      s.addText(str(it.body), {
        x: cxSlide + maxW / 2 + 0.3,
        y: y + 0.1,
        w: SLIDE_W - (cxSlide + maxW / 2) - 0.8,
        h: rowH - 0.15,
        fontSize: 11,
        color: p.ink,
        fontFace: "Geist",
        valign: "middle",
      });
  });
}

// ── MV-INFO-VENN ── 3 overlapping circles + intersection callout
function renderInfoVenn(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  const inter = str(c.intersection);
  const cxSlide = SLIDE_W / 2;
  const cy = y0 + (6.0 - y0) / 2 - 0.1;
  const r = 1.7;
  const positions = [
    { x: cxSlide - r * 0.75, y: cy - r * 0.35, color: p.primary },
    { x: cxSlide + r * 0.75, y: cy - r * 0.35, color: p.accent },
    { x: cxSlide, y: cy + r * 0.65, color: DARK_GRAY },
  ];
  positions.forEach((pos) => {
    s.addShape("ellipse", {
      x: pos.x - r,
      y: pos.y - r,
      w: r * 2,
      h: r * 2,
      fill: { color: pos.color, transparency: 45 },
      line: { color: pos.color, width: 2 },
    });
  });
  items.forEach((it, k) => {
    const pos = positions[k];
    const boxW = 2.4;
    const labelY = k < 2 ? pos.y - r - 0.6 : pos.y + r + 0.15;
    s.addText(str(it.label), {
      x: pos.x - boxW / 2,
      y: labelY,
      w: boxW,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    if (it.body)
      s.addText(str(it.body), {
        x: pos.x - boxW / 2,
        y: labelY + 0.4,
        w: boxW,
        h: 0.6,
        fontSize: 10,
        color: p.ink,
        fontFace: "Geist",
        align: "center",
      });
  });
  if (inter) {
    s.addText(inter, {
      x: cxSlide - 1.5,
      y: cy - 0.25,
      w: 3.0,
      h: 0.5,
      fontSize: 13,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
  }
}

// ── MV-INFO-CIRCULAR-FLOW ── hub + labelled nodes
function renderInfoCircularFlow(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const hub = str(c.hub);
  const cxSlide = SLIDE_W / 2;
  const cy = y0 + (6.0 - y0) / 2;
  const r = Math.min(2.2, (6.0 - y0) / 2 - 0.4);
  // ring
  s.addShape("ellipse", {
    x: cxSlide - r,
    y: cy - r,
    w: r * 2,
    h: r * 2,
    fill: { color: "FFFFFF", transparency: 100 } as unknown as { color: string },
    line: { color: p.accent, width: 2 },
  });
  // hub
  s.addShape("ellipse", {
    x: cxSlide - 0.9,
    y: cy - 0.9,
    w: 1.8,
    h: 1.8,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  if (hub)
    s.addText(hub, {
      x: cxSlide - 0.9,
      y: cy - 0.4,
      w: 1.8,
      h: 0.8,
      fontSize: 12,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
  const n = Math.max(items.length, 1);
  items.forEach((it, k) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * k) / n;
    const nx = cxSlide + Math.cos(angle) * r;
    const ny = cy + Math.sin(angle) * r;
    s.addShape("ellipse", {
      x: nx - 0.32,
      y: ny - 0.32,
      w: 0.64,
      h: 0.64,
      fill: { color: p.accent },
      line: { color: "FFFFFF", width: 2 },
    });
    s.addText(String(k + 1), {
      x: nx - 0.32,
      y: ny - 0.32,
      w: 0.64,
      h: 0.64,
      fontSize: 16,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    const boxW = 2.4;
    const dir = Math.cos(angle);
    const boxX = dir > 0.2 ? nx + 0.5 : dir < -0.2 ? nx - 0.5 - boxW : nx - boxW / 2;
    const align: "left" | "right" | "center" = dir > 0.2 ? "left" : dir < -0.2 ? "right" : "center";
    const boxY = ny - 0.35;
    s.addText(str(it.label), {
      x: boxX,
      y: boxY,
      w: boxW,
      h: 0.35,
      fontSize: 13,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align,
    });
    if (it.body)
      s.addText(str(it.body), {
        x: boxX,
        y: boxY + 0.35,
        w: boxW,
        h: 0.6,
        fontSize: 10,
        color: p.ink,
        fontFace: "Geist",
        align,
      });
  });
}

// ── MV-INFO-BAR-COMPARE ── native horizontal bar chart with highlight
function renderInfoBarCompare(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).map((it) => ({
    label: str(it.label),
    value: num(it.value),
    note: str(it.note),
  }));
  const unit = str(c.unit);
  if (!items.length) return;
  const maxV = Math.max(...items.map((it) => it.value), 1);
  const rowH = Math.min(0.9, (5.7 - y0) / items.length);
  const labelW = 2.6;
  const barX = 0.6 + labelW + 0.2;
  const barMaxW = SLIDE_W - barX - 2.2;
  items.forEach((it, k) => {
    const y = y0 + k * rowH;
    const isHero = k === items.length - 1;
    const w = (it.value / maxV) * barMaxW;
    s.addText(it.label, {
      x: 0.6,
      y,
      w: labelW,
      h: rowH,
      fontSize: 13,
      bold: isHero,
      color: isHero ? p.primary : DARK_GRAY,
      fontFace: "Geist",
      valign: "middle",
    });
    s.addShape("rect", {
      x: barX,
      y: y + rowH * 0.2,
      w,
      h: rowH * 0.6,
      fill: { color: isHero ? p.accent : p.primary, transparency: isHero ? 0 : 40 },
      line: { color: isHero ? p.accent : p.primary, transparency: isHero ? 0 : 40 },
    });
    s.addText(`${it.value} ${unit}`.trim(), {
      x: barX + w + 0.15,
      y,
      w: 1.8,
      h: rowH,
      fontSize: 14,
      bold: isHero,
      color: p.primary,
      fontFace: "Geist",
      valign: "middle",
    });
    if (it.note)
      s.addText(it.note, {
        x: barX,
        y: y + rowH * 0.78,
        w: barMaxW,
        h: 0.28,
        fontSize: 9,
        italic: true,
        color: MID_GRAY,
        fontFace: "Geist",
      });
  });
}

// ── MV-IMG-GRID-3 / MV-IMG-GRID-6 ── placeholder image tiles with caption strip
function renderImgGrid(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette, n: 3 | 6) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, n);
  const cols = n === 3 ? 3 : 3;
  const rows = n === 3 ? 1 : 2;
  const gap = 0.2;
  const availW = SLIDE_W - 1.2;
  const availH = 5.9 - y0;
  const colW = (availW - (cols - 1) * gap) / cols;
  const rowH = (availH - (rows - 1) * gap) / rows;
  items.forEach((it, k) => {
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * (colW + gap);
    const y = y0 + r * (rowH + gap);
    // photo placeholder
    s.addShape("rect", {
      x,
      y,
      w: colW,
      h: rowH * 0.72,
      fill: { color: p.primary, transparency: 30 },
      line: { color: p.primary, transparency: 30 },
    });
    s.addText(
      str(it.label || it.caption)
        .slice(0, 2)
        .toUpperCase(),
      {
        x,
        y,
        w: colW,
        h: rowH * 0.72,
        fontSize: 42,
        bold: true,
        color: "FFFFFF",
        fontFace: "Geist",
        align: "center",
        valign: "middle",
        charSpacing: 4,
      },
    );
    // caption band
    s.addShape("rect", {
      x,
      y: y + rowH * 0.72,
      w: colW,
      h: rowH * 0.28,
      fill: { color: "FFFFFF" },
      line: { color: LIGHT_GRAY, width: 0.5 },
    });
    if (it.label)
      s.addText(str(it.label), {
        x: x + 0.15,
        y: y + rowH * 0.74,
        w: colW - 0.3,
        h: rowH * 0.13,
        fontSize: 12,
        bold: true,
        color: p.primary,
        fontFace: "Geist",
      });
    s.addText(str(it.caption), {
      x: x + 0.15,
      y: y + rowH * 0.87,
      w: colW - 0.3,
      h: rowH * 0.13,
      fontSize: 10,
      color: p.ink,
      fontFace: "Geist",
    });
  });
}

// ── MV-IMG-MATRIX-4 / -6 ── image + body pairs
function renderImgMatrix(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette, n: 4 | 6) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, n);
  const cols = n === 4 ? 2 : 3;
  const rows = n === 4 ? 2 : 2;
  const gap = 0.25;
  const colW = (SLIDE_W - 1.2 - (cols - 1) * gap) / cols;
  const rowH = (5.9 - y0 - (rows - 1) * gap) / rows;
  items.forEach((it, k) => {
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * (colW + gap);
    const y = y0 + r * (rowH + gap);
    const imgW = colW * 0.42;
    // image side
    s.addShape("rect", {
      x,
      y,
      w: imgW,
      h: rowH,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText(str(it.label).slice(0, 2).toUpperCase(), {
      x,
      y,
      w: imgW,
      h: rowH,
      fontSize: 32,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    // content side
    s.addShape("rect", {
      x: x + imgW,
      y,
      w: colW - imgW,
      h: rowH,
      fill: { color: p.surface },
      line: { color: LIGHT_GRAY },
    });
    s.addText(str(it.label), {
      x: x + imgW + 0.2,
      y: y + 0.15,
      w: colW - imgW - 0.4,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.body), {
      x: x + imgW + 0.2,
      y: y + 0.6,
      w: colW - imgW - 0.4,
      h: rowH - 0.7,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ── MV-IMG-STRIP ── horizontal 5-panel strip
function renderImgStrip(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  if (!items.length) return;
  const gap = 0.1;
  const colW = (SLIDE_W - 1.2 - (items.length - 1) * gap) / items.length;
  const stripY = y0 + 0.3;
  const stripH = 3.6;
  items.forEach((it, k) => {
    const x = 0.6 + k * (colW + gap);
    // panel with gradient tint
    const transparency = 20 + k * 8;
    s.addShape("rect", {
      x,
      y: stripY,
      w: colW,
      h: stripH,
      fill: { color: p.primary, transparency },
      line: { color: p.primary, transparency },
    });
    s.addText(String(k + 1).padStart(2, "0"), {
      x: x + 0.2,
      y: stripY + 0.2,
      w: colW - 0.4,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
    });
    s.addText(str(it.caption), {
      x: x + 0.2,
      y: stripY + stripH - 0.7,
      w: colW - 0.4,
      h: 0.5,
      fontSize: 12,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
    });
  });
  // arrow row below
  const arrowY = stripY + stripH + 0.35;
  s.addShape("rect", {
    x: 0.6,
    y: arrowY,
    w: SLIDE_W - 1.2,
    h: 0.02,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  items.forEach((_, k) => {
    const x = 0.6 + k * (colW + gap) + colW / 2;
    s.addShape("ellipse", {
      x: x - 0.1,
      y: arrowY - 0.09,
      w: 0.2,
      h: 0.2,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
  });
}

// ── MV-IMG-BEFORE-AFTER ── split-panel scene contrast
function renderImgBeforeAfter(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const before = obj(c.before);
  const after = obj(c.after);
  const panelH = 5.6 - y0;
  const gap = 0.2;
  const colW = (SLIDE_W - 1.2 - gap) / 2;
  const sides = [
    { data: before, x: 0.6, tone: DARK_GRAY, badge: "BEFORE" },
    { data: after, x: 0.6 + colW + gap, tone: p.accent, badge: "AFTER" },
  ];
  sides.forEach((side) => {
    s.addShape("rect", {
      x: side.x,
      y: y0,
      w: colW,
      h: panelH * 0.62,
      fill: { color: side.tone, transparency: 25 },
      line: { color: side.tone, transparency: 25 },
    });
    s.addShape("rect", {
      x: side.x + 0.15,
      y: y0 + 0.15,
      w: 1.0,
      h: 0.32,
      fill: { color: side.tone },
      line: { color: side.tone },
    });
    s.addText(side.badge, {
      x: side.x + 0.15,
      y: y0 + 0.15,
      w: 1.0,
      h: 0.32,
      fontSize: 10,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
      charSpacing: 3,
    });
    s.addText(str(side.data.label), {
      x: side.x + 0.2,
      y: y0 + panelH * 0.68,
      w: colW - 0.4,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(side.data.body), {
      x: side.x + 0.2,
      y: y0 + panelH * 0.68 + 0.5,
      w: colW - 0.4,
      h: panelH * 0.32 - 0.5,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ── MV-CASE-SPREAD ── magazine spread: client + challenge/solution/result columns
function renderCaseSpread(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const client = str(c.client);
  const challenge = str(c.challenge);
  const solution = str(c.solution);
  const result = str(c.result);
  const metric = str(c.metric);
  // Left banner
  s.addShape("rect", {
    x: 0,
    y: 0,
    w: 4.2,
    h: SLIDE_H,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  s.addText("CASE STUDY", {
    x: 0.5,
    y: 0.9,
    w: 3.5,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 5,
  });
  s.addText(client || "Client", {
    x: 0.5,
    y: 1.4,
    w: 3.5,
    h: 2.6,
    fontSize: 34,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "top",
  });
  if (metric) {
    s.addShape("rect", {
      x: 0.5,
      y: 4.6,
      w: 0.12,
      h: 1.2,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(metric, {
      x: 0.7,
      y: 4.55,
      w: 3.3,
      h: 1.3,
      fontSize: 30,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      valign: "middle",
    });
  }
  // right columns
  const cols = [
    { label: "CHALLENGE", body: challenge },
    { label: "SOLUTION", body: solution },
    { label: "RESULT", body: result },
  ];
  const colX = 4.5;
  const colW = (SLIDE_W - colX - 0.5) / 3;
  cols.forEach((col, k) => {
    const x = colX + k * colW;
    s.addText(col.label, {
      x,
      y: 0.9,
      w: colW - 0.3,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addShape("rect", {
      x,
      y: 1.35,
      w: 0.5,
      h: 0.03,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText(col.body, {
      x,
      y: 1.55,
      w: colW - 0.3,
      h: 5.0,
      fontSize: 13,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ── MV-CASE-METRICS ── client + summary + 3 metric callouts
function renderCaseMetrics(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const client = str(c.client);
  const summary = str(c.summary);
  s.addText("CASE", {
    x: 0.6,
    y: 0.6,
    w: 2,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 5,
  });
  s.addText(client, {
    x: 0.6,
    y: 1.05,
    w: SLIDE_W - 1.2,
    h: 0.9,
    fontSize: 34,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(summary, {
    x: 0.6,
    y: 2.05,
    w: SLIDE_W - 1.2,
    h: 1.5,
    fontSize: 15,
    color: p.ink,
    fontFace: "Geist",
    valign: "top",
  });
  const items = arr(c.items).slice(0, 3);
  const colW = (SLIDE_W - 1.2 - 0.4) / 3;
  const y = 3.9;
  items.forEach((it, k) => {
    const x = 0.6 + k * (colW + 0.2);
    s.addShape("rect", {
      x,
      y,
      w: colW,
      h: 2.5,
      fill: { color: p.surface },
      line: { color: LIGHT_GRAY },
    });
    s.addShape("rect", {
      x,
      y,
      w: colW,
      h: 0.08,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(`${str(it.value)}${str(it.unit)}`, {
      x: x + 0.2,
      y: y + 0.4,
      w: colW - 0.4,
      h: 1.3,
      fontSize: 54,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.label), {
      x: x + 0.2,
      y: y + 1.75,
      w: colW - 0.4,
      h: 0.7,
      fontSize: 12,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ── MV-CASE-STORY ── narrative long-form
function renderCaseStory(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  s.addText("CASE STUDY", {
    x: 0.6,
    y: 0.6,
    w: 4,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 5,
  });
  s.addText(str(c.client), {
    x: 0.6,
    y: 1.0,
    w: SLIDE_W - 1.2,
    h: 0.6,
    fontSize: 16,
    color: MID_GRAY,
    fontFace: "Geist",
  });
  s.addText(str(c.headline), {
    x: 0.6,
    y: 1.6,
    w: SLIDE_W - 1.2,
    h: 1.4,
    fontSize: 34,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addShape("rect", {
    x: 0.6,
    y: 3.1,
    w: 0.6,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(str(c.story), {
    x: 0.6,
    y: 3.3,
    w: (SLIDE_W - 1.6) * 0.65,
    h: 3.4,
    fontSize: 14,
    color: p.ink,
    fontFace: "Geist",
    valign: "top",
  });
  // result callout right
  const resX = 0.6 + (SLIDE_W - 1.2) * 0.68;
  const resW = SLIDE_W - resX - 0.6;
  s.addShape("rect", {
    x: resX,
    y: 3.3,
    w: resW,
    h: 3.3,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  s.addText("RESULT", {
    x: resX + 0.25,
    y: 3.5,
    w: resW - 0.5,
    h: 0.4,
    fontSize: 10,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 4,
  });
  s.addText(str(c.result), {
    x: resX + 0.25,
    y: 3.95,
    w: resW - 0.5,
    h: 2.5,
    fontSize: 15,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "top",
  });
}

// ── MV-CASE-LOGO-GRID ── 6 client wordmark tiles with metric
function renderCaseLogoGrid(
  s: PptxGenJS.Slide,
  c: Record<string, unknown>,
  p: Palette,
  itemLogos: Array<string | null> = [],
) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 6);
  const cols = 3,
    rows = 2;
  const gap = 0.2;
  const colW = (SLIDE_W - 1.2 - (cols - 1) * gap) / cols;
  const rowH = (5.9 - y0 - (rows - 1) * gap) / rows;
  items.forEach((it, k) => {
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * (colW + gap);
    const y = y0 + r * (rowH + gap);
    s.addShape("rect", {
      x,
      y,
      w: colW,
      h: rowH,
      fill: { color: "FFFFFF" },
      line: { color: LIGHT_GRAY },
    });
    const logoData = itemLogos[k];
    if (logoData) {
      s.addImage({
        data: logoData,
        ...containFrame(logoData, x + 0.2, y + 0.2, colW - 0.4, rowH * 0.5),
      });
    } else {
      s.addText(initials(str(it.client)), {
        x,
        y: y + 0.2,
        w: colW,
        h: rowH * 0.5,
        fontSize: 34,
        bold: true,
        color: p.primary,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
    }
    s.addText(str(it.client).toUpperCase(), {
      x,
      y: y + rowH * 0.55,
      w: colW,
      h: 0.35,
      fontSize: 10,
      bold: true,
      color: DARK_GRAY,
      fontFace: "Geist",
      align: "center",
      charSpacing: 3,
    });
    s.addShape("rect", {
      x: x + colW / 2 - 0.3,
      y: y + rowH * 0.75,
      w: 0.6,
      h: 0.03,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(it.result), {
      x: x + 0.2,
      y: y + rowH * 0.8,
      w: colW - 0.4,
      h: rowH * 0.2,
      fontSize: 11,
      italic: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
    });
  });
}

// ── MV-CLIENT-MATRIX ── 6-cell client outcome grid
function renderClientMatrix(
  s: PptxGenJS.Slide,
  c: Record<string, unknown>,
  p: Palette,
  itemLogos: Array<string | null> = [],
) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 6);
  const cols = 3,
    rows = 2;
  const gap = 0.2;
  const colW = (SLIDE_W - 1.2 - (cols - 1) * gap) / cols;
  const rowH = (5.9 - y0 - (rows - 1) * gap) / rows;
  items.forEach((it, k) => {
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * (colW + gap);
    const y = y0 + r * (rowH + gap);
    s.addShape("rect", {
      x,
      y,
      w: colW,
      h: rowH,
      fill: { color: p.surface },
      line: { color: LIGHT_GRAY },
    });
    s.addText(str(it.sector).toUpperCase(), {
      x: x + 0.2,
      y: y + 0.2,
      w: colW - 0.4,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 3,
    });
    const logoData = itemLogos[k];
    if (logoData) {
      s.addImage({
        data: logoData,
        ...containFrame(logoData, x + 0.2, y + 0.48, colW - 0.4, 0.45),
      });
      s.addText(str(it.client), {
        x: x + 0.2,
        y: y + 0.98,
        w: colW - 0.4,
        h: 0.3,
        fontSize: 10,
        color: DARK_GRAY,
        fontFace: "Geist",
        charSpacing: 2,
      });
    } else {
      s.addText(str(it.client), {
        x: x + 0.2,
        y: y + 0.5,
        w: colW - 0.4,
        h: 0.5,
        fontSize: 15,
        bold: true,
        color: p.primary,
        fontFace: "Geist",
      });
    }
    s.addText(str(it.result), {
      x: x + 0.2,
      y: y + 1.35,
      w: colW - 0.4,
      h: 0.9,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
    s.addShape("rect", {
      x: x + 0.2,
      y: y + rowH - 0.7,
      w: colW - 0.4,
      h: 0.02,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(`${str(it.metric)} ${str(it.unit)}`.trim(), {
      x: x + 0.2,
      y: y + rowH - 0.6,
      w: colW - 0.4,
      h: 0.5,
      fontSize: 22,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
  });
}

// ── MV-CLIENT-DETAIL-3 ── 3 tall client cards with image placeholder + metric
function renderClientDetail3(
  s: PptxGenJS.Slide,
  c: Record<string, unknown>,
  p: Palette,
  itemLogos: Array<string | null> = [],
) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  const gap = 0.25;
  const colW = (SLIDE_W - 1.2 - (items.length - 1) * gap) / Math.max(items.length, 1);
  items.forEach((it, k) => {
    const x = 0.6 + k * (colW + gap);
    const y = y0;
    const h = 5.7 - y0;
    const logoData = itemLogos[k];
    if (logoData) {
      s.addShape("rect", {
        x,
        y,
        w: colW,
        h: h * 0.35,
        fill: { color: "FFFFFF" },
        line: { color: LIGHT_GRAY },
      });
      s.addImage({
        data: logoData,
        ...containFrame(logoData, x + 0.3, y + 0.3, colW - 0.6, h * 0.35 - 0.6),
      });
    } else {
      s.addShape("rect", {
        x,
        y,
        w: colW,
        h: h * 0.35,
        fill: { color: p.primary },
        line: { color: p.primary },
      });
      s.addText(str(it.client).slice(0, 2).toUpperCase(), {
        x,
        y,
        w: colW,
        h: h * 0.35,
        fontSize: 44,
        bold: true,
        color: "FFFFFF",
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
    }
    // body
    s.addShape("rect", {
      x,
      y: y + h * 0.35,
      w: colW,
      h: h * 0.65,
      fill: { color: "FFFFFF" },
      line: { color: LIGHT_GRAY },
    });
    s.addText(str(it.sector).toUpperCase(), {
      x: x + 0.25,
      y: y + h * 0.37,
      w: colW - 0.5,
      h: 0.35,
      fontSize: 10,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 3,
    });
    s.addText(str(it.client), {
      x: x + 0.25,
      y: y + h * 0.42,
      w: colW - 0.5,
      h: 0.6,
      fontSize: 17,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.story), {
      x: x + 0.25,
      y: y + h * 0.55,
      w: colW - 0.5,
      h: h * 0.28,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
    s.addShape("rect", {
      x: x + 0.25,
      y: y + h * 0.88,
      w: 0.4,
      h: 0.03,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(it.metric), {
      x: x + 0.25,
      y: y + h * 0.9,
      w: colW - 0.5,
      h: 0.4,
      fontSize: 13,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
  });
}

// ── MV-CLIENT-COMPARE ── 3 rows: challenge → outcome → metric
function renderClientCompare(
  s: PptxGenJS.Slide,
  c: Record<string, unknown>,
  p: Palette,
  itemLogos: Array<string | null> = [],
) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 3);
  const headers = ["CLIENT", "CHALLENGE", "OUTCOME", "METRIC"];
  const cols = [0.6, 3.0, 6.0, 10.8];
  const colWs = [2.3, 2.9, 4.7, SLIDE_W - 0.6 - 10.8];
  headers.forEach((h, k) => {
    s.addText(h, {
      x: cols[k],
      y: y0,
      w: colWs[k] - 0.2,
      h: 0.4,
      fontSize: 10,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 3,
    });
  });
  s.addShape("rect", {
    x: 0.6,
    y: y0 + 0.42,
    w: SLIDE_W - 1.2,
    h: 0.02,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  const rowH = (5.8 - y0 - 0.5) / Math.max(items.length, 1);
  items.forEach((it, k) => {
    const y = y0 + 0.55 + k * rowH;
    if (k > 0)
      s.addShape("rect", {
        x: 0.6,
        y: y - 0.05,
        w: SLIDE_W - 1.2,
        h: 0.01,
        fill: { color: LIGHT_GRAY },
        line: { color: LIGHT_GRAY },
      });
    const logoData = itemLogos[k];
    if (logoData) {
      // Compact logo mark above the client name inside the CLIENT column.
      s.addImage({
        data: logoData,
        ...containFrame(logoData, cols[0], y + 0.05, 0.9, 0.45),
      });
      s.addText(str(it.client), {
        x: cols[0],
        y: y + 0.55,
        w: colWs[0] - 0.2,
        h: rowH - 0.6,
        fontSize: 12,
        bold: true,
        color: p.primary,
        fontFace: "Geist",
        valign: "top",
      });
    } else {
      s.addText(str(it.client), {
        x: cols[0],
        y,
        w: colWs[0] - 0.2,
        h: rowH - 0.1,
        fontSize: 14,
        bold: true,
        color: p.primary,
        fontFace: "Geist",
        valign: "top",
      });
    }
    s.addText(str(it.challenge), {
      x: cols[1],
      y,
      w: colWs[1] - 0.2,
      h: rowH - 0.1,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
    s.addText(str(it.outcome), {
      x: cols[2],
      y,
      w: colWs[2] - 0.2,
      h: rowH - 0.1,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
    s.addText(str(it.metric), {
      x: cols[3],
      y,
      w: colWs[3] - 0.2,
      h: rowH - 0.1,
      fontSize: 15,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ── MV-GOV-RACI ── cadence table (forum · cadence · purpose)
function renderGovRaci(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const headers = ["FORUM", "CADENCE", "PURPOSE"];
  const cols = [0.6, 4.4, 7.6];
  const colWs = [3.6, 3.0, SLIDE_W - 0.6 - 7.6];
  headers.forEach((h, k) =>
    s.addText(h, {
      x: cols[k],
      y: y0,
      w: colWs[k] - 0.2,
      h: 0.4,
      fontSize: 10,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 3,
    }),
  );
  s.addShape("rect", {
    x: 0.6,
    y: y0 + 0.42,
    w: SLIDE_W - 1.2,
    h: 0.02,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  const rowH = Math.min(1.4, (5.8 - y0 - 0.55) / Math.max(items.length, 1));
  items.forEach((it, k) => {
    const y = y0 + 0.55 + k * rowH;
    if (k % 2 === 0)
      s.addShape("rect", {
        x: 0.6,
        y,
        w: SLIDE_W - 1.2,
        h: rowH,
        fill: { color: p.surface },
        line: { color: p.surface },
      });
    s.addText(str(it.forum), {
      x: cols[0],
      y,
      w: colWs[0] - 0.2,
      h: rowH,
      fontSize: 15,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      valign: "middle",
    });
    s.addText(str(it.cadence), {
      x: cols[1],
      y,
      w: colWs[1] - 0.2,
      h: rowH,
      fontSize: 12,
      color: p.accent,
      fontFace: "Geist",
      valign: "middle",
    });
    s.addText(str(it.purpose), {
      x: cols[2],
      y,
      w: colWs[2] - 0.2,
      h: rowH,
      fontSize: 12,
      color: p.ink,
      fontFace: "Geist",
      valign: "middle",
    });
  });
}

// ── MV-COMM-PRICING ── 3 pricing tier cards with feature bullets
function renderCommPricing(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 4);
  const n = items.length;
  const gap = 0.25;
  const colW = (SLIDE_W - 1.2 - (n - 1) * gap) / Math.max(n, 1);
  const h = 5.5 - y0;
  items.forEach((it, k) => {
    const x = 0.6 + k * (colW + gap);
    const isHero = k === 1 && n >= 2; // middle = recommended
    const stroke = isHero ? p.accent : LIGHT_GRAY;
    s.addShape("rect", {
      x,
      y: y0,
      w: colW,
      h,
      fill: { color: isHero ? p.primary : "FFFFFF" },
      line: { color: stroke, width: isHero ? 2 : 1 },
    });
    const inkOn = isHero ? "FFFFFF" : p.primary;
    const bodyOn = isHero ? "FFFFFF" : p.ink;
    s.addText(str(it.name).toUpperCase(), {
      x: x + 0.3,
      y: y0 + 0.3,
      w: colW - 0.6,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: isHero ? p.accent : p.accent,
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addText(str(it.price), {
      x: x + 0.3,
      y: y0 + 0.7,
      w: colW - 0.6,
      h: 1.1,
      fontSize: 40,
      bold: true,
      color: inkOn,
      fontFace: "Geist",
    });
    s.addText(str(it.unit), {
      x: x + 0.3,
      y: y0 + 1.75,
      w: colW - 0.6,
      h: 0.4,
      fontSize: 11,
      italic: true,
      color: bodyOn,
      fontFace: "Geist",
    });
    s.addShape("rect", {
      x: x + 0.3,
      y: y0 + 2.2,
      w: colW - 0.6,
      h: 0.02,
      fill: { color: isHero ? p.accent : LIGHT_GRAY },
      line: { color: isHero ? p.accent : LIGHT_GRAY },
    });
    const feats = Array.isArray(it.features) ? (it.features as unknown[]).map(String) : [];
    s.addText(
      feats.map((f) => ({
        text: f,
        options: { bullet: { code: "25CF" }, fontFace: "Geist", fontSize: 11, color: bodyOn },
      })),
      {
        x: x + 0.3,
        y: y0 + 2.35,
        w: colW - 0.6,
        h: h - 2.6,
        fontSize: 11,
        color: bodyOn,
        paraSpaceAfter: 4,
      },
    );
  });
}

// ── MV-COMM-INVESTMENT ── hero number + inclusion list
function renderCommInvestment(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const amount = str(c.amount);
  const unit = str(c.unit);
  const items = arr(c.items);
  const leftW = 6.0;
  s.addText("INVESTMENT", {
    x: 0.6,
    y: y0 + 0.2,
    w: leftW,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 5,
  });
  s.addText(amount, {
    x: 0.6,
    y: y0 + 0.65,
    w: leftW,
    h: 2.6,
    fontSize: 96,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(unit, {
    x: 0.6,
    y: y0 + 3.3,
    w: leftW,
    h: 0.6,
    fontSize: 15,
    italic: true,
    color: p.ink,
    fontFace: "Geist",
  });
  // right list
  const rx = leftW + 0.9;
  const rw = SLIDE_W - rx - 0.6;
  s.addText("INCLUDES", {
    x: rx,
    y: y0 + 0.2,
    w: rw,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 4,
  });
  s.addShape("rect", {
    x: rx,
    y: y0 + 0.62,
    w: 0.5,
    h: 0.03,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  items.forEach((it, k) => {
    const y = y0 + 0.9 + k * 0.65;
    s.addShape("ellipse", {
      x: rx,
      y: y + 0.15,
      w: 0.15,
      h: 0.15,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(it.label), {
      x: rx + 0.3,
      y,
      w: rw - 0.3,
      h: 0.55,
      fontSize: 14,
      color: p.primary,
      fontFace: "Geist",
      valign: "middle",
    });
  });
}

// ── MV-DEC-MATRIX ── 2x2 with axes labelled + quadrant fills
function renderDecMatrix(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const axisX = str(c.axisX);
  const axisY = str(c.axisY);
  const quads = [str(c.q1), str(c.q2), str(c.q3), str(c.q4)];
  const gx = 1.8,
    gy = y0 + 0.2,
    gw = SLIDE_W - 3.0,
    gh = 5.4 - y0;
  const midX = gx + gw / 2;
  const midY = gy + gh / 2;
  // quadrant fills — q1 is winner (top-right)
  const cellW = gw / 2,
    cellH = gh / 2;
  const cells = [
    { x: gx + cellW, y: gy, color: p.accent, tone: "FFFFFF", label: quads[0] },
    { x: gx, y: gy, color: p.surface, tone: p.primary, label: quads[1] },
    { x: gx, y: gy + cellH, color: p.surface, tone: p.primary, label: quads[2] },
    { x: gx + cellW, y: gy + cellH, color: p.surface, tone: p.primary, label: quads[3] },
  ];
  cells.forEach((cell) => {
    s.addShape("rect", {
      x: cell.x,
      y: cell.y,
      w: cellW,
      h: cellH,
      fill: { color: cell.color },
      line: { color: LIGHT_GRAY },
    });
    s.addText(cell.label, {
      x: cell.x + 0.25,
      y: cell.y + 0.25,
      w: cellW - 0.5,
      h: cellH - 0.5,
      fontSize: 16,
      bold: true,
      color: cell.tone,
      fontFace: "Geist",
      valign: "middle",
      align: "center",
    });
  });
  // axes
  s.addShape("line", { x: gx, y: midY, w: gw, h: 0, line: { color: p.primary, width: 2 } });
  s.addShape("line", { x: midX, y: gy, w: 0, h: gh, line: { color: p.primary, width: 2 } });
  s.addText(axisX.toUpperCase(), {
    x: gx,
    y: gy + gh + 0.1,
    w: gw,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "center",
    charSpacing: 4,
  });
  s.addText(axisY.toUpperCase(), {
    x: 0.4,
    y: gy + gh / 2 - 0.2,
    w: 1.3,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "right",
    charSpacing: 4,
  });
}

// ── MV-DEC-COMPARE-TABLE ── real 3-column comparison table with winner column
function renderDecCompareTable(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const columns = arr(c.columns);
  const rows = arr(c.items);
  const nCols = columns.length;
  const critW = 3.2;
  const availW = SLIDE_W - 1.2 - critW;
  const colW = availW / Math.max(nCols, 1);
  const headY = y0;
  // criterion header
  s.addText("CRITERION", {
    x: 0.6,
    y: headY,
    w: critW - 0.2,
    h: 0.5,
    fontSize: 10,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 3,
  });
  columns.forEach((col, k) => {
    const x = 0.6 + critW + k * colW;
    const isHero = k === nCols - 1;
    if (isHero)
      s.addShape("rect", {
        x,
        y: headY,
        w: colW - 0.1,
        h: 0.55,
        fill: { color: p.primary },
        line: { color: p.primary },
      });
    s.addText(str(col.label).toUpperCase(), {
      x,
      y: headY,
      w: colW - 0.1,
      h: 0.55,
      fontSize: 11,
      bold: true,
      color: isHero ? "FFFFFF" : p.primary,
      fontFace: "Geist",
      align: "center",
      valign: "middle",
      charSpacing: 3,
    });
  });
  const rowH = Math.min(0.9, (5.8 - y0 - 0.7) / Math.max(rows.length, 1));
  rows.forEach((row, r) => {
    const y = y0 + 0.65 + r * rowH;
    if (r % 2 === 1)
      s.addShape("rect", {
        x: 0.6,
        y,
        w: SLIDE_W - 1.2,
        h: rowH,
        fill: { color: p.surface },
        line: { color: p.surface },
      });
    s.addText(str(row.criterion), {
      x: 0.6,
      y,
      w: critW - 0.2,
      h: rowH,
      fontSize: 12,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      valign: "middle",
    });
    const values = Array.isArray(row.values) ? (row.values as unknown[]).map(String) : [];
    values.slice(0, nCols).forEach((v, k) => {
      const x = 0.6 + critW + k * colW;
      const isHero = k === nCols - 1;
      s.addText(v, {
        x,
        y,
        w: colW - 0.1,
        h: rowH,
        fontSize: 12,
        bold: isHero,
        color: isHero ? p.accent : p.ink,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
    });
  });
}

// ── MV-DEC-CHECKLIST ── check rows with note
function renderDecChecklist(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const rowH = Math.min(1.0, (5.9 - y0) / Math.max(items.length, 1));
  items.forEach((it, k) => {
    const y = y0 + k * rowH;
    // check mark badge
    s.addShape("ellipse", {
      x: 0.7,
      y: y + rowH / 2 - 0.28,
      w: 0.56,
      h: 0.56,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText("\u2713", {
      x: 0.7,
      y: y + rowH / 2 - 0.32,
      w: 0.56,
      h: 0.6,
      fontSize: 26,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    s.addText(str(it.label), {
      x: 1.5,
      y: y + 0.05,
      w: SLIDE_W - 2.1,
      h: 0.5,
      fontSize: 15,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.note), {
      x: 1.5,
      y: y + 0.55,
      w: SLIDE_W - 2.1,
      h: rowH - 0.55,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ── MV-PROOF-LOGOS ── logo strip (initials tiles)
function renderProofLogos(
  s: PptxGenJS.Slide,
  c: Record<string, unknown>,
  p: Palette,
  itemLogos: Array<string | null> = [],
) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 8);
  if (!items.length) return;
  const cols = Math.min(items.length, 4);
  const rows = Math.ceil(items.length / cols);
  const gap = 0.2;
  const colW = (SLIDE_W - 1.2 - (cols - 1) * gap) / cols;
  const rowH = Math.min(1.6, (5.6 - y0 - (rows - 1) * gap) / rows);
  items.forEach((it, k) => {
    const r = Math.floor(k / cols);
    const col = k % cols;
    const x = 0.6 + col * (colW + gap);
    const y = y0 + 0.3 + r * (rowH + gap);
    s.addShape("rect", {
      x,
      y,
      w: colW,
      h: rowH,
      fill: { color: "FFFFFF" },
      line: { color: LIGHT_GRAY },
    });
    const name = str(it.name || it.client || it.label);
    const logoData = itemLogos[k];
    if (logoData) {
      s.addImage({
        data: logoData,
        ...containFrame(logoData, x + 0.15, y + 0.1, colW - 0.3, rowH * 0.6),
      });
    } else {
      s.addText(initials(name), {
        x,
        y,
        w: colW,
        h: rowH * 0.65,
        fontSize: 32,
        bold: true,
        color: p.primary,
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
    }
    s.addText(name.toUpperCase(), {
      x,
      y: y + rowH * 0.68,
      w: colW,
      h: rowH * 0.3,
      fontSize: 10,
      color: DARK_GRAY,
      fontFace: "Geist",
      align: "center",
      charSpacing: 3,
    });
  });
}

// ── MV-PROOF-TESTIMONIAL ── quote + metric pull card
function renderProofTestimonial(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const quote = str(c.quote || c.body);
  const attribution = str(c.attribution || c.author);
  const role = str(c.role);
  const metric = str(c.metric);
  // Left: quote
  s.addText("\u201C", {
    x: 0.6,
    y: 0.7,
    w: 1.5,
    h: 1.5,
    fontSize: 140,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
  });
  s.addText(quote, {
    x: 0.9,
    y: 2.1,
    w: 8.2,
    h: 3.4,
    fontSize: 26,
    italic: true,
    color: p.primary,
    fontFace: "Geist",
    valign: "top",
  });
  if (attribution)
    s.addText(`${attribution}${role ? ` · ${role}` : ""}`, {
      x: 0.9,
      y: 5.8,
      w: 8.2,
      h: 0.5,
      fontSize: 13,
      color: p.ink,
      fontFace: "Geist",
      charSpacing: 2,
    });
  // Right: metric card
  if (metric) {
    const rx = 9.6;
    const rw = SLIDE_W - rx - 0.6;
    s.addShape("rect", {
      x: rx,
      y: 1.2,
      w: rw,
      h: 5.0,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText("RESULT", {
      x: rx + 0.3,
      y: 1.5,
      w: rw - 0.6,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addText(metric, {
      x: rx + 0.3,
      y: 2.4,
      w: rw - 0.6,
      h: 3.0,
      fontSize: 46,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "middle",
    });
  }
}

// ── MV-RISK-MITIGATION ── risk → mitigation paired rows
function renderRiskMitigation(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const rowH = Math.min(1.5, (5.9 - y0) / Math.max(items.length, 1));
  items.forEach((it, k) => {
    const y = y0 + k * rowH;
    // risk pill (left)
    s.addShape("rect", {
      x: 0.6,
      y,
      w: 5.8,
      h: rowH - 0.15,
      fill: { color: p.surface },
      line: { color: LIGHT_GRAY },
    });
    s.addShape("rect", {
      x: 0.6,
      y,
      w: 0.1,
      h: rowH - 0.15,
      fill: { color: "E53D2E" },
      line: { color: "E53D2E" },
    });
    s.addText("RISK", {
      x: 0.85,
      y: y + 0.15,
      w: 1.2,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: "E53D2E",
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addText(str(it.risk), {
      x: 0.85,
      y: y + 0.45,
      w: 5.35,
      h: rowH - 0.6,
      fontSize: 13,
      color: p.primary,
      fontFace: "Geist",
      valign: "top",
    });
    // arrow
    s.addText("→", {
      x: 6.5,
      y: y + rowH / 2 - 0.3,
      w: 0.6,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
    });
    // mitigation (right)
    s.addShape("rect", {
      x: 7.15,
      y,
      w: SLIDE_W - 7.15 - 0.6,
      h: rowH - 0.15,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText("MITIGATION", {
      x: 7.4,
      y: y + 0.15,
      w: 2,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addText(str(it.mitigation), {
      x: 7.4,
      y: y + 0.45,
      w: SLIDE_W - 7.4 - 0.75,
      h: rowH - 0.6,
      fontSize: 13,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ── MV-TEAM-BIOS-3 / -4 ── avatar row with name/role/bio
function renderTeamBios(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette, n: 3 | 4) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, n);
  const gap = 0.3;
  const colW = (SLIDE_W - 1.2 - (n - 1) * gap) / n;
  items.forEach((it, k) => {
    const x = 0.6 + k * (colW + gap);
    const y = y0 + 0.2;
    const cxAv = x + colW / 2;
    const avR = Math.min(1.1, colW * 0.28);
    s.addShape("ellipse", {
      x: cxAv - avR,
      y,
      w: avR * 2,
      h: avR * 2,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText(initials(str(it.name)), {
      x: cxAv - avR,
      y,
      w: avR * 2,
      h: avR * 2,
      fontSize: 32,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    s.addText(str(it.name), {
      x,
      y: y + avR * 2 + 0.2,
      w: colW,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.role).toUpperCase(), {
      x,
      y: y + avR * 2 + 0.65,
      w: colW,
      h: 0.35,
      fontSize: 10,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
      charSpacing: 3,
    });
    s.addShape("rect", {
      x: cxAv - 0.25,
      y: y + avR * 2 + 1.05,
      w: 0.5,
      h: 0.02,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(str(it.bio), {
      x,
      y: y + avR * 2 + 1.2,
      w: colW,
      h: 5.5 - (y + avR * 2 + 1.2),
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      align: "center",
      valign: "top",
    });
  });
}

// ── MV-SOL-ARCHITECTURE ── stacked layer diagram
function renderSolArchitecture(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const availH = 5.7 - y0;
  const layerH = availH / Math.max(items.length, 1);
  items.forEach((it, k) => {
    const y = y0 + k * layerH;
    const transparency = 15 + k * 15;
    s.addShape("rect", {
      x: 0.6,
      y,
      w: SLIDE_W - 1.2,
      h: layerH - 0.1,
      fill: { color: p.primary, transparency },
      line: { color: "FFFFFF", width: 2 },
    });
    // left accent block
    s.addShape("rect", {
      x: 0.6,
      y,
      w: 0.12,
      h: layerH - 0.1,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    s.addText(String(items.length - k).padStart(2, "0"), {
      x: 1.0,
      y: y + 0.15,
      w: 1.0,
      h: layerH - 0.3,
      fontSize: 32,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "middle",
    });
    s.addText(str(it.label), {
      x: 2.1,
      y: y + 0.2,
      w: 4.0,
      h: layerH - 0.3,
      fontSize: 17,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "middle",
    });
    s.addText(str(it.body), {
      x: 6.3,
      y: y + 0.2,
      w: SLIDE_W - 7.0,
      h: layerH - 0.3,
      fontSize: 12,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "middle",
    });
  });
}

// ── MV-SOL-FEATURE-LIST ── 2-col checked feature list
function renderSolFeatureList(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const cols = 2;
  const perCol = Math.ceil(items.length / cols);
  const gap = 0.4;
  const colW = (SLIDE_W - 1.2 - gap) / cols;
  const rowH = Math.min(1.1, (5.9 - y0) / Math.max(perCol, 1));
  items.forEach((it, k) => {
    const col = Math.floor(k / perCol);
    const row = k % perCol;
    const x = 0.6 + col * (colW + gap);
    const y = y0 + row * rowH;
    s.addShape("ellipse", {
      x,
      y: y + 0.1,
      w: 0.4,
      h: 0.4,
      fill: { color: p.accent },
      line: { color: p.accent },
    });
    if (
      !addIconGlyph(s, str(it.label), {
        x: x + 0.1,
        y: y + 0.2,
        size: 0.2,
        color: "FFFFFF",
        index: k,
        icon: it.icon,
      })
    ) {
      s.addText("\u2713", {
        x,
        y: y + 0.05,
        w: 0.4,
        h: 0.4,
        fontSize: 18,
        bold: true,
        color: "FFFFFF",
        fontFace: "Geist",
        align: "center",
        valign: "middle",
      });
    }
    s.addText(str(it.label), {
      x: x + 0.55,
      y,
      w: colW - 0.55,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.body), {
      x: x + 0.55,
      y: y + 0.45,
      w: colW - 0.55,
      h: rowH - 0.5,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ── MV-PROC-BEFORE-AFTER ── narrative before → after with divider
function renderProcBeforeAfter(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const before = obj(c.before);
  const after = obj(c.after);
  const gap = 0.4;
  const colW = (SLIDE_W - 1.2 - gap) / 2;
  const h = 5.6 - y0;
  // before
  s.addShape("rect", {
    x: 0.6,
    y: y0,
    w: colW,
    h,
    fill: { color: p.surface },
    line: { color: LIGHT_GRAY },
  });
  s.addText("BEFORE", {
    x: 0.85,
    y: y0 + 0.25,
    w: colW - 0.5,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: MID_GRAY,
    fontFace: "Geist",
    charSpacing: 5,
  });
  s.addText(str(before.title || before.label), {
    x: 0.85,
    y: y0 + 0.75,
    w: colW - 0.5,
    h: 1.2,
    fontSize: 22,
    bold: true,
    color: DARK_GRAY,
    fontFace: "Geist",
  });
  s.addText(str(before.body), {
    x: 0.85,
    y: y0 + 2.1,
    w: colW - 0.5,
    h: h - 2.3,
    fontSize: 13,
    color: p.ink,
    fontFace: "Geist",
    valign: "top",
  });
  // divider arrow
  const arrowX = 0.6 + colW + gap / 2;
  s.addText("→", {
    x: arrowX - 0.4,
    y: y0 + h / 2 - 0.4,
    w: 0.8,
    h: 0.8,
    fontSize: 44,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
  });
  // after
  const ax = 0.6 + colW + gap;
  s.addShape("rect", {
    x: ax,
    y: y0,
    w: colW,
    h,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  s.addText("AFTER", {
    x: ax + 0.25,
    y: y0 + 0.25,
    w: colW - 0.5,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 5,
  });
  s.addText(str(after.title || after.label), {
    x: ax + 0.25,
    y: y0 + 0.75,
    w: colW - 0.5,
    h: 1.2,
    fontSize: 22,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
  });
  s.addText(str(after.body), {
    x: ax + 0.25,
    y: y0 + 2.1,
    w: colW - 0.5,
    h: h - 2.3,
    fontSize: 13,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "top",
  });
}

// ═════════════════════════ M2 batch renderers ═════════════════════════
// Bespoke treatments for 26 covers, agendas, dividers, close, and quote
// variants that previously fell through to the generic family renderers.
// Backgrounds (dark for cover/divider, light otherwise) are set upstream
// by classifyVariant, so these renderers place text against the correct
// scene without re-establishing the fill.

// ── Covers ─────────────────────────────────────────────────────────────

// MV-OP-COVER-DOSSIER — file-tab / classified dossier
function renderCoverDossier(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = str(c.title) || "Untitled";
  const subtitle = str(c.subtitle || c.kicker);
  const client = str(c.client || c.for);
  const date = str(c.date);
  // top tab band
  s.addShape("rect", {
    x: 0.6,
    y: 0.55,
    w: 3.2,
    h: 0.55,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText("CONFIDENTIAL · DOSSIER", {
    x: 0.6,
    y: 0.55,
    w: 3.2,
    h: 0.55,
    fontSize: 11,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
    charSpacing: 4,
  });
  // frame
  s.addShape("rect", {
    x: 0.6,
    y: 1.25,
    w: SLIDE_W - 1.2,
    h: 5.4,
    fill: { color: p.primary, transparency: 100 },
    line: { color: "FFFFFF", width: 1 },
  });
  s.addText(title, {
    x: 1.0,
    y: 2.6,
    w: SLIDE_W - 2.0,
    h: 2.6,
    fontSize: 52,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "middle",
  });
  if (subtitle)
    s.addText(subtitle, {
      x: 1.0,
      y: 5.1,
      w: SLIDE_W - 2.0,
      h: 0.7,
      fontSize: 18,
      color: "FFFFFF",
      fontFace: "Geist",
    });
  // metadata row
  const meta: string[] = [];
  if (client) meta.push(`FOR · ${client.toUpperCase()}`);
  if (date) meta.push(`DATE · ${date.toUpperCase()}`);
  if (meta.length)
    s.addText(meta.join("     "), {
      x: 1.0,
      y: 6.15,
      w: SLIDE_W - 2.0,
      h: 0.35,
      fontSize: 10,
      color: "FFFFFF",
      fontFace: "Geist",
      charSpacing: 4,
    });
}

// MV-OP-COVER-EDITORIAL — magazine-style serif cover
function renderCoverEditorial(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = str(c.title) || "Untitled";
  const subtitle = str(c.subtitle || c.kicker);
  const date = str(c.date);
  s.addText("VOLUME 01 · EDITION", {
    x: 0.8,
    y: 0.9,
    w: SLIDE_W - 1.6,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 8,
  });
  s.addShape("rect", {
    x: 0.8,
    y: 1.4,
    w: SLIDE_W - 1.6,
    h: 0.02,
    fill: { color: "FFFFFF" },
    line: { color: "FFFFFF" },
  });
  s.addText(title, {
    x: 0.8,
    y: 1.9,
    w: SLIDE_W - 1.6,
    h: 3.8,
    fontSize: 84,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "middle",
  });
  s.addShape("rect", {
    x: 0.8,
    y: 5.9,
    w: SLIDE_W - 1.6,
    h: 0.02,
    fill: { color: "FFFFFF" },
    line: { color: "FFFFFF" },
  });
  if (subtitle)
    s.addText(subtitle, {
      x: 0.8,
      y: 6.05,
      w: SLIDE_W - 3,
      h: 0.5,
      fontSize: 16,
      italic: true,
      color: "FFFFFF",
      fontFace: "Geist",
    });
  if (date)
    s.addText(date.toUpperCase(), {
      x: SLIDE_W - 3.2,
      y: 6.05,
      w: 2.4,
      h: 0.5,
      fontSize: 11,
      color: p.accent,
      fontFace: "Geist",
      align: "right",
      charSpacing: 4,
    });
}

// MV-OP-COVER-GRADIENT — gradient wash + bold title
function renderCoverGradient(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  // simulate gradient with layered translucent bars
  for (let i = 0; i < 8; i++) {
    s.addShape("rect", {
      x: 0,
      y: (i * SLIDE_H) / 8,
      w: SLIDE_W,
      h: SLIDE_H / 8 + 0.05,
      fill: { color: p.accent, transparency: 70 + i * 3 },
      line: { color: p.accent, transparency: 100 },
    });
  }
  const title = str(c.title) || "Untitled";
  const subtitle = str(c.subtitle || c.kicker);
  s.addText(title, {
    x: 0.8,
    y: 2.4,
    w: SLIDE_W - 1.6,
    h: 3.0,
    fontSize: 66,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "middle",
  });
  if (subtitle)
    s.addText(subtitle, {
      x: 0.8,
      y: 5.4,
      w: SLIDE_W - 1.6,
      h: 0.6,
      fontSize: 20,
      color: "FFFFFF",
      fontFace: "Geist",
    });
}

// MV-OP-COVER-GRID — grid overlay with title in cell
function renderCoverGrid(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = str(c.title) || "Untitled";
  const subtitle = str(c.subtitle || c.kicker);
  const cols = 6,
    rows = 4;
  const cw = SLIDE_W / cols,
    rh = SLIDE_H / rows;
  for (let i = 1; i < cols; i++)
    s.addShape("rect", {
      x: i * cw - 0.005,
      y: 0,
      w: 0.01,
      h: SLIDE_H,
      fill: { color: "FFFFFF", transparency: 82 },
      line: { color: "FFFFFF", transparency: 100 },
    });
  for (let i = 1; i < rows; i++)
    s.addShape("rect", {
      x: 0,
      y: i * rh - 0.005,
      w: SLIDE_W,
      h: 0.01,
      fill: { color: "FFFFFF", transparency: 82 },
      line: { color: "FFFFFF", transparency: 100 },
    });
  // highlighted cell
  s.addShape("rect", {
    x: cw,
    y: rh,
    w: cw * 4,
    h: rh * 2,
    fill: { color: p.accent, transparency: 55 },
    line: { color: p.accent, transparency: 100 },
  });
  s.addText(title, {
    x: cw + 0.2,
    y: rh + 0.2,
    w: cw * 4 - 0.4,
    h: rh * 2 - 0.4,
    fontSize: 48,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "middle",
  });
  if (subtitle)
    s.addText(subtitle, {
      x: cw,
      y: rh * 3.2,
      w: cw * 4,
      h: 0.5,
      fontSize: 16,
      color: "FFFFFF",
      fontFace: "Geist",
    });
}

// MV-OP-COVER-MEDIA — media zone left placeholder + title right
function renderCoverMedia(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = str(c.title) || "Untitled";
  const subtitle = str(c.subtitle || c.kicker);
  // left media frame (upstream imagery underlay may already cover this)
  s.addShape("rect", {
    x: 0,
    y: 0,
    w: SLIDE_W * 0.5,
    h: SLIDE_H,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  s.addShape("rect", {
    x: SLIDE_W * 0.5,
    y: 0,
    w: SLIDE_W * 0.5,
    h: SLIDE_H,
    fill: { color: "FFFFFF" },
    line: { color: "FFFFFF" },
  });
  s.addShape("rect", {
    x: SLIDE_W * 0.5 + 0.6,
    y: 3.1,
    w: 0.15,
    h: 1.6,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(title, {
    x: SLIDE_W * 0.5 + 0.9,
    y: 2.6,
    w: SLIDE_W * 0.5 - 1.4,
    h: 2.6,
    fontSize: 40,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    valign: "middle",
  });
  if (subtitle)
    s.addText(subtitle, {
      x: SLIDE_W * 0.5 + 0.9,
      y: 5.1,
      w: SLIDE_W * 0.5 - 1.4,
      h: 0.7,
      fontSize: 16,
      color: p.ink,
      fontFace: "Geist",
    });
}

// MV-OP-COVER-MINIMAL — tiny mark + big title only
function renderCoverMinimal(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = str(c.title) || "Untitled";
  const subtitle = str(c.subtitle || c.kicker);
  s.addShape("ellipse", {
    x: 0.8,
    y: 0.9,
    w: 0.3,
    h: 0.3,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(title, {
    x: 0.8,
    y: 3.0,
    w: SLIDE_W - 1.6,
    h: 2.6,
    fontSize: 72,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "middle",
  });
  if (subtitle)
    s.addText(subtitle, {
      x: 0.8,
      y: 5.7,
      w: SLIDE_W - 1.6,
      h: 0.6,
      fontSize: 16,
      color: "FFFFFF",
      fontFace: "Geist",
      charSpacing: 3,
    });
}

// MV-OP-COVER-MONOGRAM — huge single letter watermark + title
function renderCoverMonogram(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = str(c.title) || "Untitled";
  const subtitle = str(c.subtitle || c.kicker);
  const mono =
    str(c.monogram || title)
      .trim()
      .charAt(0)
      .toUpperCase() || "T";
  s.addText(mono, {
    x: -0.5,
    y: -0.8,
    w: 10,
    h: 9,
    fontSize: 560,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    valign: "middle",
  });
  s.addText(title, {
    x: 0.8,
    y: 4.6,
    w: SLIDE_W - 1.6,
    h: 1.6,
    fontSize: 46,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
  });
  if (subtitle)
    s.addText(subtitle, {
      x: 0.8,
      y: 6.1,
      w: SLIDE_W - 1.6,
      h: 0.6,
      fontSize: 16,
      color: "FFFFFF",
      fontFace: "Geist",
    });
}

// MV-OP-COVER-POSTER — theatrical, giant caps
function renderCoverPoster(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = (str(c.title) || "Untitled").toUpperCase();
  const subtitle = str(c.subtitle || c.kicker);
  const date = str(c.date);
  s.addShape("rect", {
    x: 0.6,
    y: 0.6,
    w: SLIDE_W - 1.2,
    h: SLIDE_H - 1.2,
    fill: { color: p.primary, transparency: 100 },
    line: { color: p.accent, width: 3 },
  });
  s.addText(title, {
    x: 0.9,
    y: 1.4,
    w: SLIDE_W - 1.8,
    h: 4.4,
    fontSize: 96,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "middle",
    charSpacing: -2,
  });
  if (subtitle)
    s.addText(subtitle.toUpperCase(), {
      x: 0.9,
      y: 5.8,
      w: SLIDE_W - 1.8,
      h: 0.5,
      fontSize: 13,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 8,
    });
  if (date)
    s.addText(date.toUpperCase(), {
      x: 0.9,
      y: 6.3,
      w: SLIDE_W - 1.8,
      h: 0.4,
      fontSize: 11,
      color: "FFFFFF",
      fontFace: "Geist",
      charSpacing: 4,
    });
}

// MV-OP-COVER-SPLIT — 50/50 accent block + title
function renderCoverSplit(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = str(c.title) || "Untitled";
  const subtitle = str(c.subtitle || c.kicker);
  s.addShape("rect", {
    x: 0,
    y: 0,
    w: SLIDE_W / 2,
    h: SLIDE_H,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(title, {
    x: 0.6,
    y: 2.8,
    w: SLIDE_W / 2 - 1.0,
    h: 2.4,
    fontSize: 48,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    valign: "middle",
  });
  s.addShape("rect", {
    x: SLIDE_W / 2 + 0.6,
    y: 3.2,
    w: 0.12,
    h: 1.4,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  if (subtitle)
    s.addText(subtitle, {
      x: SLIDE_W / 2 + 0.9,
      y: 3.2,
      w: SLIDE_W / 2 - 1.5,
      h: 1.4,
      fontSize: 20,
      color: "FFFFFF",
      fontFace: "Geist",
      valign: "middle",
    });
}

// MV-OP-COVER-STACKED — kicker/title/subtitle stacked
function renderCoverStacked(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = str(c.title) || "Untitled";
  const subtitle = str(c.subtitle);
  const kicker = str(c.kicker || c.eyebrow);
  const date = str(c.date);
  let y = 2.0;
  if (kicker) {
    s.addText(kicker.toUpperCase(), {
      x: 0.8,
      y,
      w: SLIDE_W - 1.6,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 6,
    });
    y += 0.5;
  }
  s.addShape("rect", {
    x: 0.8,
    y: y + 0.1,
    w: 1.0,
    h: 0.06,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  y += 0.35;
  s.addText(title, {
    x: 0.8,
    y,
    w: SLIDE_W - 1.6,
    h: 2.6,
    fontSize: 56,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
  });
  y += 2.4;
  if (subtitle) {
    s.addText(subtitle, {
      x: 0.8,
      y,
      w: SLIDE_W - 1.6,
      h: 0.7,
      fontSize: 20,
      color: "FFFFFF",
      fontFace: "Geist",
    });
    y += 0.8;
  }
  if (date)
    s.addText(date, {
      x: 0.8,
      y,
      w: SLIDE_W - 1.6,
      h: 0.5,
      fontSize: 12,
      color: "FFFFFF",
      fontFace: "Geist",
      charSpacing: 3,
    });
}

// ── Agenda / Divider / Intro ───────────────────────────────────────────

// MV-OP-AGENDA-VERTICAL — vertical list with rules and durations
function renderAgendaVertical(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  if (!items.length) return;
  const n = Math.min(items.length, 7);
  const rowH = (5.9 - y0) / n;
  items.slice(0, n).forEach((it, k) => {
    const y = y0 + k * rowH;
    // rule
    s.addShape("rect", {
      x: 0.6,
      y,
      w: SLIDE_W - 1.2,
      h: 0.02,
      fill: { color: LIGHT_GRAY },
      line: { color: LIGHT_GRAY },
    });
    s.addText(String(k + 1).padStart(2, "0"), {
      x: 0.6,
      y: y + 0.15,
      w: 0.9,
      h: rowH - 0.3,
      fontSize: 26,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      valign: "middle",
    });
    s.addText(str(it.label || it.title || it.name), {
      x: 1.6,
      y: y + 0.15,
      w: SLIDE_W - 5.0,
      h: rowH - 0.3,
      fontSize: 18,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      valign: "middle",
    });
    const meta = str(it.duration || it.time);
    if (meta)
      s.addText(meta.toUpperCase(), {
        x: SLIDE_W - 3.2,
        y: y + 0.15,
        w: 2.6,
        h: rowH - 0.3,
        fontSize: 11,
        color: p.ink,
        fontFace: "Geist",
        align: "right",
        valign: "middle",
        charSpacing: 4,
      });
  });
  // closing rule
  s.addShape("rect", {
    x: 0.6,
    y: y0 + n * rowH,
    w: SLIDE_W - 1.2,
    h: 0.02,
    fill: { color: LIGHT_GRAY },
    line: { color: LIGHT_GRAY },
  });
}

// MV-OP-DIVIDER-NUMBERED — huge numeral + section title (dark)
function renderDividerNumbered(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const title = str(c.title || c.headline) || "Section";
  const num = str(c.number || c.kicker || c.eyebrow || "01");
  const body = str(c.body || c.narrative);
  s.addText(num, {
    x: 0.6,
    y: 0.6,
    w: 4.0,
    h: 5.8,
    fontSize: 320,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    valign: "middle",
  });
  s.addShape("rect", {
    x: 4.9,
    y: 1.6,
    w: 0.04,
    h: 4.2,
    fill: { color: "FFFFFF", transparency: 60 },
    line: { color: "FFFFFF", transparency: 100 },
  });
  s.addText(title, {
    x: 5.2,
    y: 2.6,
    w: SLIDE_W - 5.8,
    h: 2.2,
    fontSize: 46,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
  });
  if (body)
    s.addText(body, {
      x: 5.2,
      y: 4.8,
      w: SLIDE_W - 5.8,
      h: 1.8,
      fontSize: 16,
      color: "FFFFFF",
      fontFace: "Geist",
    });
}

// MV-OP-INTRO-TEAM — team intro row
function renderIntroTeam(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items);
  const n = Math.min(items.length, 5) || 1;
  const gap = 0.25;
  const colW = (SLIDE_W - 1.2 - (n - 1) * gap) / n;
  items.slice(0, n).forEach((it, k) => {
    const x = 0.6 + k * (colW + gap);
    const y = y0 + 0.2;
    const avR = Math.min(1.1, colW * 0.32);
    const cx = x + colW / 2;
    s.addShape("ellipse", {
      x: cx - avR,
      y,
      w: avR * 2,
      h: avR * 2,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addShape("ellipse", {
      x: cx - avR - 0.1,
      y: y - 0.1,
      w: avR * 2 + 0.2,
      h: avR * 2 + 0.2,
      fill: { color: p.accent, transparency: 100 },
      line: { color: p.accent, width: 2 },
    });
    s.addText(initials(str(it.name)), {
      x: cx - avR,
      y,
      w: avR * 2,
      h: avR * 2,
      fontSize: 32,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    s.addText(str(it.name), {
      x,
      y: y + avR * 2 + 0.25,
      w: colW,
      h: 0.5,
      fontSize: 15,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.role).toUpperCase(), {
      x,
      y: y + avR * 2 + 0.7,
      w: colW,
      h: 0.35,
      fontSize: 10,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
      charSpacing: 3,
    });
    s.addText(str(it.bio || it.body), {
      x,
      y: y + avR * 2 + 1.1,
      w: colW,
      h: 2.0,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      align: "center",
      valign: "top",
    });
  });
}

// ── Close family ───────────────────────────────────────────────────────

// MV-CLOSE-CTA — centered CTA button + supporting line
function renderCloseCta(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const headline = str(c.title || c.headline || "Let's begin");
  const cta = str(c.cta || c.action || "Get started");
  const support = str(c.body || c.narrative || c.subtitle);
  s.addText(headline, {
    x: 0.8,
    y: 1.8,
    w: SLIDE_W - 1.6,
    h: 1.8,
    fontSize: 54,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
  });
  if (support)
    s.addText(support, {
      x: 1.4,
      y: 3.6,
      w: SLIDE_W - 2.8,
      h: 1.2,
      fontSize: 18,
      color: p.ink,
      fontFace: "Geist",
      align: "center",
    });
  // pill button
  const btnW = 4.6,
    btnH = 0.9,
    bx = (SLIDE_W - btnW) / 2,
    by = 5.0;
  s.addShape("roundRect", {
    x: bx,
    y: by,
    w: btnW,
    h: btnH,
    fill: { color: p.primary },
    line: { color: p.primary },
    rectRadius: pillRadiusIn(btnH),
  });
  s.addText(cta.toUpperCase(), {
    x: bx,
    y: by,
    w: btnW,
    h: btnH,
    fontSize: 16,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    align: "center",
    valign: "middle",
    charSpacing: 6,
  });
}

// MV-CLOSE-DUAL-CTA — two side-by-side CTAs
function renderCloseDualCta(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 2);
  const cta1 = obj(items[0] || c.primaryCta || c.left || {});
  const cta2 = obj(items[1] || c.secondaryCta || c.right || {});
  const gap = 0.4;
  const colW = (SLIDE_W - 1.2 - gap) / 2;
  const y = y0 + 0.6,
    h = 4.5;
  // primary
  s.addShape("rect", {
    x: 0.6,
    y,
    w: colW,
    h,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  s.addText(str(cta1.label || cta1.title || "Primary").toUpperCase(), {
    x: 0.9,
    y: y + 0.5,
    w: colW - 0.6,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 5,
  });
  s.addText(str(cta1.headline || cta1.body || ""), {
    x: 0.9,
    y: y + 1.0,
    w: colW - 0.6,
    h: 2.0,
    fontSize: 26,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
  });
  s.addText(str(cta1.cta || cta1.action || "Start now") + " →", {
    x: 0.9,
    y: y + h - 0.9,
    w: colW - 0.6,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 3,
  });
  // secondary
  const x2 = 0.6 + colW + gap;
  s.addShape("rect", {
    x: x2,
    y,
    w: colW,
    h,
    fill: { color: p.surface },
    line: { color: LIGHT_GRAY },
  });
  s.addText(str(cta2.label || cta2.title || "Secondary").toUpperCase(), {
    x: x2 + 0.3,
    y: y + 0.5,
    w: colW - 0.6,
    h: 0.4,
    fontSize: 11,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    charSpacing: 5,
  });
  s.addText(str(cta2.headline || cta2.body || ""), {
    x: x2 + 0.3,
    y: y + 1.0,
    w: colW - 0.6,
    h: 2.0,
    fontSize: 26,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(str(cta2.cta || cta2.action || "Learn more") + " →", {
    x: x2 + 0.3,
    y: y + h - 0.9,
    w: colW - 0.6,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    charSpacing: 3,
  });
}

// MV-CLOSE-CONTACT — contact block
function renderCloseContact(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const name = str(c.name || c.contact);
  const role = str(c.role || c.title2);
  const email = str(c.email);
  const phone = str(c.phone);
  const web = str(c.website || c.web);
  s.addShape("rect", {
    x: 0.6,
    y: y0 + 0.4,
    w: SLIDE_W - 1.2,
    h: 4.6,
    fill: { color: p.surface },
    line: { color: LIGHT_GRAY },
  });
  s.addShape("rect", {
    x: 0.6,
    y: y0 + 0.4,
    w: 0.15,
    h: 4.6,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText("LET'S TALK", {
    x: 1.2,
    y: y0 + 0.9,
    w: 8,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 6,
  });
  if (name)
    s.addText(name, {
      x: 1.2,
      y: y0 + 1.4,
      w: SLIDE_W - 2,
      h: 1.0,
      fontSize: 40,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
  if (role)
    s.addText(role, {
      x: 1.2,
      y: y0 + 2.5,
      w: SLIDE_W - 2,
      h: 0.5,
      fontSize: 16,
      color: p.ink,
      fontFace: "Geist",
      italic: true,
    });
  const lines: Array<[string, string]> = [];
  if (email) lines.push(["EMAIL", email]);
  if (phone) lines.push(["PHONE", phone]);
  if (web) lines.push(["WEB", web]);
  lines.forEach(([lbl, val], k) => {
    const yy = y0 + 3.3 + k * 0.55;
    s.addText(lbl, {
      x: 1.2,
      y: yy,
      w: 1.2,
      h: 0.4,
      fontSize: 10,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addText(val, {
      x: 2.5,
      y: yy,
      w: SLIDE_W - 3.2,
      h: 0.4,
      fontSize: 15,
      color: p.primary,
      fontFace: "Geist",
    });
  });
}

// MV-CLOSE-DECISION — two-option decision card
function renderCloseDecision(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).length ? arr(c.items) : [obj(c.yes || c.left), obj(c.no || c.right)];
  const opts = items.slice(0, 2);
  const gap = 0.4;
  const colW = (SLIDE_W - 1.2 - gap) / 2;
  const y = y0 + 0.4,
    h = 4.7;
  opts.forEach((it, k) => {
    const x = 0.6 + k * (colW + gap);
    const isYes = k === 0;
    s.addShape("rect", {
      x,
      y,
      w: colW,
      h,
      fill: { color: isYes ? p.primary : "FFFFFF" },
      line: { color: isYes ? p.primary : LIGHT_GRAY, width: 2 },
    });
    s.addText(isYes ? "✓" : "✕", {
      x: x + 0.4,
      y: y + 0.4,
      w: 0.9,
      h: 0.9,
      fontSize: 44,
      bold: true,
      color: isYes ? p.accent : MID_GRAY,
      fontFace: "Geist",
    });
    s.addText(str(it.label || (isYes ? "Yes" : "No")).toUpperCase(), {
      x: x + 0.4,
      y: y + 1.5,
      w: colW - 0.8,
      h: 0.5,
      fontSize: 12,
      bold: true,
      color: isYes ? p.accent : DARK_GRAY,
      fontFace: "Geist",
      charSpacing: 5,
    });
    s.addText(str(it.title || it.headline), {
      x: x + 0.4,
      y: y + 2.0,
      w: colW - 0.8,
      h: 1.4,
      fontSize: 26,
      bold: true,
      color: isYes ? "FFFFFF" : p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.body || it.description), {
      x: x + 0.4,
      y: y + 3.5,
      w: colW - 0.8,
      h: h - 3.7,
      fontSize: 12,
      color: isYes ? "FFFFFF" : p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// MV-CLOSE-METRIC-PROMISE — hero metric + promise line
function renderCloseMetricPromise(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const metric = str(c.stat || c.metric || c.value);
  const unit = str(c.unit);
  const label = str(c.label);
  const promise = str(c.promise || c.narrative || c.body);
  s.addText("OUR PROMISE", {
    x: 0.8,
    y: 1.4,
    w: SLIDE_W - 1.6,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    align: "center",
    charSpacing: 6,
  });
  s.addText(`${metric}${unit}`, {
    x: 0.8,
    y: 1.9,
    w: SLIDE_W - 1.6,
    h: 2.8,
    fontSize: 180,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
  });
  if (label)
    s.addText(label, {
      x: 0.8,
      y: 4.8,
      w: SLIDE_W - 1.6,
      h: 0.5,
      fontSize: 14,
      color: p.ink,
      fontFace: "Geist",
      align: "center",
      charSpacing: 3,
    });
  s.addShape("rect", {
    x: (SLIDE_W - 1.2) / 2,
    y: 5.5,
    w: 1.2,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  if (promise)
    s.addText(promise, {
      x: 1.6,
      y: 5.8,
      w: SLIDE_W - 3.2,
      h: 1.2,
      fontSize: 20,
      italic: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
}

// MV-CLOSE-QNA — big Q&A treatment
function renderCloseQna(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  s.addText("Q&A", {
    x: 0.8,
    y: 1.4,
    w: SLIDE_W - 1.6,
    h: 2.6,
    fontSize: 220,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
  });
  s.addShape("rect", {
    x: (SLIDE_W - 1.5) / 2,
    y: 4.4,
    w: 1.5,
    h: 0.05,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  const prompt = str(c.title || c.headline || c.body) || "Questions?";
  s.addText(prompt, {
    x: 1.4,
    y: 4.8,
    w: SLIDE_W - 2.8,
    h: 1.4,
    fontSize: 26,
    color: p.ink,
    fontFace: "Geist",
    align: "center",
    italic: true,
  });
}

// MV-CLOSE-CALENDAR — calendar date block
function renderCloseCalendar(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).length ? arr(c.items) : [obj(c)];
  const cards = items.slice(0, 3);
  const n = cards.length;
  const gap = 0.4;
  const colW = (SLIDE_W - 1.2 - (n - 1) * gap) / n;
  const y = y0 + 0.4,
    h = 4.6;
  cards.forEach((it, k) => {
    const x = 0.6 + k * (colW + gap);
    s.addShape("rect", {
      x,
      y,
      w: colW,
      h,
      fill: { color: "FFFFFF" },
      line: { color: LIGHT_GRAY },
    });
    // header band
    s.addShape("rect", {
      x,
      y,
      w: colW,
      h: 1.0,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText(str(it.month || "").toUpperCase(), {
      x,
      y: y + 0.2,
      w: colW,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
      charSpacing: 6,
    });
    s.addText(str(it.weekday || ""), {
      x,
      y: y + 0.6,
      w: colW,
      h: 0.35,
      fontSize: 10,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      charSpacing: 4,
    });
    // day
    s.addText(str(it.day || it.date || ""), {
      x,
      y: y + 1.1,
      w: colW,
      h: 2.0,
      fontSize: 96,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    s.addText(str(it.title || it.label || ""), {
      x: x + 0.2,
      y: y + 3.2,
      w: colW - 0.4,
      h: 0.5,
      fontSize: 14,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
    });
    s.addText(str(it.body || it.time || ""), {
      x: x + 0.2,
      y: y + 3.7,
      w: colW - 0.4,
      h: h - 3.8,
      fontSize: 11,
      color: p.ink,
      fontFace: "Geist",
      align: "center",
      valign: "top",
    });
  });
}

// MV-CLOSE-SPLIT — now / next split close
function renderCloseSplit(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const now = obj(c.now || c.left || c.before);
  const next = obj(c.next || c.right || c.after);
  const gap = 0.0;
  const colW = (SLIDE_W - 1.2 - gap) / 2;
  const y = y0 + 0.3,
    h = 5.4;
  // now
  s.addShape("rect", {
    x: 0.6,
    y,
    w: colW,
    h,
    fill: { color: p.surface },
    line: { color: LIGHT_GRAY },
  });
  s.addText("NOW", {
    x: 0.9,
    y: y + 0.4,
    w: colW - 0.6,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: p.ink,
    fontFace: "Geist",
    charSpacing: 6,
  });
  s.addText(str(now.title || now.headline || now.label), {
    x: 0.9,
    y: y + 0.9,
    w: colW - 0.6,
    h: 1.4,
    fontSize: 32,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
  });
  s.addText(str(now.body || now.description), {
    x: 0.9,
    y: y + 2.4,
    w: colW - 0.6,
    h: h - 2.6,
    fontSize: 14,
    color: p.ink,
    fontFace: "Geist",
    valign: "top",
  });
  // next
  const nx = 0.6 + colW;
  s.addShape("rect", {
    x: nx,
    y,
    w: colW,
    h,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  s.addText("NEXT", {
    x: nx + 0.3,
    y: y + 0.4,
    w: colW - 0.6,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
    charSpacing: 6,
  });
  s.addText(str(next.title || next.headline || next.label), {
    x: nx + 0.3,
    y: y + 0.9,
    w: colW - 0.6,
    h: 1.4,
    fontSize: 32,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
  });
  s.addText(str(next.body || next.description), {
    x: nx + 0.3,
    y: y + 2.4,
    w: colW - 0.6,
    h: h - 2.6,
    fontSize: 14,
    color: "FFFFFF",
    fontFace: "Geist",
    valign: "top",
  });
  // divider arrow
  s.addShape("ellipse", {
    x: nx - 0.35,
    y: y + h / 2 - 0.35,
    w: 0.7,
    h: 0.7,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText("→", {
    x: nx - 0.35,
    y: y + h / 2 - 0.35,
    w: 0.7,
    h: 0.7,
    fontSize: 24,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
  });
}

// MV-CLOSE-TIMELINE — vertical next-steps timeline
function renderCloseTimeline(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 5);
  if (!items.length) return;
  const trackX = 1.6;
  const startY = y0 + 0.4;
  const avail = 5.8 - startY;
  const rowH = avail / items.length;
  // rail
  s.addShape("rect", {
    x: trackX - 0.02,
    y: startY + 0.3,
    w: 0.04,
    h: (items.length - 1) * rowH,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  items.forEach((it, k) => {
    const y = startY + k * rowH;
    s.addShape("ellipse", {
      x: trackX - 0.28,
      y: y + 0.15,
      w: 0.56,
      h: 0.56,
      fill: { color: p.primary },
      line: { color: p.primary },
    });
    s.addText(String(k + 1), {
      x: trackX - 0.28,
      y: y + 0.15,
      w: 0.56,
      h: 0.56,
      fontSize: 16,
      bold: true,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      valign: "middle",
    });
    s.addText(str(it.date || it.when || "").toUpperCase(), {
      x: 2.4,
      y: y + 0.1,
      w: 2.2,
      h: 0.4,
      fontSize: 11,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      charSpacing: 4,
    });
    s.addText(str(it.label || it.title || it.name), {
      x: 4.7,
      y: y + 0.05,
      w: SLIDE_W - 5.3,
      h: 0.5,
      fontSize: 17,
      bold: true,
      color: p.primary,
      fontFace: "Geist",
    });
    s.addText(str(it.body || it.description), {
      x: 4.7,
      y: y + 0.55,
      w: SLIDE_W - 5.3,
      h: rowH - 0.7,
      fontSize: 12,
      color: p.ink,
      fontFace: "Geist",
      valign: "top",
    });
  });
}

// ── Quote family ───────────────────────────────────────────────────────

// MV-QUOTE-PORTRAIT — quote left + portrait placeholder right
function renderQuotePortrait(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const quote = str(c.quote || c.body);
  const author = str(c.attribution || c.author);
  const role = str(c.role);
  const org = str(c.organization || c.org || c.company);
  // portrait right
  const px = SLIDE_W - 3.6,
    py = 1.2,
    pw = 3.0,
    ph = 5.1;
  s.addShape("rect", {
    x: px,
    y: py,
    w: pw,
    h: ph,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  s.addShape("ellipse", {
    x: px + pw / 2 - 0.9,
    y: py + 1.0,
    w: 1.8,
    h: 1.8,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(initials(author || "A"), {
    x: px + pw / 2 - 0.9,
    y: py + 1.0,
    w: 1.8,
    h: 1.8,
    fontSize: 44,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
  });
  s.addText(author || "", {
    x: px + 0.2,
    y: py + 3.1,
    w: pw - 0.4,
    h: 0.5,
    fontSize: 16,
    bold: true,
    color: "FFFFFF",
    fontFace: "Geist",
    align: "center",
  });
  if (role)
    s.addText(role, {
      x: px + 0.2,
      y: py + 3.6,
      w: pw - 0.4,
      h: 0.4,
      fontSize: 12,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
    });
  if (org)
    s.addText(org.toUpperCase(), {
      x: px + 0.2,
      y: py + 4.1,
      w: pw - 0.4,
      h: 0.4,
      fontSize: 10,
      color: "FFFFFF",
      fontFace: "Geist",
      align: "center",
      charSpacing: 4,
    });
  // quote left
  s.addText("\u201C", {
    x: 0.6,
    y: 0.8,
    w: 1.5,
    h: 1.6,
    fontSize: 140,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
  });
  s.addText(quote, {
    x: 0.9,
    y: 2.2,
    w: SLIDE_W - 5.0,
    h: 4.4,
    fontSize: 24,
    italic: true,
    color: p.primary,
    fontFace: "Geist",
    valign: "top",
  });
}

// MV-QUOTE-POSTER — poster-style caps quote
function renderQuotePoster(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const quote = (str(c.quote || c.body) || "").toUpperCase();
  const author = str(c.attribution || c.author);
  const role = str(c.role);
  s.addShape("rect", {
    x: 0.6,
    y: 0.6,
    w: SLIDE_W - 1.2,
    h: SLIDE_H - 1.2,
    fill: { color: p.primary, transparency: 100 },
    line: { color: p.accent, width: 3 },
  });
  s.addText(quote, {
    x: 1.0,
    y: 1.2,
    w: SLIDE_W - 2.0,
    h: 4.8,
    fontSize: 60,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
    charSpacing: -1,
  });
  s.addShape("rect", {
    x: (SLIDE_W - 1.0) / 2,
    y: 6.0,
    w: 1.0,
    h: 0.04,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  if (author)
    s.addText(`${author}${role ? "  ·  " + role : ""}`.toUpperCase(), {
      x: 1.0,
      y: 6.15,
      w: SLIDE_W - 2.0,
      h: 0.4,
      fontSize: 12,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
      align: "center",
      charSpacing: 6,
    });
}

// MV-QUOTE-METRIC — quote + accompanying metric card
function renderQuoteMetric(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const quote = str(c.quote || c.body);
  const author = str(c.attribution || c.author);
  const role = str(c.role);
  const metric = str(c.stat || c.metric || c.value);
  const unit = str(c.unit);
  const label = str(c.label);
  // quote left
  s.addText("\u201C", {
    x: 0.6,
    y: 0.9,
    w: 1.2,
    h: 1.4,
    fontSize: 120,
    bold: true,
    color: p.accent,
    fontFace: "Geist",
  });
  s.addText(quote, {
    x: 0.9,
    y: 2.1,
    w: 7.5,
    h: 3.6,
    fontSize: 24,
    italic: true,
    color: p.primary,
    fontFace: "Geist",
    valign: "top",
  });
  if (author)
    s.addText(`${author}${role ? " · " + role : ""}`, {
      x: 0.9,
      y: 5.9,
      w: 7.5,
      h: 0.5,
      fontSize: 13,
      color: p.ink,
      fontFace: "Geist",
      charSpacing: 2,
    });
  // metric right card
  const rx = 8.9,
    rw = SLIDE_W - rx - 0.6;
  s.addShape("rect", {
    x: rx,
    y: 1.4,
    w: rw,
    h: 4.8,
    fill: { color: p.accent },
    line: { color: p.accent },
  });
  s.addText(`${metric}${unit}`, {
    x: rx,
    y: 1.6,
    w: rw,
    h: 3.2,
    fontSize: 88,
    bold: true,
    color: p.primary,
    fontFace: "Geist",
    align: "center",
    valign: "middle",
  });
  s.addShape("rect", {
    x: rx + 0.6,
    y: 4.7,
    w: rw - 1.2,
    h: 0.03,
    fill: { color: p.primary },
    line: { color: p.primary },
  });
  if (label)
    s.addText(label, {
      x: rx + 0.3,
      y: 4.9,
      w: rw - 0.6,
      h: 1.2,
      fontSize: 13,
      color: p.primary,
      fontFace: "Geist",
      align: "center",
      valign: "top",
    });
}

// MV-QUOTE-MULTI — 2 stacked quote cards
function renderQuoteMulti(s: PptxGenJS.Slide, c: Record<string, unknown>, p: Palette) {
  const y0 = drawTitle(s, c, p);
  const items = arr(c.items).slice(0, 2);
  const n = items.length || 1;
  const gap = 0.3;
  const availH = 5.9 - y0 - (n - 1) * gap;
  const rowH = availH / n;
  items.forEach((it, k) => {
    const y = y0 + k * (rowH + gap);
    const isPrimary = k === 0;
    s.addShape("rect", {
      x: 0.6,
      y,
      w: SLIDE_W - 1.2,
      h: rowH,
      fill: { color: isPrimary ? p.primary : p.surface },
      line: { color: isPrimary ? p.primary : LIGHT_GRAY },
    });
    s.addText("\u201C", {
      x: 0.8,
      y: y + 0.1,
      w: 1.0,
      h: 1.0,
      fontSize: 72,
      bold: true,
      color: p.accent,
      fontFace: "Geist",
    });
    s.addText(str(it.quote || it.body), {
      x: 1.9,
      y: y + 0.25,
      w: SLIDE_W - 4.0,
      h: rowH - 0.9,
      fontSize: 18,
      italic: true,
      color: isPrimary ? "FFFFFF" : p.primary,
      fontFace: "Geist",
      valign: "middle",
    });
    const attribution = `${str(it.attribution || it.author)}${it.role ? " · " + str(it.role) : ""}`;
    s.addText(attribution, {
      x: 1.9,
      y: y + rowH - 0.55,
      w: SLIDE_W - 4.0,
      h: 0.4,
      fontSize: 11,
      color: isPrimary ? p.accent : p.ink,
      fontFace: "Geist",
      charSpacing: 3,
    });
    // right rail
    s.addShape("rect", {
      x: SLIDE_W - 1.9,
      y: y + 0.5,
      w: 1.3,
      h: rowH - 1.0,
      fill: { color: isPrimary ? p.accent : p.primary, transparency: 80 },
      line: { color: isPrimary ? p.accent : p.primary, transparency: 100 },
    });
  });
}
