// In-situ location scenes for the NEXT 2026 London kit.
//
// Each scene is a photographic conference-centre plate with one measured
// installation face. The face rectangle was read from a chroma-key plate
// (pure magenta placement area) and the magenta then neutralised, so panel
// artwork can be composited into the exact measured face.
//
// These plates are photoreal *visualisations* of the type of space each item
// hangs in — they are not photographs of the Queen Elizabeth II Centre. Every
// surface that shows them must label them as visualisations.

import coffeeBar from "@/assets/london-scenes/coffee-bar.jpg";
import deskFront from "@/assets/london-scenes/desk-front.jpg";
import doorVinyl from "@/assets/london-scenes/door-vinyl.jpg";
import exteriorBanner from "@/assets/london-scenes/exterior-banner.jpg";
import foyerColumn from "@/assets/london-scenes/foyer-column.jpg";
import portraitBanner from "@/assets/london-scenes/portrait-banner.jpg";
import squarePanel from "@/assets/london-scenes/square-panel.jpg";
import stageFascia from "@/assets/london-scenes/stage-fascia.jpg";
import stepRepeat from "@/assets/london-scenes/step-repeat.jpg";
import wideBanner from "@/assets/london-scenes/wide-banner.jpg";

import type { LondonPanel } from "@/lib/next-london-signage";

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
}

function scene(
  id: string,
  label: string,
  where: string,
  kind: SceneKind,
  src: string,
  face: SceneFace,
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
  };
}

export const LONDON_SCENES: LondonScene[] = [
  scene("foyer-column", "Foyer light column", "Ground floor foyer", "column", foyerColumn, {
    x: 0.4121,
    y: 0.1504,
    w: 0.14,
    h: 0.7871,
  }),
  scene("portrait-banner", "Hanging portrait banner", "Atrium / stairwell", "portrait", portraitBanner, {
    x: 0.4831,
    y: 0.1074,
    w: 0.1764,
    h: 0.7305,
  }),
  scene("wide-banner", "Foyer wall run", "Circulation wall", "wide", wideBanner, {
    x: 0.166,
    y: 0.3828,
    w: 0.6725,
    h: 0.1816,
  }),
  scene("square-panel", "Breakout wall panel", "Breakout / lounge", "square", squarePanel, {
    x: 0.3431,
    y: 0.1289,
    w: 0.3034,
    h: 0.4512,
  }),
  scene("door-vinyl", "Room door vinyl", "Session room entrance", "door", doorVinyl, {
    x: 0.2845,
    y: 0.1289,
    w: 0.4316,
    h: 0.7764,
  }),
  scene("step-repeat", "Step-and-repeat wall", "Press / photo point", "wall", stepRepeat, {
    x: 0.1055,
    y: 0.1123,
    w: 0.8145,
    h: 0.7666,
  }),
  scene("stage-fascia", "Stage fascia", "Main plenary stage", "fascia", stageFascia, {
    x: 0.1315,
    y: 0.6055,
    w: 0.8268,
    h: 0.1699,
  }),
  scene("desk-front", "Registration desk front", "Registration", "desk", deskFront, {
    x: 0.0807,
    y: 0.4717,
    w: 0.8125,
    h: 0.3164,
  }),
  scene("coffee-bar", "Coffee bar back wall", "Catering / coffee bar", "counter", coffeeBar, {
    x: 0.0632,
    y: 0.4629,
    w: 0.8809,
    h: 0.3721,
  }),
  scene("exterior-banner", "Exterior entrance banner", "Street entrance", "exterior", exteriorBanner, {
    x: 0.2135,
    y: 0.1045,
    w: 0.1693,
    h: 0.6084,
  }),
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
      const hint = hints.indexOf(s.kind);
      const orientation =
        (ratio >= 1) === (s.faceRatio >= 1) ? 0 : 1.5;
      const fit = Math.abs(Math.log(s.faceRatio / ratio));
      return { s, score: (hint >= 0 ? hint * 0.15 : 3) + orientation + fit };
    })
    .sort((a, b) => a.score - b.score)
    .map((r) => r.s);
}

export function defaultSceneForPanel(panel: LondonPanel): LondonScene {
  return scenesForPanel(panel)[0]!;
}

/**
 * Artwork box inside a scene face: the panel's trim aspect fitted (contain)
 * into the measured face, so nothing is stretched. Values are fractions of
 * the rendered plate.
 */
export function fitArtworkInFace(
  panel: LondonPanel,
  sceneOrId: LondonScene | string,
): SceneFace {
  const sc = typeof sceneOrId === "string" ? londonScene(sceneOrId) : sceneOrId;
  const face = sc?.face ?? { x: 0, y: 0, w: 1, h: 1 };
  const plate = sc?.plate ?? { w: 1536, h: 1024 };
  const facePxW = face.w * plate.w;
  const facePxH = face.h * plate.h;
  const target = panel.trimW / panel.trimH;
  let w = facePxW;
  let h = w / target;
  if (h > facePxH) {
    h = facePxH;
    w = h * target;
  }
  return {
    x: face.x + (facePxW - w) / 2 / plate.w,
    y: face.y + (facePxH - h) / 2 / plate.h,
    w: w / plate.w,
    h: h / plate.h,
  };
}
