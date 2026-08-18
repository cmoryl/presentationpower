/**
 * BACKGROUND-AWARE LAYOUT METADATA
 * --------------------------------
 * Every authored scene (industry recipe R01–R30 or core language S01–S28) is a
 * *composition*, not a texture: it has visual mass on one side, a focal band, a
 * calm reading field and a contrast bias. The template/layout system needs that
 * information to place a title opposite the mass, drop a chart in the quietest
 * region and keep dense body copy off the art.
 *
 * This module derives that metadata deterministically from the same inputs the
 * art generator uses (code + scene + take), so the numbers can never drift from
 * the picture: one seed, one composition, one layout contract.
 *
 * Nothing here renders. It is pure, queryable data.
 */

import { SCENE_TIER, type SkinScene } from "./skin-backgrounds";
import { INDUSTRY_SIGNATURE, type SignatureId } from "./industry-signature-scenes";

export type SceneRegion =
  | "leftThird"
  | "centerThird"
  | "rightThird"
  | "upperLeft"
  | "upperCenter"
  | "upperRight"
  | "lowerLeft"
  | "lowerCenter"
  | "lowerRight"
  | "center"
  | "fullBleed"
  | "edgeOnly";

export type FocalSide = "left" | "right" | "center";
export type FocalBand = "upper" | "middle" | "lower";
export type SceneRole = "hero" | "content" | "data" | "flow";
export type TextContrastMode = "onLight" | "onDark" | "adaptive";
export type Alignment = "left" | "right" | "center";
export type Density = "airy" | "balanced" | "dense";

export interface SceneLayout {
  /** `R07` / `S12`. */
  code: string;
  scene: SkinScene;
  take: number;
  sceneRole: SceneRole;
  /** The region that stays compositionally calm — safe for type at any weight. */
  safeZone: SceneRegion;
  /** Where the artwork's dominant mass sits. */
  visualMass: SceneRegion;
  focalSide: FocalSide;
  focalBand: FocalBand;
  /** -1 = art is lighter than the field, +1 = darker/heavier. */
  contrastBias: number;
  recommendedTitleRegion: SceneRegion;
  recommendedBodyRegion: SceneRegion;
  recommendedChartRegion: SceneRegion;
  recommendedImageRegion: SceneRegion;
  avoidRegion: SceneRegion;
  preferredAlignment: Alignment;
  recommendedDensity: Density;
  textContrastMode: TextContrastMode;
  /** 0–1 expressive loudness of the field, matching the authored tier band. */
  visualEnergy: number;
  /** Share of the sheet kept as clean content space (0–1). */
  safeCoverage: number;
  /** True when the scene's motion reads left→right (flow alignment hint). */
  motionForward: boolean;
}

/** Approved intensity bands per scene family (see the authoring brief). */
const ENERGY: Record<SceneRole, [number, number]> = {
  hero: [0.72, 0.9],
  content: [0.28, 0.48],
  data: [0.2, 0.34],
  flow: [0.3, 0.4],
};

/** Content-safe share per family — Content/Data hold 55–70% clean field. */
const SAFE_COVERAGE: Record<SceneRole, number> = {
  hero: 0.42,
  content: 0.66,
  data: 0.7,
  flow: 0.55,
};

/**
 * Per-signature composition seed: which side the authored mass favours, which
 * horizontal band carries the focal event, how heavy the art reads, and whether
 * the scene has forward motion. Hand-set from the drawings, not guessed.
 */
interface SigSeed {
  side: FocalSide;
  band: FocalBand;
  /** 0 = feather-light art, 1 = heavy structural mass. */
  weight: number;
  motion: boolean;
}

