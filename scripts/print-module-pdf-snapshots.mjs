#!/usr/bin/env node
/**
 * PRINT MODULE PDF SNAPSHOT GATE
 * ==============================
 *
 * WHAT IT PROVES
 * --------------
 * A representative print section module, rendered through the production
 * renderer and exported through the production `exportPrintAssetAsPdf` path,
 * still rasterizes to (almost) the same page it did when the baseline was
 * recorded. It catches:
 *   - section renderer layout drift (spacing, column counts, type scale)
 *   - iconography treatment drift (size / stroke / accent)
 *   - export-pipeline regressions (vector-text placement, trim geometry,
 *     authoring chrome leaking into the PDF)
 *
 * WHAT IT DOES NOT PROVE
 * ----------------------
 * Nothing about how a print vendor's RIP or Acrobat renders the file, and
 * nothing about content quality. It is a DRIFT DETECTOR against our own
 * previous output, rasterized by poppler.
 *
 * HOW
 * ---
 * 1. Drive /dev/print-module-pdf?ids=... in headless Chromium and download the
 *    PDF the real export button produces.
 * 2. Assert page geometry with pdfinfo (Letter trim, one page per module).
 * 3. Rasterize each page with pdftoppm at a fixed raster width and pixel-diff
 *    against tests/snapshots/print-modules/<id>.<mode>.png.
 * 4. Fail when the mismatch ratio exceeds the tolerance (default 0.5%).
 *
 * USAGE
 *   node scripts/print-module-pdf-snapshots.mjs --update     # record baselines
 *   node scripts/print-module-pdf-snapshots.mjs              # local check
 *   node scripts/print-module-pdf-snapshots.mjs --ci         # gate (exit 1)
 *
 * FLAGS
 *   --url <base>       harness origin (default http://localhost:8080)
 *   --id <moduleId>    restrict to module id(s), repeatable
 *   --modes light,dark modes to sweep (default light)
 *   --tolerance 0.005  allowed mismatched-pixel ratio
 *   --update           write/refresh baselines instead of comparing
 *   --ci               exit non-zero on any drift or missing baseline
 *   --out <dir>        artifact dir (default artifacts/print-module-pdf)
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const run = promisify(execFile);
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const values = (n) =>
  argv.reduce((a, v, i) => (v === `--${n}` && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

const BASE = value("url", "http://localhost:8080");
const OUT = value("out", "artifacts/print-module-pdf");
const BASELINE_DIR = "tests/snapshots/print-modules";
const MANIFEST = path.join(BASELINE_DIR, "manifest.json");
const TOLERANCE = Number(value("tolerance", "0.005"));
const UPDATE = flag("update");
const CI = flag("ci");
const MODES = value("modes", "light")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

/**
 * Representative set: one module per family, chosen as the variant the curated
 * collateral uses most. Keeping it to one per family keeps the gate under a
 * minute while still touching every renderer file group.
 */
const REPRESENTATIVE = [
  "pm-narrative-narrative-tri-card",
  "pm-stats-kpi-dashboard-portrait",
  "pm-quote-pull-quote-hero",
  "pm-logo-grid-logo-grid-portrait",
  "pm-expertise-expertise-icon-strip",
  "pm-feature-list-feature-cards-3col",
  "pm-table-table-spec-rows",
  "pm-contact-contact-expert-card",
];

/** Fixed raster width — diffs must never depend on the machine's DPI. */
const RASTER_W = 816;
/** Letter trim in points, as pdfinfo reports it. */
const EXPECT_PTS = { w: 612, h: 792 };

const ids = values("id");
const MODULES = ids.length > 0 ? ids : REPRESENTATIVE;

/**
 * Chromium resolution mirrors scripts/pixel-diff-exports.mjs: the sandbox/CI
 * image often ships a different chromium build than the pinned playwright
 * package expects, so fall back to the newest cached build instead of dying.
 */
async function launchChromium() {
  const envExe = process.env.PW_CHROME || process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (envExe && existsSync(envExe)) {
    return await chromium.launch({ headless: true, executablePath: envExe });
  }
  try {
    return await chromium.launch({ headless: true });
  } catch (err) {
    for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/ms-playwright"]) {
      if (!root || !existsSync(root)) continue;
      const dirs = readdirSync(root)
        .filter((d) => d.startsWith("chromium"))
        .sort((a, b) => Number(/(\d+)$/.exec(b)?.[1] ?? 0) - Number(/(\d+)$/.exec(a)?.[1] ?? 0));
      for (const dir of dirs) {
        for (const rel of ["chrome-linux/chrome", "chrome-linux/headless_shell"]) {
          const exe = path.join(root, dir, rel);
          if (existsSync(exe)) return await chromium.launch({ headless: true, executablePath: exe });
        }
      }
    }
    throw err;
  }
}

async function rasterize(pdfPath, outPrefix) {
  await run("pdftoppm", [
    "-png",
    "-scale-to-x",
    String(RASTER_W),
    "-scale-to-y",
    "-1",
    pdfPath,
    outPrefix,
  ]);
}

async function pageGeometry(pdfPath) {
  const { stdout } = await run("pdfinfo", [pdfPath]);
  const pages = Number(/Pages:\s+(\d+)/.exec(stdout)?.[1] ?? 0);
  const size = /Page size:\s+([\d.]+) x ([\d.]+)/.exec(stdout);
  return { pages, w: Number(size?.[1] ?? 0), h: Number(size?.[2] ?? 0) };
}

