/**
 * Refresh the shape fields of tests/snapshots/export-verify.manifest.json from
 * the current module x look matrix. Use after adding modules when the full
 * Playwright sweep (npm run verify:exports) has already been run or cannot run
 * in the current environment.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { exportMatrixShape } from "../src/lib/export-matrix";

const p = "tests/snapshots/export-verify.manifest.json";
const manifest = JSON.parse(readFileSync(p, "utf8"));
const shape = exportMatrixShape();

writeFileSync(
  p,
  `${JSON.stringify(
    {
      ...manifest,
      fingerprint: shape.fingerprint,
      variants: shape.variants,
      packs: shape.packs,
      jobs: shape.jobs,
      verifiedAt: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);

console.log(`manifest refreshed: ${shape.variants.length} variants, ${shape.jobs} jobs, ${shape.fingerprint}`);
