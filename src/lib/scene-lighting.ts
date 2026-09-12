// Light-matching data for in-situ visualisation plates.
//
// A contain-fitted artwork rectangle on a photographic plate reads as "pasted
// on" unless it picks up the plate's own light: a direction, an ambient colour
// cast, an exposure level and a contact shadow where the print meets the
// surface. This module carries those measured-by-eye values per scene so the
// London and NEXT MART previews composite identically.
//
// Nothing here changes geometry. The artwork box is still the measured face at
// the panel's true trim ratio — these values only shade it.

export type LightDirection = "left" | "right" | "top" | "front";

export interface SceneLighting {
  /** Where the dominant light in the plate comes from. */
  direction: LightDirection;
  /** Overall brightness of the face, 1 = untouched. */
  exposure: number;
  /** Ambient colour cast of the space (warm tungsten, cool daylight…). */
  tint: string;
  /** Strength of the ambient cast, 0..1. */
  tintStrength: number;
  /** Falloff across the face away from the light, 0..1. */
  falloff: number;
  /** Contact/drop shadow strength where the print meets the surface, 0..1. */
  contact: number;
  /** Specular sheen for laminated or gloss substrates, 0..1. */
  sheen: number;
  /** Substrate: flat prints sit flush, panels get a thin edge reveal. */
  edge: "flush" | "reveal";
  /**
   * Photographic finish. A print composited at full digital cleanliness reads
   * as a screenshot dropped into a photo, so it takes the plate's own camera
   * character: sensor grain, a hair of lens softness (more on surfaces further
   * from the lens), and bounce light coming back off the floor.
   */
  grain: number;
  /** Lens/print softness in px at a 1536px-wide plate. */
  softness: number;
  /** Light bounced up into the print from the floor, 0..1. */
  bounce: number;
}

const DEFAULT_LIGHTING: SceneLighting = {
  direction: "top",
  exposure: 0.97,
  tint: "#EFE6D8",
  tintStrength: 0.12,
  falloff: 0.16,
  contact: 0.3,
  sheen: 0.06,
  edge: "reveal",
  grain: 0.055,
  softness: 0.35,
  bounce: 0.06,
};

/**
 * Per-scene light. Keys are scene ids from next-london-scenes and
 * next-mart-scenes; unknown ids fall back to a neutral interior.
 */