function diff(aBuf, bBuf) {
  const a = PNG.sync.read(aBuf);
  const b = PNG.sync.read(bBuf);
  if (a.width !== b.width || a.height !== b.height) {
    return { ratio: 1, out: null, sizeMismatch: `${a.width}x${a.height} vs ${b.width}x${b.height}` };
  }
  const out = new PNG({ width: a.width, height: a.height });
  const mismatched = pixelmatch(a.data, b.data, out.data, a.width, a.height, {
    threshold: 0.1,
    includeAA: true,
  });
  return { ratio: mismatched / (a.width * a.height), out, sizeMismatch: null };
}

async function exportModulesPdf(page, mode, moduleIds, pdfPath) {
  const url = `${BASE}/dev/print-module-pdf?ids=${encodeURIComponent(moduleIds.join(","))}&mode=${mode}`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("html[data-pdf-harness-ready='1']", { timeout: 120_000 });
  const count = await page.locator("[data-print-page]").count();
  if (count !== moduleIds.length) {
    throw new Error(`harness rendered ${count} pages, expected ${moduleIds.length}`);
  }
  const download = page.waitForEvent("download", { timeout: 300_000 });
  await page.getByTestId("harness-export-pdf").click();
  const dl = await download;
  await dl.saveAs(pdfPath);
  const status = await page.getByTestId("harness-status").getAttribute("data-status");
  if (status === "error") {
    const text = await page.getByTestId("harness-status").innerText();
    throw new Error(`harness export failed — ${text}`);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  await mkdir(BASELINE_DIR, { recursive: true });
  const browser = await launchChromium();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1800 },
    acceptDownloads: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.warn("  browser error:", m.text().slice(0, 180));
  });

  const results = [];
  let failures = 0;

  for (const mode of MODES) {
    const pdfPath = path.join(OUT, `print-modules.${mode}.pdf`);
    console.log(`\n▸ exporting ${MODULES.length} modules (${mode})`);
    await exportModulesPdf(page, mode, MODULES, pdfPath);

    const geo = await pageGeometry(pdfPath);
    const geoOk =
      geo.pages === MODULES.length &&
      Math.abs(geo.w - EXPECT_PTS.w) < 1 &&
      Math.abs(geo.h - EXPECT_PTS.h) < 1;
    if (!geoOk) {
      failures++;
      console.log(
        `  ✗ geometry: ${geo.pages} pages @ ${geo.w}×${geo.h}pt (expected ${MODULES.length} @ ${EXPECT_PTS.w}×${EXPECT_PTS.h}pt)`,
      );
    } else {
      console.log(`  ✓ geometry: ${geo.pages} pages @ ${geo.w}×${geo.h}pt`);
    }

    const prefix = path.join(OUT, `page.${mode}`);
    await rasterize(pdfPath, prefix);
    const pad = String(MODULES.length).length;

    for (let i = 0; i < MODULES.length; i++) {
      const id = MODULES[i];
      const n = String(i + 1).padStart(pad === 1 ? 1 : pad, "0");
      const candidate = `${prefix}-${n}.png`;
      if (!existsSync(candidate)) {
        failures++;
        console.log(`  ✗ ${id}: rasterized page missing (${candidate})`);
        continue;
      }
      const buf = await readFile(candidate);
      const baseline = path.join(BASELINE_DIR, `${id}.${mode}.png`);

      if (UPDATE) {
        await writeFile(baseline, buf);
        const png = PNG.sync.read(buf);
        results.push({ id, mode, w: png.width, h: png.height, ratio: 0 });
        console.log(`  ● recorded ${id} (${png.width}×${png.height})`);
        continue;
      }

      if (!existsSync(baseline)) {
        failures++;
        console.log(`  ✗ ${id}: no baseline — run with --update`);
        continue;
      }
      const { ratio, out, sizeMismatch } = diff(buf, await readFile(baseline));
      const ok = !sizeMismatch && ratio <= TOLERANCE;
      results.push({ id, mode, ratio: Number(ratio.toFixed(5)) });
      if (!ok) {
        failures++;
        if (out) await writeFile(path.join(OUT, `diff.${id}.${mode}.png`), PNG.sync.write(out));
        await writeFile(path.join(OUT, `actual.${id}.${mode}.png`), buf);
        console.log(
          `  ✗ ${id}: ${sizeMismatch ? `size ${sizeMismatch}` : `${(ratio * 100).toFixed(2)}% pixels differ (tol ${(TOLERANCE * 100).toFixed(2)}%)`}`,
        );
      } else {
        console.log(`  ✓ ${id}: ${(ratio * 100).toFixed(3)}% differ`);
      }
    }
    await rm(pdfPath, { force: true }).catch(() => {});
  }

  await browser.close();

  if (UPDATE) {
    await writeFile(
      MANIFEST,
      `${JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          harness: "/dev/print-module-pdf",
          exportFormat: "digital + vectorText",
          pageSize: "Letter",
          rasterWidth: RASTER_W,
          tolerance: TOLERANCE,
          modules: MODULES,
          modes: MODES,
          pages: results,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`\nBaselines written to ${BASELINE_DIR} (${results.length} page(s)).`);
    return;
  }

  console.log(`\n${failures === 0 ? "PASS" : `FAIL — ${failures} issue(s)`}`);
  if (failures > 0 && CI) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
