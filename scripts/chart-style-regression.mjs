#!/usr/bin/env node
/**
 * CHART STYLE VISUAL REGRESSION (screenshot-based)
 * ================================================
 *
 * WHAT IT DOES
 * ------------
 * For every chart/graph module in scope it:
 *   1. exports the real .pptx from the shipping export path (dev harness),
 *   2. OPENS that package with a renderer and screenshots slide 1,
 *   3. screenshots the deck preview of the same slide (the exporter's own stage
 *      raster — the on-screen reference users compare against),
 *   4. masks everything except the exporter's own chart/graphic rects (text
 *      boxes subtracted), and pixel-diffs that region,
 *   5. measures FILL, STROKE, GRADIENT and TRACK styling on both sides and
 *      reports the deltas (see scripts/lib/chart-style-metrics.mjs),
 *   6. gates on absolute floors AND on drift from a recorded baseline.
 *
 * HONEST FRAMING (same as pixel-diff-exports.mjs / chart-parity.mjs)
 * -----------------------------------------------------------------
 * With `--renderer libreoffice` (default, offline) the export side is rendered
 * by LibreOffice, which is NOT PowerPoint: its gradient interpolation, blend
 * handling and text layout differ. So absolute numbers are not a statement of
 * PowerPoint fidelity — they are a DRIFT DETECTOR plus a break detector for the
 * failure classes we actually keep hitting (a fill exported flat, a track lost,
 * an arc stroked too heavily, an accent hue flipped by tone mapping).
 * `--renderer powerpoint` renders with real Office through the Microsoft
 * PowerPoint connection and is ground truth when its credentials are present.
 *
 * Text is always masked out, so font substitution cannot move these numbers.
 *
 * USAGE
 *   node scripts/chart-style-regression.mjs --sample 6                 # smoke
 *   node scripts/chart-style-regression.mjs --all --update             # record baseline
 *   node scripts/chart-style-regression.mjs --all --ci                 # gate
 *
 * FLAGS
 *   --url <base>        harness origin (default http://localhost:8080)
 *   --sample N          evenly-spaced chart modules (default 6)
 *   --all               every chart module the harness reports
 *   --variant ID        restrict to specific id(s), repeatable
 *   --modes light,dark  modes to sweep (default light)
 *   --fidelity F        editable (shipping default) | layered | exact
 *   --renderer R        libreoffice (default, offline) | powerpoint (real Office)
 *   --min-fill 0.9      fill/colour histogram similarity floor
 *   --max-stroke 0.08   allowed stroke-ink fraction delta
 *   --max-gradient 0.1  allowed gradient-ramp fraction delta
 *   --max-track 0.08    allowed track-tint fraction delta
 *   --max-hue 18        allowed accent hue rotation, degrees
 *   --tolerance 0.04    allowed drift from the recorded baseline per metric
 *   --update            record/refresh the baseline
 *   --ci                exit 1 on any flag or drift
 *   --out <dir>         artifacts (default artifacts/chart-style-regression)
 */
