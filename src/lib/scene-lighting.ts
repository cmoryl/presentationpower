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


type SceneFinish = Partial<Pick<SceneLighting, "grain" | "softness" | "bounce">>;

/**
 * Camera character per plate. Raked surfaces (floors, table tops, glass) take
 * more softness and more bounce; a photographed plate carries visible sensor
 * grain, so the print must carry the same or it floats above the picture.
 */
const SCENE_FINISH: Record<string, SceneFinish> = {
  // Floors and tables: shot from above, closest to the lens, strong bounce.
  "surface-floor-graphic": { grain: 0.07, softness: 0.7, bounce: 0.16 },
  "live-floor-graphic": { grain: 0.08, softness: 0.8, bounce: 0.18 },
  "floor-decal": { grain: 0.07, softness: 0.7, bounce: 0.16 },
  "surface-tabletop": { grain: 0.06, softness: 0.6, bounce: 0.14 },
  "live-tabletop": { grain: 0.07, softness: 0.7, bounce: 0.15 },
  // Applied glass: crisp, but picks up the room behind it.
  "surface-stair-glass": { grain: 0.05, softness: 0.3, bounce: 0.1 },
  "live-stair-glass": { grain: 0.055, softness: 0.35, bounce: 0.12 },
  // Deep wall runs and scenic builds fall away from the lens.
  "ref-foyer-wall-run": { grain: 0.075, softness: 0.9, bounce: 0.08 },
  "live-foyer-wall-run": { grain: 0.07, softness: 0.6, bounce: 0.08 },
  "live-scenic-wall": { grain: 0.07, softness: 0.5, bounce: 0.07 },
  "ref-scenic-wall-blank": { grain: 0.06, softness: 0.45, bounce: 0.07 },
  "ref-press-wall": { grain: 0.065, softness: 0.45, bounce: 0.08 },
  // Desks and counters catch floor bounce along the bottom edge.
  "desk-front": { grain: 0.06, softness: 0.4, bounce: 0.14 },
  "live-registration-desk": { grain: 0.065, softness: 0.45, bounce: 0.15 },
  "coffee-bar": { grain: 0.06, softness: 0.4, bounce: 0.1 },
  "live-coffee-bar": { grain: 0.065, softness: 0.45, bounce: 0.11 },
  // Stage fascias sit in mixed wash light, far from the lens.
  "stage-fascia": { grain: 0.08, softness: 0.8, bounce: 0.12 },
  "live-stage-fascia": { grain: 0.085, softness: 0.9, bounce: 0.14 },
  // Photographed pillars and doors: match the photograph's own grain.
  "ref-foyer-pillar": { grain: 0.08, softness: 0.5, bounce: 0.09 },
  "ref-plenary-stage": { grain: 0.08, softness: 0.7, bounce: 0.08 },
  "ref-room-doors": { grain: 0.07, softness: 0.4, bounce: 0.1 },
  "live-room-doors": { grain: 0.065, softness: 0.4, bounce: 0.1 },
  // Exterior: bright, clean, hard daylight, almost no bounce.
  "ref-exterior-canopy": { grain: 0.05, softness: 0.35, bounce: 0.04 },
  "exterior-banner": { grain: 0.045, softness: 0.3, bounce: 0.04 },
  "live-exterior-entrance": { grain: 0.05, softness: 0.35, bounce: 0.05 },
  "floor-ext-forecourt": { grain: 0.05, softness: 0.35, bounce: 0.04 },
};

/**
 * ── The photographer's read of a plate ──────────────────────────────────────
 *
 * Matching a print to a photograph is not just "make it a bit darker". A real
 * shot has a time of day, a colour temperature, one dominant light of a given
 * hardness arriving from a measurable azimuth and elevation, a shadow whose
 * direction and length follow from that light, and a camera that rolls off
 * highlights, lifts blacks and vignettes the frame.
 *
 * Recording those properly, per plate, is what makes every event render read as
 * the same photographer on the same job — and it travels to the next venue,
 * because the same daylight/tungsten/stage reads recur in every conference
 * centre.
 */
export type TimeOfDay =
  | "morning"
  | "midday"
  | "afternoon"
  | "golden"
  | "evening"
  | "night"
  | "tungsten"
  | "daylight-interior"
  | "mixed-interior"
  | "stage";

