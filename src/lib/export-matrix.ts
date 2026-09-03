/**
 * EXPORT MATRIX FINGERPRINT
 * =========================
 *
 * The real export verification (does every module × alternate look still
 * produce a PPTX that carries its rasterized background and all of its content
 * layers?) needs a browser, so it runs in `scripts/verify-exports.mjs` against
 * the /dev/export-verify harness.
 *
 * That means the expensive check cannot run inside `vite build`. What CAN run
 * there is this: a DOM-free fingerprint of the matrix itself. Every approved
 * module and every alternate look is hashed into a short digest and compared
 * against the digest recorded the last time the sweep passed
 * (tests/snapshots/export-verify.manifest.json).
 *
 * So the contract is:
 *   - add a module, remove a module, add or rename an alternate look
 *     -> fingerprint drifts -> build and tests FAIL until the sweep is re-run
 *   - re-run `npm run verify:exports` -> sweep exports the new combinations,
 *     refreshes the manifest -> build passes again
 *
 * A regression therefore cannot ship two ways: an export that breaks fails the
 * sweep, and a new module that was never swept fails the fingerprint gate.
 */

import { MODULE_VARIANTS } from "./taxonomy";
import { STYLE_PACKS } from "./style-packs";

export type ExportMatrixShape = {
  /** Sorted approved module variant ids. */
  variants: string[];
  /** Sorted alternate look (style pack) ids. */
  packs: string[];
  /**
   * Total export jobs a full sweep covers. Packs are single-mode by design (the
   * mode IS the look), so the matrix is: 2 house-look cells (light + dark) plus
   * one cell per alternate look, times every module.
   */
  jobs: number;
  /** Native mode of each alternate look. */
  packModes: Record<string, ExportMode>;
  /** Stable digest of the two id lists. */
  fingerprint: string;
};

export type ExportVerifyManifest = {
  fingerprint: string;
  variants: string[];
  packs: string[];
  jobs: number;
  /** ISO timestamp of the last passing sweep. */
  verifiedAt: string;
  /** How the last passing sweep was scoped. */
  coverage: "full" | "sampled";
  /** Modules sampled when coverage is "sampled" (empty for full sweeps). */
  sampledVariants?: string[];
  /**
   * High-water mark: how many restyle cells the coverage ledger held when this
   * manifest was written. The gate refuses a ledger that fell below it.
   */
  verifiedCells?: number;
  /**
   * Known-accepted problems, keyed `variantId@packId@mode` (packId `base` for
   * no pack). Every entry needs a reason so waivers cannot pile up silently.
   */
  allowedProblems?: Record<string, string>;
};

