#!/usr/bin/env node
/**
 * Verifies every variant declared in CLASSIC_MANIFEST (src/lib/division-logos.ts)
 *   1. resolves to a `-classic-` path (not a NEXT/2026 fallback), and
 *   2. exists on disk under public/brand-logos/.
 *
 * Exits non-zero if either check fails, so CI blocks regressions.
 * Run: node scripts/verify-classic-logos.mjs
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const modUrl = pathToFileURL(resolve(root, "src/lib/division-logos.ts")).href;
// tsx/vite-node not required — read the module via dynamic import through
// a tiny loader. Fallback: shell out to `bunx tsx` if plain import fails.
let mod;
try {
  mod = await import(modUrl);
} catch {
  const { execSync } = await import("node:child_process");
  const out = execSync(
    `bunx tsx -e "import('${modUrl}').then(m => process.stdout.write(JSON.stringify({issues:m.validateClassicManifest(),logos:m.DIVISION_LOGOS})))"`,
    { cwd: root },
  ).toString();
  mod = JSON.parse(out);
}

const issues = typeof mod.validateClassicManifest === "function"
  ? mod.validateClassicManifest()
  : mod.issues ?? [];

let failed = issues.length > 0;
if (issues.length) {
  console.error("[verify-classic-logos] Manifest issues:");
  for (const i of issues) console.error(" -", i);
}

// Filesystem check: every classic path referenced by DIVISION_LOGOS must exist.
const logos = mod.DIVISION_LOGOS ?? mod.logos ?? {};
const seen = new Set();
for (const set of Object.values(logos)) {
  for (const path of Object.values(set ?? {})) {
    if (typeof path !== "string" || !path.includes("-classic-")) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    const abs = resolve(root, "public" + path);
    if (!existsSync(abs)) {
      console.error(`[verify-classic-logos] Missing file on disk: ${path}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log(`[verify-classic-logos] OK — ${seen.size} classic assets verified.`);
