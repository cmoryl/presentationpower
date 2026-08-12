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
  /** Total export jobs a full sweep covers: (packs + 1 base) × variants × 2 modes. */
  jobs: number;
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
  return {
    variants,
    packs,
    jobs: (packs.length + 1) * variants.length * 2,
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
