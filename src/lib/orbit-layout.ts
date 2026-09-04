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
