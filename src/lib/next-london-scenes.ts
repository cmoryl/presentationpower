// In-situ location scenes for the NEXT 2026 London kit.
//
// Each scene is a photographic conference-centre plate with one measured
// installation face. The face rectangle was read from a chroma-key plate
// (pure magenta placement area) and the magenta then neutralised, so panel
// artwork can be composited into the exact measured face.
//
// These plates are photoreal *visualisations* built to match the real
// architecture of the Queen Elizabeth II Centre (grey ribbed slat ceilings,
// dark grey carpet tiles, purple upholstered stacking chairs, Broad Sanctuary
// glazing with Westminster Abbey outside) — they are still not photographs of
// the venue. Every surface that shows them must label them as visualisations.

import coffeeBar from "@/assets/london-scenes/coffee-bar.jpg";
import liveFloorGraphic from "@/assets/london-scenes/live-floor-graphic.jpg";
import liveLiftLobby from "@/assets/london-scenes/live-lift-lobby.jpg";
import liveStairGlass from "@/assets/london-scenes/live-stair-glass.jpg";
import liveTabletop from "@/assets/london-scenes/live-tabletop.jpg";
import liveRegistrationDesk from "@/assets/london-scenes/live-registration-desk.jpg";
import liveCoffeeBar from "@/assets/london-scenes/live-coffee-bar.jpg";
import liveFoyerColumn from "@/assets/london-scenes/live-foyer-column.jpg";
import liveStageFascia from "@/assets/london-scenes/live-stage-fascia.jpg";
import liveRoomDoors from "@/assets/london-scenes/live-room-doors.jpg";
import liveScenicWall from "@/assets/london-scenes/live-scenic-wall.jpg";
import liveFoyerWallRun from "@/assets/london-scenes/live-foyer-wall-run.jpg";
import liveBreakoutPanel from "@/assets/london-scenes/live-breakout-panel.jpg";
import livePortraitBanner from "@/assets/london-scenes/live-portrait-banner.jpg";
import liveExteriorEntrance from "@/assets/london-scenes/live-exterior-entrance.jpg";
import surfaceFloorGraphic from "@/assets/london-scenes/surface-floor-graphic.jpg";
import surfaceLiftDoors from "@/assets/london-scenes/surface-lift-doors.jpg";
import surfaceStairGlass from "@/assets/london-scenes/surface-stair-glass.jpg";
import surfaceTabletop from "@/assets/london-scenes/surface-tabletop.jpg";
import deskFront from "@/assets/london-scenes/desk-front.jpg";
import doorVinyl from "@/assets/london-scenes/door-vinyl.jpg";
import exteriorBanner from "@/assets/london-scenes/exterior-banner.jpg";
import floor2fBreakout from "@/assets/london-scenes/floor-2f-breakout.jpg";
import floor3fFoyer from "@/assets/london-scenes/floor-3f-foyer.jpg";
import floor4fSuite from "@/assets/london-scenes/floor-4f-suite.jpg";
import floor5fStairGlass from "@/assets/london-scenes/floor-5f-stair-glass.jpg";
import floor6fSet from "@/assets/london-scenes/floor-6f-set.jpg";
import refFoyerPillar from "@/assets/london-scenes/ref-foyer-pillar.jpg";
import refPlenaryStage from "@/assets/london-scenes/ref-plenary-stage.jpg";
import refRoomDoors from "@/assets/london-scenes/ref-room-doors.jpg";
import refFoyerWallRun from "@/assets/london-scenes/ref-foyer-wall-run.jpg";
import refPressWall from "@/assets/london-scenes/ref-press-wall.jpg";
import refExteriorCanopy from "@/assets/london-scenes/ref-exterior-canopy.jpg";
import refScenicWallBlank from "@/assets/london-scenes/ref-scenic-wall-blank.jpg";
import floorExtForecourt from "@/assets/london-scenes/floor-ext-forecourt.jpg";
import floorGfAuditorium from "@/assets/london-scenes/floor-gf-auditorium.jpg";

