// Multi-stat arrangement presets.
//
// A stat set is a *composition*, not a row of equal cells. This module owns the
// catalog of arrangements (hero + supporting, staircase, asymmetric bento, split
// ledger, ticker band) and resolves one into concrete grid geometry plus a
// per-item emphasis so a renderer can lay a stat set out without hand-rolling
// column maths.
//
// Dependency-free (no React, no DOM) so exporters, tests and pickers read the
// same source of truth.

import type { StatEmphasis } from "./stat-layouts";

export type StatArrangement =
  | "even"
  | "hero-trio"
  | "staircase"
  | "bento"
  | "split-ledger"
  | "ticker"
  | "magazine"
  | "ladder"
  | "duo-lead";

export type StatArrangementPreset = {
  id: StatArrangement;
  label: string;
  description: string;
  /** Fewest stats the arrangement needs before it reads as intended. */
  minItems: number;
};

export const STAT_ARRANGEMENT_PRESETS: StatArrangementPreset[] = [
  {
    id: "even",
    label: "Even grid",
    description: "Equal-weight cells — the classic stat row or matrix.",
    minItems: 1,
  },
  {
    id: "hero-trio",
    label: "Hero + supporting",
    description: "One monumental lead figure with the rest stacked beside it at reduced weight.",
    minItems: 2,
  },
  {
    id: "staircase",
    label: "Stepped staircase",
    description: "Each figure sits a step lower than the last, reading left to right as a climb.",
    minItems: 2,
  },
  {
    id: "bento",
    label: "Asymmetric bento",
    description: "Mixed-span tiles — a wide lead cell with narrower satellites around it.",
    minItems: 3,
  },
  {
    id: "split-ledger",
    label: "Split ledger",
    description: "Two ruled columns of figures, each row a ledger line.",
    minItems: 2,
  },
  {
    id: "ticker",
    label: "Ticker band",
    description: "One tight horizontal band of figures divided by hairlines.",
    minItems: 3,
  },
  {
    id: "magazine",
    label: "Magazine lead",
    description: "A full-width lead figure as the story opener, with the rest in a row beneath.",
    minItems: 2,
  },
  {
    id: "ladder",
    label: "Vertical ladder",
    description: "A single ruled column of figures — reads down a rail or sidebar.",
    minItems: 2,
  },
  {
    id: "duo-lead",
    label: "Twin leads",
    description: "Two equal hero figures side by side, supporting figures beneath.",
    minItems: 2,
  },
];

export function isStatArrangement(value: unknown): value is StatArrangement {
  return typeof value === "string" && STAT_ARRANGEMENT_PRESETS.some((p) => p.id === value);
}

export function statArrangementPreset(id: StatArrangement): StatArrangementPreset {
  return STAT_ARRANGEMENT_PRESETS.find((p) => p.id === id) ?? STAT_ARRANGEMENT_PRESETS[0];
}

/** Geometry for a single cell in a resolved arrangement. */
export type StatCellPlan = {
  /** 1-based grid column start. */
  col: number;
  /** Column span. */
  span: number;
  /** 1-based grid row. */
  row: number;
  /** Optical weight for the figure in this cell. */
  emphasis: StatEmphasis;
  /** Vertical offset in px — the staircase step. */
  offsetY: number;
  /** Draw a hairline on the cell's leading edge. */
  leadingRule: boolean;
};

export type StatArrangementPlan = {
  id: StatArrangement;
  cols: number;
  rows: number;
  cells: StatCellPlan[];
  /** Suggested column gap / row gap in px. */
  gapX: number;
  gapY: number;
};

const cell = (over: Partial<StatCellPlan> & Pick<StatCellPlan, "col" | "row">): StatCellPlan => ({
  span: 1,
  emphasis: "normal",
  offsetY: 0,
  leadingRule: false,
  ...over,
});

/**
 * Resolve an arrangement for `count` stats. Always returns a plan with exactly
 * `count` cells: an arrangement that cannot hold the set (too few items, an odd
 * bento) degrades to the even grid rather than dropping figures.
 */