export interface LightQuality {
  /** When, and under what, the plate was shot. */
  timeOfDay: TimeOfDay;
  /** Colour temperature of the dominant light, in kelvin. */
  kelvin: number;
  /** 0 = broad soft source (overcast, diffuser), 1 = bare hard source. */
  hardness: number;
  /** Compass bearing the light arrives from, in degrees: 0 = behind camera. */
  azimuth: number;
  /** Height of the light above the horizon, in degrees. */
  elevation: number;
  /** Shadow length as a multiple of the object's height (from elevation). */
  shadowLength: number;
  /** Open shade filling the shadow side, 0..1. */
  ambientLift: number;
  /** Highlight rolloff — how gently the top end compresses, 0..1. */
  rolloff: number;
  /** Lifted, filmic blacks, 0..1. */
  blackLift: number;
  /** Corner falloff of the taking lens, 0..1. */
  vignette: number;
}

/** House reads for each lighting condition, so plates stay consistent. */
const TIME_OF_DAY: Record<TimeOfDay, Omit<LightQuality, "timeOfDay">> = {
  morning: { kelvin: 5200, hardness: 0.55, azimuth: 105, elevation: 26, shadowLength: 2.05, ambientLift: 0.1, rolloff: 0.12, blackLift: 0.05, vignette: 0.1 },
  midday: { kelvin: 5600, hardness: 0.78, azimuth: 178, elevation: 64, shadowLength: 0.49, ambientLift: 0.07, rolloff: 0.16, blackLift: 0.04, vignette: 0.12 },
  afternoon: { kelvin: 4900, hardness: 0.52, azimuth: 252, elevation: 34, shadowLength: 1.48, ambientLift: 0.11, rolloff: 0.13, blackLift: 0.05, vignette: 0.11 },
  golden: { kelvin: 3400, hardness: 0.62, azimuth: 272, elevation: 13, shadowLength: 4.33, ambientLift: 0.09, rolloff: 0.2, blackLift: 0.07, vignette: 0.16 },
  evening: { kelvin: 3000, hardness: 0.34, azimuth: 296, elevation: 11, shadowLength: 5.14, ambientLift: 0.14, rolloff: 0.22, blackLift: 0.09, vignette: 0.18 },
  night: { kelvin: 4300, hardness: 0.3, azimuth: 190, elevation: 55, shadowLength: 0.7, ambientLift: 0.16, rolloff: 0.24, blackLift: 0.11, vignette: 0.22 },
  tungsten: { kelvin: 3050, hardness: 0.3, azimuth: 195, elevation: 72, shadowLength: 0.32, ambientLift: 0.16, rolloff: 0.18, blackLift: 0.07, vignette: 0.14 },
  "daylight-interior": { kelvin: 5300, hardness: 0.3, azimuth: 118, elevation: 42, shadowLength: 1.11, ambientLift: 0.2, rolloff: 0.14, blackLift: 0.05, vignette: 0.12 },
  "mixed-interior": { kelvin: 4350, hardness: 0.24, azimuth: 176, elevation: 60, shadowLength: 0.58, ambientLift: 0.22, rolloff: 0.15, blackLift: 0.06, vignette: 0.13 },
  stage: { kelvin: 6200, hardness: 0.46, azimuth: 182, elevation: 46, shadowLength: 0.97, ambientLift: 0.1, rolloff: 0.26, blackLift: 0.12, vignette: 0.24 },
};

/**
 * Time of day / light source per plate, plus any read that departs from the
 * house condition. Unlisted plates take a condition from their surface and
 * light direction, so a new venue's scenes are coherent from the first render.
 */
