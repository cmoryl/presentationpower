/**
 * plate-calm.ts — quieting authored photoreal plates behind content modules.
 *
 * The industry plate kits (R01–R30) and the curated skin grounds are shot as
 * finished art: full-frame subjects, hard specular highlights, high micro
 * contrast. That reads beautifully behind a cover title, but a module layout
 * (stat rows, charts, bento grids, timelines) puts fine ink and hairline cards
 * on top of it — and the plate's own detail competes with them. The result is
 * the "too busy" render.
 *
 * The fix is not a flatter plate: it's depth-of-field. Photography solves this
 * by throwing the ground out of focus and lifting exposure under the subject.
 * We do exactly that, only where copy actually lands:
 *
 *   • defocus  — blur + slight desaturation + exposure lift on the plate layer
 *   • veil     — a field-coloured wash masked toward the reading column so the
 *                copy zone is calm while the outer frame keeps its texture
 *
 * Chrome moments (cover / divider / close) are the deck's dramatic beats and
 * stay untouched at full strength.
 */

import type { ComposeBias } from "./pack-compose";

export type PlateCalmVariant = string | undefined;

/** How hard to calm the plate: photoreal art vs authored graphic kits. */
export type PlateCalmStrength = "full" | "graphic";

/** Ground layers from the authored graphic kits (Games / Element brick art). */
const GRAPHIC_PLATE_RE =
  /\/games-[a-z0-9-]+\.(?:webp|png|jpg)|\/element-(?:light|dark)-[a-z0-9-]+\.(?:webp|png|jpg)/i;

/** True when the plate url belongs to an authored graphic kit, not photography. */
export function plateIsGraphicKit(layers: string[]): boolean {
  return layers.some((l) => GRAPHIC_PLATE_RE.test(l));
}

export type PlateCalm = {
  /** CSS `filter` for the plate layer; "" when the plate stays sharp. */
  filter: string;
  /** Alpha of the field-coloured veil painted over the plate. 0 = none. */
  veilAlpha: number;
  /** Mask gradient concentrating the veil over the reading zone. */
  veilMask?: string;
};

const SHARP: PlateCalm = { filter: "", veilAlpha: 0 };

/** Chrome variants own the full-strength plate. */
export function plateIsHeroChrome(variant: PlateCalmVariant): boolean {
  return variant === "cover" || variant === "divider" || variant === "close";
}

/**
 * Density of ink a variant puts on the sheet. Denser modules need a calmer
 * ground, so they get more defocus and a heavier veil.
 */
function inkDensity(variant: PlateCalmVariant, layoutId?: string): 0 | 1 | 2 {
  const id = `${variant ?? ""} ${layoutId ?? ""}`.toLowerCase();
  // Data-dense: charts, tables, dashboards, matrices, KPI walls.
  if (
    /chart|graph|viz|data|table|dash|matrix|kpi|stat|metric|waterfall|funnel|donut|radar/.test(id)
  )
    return 2;
  // Structured multi-block: bento, grids, timelines, process chains, cards.
  if (
    /bento|grid|timeline|process|chain|step|card|list|bullet|agenda|column|compare|split/.test(id)
  )
    return 1;
  return 0;
}

/**
 * Mask that keeps the veil over the reading column and lets the plate breathe
 * on the opposite side / at the frame edges.
 */
function veilMaskFor(bias: ComposeBias | undefined): string | undefined {
  switch (bias) {
    case "left":
      return "linear-gradient(to right, #000 0%, #000 58%, rgba(0,0,0,0.35) 88%, rgba(0,0,0,0.12) 100%)";
    case "right":
      return "linear-gradient(to left, #000 0%, #000 58%, rgba(0,0,0,0.35) 88%, rgba(0,0,0,0.12) 100%)";
    case "center":
      return "radial-gradient(ellipse 76% 70% at 50% 52%, #000 0%, #000 55%, rgba(0,0,0,0.3) 92%, rgba(0,0,0,0.1) 100%)";
    case "wide":
      return "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, #000 22%, #000 82%, rgba(0,0,0,0.45) 100%)";
    default:
      return undefined;
  }
}

/**
 * Resolve the calming treatment for an authored plate under a module layout.
 *
 * @param variant   slide variant id (cover/content/etc.)
 * @param layoutId  module/layout id, used to read ink density
 * @param mode      "light" | "dark" page mode
 * @param bias      composition bias, positions the veil away from open space
 */
export function plateCalmFor(
  variant: PlateCalmVariant,
  layoutId: string | undefined,
  mode: "light" | "dark",
  bias?: ComposeBias,
  /**
   * "full" — photoreal industry plates: full depth-of-field treatment.
   * "graphic" — authored graphic kits (Games R22, Element S29/S30). These are
   * designed compositions with broad shapes and no fine micro-detail, so the
   * photographic calming buried them in a flat field. They keep most of their
   * punch: a light defocus and a thin veil are all the copy needs.
   */
  strength: PlateCalmStrength = "full",
): PlateCalm {
  if (plateIsHeroChrome(variant)) return SHARP;

  const density = inkDensity(variant, layoutId);
  const dark = mode === "dark";
  const graphic = strength === "graphic";

  // Defocus grows with density; even a plain content sheet gets a touch so the
  // plate sits behind the copy plane rather than fighting it.
  const blur = graphic
    ? density === 2
      ? 6
      : density === 1
        ? 4
        : 2
    : density === 2
      ? 16
      : density === 1
        ? 10
        : 6;
  const sat = graphic
    ? density === 2
      ? 0.94
      : 1
    : density === 2
      ? 0.62
      : density === 1
        ? 0.74
        : 0.86;
  const bright = graphic
    ? dark
      ? density === 2
        ? 0.94
        : 1
      : density === 2
        ? 1.03
        : 1
    : dark
      ? density === 2
        ? 0.72
        : density === 1
          ? 0.8
          : 0.88
      : density === 2
        ? 1.1
        : density === 1
          ? 1.06
          : 1.03;
  const contrast = graphic ? 1 : density === 2 ? 0.86 : density === 1 ? 0.92 : 0.97;

  const veilAlpha = graphic
    ? density === 2
      ? dark
        ? 0.24
        : 0.3
      : density === 1
        ? dark
          ? 0.16
          : 0.22
        : dark
          ? 0.08
          : 0.12
    : density === 2
      ? dark
        ? 0.52
        : 0.6
      : density === 1
        ? dark
          ? 0.4
          : 0.46
        : dark
          ? 0.26
          : 0.3;

  return {
    filter: `blur(${blur}px) saturate(${sat}) brightness(${bright}) contrast(${contrast})`,
    veilAlpha,
    veilMask: veilMaskFor(bias),
  };
}