export function planStatArrangement(
  id: StatArrangement,
  count: number,
  opts: { maxCols?: number } = {},
): StatArrangementPlan {
  const n = Math.max(0, Math.floor(count));
  const maxCols = Math.max(1, opts.maxCols ?? 4);
  if (n === 0) return { id: "even", cols: 1, rows: 0, cells: [], gapX: 56, gapY: 48 };
  const preset = statArrangementPreset(id);
  const effective: StatArrangement = n < preset.minItems ? "even" : preset.id;

  if (effective === "hero-trio") {
    const rest = n - 1;
    const rows = Math.max(1, rest);
    return {
      id: effective,
      cols: 2,
      rows,
      gapX: 64,
      gapY: 32,
      cells: [
        cell({ col: 1, row: 1, span: 1, emphasis: "hero" }),
        ...Array.from({ length: rest }, (_, i) =>
          cell({ col: 2, row: i + 1, emphasis: "quiet", leadingRule: true }),
        ),
      ],
    };
  }

  if (effective === "staircase") {
    const cols = Math.min(n, maxCols);
    const step = cols > 3 ? 34 : 46;
    return {
      id: effective,
      cols,
      rows: Math.ceil(n / cols),
      gapX: 48,
      gapY: 40,
      cells: Array.from({ length: n }, (_, i) =>
        cell({
          col: (i % cols) + 1,
          row: Math.floor(i / cols) + 1,
          offsetY: (i % cols) * step,
          emphasis: i === 0 ? "hero" : "normal",
        }),
      ),
    };
  }

  if (effective === "bento") {
    // 4-column bed: lead cell spans two, satellites fill the remainder.
    const cells: StatCellPlan[] = [];
    let col = 1;
    let row = 1;
    for (let i = 0; i < n; i += 1) {
      const span = i === 0 ? 2 : 1;
      if (col + span - 1 > 4) {
        col = 1;
        row += 1;
      }
      cells.push(
        cell({ col, row, span, emphasis: i === 0 ? "hero" : "normal", leadingRule: col > 1 }),
      );
      col += span;
    }
    return { id: effective, cols: 4, rows: row, gapX: 44, gapY: 40, cells };
  }

  if (effective === "split-ledger") {
    const rows = Math.ceil(n / 2);
    return {
      id: effective,
      cols: 2,
      rows,
      gapX: 72,
      gapY: 28,
      cells: Array.from({ length: n }, (_, i) =>
        cell({ col: (i % 2) + 1, row: Math.floor(i / 2) + 1, leadingRule: i % 2 === 1 }),
      ),
    };
  }

  if (effective === "ticker") {
    return {
      id: effective,
      cols: n,
      rows: 1,
      gapX: 0,
      gapY: 0,
      cells: Array.from({ length: n }, (_, i) =>
        cell({ col: i + 1, row: 1, emphasis: "quiet", leadingRule: i > 0 }),
      ),
    };
  }

  const cols = Math.min(n, maxCols);
  return {
    id: "even",
    cols,
    rows: Math.ceil(n / cols),
    gapX: 56,
    gapY: 48,
    cells: Array.from({ length: n }, (_, i) =>
      cell({
        col: (i % cols) + 1,
        row: Math.floor(i / cols) + 1,
        leadingRule: i % cols > 0,
      }),
    ),
  };
}

/** Grid container style for a resolved plan (inline style object). */
export function statArrangementGridStyle(plan: StatArrangementPlan): Record<string, string> {
  return {
    display: "grid",
    gridTemplateColumns: `repeat(${plan.cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${Math.max(1, plan.rows)}, minmax(0, auto))`,
    columnGap: `${plan.gapX}px`,
    rowGap: `${plan.gapY}px`,
    alignItems: "start",
  };
}

/** Grid item style for one cell. */
export function statCellStyle(c: StatCellPlan): Record<string, string> {
  return {
    gridColumn: `${c.col} / span ${c.span}`,
    gridRow: String(c.row),
    transform: c.offsetY ? `translateY(${c.offsetY}px)` : "none",
  };
}