const SIG_SEED: Record<SignatureId, SigSeed> = {
  atrium: { side: "left", band: "middle", weight: 0.72, motion: false },
  serviceStack: { side: "right", band: "middle", weight: 0.66, motion: false },
  signalVolume: { side: "center", band: "lower", weight: 0.5, motion: true },
  liquidity: { side: "right", band: "middle", weight: 0.48, motion: true },
  vaultLedger: { side: "left", band: "lower", weight: 0.7, motion: false },
  coverageShells: { side: "right", band: "middle", weight: 0.44, motion: false },
  secureZones: { side: "right", band: "middle", weight: 0.6, motion: false },
  corridor: { side: "center", band: "middle", weight: 0.4, motion: true },
  membrane: { side: "left", band: "lower", weight: 0.46, motion: false },
  judicial: { side: "left", band: "middle", weight: 0.78, motion: false },
  decisionArch: { side: "right", band: "lower", weight: 0.54, motion: true },
  productionCell: { side: "left", band: "lower", weight: 0.74, motion: true },
  energyGrid: { side: "center", band: "lower", weight: 0.62, motion: true },
  aeroBody: { side: "right", band: "middle", weight: 0.58, motion: true },
  orbital: { side: "right", band: "upper", weight: 0.52, motion: true },
  coverageMesh: { side: "center", band: "upper", weight: 0.46, motion: true },
  hubNetwork: { side: "left", band: "lower", weight: 0.56, motion: true },
  displayArch: { side: "right", band: "lower", weight: 0.6, motion: false },
  materialStrata: { side: "center", band: "lower", weight: 0.68, motion: false },
  sculptural: { side: "right", band: "middle", weight: 0.76, motion: false },
  lensSpace: { side: "center", band: "middle", weight: 0.5, motion: true },
  neonHorizon: { side: "center", band: "lower", weight: 0.64, motion: true },
  performanceLanes: { side: "left", band: "lower", weight: 0.6, motion: true },
  horizonSpace: { side: "center", band: "lower", weight: 0.42, motion: true },
  massing: { side: "left", band: "lower", weight: 0.72, motion: false },
  inquiry: { side: "right", band: "upper", weight: 0.44, motion: true },
  civicService: { side: "left", band: "middle", weight: 0.66, motion: false },
  earthSystem: { side: "center", band: "lower", weight: 0.48, motion: false },
  constellation: { side: "right", band: "middle", weight: 0.42, motion: true },
  stageSpace: { side: "center", band: "upper", weight: 0.7, motion: true },
};

const FALLBACK_SEED: SigSeed = { side: "right", band: "middle", weight: 0.5, motion: false };

function flip(side: FocalSide): FocalSide {
  return side === "left" ? "right" : side === "right" ? "left" : "center";
}

function opposite(side: FocalSide): FocalSide {
  return flip(side);
}

/**
 * TAKE GRAMMAR — the four takes are real recompositions, not mirrors of one
 * drawing: A as authored, B mirrored, C mass pushed low and enlarged, D mass
 * raised into the upper third. `sceneTakeTransform` paints exactly this.
 */
export interface TakeGrammar {
  /** Horizontal mirror of the authored composition. */
  mirror: boolean;
  /** Scale about the focal point (1 = authored). */
  scale: number;
  /** Vertical shift of the mass, in fractions of sheet height. */
  shiftY: number;
  band: FocalBand;
}

export const TAKE_GRAMMAR: TakeGrammar[] = [
  { mirror: false, scale: 1, shiftY: 0, band: "middle" },
  { mirror: true, scale: 1.04, shiftY: -0.03, band: "middle" },
  { mirror: false, scale: 1.16, shiftY: 0.08, band: "lower" },
  { mirror: true, scale: 1.09, shiftY: -0.1, band: "upper" },
];

export function takeGrammar(take: number): TakeGrammar {
  return TAKE_GRAMMAR[((take % 4) + 4) % 4]!;
}

function regionFor(side: FocalSide, band: FocalBand): SceneRegion {
  if (side === "center") {
    return band === "upper" ? "upperCenter" : band === "lower" ? "lowerCenter" : "center";
  }
  const cap = side === "left" ? "Left" : "Right";
  if (band === "upper") return `upper${cap}` as SceneRegion;
  if (band === "lower") return `lower${cap}` as SceneRegion;
  return side === "left" ? "leftThird" : "rightThird";
}

/** Signature seed for any approved code; core languages fall back to a hash. */
function seedFor(code: string): SigSeed {
  const sig = INDUSTRY_SIGNATURE[code.toUpperCase()];
  if (sig) return SIG_SEED[sig] ?? FALLBACK_SEED;
  // Core language (S01–S28): stable pseudo-composition from the code number so
  // the metadata is deterministic and spread across the region vocabulary.
  const n = Number.parseInt(code.replace(/\D+/g, ""), 10) || 1;
  const sides: FocalSide[] = ["left", "right", "center"];
  const bands: FocalBand[] = ["middle", "lower", "upper"];
  return {
    side: sides[n % 3]!,
    band: bands[(n >> 1) % 3]!,
    weight: 0.4 + ((n * 7) % 5) * 0.07,
    motion: n % 2 === 0,
  };
}

/**
 * The layout contract for one authored composition. Deterministic: same code +
 * scene + take always yields the same regions, so template logic and the
 * picture can never disagree.
 */
