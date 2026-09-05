// Per-figure placement for the growth-proof orbit stats (MV-PROOF-GROWTH-ORBITS).
//
// Each orbit stat can carry its own position inside the right-hand stage area:
// `x` / `y` are percentages of that area (0–100, measured to the centre of the
// ring) and `size` is a multiplier on the count-derived base diameter. When a
// figure has no stored position it falls back to the staggered defaults below,
// so existing decks keep the layout they were authored with.

export type OrbitPos = { x: number; y: number; size: number };

/** Staggered defaults per orbit count — the diagonal run of figures. */
const DEFAULTS: Record<number, OrbitPos[]> = {
  1: [{ x: 50, y: 50, size: 1 }],
  2: [
    { x: 34, y: 28, size: 1 },
    { x: 66, y: 74, size: 1 },
  ],
  3: [
    { x: 30, y: 18, size: 1 },
    { x: 70, y: 50, size: 1 },
    { x: 34, y: 84, size: 1 },
  ],
};

export const MIN_ORBIT_SIZE = 0.5;
export const MAX_ORBIT_SIZE = 1.8;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/** Base ring diameter (stage px) for a given number of figures. */
export function orbitBaseSize(count: number): number {
  return count >= 3 ? 258 : count === 2 ? 320 : 380;
}

/** Default placement for figure `index` of `count`. */
export function defaultOrbitPos(index: number, count: number): OrbitPos {
  const list = DEFAULTS[clamp(count, 1, 3)] ?? DEFAULTS[3]!;
  return list[index] ?? { x: 50, y: 50, size: 1 };
}

/** Resolve the stored position of one figure, falling back to the default. */
export function resolveOrbitPos(
  item: unknown,
  index: number,
  count: number,
): OrbitPos {
  const base = defaultOrbitPos(index, count);
  const o = (item ?? {}) as Record<string, unknown>;
  return {
    x: clamp(num(o.x) ?? base.x, 0, 100),
    y: clamp(num(o.y) ?? base.y, 0, 100),
    size: clamp(num(o.size) ?? base.size, MIN_ORBIT_SIZE, MAX_ORBIT_SIZE),
  };
}

/** Resolve every figure's placement in one pass. */
export function resolveOrbitLayout(items: unknown[]): OrbitPos[] {
  return items.map((it, i) => resolveOrbitPos(it, i, items.length));
}

/** Write a placement patch onto one figure, clamped to the legal ranges. */
export function patchOrbitPos(
  items: unknown[],
  index: number,
  patch: Partial<OrbitPos>,
): Record<string, unknown>[] {
  return items.map((it, i) => {
    const row = { ...((it ?? {}) as Record<string, unknown>) };
    if (i !== index) return row;
    const next = { ...resolveOrbitPos(it, i, items.length), ...patch };
    row.x = Math.round(clamp(next.x, 0, 100) * 10) / 10;
    row.y = Math.round(clamp(next.y, 0, 100) * 10) / 10;
    row.size = Math.round(clamp(next.size, MIN_ORBIT_SIZE, MAX_ORBIT_SIZE) * 100) / 100;
    return row;
  });
}

/**
 * Reorder the figures while the placements stay with their slot, so the content
 * reflows through the existing arrangement instead of the rings jumping around.
 */
export function reorderOrbits(
  items: unknown[],
  from: number,
  to: number,
): Record<string, unknown>[] {
  if (from === to || from < 0 || from >= items.length) {
    return items.map((it) => ({ ...((it ?? {}) as Record<string, unknown>) }));
  }
  const slots = items.map((it, i) => resolveOrbitPos(it, i, items.length));
  const explicit = items.map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    return num(o.x) !== null || num(o.y) !== null || num(o.size) !== null;
  });
  const target = clamp(to, 0, items.length - 1);
  const order = items.map((_, i) => i);
  const [moved] = order.splice(from, 1);
  order.splice(target, 0, moved!);

  return order.map((src, slot) => {
    const row = { ...((items[src] ?? {}) as Record<string, unknown>) };
    if (explicit[slot]) {
      row.x = slots[slot]!.x;
      row.y = slots[slot]!.y;
      row.size = slots[slot]!.size;
    } else {
      delete row.x;
      delete row.y;
      delete row.size;
    }
    return row;
  });
}

/** Drop stored placement so a figure returns to its staggered default. */
export function resetOrbitPos(items: unknown[], index: number): Record<string, unknown>[] {
  return items.map((it, i) => {
    const row = { ...((it ?? {}) as Record<string, unknown>) };
    if (i === index) {
      delete row.x;
      delete row.y;
      delete row.size;
    }
    return row;
  });
}

/* ────────────────────────────────────────────────────────────────────────────
 * Collision detection
 *
 * The rings are placed by percentage inside the right-hand stage, so two
 * figures (or a figure and the stage edge) can end up overlapping — the labels
 * and percentages then print on top of each other. `fitOrbitLayout` runs a
 * short relaxation pass over the resolved placements: any pair of rings closer
 * than their combined radii plus a breathing gap is pushed apart along the line
 * between their centres, and every centre is finally clamped so the whole ring
 * stays inside the stage. Earlier figures carry more weight, so the reading
 * order is preserved and the first figure barely moves.
 *
 * Units are arbitrary (px on the slide, inches in the PPTX export) as long as
 * the stage size and the base diameter share them.
 * ────────────────────────────────────────────────────────────────────────── */

