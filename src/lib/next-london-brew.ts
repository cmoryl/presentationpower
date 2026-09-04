/**
 * NEXTbrew signage theming.
 *
 * The café panels used to carry floating vector doodles (a cup ring, three
 * steam curls, a bean row), which read as clip art sitting on top of a
 * gradient. They are gone. In their place the brew ground gets a *seamless*
 * geometric line field that runs edge to edge, over and through the gradient:
 * a fine diagonal rule lattice plus repeating scallop arcs — the rhythm of a
 * cup sleeve, a tiled counter front and an awning, which is the register the
 * high-street coffee brands work in.
 *
 * Every line is a live vector object in both masters (nothing rasterised,
 * nothing baked into the gradient), the pitch is derived from the panel's
 * short edge so a 700mm table top and a 2394mm fascia read the same at arm's
 * length, and each band uses whole periods clipped to the bleed sheet so the
 * pattern is continuous across the trim on every side.
 */

import type { LondonPanel } from "@/lib/next-london-signage";

/** One motif mark. Filled shapes use `fill`; line/arc strokes use `stroke`. */
export type BrewMark =
  | { kind: "ring"; cx: number; cy: number; r: number; width: number; alpha: number }
  | { kind: "path"; d: string; width: number; alpha: number }
  | { kind: "bean"; cx: number; cy: number; r: number; alpha: number };

export type BrewMotifPlan = {
  /** Ink for every mark — white knockout, or deep brand blue on light grounds. */
  ink: string;
  marks: BrewMark[];
};

/** Panels that carry the NEXTbrew treatment. */
export function isBrewPanel(panel: Pick<LondonPanel, "style" | "room">): boolean {
  return panel.style === "11-brew-diagonal" || /nextbrew/i.test(panel.room);
}

function f(n: number): string {
  return n.toFixed(2);
}

/**
 * Clip a long segment to the bleed rectangle (Liang–Barsky). Lattice lines are
 * generated well past the sheet so the pattern has no visible start or end;
 * this trims them to the artboard without changing their phase.
 */
function clipSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  h: number,
): [number, number, number, number] | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const edges: Array<[number, number]> = [
    [-dx, x1],
    [dx, w - x1],
    [-dy, y1],
    [dy, h - y1],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return null;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return null;
      if (r < t1) t1 = r;
    }
  }
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}

/** A run of parallel 45° rules at `pitch`, covering the whole sheet. */
function latticePaths(w: number, h: number, pitch: number, slope: 1 | -1): string[] {
  const span = w + h;
  const out: string[] = [];
  for (let c = -span; c <= span; c += pitch) {
    // y = slope * x + c, sampled far outside the sheet then clipped.
    const seg = clipSegment(-span, slope * -span + c, span, slope * span + c, w, h);
    if (!seg) continue;
    out.push(`M ${f(seg[0])} ${f(seg[1])} L ${f(seg[2])} ${f(seg[3])}`);
  }
  return out;
}

/**
 * A scallop band: half-circle arcs repeated across the full width, written as
 * cubic segments (the `.ai` writer takes M/L/C). `up` flips the bulge. The run
 * starts a whole period before the left edge so the rhythm continues off both
 * sides of the sheet.
 */
function scallopPath(w: number, y: number, r: number, up: boolean): string {
  const k = 0.5523 * r;
  const dir = up ? -1 : 1;
  const parts: string[] = [`M ${f(-2 * r)} ${f(y)}`];
  for (let x = -2 * r; x < w + 2 * r; x += 2 * r) {
    parts.push(
      `C ${f(x + k)} ${f(y + dir * k)} ${f(x + 2 * r - k)} ${f(y + dir * k)} ${f(x + 2 * r)} ${f(y)}`,
    );
  }
  return parts.join(" ");
}

/**
 * Motif for a brew panel. `light` flips the ink for the pale grounds so the
 * line field stays visible without shouting over the lockup.
 */
export function brewMotifPlan(panel: LondonPanel, light = false): BrewMotifPlan {
  const w = panel.bleedW;
  const h = panel.bleedH;
  const short = Math.min(w, h);

  const marks: BrewMark[] = [];

  // Diagonal rule lattice. The dominant direction is tight and quiet; the
  // counter direction is half as dense and fainter, so the field reads as a
  // woven sleeve texture rather than a grid.
  const pitch = Math.max(18, short * 0.075);
  const hair = Math.max(0.8, short * 0.0032);
  for (const d of latticePaths(w, h, pitch, 1)) {
    marks.push({ kind: "path", d, width: hair, alpha: 0.14 });
  }
  for (const d of latticePaths(w, h, pitch * 2, -1)) {
    marks.push({ kind: "path", d, width: hair, alpha: 0.07 });
  }

  // Scallop bands — awning / cup-sleeve arcs, whole periods, full width.
  const scallopR = Math.max(14, short * 0.11);
  for (const [ratio, alpha, up] of [
    [0.28, 0.1, true],
    [0.72, 0.16, false],
    [0.9, 0.09, false],
  ] as const) {
    marks.push({
      kind: "path",
      d: scallopPath(w, h * ratio, scallopR, up),
      width: Math.max(1.1, short * 0.0045),
      alpha,
    });
  }

  return { ink: light ? "#03002C" : "#FFFFFF", marks };
}