import { chromium } from "playwright";
import { readFile, writeFile, mkdir, readdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import {
  chartMask,
  compareStyle,
  dominantHue,
  flagStyle,
  styleDescriptor,
} from "./lib/chart-style-metrics.mjs";

const run = promisify(execFile);
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const values = (n) =>
  argv.reduce((a, v, i) => (v === `--${n}` && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const SAMPLE = Number(value("sample", 6));
const ALL = flag("all");
const ONLY = values("variant");
const MODES = value("modes", "light").split(",").filter(Boolean);
const FIDELITY = value("fidelity", "editable");
const RENDERER = value("renderer", "libreoffice");
const CI = flag("ci");
const UPDATE = flag("update");
const TOLERANCE = Number(value("tolerance", 0.04));
const OUT_DIR = path.resolve(value("out", "artifacts/chart-style-regression"));
const BASELINE = path.resolve(
  value("baseline", "tests/snapshots/chart-style-regression.baseline.json"),
);
const LIMITS = {
  minFill: Number(value("min-fill", 0.9)),
  maxStroke: Number(value("max-stroke", 0.08)),
  maxGradient: Number(value("max-gradient", 0.1)),
  maxTrack: Number(value("max-track", 0.08)),
  maxHueShift: Number(value("max-hue", 18)),
};

const W = 960;
const H = 540;
/** Same perceptual tolerance as the sibling gates, so scores stay comparable. */
const PIXELMATCH_THRESHOLD = 0.22;
/** Recycle the harness tab after this many cells to bound renderer memory. */
const RECYCLE_EVERY = 6;

/** Below this many comparable pixels the chart region is a sliver — unscored. */
const MIN_REGION_PIXELS = 8000;

async function launchChromium() {
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

async function assertTooling() {
  const bins =
    RENDERER === "powerpoint"
      ? [["pdftoppm", ["-v"]]]
      : [
          ["soffice", ["--version"]],
          ["pdftoppm", ["-v"]],
        ];
  for (const [bin, args] of bins) {
    try {
      await run(bin, args, { timeout: 120_000 });
    } catch (err) {
      throw new Error(
        `${bin} is not available (${String(err).slice(0, 120)}). Install libreoffice + poppler-utils.`,
      );
    }
  }
  if (
    RENDERER === "powerpoint" &&
    !(process.env.LOVABLE_API_KEY && process.env.MICROSOFT_POWERPOINT_API_KEY)
  ) {
    throw new Error(
      "renderer=powerpoint needs the Microsoft PowerPoint connection. Re-run with --renderer libreoffice for the offline check.",
    );
  }
}

async function boot(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") console.error("  [page error]", m.text().slice(0, 160));
  });
  await page.goto(`${BASE_URL}/dev/export-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("!!window.__tpExportVerify", null, { timeout: 120_000 });
  return page;
}

async function pdfToPng(pdfPath, workDir) {
  await run(
    "pdftoppm",
    [
      "-png",
      "-r",
      "96",
      "-f",
      "1",
      "-l",
      "1",
      "-scale-to-x",
      String(W),
      "-scale-to-y",
      String(H),
      pdfPath,
      path.join(workDir, "page"),
    ],
    { timeout: 120_000 },
  );
  const png = (await readdir(workDir)).find((f) => f.startsWith("page") && f.endsWith(".png"));
  if (!png) throw new Error("pdftoppm produced no PNG");
  return path.join(workDir, png);
}

/** Open the exported package and screenshot slide 1 at the comparison size. */
async function renderPptxToPng(pptxPath, workDir) {
  if (RENDERER === "powerpoint") {
    const { renderPptxWithPowerPoint, deleteDriveItem } = await import("./render-via-powerpoint.mjs");
    const rendered = await renderPptxWithPowerPoint(
      await readFile(pptxPath),
      `chart-style-${path.basename(workDir)}-${Date.now()}.pptx`,
    );
    const pdf = path.join(workDir, "office.pdf");
    await writeFile(pdf, rendered.pdf);
    await deleteDriveItem(rendered.itemId);
    return await pdfToPng(pdf, workDir);
  }
  const profile = path.join(workDir, "lo-profile");
  await run(
    "soffice",
    [
      `-env:UserInstallation=file://${profile}`,
      "--headless",
      "--norestore",
      "--convert-to",
      "pdf",
      "--outdir",
      workDir,
      pptxPath,
    ],
    { timeout: 180_000 },
  );
  const pdf = path.join(workDir, `${path.basename(pptxPath, ".pptx")}.pdf`);
  if (!existsSync(pdf)) throw new Error("LibreOffice produced no PDF");
  return await pdfToPng(pdf, workDir);
}

/** Region-restricted pixelmatch: neutralize everything outside the mask. */
function regionScore(reference, exported, mask, count) {
  const a = Buffer.from(reference.data);
  const b = Buffer.from(exported.data);
  for (let i = 0; i < W * H; i += 1) {
    if (mask[i]) continue;
    const p = i * 4;
    a[p] = a[p + 1] = a[p + 2] = 0;
    a[p + 3] = 255;
    b[p] = b[p + 1] = b[p + 2] = 0;
    b[p + 3] = 255;
  }
  const diff = new PNG({ width: W, height: H });
  const mismatched = pixelmatch(a, b, diff.data, W, H, {
    threshold: PIXELMATCH_THRESHOLD,
    includeAA: false,
    alpha: 0.3,
  });
  return { score: Number((1 - mismatched / count).toFixed(4)), mismatched, diff };
}

/** preview | export | diff contact strip, the artifact a human triages from. */
function contactStrip(reference, exported, diff) {
  const strip = new PNG({ width: W * 3, height: H });
  const blit = (src, dx) => {
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const s = (y * W + x) * 4;
        const d = (y * W * 3 + x + dx) * 4;
        strip.data[d] = src.data[s];
        strip.data[d + 1] = src.data[s + 1];
        strip.data[d + 2] = src.data[s + 2];
        strip.data[d + 3] = 255;
      }
    }
  };
  blit(reference, 0);
  blit(exported, W);
  blit(diff, W * 2);
  return strip;
}

