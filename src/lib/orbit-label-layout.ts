/**
 * MV-STAT-ORBIT label layout — one source of truth for the ring's label
 * geometry so the renderer and the regression suite agree.
 * ---------------------------------------------------------------------------
 * Labels sit on each arc's mid-angle, outside the ring, anchored away from the
 * centre. Long labels used to run straight out of the SVG frame ("MARKETING"
 * clipped to "MARKE"), so the viewBox is padded horizontally AND long labels
 * wrap onto a second line. Both rules live here and are asserted by
 * `orbit-label-clipping.test.ts`.
 */

/** Ring radius, stage units. */
export const ORBIT_R = 210;
/** Ring centre inside the unpadded 640×640 box. */
export const ORBIT_CX = 320;
export const ORBIT_CY = 320;
/** Horizontal viewBox padding that gives side labels room to render. */
export const ORBIT_VB_PAD = 170;
/** Unpadded box size. */
export const ORBIT_BOX = 640;
/** Padded viewBox width. */
export const ORBIT_VB_W = ORBIT_BOX + ORBIT_VB_PAD * 2;
/** How far past the ring the label baseline sits. */
export const ORBIT_LABEL_OFFSET = 62;
/** Percentage figure size, px. */
export const ORBIT_PCT_FS = 28;
/** Label size, px, and its line height. */
export const ORBIT_LABEL_FS = 15;
export const ORBIT_LABEL_LINE_H = 19;
/** Labels longer than this wrap onto a second line. */
export const ORBIT_WRAP_MAX_CHARS = 16;
/** Label tracking (em) — real width includes it, so measurement must too. */
export const ORBIT_LABEL_TRACKING_EM = 0.14;
export const ORBIT_PCT_TRACKING_EM = -0.02;
/** Horizontal room a label has between its anchor and the padded frame edge. */
export const ORBIT_LABEL_MAX_W = ORBIT_VB_PAD + ORBIT_BOX / 2 - (ORBIT_R + ORBIT_LABEL_OFFSET);
/** Labels never take more than two lines. */
export const ORBIT_LABEL_MAX_LINES = 2;
/** Last-resort type shrink when two lines still overrun the frame. */
export const ORBIT_LABEL_MIN_SCALE = 0.7;

export type OrbitAnchor = "start" | "middle" | "end";

function fitsWidth(text: string, fontSizePx = ORBIT_LABEL_FS): boolean {
  return approxTextWidth(text, fontSizePx, ORBIT_LABEL_TRACKING_EM) <= ORBIT_LABEL_MAX_W;
}

/** Hard-split a single word that can never fit on one line. */
function splitWord(word: string): string[] {
  const perChar = ORBIT_LABEL_FS * (0.63 + ORBIT_LABEL_TRACKING_EM);
  const max = Math.max(4, Math.floor(ORBIT_LABEL_MAX_W / perChar));
  const chunks: string[] = [];
  for (let i = 0; i < word.length; i += max) chunks.push(word.slice(i, i + max));
  return chunks;
}

/**
 * Wrap a label onto at most two lines, greedily by measured width (not by a
 * character count — tracking makes char counts lie). Words that cannot fit are
 * hard-split rather than allowed to run out of the frame. Never drops,
 * duplicates, or re-orders characters.
 */
export function wrapOrbitLabel(rawLabel: string): string[] {
  const label = rawLabel.trim().replace(/\s+/g, " ").toUpperCase();
  if (!label) return [];
  if (label.length <= ORBIT_WRAP_MAX_CHARS && fitsWidth(label)) return [label];

  const tokens = label.split(" ").flatMap((w) => (fitsWidth(w) ? [w] : splitWord(w)));
  const lines: string[] = [];
  for (const token of tokens) {
    const last = lines[lines.length - 1];
    const merged = last ? `${last} ${token}` : token;
    if (last && fitsWidth(merged)) {
      lines[lines.length - 1] = merged;
    } else if (lines.length < ORBIT_LABEL_MAX_LINES) {
      lines.push(token);
    } else {
      // Two-line cap reached: keep the text intact on the last line and let the
      // measured font scale below pull it back inside the frame.
      lines[lines.length - 1] = merged;
    }
  }
  return lines;
}

/**
 * Type scale for a wrapped label so even the widest line stays in frame.
 * 1 when the label already fits; clamped at ORBIT_LABEL_MIN_SCALE.
 */
export function orbitLabelFontScale(lines: string[]): number {
  const widest = Math.max(
    0,
    ...lines.map((l) => approxTextWidth(l, ORBIT_LABEL_FS, ORBIT_LABEL_TRACKING_EM)),
  );
  if (widest <= ORBIT_LABEL_MAX_W || widest === 0) return 1;
  return Math.max(ORBIT_LABEL_MIN_SCALE, ORBIT_LABEL_MAX_W / widest);
}


/** Text anchor for a label at cos(midAngle) — labels point away from centre. */
export function orbitLabelAnchor(cos: number): OrbitAnchor {
  return cos < -0.2 ? "end" : cos > 0.2 ? "start" : "middle";
}

