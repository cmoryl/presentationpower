#!/usr/bin/env node
/**
 * CHART / GRAPH PARITY CHECK
 * ==========================
 *
 * HONEST FRAMING (same caveat as scripts/pixel-diff-exports.mjs)
 * -------------------------------------------------------------
 * The exported .pptx is rendered with LibreOffice, which is NOT PowerPoint. Its
 * text layout, gradient and blend handling differ. What this gate measures is:
 *
 *     "does the exported data graphic still occupy the same space, at the same
 *      geometry and the same ink density, as the on-screen reference render?"
 *
 * That is exactly the failure class we keep hitting on charts: donut gauges
 * exporting at the wrong thickness, diagrams dropping to bullets, bars losing
 * their axis, arcs rendering at the wrong radius. Those all move the score a
 * lot. Font substitution does not, because the text objects are masked out.
 *
 * WHAT IS SCORED
 * --------------
 *   frameScore    whole 960x540 frame, text included (context only)
 *   graphicScore  ONLY the union of the exporter's own graphic object rects
 *                 (shapes / icons / images / charts, plates + full-bleed
 *                 backdrops removed), with every text rect subtracted. This is
 *                 the number the gate flags on: it is where the chart lives.
 *   inkDelta      |graphic ink fraction (export) - (reference)| inside the same
 *                 region. Catches "the chart is there but 3x too thick" even
 *                 when edges happen to line up.
 *
 * A cell is FLAGGED when graphicScore < --min, or graphicScore is
 * uncomputable (no graphic objects at all — usually the fallback-to-bullets
 * regression), or inkDelta > --ink.
 *
 * USAGE
 *   node scripts/chart-parity.mjs --sample 6                # local smoke
 *   node scripts/chart-parity.mjs --all --modes light,dark   # full chart sweep
 *   node scripts/chart-parity.mjs --all --ci                 # exit 1 on flags
 *
 * FLAGS
 *   --url <base>       harness origin (default http://localhost:8080)
 *   --sample N         evenly-spaced chart modules to test (default 6)
 *   --all              every chart/graph module in scope
 *   --variant ID       restrict to specific id(s), repeatable
 *   --modes light,dark modes to sweep (default light)
 *   --fidelity F       editable | layered | exact (default editable = shipping)
 *   --renderer R       powerpoint (default, real Office) | libreoffice (offline)
 *   --min 0.9          graphicScore floor before a cell is flagged
 *   --ink 0.12         allowed ink-fraction delta inside the graphic region
 *   --ci               exit 1 when anything is flagged
 *   --out <dir>        artifacts (default artifacts/chart-parity)
 */
import { chromium } from "playwright";
import { readFile, writeFile, mkdir, readdir, mkdtemp } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { renderPptxWithPowerPoint, deleteDriveItem } from "./render-via-powerpoint.mjs";