const SCENE_QUALITY: Record<string, { timeOfDay: TimeOfDay } & Partial<LightQuality>> = {
  // Genuine QEII photographs.
  "photo-foyer-wall-run": { timeOfDay: "daylight-interior", azimuth: 108, elevation: 38 },
  "photo-plenary-fascia": { timeOfDay: "stage", kelvin: 6600, hardness: 0.5 },
  "photo-churchill-stage": { timeOfDay: "stage", kelvin: 6000 },
  "photo-exhibition-foyer": { timeOfDay: "mixed-interior", azimuth: 150 },
  "photo-thirdfloor-wall": { timeOfDay: "daylight-interior", azimuth: 128, elevation: 46 },
  "photo-exhibition-stand": { timeOfDay: "daylight-interior", azimuth: 140, elevation: 44 },
  "photo-lounge-panel": { timeOfDay: "mixed-interior", azimuth: 120 },
  "photo-sanctuary-counter": { timeOfDay: "tungsten", kelvin: 3200 },
  "photo-cafe-tabletop": { timeOfDay: "daylight-interior", azimuth: 150, elevation: 52 },
  "photo-facade-evening": { timeOfDay: "night", kelvin: 4000, vignette: 0.24 },

  // Supplied event photographs.
  "ref-foyer-pillar": { timeOfDay: "mixed-interior", azimuth: 122 },
  "ref-plenary-stage": { timeOfDay: "stage" },
  "ref-room-doors": { timeOfDay: "mixed-interior", azimuth: 112 },
  "ref-foyer-wall-run": { timeOfDay: "daylight-interior", azimuth: 110, elevation: 36 },
  "ref-press-wall": { timeOfDay: "tungsten", kelvin: 3400 },
  "ref-scenic-wall-blank": { timeOfDay: "mixed-interior" },
  "ref-exterior-canopy": { timeOfDay: "afternoon" },

  // In-event visualisations.
  "live-stage-fascia": { timeOfDay: "stage" },
  "live-stair-glass": { timeOfDay: "daylight-interior", azimuth: 104, elevation: 40 },
  "live-floor-graphic": { timeOfDay: "mixed-interior", elevation: 74, shadowLength: 0.29 },
  "live-tabletop": { timeOfDay: "daylight-interior", elevation: 66, shadowLength: 0.45 },
  "live-coffee-bar": { timeOfDay: "tungsten" },
  "live-registration-desk": { timeOfDay: "mixed-interior" },
  "live-lift-lobby": { timeOfDay: "tungsten", kelvin: 3300 },
  "live-exterior-entrance": { timeOfDay: "afternoon" },
  "live-portrait-banner": { timeOfDay: "daylight-interior", azimuth: 106 },
  "live-foyer-column": { timeOfDay: "daylight-interior", azimuth: 112 },
  "live-foyer-wall-run": { timeOfDay: "daylight-interior", azimuth: 110 },
  "live-scenic-wall": { timeOfDay: "mixed-interior" },
  "live-breakout-panel": { timeOfDay: "daylight-interior", azimuth: 116 },
  "live-room-doors": { timeOfDay: "mixed-interior", azimuth: 114 },

  // House surface plates and NEXT MART.
  "stage-fascia": { timeOfDay: "stage" },
  "coffee-bar": { timeOfDay: "tungsten" },
  "desk-front": { timeOfDay: "mixed-interior" },
  "exterior-banner": { timeOfDay: "midday" },
  "floor-ext-forecourt": { timeOfDay: "midday", elevation: 68, shadowLength: 0.4 },
  "floor-decal": { timeOfDay: "mixed-interior", elevation: 74, shadowLength: 0.29 },
  "surface-floor-graphic": { timeOfDay: "mixed-interior", elevation: 74, shadowLength: 0.29 },
  "surface-tabletop": { timeOfDay: "daylight-interior", elevation: 66, shadowLength: 0.45 },
  "surface-stair-glass": { timeOfDay: "daylight-interior", azimuth: 104 },
  "entrance-pillar": { timeOfDay: "tungsten", kelvin: 3200 },
  "till-front": { timeOfDay: "tungsten" },
  "wall-panel": { timeOfDay: "tungsten", kelvin: 3300 },
  "rail-panel": { timeOfDay: "tungsten", kelvin: 3300 },
  "queue-panel": { timeOfDay: "tungsten", kelvin: 3300 },
  "hanging-banner": { timeOfDay: "tungsten", kelvin: 3400 },
};

/** Azimuth implied by a plate's dominant light direction, when unrecorded. */
function azimuthFor(direction: LightDirection): number {
  switch (direction) {
    case "left":
      return 112;
    case "right":
      return 248;
    default:
      return 178;
  }
}

/**
 * Approximate blackbody colour at `kelvin` as a hex string. Deriving every
 * ambient cast from a temperature — rather than a hand-picked hex per scene —
 * is what keeps a tungsten foyer and a tungsten coffee bar the same warm.
 */