/** Order-independent FNV-1a digest of the matrix id lists. */
function digest(parts: string[]): string {
  let h = 0x811c9dc5;
  for (const s of parts.join("\u0000")) {
    h ^= s.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function exportMatrixShape(): ExportMatrixShape {
  const variants = MODULE_VARIANTS.map((v) => v.id).sort();
  const packs = STYLE_PACKS.map((p) => p.id).sort();
  const packModes = Object.fromEntries(
    STYLE_PACKS.map((p) => [p.id, p.mode as ExportMode]),
  ) as Record<string, ExportMode>;
  return {
    variants,
    packs,
    packModes,
    jobs: (packs.length + 2) * variants.length,
    fingerprint: digest([...variants, "|", ...packs]),
  };
}

export type MatrixDrift = {
  drifted: boolean;
  addedVariants: string[];
  removedVariants: string[];
  addedPacks: string[];
  removedPacks: string[];
  fingerprintChanged: boolean;
};

export function diffExportMatrix(
  manifest: Pick<ExportVerifyManifest, "fingerprint" | "variants" | "packs">,
  shape: ExportMatrixShape = exportMatrixShape(),
): MatrixDrift {
  const only = (a: string[], b: string[]) => a.filter((x) => !b.includes(x));
  const addedVariants = only(shape.variants, manifest.variants);
  const removedVariants = only(manifest.variants, shape.variants);
  const addedPacks = only(shape.packs, manifest.packs);
  const removedPacks = only(manifest.packs, shape.packs);
  const fingerprintChanged = manifest.fingerprint !== shape.fingerprint;
  return {
    drifted:
      fingerprintChanged ||
      addedVariants.length > 0 ||
      removedVariants.length > 0 ||
      addedPacks.length > 0 ||
      removedPacks.length > 0,
    addedVariants,
    removedVariants,
    addedPacks,
    removedPacks,
    fingerprintChanged,
  };
}

export function formatMatrixDrift(drift: MatrixDrift): string {
  const lines = ["Export verification is stale for the current module × look matrix."];
  const add = (label: string, ids: string[]) => {
    if (ids.length) lines.push(`  ${label}: ${ids.join(", ")}`);
  };
  add("new modules never export-verified", drift.addedVariants);
  add("modules removed since the last sweep", drift.removedVariants);
  add("new alternate looks never export-verified", drift.addedPacks);
  add("alternate looks removed since the last sweep", drift.removedPacks);
  if (!drift.addedVariants.length && !drift.addedPacks.length && drift.fingerprintChanged) {
    lines.push("  matrix fingerprint changed (module or look ids were renamed)");
  }
  lines.push("");
  lines.push("Re-run the export sweep, then commit the refreshed manifest:");
  lines.push("  npm run dev            # harness needs the dev server");
  lines.push("  npm run verify:exports # sweeps the matrix and updates the manifest");
  return lines.join("\n");
}

/* ═══════════════════════════════════════════════════════════════════════════
 * RESTYLE COVERAGE LEDGER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A full restyle matrix is (28 looks + house) × every module × 2 modes ≈ 11.8k
 * exports — far more than one CI job or one interactive run can finish. So the
 * sweep records what it actually swept in a resumable ledger
 * (tests/snapshots/export-verify.coverage.json) and shards can be run until
 * every cell is covered. "Full coverage" therefore means *the ledger has every
 * cell of the current matrix*, not "somebody passed --full once".
 *
 * The ledger is keyed by restyle cell — `<packId|base>@<mode>` — and stores the
 * sorted module ids swept for that cell.
 * ═════════════════════════════════════════════════════════════════════════ */

export const EXPORT_MODES = ["light", "dark"] as const;
export type ExportMode = (typeof EXPORT_MODES)[number];

export type CoverageLedger = {
  /** Matrix fingerprint the ledger was accumulated against. */
  fingerprint: string;
  /** ISO timestamp of the last shard merged in. */
  updatedAt: string;
  /** `<packId|base>@<mode>` → sorted module ids swept and passing. */
  cells: Record<string, string[]>;
};

/** Cell key for one restyle look × mode. */
export function coverageCellKey(packId: string | null, mode: string): string {
  return `${packId ?? "base"}@${mode}`;
}

/**
 * Every cell key a complete restyle matrix must contain: the house look in both
 * modes, plus each alternate look in its own native mode.
 */
export function coverageCellKeys(shape: ExportMatrixShape = exportMatrixShape()): string[] {
  const keys = EXPORT_MODES.map((m) => coverageCellKey(null, m));
  for (const pack of shape.packs)
    keys.push(coverageCellKey(pack, shape.packModes[pack] ?? "light"));
  return keys;
}

export function emptyCoverageLedger(
  shape: ExportMatrixShape = exportMatrixShape(),
): CoverageLedger {
  return { fingerprint: shape.fingerprint, updatedAt: new Date(0).toISOString(), cells: {} };
}

/**
 * Merge swept rows into a ledger. A ledger accumulated against a different
 * matrix fingerprint is discarded — module/look ids moved, so its cells no
 * longer describe anything verifiable.
 */
export function mergeCoverage(
  ledger: CoverageLedger | null,
  rows: Array<{ variantId: string; packId: string | null; mode: string }>,
  shape: ExportMatrixShape = exportMatrixShape(),
  now: string = new Date().toISOString(),
): CoverageLedger {
  const base =
    ledger && ledger.fingerprint === shape.fingerprint
      ? { ...ledger, cells: { ...ledger.cells } }
      : emptyCoverageLedger(shape);
  for (const row of rows) {
    const key = coverageCellKey(row.packId, row.mode);
    const next = new Set(base.cells[key] ?? []);
    next.add(row.variantId);
    base.cells[key] = [...next].sort();
  }
  // Drop cells/modules that no longer exist so a stale entry can never make an
  // incomplete matrix look complete.
  const valid = new Set(coverageCellKeys(shape));
  const variants = new Set(shape.variants);
  for (const key of Object.keys(base.cells)) {
    if (!valid.has(key)) delete base.cells[key];
    else base.cells[key] = base.cells[key].filter((v) => variants.has(v));
  }
  return { fingerprint: shape.fingerprint, updatedAt: now, cells: base.cells };
}

export type CoverageGap = { cell: string; missing: string[] };

export type CoverageReport = {
  complete: boolean;
  /** Cells with every module swept. */
  cellsCovered: number;
  cellsTotal: number;
  /** Individual export cells swept vs required. */
  sweptJobs: number;
  totalJobs: number;
  fingerprintMatches: boolean;
  gaps: CoverageGap[];
};

export function coverageReport(
  ledger: CoverageLedger | null,
  shape: ExportMatrixShape = exportMatrixShape(),
): CoverageReport {
  const keys = coverageCellKeys(shape);
  const fingerprintMatches = Boolean(ledger && ledger.fingerprint === shape.fingerprint);
  const cells = fingerprintMatches ? (ledger!.cells ?? {}) : {};
  const gaps: CoverageGap[] = [];
  let sweptJobs = 0;
  let cellsCovered = 0;
  for (const key of keys) {
    const swept = new Set(cells[key] ?? []);
    const missing = shape.variants.filter((v) => !swept.has(v));
    sweptJobs += shape.variants.length - missing.length;
    if (missing.length === 0) cellsCovered += 1;
    else gaps.push({ cell: key, missing });
  }
  return {
    complete: fingerprintMatches && gaps.length === 0,
    cellsCovered,
    cellsTotal: keys.length,
    sweptJobs,
    totalJobs: shape.jobs,
    fingerprintMatches,
    gaps,
  };
}

/**
 * Jobs (`[variantId, packId, mode]`) still missing from the ledger, in sweep
 * order: the house look first (parity baseline, covers every module), then the
 * alternate looks drained round-robin by module index so every look × mode cell
 * gains coverage early in a multi-hour matrix.
 */
export function remainingCoverageJobs(
  ledger: CoverageLedger | null,
  shape: ExportMatrixShape = exportMatrixShape(),
): Array<[string, string | null, ExportMode]> {
  const report = coverageReport(ledger, shape);
  const missingByCell = new Map(report.gaps.map((g) => [g.cell, g.missing]));
  const cellJobs = (pack: string | null, mode: ExportMode) =>
    (missingByCell.get(coverageCellKey(pack, mode)) ?? []).map(
      (v) => [v, pack, mode] as [string, string | null, ExportMode],
    );
  const house = [...cellJobs(null, "light"), ...cellJobs(null, "dark")];
  const lanes: Array<Array<[string, string | null, ExportMode]>> = [];
  for (const pack of shape.packs) lanes.push(cellJobs(pack, shape.packModes[pack] ?? "light"));
  const looks: Array<[string, string | null, ExportMode]> = [];
  const depth = lanes.reduce((n, l) => Math.max(n, l.length), 0);
  for (let i = 0; i < depth; i += 1) {
    for (const lane of lanes) if (lane[i]) looks.push(lane[i]);
  }
  return [...house, ...looks];
}

/** Deterministic shard slice of a job list: shard `k` of `n`, 1-indexed. */
export function shardJobs<T>(jobs: T[], shard: number, shards: number): T[] {
  if (shards <= 1) return [...jobs];
  const k = Math.min(Math.max(shard, 1), shards) - 1;
  return jobs.filter((_, i) => i % shards === k);
}

export function formatCoverageGaps(report: CoverageReport): string {
  if (report.complete) return "";
  const lines = [
    `Restyle matrix coverage is incomplete: ${report.sweptJobs}/${report.totalJobs} exports verified across ${report.cellsCovered}/${report.cellsTotal} look × mode cells.`,
  ];
  if (!report.fingerprintMatches) {
    lines.push("  coverage ledger was accumulated against a different module × look matrix");
  }
  for (const gap of report.gaps.slice(0, 12)) {
    lines.push(
      `  ${gap.cell}: ${gap.missing.length} module(s) never swept — e.g. ${gap.missing.slice(0, 4).join(", ")}`,
    );
  }
  if (report.gaps.length > 12) lines.push(`  …and ${report.gaps.length - 12} more cells`);
  lines.push("");
  lines.push("Run the restyle matrix until the ledger is complete:");
  lines.push("  npm run dev                       # harness needs the dev server");
  lines.push("  npm run verify:restyle            # sweeps only the cells still missing");
  lines.push("  npm run verify:restyle -- --shard 1/8   # or shard it across jobs/machines");
  return lines.join("\n");
}
