/**
 * NEXTbrew signage theming.
 *
 * The brew ground (`11-brew-diagonal`) used to be a bare gradient, which read
 * as "generic panel with a lockup on it" next to the rest of the London pack.
 * This adds an editable café motif on top of the ground: concentric cup rings
 * (the ring a cup leaves on a table top), a set of steam curves, and a bean
 * tick row. Every mark is a live vector object in both masters — nothing is
 * rasterised and nothing is baked into the gradient.
 *
 * Geometry is expressed in mm on the bleed sheet so the SVG and the `.ai`
 * agree, and it is scaled from the panel's short edge so a 488mm table top and
 * a 2394mm fascia both read at arm's length.
 */

import type { LondonPanel } from "@/lib/next-london-signage";

/** One motif mark. Filled shapes use `fill`; ring/steam strokes use `stroke`. */
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
 * Steam curve: a vertical ribbon of two mirrored bows, drawn upward from
 * (x, y) over `height` with `sway` lateral travel.
 */
function steamPath(x: number, y: number, height: number, sway: number): string {
  const h1 = height * 0.5;
  return [
    `M ${f(x)} ${f(y)}`,
    `C ${f(x + sway)} ${f(y - h1 * 0.45)} ${f(x - sway)} ${f(y - h1 * 0.6)} ${f(x)} ${f(y - h1)}`,
    `C ${f(x + sway)} ${f(y - h1 - h1 * 0.4)} ${f(x - sway)} ${f(y - h1 - h1 * 0.55)} ${f(x)} ${f(y - height)}`,
  ].join(" ");
}

/**
 * Motif for a brew panel. `light` flips the ink for the pale grounds so the
 * marks stay visible without shouting over the lockup.
 */
export function brewMotifPlan(panel: LondonPanel, light = false): BrewMotifPlan {
  const w = panel.bleedW;
  const h = panel.bleedH;
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  const wide = w / h >= 1.6;

  const marks: BrewMark[] = [];

  // Cup rings, anchored off the trailing edge so the hero lockup (which sits in
  // the live band) never fights them.
  const ringR = short * (wide ? 0.34 : 0.3);
  const rx = wide ? w * 0.86 : w * 0.78;
  const ry = wide ? h * 0.68 : h * 0.82;
  const ringWidth = Math.max(2, short * 0.008);
  for (const [scale, alpha] of [
    [1, 0.2],
    [0.76, 0.13],
    [0.52, 0.09],
  ] as const) {
    marks.push({ kind: "ring", cx: rx, cy: ry, r: ringR * scale, width: ringWidth, alpha });
  }

  // Steam ribbons rising from the opposite corner.
  const steamBase = wide ? h * 0.9 : h * 0.94;
  const steamH = short * (wide ? 0.42 : 0.3);
  const sx = wide ? w * 0.1 : w * 0.22;
  const gap = short * 0.075;
  const steamWidth = Math.max(1.6, short * 0.0065);
  marks.push(
    { kind: "path", d: steamPath(sx - gap, steamBase, steamH * 0.78, gap * 0.5), width: steamWidth, alpha: 0.16 },
    { kind: "path", d: steamPath(sx, steamBase, steamH, gap * 0.6), width: steamWidth, alpha: 0.22 },
    { kind: "path", d: steamPath(sx + gap, steamBase, steamH * 0.7, gap * 0.45), width: steamWidth, alpha: 0.14 },
  );

  // Bean tick row: a quiet rhythm along the leading edge, sized off the long
  // edge so short panels get fewer ticks instead of a cramped row.
  const beanR = Math.max(1.4, short * 0.009);
  const beanGap = beanR * 5;
  const count = Math.max(3, Math.min(9, Math.floor((long * 0.28) / beanGap)));
  const beanY = h * 0.06;
  for (let i = 0; i < count; i++) {
    marks.push({
      kind: "bean",
      cx: w * 0.06 + i * beanGap,
      cy: beanY,
      r: beanR,
      alpha: 0.26 - i * 0.02,
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
        return (
          `q ${gs} ${fill} ${circleOps(m.cx * MM_TO_PT, yUp(m.cy), m.r * MM_TO_PT)} f Q\n`
        );
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
