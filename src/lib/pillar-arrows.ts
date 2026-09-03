// Approved directional arrow styles for NEXT pillar signage.
//
// Every style is expressed as filled polygons on a 100 × 100 grid pointing
// right, so the live sign (SVG) and the layered press PDF (pdf-lib polygons)
// draw byte-for-byte identical geometry. Filled paths only — no strokes — so
// nothing changes weight when a printer scales the file.

export type PillarArrowStyleId =
  | "solid"
  | "slim"
  | "triangle"
  | "chevron"
  | "double-chevron"
  | "bar";

export type PillarArrowStyle = {
  id: PillarArrowStyleId;
  label: string;
  note: string;
  /** Filled polygons in a 100 × 100 box, pointing right. */
  polys: [number, number][][];
};

export const PILLAR_ARROW_STYLES: PillarArrowStyle[] = [
  {
    id: "solid",
    label: "Solid block",
    note: "The issued NEXT wayfinding arrow. Heaviest read at distance.",
    polys: [
      [
        [8, 42],
        [62, 42],
        [62, 22],
        [94, 50],
        [62, 78],
        [62, 58],
        [8, 58],
      ],
    ],
  },
  {
    id: "slim",
    label: "Slim shaft",
    note: "Lighter shaft with a full head. Pairs with long destination copy.",
    polys: [
      [
        [6, 46],
        [64, 46],
        [64, 30],
        [94, 50],
        [64, 70],
        [64, 54],
        [6, 54],
      ],
    ],
  },
  {
    id: "triangle",
    label: "Triangle",
    note: "Head only. Cleanest option for tight columns and repeats.",
    polys: [
      [
        [16, 14],
        [92, 50],
        [16, 86],
      ],
    ],
  },
  {
    id: "chevron",
    label: "Chevron",
    note: "Single open chevron. Quietest of the set for premium spaces.",
    polys: [
      [
        [26, 10],
        [72, 50],
        [26, 90],
        [6, 90],
        [52, 50],
        [6, 10],
      ],
    ],
  },
  {
    id: "double-chevron",
    label: "Double chevron",
    note: "Two chevrons for long runs — reads as continue this way.",
    polys: [
      [
        [54, 14],
        [92, 50],
        [54, 86],
        [38, 86],
        [76, 50],
        [38, 14],
      ],
      [
        [22, 14],
        [60, 50],
        [22, 86],
        [6, 86],
        [44, 50],
        [6, 14],
      ],
    ],
  },
  {
    id: "bar",
    label: "Head on bar",
    note: "Arrow head over a rule. Used where the arrow sits above a doorway.",
    polys: [
      [
        [36, 18],
        [86, 50],
        [36, 82],
      ],
      [
        [8, 44],
        [44, 44],
        [44, 56],
        [8, 56],
      ],
    ],
  },
];

export function pillarArrowStyle(id: string | undefined): PillarArrowStyle {
  return PILLAR_ARROW_STYLES.find((s) => s.id === id) ?? PILLAR_ARROW_STYLES[0]!;
}

/** SVG path data for a style, for the live sign. */
export function pillarArrowPath(id: string | undefined): string {
  return pillarArrowStyle(id)
    .polys.map(
      (poly) => `${poly.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ")} Z`,
    )
    .join(" ");
}
