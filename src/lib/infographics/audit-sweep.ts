// Platform-wide data-visualisation sweep.
//
// Renders every supported chart kind against its sample dataset on every
// surface (presentation / print / social) in both light and dark, then grades
// each combination with the deterministic auditor. This is what powers the
// Viz Lab audit report and the regression test that keeps new chart kinds from
// shipping broken.

import { BRAND_MODES } from "@/lib/taxonomy";
import { ensureA11y } from "./a11y";
import { auditVizSpec, type VizAudit, type VizFinding, type VizSurface } from "./audit";
import { repairVizSpec } from "./repair";
import { sampleDatasetFor } from "./sample-data";
import { SUPPORTED_VIZ_KINDS, VIZ_KIND_BY_VARIANT } from "./variant-kinds";
import { vizTheme } from "./viz-theme";
import type { InfographicKind, InfographicSpec } from "./spec";

const ENTERPRISE = BRAND_MODES.find((b) => b.id === "bm-enterprise") ?? BRAND_MODES[0];

export const VIZ_SURFACES: VizSurface[] = ["presentation", "print", "social"];

/** Presentation module ids that render each chart kind. */
export function variantsForKind(kind: InfographicKind): string[] {
  return Object.entries(VIZ_KIND_BY_VARIANT)
    .filter(([, k]) => k === kind)
    .map(([id]) => id)
    .sort();
}

/** Build the spec the platform would actually render for a kind + surface. */
export function sampleSpecFor(
  kind: InfographicKind,
  mode: "light" | "dark",
  title?: string,
): InfographicSpec | null {
  const data = sampleDatasetFor(kind);
  if (!data) return null;
  return ensureA11y({
    id: `sweep-${kind}-${mode}`,
    kind,
    title: title ?? `${kind} sample`,
    data: { rows: data.rows, source: data.source, columns: data.columns },
    encoding: data.encoding,
    theme: vizTheme({ brand: ENTERPRISE, mode }),
    accessibility: { shortAlt: "", longDesc: "" },
    export: { preferredFormat: "svg", rasterFallback: true },
  });
}

export type SweepRow = {
  kind: InfographicKind;
  surface: VizSurface;
  mode: "light" | "dark";
  /** Modules that render this kind — where a fix lands. */
  variants: string[];
  /** Audit before deterministic repair. */
  before: VizAudit;
  /** Audit after deterministic repair — what a user actually sees now. */
  after: VizAudit;
  /** What the repair pass changed. */
  repaired: string[];
  /** Findings the repair pass could not clear on its own. */
  residual: VizFinding[];
};

export type SweepReport = {
  generatedAt: string;
  rows: SweepRow[];
  kindsWithoutSampleData: InfographicKind[];
  totals: {
    combinations: number;
    blockersBefore: number;
    blockersAfter: number;
    warningsBefore: number;
    warningsAfter: number;
    autoFixed: number;
    avgScoreBefore: number;
    avgScoreAfter: number;
  };
};

export type SweepOptions = {
  surfaces?: VizSurface[];
  modes?: Array<"light" | "dark">;
  kinds?: InfographicKind[];
  /** Placeholder attribution is expected in a sweep, so it is muted by default. */
  flagSampleData?: boolean;
};

/** Run the full sweep. Pure and synchronous — no network, no DOM. */
export function sweepVizModules(opts: SweepOptions = {}): SweepReport {
  const surfaces = opts.surfaces ?? VIZ_SURFACES;
  const modes = opts.modes ?? (["light", "dark"] as const).slice();
  const kinds = opts.kinds ?? SUPPORTED_VIZ_KINDS;
  const flagSampleData = opts.flagSampleData ?? false;

  const rows: SweepRow[] = [];
  const missing: InfographicKind[] = [];

  for (const kind of kinds) {
    const variants = variantsForKind(kind);
    for (const mode of modes) {
      const base = sampleSpecFor(kind, mode);
      if (!base) {
        if (!missing.includes(kind)) missing.push(kind);
        continue;
      }
      for (const surface of surfaces) {
        const before = auditVizSpec(base, { surface, flagSampleData });
        const { spec: fixed, notes } = repairVizSpec(base, { surface });
        const after = auditVizSpec(fixed, { surface, flagSampleData });
        const clearedCodes = new Set(notes.map((n) => n.code));
        rows.push({
          kind,
          surface,
          mode,
          variants,
          before,
          after,
          repaired: notes.map((n) => n.detail),
          residual: after.findings.filter((f) => !clearedCodes.has(f.code)),
        });
      }
    }
  }

  const avg = (nums: number[]) =>
    nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : 100;

  return {
    generatedAt: new Date().toISOString(),
    rows,
    kindsWithoutSampleData: missing,
    totals: {
      combinations: rows.length,
      blockersBefore: rows.reduce((n, r) => n + r.before.blockers, 0),
      blockersAfter: rows.reduce((n, r) => n + r.after.blockers, 0),
      warningsBefore: rows.reduce((n, r) => n + r.before.warnings, 0),
      warningsAfter: rows.reduce((n, r) => n + r.after.warnings, 0),
      autoFixed: rows.reduce((n, r) => n + r.repaired.length, 0),
      avgScoreBefore: avg(rows.map((r) => r.before.score)),
      avgScoreAfter: avg(rows.map((r) => r.after.score)),
    },
  };
}

/** Group a sweep by finding code — the view an engineer fixes from. */
export function groupSweepByCode(report: SweepReport): Array<{
  code: string;
  severity: VizFinding["severity"];
  message: string;
  fix: string;
  count: number;
  kinds: InfographicKind[];
  surfaces: VizSurface[];
}> {
  const map = new Map<
    string,
    {
      code: string;
      severity: VizFinding["severity"];
      message: string;
      fix: string;
      count: number;
      kinds: Set<InfographicKind>;
      surfaces: Set<VizSurface>;
    }
  >();
  for (const row of report.rows) {
    for (const f of row.after.findings) {
      const entry = map.get(f.code) ?? {
        code: f.code,
        severity: f.severity,
        message: f.message,
        fix: f.fix,
        count: 0,
        kinds: new Set<InfographicKind>(),
        surfaces: new Set<VizSurface>(),
      };
      entry.count += 1;
      entry.kinds.add(row.kind);
      entry.surfaces.add(row.surface);
      map.set(f.code, entry);
    }
  }
  const order = { blocker: 0, warning: 1, info: 2 } as const;
  return [...map.values()]
    .map((e) => ({ ...e, kinds: [...e.kinds], surfaces: [...e.surfaces] }))
    .sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count);
}