import foyerColumn from "@/assets/london-scenes/foyer-column.jpg";
import portraitBanner from "@/assets/london-scenes/portrait-banner.jpg";
import squarePanel from "@/assets/london-scenes/square-panel.jpg";
import stageFascia from "@/assets/london-scenes/stage-fascia.jpg";
import stepRepeat from "@/assets/london-scenes/step-repeat.jpg";
import wideBanner from "@/assets/london-scenes/wide-banner.jpg";

import {
  canCoverFace,
  mountArtworkOnFace,
  type SceneFixedAxis,
  type SceneMountMode,
} from "@/lib/scene-face-fit";
import { quadFromRect, type SceneQuad } from "@/lib/scene-perspective";
import type { LondonFloorId, LondonPanel } from "@/lib/next-london-signage";

/** Fractional face rectangle on the plate (0..1 of plate width/height). */
export interface SceneFace {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SceneKind =
  | "column"
  | "portrait"
  | "wide"
  | "square"
  | "door"
  | "wall"
  | "fascia"
  | "desk"
  | "counter"
  | "exterior"
  | "floor"
  | "lift"
  | "glass"
  | "table";

export interface LondonScene {
  id: string;
  label: string;
  /** Where in the venue this kind of install lives. */
  where: string;
  kind: SceneKind;
  src: string;
  plate: { w: number; h: number };
  face: SceneFace;
  /** Aspect (w/h) of the measured face — used to rank scene fit. */
  faceRatio: number;
  /** The surface edge that physically fixes the print size. */
  fixed: SceneFixedAxis;
  /** Where on the free axis the print sits. */
  anchorY: "top" | "center" | "bottom";
  /** How the print meets the surface (applied vinyls cover their face). */
  mount: SceneMountMode;
  /** True when the plate is a real event photograph, not a visualisation. */
  photo?: boolean;
  /** True when the plate shows the surface with delegates on site. */
  live?: boolean;
  /**
   * Measured corners of the printed face as they appear in the plate, clockwise
   * from top-left, in plate fractions. Present for every surface seen at an
   * angle, so the print is warped onto the real surface instead of pasted on
   * square. Frontal surfaces have none and stay unresampled.
   */
  quad?: SceneQuad;
  /** Floors this plate actually represents, when it is a floor-specific space. */
  floors?: LondonFloorId[];
  /**
   * Measured real-world size of the printed face in this plate, in mm, only
   * where the build was actually measured (supplied drawing or survey). Never
   * estimated from the photograph.
   */
  surface?: { wMm: number; hMm: number; note?: string };
}

/** How a plate came to exist — the one line every surface must show. */
export type SceneProvenance = "photograph" | "live-visualisation" | "visualisation";

export function sceneProvenance(scene: LondonScene): SceneProvenance {
  if (scene.photo) return "photograph";
  return scene.live ? "live-visualisation" : "visualisation";
}

/** Short, consistent provenance wording for badges and captions. */
export function sceneProvenanceLabel(scene: LondonScene): string {
  switch (sceneProvenance(scene)) {
    case "photograph":
      return "Event photograph · artwork composited";
    case "live-visualisation":
      return "Visualisation · event in progress, not a venue photo";
    default:
      return "Visualisation · not a venue photo";
  }
}

function mm(v: number): string {
  return `${Math.round(v)}`;
}

/** "6800 × 4030 mm" for a measured face, or undefined when it is unmeasured. */
export function sceneSurfaceLabel(scene: LondonScene): string | undefined {
  if (!scene.surface) return undefined;
  return `${mm(scene.surface.wMm)} × ${mm(scene.surface.hMm)} mm`;
}

/**
 * The dimensions line for a scene: the measured surface where we have it, and
 * always the item's own printed trim, so the caption never implies a size we
 * did not measure.
 */
export function sceneDimensionsLabel(
  scene: LondonScene,
  panel?: Pick<LondonPanel, "trimW" | "trimH">,
): string {
  const parts: string[] = [];
  const surface = sceneSurfaceLabel(scene);
  if (surface) parts.push(`Surface ${surface}`);
  if (panel) parts.push(`Print ${mm(panel.trimW)} × ${mm(panel.trimH)} mm trim`);
  return parts.join(" · ");
}

/** The full one-line caption used under and over every in-situ plate. */
export function sceneCaption(
  scene: LondonScene,
  panel?: Pick<LondonPanel, "trimW" | "trimH">,
): string {
  const dims = sceneDimensionsLabel(scene, panel);
  return dims ? `${sceneProvenanceLabel(scene)} · ${dims}` : sceneProvenanceLabel(scene);
}

/**
 * Measured face corners per plate, clockwise from top-left, in plate fractions.
 * Read off the plates themselves against a tenth grid: the printed face of a
 * receding wall, a floor laid in perspective, a raked fascia or a table top is
 * NOT a rectangle on the photograph, and mounting artwork as one is what makes
 * a render look placed. Only surfaces that actually rake are listed; a frontal
 * wall is left out on purpose so its print stays pixel-exact.
 */
const SCENE_QUADS: Record<string, SceneQuad> = {
  // Floor graphics: laid flat, so the far edge is short and the near edge wide.
  "surface-floor-graphic": [
    { x: 0.196, y: 0.383 },
    { x: 0.788, y: 0.401 },
    { x: 0.883, y: 0.799 },
    { x: 0.061, y: 0.722 },
  ],
  "live-floor-graphic": [
    { x: 0.246, y: 0.506 },
    { x: 0.664, y: 0.506 },
    { x: 0.856, y: 0.799 },
    { x: 0.134, y: 0.799 },
  ],
  // Table tops: seen from standing height, near edge wider.
  "surface-tabletop": [
    { x: 0.301, y: 0.199 },
    { x: 0.709, y: 0.199 },
    { x: 0.757, y: 0.498 },
    { x: 0.253, y: 0.498 },
  ],
  "live-tabletop": [
    { x: 0.247, y: 0.601 },
    { x: 0.723, y: 0.601 },
    { x: 0.775, y: 0.723 },
    { x: 0.196, y: 0.723 },
  ],
  // Desk and counter fronts: slight rake off the lens axis.
  "desk-front": [
    { x: 0.114, y: 0.534 },
    { x: 0.944, y: 0.545 },
    { x: 0.944, y: 0.687 },
    { x: 0.112, y: 0.706 },
  ],
  "live-registration-desk": [
    { x: 0.142, y: 0.522 },
    { x: 0.873, y: 0.508 },
    { x: 0.878, y: 0.753 },
    { x: 0.135, y: 0.772 },
  ],
  "live-coffee-bar": [
    { x: 0.19, y: 0.117 },
    { x: 0.884, y: 0.096 },
    { x: 0.884, y: 0.546 },
    { x: 0.19, y: 0.531 },
  ],
  // Stage fascias: long, low, and seen from the floor of the room.
  "live-stage-fascia": [
    { x: 0.078, y: 0.588 },
    { x: 0.977, y: 0.57 },
    { x: 0.977, y: 0.666 },
    { x: 0.078, y: 0.712 },
  ],
  // A foyer wall run receding away from the camera — the strongest rake in the
  // library, and the plate that most obviously failed as a flat rectangle.
  "ref-foyer-wall-run": [
    { x: 0.021, y: 0.077 },
    { x: 0.813, y: 0.316 },
    { x: 0.813, y: 0.779 },
    { x: 0.021, y: 0.962 },
  ],
  "live-foyer-wall-run": [
    { x: 0.338, y: 0.108 },
    { x: 0.967, y: 0.091 },
    { x: 0.967, y: 0.632 },
    { x: 0.338, y: 0.651 },
  ],
  // Scenic builds and press walls: near-frontal, a degree or two of turn.
  "live-scenic-wall": [
    { x: 0.185, y: 0.03 },
    { x: 0.953, y: 0.046 },
    { x: 0.949, y: 0.903 },
    { x: 0.19, y: 0.884 },
  ],
  "ref-press-wall": [
    { x: 0.194, y: 0.046 },
    { x: 0.856, y: 0.056 },
    { x: 0.856, y: 0.721 },
    { x: 0.194, y: 0.735 },
  ],
  // Entrance canopy band, seen from below on the forecourt.
  "ref-exterior-canopy": [
    { x: 0.104, y: 0.478 },
    { x: 0.906, y: 0.461 },
    { x: 0.906, y: 0.573 },
    { x: 0.104, y: 0.601 },
  ],
  // Photographed pillar: the visible face turns very slightly toward the lens.
  "ref-foyer-pillar": [
    { x: 0.797, y: 0.153 },
    { x: 0.878, y: 0.164 },
    { x: 0.878, y: 0.884 },
    { x: 0.797, y: 0.876 },
  ],
};

/** Measured face quad for a scene, or the plain face rectangle. */
export function sceneQuad(scene: LondonScene): SceneQuad {
  return scene.quad ?? quadFromRect(scene.face);
}

function scene(
  id: string,
  label: string,
  where: string,
  kind: SceneKind,
  src: string,
  face: SceneFace,
  fixed: SceneFixedAxis = "w",
  anchorY: "top" | "center" | "bottom" = "center",
  mount: SceneMountMode = "edge",
  floors?: LondonFloorId[],
): LondonScene {
  return {
    id,
    label,
    where,
    kind,
    src,
    plate: { w: 1536, h: 1024 },
    face,
    faceRatio: (face.w * 1536) / (face.h * 1024),
    fixed,
    anchorY,
    mount,
    ...(SCENE_QUADS[id] ? { quad: SCENE_QUADS[id] } : {}),
    ...(floors ? { floors } : {}),
  };
}


export const LONDON_SCENES: LondonScene[] = [
  scene("foyer-column", "Foyer light column", "Ground floor foyer", "column", foyerColumn, {
    x: 0.4219,
    y: 0.1309,
    w: 0.1569,
    h: 0.707,
  }, "w", "top"),
  scene("portrait-banner", "Hanging portrait banner", "Atrium / stairwell", "portrait", portraitBanner, {
    x: 0.4173,
    y: 0.1113,
    w: 0.1602,
    h: 0.7412,
  }, "w", "top"),
  scene("wide-banner", "Foyer wall run", "Circulation wall", "wide", wideBanner, {
    x: 0.2617,
    y: 0.168,
    w: 0.6621,
    h: 0.5527,
  }, "w", "center"),
  scene("square-panel", "Breakout wall panel", "Breakout / lounge", "square", squarePanel, {
    x: 0.4889,
    y: 0.2539,
    w: 0.1764,
    h: 0.2607,
  }, "w", "center"),
  scene("door-vinyl", "Room door vinyl", "Session room entrance", "door", doorVinyl, {
    x: 0.3991,
    y: 0.0996,
    w: 0.1914,
    h: 0.8213,
  }, "w", "center", "cover"),
  scene("step-repeat", "Step-and-repeat wall", "Press / photo point", "wall", stepRepeat, {
    x: 0.1061,
    y: 0.1221,
    w: 0.7891,
    h: 0.7402,
  }, "w", "center"),
  scene("stage-fascia", "Stage fascia", "Main plenary stage", "fascia", stageFascia, {
    x: 0.1641,
    y: 0.4912,
    w: 0.6686,
    h: 0.0615,
  }, "h", "center"),
  scene("desk-front", "Registration desk front", "Registration", "desk", deskFront, {
    x: 0.112,
    y: 0.5156,
    w: 0.832,
    h: 0.1875,
  }, "h", "center"),
  scene("coffee-bar", "Coffee bar back wall", "Catering / coffee bar", "counter", coffeeBar, {
    x: 0.151,
    y: 0.2773,
    w: 0.6875,
    h: 0.2744,
  }, "w", "center"),
  scene("exterior-banner", "Exterior entrance banner", "Street entrance", "exterior", exteriorBanner, {
    x: 0.2715,
    y: 0.1768,
    w: 0.0579,
    h: 0.4551,
  }, "w", "top"),

  // ── Surface-specific plates ──────────────────────────────────────────────
  // Kinds that have no wall to sit on: a floor graphic laid on carpet, a lift
  // door pair, applied stair balustrade glass, and a cafe table top.
  // Face rectangle = the bounding box of the measured floor quad, so the fit
  // and the warp describe the same physical surface.
  scene("surface-floor-graphic", "Floor graphic on carpet", "Foyer circulation floor", "floor", surfaceFloorGraphic, {
    x: 0.061,
    y: 0.383,
    w: 0.822,
    h: 0.416,
  }, "w", "center", "edge"),
  scene("surface-lift-doors", "Lift door wrap", "Lift lobby", "lift", surfaceLiftDoors, {
    x: 0.155,
    y: 0.175,
    w: 0.23,
    h: 0.615,
  }, "w", "center", "cover"),
  scene("surface-stair-glass", "Stair balustrade glass", "Stair glazing", "glass", surfaceStairGlass, {
    x: 0.13,
    y: 0.22,
    w: 0.72,
    h: 0.55,
  }, "w", "center", "edge"),
  // Face rectangle = bounding box of the measured (foreshortened) table top.
  scene("surface-tabletop", "Cafe table top", "Catering / lounge tables", "table", surfaceTabletop, {
    x: 0.253,
    y: 0.199,
    w: 0.504,
    h: 0.299,
  }, "w", "center", "edge"),

  // ── Live in-event plates ─────────────────────────────────────────────────
  // The same surfaces, photographed as they read during the show: delegates
  // walking, queueing and networking around the install, with the printed face
  // itself kept clear so nothing crosses the artwork.
  { ...scene("live-floor-graphic", "Floor graphic · foyer in use", "Foyer circulation floor · event live", "floor", liveFloorGraphic, {
    x: 0.17,
    y: 0.5,
    w: 0.7,
    h: 0.33,
  }, "w", "center", "edge"), live: true },
  { ...scene("live-lift-lobby", "Lift wrap · lift lobby in use", "Lift lobby · event live", "lift", liveLiftLobby, {
    x: 0.105,
    y: 0.085,
    w: 0.27,
    h: 0.84,
  }, "w", "center", "cover"), live: true },
  { ...scene("live-stair-glass", "Stair glazing · stairs in use", "Stair glazing · event live", "glass", liveStairGlass, {
    x: 0.18,
    y: 0.35,
    w: 0.48,
    h: 0.3,
  }, "w", "center", "edge"), live: true },
  { ...scene("live-tabletop", "Table top · break in progress", "Catering tables · event live", "table", liveTabletop, {
    x: 0.19,
    y: 0.545,
    w: 0.59,
    h: 0.28,
  }, "w", "center", "edge"), live: true },
  { ...scene("live-registration-desk", "Registration desk in use", "Registration · event live", "desk", liveRegistrationDesk, {
    x: 0.135,
    y: 0.51,
    w: 0.74,
    h: 0.245,
  }, "h", "center", "edge"), live: true },
  { ...scene("live-coffee-bar", "Coffee bar wall · break in progress", "Catering / coffee bar · event live", "counter", liveCoffeeBar, {
    x: 0.185,
    y: 0.1,
    w: 0.7,
    h: 0.44,
  }, "w", "center", "edge"), live: true },
  { ...scene("live-foyer-column", "Pillar · exhibition foyer in use", "Exhibition foyer pillar · event live", "column", liveFoyerColumn, {
    x: 0.405,
    y: 0.035,
    w: 0.17,
    h: 0.92,
  }, "w", "top", "cover"), live: true },
  { ...scene("live-stage-fascia", "Stage fascia · session in progress", "Plenary stage front · event live", "fascia", liveStageFascia, {
    x: 0.075,
    y: 0.565,
    w: 0.905,
    h: 0.135,
  }, "h", "center", "edge"), live: true },
  { ...scene("live-room-doors", "Room doors · delegates arriving", "Breakout room doors · event live", "door", liveRoomDoors, {
    x: 0.312,
    y: 0.03,
    w: 0.475,
    h: 0.83,
  }, "w", "center", "cover"), live: true },
  { ...scene("live-scenic-wall", "Scenic wall · foyer in use", "Scenic panel wall · event live", "wall", liveScenicWall, {
    x: 0.177,
    y: 0.039,
    w: 0.728,
    h: 0.845,
  }, "w", "center", "edge"), live: true },
  { ...scene("live-foyer-wall-run", "Foyer wall run · circulation in use", "Foyer wall run · event live", "wide", liveFoyerWallRun, {
    x: 0.335,
    y: 0.1,
    w: 0.635,
    h: 0.55,
  }, "w", "center", "edge"), live: true },
  { ...scene("live-breakout-panel", "Breakout panel · lounge in use", "Breakout lounge panel · event live", "square", liveBreakoutPanel, {
    x: 0.501,
    y: 0.119,
    w: 0.234,
    h: 0.369,
  }, "w", "center", "edge"), live: true },
  { ...scene("live-portrait-banner", "Hanging banner · atrium in use", "Atrium hanging banner · event live", "portrait", livePortraitBanner, {
    x: 0.404,
    y: 0.029,
    w: 0.169,
    h: 0.615,
  }, "w", "top", "edge"), live: true },
  { ...scene("live-exterior-entrance", "Entrance banner · doors open", "Exterior entrance banner · event live", "exterior", liveExteriorEntrance, {
    x: 0.137,
    y: 0.176,
    w: 0.765,
    h: 0.283,
  }, "w", "center", "cover"), live: true },


  // ── Floor-specific plates ────────────────────────────────────────────────
  // One space per mapped floor of the venue, matched to the room roster and
  // the install faces on that level, so an item can be previewed in the space
  // it is actually scheduled for. Still visualisations, not venue photos.
  scene("floor-ext-forecourt", "Broad Sanctuary forecourt flag", "Exterior · forecourt approach", "exterior", floorExtForecourt, {
    x: 0.28,
    y: 0.06,
    w: 0.105,
    h: 0.645,
  }, "w", "top", "edge", ["EXT"]),
  scene("floor-gf-auditorium", "Churchill stage wall", "Ground floor · Churchill", "wall", floorGfAuditorium, {
    x: 0.1914,
    y: 0.1934,
    w: 0.6133,
    h: 0.3379,
  }, "w", "center", "edge", ["GF"]),
  scene("floor-2f-breakout", "Second floor breakout wall", "Second floor · actor rooms & beam", "wall", floor2fBreakout, {
    x: 0.387,
    y: 0.283,
    w: 0.348,
    h: 0.256,
  }, "w", "center", "edge", ["2F"]),
  scene("floor-3f-foyer", "Third floor foyer pillar", "Third floor · Fleming & exhibition foyer", "column", floor3fFoyer, {
    x: 0.401,
    y: 0.0195,
    w: 0.1992,
    h: 0.8379,
  }, "w", "top", "edge", ["3F"]),
  scene("floor-4f-suite", "Fourth floor suite wall", "Fourth floor · meeting suites", "portrait", floor4fSuite, {
    x: 0.4323,
    y: 0.2773,
    w: 0.1094,
    h: 0.2793,
  }, "w", "center", "edge", ["4F"]),
  scene("floor-5f-stair-glass", "Fifth floor stair glazing", "Fifth floor · Windsor, Cambridge & stair glass", "wall", floor5fStairGlass, {
    x: 0.4102,
    y: 0.2695,
    w: 0.3815,
    h: 0.2871,
  }, "w", "center", "edge", ["5F"]),
  scene("floor-6f-set", "Mountbatten set wrap", "Sixth floor · Mountbatten", "wall", floor6fSet, {
    x: 0.1615,
    y: 0.1953,
    w: 0.6771,
    h: 0.4004,
  }, "w", "center", "edge", ["6F"]),

  // ── Reference event photographs ──────────────────────────────────────────
  // Real NEXT event photography supplied with the template pack. The face
  // rectangles were measured off the photographs themselves, so artwork lands
  // on the actual printed pillar side and the actual scenic stage wall.
  { ...scene("ref-foyer-pillar", "NEXT pillar in an exhibition foyer", "Exhibition foyer · four-sided pillar", "column", refFoyerPillar, {
    x: 0.795,
    y: 0.157,
    w: 0.082,
    h: 0.73,
  }, "w", "center", "cover"), photo: true,
    // Measured off the supplied pillar drawing: 550 mm faces, 2500 mm high.
    surface: { wMm: 550, hMm: 2500, note: "Four-sided pillar face, supplied drawing" } },
  { ...scene("ref-plenary-stage", "NEXT scenic stage wall", "Plenary stage · scenic back wall", "wall", refPlenaryStage, {
    x: 0.045,
    y: 0.045,
    w: 0.86,
    h: 0.545,
  }, "w", "center", "edge"), photo: true },
  // Meeting-room door pair, photographed square on: applied vinyl covers the
  // two door leaves, so the print is measured to the leaves themselves.
  { ...scene("ref-room-doors", "Breakout room door pair", "Breakout room entrance · double doors", "door", refRoomDoors, {
    x: 0.3,
    y: 0.215,
    w: 0.325,
    h: 0.615,
  }, "w", "center", "cover"), photo: true },
  // Long foyer wall run beside the plenary entrance.
  { ...scene("ref-foyer-wall-run", "Foyer wall run", "Exhibition foyer · long wall run", "wide", refFoyerWallRun, {
    x: 0.025,
    y: 0.09,
    w: 0.79,
    h: 0.845,
  }, "w", "center", "edge"), photo: true },
  // Freestanding press / merch wall with a dressed table in front of it.
  { ...scene("ref-press-wall", "Press & merch wall", "Foyer · freestanding press wall", "wall", refPressWall, {
    x: 0.19,
    y: 0.05,
    w: 0.67,
    h: 0.73,
  }, "w", "center", "edge"), photo: true },
  // QEII Centre entrance canopy: the banner face above the lit lettering.
  { ...scene("ref-exterior-canopy", "Entrance canopy banner", "Exterior · QEII Centre canopy", "exterior", refExteriorCanopy, {
    x: 0.1,
    y: 0.465,
    w: 0.805,
    h: 0.14,
  }, "w", "center", "cover"), photo: true },
  // Bare 6800 x 4030 mm scenic wall build, photographed before artwork.
  { ...scene("ref-scenic-wall-blank", "Scenic wall build", "Scenic build · bare panel wall", "wall", refScenicWallBlank, {
    x: 0.035,
    y: 0.07,
    w: 0.91,
    h: 0.855,
  }, "w", "center", "edge"), photo: true,
    surface: { wMm: 6800, hMm: 4030, note: "Measured scenic build, supplied reference" } },
];



export function londonScene(id: string): LondonScene | undefined {
  return LONDON_SCENES.find((s) => s.id === id);
}

/** The floor-specific plates for a floor (empty when a floor has none). */
export function scenesForFloor(floor: LondonFloorId): LondonScene[] {
  return LONDON_SCENES.filter((s) => s.floors?.includes(floor));
}

/** True when this plate is one of the floor spaces, not a generic surface. */
export function isFloorScene(scene: LondonScene): boolean {
  return !!scene.floors?.length;
}


/** Surfaces that only make sense for their own kind of install. */
const SPECIALISED_KINDS: SceneKind[] = ["floor", "lift", "glass", "table"];

/** Keyword hints from the panel name/ground, strongest signal first. */
function hintedKinds(panel: LondonPanel): SceneKind[] {
  // Only the item name and ground read as surface words. The style id is a
  // gradient/pattern code ("12-repeat-wash") and must not hint a surface.
  const t = `${panel.name} ${panel.ground}`.toLowerCase();
  const out: SceneKind[] = [];
  const push = (k: SceneKind) => {
    if (!out.includes(k)) out.push(k);
  };
  if (/floor (graphic|vinyl|sticker|decal|tile)|floor-?graphic/.test(t)) push("floor");
  if (/lift|elevator/.test(t)) push("lift");
  if (/glass|glazing|balustrade|stair/.test(t)) push("glass");
  if (/table ?top|tabletop|bistro|poseur|cafe table/.test(t)) push("table");
  if (/step\s*(&|and|-)?\s*repeat|press wall|photo (wall|point|call)/.test(t)) push("wall");
  if (/door|vinyl/.test(t)) push("door");
  if (/stage|fascia|plenar|podium|lectern/.test(t)) push("fascia");
  if (/desk|registration|check-?in|counter/.test(t)) push("desk");
  if (/coffee|catering|bar|refresh/.test(t)) push("counter");
  if (/exterior|entrance|street|facade|outside/.test(t)) push("exterior");
  if (/column|pillar|totem|tower/.test(t)) push("column");
  if (/banner|hang|drop/.test(t)) push("portrait");
  return out;
}

/**
 * Scenes ranked for a panel: keyword match first, then closeness of the
 * measured face aspect to the panel's trim aspect. Every scene stays
 * selectable so a user can preview an item anywhere on site.
 */
export function scenesForPanel(panel: LondonPanel): LondonScene[] {
  const ratio = panel.trimW / panel.trimH;
  const hints = hintedKinds(panel);
  return [...LONDON_SCENES]
    .map((s) => {
      // A door/vinyl keyword only wins if the item can actually skin that
      // surface; a square artwork on a tall leaf is not a door vinyl scene.
      const coverable =
        s.mount !== "cover" ||
        canCoverFace({ face: s.face, plate: s.plate, ratio });
      const hint = coverable ? hints.indexOf(s.kind) : -1;
      const orientation =
        (ratio >= 1) === (s.faceRatio >= 1) ? 0 : 1.5;
      const fit = Math.abs(Math.log(s.faceRatio / ratio));
      // A plate of the floor the item is actually scheduled on wins ties, so
      // the first view a user sees is the space the item installs in.
      // The floor bonus only applies when the plate is not the wrong kind of
      // surface: a floor graphic must not win a stage wall just because both
      // sit on the ground floor.
      const kindOk = hints.length === 0 || hint >= 0;
      const onFloor = kindOk && s.floors?.includes(panel.floor) ? -0.75 : 0;
      const wrongFloor = s.floors && !s.floors.includes(panel.floor) ? 1.5 : 0;
      // Purpose-built surfaces (floor, lift, glass, table) are only offered
      // first when the item is actually that kind of install.
      const specialised =
        hint < 0 && SPECIALISED_KINDS.includes(s.kind) ? 3 : 0;
      // Between two plates of the same surface, the one with delegates on site
      // reads as the install in use, so it leads.
      const liveBonus = s.live && (kindOk ? hint >= 0 || hints.length === 0 : false) ? -0.35 : 0;
      return {
        s,
        score:
          (hint >= 0 ? hint * 0.15 : 3) +
          orientation +
          fit +
          onFloor +
          wrongFloor +
          liveBonus +
          specialised,
      };


    })
    .sort((a, b) => a.score - b.score)
    .map((r) => r.s);
}

export function defaultSceneForPanel(panel: LondonPanel): LondonScene {
  return scenesForPanel(panel)[0]!;
}

/**
 * Artwork box for a panel on a scene: the print fills the surface edge that
 * physically fixes its size (a column's width, a fascia's height), keeps the
 * item's true trim ratio, and never runs off the plate. Fractions of the
 * rendered plate.
 */
export function fitArtworkInFace(
  panel: LondonPanel,
  sceneOrId: LondonScene | string,
): SceneFace {
  const sc = typeof sceneOrId === "string" ? londonScene(sceneOrId) : sceneOrId;
  return mountArtworkOnFace({
    face: sc?.face ?? { x: 0, y: 0, w: 1, h: 1 },
    plate: sc?.plate ?? { w: 1536, h: 1024 },
    ratio: panel.trimW / panel.trimH,
    fixed: sc?.fixed ?? "w",
    anchorY: sc?.anchorY ?? "center",
    mode: sc?.mount ?? "edge",
  });
}

/**
 * How the artwork image should sit inside the measured box: an applied vinyl
 * cover-crops to its surface, everything else fills a box already cut to the
 * item's true trim ratio. Never "stretch".
 */
export function sceneArtworkObjectFit(
  panel: LondonPanel,
  sceneOrId: LondonScene | string,
): "cover" | "contain" {
  const sc = typeof sceneOrId === "string" ? londonScene(sceneOrId) : sceneOrId;
  if (!sc) return "contain";
  return sc.mount === "cover" &&
    canCoverFace({ face: sc.face, plate: sc.plate, ratio: panel.trimW / panel.trimH })
    ? "cover"
    : "contain";
}
