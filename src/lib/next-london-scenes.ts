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
import deskFront from "@/assets/london-scenes/desk-front.jpg";
import doorVinyl from "@/assets/london-scenes/door-vinyl.jpg";
import exteriorBanner from "@/assets/london-scenes/exterior-banner.jpg";
import floor2fBreakout from "@/assets/london-scenes/floor-2f-breakout.jpg";
import floor3fFoyer from "@/assets/london-scenes/floor-3f-foyer.jpg";
import floor4fSuite from "@/assets/london-scenes/floor-4f-suite.jpg";
import floor5fStairGlass from "@/assets/london-scenes/floor-5f-stair-glass.jpg";
import floor6fSet from "@/assets/london-scenes/floor-6f-set.jpg";
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
  | "exterior";

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
  /** Floors this plate actually represents, when it is a floor-specific space. */
  floors?: LondonFloorId[];
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
];


export function londonScene(id: string): LondonScene | undefined {
  return LONDON_SCENES.find((s) => s.id === id);
}

/** Keyword hints from the panel name/ground, strongest signal first. */
function hintedKinds(panel: LondonPanel): SceneKind[] {
  const t = `${panel.name} ${panel.ground} ${panel.style}`.toLowerCase();
  const out: SceneKind[] = [];
  const push = (k: SceneKind) => {
    if (!out.includes(k)) out.push(k);
  };
  if (/step|repeat|press|photo/.test(t)) push("wall");
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
      const onFloor = s.floors?.includes(panel.floor) ? -0.75 : 0;
      const wrongFloor = s.floors && !s.floors.includes(panel.floor) ? 1.5 : 0;
      return {
        s,
        score: (hint >= 0 ? hint * 0.15 : 3) + orientation + fit + onFloor + wrongFloor,
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