export type OrbitStage = { w: number; h: number };

/** Nominal stage the slide renderer gives the rings (1920×1080 canvas). */
export function orbitStageSize(count: number): OrbitStage {
  return { w: 860, h: Math.max(620, orbitBaseSize(count) + 40) };
}

export type FittedOrbit = OrbitPos & {
  /** True when collision resolution had to move this figure. */
  nudged: boolean;
};

/** Do two placements overlap (rings, plus the breathing gap)? */
export function orbitsCollide(
  a: OrbitPos,
  b: OrbitPos,
  stage: OrbitStage,
  base: number,
  gap = base * 0.06,
): boolean {
  const dx = ((a.x - b.x) / 100) * stage.w;
  const dy = ((a.y - b.y) / 100) * stage.h;
  const need = ((a.size + b.size) * base) / 2 + gap;
  return Math.hypot(dx, dy) < need;
}

/**
 * Resolve overlaps between placements and keep every ring inside the stage.
 * Returns placements in the same percentage space as the input.
 */
export function fitOrbitLayout(
  positions: OrbitPos[],
  opts: { stage: OrbitStage; base: number; gap?: number; iterations?: number } ,
): FittedOrbit[] {
  const { stage, base } = opts;
  const gap = opts.gap ?? base * 0.06;
  const iterations = opts.iterations ?? 60;
  if (positions.length === 0 || stage.w <= 0 || stage.h <= 0) {
    return positions.map((p) => ({ ...p, nudged: false }));
  }

  // Work in stage units so the push is geometrically correct on a non-square
  // stage (a 5% step sideways is not the same distance as 5% down).
  const pts = positions.map((p) => ({
    x: (p.x / 100) * stage.w,
    y: (p.y / 100) * stage.h,
    r: (p.size * base) / 2,
  }));
  const start = pts.map((p) => ({ x: p.x, y: p.y }));
  // Earlier figures resist movement: weight 1, 1.6, 2.2, ...
  const give = pts.map((_, i) => 1 + i * 0.6);

  const clampIn = (i: number) => {
    const p = pts[i]!;
    const m = Math.min(p.r, stage.w / 2);
    const mh = Math.min(p.r, stage.h / 2);
    p.x = clamp(p.x, m, stage.w - m);
    p.y = clamp(p.y, mh, stage.h - mh);
  };

  for (let it = 0; it < iterations; it += 1) {
    let moved = false;
    for (let i = 0; i < pts.length; i += 1) {
      for (let j = i + 1; j < pts.length; j += 1) {
        const a = pts[i]!;
        const b = pts[j]!;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const need = a.r + b.r + gap;
        if (d >= need * 1.01) continue;
        if (d < 0.0001) {
          // Perfectly stacked — separate along a stable diagonal.
          dx = 0.7071;
          dy = 0.7071;
          d = 1;
        }
        // 1% slack absorbs the rounding back into percentages, so a pair that
        // has just been separated never reads as touching again.
        const push = (need * 1.01 - d) / d;
        const total = give[i]! + give[j]!;
        a.x -= dx * push * (give[i]! / total);
        a.y -= dy * push * (give[i]! / total);
        b.x += dx * push * (give[j]! / total);
        b.y += dy * push * (give[j]! / total);
        clampIn(i);
        clampIn(j);
        moved = true;
      }
    }
    for (let i = 0; i < pts.length; i += 1) clampIn(i);
    if (!moved) break;
  }

  // Safety net: if the stage is simply too tight for the authored sizes, the
  // relaxation can stay wedged against the edges. Fall back to an even grid in
  // reading order so figures still never sit on top of each other.
  const stillColliding = () => {
    for (let i = 0; i < pts.length; i += 1) {
      for (let j = i + 1; j < pts.length; j += 1) {
        const a = pts[i]!;
        const b = pts[j]!;
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r + b.r + gap * 0.5) return true;
      }
    }
    return false;
  };
  if (stillColliding()) {
    const cols = Math.min(pts.length, Math.max(1, Math.floor(stage.w / (base + gap))));
    const rows = Math.ceil(pts.length / cols);
    pts.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      p.x = ((col + 0.5) / cols) * stage.w;
      p.y = ((row + 0.5) / rows) * stage.h;
    });
    for (let i = 0; i < pts.length; i += 1) clampIn(i);
  }

  return pts.map((p, i) => ({
    x: Math.round(clamp((p.x / stage.w) * 100, 0, 100) * 10) / 10,
    y: Math.round(clamp((p.y / stage.h) * 100, 0, 100) * 10) / 10,
    size: positions[i]!.size,
    nudged:
      Math.abs(p.x - start[i]!.x) > 0.5 || Math.abs(p.y - start[i]!.y) > 0.5,
  }));
}

/** Resolve stored placements and immediately clear any collisions. */
export function resolveFittedOrbitLayout(
  items: unknown[],
  opts?: { stage?: OrbitStage; base?: number; gap?: number },
): FittedOrbit[] {
  const base = opts?.base ?? orbitBaseSize(items.length);
  const stage = opts?.stage ?? orbitStageSize(items.length);
  return fitOrbitLayout(resolveOrbitLayout(items), { stage, base, gap: opts?.gap });
}
