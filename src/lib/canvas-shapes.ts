// -----------------------------------------------------------------------------
// Canvas shape inventory
// -----------------------------------------------------------------------------
// "Insert shape" used to mean one rounded rectangle. Designers expect what
// Figma / Canva / Illustrator give them: a browsable inventory of primitives,
// arrows, callouts and decorative marks that drop in already sized and already
// toned to the deck's accent.
//
// Every shape is authored as a single SVG path inside a 100x100 viewBox, so it
// scales without hinting, tints from one colour token, and serialises to a data
// URL the canvas stores as an image block (which the PPTX/PDF/PNG pipelines all
// already carry losslessly as vector-sourced artwork).
// -----------------------------------------------------------------------------

export type ShapeStyle = "solid" | "outline";

export type ShapeGroup = "Basic" | "Geometric" | "Arrows" | "Callouts" | "Marks";

export type ShapeDef = {
  id: string;
  label: string;
  group: ShapeGroup;
  /** Path data in a 0 0 100 100 viewBox. */
  d: string;
  /** Natural aspect (w / h) used for the inserted block's default size. */
  aspect?: number;
  /** Shapes that only read as strokes (lines, brackets) force outline style. */
  strokeOnly?: boolean;
};

const poly = (pts: readonly [number, number][]) =>
  `M ${pts.map(([x, y]) => `${x} ${y}`).join(" L ")} Z`;

/** Regular n-gon inscribed in the viewBox, first vertex pointing up. */
const ngon = (n: number, rotate = -90): string => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i += 1) {
    const a = ((rotate + (360 / n) * i) * Math.PI) / 180;
    pts.push([50 + 49 * Math.cos(a), 50 + 49 * Math.sin(a)]);
  }
  return poly(pts);
};

/** Star with `n` points and a given inner radius ratio. */
const star = (n: number, inner: number): string => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i += 1) {
    const r = i % 2 === 0 ? 49 : 49 * inner;
    const a = ((-90 + (180 / n) * i) * Math.PI) / 180;
    pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
  }
  return poly(pts);
};

