#!/usr/bin/env node
/**
 * EXPORT VERIFICATION SWEEP (CI / background job)
 * ===============================================
 *
 * Drives the real PPTX exporter through the /dev/export-verify harness across
 * the module × alternate-look matrix and fails (exit 1) on any export
 * regression: a missing rasterized background, a lost content layer, a renderer
 * failure, or a thrown exporter.
 *
 *   node scripts/verify-exports.mjs                 # sampled sweep (fast, CI default)
 *   node scripts/verify-exports.mjs --full          # every module × every look × both modes
 *   node scripts/verify-exports.mjs --sample 12     # sampled sweep, 12 modules per look
 *   node scripts/verify-exports.mjs --no-update     # verify only, never touch the manifest
 *   node scripts/verify-exports.mjs --url http://localhost:8080
 *
 * On success it refreshes tests/snapshots/export-verify.manifest.json with the
 * current matrix fingerprint, so `vite build` and the vitest gate know the
 * matrix has actually been swept. Adding a module or a look without re-running
 * this leaves the fingerprint stale and fails the build.
 *
 * Known-accepted problems live in the manifest under `allowedProblems`, keyed
 * `variantId@packId@mode` with a reason string.
 */
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * Launch Chromium, tolerating a browser cache whose build number does not match
 * the pinned playwright package (common on shared CI images): fall back to any
 * chromium build present in PLAYWRIGHT_BROWSERS_PATH.
 */
async function launchChromium() {
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!root || !existsSync(root)) throw err;
    for (const dir of readdirSync(root).filter((d) => d.startsWith("chromium"))) {
      for (const rel of [
        "chrome-linux/chrome",
        "chrome-linux/headless_shell",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      ]) {
        const exe = path.join(root, dir, rel);
        if (existsSync(exe)) return await chromium.launch({ headless: true, executablePath: exe });
      }
    }
    throw err;
  }
}

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const FULL = flag("full");
const SAMPLE = Number(value("sample", 8));
const UPDATE = !flag("no-update");
const MANIFEST = path.resolve(
  value("manifest", "tests/snapshots/export-verify.manifest.json"),
);
const BATCH = Number(value("batch", 8));

async function loadManifest() {
  if (!existsSync(MANIFEST)) return null;
  try {
    return JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {
    return null;
  }
}

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.error("  [page error]", m.text().slice(0, 200));
  });
  await page.goto(`${BASE_URL}/dev/export-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("!!window.__tpExportVerify", null, { timeout: 120_000 });
  return page;
}

/** Even spread across the module list so every family gets exercised. */
function sampleVariants(all, n) {
  if (FULL || n >= all.length) return [...all];
  const step = all.length / n;
  const out = [];
  for (let i = 0; i < n; i += 1) out.push(all[Math.floor(i * step)]);
  return [...new Set(out)];
}

function keyOf(row) {
  return `${row.variantId}@${row.packId ?? "base"}@${row.mode}`;
}

async function main() {
  const manifest = await loadManifest();
  const allowed = manifest?.allowedProblems ?? {};
  const browser = await launchChromium();
  let page = await boot(browser);

  const matrix = await page.evaluate(
    "({v: window.__tpExportVerify.variants, p: window.__tpExportVerify.packs})",
  );
  const variants = matrix.v;
  const packs = matrix.p.filter(Boolean);
  const swept = sampleVariants(variants, SAMPLE);

  const jobs = [];
  for (const pack of [...packs, null]) {
    for (const mode of ["light", "dark"]) {
      for (const v of swept) jobs.push([v, pack, mode]);
    }
  }
  console.log(
    `export-verify: ${packs.length} looks × ${swept.length}/${variants.length} modules × 2 modes = ${jobs.length} exports (${FULL ? "full" : "sampled"})`,
  );

  const rows = [];
  for (let i = 0; i < jobs.length; i += BATCH) {
    const batch = jobs.slice(i, i + BATCH);
    try {
      rows.push(...(await page.evaluate("j => window.__tpExportVerify.run(j)", batch)));
    } catch (err) {
      // A harness page crash must not be reported as an export regression:
      // reboot and retry the batch one job at a time.
      console.warn(`  harness restart after batch ${i}: ${String(err).slice(0, 120)}`);
      page = await boot(browser);
      for (const job of batch) {
        try {
          rows.push(...(await page.evaluate("j => window.__tpExportVerify.run(j)", [job])));
        } catch (err2) {
          rows.push({
            variantId: job[0],
            packId: job[1],
            mode: job[2],
            ok: false,
            bg: "none",
            shapes: 0,
            pics: 0,
            runs: 0,
            bytes: 0,
            problems: ["harness crashed while exporting this combination"],
            error: String(err2).slice(0, 300),
          });
          page = await boot(browser);
        }
      }
    }
    process.stdout.write(
      `  ${Math.min(i + BATCH, jobs.length)}/${jobs.length} · failures ${rows.filter((r) => !r.ok).length}\r`,
    );
  }
  console.log("");
  await browser.close();

  const failures = rows.filter((r) => !r.ok && !allowed[keyOf(r)]);
  const waived = rows.filter((r) => !r.ok && allowed[keyOf(r)]);

  for (const w of waived) console.log(`  waived: ${keyOf(w)} — ${allowed[keyOf(w)]}`);
  if (failures.length) {
    console.error(`\nEXPORT REGRESSION: ${failures.length} of ${rows.length} exports failed.`);
    for (const f of failures) {
      console.error(
        `  ✗ ${keyOf(f)} bg=${f.bg} shapes=${f.shapes} pics=${f.pics} runs=${f.runs} · ${f.problems.join("; ")}${f.error ? ` · ${f.error}` : ""}`,
      );
    }
    console.error("\nManifest not updated. Fix the exporter or the module, then re-run.");
    process.exit(1);
  }

  console.log(`\nAll ${rows.length} exports passed (backgrounds + layers intact).`);

  if (!UPDATE) return;
  // src/lib/export-matrix.ts is TS; recompute the same digest here so this
  // script needs no TS loader. Keep both algorithms in sync.
  const shape = fingerprintFrom(variants, packs);
  await mkdir(path.dirname(MANIFEST), { recursive: true });
  await writeFile(
    MANIFEST,
    `${JSON.stringify(
      {
        fingerprint: shape.fingerprint,
        variants: shape.variants,
        packs: shape.packs,
        jobs: shape.jobs,
        verifiedAt: new Date().toISOString(),
        coverage: FULL ? "full" : "sampled",
        sampledVariants: FULL ? [] : swept.slice().sort(),
        allowedProblems: allowed,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`Manifest refreshed: ${path.relative(process.cwd(), MANIFEST)} (${shape.fingerprint})`);
}

/** Mirror of the FNV-1a digest in src/lib/export-matrix.ts. */
function fingerprintFrom(variantIds, packIds) {
  const variants = [...variantIds].sort();
  const packs = [...packIds].sort();
  let h = 0x811c9dc5;
  for (const ch of [...variants, "|", ...packs].join("\u0000")) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return {
    variants,
    packs,
    jobs: (packs.length + 1) * variants.length * 2,
    fingerprint: (h >>> 0).toString(16).padStart(8, "0"),
  };
}

main().catch((err) => {
  console.error("export-verify sweep crashed:", err);
  process.exit(1);
});
