// Dimensional truth in an in-scene render.
//
// `scene-lighting.ts` says what the light is doing, `scene-space.ts` says where
// the face sits in the room, `scene-surface.ts` says what the print is mounted
// on. None of them answers the question that actually broke trust in the
// renders: *is the print the right SIZE on that surface?*
//
// Until now every print was scaled to fill one measured edge of the surface. On
// a 6800 mm scenic wall a 1000 × 2000 mm panel therefore rendered 6.8 times too
// big, and a designer comparing the render to the spec sheet saw two different
// items. Where the surface has actually been measured — a supplied artboard, a
// survey, a venue drawing — we can do better: put the print on the surface at
// its true fraction of that surface, so 1000 mm of print on 6800 mm of wall
// occupies 15% of the wall in the render too.
//
// Where the surface has NOT been measured we do not guess. The render falls
// back to filling the fixed edge and says so, so nobody reads an unmeasured
// view as a scale check. Published venue metrics are used only as a sanity
// bound (a print cannot be taller than the room it is in), never as a measured
// surface size.
import type { LondonPanel } from "@/lib/next-london-signage";
import { LONDON_DOOR_SPECS, doorOpeningSize, londonDoorSpec } from "@/lib/next-london-doors";
import type { LondonScene } from "@/lib/next-london-scenes";
import type { FaceRect } from "@/lib/scene-face-fit";

/** A measured install surface, in mm, with where the measurement came from. */
export interface MeasuredSurface {
  wMm: number;
  hMm: number;
  source: string;
  /** `measured` = read off a supplied artboard/drawing. Never estimated. */
  confidence: "measured";
}

/**
 * Published QEII Centre space metrics, from the venue's own floor-plan sheet.
 * Floor areas and capacities only — the sheet carries no wall dimensions, so
 * these bound plausibility (nothing prints taller than the space) and are never
 * treated as an install face size.
 * Source: QEII Centre "Floor by floor" mini floor plan, qeiicentre.london.
 */
export const QEII_SPACE_METRICS: Record<
  string,
  { areaM2: number; theatre?: number; assumedCeilingMm: number }
> = {
  churchill: { areaM2: 720, theatre: 700, assumedCeilingMm: 6000 },
  fleming: { areaM2: 585, theatre: 460, assumedCeilingMm: 4000 },
  third: { areaM2: 2142, theatre: 1300, assumedCeilingMm: 4000 },
  mountbatten: { areaM2: 351, theatre: 410, assumedCeilingMm: 3500 },
  westminster: { areaM2: 510, assumedCeilingMm: 3200 },
  whittle: { areaM2: 330, assumedCeilingMm: 3200 },
};

/**
 * Measured install faces per scene, in mm. Only surfaces whose size we actually
 * hold: the supplied pillar drawing, the supplied scenic build, and door
 * openings measured off the venue pack artboards. Everything else is absent on
 * purpose.
 */
export const SCENE_SURFACES: Record<string, MeasuredSurface> = {
  "ref-foyer-pillar": {
    wMm: 550,
    hMm: 2500,
    source: "Supplied pillar drawing — 550 × 2500 mm face",
    confidence: "measured",
  },
  "ref-scenic-wall-blank": {
    wMm: 6800,
    hMm: 4030,
    source: "Supplied scenic build reference — 6800 × 4030 mm",
    confidence: "measured",
  },
  "ref-room-doors": {
    // Widest measured double-door opening in the venue pack, so a leaf sheet
    // reads at its real fraction of the opening.
    wMm: 1860,
    hMm: 2001,
    source: "Venue pack door artboards — 930 × 2001 mm leaves, pair",
    confidence: "measured",
  },
  "photo-churchill-stage": {
    wMm: 12000,
    hMm: 6000,
    source: "Churchill stage wall, venue drawing — 12 m × 6 m",
    confidence: "measured",
  },
};

/**
 * The measured face for this panel on this scene. Door scenes prefer the item's
 * own measured opening over the generic pair, so a wide leading leaf is not
 * scaled against a different door.
 */
export function measuredSurface(
  scene: Pick<LondonScene, "id" | "kind" | "surface">,
  panel?: LondonPanel,
): MeasuredSurface | null {
  if (panel && (scene.kind === "door" || scene.kind === "lift")) {
    const spec = londonDoorSpec(panel);
    if (spec) {
      const opening = doorOpeningSize(spec);
      if (spec.confidence === "measured") {
        return {
          wMm: opening.w,
          hMm: opening.h,
          source: spec.source,
          confidence: "measured",
        };
      }
    }
  }
  const known = SCENE_SURFACES[scene.id];
  if (known) return known;
  if (scene.surface) {
    return {
      wMm: scene.surface.wMm,
      hMm: scene.surface.hMm,
      source: scene.surface.note ?? "Scene definition",
      confidence: "measured",
    };
  }
  return null;
}

export type SpecFitMode =
  /** Print placed at its true fraction of a measured surface. */
  | "scale-true"
  /** Surface unmeasured: print fills the fixed edge, so size is indicative. */
  | "indicative"
  /** Print is larger than the measured surface it is shown on. */
  | "oversize"
  /** Applied vinyl cropped to the surface: some trim is lost on install. */
  | "cropped";

export interface SpecFit {
  mode: SpecFitMode;
  /** Fraction of the measured surface width the print covers, when measured. */
  coverW?: number;
  coverH?: number;
  /** How far the print's trim aspect differs from the face aspect, in stops. */
  aspectDelta: number;
  /** Measured surface used, when there is one. */
  surface: MeasuredSurface | null;
  /** Everything a designer must know before trusting this view as a size check. */
  warnings: string[];
}

