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
 *
 * OBJECT-TREE DIFF
 * ----------------
 * Every swept export is also compared, element by element, against the stored
 * object tree in tests/snapshots/export-layer-tree.json. Any element that stops
 * being editable, stops being an independent layer, disappears, or collapses
 * into the design plate fails the sweep and is printed with its own label, so a
 * layering regression names the exact object(s) that caused it.
 *
 *   node scripts/verify-exports.mjs --update-tree   # accept the current trees
 *   node scripts/verify-exports.mjs --no-tree       # skip the object-tree diff
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
  // Explicit binary wins: shared CI images often ship a system chromium while the
  // bundled playwright build is missing its shared libraries.
  const envExe = process.env.PW_CHROME || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (envExe && existsSync(envExe)) {
    return await chromium.launch({ headless: true, executablePath: envExe });
  }
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
/**
 * Cap on alternate looks. `--looks 0` sweeps every module against the house look
 * only (190 × 2 modes = 380 cells), which is the parity matrix that matters for
 * geometry / z-order / typography without paying 28× for pack restyles.
 */
const LOOKS = value("looks", null) == null ? null : Number(value("looks", 0));

const UPDATE = !flag("no-update");
const MANIFEST = path.resolve(value("manifest", "tests/snapshots/export-verify.manifest.json"));
const BATCH = Number(value("batch", 8));
const TREE_SNAPSHOT = path.resolve(
  value("tree-manifest", "tests/snapshots/export-layer-tree.json"),
);
const TREE_UPDATE = flag("update-tree");
const TREE_ENABLED = !flag("no-tree");

/* ── restyle matrix mode ───────────────────────────────────────────────────
 * `--restyle` sweeps the cells the coverage ledger is still missing, so the
 * full (28 looks + house) × every module × 2 modes matrix can be finished
 * across as many runs, shards or machines as it takes. `--shard k/n` takes a
 * deterministic slice, `--max N` caps one run's job count.
 * ───────────────────────────────────────────────────────────────────────── */
const RESTYLE = flag("restyle");
const COVERAGE = path.resolve(value("coverage", "tests/snapshots/export-verify.coverage.json"));
/**
 * Mid-run checkpoints go here, NOT to COVERAGE. The committed ledger lives
 * under tests/, which the dev server watches: writing it every batch triggers a
 * full page reload, which destroys the harness contexts and eventually kills
 * the sweep ("Execution context was destroyed"). node_modules/.cache is outside
 * the watcher, so progress can be checkpointed as often as we like and only the
 * final result is written into the repo.
 */
const PROGRESS = path.resolve("node_modules/.cache/export-verify.coverage.json");
const MAX_JOBS = value("max", null) == null ? null : Number(value("max", 0));
const WORKERS = Math.max(1, Number(value("workers", RESTYLE ? 4 : 1)));
const [SHARD, SHARDS] = (() => {
  const raw = value("shard", null);
  if (!raw) return [1, 1];
  const [k, n] = raw.split("/").map((x) => Number(x));
  return [Number.isFinite(k) ? k : 1, Number.isFinite(n) && n > 0 ? n : 1];
})();

async function loadJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

const cellKey = (packId, mode) => `${packId ?? "base"}@${mode}`;

/** Mirror of mergeCoverage() in src/lib/export-matrix.ts. */
function mergeCoverage(ledger, rows, shape) {
  // Cells are per module × look × mode, so they survive a fingerprint change
  // (a new module was added); stale ids are pruned below.
  const cells = ledger ? { ...(ledger.cells ?? {}) } : {};
  for (const row of rows) {
    const key = cellKey(row.packId, row.mode);
    cells[key] = [...new Set([...(cells[key] ?? []), row.variantId])].sort();
  }
  const valid = new Set([
    cellKey(null, "light"),
    cellKey(null, "dark"),
    ...shape.packs.map((p) => cellKey(p, shape.packModes?.[p] ?? "light")),
  ]);
  const variants = new Set(shape.variants);
  for (const key of Object.keys(cells)) {
    if (!valid.has(key)) delete cells[key];
    else cells[key] = cells[key].filter((v) => variants.has(v));
  }
  return { fingerprint: shape.fingerprint, updatedAt: new Date().toISOString(), cells };
}

