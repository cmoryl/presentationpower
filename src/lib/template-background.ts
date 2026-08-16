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
 *   • imageUrl    — a custom or AI backdrop painted behind the CSS layers
 *
 * Wrapping keeps every downstream surface — previews, present/share, PPTX
 * decomposition — on the exact same layer contract.
 */

import { sceneFromSeed, SKIN_SCENES } from "./skin-backgrounds";
import { overrideFor, type TemplateBackgroundOverride } from "./template-registry";
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
    note: "",
  };
}

/** True when the override leaves the authored background untouched. */
export function isNeutralOverride(o: TemplateBackgroundOverride): boolean {
  return (
    Math.abs(o.intensity - 1) < 0.01 &&
    (!o.tint || o.tintStrength <= 0.01) &&
    !o.sceneSwap &&
    !o.imageUrl
  );
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

  if (o.tint && o.tintStrength > 0) {
    out.push(flat(withAlpha(o.tint, Math.min(0.85, o.tintStrength))));
  }
  if (intensity < 1) {
    // Veil of the page field damps the ground without touching its geometry.
    out.push(flat(withAlpha(surface, 1 - intensity)));
  }
  out.push(...layers);
  if (intensity > 1) {
    // Second strike of the same geometry deepens it (alpha stacks).
    out.push(...layers);
  }
  if (o.imageUrl) {
    out.push(`url("${o.imageUrl}") center center / cover no-repeat`);
  }
  return out;
}

/** Wrap a pack so its ground honours the admin overrides for `code`. */
export function withBackgroundOverrides(pack: StylePack, code: string): StylePack {
  const base = pack.ground;
  return {
    ...pack,
    ground: (seed: string) => {
      const scene = sceneFromSeed(seed);
      const o = overrideFor(code, scene);
      if (!o || isNeutralOverride(o)) return base(seed);
      const swap =
        o.sceneSwap && (SKIN_SCENES as string[]).includes(o.sceneSwap) ? o.sceneSwap : seed;
      return composeOverrideLayers(base(swap), o, pack.tokens.surface);
    },
  };
}
