// Live displays inside the London in-situ scene plates.
//
// Several plates are real event photographs or live visualisations that contain
// a working display — a plenary projection screen, a stage LED wall, a stand
// monitor. Left alone those screens show whatever ran at the shoot, which is
// another organisation's content sitting inside a TransPerfect NEXT render.
//
// Every one of those displays is measured here as a quad (its four corners as
// they appear in the plate, clockwise from top-left) so NEXT 2026 London screen
// content can be projected onto it with the plate's own perspective, then lit
// and graded like the rest of the scene.
//
// Measurements are read off each plate against a twentieth grid, exactly the
// way the printed faces in `next-london-scenes.ts` were read. They describe the
// photograph, never a print size — nothing here is a dimensional reference.

import { LONDON_STYLES } from "@/lib/next-london-signage";
import { quadBounds, type QuadRect, type SceneQuad } from "@/lib/scene-perspective";

/** What kind of display it physically is — this drives how it is rendered. */
export type LondonScreenKind = "projection" | "led-wall" | "monitor";

/** Which NEXT 2026 London holding frame the display is showing. */
export type LondonScreenContent = "title" | "session" | "agenda" | "loop";

export interface LondonSceneScreen {
  id: string;
  /** Plain label for the caption and the alt text. */
  label: string;
  kind: LondonScreenKind;
  /** Measured corners on the plate, clockwise from top-left. */
  quad: SceneQuad;
  content: LondonScreenContent;
  /** Approved ground treatment id from LONDON_STYLES. */
  styleId: string;
  /** Panel emission, 0–1. A projection screen is always dimmer than an LED. */
  brightness: number;
  /** How much of the display's own light spills onto the room around it, 0–1. */
  spill: number;
}

export const LONDON_SCREEN_KIND_LABELS: Record<LondonScreenKind, string> = {
  projection: "Projection screen",
  "led-wall": "LED wall",
  monitor: "Wall-mounted monitor",
};

/**
 * Every measured display in the scene library, keyed by scene id. A plate that
 * is not listed here simply has no display in shot.
 */
export const LONDON_SCENE_SCREENS: Record<string, LondonSceneScreen[]> = {
  // Plenary scenic wall, QEII photograph: the wide projection screen hung
  // centrally above the scenic build.
  "photo-plenary-fascia": [
    {
      id: "photo-plenary-fascia/projection",
      label: "Plenary projection screen",
      kind: "projection",
      quad: [
        { x: 0.306, y: 0.052 },
        { x: 0.716, y: 0.028 },
        { x: 0.716, y: 0.3 },
        { x: 0.306, y: 0.323 },
      ],
      content: "title",
      styleId: "07-prism-sweep",
      brightness: 0.82,
      spill: 0.22,
    },
  ],
  // Churchill auditorium: the centre screen above the curved stage front.
  "photo-churchill-stage": [
    {
      id: "photo-churchill-stage/centre",
      label: "Churchill centre screen",
      kind: "projection",
      quad: [
        { x: 0.434, y: 0.388 },
        { x: 0.561, y: 0.386 },
        { x: 0.561, y: 0.502 },
        { x: 0.434, y: 0.504 },
      ],
      content: "session",
      styleId: "01-beam-violet-aqua",
      brightness: 0.9,
      spill: 0.26,
    },
  ],
  // Scenic stage wall reference: the wall-mounted display over the set.
  "ref-plenary-stage": [
    {
      id: "ref-plenary-stage/monitor",
      label: "Stage repeater monitor",
      kind: "monitor",
      quad: [
        { x: 0.341, y: 0.163 },
        { x: 0.565, y: 0.14 },
        { x: 0.565, y: 0.395 },
        { x: 0.341, y: 0.425 },
      ],
      content: "title",
      styleId: "05-bloom-corner",
      brightness: 0.94,
      spill: 0.2,
    },
  ],
  // Expo zone stand: the landscape LED beside the stand back wall.
  "photo-exhibition-stand": [
    {
      id: "photo-exhibition-stand/led",
      label: "Stand LED display",
      kind: "led-wall",
      quad: [
        { x: 0.203, y: 0.36 },
        { x: 0.345, y: 0.372 },
        { x: 0.345, y: 0.505 },
        { x: 0.203, y: 0.51 },
      ],
      content: "loop",
      styleId: "03-wash-diagonal",
      brightness: 0.97,
      spill: 0.16,
    },
  ],
  // Plenary stage in session: the projection wall behind the panel set.
  "live-stage-fascia": [
    {
      id: "live-stage-fascia/projection",
      label: "Plenary projection wall",
      kind: "projection",
      quad: [
        { x: 0.47, y: 0.008 },
        { x: 0.999, y: 0.0 },
        { x: 0.999, y: 0.2 },
        { x: 0.47, y: 0.236 },
      ],
      content: "session",
      styleId: "04-horizon",
      brightness: 0.78,
      spill: 0.18,
    },
  ],
};

/** Measured displays in this plate, in draw order. */
export function sceneScreens(sceneId: string): LondonSceneScreen[] {
  return LONDON_SCENE_SCREENS[sceneId] ?? [];
}

/** True when the plate contains at least one working display. */
export function sceneHasScreen(sceneId: string): boolean {
  return sceneScreens(sceneId).length > 0;
}

/** Bounding rectangle the screen content is warped from. */
export function screenBounds(screen: LondonSceneScreen): QuadRect {
  return quadBounds(screen.quad);
}

/** Aspect (w/h) of the measured display box on the plate. */
export function screenAspect(screen: LondonSceneScreen, plate: { w: number; h: number }): number {
  const b = screenBounds(screen);
  const w = b.w * plate.w;
  const h = b.h * plate.h;
  return h > 0 ? w / h : 16 / 9;
}

/** Approved gradient stops for the frame this display is showing. */
export function screenStops(screen: LondonSceneScreen): string[] {
  const stops = LONDON_STYLES[screen.styleId]?.stops;
  return stops && stops.length > 0 ? stops : ["#03002C", "#003FC7", "#A1FBF9"];
}

/** One-line read for a caption: what the display is and what it is showing. */
export function screenCaption(screen: LondonSceneScreen): string {
  const frame: Record<LondonScreenContent, string> = {
    title: "NEXT 2026 title frame",
    session: "session frame",
    agenda: "agenda frame",
    loop: "brand loop",
  };
  return `${LONDON_SCREEN_KIND_LABELS[screen.kind]} · ${frame[screen.content]}`;
}