/**
 * Mirror of remainingCoverageJobs() in src/lib/export-matrix.ts.
 *
 * Ordering matters for a matrix that takes hours: the house look goes first
 * (it is the parity baseline and covers every module), then the alternate looks
 * are drained round-robin by module index, so every look × mode cell has real
 * coverage within the first minutes instead of look 1 finishing before look 2
 * has been touched at all.
 */
function remainingJobs(ledger, shape) {
  const cells = ledger ? (ledger.cells ?? {}) : {};
  const missing = (pack, mode) => {
    const swept = new Set(cells[cellKey(pack, mode)] ?? []);
    return shape.variants.filter((v) => !swept.has(v)).map((v) => [v, pack, mode]);
  };
  const house = [...missing(null, "light"), ...missing(null, "dark")];
  const lanes = [];
  for (const pack of shape.packs) lanes.push(missing(pack, shape.packModes?.[pack] ?? "light"));
  const looks = [];
  for (let i = 0; i < Math.max(0, ...lanes.map((l) => l.length)); i += 1) {
    for (const lane of lanes) if (lane[i]) looks.push(lane[i]);
  }
  return [...house, ...looks];
}

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
  const page0 = await boot(browser);

  const matrix = await page0.evaluate(() => ({
    v: window.__tpExportVerify.variants,
    p: window.__tpExportVerify.packs,
    m: window.__tpExportVerify.packModes ?? {},
  }));
  const variants = matrix.v;
  const allPacks = matrix.p.filter(Boolean);
  const packs = LOOKS == null ? allPacks : allPacks.slice(0, Math.max(0, LOOKS));

  const shape = fingerprintFrom(variants, allPacks, matrix.m);
  // Resume from the committed ledger unioned with any unfinished run's progress.
  // Resume from the committed ledger unioned with any unfinished run's progress.
  const ledgerRows = (l) =>
    !l
      ? []
      : Object.entries(l.cells ?? {}).flatMap(([key, ids]) => {
          const at = key.lastIndexOf("@");
          const packId = key.slice(0, at);
          const mode = key.slice(at + 1);
          return ids.map((variantId) => ({
            variantId,
            packId: packId === "base" ? null : packId,
            mode,
          }));
        });
  const ledgerBefore = mergeCoverage(
    await loadJson(COVERAGE, null),
    ledgerRows(await loadJson(PROGRESS, null)),
    shape,
  );

  let jobs;
  let label;
  if (RESTYLE) {
    let pending = remainingJobs(ledgerBefore, shape);
    const pendingTotal = pending.length;
    pending = pending.filter(
      (_, i) => SHARDS <= 1 || i % SHARDS === Math.min(Math.max(SHARD, 1), SHARDS) - 1,
    );
    jobs = MAX_JOBS == null ? pending : pending.slice(0, MAX_JOBS);
    label = `restyle matrix · ${shape.packs.length} looks (native mode) + house light/dark × ${variants.length} modules = ${shape.jobs} cells · ${pendingTotal} still unverified · this run ${jobs.length}${SHARDS > 1 ? ` (shard ${SHARD}/${SHARDS})` : ""}`;
  } else {
    const swept = sampleVariants(variants, SAMPLE);
    jobs = [];
    for (const pack of [...packs, null]) {
      for (const mode of ["light", "dark"]) {
        for (const v of swept) jobs.push([v, pack, mode]);
      }
    }
    label = `${packs.length} looks × ${swept.length}/${variants.length} modules × 2 modes = ${jobs.length} exports (${FULL ? "full" : "sampled"})`;
  }
  console.log(`export-verify: ${label}`);

  if (jobs.length === 0) {
    console.log("Nothing to sweep — the coverage ledger already has every cell of this matrix.");
  }

  const rows = [];
  let done = 0;

  let writing = null;
  /** Merge everything swept so far into the on-disk ledger (crash-safe resume). */
  async function checkpoint() {
    if (writing) return writing;
    writing = (async () => {
      const merged = mergeCoverage(
        ledgerBefore,
        rows.filter((r) => r.ok),
        shape,
      );
      await mkdir(path.dirname(PROGRESS), { recursive: true });
      await writeFile(PROGRESS, `${JSON.stringify(merged, null, 2)}\n`);
    })().finally(() => {
      writing = null;
    });
    return writing;
  }

  /** One worker owns a page and drains batches from the shared queue. */
  async function worker(slice) {
    let page = slice.length && WORKERS > 1 ? await boot(browser) : page0;
    for (let i = 0; i < slice.length; i += BATCH) {
      const batch = slice.slice(i, i + BATCH);
      try {
        rows.push(...(await page.evaluate((j) => window.__tpExportVerify.run(j), batch)));
      } catch (err) {
        // A harness page crash must not be reported as an export regression:
        // reboot and retry the batch one job at a time.
        console.warn(`  harness restart: ${String(err).slice(0, 120)}`);
        page = await boot(browser);
        for (const job of batch) {
          try {
            rows.push(...(await page.evaluate((j) => window.__tpExportVerify.run(j), [job])));
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
      done += batch.length;
      // Checkpoint the ledger as we go: a multi-hour matrix must never lose the
      // cells it already verified because the run was interrupted.
      if (UPDATE && RESTYLE && done % (BATCH * 8) < BATCH) await checkpoint();
      process.stdout.write(
        `  ${Math.min(done, jobs.length)}/${jobs.length} · failures ${rows.filter((r) => !r.ok).length}\r`,
      );
    }
  }

  const slices = Array.from({ length: WORKERS }, (_, w) =>
    jobs.filter((_, i) => i % WORKERS === w),
  );
  await Promise.all(slices.map((s) => worker(s)));
  console.log("");

  // ---------------------------------------------------------------------------
  // Object-tree diff: element-level comparison against the stored baseline.
  // Runs in the page so the diff logic stays single-sourced in TypeScript.
  // ---------------------------------------------------------------------------
  const tree = { regressions: [], updated: 0, compared: 0, missing: 0 };
  if (TREE_ENABLED) {
    const stored = existsSync(TREE_SNAPSHOT)
      ? JSON.parse(await readFile(TREE_SNAPSHOT, "utf8"))
      : { generatedAt: null, trees: {} };
    const trees = stored.trees ?? {};

    for (const row of rows) {
      if (!row.layers || row.layers.length === 0) continue;
      const key = keyOf(row);
      const baseline = trees[key];
      if (!baseline) {
        tree.missing += 1;
        trees[key] = await page0.evaluate((r) => window.__tpExportVerify.snapshot(r), row);
        tree.updated += 1;
        continue;
      }
      const diff = await page0.evaluate(
        ([b, r]) => window.__tpExportVerify.diff(b, r),
        [baseline, row],
      );
      tree.compared += 1;
      if (!diff.ok) tree.regressions.push({ key, lines: diff.regressions });
      if (TREE_UPDATE) {
        trees[key] = await page0.evaluate((r) => window.__tpExportVerify.snapshot(r), row);
        tree.updated += 1;
      }
    }

    if (tree.regressions.length && !TREE_UPDATE) {
      console.error(
        `\nOBJECT-TREE REGRESSION: ${tree.regressions.length} of ${tree.compared} exports lost or degraded elements.`,
      );
      for (const r of tree.regressions) {
        console.error(`  ✗ ${r.key}`);
        for (const line of r.lines) console.error(`      ${line}`);
      }
      console.error(
        "\nReview each element above. If the change is intended, re-run with --update-tree.",
      );
      await browser.close();
      process.exit(1);
    }

    if (tree.updated > 0) {
      await mkdir(path.dirname(TREE_SNAPSHOT), { recursive: true });
      await writeFile(
        TREE_SNAPSHOT,
        `${JSON.stringify({ generatedAt: new Date().toISOString(), trees }, null, 2)}\n`,
      );
      console.log(
        `Object trees: ${tree.compared} compared, ${tree.updated} written (${tree.missing} new cells) → ${path.relative(process.cwd(), TREE_SNAPSHOT)}`,
      );
    } else {
      console.log(`Object trees: ${tree.compared} compared, no element-level regressions.`);
    }
  }

  await browser.close();

  // Icon parity: layer-presence auditing alone would let a deck ship with half
  // its icon wells empty and still pass green, so a nonzero miss count is a
  // hard failure of the sweep in its own right.
  const iconMissRows = rows.filter((r) => (r.iconsMissing ?? 0) > 0);
  const iconsMissing = iconMissRows.reduce((n, r) => n + (r.iconsMissing ?? 0), 0);
  const iconsRequested = rows.reduce((n, r) => n + (r.iconsRequested ?? 0), 0);
  console.log(`Icons: ${iconsRequested - iconsMissing}/${iconsRequested} glyphs embedded.`);

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

  if (iconsMissing > 0) {
    console.error(`\nICON REGRESSION: ${iconsMissing} icon glyph(s) failed to embed.`);
    for (const r of iconMissRows) {
      console.error(`  ✗ ${keyOf(r)} — ${r.iconsMissing}/${r.iconsRequested} missing`);
    }
    process.exit(1);
  }

  console.log(`\nAll ${rows.length} exports passed (backgrounds + layers intact).`);

  if (!UPDATE) return;

  // ---------------------------------------------------------------------------
  // Coverage ledger: accumulate the cells this run verified so the restyle
  // matrix can be finished across many runs and the gate can tell, cell by
  // cell, whether it is actually complete.
  // ---------------------------------------------------------------------------
  const ledger = mergeCoverage(
    ledgerBefore,
    rows.filter((r) => r.ok),
    shape,
  );
  await mkdir(path.dirname(COVERAGE), { recursive: true });
  await writeFile(COVERAGE, `${JSON.stringify(ledger, null, 2)}\n`);
  await mkdir(path.dirname(PROGRESS), { recursive: true });
  await writeFile(PROGRESS, `${JSON.stringify(ledger, null, 2)}\n`);
  const stillMissing = remainingJobs(ledger, shape).length;
  const complete = stillMissing === 0;
  console.log(
    `Coverage ledger: ${shape.jobs - stillMissing}/${shape.jobs} restyle cells verified${complete ? " — matrix complete" : ` · ${stillMissing} remaining (npm run verify:restyle)`} → ${path.relative(process.cwd(), COVERAGE)}`,
  );

  // Coverage is now derived from the ledger, so a sampled run can never claim
  // (or silently downgrade) full coverage.
  const sweptVariants = complete
    ? []
    : [...new Set(ledger ? Object.values(ledger.cells).flat() : [])].sort();
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
        coverage: complete ? "full" : "sampled",
        verifiedCells: shape.jobs - stillMissing,
        sampledVariants: sweptVariants,
        allowedProblems: allowed,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Manifest refreshed: ${path.relative(process.cwd(), MANIFEST)} (${shape.fingerprint})`,
  );
}

/** Mirror of the FNV-1a digest in src/lib/export-matrix.ts. */
function fingerprintFrom(variantIds, packIds, packModes = {}) {
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
    // Packs are single-mode by design, so only the house look has two cells.
    packModes,
    jobs: (packs.length + 2) * variants.length,
    fingerprint: (h >>> 0).toString(16).padStart(8, "0"),
  };
}

main().catch((err) => {
  console.error("export-verify sweep crashed:", err);
  process.exit(1);
});
