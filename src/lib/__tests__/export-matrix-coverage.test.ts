/**
 * RESTYLE MATRIX COVERAGE GATE
 * ============================
 *
 * The export sweep records every cell it verified in
 * tests/snapshots/export-verify.coverage.json. This gate reads that ledger and
 * enforces the rules that make the 28-look restyle matrix an end-to-end
 * verification instead of a sample:
 *
 *   1. the ledger describes the matrix that exists today (fingerprint match);
 *   2. every look × mode cell (28 looks + the house look, light and dark) has
 *      been swept — a look may never be entirely unverified;
 *   3. every module appears in the ledger at least once;
 *   4. coverage never regresses: the manifest's high-water mark of verified
 *      cells must still be met by the ledger;
 *   5. a manifest claiming `coverage: "full"` must be backed by a ledger with
 *      literally every cell present.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  coverageCellKeys,
  coverageReport,
  exportMatrixShape,
  formatCoverageGaps,
  type CoverageLedger,
  type ExportVerifyManifest,
} from "@/lib/export-matrix";

const LEDGER = path.resolve(process.cwd(), "tests/snapshots/export-verify.coverage.json");
const MANIFEST = path.resolve(process.cwd(), "tests/snapshots/export-verify.manifest.json");

function ledger(): CoverageLedger {
  return JSON.parse(readFileSync(LEDGER, "utf8")) as CoverageLedger;
}
function manifest(): ExportVerifyManifest {
  return JSON.parse(readFileSync(MANIFEST, "utf8")) as ExportVerifyManifest;
}

describe("restyle matrix coverage", () => {
  it("has a coverage ledger", () => {
    expect(
      existsSync(LEDGER),
      `missing ${LEDGER}; run npm run verify:restyle (dev server must be up)`,
    ).toBe(true);
  });

  it("was accumulated against the current module × look matrix", () => {
    expect(ledger().fingerprint).toBe(exportMatrixShape().fingerprint);
  });

  it("has swept every look in both modes", () => {
    const l = ledger();
    const unswept = coverageCellKeys().filter((k) => (l.cells[k] ?? []).length === 0);
    expect(unswept.join(", ")).toBe("");
  });

  it("has swept every approved module at least once", () => {
    const l = ledger();
    const seen = new Set(Object.values(l.cells).flat());
    const never = exportMatrixShape().variants.filter((v) => !seen.has(v));
    expect(never.join(", ")).toBe("");
  });

  it("never regresses below the recorded coverage high-water mark", () => {
    const report = coverageReport(ledger());
    const recorded = manifest().verifiedCells ?? 0;
    expect(
      report.sweptJobs,
      `ledger fell from ${recorded} to ${report.sweptJobs} verified cells`,
    ).toBeGreaterThanOrEqual(recorded);
  });

  it("only claims full coverage when every cell is verified", () => {
    if (manifest().coverage !== "full") return;
    const report = coverageReport(ledger());
    expect(report.complete ? "" : formatCoverageGaps(report)).toBe("");
  });
});