/** SVG layer for the motif. Painted between ground and copy. */
export function brewMotifSvgLayer(
  plan: BrewMotifPlan,
  paintFor: (hex: string) => { paint: string; meta: string },
): string {
  const { paint, meta } = paintFor(plan.ink);
  const body = plan.marks
    .map((m) => {
      if (m.kind === "ring") {
        return (
          `<circle cx="${f(m.cx)}" cy="${f(m.cy)}" r="${f(m.r)}" fill="none" stroke="${paint}"${meta}` +
          ` stroke-width="${f(m.width)}" opacity="${m.alpha}"/>`
        );
      }
      if (m.kind === "path") {
        return (
          `<path d="${m.d}" fill="none" stroke="${paint}"${meta} stroke-width="${f(m.width)}"` +
          ` stroke-linecap="round" opacity="${m.alpha}"/>`
        );
      }
      return `<circle cx="${f(m.cx)}" cy="${f(m.cy)}" r="${f(m.r)}" fill="${paint}"${meta} opacity="${m.alpha.toFixed(2)}"/>`;
    })
    .join("");
  return `<g id="brew-motif" data-layer="brew-motif" data-layer-order="3">${body}</g>`;
}

const MM_TO_PT = 72 / 25.4;

/** Unique alpha levels in a plan, so the writer can mint one ExtGState each. */
export function brewMotifAlphas(plan: BrewMotifPlan): number[] {
  return [...new Set(plan.marks.map((m) => Number(m.alpha.toFixed(3))))];
}

export function brewGsName(alpha: number): string {
  return `GsBrew${Math.round(Number(alpha.toFixed(3)) * 1000)}`;
}

/** Circle as four beziers, in PDF user space (y up). */
function circleOps(cx: number, cy: number, r: number): string {
  const k = 0.5523 * r;
  return [
    `${f(cx - r)} ${f(cy)} m`,
    `${f(cx - r)} ${f(cy + k)} ${f(cx - k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c`,
    `${f(cx + k)} ${f(cy + r)} ${f(cx + r)} ${f(cy + k)} ${f(cx + r)} ${f(cy)} c`,
    `${f(cx + r)} ${f(cy - k)} ${f(cx + k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c`,
    `${f(cx - k)} ${f(cy - r)} ${f(cx - r)} ${f(cy - k)} ${f(cx - r)} ${f(cy)} c`,
  ].join(" ");
}

/**
 * Motif as live PDF path objects. `pageH` is the page height in points;
 * `fillOp`/`strokeOp` paint the ink in the master's colour space.
 */
export function brewMotifPdfOps(
  plan: BrewMotifPlan,
  pageH: number,
  fillOp: (hex: string) => string,
  strokeOp: (hex: string) => string,
): string {
  const fill = fillOp(plan.ink);
  const stroke = strokeOp(plan.ink);
  const yUp = (mm: number) => pageH - mm * MM_TO_PT;
  return plan.marks
    .map((m) => {
      const gs = `/${brewGsName(m.alpha)} gs`;
      if (m.kind === "ring") {
        return (
          `q ${gs} ${stroke} ${f(m.width * MM_TO_PT)} w ` +
          `${circleOps(m.cx * MM_TO_PT, yUp(m.cy), m.r * MM_TO_PT)} S Q\n`
        );
      }
      if (m.kind === "bean") {
        return `q ${gs} ${fill} ${circleOps(m.cx * MM_TO_PT, yUp(m.cy), m.r * MM_TO_PT)} f Q\n`;
      }
      return "";
    })
    .join("");
}

/** Steam ribbons, emitted from the SVG path data the plan already carries. */
export function brewMotifSteamPdfOps(
  plan: BrewMotifPlan,
  pageH: number,
  strokeOp: (hex: string) => string,
  toOps: (d: string) => string,
): string {
  void pageH;
  const stroke = strokeOp(plan.ink);
  return plan.marks
    .filter((m): m is Extract<BrewMark, { kind: "path" }> => m.kind === "path")
    .map((m) => {
      const ops = toOps(m.d);
      if (!ops) return "";
      return `q /${brewGsName(m.alpha)} gs ${stroke} ${f(m.width * MM_TO_PT)} w ${ops} S Q\n`;
    })
    .join("");
}
