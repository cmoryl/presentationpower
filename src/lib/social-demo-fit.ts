// Demo fill plan — how a rendered demo asset should use its frame.
//
// The renderer is geometry-agnostic: it centres a copy stack in a safe box and
// crops artwork into a panel. That is correct but conservative, so the demo
// examples left visible dead space on the very wide banners and the very tall
// story frames. This module states, per aspect class and mode, how much of the
// frame the artwork panel should own and how hard the copy should scale, so
// each demo size looks composed rather than letterboxed.

import type { SocialFormat } from "./social-formats";
import { aspectClass, type AspectClass } from "./social-formats";

export type DemoFitPlan = {
  /** Photo composition for this frame. */
  imageLayout: "bleed" | "panel";
  /** Panel size as a % of the safe box (panel mode only). */
  panelSizePct: number;
  /** Copy stack scale — pushes type up so the frame fills. */
  typeScale: number;
  /** Scrim strength over a full-bleed photo. */
  imageScrimPct: number;
};

type Plan = Omit<DemoFitPlan, "imageLayout">;

// Light frames crop the artwork into a panel so the copy never sits on the
// photo; dark frames run it full bleed with a brand scrim. Wider frames give
// the panel a bigger share (a thin sliver of photo reads as an accident), and
// the tallest frames give it the most, because a story frame with a shallow
// band leaves a large empty middle.
const PANEL: Record<AspectClass, Plan> = {
  "landscape-wide": { panelSizePct: 46, typeScale: 1.14, imageScrimPct: 58 },
  landscape: { panelSizePct: 44, typeScale: 1.1, imageScrimPct: 58 },
  square: { panelSizePct: 46, typeScale: 1.08, imageScrimPct: 60 },
  portrait: { panelSizePct: 50, typeScale: 1.1, imageScrimPct: 60 },
  "portrait-tall": { panelSizePct: 54, typeScale: 1.16, imageScrimPct: 62 },
};

const BLEED: Record<AspectClass, Plan> = {
  "landscape-wide": { panelSizePct: 46, typeScale: 1.12, imageScrimPct: 56 },
  landscape: { panelSizePct: 44, typeScale: 1.08, imageScrimPct: 58 },
  square: { panelSizePct: 46, typeScale: 1.1, imageScrimPct: 62 },
  portrait: { panelSizePct: 50, typeScale: 1.14, imageScrimPct: 64 },
  "portrait-tall": { panelSizePct: 54, typeScale: 1.2, imageScrimPct: 66 },
};

/** Fill plan for one demo asset. `mode` decides bleed vs panel exactly as the
 *  demo did before; the numbers are what changed. */
export function demoFitPlan(format: SocialFormat, mode: "light" | "dark"): DemoFitPlan {
  const cls = aspectClass(format);
  const panel = mode === "light";
  const plan = panel ? PANEL[cls] : BLEED[cls];
  return { imageLayout: panel ? "panel" : "bleed", ...plan };
}
