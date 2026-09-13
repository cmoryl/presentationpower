// In-situ location scenes for the NEXT MART shop build.
//
// Each plate is a photoreal merchandise-shop environment with one measured
// installation face. The face rectangle was read from a chroma-key plate (pure
// magenta placement area) and the magenta then neutralised, so a live mart
// master composites into the exact measured face at its own trim ratio.
//
// These are photoreal *visualisations* of the kind of space each mart sign
// installs into — they are not photographs of the venue. Every surface that
// shows them must label them as visualisations.

import entrancePillar from "@/assets/mart-scenes/mart-entrance-pillar.jpg";
import floorDecal from "@/assets/mart-scenes/mart-floor-decal.jpg";
import hangingBanner from "@/assets/mart-scenes/mart-hanging-banner.jpg";
import queuePanel from "@/assets/mart-scenes/mart-queue-panel.jpg";
import railPanel from "@/assets/mart-scenes/mart-rail-panel.jpg";
import tillFront from "@/assets/mart-scenes/mart-till-front.jpg";
import wallPanel from "@/assets/mart-scenes/mart-wall-panel.jpg";

/** Fractional face rectangle on the plate (0..1 of plate width/height). */
export interface MartSceneFace {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type MartSceneKind =
  | "pillar"
  | "wall"
  | "overhead"
  | "rail"
  | "stanchion"
  | "counter"
  | "floor";

export interface MartScene {
  id: string;
  label: string;
  /** Where in the mart footprint this install sits. */
  where: string;
  kind: MartSceneKind;
  src: string;
  plate: { w: number; h: number };
  face: MartSceneFace;
  /** Aspect (w/h) of the measured face — used to rank scene fit. */
  faceRatio: number;
  /** The surface edge that physically fixes the print size. */
  fixed: SceneFixedAxis;
  /** Where on the free axis the print sits. */
  anchorY: "top" | "center" | "bottom";
}

import { mountArtworkOnFace, type SceneFixedAxis } from "@/lib/scene-face-fit";

const PLATE = { w: 1536, h: 1024 };

function scene(
  id: string,
  label: string,
  where: string,
  kind: MartSceneKind,
  src: string,
  face: MartSceneFace,
  fixed: SceneFixedAxis = "w",
  anchorY: "top" | "center" | "bottom" = "center",
): MartScene {
  return {
    id,
    label,
    where,
    kind,
    src,
    plate: PLATE,
    face,
    faceRatio: (face.w * PLATE.w) / (face.h * PLATE.h),
    fixed,
    anchorY,
  };
}

export const MART_SCENES: MartScene[] = [
  scene(
    "entrance-pillar",
    "Entrance tower pillar",
    "Mart threshold, shop left",
    "pillar",
    entrancePillar,
    {
      x: 0.14,
      y: 0.0771,
      w: 0.179,
      h: 0.7783,
    },
    "w",
    "top",
  ),
  scene(
    "wall-panel",
    "Shop back wall",
    "Behind the merch rails",
    "wall",
    wallPanel,
    {
      x: 0.1934,
      y: 0.0703,
      w: 0.6387,
      h: 0.5068,
    },
    "w",
    "center",
  ),
  scene(
    "hanging-banner",
    "Overhead hanging banner",
    "Rigged to truss above the mart",
    "overhead",
    hangingBanner,
    {
      x: 0.0208,
      y: 0.2783,
      w: 0.9538,
      h: 0.2646,
    },
    "w",
    "top",
  ),
  scene(
    "rail-panel",
    "Category rail panel",
    "Clipped above a merch rail",
    "rail",
    railPanel,
    {
      x: 0.2546,
      y: 0.1768,
      w: 0.4954,
      h: 0.3047,
    },
    "w",
    "center",
  ),
  scene(
    "queue-panel",
    "Queue stanchion panel",
    "Till bank queue line",
    "stanchion",
    queuePanel,
    {
      x: 0.4935,
      y: 0.2646,
      w: 0.3743,
      h: 0.4033,
    },
    "w",
    "center",
  ),
  scene(
    "till-front",
    "Till counter front",
    "Cash desk fascia",
    "counter",
    tillFront,
    {
      x: 0.0527,
      y: 0.333,
      w: 0.8919,
      h: 0.4727,
    },
    "h",
    "center",
  ),
  scene(
    "floor-decal",
    "Floor approach decal",
    "Last 6 m of approach",
    "floor",
    floorDecal,
    {
      x: 0.2018,
      y: 0.3145,
      w: 0.5898,
      h: 0.5283,
    },
    "w",
    "center",
  ),
];

export function martScene(id: string): MartScene | undefined {
  return MART_SCENES.find((s) => s.id === id);
}

/** A mart sign expressed for scene matching — pillar or flat, same shape. */
export interface MartSceneSubject {
  id: string;
  name: string;
  trimW: number;
  trimH: number;
}

/** Keyword hints from the sign name/id, strongest signal first. */
function hintedKinds(subject: MartSceneSubject): MartSceneKind[] {
  const t = `${subject.id} ${subject.name}`.toLowerCase();
  const out: MartSceneKind[] = [];
  const push = (k: MartSceneKind) => {
    if (!out.includes(k)) out.push(k);
  };
  if (/floor|decal|ground/.test(t)) push("floor");
  if (/queue|stanchion/.test(t)) push("stanchion");
  if (/till|counter|cash|pay/.test(t)) push("counter");
  if (/category|rail|zone/.test(t)) push("rail");
  if (/hang|banner|overhead|truss/.test(t)) push("overhead");
  if (/wall|panel|back/.test(t)) push("wall");
  if (/pillar|tower|entrance|column|wayfind|logo/.test(t)) push("pillar");
  return out;
}

/**
 * Scenes ranked for a sign: keyword match first, then how close the measured
 * face aspect is to the sign's trim aspect. Every scene stays selectable so a
 * user can preview any piece anywhere in the shop.
 */
export function scenesForMartSign(subject: MartSceneSubject): MartScene[] {
  const ratio = subject.trimH > 0 ? subject.trimW / subject.trimH : 1;
  const hints = hintedKinds(subject);
  return [...MART_SCENES]
    .map((s) => {
      const hint = hints.indexOf(s.kind);
      const orientation = ratio >= 1 === s.faceRatio >= 1 ? 0 : 1.5;
      const fit = Math.abs(Math.log(s.faceRatio / ratio));
      return { s, score: (hint >= 0 ? hint * 0.15 : 3) + orientation + fit };
    })
    .sort((a, b) => a.score - b.score)
    .map((r) => r.s);
}

export function defaultSceneForMartSign(subject: MartSceneSubject): MartScene {
  return scenesForMartSign(subject)[0]!;
}

/**
 * Artwork box for a sign on a scene: the print fills the surface edge that
 * physically fixes its size, keeps the sign's true trim ratio, and stays on
 * the plate. Fractions of the plate.
 */
export function fitMartArtworkInFace(
  subject: MartSceneSubject,
  sceneOrId: MartScene | string,
): MartSceneFace {
  const sc = typeof sceneOrId === "string" ? martScene(sceneOrId) : sceneOrId;
  return mountArtworkOnFace({
    face: sc?.face ?? { x: 0, y: 0, w: 1, h: 1 },
    plate: sc?.plate ?? PLATE,
    ratio: subject.trimH > 0 ? subject.trimW / subject.trimH : 1,
    fixed: sc?.fixed ?? "w",
    anchorY: sc?.anchorY ?? "center",
  });
}