export function sceneLayout(code: string, scene: SkinScene, take = 0): SceneLayout {
  const c = code.toUpperCase();
  const role = (SCENE_TIER[scene] ?? "content") as SceneRole;
  const g = takeGrammar(take);
  const seed = seedFor(c);

  const side = g.mirror ? flip(seed.side) : seed.side;
  const band = g.band === "middle" ? seed.band : g.band;
  const copySide = opposite(side);
  const copyBand: FocalBand = band === "upper" ? "lower" : band === "lower" ? "upper" : "middle";

  const [lo, hi] = ENERGY[role];
  const energy = Number((lo + (hi - lo) * Math.min(1, Math.max(0, seed.weight))).toFixed(3));
  const safeCoverage = Number(
    Math.min(0.74, SAFE_COVERAGE[role] + (0.5 - seed.weight) * 0.08).toFixed(3),
  );

  const massRegion = regionFor(side, band);
  const safeRegion = regionFor(copySide, copyBand === "middle" ? "middle" : copyBand);

  return {
    code: c,
    scene,
    take: ((take % 4) + 4) % 4,
    sceneRole: role,
    safeZone: safeRegion,
    visualMass: massRegion,
    focalSide: side,
    focalBand: band,
    contrastBias: Number((seed.weight * 2 - 1).toFixed(2)),
    // Hero: the title takes the calm side opposite the mass, in the band that
    // the art vacates. Content/Data prefer the widest calm run.
    recommendedTitleRegion:
      role === "hero" ? safeRegion : copySide === "center" ? "upperCenter" : safeRegion,
    recommendedBodyRegion:
      copySide === "center" ? "centerThird" : copySide === "left" ? "leftThird" : "rightThird",
    recommendedChartRegion:
      role === "data"
        ? copySide === "center"
          ? "center"
          : copySide === "left"
            ? "leftThird"
            : "rightThird"
        : safeRegion,
    recommendedImageRegion: massRegion,
    avoidRegion: massRegion,
    preferredAlignment: copySide === "center" ? "center" : copySide,
    recommendedDensity: role === "data" ? "dense" : role === "hero" ? "airy" : "balanced",
    textContrastMode: "adaptive",
    visualEnergy: energy,
    safeCoverage,
    motionForward: seed.motion ? !g.mirror : false,
  };
}

/** Every take of one code × scene, in take order. */
export function sceneLayoutTakes(code: string, scene: SkinScene): SceneLayout[] {
  return [0, 1, 2, 3].map((t) => sceneLayout(code, scene, t));
}

/** CSS custom properties a layout consumer can spread onto the slide stage. */
export function sceneLayoutVars(l: SceneLayout): Record<string, string> {
  return {
    "--scene-focal-side": l.focalSide,
    "--scene-focal-band": l.focalBand,
    "--scene-safe-zone": l.safeZone,
    "--scene-energy": String(l.visualEnergy),
    "--scene-align": l.preferredAlignment,
  };
}

/** Human caption for studio/QA overlays. */
export function sceneLayoutSummary(l: SceneLayout): string {
  return [
    `${l.sceneRole.toUpperCase()} · take ${"ABCD"[l.take]}`,
    `mass ${l.visualMass}`,
    `safe ${l.safeZone} (${Math.round(l.safeCoverage * 100)}%)`,
    `energy ${l.visualEnergy.toFixed(2)}`,
    `align ${l.preferredAlignment}`,
  ].join(" · ");
}

/** Bounding boxes (0–1 of the sheet) for a region — used by QA overlays. */
export const REGION_BOX: Record<SceneRegion, { x: number; y: number; w: number; h: number }> = {
  leftThird: { x: 0, y: 0, w: 1 / 3, h: 1 },
  centerThird: { x: 1 / 3, y: 0, w: 1 / 3, h: 1 },
  rightThird: { x: 2 / 3, y: 0, w: 1 / 3, h: 1 },
  upperLeft: { x: 0, y: 0, w: 1 / 2, h: 1 / 2 },
  upperCenter: { x: 1 / 4, y: 0, w: 1 / 2, h: 1 / 2 },
  upperRight: { x: 1 / 2, y: 0, w: 1 / 2, h: 1 / 2 },
  lowerLeft: { x: 0, y: 1 / 2, w: 1 / 2, h: 1 / 2 },
  lowerCenter: { x: 1 / 4, y: 1 / 2, w: 1 / 2, h: 1 / 2 },
  lowerRight: { x: 1 / 2, y: 1 / 2, w: 1 / 2, h: 1 / 2 },
  center: { x: 1 / 6, y: 1 / 6, w: 2 / 3, h: 2 / 3 },
  fullBleed: { x: 0, y: 0, w: 1, h: 1 },
  edgeOnly: { x: 0, y: 0, w: 1, h: 1 },
};