function keyOf(r) {
  return `${r.variantId}@${r.mode}@${FIDELITY}`;
}

function quantiles(nums) {
  const s = [...nums].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] ?? null;
  return { n: s.length, min: s[0] ?? null, median: at(0.5), p90: at(0.9), max: s[s.length - 1] ?? null };
}

async function main() {
  await assertTooling();
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await launchChromium();
  let page = await boot(browser);
  let variants = await page.evaluate(() => window.__tpExportVerify.chartVariants ?? []);
  if (!variants.length) throw new Error("harness reported no chart variants");
  if (ONLY.length) variants = variants.filter((v) => ONLY.includes(v));
  else if (!ALL && SAMPLE < variants.length) {
    const step = variants.length / SAMPLE;
    variants = [
      ...new Set(Array.from({ length: SAMPLE }, (_, i) => variants[Math.floor(i * step)])),
    ];
  }

  const jobs = [];
  for (const mode of MODES) for (const v of variants) jobs.push([v, null, mode, FIDELITY]);
  console.log(
    `chart STYLE regression (renderer=${RENDERER}${
      RENDERER === "powerpoint" ? " — real Office, ground truth" : " — ADVISORY, LibreOffice is not PowerPoint"
    }):\n` +
      `  ${variants.length} chart module(s) × ${MODES.length} mode(s) = ${jobs.length} cell(s)\n` +
      `  fidelity=${FIDELITY} · fill≥${LIMITS.minFill} strokeΔ≤${LIMITS.maxStroke} gradientΔ≤${LIMITS.maxGradient} trackΔ≤${LIMITS.maxTrack} hue≤${LIMITS.maxHueShift}°`,
  );

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "chart-style-"));
  const rows = [];

  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const label = `${job[0]}@${job[2]}`;
    const safe = label.replace(/[^a-z0-9@.-]/gi, "_");
    // One long-lived tab accumulates every rasterized backdrop of every cell and
    // eventually dies with ERR_INSUFFICIENT_RESOURCES / "execution context was
    // destroyed", which read as chart failures but are really tab exhaustion.
    // Recycle the tab periodically, and retry a cell once on a fresh tab.
    if (i > 0 && i % RECYCLE_EVERY === 0) {
      await page.context().close().catch(() => {});
      page = await boot(browser);
    }
    let cap;
    let captureErr = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        [cap] = await page.evaluate((j) => window.__tpExportVerify.pixel([j]), job);
        captureErr = null;
        break;
      } catch (err) {
        captureErr = err;
        await page.context().close().catch(() => {});
        page = await boot(browser);
      }
    }
    if (captureErr) {
      rows.push({
        variantId: job[0],
        mode: job[2],
        flagged: true,
        reasons: [`capture threw: ${String(captureErr).slice(0, 140)}`],
      });
      console.log(`  ${i + 1}/${jobs.length} ${label} · ERROR capture threw`);
      continue;
    }
    if (!cap?.pptx || !cap?.build) {
      rows.push({
        variantId: job[0],
        mode: job[2],
        flagged: true,
        reasons: [cap?.error ?? "capture incomplete"],
      });
      console.log(`  ${i + 1}/${jobs.length} ${label} · ERROR ${cap?.error ?? "capture incomplete"}`);
      continue;
    }

    const cellDir = path.join(tmpRoot, safe);
    await mkdir(cellDir, { recursive: true });
    const row = { variantId: cap.variantId, mode: cap.mode, fidelity: FIDELITY, flagged: false, reasons: [] };
    try {
      const pptxPath = path.join(cellDir, "deck.pptx");
      await writeFile(pptxPath, Buffer.from(cap.pptx, "base64"));
      const exportPngPath = await renderPptxToPng(pptxPath, cellDir);

      const reference = PNG.sync.read(Buffer.from(cap.build, "base64"));
      const exported = PNG.sync.read(await readFile(exportPngPath));
      if (reference.width !== W || exported.width !== W) {
        throw new Error(
          `raster size mismatch (preview ${reference.width}×${reference.height}, export ${exported.width}×${exported.height})`,
        );
      }

      const { mask, count } = chartMask(W, H, cap.graphicRects, cap.textRects);
      row.graphicObjects = (cap.graphicRects ?? []).length;
      row.regionPixels = count;
      if (count < MIN_REGION_PIXELS) {
        row.flagged = true;
        row.reasons.push(
          (cap.graphicRects ?? []).length === 0
            ? "export emitted no graphic objects — the chart probably fell back to text"
            : `chart region is only ${count}px after text masking (floor ${MIN_REGION_PIXELS})`,
        );
      } else {
        // One reference hue for BOTH sides, so a lost fill colour cannot silently
        // drag the track measurement along with it.
        const hue = dominantHue(reference, mask);
        const metrics = compareStyle(
          styleDescriptor(reference, mask, hue),
          styleDescriptor(exported, mask, hue),
        );
        const { score, mismatched, diff } = regionScore(reference, exported, mask, count);
        Object.assign(row, metrics, { chartScore: score, mismatched });
        row.reasons = flagStyle(metrics, LIMITS);
        row.flagged = row.reasons.length > 0;

        const stripPath = path.join(OUT_DIR, `${safe}.png`);
        await writeFile(stripPath, PNG.sync.write(contactStrip(reference, exported, diff)));
        row.strip = path.relative(process.cwd(), stripPath);
      }
      console.log(
        `  ${i + 1}/${jobs.length} ${label} · chart ${row.chartScore ?? "—"} · fill ${
          row.fillScore ?? "—"
        } · strokeΔ ${row.strokeDelta ?? "—"} · gradΔ ${row.gradientDelta ?? "—"} · trackΔ ${
          row.trackDelta ?? "—"
        } · hue ${row.hueShift ?? "—"}°${row.flagged ? `  ⚠️ ${row.reasons[0]}` : ""}`,
      );
    } catch (err) {
      row.flagged = true;
      row.reasons.push(String(err).slice(0, 200));
      console.log(`  ${i + 1}/${jobs.length} ${label} · ERROR ${String(err).slice(0, 140)}`);
    }
    rows.push(row);
  }

  await browser.close();
  await rm(tmpRoot, { recursive: true, force: true });

  // ---- baseline drift ------------------------------------------------------
  // Absolute floors above catch outright breaks. Drift catches slow erosion:
  // a module that has always sat at trackΔ 0.05 is not a regression, one that
  // moved from 0.01 to 0.05 is.
  const prev = existsSync(BASELINE) ? JSON.parse(await readFile(BASELINE, "utf8")) : null;
  const prevCells = prev?.cells ?? {};
  const drift = [];
  const fresh = [];
  const DRIFT_METRICS = [
    ["fillScore", "down"],
    ["chartScore", "down"],
    ["strokeDelta", "up"],
    ["gradientDelta", "up"],
    ["trackDelta", "up"],
    ["edgeDelta", "up"],
  ];
  for (const r of rows) {
    const base = prevCells[keyOf(r)];
    if (!base) {
      fresh.push(keyOf(r));
      continue;
    }
    for (const [metric, dir] of DRIFT_METRICS) {
      const a = base[metric];
      const b = r[metric];
      if (typeof a !== "number" || typeof b !== "number") continue;
      const worse = dir === "down" ? b < a - TOLERANCE : b > a + TOLERANCE;
      if (worse) drift.push({ key: keyOf(r), metric, from: a, to: b, strip: r.strip });
    }
  }

  const flagged = rows.filter((r) => r.flagged);
  const scored = rows.filter((r) => typeof r.chartScore === "number");
  const stats = quantiles(scored.map((r) => r.chartScore));

  const report = {
    generatedAt: new Date().toISOString(),
    renderer: RENDERER,
    fidelity: FIDELITY,
    limits: LIMITS,
    tolerance: TOLERANCE,
    advisory: RENDERER !== "powerpoint",
    chartScore: stats,
    flagged: flagged.length,
    drift,
    fresh,
    rows: rows.map((r) => ({ ...r, histogram: undefined })),
  };
  await writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(
    path.join(OUT_DIR, "report.md"),
    [
      "# Chart style visual regression",
      "",
      `Generated ${report.generatedAt} · renderer \`${RENDERER}\` · fidelity \`${FIDELITY}\` · ${rows.length} cell(s) · **${flagged.length} flagged**, ${drift.length} drifted`,
      "",
      "Each row screenshots the exported .pptx (slide 1) and the deck preview of the same slide, masks everything but the exporter's own chart rects, then compares fills, strokes, gradients and track tints.",
      "",
      "| module | mode | chartScore | fill | strokeΔ | edgeΔ | gradientΔ | trackΔ | hue° | status |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
      ...rows.map(
        (r) =>
          `| ${r.variantId} | ${r.mode} | ${r.chartScore ?? "—"} | ${r.fillScore ?? "—"} | ${
            r.strokeDelta ?? "—"
          } | ${r.edgeDelta ?? "—"} | ${r.gradientDelta ?? "—"} | ${r.trackDelta ?? "—"} | ${r.hueShift ?? "—"} | ${
            r.flagged ? `⚠️ ${r.reasons.join("; ")}` : "ok"
          } |`,
      ),
    ].join("\n") + "\n",
  );

  console.log(
    `\nchartScore n=${stats.n} min=${stats.min} median=${stats.median} p90=${stats.p90} max=${stats.max}`,
  );
  for (const r of flagged) console.log(`  ⚠️ ${keyOf(r)}: ${r.reasons.join("; ")}`);
  if (fresh.length) console.log(`\n${fresh.length} cell(s) have no baseline yet (recorded, not gated).`);
  if (drift.length) {
    console.log(`\nDRIFT from baseline (${drift.length}):`);
    for (const d of drift) {
      console.log(`  ✗ ${d.key} [${d.metric}]: ${d.from} → ${d.to} · ${d.strip ?? "no strip"}`);
    }
  } else {
    console.log("\nNo drift beyond tolerance against the recorded baseline.");
  }
  console.log(`artifacts → ${path.relative(process.cwd(), OUT_DIR)}/report.md`);

  if (UPDATE) {
    const cells = { ...prevCells };
    for (const r of rows) {
      if (typeof r.chartScore !== "number") continue;
      cells[keyOf(r)] = {
        chartScore: r.chartScore,
        fillScore: r.fillScore,
        strokeDelta: r.strokeDelta,
        gradientDelta: r.gradientDelta,
        trackDelta: r.trackDelta,
        edgeDelta: r.edgeDelta,
        hueShift: r.hueShift,
        regionPixels: r.regionPixels,
      };
    }
    await mkdir(path.dirname(BASELINE), { recursive: true });
    await writeFile(
      BASELINE,
      `${JSON.stringify(
        { generatedAt: new Date().toISOString(), renderer: RENDERER, fidelity: FIDELITY, cells },
        null,
        2,
      )}\n`,
    );
    console.log(`baseline updated: ${path.relative(process.cwd(), BASELINE)} (${Object.keys(cells).length} cells)`);
  }

  if (CI && (flagged.length || drift.length)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
