// Deterministic auto-repair for InfographicSpecs.
//
// The auditor (./audit.ts) reports what is wrong; this module fixes everything
// that can be fixed without inventing data. Anything that needs a judgement
// call (which categories to cut, what the takeaway is) is left to the AI pass
// in src/lib/viz-ai.functions.ts, which runs *after* this one so the model
// never spends tokens on mechanical work.

import { ensureA11y } from "./a11y";
import { ensureVizContrast } from "./viz-theme";
import type { InfographicRow, InfographicSpec } from "./spec";
import type { VizSurface } from "./audit";

export type RepairNote = { code: string; detail: string };
export type RepairResult = { spec: InfographicSpec; notes: RepairNote[] };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function periodOrdinal(raw: unknown): number | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  const iso = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(v);
  if (iso) return Number(iso[1]) * 372 + Number(iso[2]) * 31 + Number(iso[3] ?? 1);
  const quarter = /^q([1-4])[\s-]*(\d{2,4})?$/.exec(v);
  if (quarter) return (Number(quarter[2] ?? 0) || 0) * 372 + Number(quarter[1]) * 93;
  const monthIdx = MONTHS.findIndex((m) => v.startsWith(m));
  if (monthIdx >= 0) {
    const year = /(\d{4})/.exec(v);
    return (year ? Number(year[1]) : 0) * 372 + (monthIdx + 1) * 31;
  }
  const year = /^(\d{4})$/.exec(v);
  if (year) return Number(year[1]) * 372;
  return null;
}

function coerceNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t.replace(/[\s,%$€£]/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const TIME_ORDERED = new Set(["line", "area", "stacked-area", "bump"]);
const PART_TO_WHOLE = new Set(["donut", "treemap", "sunburst", "funnel", "radial-bar"]);

const SURFACE_CATEGORY_CAP: Record<VizSurface, number> = {
  presentation: 12,
  print: 14,
  social: 5,
};

export type RepairOptions = {
  surface?: VizSurface;
  /** Roll categories past the surface cap into an "Other" row. Default true. */
  rollUpLongTail?: boolean;
};

/**
 * Fix the mechanical defects in a spec: numeric coercion, chronological order,
 * contrast-guarded palette, funnel ordering, print vector policy, alt text, and
 * (optionally) long-tail roll-up for feed-sized surfaces.
 */
export function repairVizSpec(spec: InfographicSpec, opts: RepairOptions = {}): RepairResult {
  const surface = opts.surface ?? "presentation";
  const notes: RepairNote[] = [];
  const e = spec.encoding ?? {};
  const valueKey = e.value ?? e.y;
  const labelKey = e.label ?? e.x ?? e.category;

  let rows: InfographicRow[] = [...(spec.data?.rows ?? [])];

  // 1 — numeric coercion: "1,240" / "62%" become numbers so scales work.
  if (valueKey) {
    let coerced = 0;
    rows = rows.map((r) => {
      const raw = r[valueKey];
      if (typeof raw === "string") {
        const n = coerceNumber(raw);
        if (n !== null) {
          coerced += 1;
          return { ...r, [valueKey]: n };
        }
      }
      return r;
    });
    if (coerced > 0) {
      notes.push({ code: "VIZ-NON-NUMERIC", detail: `Coerced ${coerced} text values to numbers.` });
    }
    const before = rows.length;
    rows = rows.filter((r) => coerceNumber(r[valueKey]) !== null || r[valueKey] === 0);
    if (rows.length < before) {
      notes.push({
        code: "VIZ-NULL-GAPS",
        detail: `Dropped ${before - rows.length} rows with no usable value.`,
      });
    }
  }

  // 2 — chronology for time-based kinds.
  if (TIME_ORDERED.has(spec.kind) && e.x) {
    const ords = rows.map((r) => periodOrdinal(r[e.x as string]));
    if (ords.every((o) => o !== null)) {
      const sorted = [...rows].sort(
        (a, b) =>
          (periodOrdinal(a[e.x as string]) ?? 0) - (periodOrdinal(b[e.x as string]) ?? 0),
      );
      if (sorted.some((r, i) => r !== rows[i])) {
        rows = sorted;
        notes.push({ code: "VIZ-TIME-UNSORTED", detail: "Re-sorted rows chronologically." });
      }
    }
  }

  // 3 — funnel stages must descend.
  if (spec.kind === "funnel" && valueKey) {
    const sorted = [...rows].sort(
      (a, b) => (coerceNumber(b[valueKey]) ?? 0) - (coerceNumber(a[valueKey]) ?? 0),
    );
    if (sorted.some((r, i) => r !== rows[i])) {
      rows = sorted;
      notes.push({
        code: "VIZ-FUNNEL-NOT-MONOTONIC",
        detail: "Ordered funnel stages by descending volume.",
      });
    }
  }

  // 4 — long-tail roll-up so feed-sized charts stay readable.
  const cap = SURFACE_CATEGORY_CAP[surface];
  if (
    (opts.rollUpLongTail ?? true) &&
    valueKey &&
    labelKey &&
    !e.series &&
    rows.length > cap &&
    (PART_TO_WHOLE.has(spec.kind) || spec.kind === "bar" || spec.kind === "column")
  ) {
    const ranked = [...rows].sort(
      (a, b) => (coerceNumber(b[valueKey]) ?? 0) - (coerceNumber(a[valueKey]) ?? 0),
    );
    const keep = ranked.slice(0, cap - 1);
    const tail = ranked.slice(cap - 1);
    const other = tail.reduce((sum, r) => sum + (coerceNumber(r[valueKey]) ?? 0), 0);
    rows = [...keep, { [labelKey]: "Other", [valueKey]: Math.round(other * 100) / 100 }];
    notes.push({
      code: "VIZ-TOO-MANY-CATEGORIES",
      detail: `Rolled ${tail.length} small categories into "Other" for ${surface}.`,
    });
  }

  // 5 — contrast-guard the palette against the surface it actually lands on.
  const theme = { ...spec.theme };
  const surfaceHex = theme.surface || (theme.mode === "dark" ? "#03002C" : "#FFFFFF");
  const guard = (hex: string, min: number) => ensureVizContrast(hex, surfaceHex, min);
  let recolored = 0;
  const nextPalette = (theme.palette ?? []).map((c) => {
    const fixed = guard(c, 3);
    if (fixed.toLowerCase() !== c.toLowerCase()) recolored += 1;
    return fixed;
  });
  if (nextPalette.length) theme.palette = Array.from(new Set(nextPalette));
  const accent = guard(theme.accent ?? "#003FC7", 3);
  const primary = guard(theme.primary ?? "#003FC7", 3);
  const ink = guard(theme.ink ?? "#03002C", 4.5);
  if (accent !== theme.accent || primary !== theme.primary || ink !== theme.ink) recolored += 1;
  theme.accent = accent;
  theme.primary = primary;
  theme.ink = ink;
  theme.surface = surfaceHex;
  if (recolored > 0) {
    notes.push({
      code: "VIZ-SERIES-CONTRAST",
      detail: `Lifted ${recolored} colour${recolored > 1 ? "s" : ""} to clear contrast on ${surfaceHex}.`,
    });
  }

  // 6 — print always exports vector.
  const exportPolicy = { ...(spec.export ?? { preferredFormat: "svg" as const }) };
  if (surface === "print" && exportPolicy.preferredFormat !== "svg") {
    exportPolicy.preferredFormat = "svg";
    exportPolicy.rasterFallback = true;
    notes.push({ code: "VIZ-PRINT-RASTER", detail: "Switched print export to vector SVG." });
  }

  // 7 — social needs a headline and feed-legible labels.
  const annotations = { ...(spec.annotations ?? {}) };
  if (surface === "social") {
    const labels = labelKey ? rows.map((r) => String(r[labelKey] ?? "").trim()) : [];
    const shortened = 24;
    if (labelKey && labels.some((l) => l.length > shortened)) {
      rows = rows.map((r) => {
        const raw = String(r[labelKey] ?? "");
        if (raw.length <= shortened) return r;
        const cut = raw.slice(0, shortened - 1).replace(/[\s,;:–-]+$/, "");
        return { ...r, [labelKey]: `${cut}…` };
      });
      notes.push({
        code: "VIZ-LABEL-OVERFLOW",
        detail: `Shortened long category labels to ${shortened} characters for social.`,
      });
    }
    if (!annotations.headline?.trim() && labelKey && valueKey && rows.length > 0) {
      const ranked = [...rows].sort((a, b) => (coerceNumber(b[valueKey]) ?? 0) - (coerceNumber(a[valueKey]) ?? 0));
      const top = ranked[0];
      if (top) {
        const unit = /%|percent|share|rate/i.test(String(spec.data?.columns?.[valueKey] ?? valueKey))
          ? "%"
          : "";
        annotations.headline = `${String(top[labelKey])} leads at ${coerceNumber(top[valueKey]) ?? 0}${unit}`;
        notes.push({
          code: "VIZ-SOCIAL-NO-HEADLINE",
          detail: "Derived a social headline from the leading data point.",
        });
      }
    }
  }

  // 8 — alt text + long description, regenerated from the repaired data.
  const hadAlt = !!spec.accessibility?.shortAlt?.trim();
  const repaired = ensureA11y({
    ...spec,
    data: { ...spec.data, rows },
    theme,
    annotations,
    export: exportPolicy,
    accessibility: hadAlt
      ? spec.accessibility
      : { shortAlt: "", longDesc: spec.accessibility?.longDesc ?? "" },
  });
  if (!hadAlt) {
    notes.push({ code: "VIZ-ALT-MISSING", detail: "Generated alt text and long description." });
  }

  return { spec: repaired, notes };
}

