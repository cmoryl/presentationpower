// Logo-wall geometry for the growth-proof split module (MV-PROOF-GROWTH-ORBITS).
//
// The acquisitions wall in the top-left panel is authored as `content.items`
// (one entry per logo) plus an optional `content.logoWall` fragment holding the
// column count, a logo size multiplier and the tile gap. Absent or malformed
// values fall back to the module's intentional default, so existing decks keep
// the wall they were authored with.

export type LogoWall = {
  /** Tiles per row. */
  columns: number;
  /** Multiplier on the logo mark inside each tile. */
  scale: number;
  /** Gap between tiles, in stage px. */
  gap: number;
};

export const MAX_WALL_LOGOS = 12;
export const MIN_WALL_COLUMNS = 2;
export const MAX_WALL_COLUMNS = 6;
export const MIN_WALL_SCALE = 0.6;
export const MAX_WALL_SCALE = 1.6;
export const MIN_WALL_GAP = 0;
export const MAX_WALL_GAP = 40;

export const DEFAULT_LOGO_WALL: LogoWall = { columns: 4, scale: 1, gap: 12 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Read the wall settings off a slide's content, clamped to safe bounds. */
export function resolveLogoWall(value: unknown): LogoWall {
  const v = (value ?? {}) as Record<string, unknown>;
  const columns = num(v.columns);
  const scale = num(v.scale);
  const gap = num(v.gap);
  return {
    columns: columns === null ? DEFAULT_LOGO_WALL.columns : Math.round(clamp(columns, MIN_WALL_COLUMNS, MAX_WALL_COLUMNS)),
    scale: scale === null ? DEFAULT_LOGO_WALL.scale : clamp(Math.round(scale * 100) / 100, MIN_WALL_SCALE, MAX_WALL_SCALE),
    gap: gap === null ? DEFAULT_LOGO_WALL.gap : Math.round(clamp(gap, MIN_WALL_GAP, MAX_WALL_GAP)),
  };
}

/** Merge a partial change into the current wall settings. */
export function patchLogoWall(current: unknown, patch: Partial<LogoWall>): LogoWall {
  return resolveLogoWall({ ...resolveLogoWall(current), ...patch });
}

/** Max height of the logo mark inside a tile, as a CSS percentage. */
export function wallLogoMaxHeight(scale: number): string {
  return `${clamp(Math.round(68 * scale), 20, 100)}%`;
}

/** Max width of the logo mark inside a tile, as a CSS percentage. */
export function wallLogoMaxWidth(scale: number): string {
  return `${clamp(Math.round(86 * scale), 25, 100)}%`;
}