const run = promisify(execFile);
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const values = (n) => argv.reduce((a, v, i) => (v === `--${n}` && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const SAMPLE = Number(value("sample", 6));
const ALL = flag("all");
const ONLY = values("variant");
const MODES = value("modes", "light").split(",").filter(Boolean);
const FIDELITY = value("fidelity", "editable");
const MIN_SCORE = Number(value("min", 0.9));
const MAX_INK_DELTA = Number(value("ink", 0.12));
const CI = flag("ci");
const OUT_DIR = path.resolve(value("out", "artifacts/chart-parity"));
/**
 * `powerpoint` renders each cell with REAL Office via the Microsoft PowerPoint
 * connection (ground truth: if this fails, the chart genuinely does not open or
 * draw in PowerPoint). `libreoffice` is the legacy local renderer — faster and
 * offline, but its chart plot-area scaling and text layout are not PowerPoint's.
 */
const RENDERER = value("renderer", "powerpoint");


const W = 960;
const H = 540;
/** Same perceptual tolerance as the pixel-diff gate, for comparable numbers. */
const PIXELMATCH_THRESHOLD = 0.22;
/** Grow graphic rects slightly so AA fringes and stroke caps stay inside. */
const GRAPHIC_PAD_PX = 3;
/** Shrink nothing, but grow text rects so glyph fringes are fully excluded. */
const TEXT_PAD_PX = 4;
/** Below this many comparable pixels the region score is noise. */
const MIN_REGION_PIXELS = 8000;

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

async function assertTooling() {
  const bins = RENDERER === "powerpoint" ? [["pdftoppm", ["-v"]]] : [["soffice", ["--version"]], ["pdftoppm", ["-v"]]];
  for (const [bin, args] of bins) {
    try {
      await run(bin, args, { timeout: 120_000 });
    } catch (err) {
      throw new Error(
        `${bin} is not available (${String(err).slice(0, 120)}). Install libreoffice + poppler-utils.`,
      );
    }
  }
  if (RENDERER === "powerpoint" && !(process.env.LOVABLE_API_KEY && process.env.MICROSOFT_POWERPOINT_API_KEY)) {
    throw new Error(
      "renderer=powerpoint needs the Microsoft PowerPoint connection (LOVABLE_API_KEY + MICROSOFT_POWERPOINT_API_KEY). Re-run with --renderer libreoffice for the offline advisory check.",
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

/** pdf -> png at exactly the comparison raster size. */
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

/** pptx -> pdf -> png at exactly the comparison raster size. */
async function renderPptxToPng(pptxPath, workDir) {
  if (RENDERER === "powerpoint") {
    // Office converts the package. A throw here means PowerPoint itself
    // refused the file — reported verbatim, never retried another way.
    const rendered = await renderPptxWithPowerPoint(
      await readFile(pptxPath),
      `chart-parity-${path.basename(workDir)}-${Date.now()}.pptx`,
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


/**
 * Build the comparison mask: 1 where a pixel COUNTS.
 * = union(graphic rects, padded) minus union(text rects, padded).
 */
function graphicMask(graphicRects, textRects) {
  const total = W * H;
  const mask = new Uint8Array(total);
  const paint = (rects, pad, value) => {
    for (const r of rects) {
      const x0 = Math.max(0, Math.floor(r.x * W) - pad);
      const y0 = Math.max(0, Math.floor(r.y * H) - pad);
      const x1 = Math.min(W, Math.ceil((r.x + r.w) * W) + pad);
      const y1 = Math.min(H, Math.ceil((r.y + r.h) * H) + pad);
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) mask[y * W + x] = value;
    }
  };
  paint(graphicRects, GRAPHIC_PAD_PX, 1);
  paint(textRects, TEXT_PAD_PX, 0);
  let count = 0;
  for (let i = 0; i < total; i += 1) if (mask[i]) count += 1;
  return { mask, count };
}

/**
 * Ink fraction = share of masked pixels that differ meaningfully from the local
 * background (approximated by the frame's median luminance). A chart drawn too
 * thick, or dropped entirely, changes this even when edges coincidentally align.
 */
function inkFraction(png, mask, count) {
  if (!count) return null;
  const lum = new Float32Array(count);
  let k = 0;
  for (let i = 0; i < W * H; i += 1) {
    if (!mask[i]) continue;
    const p = i * 4;
    lum[k++] = 0.299 * png.data[p] + 0.587 * png.data[p + 1] + 0.114 * png.data[p + 2];
  }
  const sorted = Float32Array.prototype.slice.call(lum).sort();
  const median = sorted[Math.floor(sorted.length / 2)];
  let ink = 0;
  for (let i = 0; i < lum.length; i += 1) if (Math.abs(lum[i] - median) > 24) ink += 1;
  return Number((ink / lum.length).toFixed(4));
}

/** Region-restricted pixelmatch: neutralize unmasked pixels on both sides. */
function regionScore(build, lo, mask, count) {
  const a = Buffer.from(build.data);
  const b = Buffer.from(lo.data);
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

function quantiles(scores) {
  const s = [...scores].sort((x, y) => x - y);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] ?? null;
  return { n: s.length, min: s[0] ?? null, median: at(0.5), p90: at(0.9), max: s[s.length - 1] ?? null };
}

async function main() {
  await assertTooling();
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await launchChromium();
  const page = await boot(browser);
  let variants = await page.evaluate(() => window.__tpExportVerify.chartVariants ?? []);
  if (!variants.length) throw new Error("harness reported no chart variants");
  if (ONLY.length) variants = variants.filter((v) => ONLY.includes(v));
  else if (!ALL && SAMPLE < variants.length) {
    const step = variants.length / SAMPLE;
    variants = [...new Set(Array.from({ length: SAMPLE }, (_, i) => variants[Math.floor(i * step)]))];
  }

  const jobs = [];
  for (const mode of MODES) for (const v of variants) jobs.push([v, null, mode, FIDELITY]);
  console.log(
    `chart parity (renderer=${RENDERER}${RENDERER === "powerpoint" ? " — real Office render, ground truth" : " — ADVISORY, LibreOffice is not PowerPoint"}):\n` +
      `  ${variants.length} chart module(s) × ${MODES.length} mode(s) = ${jobs.length} cell(s)\n` +
      `  fidelity=${FIDELITY} floor graphicScore≥${MIN_SCORE} inkDelta≤${MAX_INK_DELTA}`,
  );

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "chart-parity-"));
  const rows = [];
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const label = `${job[0]}@${job[2]}`;
    const safe = label.replace(/[^a-z0-9@.-]/gi, "_");
    let cap;
    try {
      [cap] = await page.evaluate((j) => window.__tpExportVerify.pixel([j]), job);
    } catch (err) {
      rows.push({ variantId: job[0], mode: job[2], flagged: true, reason: `capture threw: ${String(err).slice(0, 140)}` });
      continue;
    }
    if (!cap?.pptx || !cap?.build) {
      rows.push({ variantId: job[0], mode: job[2], flagged: true, reason: cap?.error ?? "no capture" });
      console.log(`  ${i + 1}/${jobs.length} ${label} · FLAG (${cap?.error ?? "no capture"})`);
      continue;
    }

    const workDir = path.join(tmpRoot, safe);
    await mkdir(workDir, { recursive: true });
    try {
      const pptxPath = path.join(workDir, "cell.pptx");
      await writeFile(pptxPath, Buffer.from(cap.pptx, "base64"));
      const renderPng = await renderPptxToPng(pptxPath, workDir);
      await writeFile(path.join(OUT_DIR, `${safe}.render.png`), await readFile(renderPng));
      const lo = PNG.sync.read(await readFile(renderPng));
      const build = PNG.sync.read(Buffer.from(cap.build, "base64"));
      if (lo.width !== W || lo.height !== H || build.width !== W || build.height !== H) {
        throw new Error(`dimension mismatch lo=${lo.width}x${lo.height} build=${build.width}x${build.height}`);
      }

      const frame = pixelmatch(build.data, lo.data, null, W, H, {
        threshold: PIXELMATCH_THRESHOLD,
        includeAA: false,
        alpha: 0.3,
      });
      const frameScore = Number((1 - frame / (W * H)).toFixed(4));

      const graphicRects = cap.graphicRects ?? [];
      const { mask, count } = graphicMask(graphicRects, cap.textRects ?? []);

      let graphicScore = null;
      let inkDelta = null;
      let reason = null;
      if (!graphicRects.length) {
        reason =
          "export emitted NO graphic objects — the data graphic was dropped (likely a fallback-to-text regression)";
      } else if (count < MIN_REGION_PIXELS) {
        reason = `graphic region is only ${count}px after text masking (floor ${MIN_REGION_PIXELS}px) — score would be noise`;
      } else {
        const r = regionScore(build, lo, mask, count);
        graphicScore = r.score;
        await writeFile(path.join(OUT_DIR, `${safe}.graphic.diff.png`), PNG.sync.write(r.diff));
        const inkExport = inkFraction(lo, mask, count);
        const inkBuild = inkFraction(build, mask, count);
        inkDelta =
          inkExport === null || inkBuild === null
            ? null
            : Number(Math.abs(inkExport - inkBuild).toFixed(4));
        if (graphicScore < MIN_SCORE) reason = `graphicScore ${graphicScore} below floor ${MIN_SCORE}`;
        else if (inkDelta !== null && inkDelta > MAX_INK_DELTA)
          reason = `ink fraction differs by ${inkDelta} (limit ${MAX_INK_DELTA}) — graphic present but drawn at a different weight/size`;
      }

      rows.push({
        variantId: cap.variantId,
        mode: cap.mode,
        fidelity: FIDELITY,
        frameScore,
        graphicScore,
        inkDelta,
        graphicObjects: graphicRects.length,
        textObjects: (cap.textRects ?? []).length,
        regionPixels: count,
        flagged: Boolean(reason),
        reason,
        diff: existsSync(path.join(OUT_DIR, `${safe}.graphic.diff.png`))
          ? path.relative(process.cwd(), path.join(OUT_DIR, `${safe}.graphic.diff.png`))
          : null,
      });
      console.log(
        `  ${i + 1}/${jobs.length} ${label} · frame ${frameScore} · graphic ${
          graphicScore ?? "null"
        } · ink Δ ${inkDelta ?? "n/a"} · ${graphicRects.length} graphic obj · ${
          reason ? `FLAG (${reason})` : "ok"
        }`,
      );
    } catch (err) {
      rows.push({ variantId: cap.variantId, mode: cap.mode, flagged: true, reason: `render failed: ${String(err).slice(0, 160)}` });
      console.log(`  ${i + 1}/${jobs.length} ${label} · FLAG (render failed)`);
    }
  }

  const flagged = rows.filter((r) => r.flagged);
  const stats = quantiles(rows.map((r) => r.graphicScore).filter((s) => typeof s === "number"));
  const report = {
    generatedAt: new Date().toISOString(),
    renderer: RENDERER,
    note:
      (RENDERER === "powerpoint"
        ? "Rendered by real Microsoft PowerPoint (Office PDF conversion via the linked connection); a render failure means the package does not open in PowerPoint. "
        : "Advisory. LibreOffice renders the .pptx, so absolute numbers are not PowerPoint fidelity. ") +
      "graphicScore compares the exporter's own graphic-object region with text masked out; inkDelta compares drawn weight inside that region.",
    fidelity: FIDELITY,
    thresholds: { minGraphicScore: MIN_SCORE, maxInkDelta: MAX_INK_DELTA },
    cells: rows.length,
    flagged: flagged.length,
    graphicScore: stats,
    rows,
  };
  await writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

  const md = [
    "# Chart / graph export parity",
    "",
    `Generated ${report.generatedAt} · fidelity \`${FIDELITY}\` · ${rows.length} cell(s) · **${flagged.length} flagged**`,
    "",
    `Advisory drift check: LibreOffice renders the export, so treat scores as relative.`,
    "",
    "| module | mode | graphicScore | inkΔ | frameScore | graphic objs | status |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map(
      (r) =>
        `| ${r.variantId} | ${r.mode} | ${r.graphicScore ?? "—"} | ${r.inkDelta ?? "—"} | ${
          r.frameScore ?? "—"
        } | ${r.graphicObjects ?? 0} | ${r.flagged ? `⚠️ ${r.reason}` : "ok"} |`,
    ),
  ].join("\n");
  await writeFile(path.join(OUT_DIR, "report.md"), `${md}\n`);

  console.log(
    `\ngraphicScore n=${stats.n} min=${stats.min} median=${stats.median} p90=${stats.p90} max=${stats.max}`,
  );
  console.log(`flagged ${flagged.length}/${rows.length} → ${path.relative(process.cwd(), OUT_DIR)}/report.md`);
  for (const r of flagged) console.log(`  ⚠️ ${r.variantId}@${r.mode}: ${r.reason}`);

  await browser.close();
  if (CI && flagged.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
