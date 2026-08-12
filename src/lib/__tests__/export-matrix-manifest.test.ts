/**
 * Build/test gate: the export verification sweep must have covered the current
 * module × alternate-look matrix.
 *
 * This test is DOM-free and instant. It does not export anything — it only
 * checks that the committed manifest (written by `npm run verify:exports`)
 * describes the matrix that exists in the source today. Adding a module or an
 * alternate look therefore fails here until the sweep is re-run, which is what
 * stops an unverified export path from shipping.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  diffExportMatrix,
  exportMatrixShape,
  formatMatrixDrift,
  type ExportVerifyManifest,
} from "@/lib/export-matrix";

const MANIFEST = path.resolve(process.cwd(), "tests/snapshots/export-verify.manifest.json");

describe("export verification manifest", () => {
  it("exists — the sweep has been run at least once", () => {
    expect(existsSync(MANIFEST), `missing ${MANIFEST}; run npm run verify:exports`).toBe(true);
  });

  it("covers every approved module and every alternate look", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as ExportVerifyManifest;
    const drift = diffExportMatrix(manifest);
    expect(drift.drifted ? formatMatrixDrift(drift) : "").toBe("");
  });

  it("documents a reason for every waived export failure", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as ExportVerifyManifest;
    for (const [key, reason] of Object.entries(manifest.allowedProblems ?? {})) {
      expect(reason.trim().length, `waiver ${key} has no reason`).toBeGreaterThan(8);
    }
  });

  it("records a job count consistent with the matrix it swept", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as ExportVerifyManifest;
    expect(manifest.jobs).toBe(exportMatrixShape().jobs);
    expect(Date.parse(manifest.verifiedAt)).not.toBeNaN();
  });
});