export const SHAPES: readonly ShapeDef[] = [
  // ---- Basic --------------------------------------------------------------
  { id: "rect", label: "Rectangle", group: "Basic", d: "M 2 2 H 98 V 98 H 2 Z", aspect: 16 / 9 },
  {
    id: "rounded",
    label: "Rounded",
    group: "Basic",
    d: "M 16 2 H 84 A 14 14 0 0 1 98 16 V 84 A 14 14 0 0 1 84 98 H 16 A 14 14 0 0 1 2 84 V 16 A 14 14 0 0 1 16 2 Z",
    aspect: 16 / 9,
  },
  { id: "square", label: "Square", group: "Basic", d: "M 6 6 H 94 V 94 H 6 Z", aspect: 1 },
  {
    id: "circle",
    label: "Circle",
    group: "Basic",
    d: "M 50 1 A 49 49 0 1 1 49.9 1 Z",
    aspect: 1,
  },
  {
    id: "pill",
    label: "Pill",
    group: "Basic",
    d: "M 26 12 H 74 A 38 38 0 0 1 74 88 H 26 A 38 38 0 0 1 26 12 Z",
    aspect: 3,
  },
  {
    id: "ring",
    label: "Ring",
    group: "Basic",
    d: "M 50 1 A 49 49 0 1 1 49.9 1 Z M 50 26 A 24 24 0 1 0 50.1 26 Z",
    aspect: 1,
  },
  { id: "triangle", label: "Triangle", group: "Basic", d: ngon(3), aspect: 1 },
  {
    id: "triangle-right",
    label: "Right triangle",
    group: "Basic",
    d: poly([
      [4, 96],
      [4, 4],
      [96, 96],
    ]),
    aspect: 1,
  },
  { id: "diamond", label: "Diamond", group: "Basic", d: ngon(4), aspect: 1 },
  {
    id: "parallelogram",
    label: "Parallelogram",
    group: "Basic",
    d: poly([
      [22, 12],
      [98, 12],
      [78, 88],
      [2, 88],
    ]),
    aspect: 2,
  },
  {
    id: "trapezoid",
    label: "Trapezoid",
    group: "Basic",
    d: poly([
      [24, 14],
      [76, 14],
      [98, 86],
      [2, 86],
    ]),
    aspect: 2,
  },

  // ---- Geometric ----------------------------------------------------------
  { id: "pentagon", label: "Pentagon", group: "Geometric", d: ngon(5), aspect: 1 },
  { id: "hexagon", label: "Hexagon", group: "Geometric", d: ngon(6, 0), aspect: 1.15 },
  { id: "hexagon-v", label: "Hexagon (tall)", group: "Geometric", d: ngon(6), aspect: 0.87 },
  { id: "heptagon", label: "Heptagon", group: "Geometric", d: ngon(7), aspect: 1 },
  { id: "octagon", label: "Octagon", group: "Geometric", d: ngon(8, -67.5), aspect: 1 },
  { id: "dodecagon", label: "Dodecagon", group: "Geometric", d: ngon(12, -75), aspect: 1 },
  {
    id: "semicircle",
    label: "Semicircle",
    group: "Geometric",
    d: "M 1 72 A 49 49 0 0 1 99 72 Z",
    aspect: 2,
  },
  {
    id: "quarter",
    label: "Quarter round",
    group: "Geometric",
    d: "M 4 96 V 4 A 92 92 0 0 1 96 96 Z",
    aspect: 1,
  },
  {
    id: "arch",
    label: "Arch",
    group: "Geometric",
    d: "M 10 98 V 44 A 40 40 0 0 1 90 44 V 98 Z",
    aspect: 0.8,
  },
  {
    id: "lens",
    label: "Lens",
    group: "Geometric",
    d: "M 50 4 A 60 60 0 0 1 50 96 A 60 60 0 0 1 50 4 Z",
    aspect: 0.8,
  },
  {
    id: "squircle",
    label: "Squircle",
    group: "Geometric",
    d: "M 50 2 C 84 2 98 16 98 50 C 98 84 84 98 50 98 C 16 98 2 84 2 50 C 2 16 16 2 50 2 Z",
    aspect: 1,
  },
  {
    id: "cross",
    label: "Cross",
    group: "Geometric",
    d: poly([
      [36, 4],
      [64, 4],
      [64, 36],
      [96, 36],
      [96, 64],
      [64, 64],
      [64, 96],
      [36, 96],
      [36, 64],
      [4, 64],
      [4, 36],
      [36, 36],
    ]),
    aspect: 1,
  },
  {
    id: "chevron-block",
    label: "Chevron block",
    group: "Geometric",
    d: poly([
      [2, 14],
      [72, 14],
      [98, 50],
      [72, 86],
      [2, 86],
      [28, 50],
    ]),
    aspect: 2.2,
  },
  {
    id: "step",
    label: "Step",
    group: "Geometric",
    d: poly([
      [2, 60],
      [36, 60],
      [36, 34],
      [70, 34],
      [70, 8],
      [98, 8],
      [98, 92],
      [2, 92],
    ]),
    aspect: 1.6,
  },
  {
    id: "cylinder",
    label: "Cylinder",
    group: "Geometric",
    d: "M 14 22 A 36 14 0 0 1 86 22 V 78 A 36 14 0 0 1 14 78 Z M 14 22 A 36 14 0 0 0 86 22",
    aspect: 0.9,
  },

  // ---- Arrows -------------------------------------------------------------
  {
    id: "arrow-right",
    label: "Arrow right",
    group: "Arrows",
    d: poly([
      [2, 34],
      [60, 34],
      [60, 10],
      [98, 50],
      [60, 90],
      [60, 66],
      [2, 66],
    ]),
    aspect: 2.4,
  },
  {
    id: "arrow-left",
    label: "Arrow left",
    group: "Arrows",
    d: poly([
      [98, 34],
      [40, 34],
      [40, 10],
      [2, 50],
      [40, 90],
      [40, 66],
      [98, 66],
    ]),
    aspect: 2.4,
  },
  {
    id: "arrow-up",
    label: "Arrow up",
    group: "Arrows",
    d: poly([
      [34, 98],
      [34, 40],
      [10, 40],
      [50, 2],
      [90, 40],
      [66, 40],
      [66, 98],
    ]),
    aspect: 0.6,
  },
  {
    id: "arrow-both",
    label: "Double arrow",
    group: "Arrows",
    d: poly([
      [2, 50],
      [26, 12],
      [26, 34],
      [74, 34],
      [74, 12],
      [98, 50],
      [74, 88],
      [74, 66],
      [26, 66],
      [26, 88],
    ]),
    aspect: 2.6,
  },
  {
    id: "arrow-bend",
    label: "Bent arrow",
    group: "Arrows",
    d: poly([
      [8, 96],
      [8, 34],
      [62, 34],
      [62, 12],
      [96, 50],
      [62, 88],
      [62, 66],
      [34, 66],
      [34, 96],
    ]),
    aspect: 1.4,
  },
  {
    id: "arrow-slim",
    label: "Slim arrow",
    group: "Arrows",
    strokeOnly: true,
    d: "M 4 50 H 88 M 68 30 L 92 50 L 68 70",
    aspect: 2.6,
  },
  {
    id: "chevron-thin",
    label: "Chevron",
    group: "Arrows",
    strokeOnly: true,
    d: "M 32 10 L 72 50 L 32 90",
    aspect: 0.7,
  },
  {
    id: "arc-arrow",
    label: "Arc arrow",
    group: "Arrows",
    strokeOnly: true,
    d: "M 8 82 A 46 46 0 0 1 90 54 M 90 54 L 74 40 M 90 54 L 70 62",
    aspect: 1.3,
  },
  {
    id: "pointer",
    label: "Ribbon pointer",
    group: "Arrows",
    d: poly([
      [2, 16],
      [78, 16],
      [98, 50],
      [78, 84],
      [2, 84],
    ]),
    aspect: 2.6,
  },

  // ---- Callouts -----------------------------------------------------------
  {
    id: "bubble",
    label: "Speech bubble",
    group: "Callouts",
    d: "M 12 8 H 88 A 10 10 0 0 1 98 18 V 62 A 10 10 0 0 1 88 72 H 40 L 20 96 V 72 H 12 A 10 10 0 0 1 2 62 V 18 A 10 10 0 0 1 12 8 Z",
    aspect: 1.5,
  },
  {
    id: "bubble-round",
    label: "Round bubble",
    group: "Callouts",
    d: "M 50 6 A 44 36 0 1 1 34 74 L 14 94 L 20 70 A 44 36 0 0 1 50 6 Z",
    aspect: 1.2,
  },
  {
    id: "tag",
    label: "Tag",
    group: "Callouts",
    d: "M 2 50 L 26 14 H 96 V 86 H 26 Z",
    aspect: 2.4,
  },
  {
    id: "banner",
    label: "Banner",
    group: "Callouts",
    d: poly([
      [2, 18],
      [98, 18],
      [98, 82],
      [2, 82],
      [18, 50],
    ]),
    aspect: 3,
  },
  {
    id: "ribbon",
    label: "Ribbon",
    group: "Callouts",
    d: poly([
      [10, 12],
      [90, 12],
      [90, 74],
      [50, 96],
      [10, 74],
    ]),
    aspect: 0.9,
  },
  {
    id: "plate",
    label: "Note plate",
    group: "Callouts",
    d: "M 4 4 H 76 L 96 26 V 96 H 4 Z",
    aspect: 1.3,
  },
  {
    id: "bracket-l",
    label: "Bracket",
    group: "Callouts",
    strokeOnly: true,
    d: "M 66 6 A 30 30 0 0 0 36 36 V 42 A 8 8 0 0 1 28 50 A 8 8 0 0 1 36 58 V 64 A 30 30 0 0 0 66 94",
    aspect: 0.5,
  },

  // ---- Marks --------------------------------------------------------------
  { id: "star5", label: "Star", group: "Marks", d: star(5, 0.45), aspect: 1 },
  { id: "star6", label: "Six-point star", group: "Marks", d: star(6, 0.55), aspect: 1 },
  { id: "burst12", label: "Burst", group: "Marks", d: star(12, 0.74), aspect: 1 },
  { id: "sparkle", label: "Sparkle", group: "Marks", d: star(4, 0.24), aspect: 1 },
  {
    id: "heart",
    label: "Heart",
    group: "Marks",
    d: "M 50 92 C 18 68 4 52 4 34 A 26 26 0 0 1 50 20 A 26 26 0 0 1 96 34 C 96 52 82 68 50 92 Z",
    aspect: 1,
  },
  {
    id: "shield",
    label: "Shield",
    group: "Marks",
    d: "M 50 4 L 92 18 V 52 C 92 76 72 90 50 96 C 28 90 8 76 8 52 V 18 Z",
    aspect: 0.9,
  },
  {
    id: "blob",
    label: "Blob",
    group: "Marks",
    d: "M 62 6 C 84 10 98 28 94 50 C 90 74 76 96 52 96 C 28 96 6 80 4 56 C 2 32 20 8 44 5 Z",
    aspect: 1,
  },
  {
    id: "drop",
    label: "Drop",
    group: "Marks",
    d: "M 50 2 C 74 34 90 50 90 66 A 40 40 0 0 1 10 66 C 10 50 26 34 50 2 Z",
    aspect: 0.85,
  },
  {
    id: "rule",
    label: "Rule",
    group: "Marks",
    strokeOnly: true,
    d: "M 2 50 H 98",
    aspect: 8,
  },
  {
    id: "zigzag",
    label: "Zigzag",
    group: "Marks",
    strokeOnly: true,
    d: "M 2 70 L 26 30 L 50 70 L 74 30 L 98 70",
    aspect: 4,
  },
  {
    id: "wave",
    label: "Wave",
    group: "Marks",
    strokeOnly: true,
    d: "M 2 56 C 18 22 32 22 50 56 C 68 90 82 90 98 56",
    aspect: 4,
  },
  {
    id: "grid-dots",
    label: "Dot field",
    group: "Marks",
    d: [10, 30, 50, 70, 90]
      .flatMap((y) => [10, 30, 50, 70, 90].map((x) => `M ${x} ${y} m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0`))
      .join(" "),
    aspect: 1,
  },
  {
    id: "target",
    label: "Target",
    group: "Marks",
    strokeOnly: true,
    d: "M 50 6 A 44 44 0 1 1 49.9 6 Z M 50 26 A 24 24 0 1 1 49.9 26 Z M 50 46 A 4 4 0 1 1 49.9 46 Z",
    aspect: 1,
  },
];

export const SHAPE_GROUPS: readonly ShapeGroup[] = [
  "Basic",
  "Geometric",
  "Arrows",
  "Callouts",
  "Marks",
];

/** Standalone SVG markup for a shape, toned to one colour. */
export function shapeSvg(
  shape: ShapeDef,
  color: string,
  style: ShapeStyle = "solid",
  strokeWidth = 6,
): string {
  const outline = style === "outline" || shape.strokeOnly;
  const paint = outline
    ? `fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"`
    : `fill="${color}" fill-rule="evenodd"`;
  // Intrinsic size carries the shape's natural aspect so an <img fit="contain">
  // frame letterboxes nothing: the artwork fills the block exactly as placed.
  const w = Math.round(100 * (shape.aspect ?? 1));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="100" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${shape.d}" ${paint}/></svg>`;
}

/** Data URL for a shape — what the canvas stores on an image block. */
export function shapeDataUrl(
  shape: ShapeDef,
  color: string,
  style: ShapeStyle = "solid",
  strokeWidth = 6,
): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(shapeSvg(shape, color, style, strokeWidth))}`;
}
