// How a print behaves physically on the surface it is installed on.
//
// `scene-lighting.ts` answers "what is the light in this room doing" and
// `scene-space.ts` answers "where is this face in the room". Neither answers the
// question that makes a render read as flat: *what is this print mounted on, and
// how far off that surface does it sit?*
//
// A vinyl squeegeed onto a door casts no shadow at all — it only tucks slightly
// darker at its edges. A foamex panel standing 20 mm off a wall throws a real
// offset shadow and shows a bright top edge. A fabric banner hangs, so it takes
// a soft drape and a shadow that grows towards the floor. A floor graphic never
// casts anything; it takes overhead light, scuffing and footfall sheen. Glass
// transmits.
//
// This module carries those substrate behaviours per surface kind so every
// scene, in London and at every venue after it, composites its prints the same
// way — and so the shadow a designer sees is a consequence of the mount, not a
// hand-tuned drop shadow.

import type { SceneKind } from "@/lib/next-london-scenes";

/** How the print meets its surface. */
export type SurfaceContact =
  /** Applied film: squeegeed flush, no cast shadow, edges tuck. */
  | "applied"
  /** Rigid board on a standoff: a real offset shadow and a lit top edge. */
  | "standoff"
  /** Hung textile: drape, a shadow that opens towards the floor. */
  | "hung"
  /** Horizontal: floor and tabletops. Overhead light, scuff, no cast. */
  | "ground"
  /** Applied to glazing: transmits light and picks up the room behind. */
  | "glazed";

export interface SurfaceFinish {
  contact: SurfaceContact;
  /** Plain label for captions. */
  label: string;
  /** How far the print stands off its surface, mm. Drives the cast shadow. */
  standoffMm: number;
  /** Ambient occlusion in the corner where print meets surface, 0..1. */
  occlusion: number;
  /** Which edge the print is fixed along — where occlusion is strongest. */
  fixedEdge: "top" | "bottom" | "left" | "none";
  /** Gloss level of the finish, 0 = matt laminate, 1 = gloss/glass. */
  gloss: number;
  /**
   * Anisotropy of the specular: 0 spreads the highlight evenly, 1 stretches it
   * along the surface, the way a squeegeed film or a polished floor behaves.
   */
  anisotropy: number;
  /** Substrate texture strength, 0..1 (weave, orange peel, floor grain). */
  texture: number;
  /** Texture character, used to pick the pattern. */
  textureKind: "none" | "weave" | "film" | "board" | "floor";
  /** Drape/relief across the print, 0..1. Fabric only. */
  drape: number;
  /** Light passing through the print, 0..1. Glazing only. */
  transmit: number;
  /** Wear at the extremities: floor scuffing, counter rub, 0..1. */
  wear: number;
}

const APPLIED: SurfaceFinish = {
  contact: "applied",
  label: "Applied vinyl, flush",
  standoffMm: 0.1,
  occlusion: 0.16,
  fixedEdge: "none",
  gloss: 0.22,
  anisotropy: 0.7,
  texture: 0.1,
  textureKind: "film",
  drape: 0,
  transmit: 0,
  wear: 0.04,
};

