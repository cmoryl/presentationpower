// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import type { Plugin } from "vite";

/**
 * Fails the build when any alternate look (style pack) drops below the
 * readability threshold in its own light/dark register. The audit is pure and
 * DOM-free (src/lib/pack-contrast-regression.ts), so it runs here instead of
 * only in tests — a decorative ground tweak can no longer ship a look whose
 * copy has gone unreadable.
 */
function packContrastGate(): Plugin {
  return {
    name: "pack-contrast-gate",
    apply: "build",
    async buildStart() {
      const { auditAllPackContrast, formatPackContrastFailures } = await import(
        "./src/lib/pack-contrast-regression"
      );
      const report = auditAllPackContrast();
      if (!report.passes) this.error(formatPackContrastFailures(report));
      this.info?.(
        `pack-contrast-gate: ${report.rows.length} alternate looks pass WCAG contrast + tonal register`,
      );
    },
  };
}

/**
 * Fails the build when a module or an alternate look has been added, removed or
 * renamed since the last passing export verification sweep
 * (scripts/verify-exports.mjs → tests/snapshots/export-verify.manifest.json).
 * The sweep itself needs a browser, so it runs as a CI/background job; this gate
 * is what makes skipping it impossible.
 */
function exportVerifyGate(): Plugin {
  return {
    name: "export-verify-gate",
    apply: "build",
    async buildStart() {
      const [{ diffExportMatrix, exportMatrixShape, formatMatrixDrift }, fs, path] =
        await Promise.all([
          import("./src/lib/export-matrix"),
          import("node:fs"),
          import("node:path"),
        ]);
      const file = path.resolve("tests/snapshots/export-verify.manifest.json");
      if (!fs.existsSync(file)) {
        this.error(
          "export-verify-gate: no export verification manifest. Run `npm run verify:exports` (needs the dev server) and commit tests/snapshots/export-verify.manifest.json.",
        );
        return;
      }
      const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
      const drift = diffExportMatrix(manifest);
      if (drift.drifted) this.error(`export-verify-gate: ${formatMatrixDrift(drift)}`);
      const shape = exportMatrixShape();
      this.info?.(
        `export-verify-gate: ${shape.variants.length} modules × ${shape.packs.length} looks verified (${manifest.coverage} sweep, ${manifest.verifiedAt})`,
      );
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [mcpPlugin(), packContrastGate(), exportVerifyGate()],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
