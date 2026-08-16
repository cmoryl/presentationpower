#!/usr/bin/env node
/**
 * FULL-LIBRARY POWERPOINT PARITY SWEEP
 * ====================================
 *
 * Scores EVERY module variant's exported .pptx against a render produced by
 * REAL Microsoft PowerPoint (Office's own converter, via the linked Microsoft
 * PowerPoint connection) — not LibreOffice. This is the ground-truth version of
 * scripts/pixel-diff-exports.mjs, which is explicitly advisory because
 * LibreOffice has its own text/gradient/chart engine.
 *
 * WHAT IS SCORED (per cell = variant × mode)
 * ------------------------------------------
 *   opens          Office accepted and converted the package at all. A failure
 *                  here is a hard defect: the deck would not open.
 *   graphicScore   region-restricted raster agreement over the union of the
 *                  exporter's own graphic object rects (shapes/icons/images/
 *                  charts) with text rects subtracted. Text is masked because
 *                  Office substitutes faces once embedded fonts are stripped
 *                  for the web converter (see render-via-powerpoint.mjs).
 *   frameScore     whole 960×540 frame including text — context only.
 *   inkDelta       |graphic ink fraction (PowerPoint) − (build)| in the same
 *                  region. Catches "drawn, but 3× too heavy" or "dropped".
 *   flatten        native graphic object count; 0 means the slide came out as a
 *                  flat picture (the regression we keep guarding against).
 *
 * A cell is FLAGGED when it fails to open, has no graphic objects,
 * graphicScore < --min, or inkDelta > --ink.
 *
 * PIPELINE
 *   1. capture   headless build render + real exported .pptx + object rects,
 *                sequentially through /dev/export-verify (browser-bound).
 *   2. render    Office PDF per cell through the connector gateway, in a small
 *                concurrency pool (network-bound), rasterized at 960×540.
 *   3. score     masked pixelmatch + ink fraction, then report.
 *
 * OUTPUT (--out, default artifacts/powerpoint-parity)
 *   report.md      ranked table + summary, flagged cells first
 *   report.json    machine-readable rows + quantiles
 *   contact.html   self-contained build|PowerPoint|diff contact sheet
 *   <cell>.{build,powerpoint,diff}.png
 *
 * USAGE
 *   node scripts/powerpoint-parity-sweep.mjs                     # all modules, light
 *   node scripts/powerpoint-parity-sweep.mjs --modes light,dark   # full 2× sweep
 *   node scripts/powerpoint-parity-sweep.mjs --sample 12          # smoke
 *   node scripts/powerpoint-parity-sweep.mjs --variant MV-ICEBERG
 *
 * FLAGS
 *   --url <base>        harness origin (default http://localhost:8080)
 *   --modes light,dark  modes to sweep (default light)
 *   --sample N          evenly-spaced subset (default: every module)
 *   --variant ID        restrict to specific id(s), repeatable
 *   --fidelity F        editable | layered | exact (default editable = shipping)
 *   --concurrency N     parallel Office conversions (default 5)
 *   --min 0.9           graphicScore floor before flagging
 *   --ink 0.12          allowed ink-fraction delta
 *   --resume            reuse captures/renders already on disk in --out
 *   --ci                exit 1 when anything is flagged
 */