export function kelvinTint(kelvin: number): string {
  const clamp = (n: number) => Math.round(Math.min(255, Math.max(0, n)));
  const black = (kelvin: number) => {
    const k = Math.min(9000, Math.max(1800, kelvin)) / 100;
    const r = k <= 66 ? 255 : 329.6987 * Math.pow(k - 60, -0.1332047592);
    const g =
      k <= 66
        ? 99.4708025861 * Math.log(k) - 161.1195681661
        : 288.1221695283 * Math.pow(k - 60, -0.0755148492);
    const b = k >= 66 ? 255 : k <= 19 ? 0 : 138.5177312231 * Math.log(k - 10) - 305.0447927307;
    return [Math.max(1, r), Math.max(1, g), Math.max(1, b)] as const;
  };
  // Normalised against 6500K daylight, so neutral daylight casts neutral and
  // only genuinely warm or cool light shifts the print.
  const ref = black(6500);
  const c = black(kelvin);
  const rel = [0, 1, 2].map((i) => (c[i]! / ref[i]!) * 255);
  // Pulled toward white: this is an ambient cast laid over a print, not the
  // colour of the light itself, and brand colours must survive it.
  const mix = (v: number) => clamp(v + (255 - v) * 0.55);
  return `#${rel
    .map((v) => mix(v).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** The full photographic read of a plate. */
export function sceneLightQuality(sceneId: string): LightQuality {
  const base = sceneLighting(sceneId);
  const spec = SCENE_QUALITY[sceneId];
  const tod: TimeOfDay = spec?.timeOfDay ?? "mixed-interior";
  const house = TIME_OF_DAY[tod];
  const q: LightQuality = {
    timeOfDay: tod,
    ...house,
    ...(spec ? { ...spec, timeOfDay: tod } : {}),
  };
  if (!spec || spec.azimuth === undefined) q.azimuth = azimuthFor(base.direction);
  if (!spec || spec.elevation === undefined) {
    if (base.direction === "top") q.elevation = Math.max(q.elevation, 58);
  }
  if (!spec || spec.shadowLength === undefined) {
    // A shadow's length follows from how high the light sits — never guessed.
    q.shadowLength = 1 / Math.tan((Math.max(6, q.elevation) * Math.PI) / 180);
  }
  return q;
}

/**
 * Cast shadow for a print on a surface, in fractions of the print's own box.
 * Direction comes from the light's azimuth, length from its elevation and
 * softness from its hardness — so a hard midday shadow is short and crisp and
 * an evening one is long and open, without either being hand-tuned.
 */
export function castShadow(
  q: LightQuality,
  strength: number,
): { x: number; y: number; blur: number; opacity: number } {
  const rad = ((q.azimuth - 180) * Math.PI) / 180;
  const len = Math.min(0.09, 0.012 + Math.min(3.2, q.shadowLength) * 0.016);
  return {
    // Light from the left throws the shadow right, and always downward on a
    // vertical surface because the source is above the horizon.
    x: -Math.sin(rad) * len,
    y: Math.max(0.006, Math.cos(((90 - q.elevation) * Math.PI) / 180) * 0.03 + len * 0.35),
    blur: 0.5 + (1 - q.hardness) * 2.4,
    opacity: Math.min(0.85, strength * (0.55 + q.hardness * 0.7)),
  };
}

/** Plain-language read of a plate's light, for preview captions. */
export function lightQualityLabel(q: LightQuality): string {
  const when: Record<TimeOfDay, string> = {
    morning: "Morning daylight",
    midday: "Midday sun",
    afternoon: "Afternoon daylight",
    golden: "Golden hour",
    evening: "Evening light",
    night: "After dark",
    tungsten: "Warm house lighting",
    "daylight-interior": "Daylight through the glazing",
    "mixed-interior": "House and daylight mix",
    stage: "Stage wash",
  };
  const feel = q.hardness >= 0.6 ? "hard shadows" : q.hardness >= 0.4 ? "medium shadows" : "soft shadows";
  return `${when[q.timeOfDay]} · ${Math.round(q.kelvin)}K · ${feel}`;
}

export function sceneLighting(sceneId: string): SceneLighting {
  const merged: SceneLighting = {
    ...DEFAULT_LIGHTING,
    ...(SCENE_LIGHTING[sceneId] ?? {}),
    ...(SCENE_FINISH[sceneId] ?? {}),
  };
  // Plates with no hand-picked cast take the colour of their own light, so a
  // new venue's scenes are already consistent with the existing ones.
  if (SCENE_LIGHTING[sceneId]?.tint === undefined) {
    const spec = SCENE_QUALITY[sceneId];
    if (spec) {
      merged.tint = kelvinTint(spec.kelvin ?? TIME_OF_DAY[spec.timeOfDay].kelvin);
    }
  }
  return merged;
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