/** Label anchor point for an arc mid-angle (radians, 0 = 3 o'clock). */
export function orbitLabelPos(midAngle: number): { x: number; y: number } {
  return {
    x: ORBIT_CX + Math.cos(midAngle) * (ORBIT_R + ORBIT_LABEL_OFFSET),
    y: ORBIT_CY + Math.sin(midAngle) * (ORBIT_R + ORBIT_LABEL_OFFSET),
  };
}

/**
 * Conservative advance-width estimate for uppercase Geist Sans, including
 * tracking. Slightly pessimistic on purpose: the clipping guard should fail
 * before a real render does.
 */
export function approxTextWidth(text: string, fontSizePx: number, trackingEm = 0): number {
  const perChar = 0.63 + trackingEm;
  return text.length * fontSizePx * perChar;
}

/** Horizontal extent of a text run placed at `x` with the given anchor. */
export function textBoundsX(
  x: number,
  width: number,
  anchor: OrbitAnchor,
): { left: number; right: number } {
  if (anchor === "start") return { left: x, right: x + width };
  if (anchor === "end") return { left: x - width, right: x };
  return { left: x - width / 2, right: x + width / 2 };
}

/** The padded viewBox's drawable horizontal range. */
export function orbitViewBoxX(): { min: number; max: number } {
  return { min: -ORBIT_VB_PAD, max: ORBIT_BOX + ORBIT_VB_PAD };
}

export interface OrbitLabelLayout {
  index: number;
  lines: string[];
  pct: number;
  x: number;
  y: number;
  anchor: OrbitAnchor;
  /** Baseline y of each wrapped line. */
  lineYs: number[];
  /** Widest rendered run (label lines and the % figure). */
  widthPx: number;
  /** Type scale applied to the label lines so they stay in frame. */
  fontScale: number;
  bounds: { left: number; right: number; top: number; bottom: number };
}

/** Full label layout for a set of orbit shares (values need not sum to 100). */
export function layoutOrbitLabels(
  items: { label: string; value: number }[],
): OrbitLabelLayout[] {
  const total = items.reduce((n, it) => n + (Number(it.value) || 0), 0) || 1;
  let acc = 0;
  return items.map((it, index) => {
    const share = (Number(it.value) || 0) / total;
    const start = acc;
    acc += share;
    const mid = (start + share / 2) * Math.PI * 2 - Math.PI / 2;
    const lines = wrapOrbitLabel(it.label);
    const fontScale = orbitLabelFontScale(lines);
    const anchor = orbitLabelAnchor(Math.cos(mid));
    const { x, y } = orbitLabelPos(mid);
    const pct = Math.round(share * 100);
    const lineYs = lines.map((_, li) => y + 24 + li * ORBIT_LABEL_LINE_H);
    const runs = [
      ...lines.map((line) =>
        approxTextWidth(line, ORBIT_LABEL_FS * fontScale, ORBIT_LABEL_TRACKING_EM),
      ),
      approxTextWidth(`${pct}%`, ORBIT_PCT_FS, ORBIT_PCT_TRACKING_EM),
    ];
    const widthPx = Math.max(0, ...runs);
    const h = textBoundsX(x, widthPx, anchor);

    return {
      index,
      lines,
      pct,
      x,
      y,
      anchor,
      lineYs,
      widthPx,
      fontScale,
      bounds: {
        left: h.left,
        right: h.right,
        top: y - ORBIT_PCT_FS,
        bottom: (lineYs[lineYs.length - 1] ?? y) + ORBIT_LABEL_FS * 0.3,
      },
    };
  });
}

/**
 * Segments the ring renders. Rings are legible up to 10 slices; beyond that the
 * arcs and their labels collide, so extra items are dropped rather than drawn.
 */
export const ORBIT_MAX_SEGMENTS = 10;

/**
 * Arc tint for segment `i` of `count`. The old ramp was a fixed `1 - i * 0.14`,
 * which goes transparent (and then negative) past 7 slices — so dense rings lost
 * their last arcs. This spreads the ramp across the actual segment count and
 * keeps every arc above a visible floor.
 */
export const ORBIT_SEG_ALPHA_MIN = 0.32;
export function orbitSegmentAlpha(index: number, count: number): number {
  if (count <= 1) return 1;
  const step = (1 - ORBIT_SEG_ALPHA_MIN) / (count - 1);
  return Math.max(ORBIT_SEG_ALPHA_MIN, 1 - index * step);
}

/** Legend row density for the list beside the ring; dense rings tighten up. */
export function orbitLegendDensity(count: number): {
  rowPadY: number;
  labelFs: number;
  valueFs: number;
} {
  if (count <= 5) return { rowPadY: 16, labelFs: 24, valueFs: 30 };
  if (count <= 7) return { rowPadY: 12, labelFs: 21, valueFs: 26 };
  return { rowPadY: 8, labelFs: 18, valueFs: 22 };
}