import { chromium } from "playwright";
import { readFile, writeFile, mkdir, readdir, rm } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
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
const values = (n) =>
  argv.reduce((a, v, i) => (v === `--${n}` && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const MODES = value("modes", "light").split(",").filter(Boolean);
const SAMPLE = Number(value("sample", 0));
const ONLY = values("variant");
const FIDELITY = value("fidelity", "editable");
const CONCURRENCY = Math.max(1, Number(value("concurrency", 5)));
const MIN_SCORE = Number(value("min", 0.9));
const MAX_INK_DELTA = Number(value("ink", 0.12));
const RESUME = flag("resume");
const CI = flag("ci");
const OUT_DIR = path.resolve(value("out", "artifacts/powerpoint-parity"));
const WORK_DIR = path.join(OUT_DIR, ".work");

const W = 960;
const H = 540;
const PIXELMATCH_THRESHOLD = 0.22;
const GRAPHIC_PAD_PX = 3;
const TEXT_PAD_PX = 4;
const MIN_REGION_PIXELS = 8000;

const safeName = (s) => s.replace(/[^a-z0-9@.-]/gi, "_");

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

function assertCreds() {
  if (!(process.env.LOVABLE_API_KEY && process.env.MICROSOFT_POWERPOINT_API_KEY)) {
    throw new Error(
      "This sweep renders with real PowerPoint and needs the Microsoft PowerPoint connection " +
        "(LOVABLE_API_KEY + MICROSOFT_POWERPOINT_API_KEY).",
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
  await page.waitForFunction("!!window.__tpExportVerify", null, { timeout: 180_000 });
  return { ctx, page };
}

/** Office PDF (page 1) -> PNG at exactly the comparison raster size. */
async function pdfPageToPng(pdfPath, dir, tag) {
  const stem = path.join(dir, `page-${tag}`);
  await run(
    "pdftoppm",
    ["-png", "-r", "96", "-f", "1", "-l", "1", "-scale-to-x", String(W), "-scale-to-y", String(H), pdfPath, stem],
    { timeout: 120_000 },
  );
  const found = (await readdir(dir)).find((f) => f.startsWith(`page-${tag}`) && f.endsWith(".png"));
  if (!found) throw new Error("pdftoppm produced no PNG");
  return path.join(dir, found);
}

/** 1 where a pixel counts: union(graphic rects) minus union(text rects). */
function graphicMask(graphicRects, textRects) {
  const mask = new Uint8Array(W * H);
  const paint = (rects, pad, v) => {
    for (const r of rects ?? []) {
      const x0 = Math.max(0, Math.floor(r.x * W) - pad);
      const y0 = Math.max(0, Math.floor(r.y * H) - pad);
      const x1 = Math.min(W, Math.ceil((r.x + r.w) * W) + pad);
      const y1 = Math.min(H, Math.ceil((r.y + r.h) * H) + pad);
      for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) mask[y * W + x] = v;
    }
  };
  paint(graphicRects, GRAPHIC_PAD_PX, 1);
  paint(textRects, TEXT_PAD_PX, 0);
  let count = 0;
  for (let i = 0; i < mask.length; i += 1) if (mask[i]) count += 1;
  return { mask, count };
}

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

function regionScore(build, office, mask, count) {
  const a = Buffer.from(build.data);
  const b = Buffer.from(office.data);
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

function fullFrameScore(build, office) {
  const diff = new PNG({ width: W, height: H });
  const mismatched = pixelmatch(build.data, office.data, diff.data, W, H, {
    threshold: PIXELMATCH_THRESHOLD,
    includeAA: false,
  });
  return Number((1 - mismatched / (W * H)).toFixed(4));
}

function quantiles(scores) {
  const s = [...scores].filter((n) => typeof n === "number").sort((x, y) => x - y);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))] ?? null;
  return {
    n: s.length,
    min: s[0] ?? null,
    p10: at(0.1),
    median: at(0.5),
    p90: at(0.9),
    max: s[s.length - 1] ?? null,
  };
}

async function pool(items, limit, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });
  await Promise.all(runners);
}

const b64 = (buf) => Buffer.from(buf).toString("base64");