const SURFACE_FINISH: Record<SceneKind, SurfaceFinish> = {
  // Rigid printed boards, fixed off the wall on battens or hangers.
  wall: {
    contact: "standoff",
    label: "Rigid board on standoff",
    standoffMm: 18,
    occlusion: 0.3,
    fixedEdge: "top",
    gloss: 0.14,
    anisotropy: 0.35,
    texture: 0.12,
    textureKind: "board",
    drape: 0,
    transmit: 0,
    wear: 0.03,
  },
  square: {
    contact: "standoff",
    label: "Rigid board on standoff",
    standoffMm: 14,
    occlusion: 0.26,
    fixedEdge: "top",
    gloss: 0.16,
    anisotropy: 0.35,
    texture: 0.1,
    textureKind: "board",
    drape: 0,
    transmit: 0,
    wear: 0.03,
  },
  // Textile: hung from a top pocket, so it drapes and shadows to the floor.
  portrait: {
    contact: "hung",
    label: "Hung fabric banner",
    standoffMm: 26,
    occlusion: 0.24,
    fixedEdge: "top",
    gloss: 0.06,
    anisotropy: 0.2,
    texture: 0.3,
    textureKind: "weave",
    drape: 0.34,
    transmit: 0.05,
    wear: 0.02,
  },
  wide: {
    contact: "hung",
    label: "Hung fabric banner",
    standoffMm: 22,
    occlusion: 0.22,
    fixedEdge: "top",
    gloss: 0.07,
    anisotropy: 0.24,
    texture: 0.26,
    textureKind: "weave",
    drape: 0.24,
    transmit: 0.05,
    wear: 0.02,
  },
  exterior: {
    contact: "hung",
    label: "Tensioned exterior banner",
    standoffMm: 34,
    occlusion: 0.2,
    fixedEdge: "top",
    gloss: 0.1,
    anisotropy: 0.28,
    texture: 0.2,
    textureKind: "weave",
    drape: 0.18,
    transmit: 0.08,
    wear: 0.06,
  },
  // Wrapped columns: film pulled around a radius, so the specular rakes.
  column: {
    contact: "applied",
    label: "Wrapped column film",
    standoffMm: 0.1,
    occlusion: 0.2,
    fixedEdge: "none",
    gloss: 0.26,
    anisotropy: 0.85,
    texture: 0.1,
    textureKind: "film",
    drape: 0,
    transmit: 0,
    wear: 0.05,
  },
  door: { ...APPLIED, label: "Door vinyl, squeegeed", gloss: 0.24, wear: 0.07 },
  lift: { ...APPLIED, label: "Lift wrap film", gloss: 0.32, anisotropy: 0.8, wear: 0.09 },
  // Stage fascias and counters: board faces, handled and rubbed at hand height.
  fascia: {
    contact: "standoff",
    label: "Stage fascia board",
    standoffMm: 12,
    occlusion: 0.28,
    fixedEdge: "bottom",
    gloss: 0.12,
    anisotropy: 0.3,
    texture: 0.12,
    textureKind: "board",
    drape: 0,
    transmit: 0,
    wear: 0.05,
  },
  desk: {
    contact: "applied",
    label: "Desk front panel",
    standoffMm: 4,
    occlusion: 0.24,
    fixedEdge: "bottom",
    gloss: 0.2,
    anisotropy: 0.5,
    texture: 0.1,
    textureKind: "film",
    drape: 0,
    transmit: 0,
    wear: 0.12,
  },
  counter: {
    contact: "applied",
    label: "Counter front panel",
    standoffMm: 4,
    occlusion: 0.26,
    fixedEdge: "bottom",
    gloss: 0.22,
    anisotropy: 0.5,
    texture: 0.1,
    textureKind: "film",
    drape: 0,
    transmit: 0,
    wear: 0.14,
  },
  // Horizontal surfaces: nothing casts onto them from the print itself.
  floor: {
    contact: "ground",
    label: "Floor graphic, anti-slip laminate",
    standoffMm: 0,
    occlusion: 0.1,
    fixedEdge: "none",
    gloss: 0.3,
    anisotropy: 0.9,
    texture: 0.2,
    textureKind: "floor",
    drape: 0,
    transmit: 0,
    wear: 0.2,
  },
  table: {
    contact: "ground",
    label: "Tabletop print under laminate",
    standoffMm: 0,
    occlusion: 0.12,
    fixedEdge: "none",
    gloss: 0.34,
    anisotropy: 0.65,
    texture: 0.12,
    textureKind: "film",
    drape: 0,
    transmit: 0,
    wear: 0.12,
  },
  // Glazing: the print transmits, and the glass in front of it reflects.
  glass: {
    contact: "glazed",
    label: "Frosted film on glazing",
    standoffMm: 0.1,
    occlusion: 0.1,
    fixedEdge: "none",
    gloss: 0.5,
    anisotropy: 0.75,
    texture: 0.08,
    textureKind: "film",
    drape: 0,
    transmit: 0.3,
    wear: 0.03,
  },
};

/**
 * Substrate behaviour for a surface kind. `mount` refines it: an artwork set to
 * cover its surface is an applied film even on a wall, because that is how a
 * full-bleed wall graphic is actually installed.
 */
export function sceneSurface(kind: SceneKind | undefined, mount?: "edge" | "cover"): SurfaceFinish {
  const base = kind ? SURFACE_FINISH[kind] : SURFACE_FINISH.wall;
  if (!base) return SURFACE_FINISH.wall;
  if (mount === "cover" && base.contact === "standoff") {
    return {
      ...base,
      contact: "applied",
      label: "Applied wall graphic, flush",
      standoffMm: 0.2,
      occlusion: Math.max(0.14, base.occlusion * 0.6),
      gloss: base.gloss + 0.06,
      anisotropy: 0.7,
      textureKind: "film",
      texture: 0.1,
    };
  }
  return base;
}

/**
 * Multiplier on the plate's cast shadow. A flush film has effectively none, a
 * standoff board has a full one, a hung banner slightly more because it sits
 * further off the wall, and nothing horizontal casts at all.
 */
export function surfaceCastScale(finish: SurfaceFinish): number {
  switch (finish.contact) {
    case "applied":
      return 0.1;
    case "glazed":
      return 0.08;
    case "ground":
      return 0;
    case "hung":
      return Math.min(1.5, 0.9 + finish.standoffMm / 60);
    case "standoff":
      return Math.min(1.35, 0.75 + finish.standoffMm / 40);
  }
}

/** Plain-language read of the substrate, for preview captions. */
export function surfaceFinishLabel(finish: SurfaceFinish): string {
  const how: Record<SurfaceContact, string> = {
    applied: "flush, no cast shadow",
    standoff: `${Math.round(finish.standoffMm)} mm standoff`,
    hung: "hung, drapes",
    ground: "horizontal, walked on",
    glazed: "on glazing, transmits",
  };
  return `${finish.label} · ${how[finish.contact]}`;
}
