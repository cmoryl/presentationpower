/**
 * TEMPLATE BACKGROUND OVERRIDES — the tuning layer admins edit.
 *
 * A published template (or any catalog skin) paints its background through
 * `pack.ground(seed)`. An override does not replace that pipeline; it wraps it:
 *
 *   • sceneSwap   — paint another section's composition on this section
 *   • intensity   — 0 flattens toward the page field, 1 is as authored, 2 double
 *                   strikes the ground for a punchier read
 *   • tint        — a colour veil over the ground (brand pass, warm/cool shift)
 *   • imageUrl    — a custom or AI backdrop painted in front of the CSS layers
 *
 * Wrapping keeps every downstream surface — previews, present/share, PPTX
 * decomposition — on the exact same layer contract.
 */

import { sceneFromSeed, SKIN_SCENES } from "./skin-backgrounds";
import { overrideFor, type TemplateBackgroundOverride } from "./template-registry";
import { motionTreatment } from "./template-motion";
import {
  moduleIdFromSeed,
  sceneTakeFromSeed,
  skinBackdropOverride,
} from "./skin-backdrop-overrides";
import type { StylePack } from "./style-packs";

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Translucent version of a colour. Hex is exact; anything else uses color-mix. */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const c = (color ?? "").trim();
  if (HEX.test(c)) {
    const h = c.slice(1);
    const full =
      h.length === 3
        ? h
            .split("")
            .map((x) => x + x)
            .join("")
        : h;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3)})`;
  }
  return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
}

function flat(color: string): string {
  return `linear-gradient(0deg, ${color} 0%, ${color} 100%)`;
}

export function defaultOverride(skinCode: string, scene: string): TemplateBackgroundOverride {
  return {
    skinCode: skinCode.toUpperCase(),
    scene,
    intensity: 1,
    tint: null,
    tintStrength: 0,
    sceneSwap: null,
    imageUrl: null,
    imagePriority: "front",
    videoUrl: null,
    videoPosterUrl: null,
    videoVariant: null,
    note: "",
  };
}

/** True when the override leaves the authored background untouched. */
export function isNeutralOverride(o: TemplateBackgroundOverride): boolean {
  return (
    Math.abs(o.intensity - 1) < 0.01 &&
    (!o.tint || o.tintStrength <= 0.01) &&
    !o.sceneSwap &&
    !o.imageUrl &&
    // A motion ground is a real override: static surfaces (thumbnails, PDF and
    // PPTX) paint its poster frame + treatment scrim instead of the clip.
    !(o.videoUrl && o.videoVariant)
  );
}

/** Replacement images default to painting in FRONT of the authored artwork. */
export function imagePriorityOf(o: TemplateBackgroundOverride): "front" | "behind" {
  return o.imagePriority === "behind" ? "behind" : "front";
}

/**
 * Compose the final CSS background layer list for one override.
 * CSS paints the first layer in front, so the order here is front → back.
 */
export function composeOverrideLayers(
  layers: string[],
  o: TemplateBackgroundOverride,
  surface: string,
): string[] {
  const intensity = Math.max(0, Math.min(2, Number(o.intensity ?? 1)));
  const out: string[] = [];
  const priority = imagePriorityOf(o);
  const motion = o.videoUrl && o.videoVariant ? motionTreatment(o.videoVariant) : null;
  const motionStill = motion && o.videoPosterUrl ? o.videoPosterUrl : null;
  // The poster frame stands in for the clip wherever video cannot play, so the
  // section reads the same in previews, thumbnails and exports.
  const image = motionStill
    ? `url("${motionStill}") center center / cover no-repeat`
    : o.imageUrl
      ? `url("${o.imageUrl}") center center / cover no-repeat`
      : null;
  if (motion) out.push(motion.scrim);

  if (o.tint && o.tintStrength > 0) {
    out.push(flat(withAlpha(o.tint, Math.min(0.85, o.tintStrength))));
  }
  if (intensity < 1) {
    // Veil of the page field damps the ground without touching its geometry.
    out.push(flat(withAlpha(surface, 1 - intensity)));
  }
  if (image && priority === "front") {
    // A replacement picture IS the ground: it paints in front of the authored
    // geometry (CSS draws the first layer on top), which stays behind it only
    // as a fallback while the image loads or if it 404s.
    out.push(image);
  }
  out.push(...layers);
  if (intensity > 1 && !(image && priority === "front")) {
    // Second strike of the same geometry deepens it (alpha stacks).
    out.push(...layers);
  }
  if (image && priority === "behind") {
    // Opt-in: authored artwork keeps the top of the stack and the picture is a
    // photographic base underneath it.
    out.push(image);
  }
  return out;
}

/* ── ONE ground resolver ───────────────────────────────────────────────────
 * Two admin systems can change a look's ground:
 *
 *   1. REPLACEMENT artwork — background directory / "Replace the picture on
 *      this section" / per-module replace. Lives in the skin-backdrop registry.
 *   2. TUNING — intensity, tint, scene swap, motion, tuner uploads. Lives in
 *      `template_background_overrides`.
 *
 * They used to be applied in different places (the registry inside
 * `packGroundPaint`, the tuning inside this wrapper), and the registry branch
 * returned early — so a tuned section looked one way in the Backgrounds tuner
 * and another way on module cards, stages and exports. Everything now goes
 * through `resolveGroundLayers` exactly once.
 * ───────────────────────────────────────────────────────────────────────── */

/** Packs whose `ground()` already ran the resolver — never apply it twice. */
const RESOLVED = new WeakSet<object>();
/** Pre-override ground of a wrapped pack, for authored/compare previews. */
const AUTHORED = new WeakMap<object, (seed: string) => string[]>();

export function groundOverridesApplied(pack: StylePack): boolean {
  return RESOLVED.has(pack as object);
}

/** The pack's own artwork, before any admin replacement or tuning. */
export function authoredGround(pack: StylePack): (seed: string) => string[] {
  return AUTHORED.get(pack as object) ?? pack.ground;
}

/** Replacement artwork registered for this code × seed, if any. */
export function replacedGroundUrl(
  code: string | null | undefined,
  seed: string,
): string | null {
  if (!code) return null;
  return skinBackdropOverride(
    code.toUpperCase(),
    sceneFromSeed(seed),
    sceneTakeFromSeed(seed).take,
    moduleIdFromSeed(seed),
  );
}

/**
 * True when the ground of this code × seed is a replaced/uploaded picture —
 * from the registry OR from a tuner upload. Callers use it to suppress the
 * procedural scaffold, motif, mask and damping so the picture reads clean.
 */
export function groundIsReplaced(code: string | null | undefined, seed: string): boolean {
  if (!code) return false;
  if (replacedGroundUrl(code, seed)) return true;
  const o = overrideFor(code, sceneFromSeed(seed));
  return !!(o && (o.imageUrl || (o.videoUrl && o.videoVariant)));
}

/** Replacement artwork substituted for the authored layers, flat base kept. */
function withReplacement(
  layers: string[],
  code: string | null | undefined,
  seed: string,
  surface: string,
): string[] {
  const url = replacedGroundUrl(code, seed);
  if (!url) return layers;
  const flatBase = layers.filter((l) => /^(#|rgb|hsl)/i.test(l.trim()));
  return [
    `url("${url}") center center / cover no-repeat`,
    ...(flatBase.length ? flatBase : [surface]),
  ];
}

/** Scene the tuning is authored from, honouring an explicit scene swap. */
function swapSeed(o: TemplateBackgroundOverride | null, seed: string): string {
  return o?.sceneSwap && (SKIN_SCENES as string[]).includes(o.sceneSwap) ? o.sceneSwap : seed;
}

/**
 * Final ground layers for one code × seed: replacement artwork first, then the
 * admin tuning composed on top. `authored` must be the pack's own layers.
 */
export function resolveGroundLayers(
  authored: (seed: string) => string[],
  code: string | null | undefined,
  seed: string,
  surface: string,
  override?: TemplateBackgroundOverride | null,
): string[] {
  const o = override ?? (code ? overrideFor(code, sceneFromSeed(seed)) : null);
  const base = withReplacement(authored(swapSeed(o, seed)), code, seed, surface);
  if (!o || isNeutralOverride(o)) return base;
  return composeOverrideLayers(base, o, surface);
}

/**
 * Preview layers for an in-progress tuner edit — same resolver the stage,
 * library cards and exporters use, so the tuner cannot disagree with them.
 */
export function previewGroundLayers(
  pack: StylePack,
  code: string,
  seed: string,
  edit: TemplateBackgroundOverride,
): string[] {
  return resolveGroundLayers(authoredGround(pack), code, seed, pack.tokens.surface, edit);
}

/** Wrap a pack so its ground honours the replacement + tuning for `code`. */
export function withBackgroundOverrides(pack: StylePack, code: string): StylePack {
  const base = authoredGround(pack);
  const wrapped: StylePack = {
    ...pack,
    ground: (seed: string) => resolveGroundLayers(base, code, seed, pack.tokens.surface),
  };
  RESOLVED.add(wrapped as object);
  AUTHORED.set(wrapped as object, base);
  return wrapped;
}