async function main() {
  assertCreds();
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(WORK_DIR, { recursive: true });

  const browser = await launchChromium();
  let session = await boot(browser);
  let variants = await session.page.evaluate(() => window.__tpExportVerify.variants ?? []);
  if (!variants.length) throw new Error("harness reported no variants");
  if (ONLY.length) variants = variants.filter((v) => ONLY.includes(v));
  else if (SAMPLE > 0 && SAMPLE < variants.length) {
    const step = variants.length / SAMPLE;
    variants = [...new Set(Array.from({ length: SAMPLE }, (_, i) => variants[Math.floor(i * step)]))];
  }

  const cells = [];
  for (const mode of MODES) for (const v of variants) cells.push({ variantId: v, mode });
  console.log(
    `PowerPoint parity sweep (renderer=real Office via connector):\n` +
      `  ${variants.length} module(s) × ${MODES.length} mode(s) = ${cells.length} cell(s)\n` +
      `  fidelity=${FIDELITY} concurrency=${CONCURRENCY} floor graphicScore≥${MIN_SCORE} inkΔ≤${MAX_INK_DELTA}`,
  );

  /**
   * Every plated cell retains canvases and decoded backdrops, so one long-lived
   * page runs the renderer out of memory (`ERR_INSUFFICIENT_RESOURCES`, then a
   * dead context) after a few dozen cells. Recycle the page on a fixed budget,
   * and once more on any capture failure before giving up on that cell.
   */
  const PAGE_BUDGET = Math.max(1, Number(value("page-budget", 20)));
  const recycle = async () => {
    await session.ctx.close().catch(() => {});
    session = await boot(browser);
  };

  // ---------------------------------------------------------------- 1. capture
  const captured = [];
  let sinceRecycle = 0;
  for (let i = 0; i < cells.length; i += 1) {
    const cell = cells[i];
    const label = `${cell.variantId}@${cell.mode}`;
    const key = safeName(label);
    const dir = path.join(WORK_DIR, key);
    await mkdir(dir, { recursive: true });
    const pptxPath = path.join(dir, "cell.pptx");
    const buildPath = path.join(dir, "build.png");
    const metaPath = path.join(dir, "rects.json");
    if (RESUME && existsSync(pptxPath) && existsSync(buildPath) && existsSync(metaPath)) {
      captured.push({ ...cell, label, key, dir, pptxPath, buildPath, metaPath });
      continue;
    }
    if (sinceRecycle >= PAGE_BUDGET) {
      await recycle();
      sinceRecycle = 0;
    }
    let cap = null;
    let capError = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        [cap] = await session.page.evaluate(
          (j) => window.__tpExportVerify.pixel([j]),
          [cell.variantId, null, cell.mode, FIDELITY],
        );
        sinceRecycle += 1;
        capError = cap?.pptx && cap?.build ? null : (cap?.error ?? "no capture");
      } catch (err) {
        capError = `capture threw: ${String(err).slice(0, 160)}`;
        cap = null;
      }
      if (!capError) break;
      if (attempt === 0) {
        // Fresh page, one retry: most failures here are the dead-context class.
        await recycle();
        sinceRecycle = 0;
      }
    }
    if (capError || !cap) {
      captured.push({ ...cell, label, key, error: capError ?? "no capture" });
      console.log(`  cap ${i + 1}/${cells.length} ${label} · FLAG (${capError})`);
      continue;
    }
    await writeFile(pptxPath, Buffer.from(cap.pptx, "base64"));
    await writeFile(buildPath, Buffer.from(cap.build, "base64"));
    await writeFile(
      metaPath,
      JSON.stringify({ textRects: cap.textRects ?? [], graphicRects: cap.graphicRects ?? [] }),
    );
    captured.push({ ...cell, label, key, dir, pptxPath, buildPath, metaPath });
    if ((i + 1) % 10 === 0 || i + 1 === cells.length) {
      console.log(`  cap ${i + 1}/${cells.length} captured`);
    }
  }
  await browser.close();


  // ------------------------------------------------- 2. render with PowerPoint
  const renderable = captured.filter((c) => !c.error);
  let rendered = 0;
  await pool(renderable, CONCURRENCY, async (cell) => {
    const pdfPath = path.join(cell.dir, "office.pdf");
    if (RESUME && existsSync(pdfPath)) {
      cell.pdfPath = pdfPath;
    } else {
      try {
        const res = await renderPptxWithPowerPoint(
          await readFile(cell.pptxPath),
          `parity-${cell.key}-${Date.now()}.pptx`,
        );
        await writeFile(pdfPath, res.pdf);
        await deleteDriveItem(res.itemId);
        cell.pdfPath = pdfPath;
      } catch (err) {
        // Office refusing the package is the single most important defect this
        // sweep can find: the file would not open in PowerPoint either.
        cell.error = `PowerPoint refused the package: ${String(err.message ?? err).slice(0, 220)}`;
        cell.opens = false;
      }
    }
    rendered += 1;
    if (rendered % 10 === 0 || rendered === renderable.length) {
      console.log(`  render ${rendered}/${renderable.length} through Office`);
    }
  });

  // ------------------------------------------------------------------ 3. score
  const rows = [];
  for (const cell of captured) {
    const row = {
      variantId: cell.variantId,
      mode: cell.mode,
      opens: cell.opens ?? Boolean(cell.pdfPath),
      graphicScore: null,
      frameScore: null,
      inkDelta: null,
      graphicObjects: 0,
      flagged: false,
      reason: "",
    };
    if (!cell.pdfPath) {
      row.flagged = true;
      row.reason = cell.error ?? "no render";
      rows.push(row);
      continue;
    }
    try {
      const officePng = PNG.sync.read(await readFile(await pdfPageToPng(cell.pdfPath, cell.dir, cell.key)));
      const buildPng = PNG.sync.read(await readFile(cell.buildPath));
      const meta = JSON.parse(await readFile(cell.metaPath, "utf8"));
      row.graphicObjects = meta.graphicRects.length;
      row.frameScore = fullFrameScore(buildPng, officePng);
      const { mask, count } = graphicMask(meta.graphicRects, meta.textRects);
      if (!meta.graphicRects.length) {
        row.flagged = true;
        row.reason = "no native graphic objects (slide exported flat)";
      } else if (count < MIN_REGION_PIXELS) {
        row.reason = `graphic region too small to score (${count}px)`;
      } else {
        const { score, diff } = regionScore(buildPng, officePng, mask, count);
        row.graphicScore = score;
        const inkBuild = inkFraction(buildPng, mask, count);
        const inkOffice = inkFraction(officePng, mask, count);
        row.inkDelta = Number(Math.abs((inkOffice ?? 0) - (inkBuild ?? 0)).toFixed(4));
        await writeFile(path.join(OUT_DIR, `${cell.key}.diff.png`), PNG.sync.write(diff));
        if (score < MIN_SCORE) {
          row.flagged = true;
          row.reason = `graphicScore ${score} < ${MIN_SCORE}`;
        } else if (row.inkDelta > MAX_INK_DELTA) {
          row.flagged = true;
          row.reason = `inkΔ ${row.inkDelta} > ${MAX_INK_DELTA}`;
        }
      }
      await writeFile(path.join(OUT_DIR, `${cell.key}.build.png`), PNG.sync.write(buildPng));
      await writeFile(path.join(OUT_DIR, `${cell.key}.powerpoint.png`), PNG.sync.write(officePng));
      cell.pngs = {
        build: path.join(OUT_DIR, `${cell.key}.build.png`),
        powerpoint: path.join(OUT_DIR, `${cell.key}.powerpoint.png`),
        diff: path.join(OUT_DIR, `${cell.key}.diff.png`),
      };
    } catch (err) {
      row.flagged = true;
      row.reason = `score failed: ${String(err.message ?? err).slice(0, 180)}`;
    }
    rows.push(row);
  }

  const flagged = rows.filter((r) => r.flagged);
  const openFailures = rows.filter((r) => !r.opens);
  const stats = quantiles(rows.map((r) => r.graphicScore));
  const inkStats = quantiles(rows.map((r) => r.inkDelta));
  const report = {
    generatedAt: new Date().toISOString(),
    renderer: "microsoft-powerpoint (Office PDF conversion via connector) + pdftoppm@96dpi",
    fidelity: FIDELITY,
    modes: MODES,
    thresholds: { minGraphicScore: MIN_SCORE, maxInkDelta: MAX_INK_DELTA },
    cells: rows.length,
    opened: rows.length - openFailures.length,
    flagged: flagged.length,
    graphicScore: stats,
    inkDelta: inkStats,
    rows,
  };
  await writeFile(path.join(OUT_DIR, "report.json"), `${JSON.stringify(report, null, 2)}\n`);

  const ordered = [...rows].sort((a, b) => {
    if (a.flagged !== b.flagged) return a.flagged ? -1 : 1;
    return (a.graphicScore ?? -1) - (b.graphicScore ?? -1);
  });
  const md = [
    "# Full-library PowerPoint parity sweep",
    "",
    `Generated ${report.generatedAt}`,
    "",
    `Renderer: **real Microsoft PowerPoint** (Office's own PDF conversion through the linked ` +
      `Microsoft PowerPoint connection), rasterized at 96dpi to ${W}×${H}. Embedded font parts are ` +
      `dropped before upload because Office's *online* converter rejects any package declaring ` +
      `\`<p:embeddedFontLst>\`; text is masked out of the scored region, so this does not affect scores.`,
    "",
    `- fidelity: \`${FIDELITY}\` · modes: ${MODES.join(", ")}`,
    `- cells: **${rows.length}** · opened in PowerPoint: **${report.opened}/${rows.length}** · flagged: **${flagged.length}**`,
    `- graphicScore — min ${stats.min ?? "—"} · p10 ${stats.p10 ?? "—"} · median ${stats.median ?? "—"} · p90 ${stats.p90 ?? "—"} · max ${stats.max ?? "—"}`,
    `- inkΔ — median ${inkStats.median ?? "—"} · p90 ${inkStats.p90 ?? "—"} · max ${inkStats.max ?? "—"}`,
    "",
    "Flagged when: PowerPoint refused the file, zero native graphic objects (flat slide),",
    `graphicScore < ${MIN_SCORE}, or inkΔ > ${MAX_INK_DELTA}.`,
    "",
    "| module | mode | opens | graphicScore | inkΔ | frameScore | graphic objs | status |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
    ...ordered.map(
      (r) =>
        `| ${r.variantId} | ${r.mode} | ${r.opens ? "yes" : "**NO**"} | ${r.graphicScore ?? "—"} | ` +
        `${r.inkDelta ?? "—"} | ${r.frameScore ?? "—"} | ${r.graphicObjects} | ` +
        `${r.flagged ? `⚠️ ${r.reason}` : r.reason || "ok"} |`,
    ),
  ].join("\n");
  await writeFile(path.join(OUT_DIR, "report.md"), `${md}\n`);

  // Self-contained contact sheet, worst cells first.
  const sheetCells = ordered.slice(0, 60);
  const byKey = new Map(captured.map((c) => [`${c.variantId}@${c.mode}`, c]));
  const blocks = [];
  for (const r of sheetCells) {
    const cell = byKey.get(`${r.variantId}@${r.mode}`);
    const img = async (p) => (p && existsSync(p) ? `data:image/png;base64,${b64(await readFile(p))}` : null);
    const build = await img(cell?.pngs?.build);
    const office = await img(cell?.pngs?.powerpoint);
    const diff = await img(cell?.pngs?.diff);
    blocks.push(
      `<section class="${r.flagged ? "flag" : "ok"}"><h2>${r.variantId} · ${r.mode} ` +
        `<small>graphicScore ${r.graphicScore ?? "—"} · inkΔ ${r.inkDelta ?? "—"} · ${
          r.flagged ? r.reason : "ok"
        }</small></h2><div class="row">` +
        [
          ["build", build],
          ["PowerPoint", office],
          ["diff", diff],
        ]
          .map(
            ([label, src]) =>
              `<figure>${src ? `<img src="${src}" alt="${r.variantId} ${label}">` : `<div class="miss">no ${label}</div>`}<figcaption>${label}</figcaption></figure>`,
          )
          .join("") +
        `</div></section>`,
    );
  }
  await writeFile(
    path.join(OUT_DIR, "contact.html"),
    `<!doctype html><meta charset="utf-8"><title>PowerPoint parity sweep</title>` +
      `<style>body{font:14px/1.5 system-ui;margin:0;padding:32px;background:#f2f2f2;color:#03002C}` +
      `h1{font-size:22px}section{background:#fff;border-radius:16px;padding:16px;margin:16px 0}` +
      `section.flag{outline:2px solid #E53D2E}h2{font-size:15px;margin:0 0 12px}` +
      `small{font-weight:400;color:#666}.row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}` +
      `img{width:100%;border-radius:8px;display:block}figcaption{color:#666;font-size:12px;margin-top:6px}` +
      `.miss{aspect-ratio:16/9;display:grid;place-items:center;background:#F2F2F2;border-radius:8px;color:#666}` +
      `</style><h1>PowerPoint parity sweep · worst ${sheetCells.length} of ${rows.length} cells</h1>` +
      blocks.join("\n"),
  );

  console.log(
    `\nopened ${report.opened}/${rows.length} · flagged ${flagged.length}` +
      `\ngraphicScore n=${stats.n} min=${stats.min} p10=${stats.p10} median=${stats.median} p90=${stats.p90}` +
      `\n→ ${path.relative(process.cwd(), OUT_DIR)}/report.md`,
  );
  for (const r of flagged.slice(0, 40)) console.log(`  ⚠️ ${r.variantId}@${r.mode}: ${r.reason}`);
  if (!flag("keep-work")) await rm(WORK_DIR, { recursive: true, force: true }).catch(() => {});
  if (CI && flagged.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