const SCENE_LIGHTING: Record<string, Partial<SceneLighting>> = {
  // ---- London venue plates -------------------------------------------------
  "foyer-column": {
    direction: "left",
    exposure: 1.0,
    tint: "#DCE6F2",
    tintStrength: 0.14,
    falloff: 0.2,
    contact: 0.22,
    sheen: 0.12,
    edge: "reveal",
  },
  "portrait-banner": {
    direction: "left",
    exposure: 1.02,
    tint: "#E3EAF3",
    tintStrength: 0.1,
    falloff: 0.14,
    contact: 0.18,
    sheen: 0.05,
    edge: "flush",
  },
  "wide-banner": {
    direction: "top",
    exposure: 0.98,
    tint: "#EDE7DB",
    tintStrength: 0.12,
    falloff: 0.12,
    contact: 0.26,
    sheen: 0.07,
    edge: "reveal",
  },
  "square-panel": {
    direction: "left",
    exposure: 1.01,
    tint: "#E7EDF4",
    tintStrength: 0.1,
    falloff: 0.16,
    contact: 0.24,
    sheen: 0.06,
    edge: "reveal",
  },
  "door-vinyl": {
    direction: "top",
    exposure: 0.95,
    tint: "#EDE6D9",
    tintStrength: 0.14,
    falloff: 0.2,
    contact: 0.14,
    sheen: 0.1,
    edge: "flush",
  },
  "step-repeat": {
    direction: "right",
    exposure: 0.94,
    tint: "#E8DFD2",
    tintStrength: 0.16,
    falloff: 0.22,
    contact: 0.3,
    sheen: 0.04,
    edge: "flush",
  },
  "stage-fascia": {
    direction: "top",
    exposure: 0.82,
    tint: "#7C8BD8",
    tintStrength: 0.22,
    falloff: 0.26,
    contact: 0.38,
    sheen: 0.05,
    edge: "flush",
  },
  "desk-front": {
    direction: "top",
    exposure: 0.99,
    tint: "#E4EBF4",
    tintStrength: 0.1,
    falloff: 0.14,
    contact: 0.28,
    sheen: 0.08,
    edge: "reveal",
  },
  "coffee-bar": {
    direction: "top",
    exposure: 0.93,
    tint: "#F0DFC4",
    tintStrength: 0.2,
    falloff: 0.2,
    contact: 0.3,
    sheen: 0.09,
    edge: "reveal",
  },
  "exterior-banner": {
    direction: "top",
    exposure: 1.05,
    tint: "#DCE9F7",
    tintStrength: 0.12,
    falloff: 0.18,
    contact: 0.2,
    sheen: 0.05,
    edge: "flush",
  },

  // ---- NEXT MART shop plates ---------------------------------------------
  "entrance-pillar": {
    direction: "right",
    exposure: 0.96,
    tint: "#F1DEC2",
    tintStrength: 0.2,
    falloff: 0.24,
    contact: 0.24,
    sheen: 0.1,
    edge: "reveal",
  },
  "wall-panel": {
    direction: "left",
    exposure: 0.97,
    tint: "#F0E2C8",
    tintStrength: 0.18,
    falloff: 0.18,
    contact: 0.26,
    sheen: 0.08,
    edge: "reveal",
  },
  "hanging-banner": {
    direction: "top",
    exposure: 0.95,
    tint: "#EFE1CA",
    tintStrength: 0.18,
    falloff: 0.16,
    contact: 0.2,
    sheen: 0.06,
    edge: "flush",
  },
  "rail-panel": {
    direction: "left",
    exposure: 0.96,
    tint: "#F1E0C4",
    tintStrength: 0.18,
    falloff: 0.18,
    contact: 0.24,
    sheen: 0.09,
    edge: "reveal",
  },
  "queue-panel": {
    direction: "right",
    exposure: 0.95,
    tint: "#EEDFC6",
    tintStrength: 0.18,
    falloff: 0.2,
    contact: 0.26,
    sheen: 0.07,
    edge: "reveal",
  },
  "till-front": {
    direction: "top",
    exposure: 0.94,
    tint: "#F0DEC0",
    tintStrength: 0.2,
    falloff: 0.18,
    contact: 0.3,
    sheen: 0.08,
    edge: "reveal",
  },
  "floor-decal": {
    direction: "top",
    exposure: 0.9,
    tint: "#E9DCC6",
    tintStrength: 0.2,
    falloff: 0.24,
    contact: 0.16,
    sheen: 0.16,
    edge: "flush",
  },

  // ---- Live in-event plates (delegates on site) -----------------------------
  "live-floor-graphic": {
    direction: "top",
    exposure: 0.93,
    tint: "#E4E8EE",
    tintStrength: 0.16,
    falloff: 0.22,
    contact: 0.2,
    sheen: 0.14,
    edge: "flush",
  },
  "live-lift-lobby": {
    direction: "left",
    exposure: 0.95,
    tint: "#EFE3CE",
    tintStrength: 0.16,
    falloff: 0.2,
    contact: 0.16,
    sheen: 0.12,
    edge: "flush",
  },
  "live-stair-glass": {
    direction: "left",
    exposure: 1.03,
    tint: "#E6EDF6",
    tintStrength: 0.12,
    falloff: 0.14,
    contact: 0.12,
    sheen: 0.18,
    edge: "flush",
  },
  "live-tabletop": {
    direction: "top",
    exposure: 0.98,
    tint: "#EFE7DA",
    tintStrength: 0.14,
    falloff: 0.18,
    contact: 0.18,
    sheen: 0.2,
    edge: "flush",
  },
  "live-registration-desk": {
    direction: "top",
    exposure: 0.97,
    tint: "#E7EDF4",
    tintStrength: 0.12,
    falloff: 0.14,
    contact: 0.3,
    sheen: 0.07,
    edge: "reveal",
  },
  "live-coffee-bar": {
    direction: "top",
    exposure: 0.95,
    tint: "#F0E0C6",
    tintStrength: 0.2,
    falloff: 0.2,
    contact: 0.26,
    sheen: 0.08,
    edge: "reveal",
  },
  "live-foyer-column": {
    direction: "left",
    exposure: 1.0,
    tint: "#E3EAF3",
    tintStrength: 0.12,
    falloff: 0.2,
    contact: 0.22,
    sheen: 0.1,
    edge: "reveal",
  },
  "live-stage-fascia": {
    direction: "top",
    exposure: 0.84,
    tint: "#8B93D6",
    tintStrength: 0.2,
    falloff: 0.24,
    contact: 0.36,
    sheen: 0.06,
    edge: "flush",
  },
  "live-room-doors": {
    direction: "left",
    exposure: 0.96,
    tint: "#E8EDF4",
    tintStrength: 0.14,
    falloff: 0.18,
    contact: 0.18,
    sheen: 0.1,
    edge: "flush",
  },
  "live-scenic-wall": {
    direction: "top",
    exposure: 0.94,
    tint: "#EDE4D4",
    tintStrength: 0.18,
    falloff: 0.22,
    contact: 0.24,
    sheen: 0.08,
    edge: "reveal",
  },
  "live-foyer-wall-run": {
    direction: "left",
    exposure: 0.97,
    tint: "#E6EAF1",
    tintStrength: 0.14,
    falloff: 0.2,
    contact: 0.2,
    sheen: 0.09,
    edge: "reveal",
  },
  "live-breakout-panel": {
    direction: "left",
    exposure: 1.0,
    tint: "#EDEAE2",
    tintStrength: 0.12,
    falloff: 0.16,
    contact: 0.2,
    sheen: 0.1,
    edge: "reveal",
  },
  "live-portrait-banner": {
    direction: "left",
    exposure: 1.04,
    tint: "#E8EEF7",
    tintStrength: 0.1,
    falloff: 0.14,
    contact: 0.1,
    sheen: 0.14,
    edge: "flush",
  },
  "live-exterior-entrance": {
    direction: "top",
    exposure: 0.99,
    tint: "#DDE4EC",
    tintStrength: 0.14,
    falloff: 0.16,
    contact: 0.14,
    sheen: 0.12,
    edge: "flush",
  },
};


export function sceneLighting(sceneId: string): SceneLighting {
  return { ...DEFAULT_LIGHTING, ...(SCENE_LIGHTING[sceneId] ?? {}) };
}

/** CSS gradient angle, in degrees, for light arriving from `direction`. */
export function shadeAngle(direction: LightDirection): number {
  switch (direction) {
    case "left":
      return 90; // bright at left edge, falling to the right
    case "right":
      return 270;
    case "top":
      return 180;
    default:
      return 180;
  }
}

/** Contact shadow offset, in fractions of the artwork box. */
export function shadowOffset(direction: LightDirection): { x: number; y: number } {
  switch (direction) {
    case "left":
      return { x: 0.012, y: 0.014 };
    case "right":
      return { x: -0.012, y: 0.014 };
    default:
      return { x: 0, y: 0.016 };
  }
}
