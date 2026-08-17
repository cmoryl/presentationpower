/**
 * Shared card furniture for PPTX export.
 *
 * Every native renderer used to hand-draw its own accent tick, photo caption
 * scrim and stat figure, so a fix landed in one module (MV-BENTO-5) and every
 * sibling module kept the old, wrong look: full-width seams overhanging rounded
 * corners, single flat caption slabs that read as opaque navy blocks (and
 * tripped the ink guard into navy-on-navy caption text), and bare numerals with
 * no meter.
 *
 * These primitives are the single source of truth for that furniture. Renderers
 * MUST use them rather than re-implementing the geometry.
 */

type Target = {
  addShape: (type: string, opts: Record<string, unknown>) => unknown;
  addText: (text: unknown, opts: Record<string, unknown>) => unknown;
};

export const SEAM_H_IN = 3 / 144;

/** Register a translucent-but-dark region so the ink guard keeps white copy. */
export function registerDarkFurniture(
  slide: unknown,
  rect: { x: number; y: number; w: number; h: number },
  hex = "03002C",
): void {
  const guard = slide as {
    __darkPatches?: Array<{ x: number; y: number; w: number; h: number; hex: string }>;
  };
  guard.__darkPatches?.push({ ...rect, hex });
}

/**
 * AccentTick parity: the tick lives INSIDE the card's rounded clip, so it starts
 * after the corner radius (a full-width bar overhangs the corners and reads as a
 * detached rule floating above the card) and fades toward the middle like the
 * on-screen seam gradient.
 */
export function addCardSeam(
  target: Target,
  cell: { x: number; y: number; w: number },
  accent: string,
  radiusIn = 22 / 144,
  name = "TP Accent tick",
): void {
  const inset = radiusIn * 0.9;
  const x0 = cell.x + inset;
  const w0 = Math.max(cell.w - inset * 2, cell.w * 0.2);
  const segments = [
    { x: x0, w: w0 * 0.3, t: 60 },
    { x: x0 + w0 * 0.3, w: w0 * 0.4, t: 28 },
    { x: x0 + w0 * 0.7, w: w0 * 0.3, t: 60 },
  ];
  for (const sg of segments) {
    target.addShape("rect", {
      x: sg.x,
      y: cell.y,
      w: sg.w,
      h: SEAM_H_IN,
      fill: { color: accent, transparency: sg.t },
      line: { type: "none" },
      sharp: true,
      objectName: name,
    });
  }
}

/**
 * Bottom-up legibility ramp under a photo caption. A single flat slab reads as
 * an opaque block, so four graded bands fake the on-screen gradient; the region
 * is registered as dark furniture because every band is translucent and the ink
 * guard would otherwise flip white caption copy to navy-on-navy.
 */
export function addPhotoScrim(
  target: Target,
  slide: unknown,
  rect: { x: number; y: number; w: number; h: number },
  name = "TP Caption scrim",
): void {
  const bands = [
    { t: 90, f: 0 },
    { t: 74, f: 0.3 },
    { t: 58, f: 0.55 },
    { t: 44, f: 0.78 },
  ];
  bands.forEach((b, bi) => {
    const yTop = rect.y + rect.h * b.f;
    const yBot = rect.y + rect.h * (bands[bi + 1]?.f ?? 1);
    target.addShape("rect", {
      x: rect.x,
      y: yTop,
      w: rect.w,
      h: Math.max(yBot - yTop, 0.02),
      fill: { color: "03002C", transparency: b.t },
      line: { type: "none" },
      objectName: name,
    });
  });
  registerDarkFurniture(slide, rect);
}

/** Proportional meter fill for a stat figure; non-numeric values get a neutral track. */
export function gaugeFraction(value: unknown, unit = ""): number {
  const numeric = Number.parseFloat(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(numeric)) return 0.75;
  const raw = unit.includes("%") || String(value).includes("%") ? numeric / 100 : numeric / 120;
  return Math.max(0.08, Math.min(1, raw));
}

/** Accent progress meter under a stat figure (track + proportional fill). */
export function addGaugeMeter(
  target: Target,
  box: { x: number; y: number; w: number },
  accent: string,
  frac: number,
  name = "TP Gauge",
): void {
  const h = 7 / 144;
  target.addShape("rect", {
    x: box.x,
    y: box.y,
    w: box.w,
    h,
    fill: { color: accent, transparency: 80 },
    line: { type: "none" },
    sharp: true,
    objectName: `${name} track`,
  });
  target.addShape("rect", {
    x: box.x,
    y: box.y,
    w: Math.max(box.w * frac, 0.08),
    h,
    fill: { color: accent },
    line: { type: "none" },
    sharp: true,
    objectName: `${name} fill`,
  });
}

/**
 * Stat figure as two runs — big figure + smaller unit — so "62%" does not export
 * as one flat 72pt lump the way the on-screen cell never shows it.
 */
export function statRuns(
  value: unknown,
  unit: unknown,
  opts: { size: number; color: string; unitSize?: number },
): Array<{ text: string; options: Record<string, unknown> }> {
  const face = { bold: true, color: opts.color, fontFace: "Geist" };
  const u = String(unit ?? "");
  return [
    { text: String(value ?? ""), options: { fontSize: opts.size, ...face } },
    ...(u
      ? [
          {
            text: u,
            options: { fontSize: opts.unitSize ?? Math.round(opts.size * 0.42), ...face },
          },
        ]
      : []),
  ];
}