const ASPECT_WARN = 0.36;

/** Does this render match the item's printed spec, and how do we know? */
export function sceneSpecFit(
  panel: LondonPanel,
  scene: Pick<LondonScene, "id" | "kind" | "surface" | "faceRatio" | "mount">,
): SpecFit {
  const ratio = panel.trimW / panel.trimH;
  const surface = measuredSurface(scene, panel);
  const aspectDelta =
    ratio > 0 && scene.faceRatio > 0 ? Math.abs(Math.log(scene.faceRatio / ratio)) : 0;
  const warnings: string[] = [];

  if (!surface) {
    if (aspectDelta > ASPECT_WARN) {
      warnings.push(
        "The item's trim shape differs from this surface, so the view shows placement, not proportion.",
      );
    }
    return { mode: "indicative", aspectDelta, surface: null, warnings };
  }

  const coverW = panel.trimW / surface.wMm;
  const coverH = panel.trimH / surface.hMm;

  if (coverW > 1.02 || coverH > 1.02) {
    warnings.push(
      `The print is ${Math.round(Math.max(coverW, coverH) * 100)}% of this surface (${Math.round(surface.wMm)} × ${Math.round(surface.hMm)} mm) — it does not fit as drawn.`,
    );
    return { mode: "oversize", coverW, coverH, aspectDelta, surface, warnings };
  }

  if (scene.mount === "cover" && aspectDelta > ASPECT_WARN) {
    warnings.push("Applied as a full-bleed vinyl: the overhang is trimmed on install.");
    return { mode: "cropped", coverW, coverH, aspectDelta, surface, warnings };
  }

  return { mode: "scale-true", coverW, coverH, aspectDelta, surface, warnings };
}

/** One line for the caption: how much of the real surface this print covers. */
export function specFitLabel(fit: SpecFit): string {
  if (!fit.surface) return "Indicative scale · surface not measured";
  const pct = (v?: number) => `${Math.round((v ?? 0) * 100)}%`;
  const cover = `${pct(fit.coverW)} × ${pct(fit.coverH)} of surface`;
  switch (fit.mode) {
    case "scale-true":
      return `True scale · ${cover}`;
    case "oversize":
      return `Does not fit · ${cover}`;
    case "cropped":
      return `Trimmed on install · ${cover}`;
    default:
      return `Indicative scale · ${cover}`;
  }
}

/**
 * Artwork box placed at its true fraction of a measured surface, keeping the
 * print's exact trim ratio and honouring where it sits on the surface.
 * Fractions of the rendered plate. Returns null when the surface is unmeasured,
 * so the caller keeps the honest fill-the-edge behaviour.
 */
export function scaleTrueBox(opts: {
  face: FaceRect;
  plate: { w: number; h: number };
  panel: LondonPanel;
  surface: MeasuredSurface;
  anchorY?: "top" | "center" | "bottom";
  anchorX?: "left" | "center" | "right";
  /** Which surface edge physically fixes the print size, from the scene. */
  fixed?: "w" | "h";
}): FaceRect | null {
  const { face, plate, panel, surface } = opts;
  const coverW = panel.trimW / surface.wMm;
  const coverH = panel.trimH / surface.hMm;
  if (!(coverW > 0) || !(coverH > 0) || coverW > 1.02 || coverH > 1.02) return null;
  // A print that would render smaller than a stamp on the plate tells a
  // designer nothing; fall back rather than show a dot on a wall.
  const wPx = face.w * plate.w * coverW;
  const hPx = face.h * plate.h * coverH;
  if (wPx < plate.w * 0.05 || hPx < plate.h * 0.05) return null;

  // The measured face is the surface as it appears in the plate, and its pixel
  // aspect rarely equals the surface's true aspect. Scaling both axes by their
  // mm fractions would therefore inherit that distortion and skew the print. So
  // the print takes its true fraction of the surface's fixed edge, and its other
  // edge follows the exact trim ratio — right size, and never stretched.
  const trim = panel.trimW / panel.trimH;
  let w: number;
  let h: number;
  if ((opts.fixed ?? "w") === "w") {
    w = face.w * coverW;
    h = (w * plate.w) / trim / plate.h;
  } else {
    h = face.h * coverH;
    w = (h * plate.h * trim) / plate.w;
  }
  if (w > face.w * 1.02 || h > face.h * 1.02) return null;
  const anchorY = opts.anchorY ?? "center";
  const anchorX = opts.anchorX ?? "center";
  const x =
    anchorX === "left"
      ? face.x
      : anchorX === "right"
        ? face.x + face.w - w
        : face.x + (face.w - w) / 2;
  const y =
    anchorY === "top"
      ? face.y
      : anchorY === "bottom"
        ? face.y + face.h - h
        : face.y + (face.h - h) / 2;
  return { x, y, w, h };
}

/** Scenes whose surface we hold a measurement for — used to rank views. */
export function hasMeasuredSurface(scene: Pick<LondonScene, "id" | "kind" | "surface">): boolean {
  return measuredSurface(scene) !== null;
}

/** Every door opening the venue pack measured, for the playbook audit. */
export function measuredDoorOpenings(): Array<{ item: string; wMm: number; hMm: number }> {
  return LONDON_DOOR_SPECS.filter((s) => s.confidence === "measured").map((s) => {
    const o = doorOpeningSize(s);
    return { item: s.match, wMm: o.w, hMm: o.h };
  });
}
