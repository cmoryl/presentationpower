#!/usr/bin/env node
/**
 * EXPORT QA CONTACT SHEET
 * =======================
 *
 * Builds public/dev/export-gallery.html — a single, self-contained page that
 * puts the on-screen build render of every diagram / process / chart / graph /
 * stat module next to LibreOffice's render of that same module exported through
 * the REAL export path at the CURRENT SHIPPING DEFAULT fidelity.
 *
 * Every image is inlined as a base64 data URI. The file has no external assets,
 * so it can be copied anywhere and still opens.
 *
 * HONEST FRAMING (same caveat as scripts/pixel-diff-exports.mjs)
 * -------------------------------------------------------------
 * LibreOffice is not PowerPoint. Its text layout, gradients and blends differ.
 * The right-hand column therefore answers "did the objects survive the export
 * and land in the right place", not "is this pixel-exact in PowerPoint". Verdicts
 * are derived from structural signals (ink present, coverage ratio, object
 * counts) — not from small pixel deltas.
 *
 * USAGE
 *   node scripts/export-gallery.mjs                # full family sweep
 *   node scripts/export-gallery.mjs --sample 6     # smoke
 *   node scripts/export-gallery.mjs --variant MV-FUNNEL --variant MV-FLYWHEEL
 *
 * FLAGS
 *   --url <base>     harness origin (default http://localhost:8080)
 *   --mode light|dark
 *   --sample N       cap the number of variants (evenly spaced)
 *   --variant ID     restrict to specific ids, repeatable
 *   --out <file>     output html (default public/dev/export-gallery.html)
 */
import { chromium } from "playwright";
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const run = promisify(execFile);
const argv = process.argv.slice(2);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const values = (n) =>
  argv.reduce((a, v, i) => (v === `--${n}` && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const MODE = value("mode", "light");
const ONLY = values("variant");
const SAMPLE = Number(value("sample", 0));
const OUT = path.resolve(value("out", "public/dev/export-gallery.html"));

const W = 960;
const H = 540;
const PIXELMATCH_THRESHOLD = 0.22;

/** Families under test: diagram / process / chart / graph / stat work. */
const FAMILY_RE = /PROC|DIAG|CHART|GRAPH|STAT|FUNNEL|FLYWHEEL|CYCLE|KPI|METRIC|TIMELINE/i;

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
  for (const [bin, args] of [
    ["soffice", ["--version"]],
    ["pdftoppm", ["-v"]],
  ]) {
    try {
      await run(bin, args, { timeout: 120_000 });
    } catch (err) {
      throw new Error(`${bin} unavailable (${String(err).slice(0, 120)})`);
    }
  }
}

async function renderPptxToPng(pptxPath, workDir) {
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
      pdf,
      path.join(workDir, "lo"),
    ],
    { timeout: 120_000 },
  );
  const png = (await readdir(workDir)).find((f) => f.startsWith("lo") && f.endsWith(".png"));
  if (!png) throw new Error("pdftoppm produced no PNG");
  return path.join(workDir, png);
}

/**
 * Structural signals from a raster: how much of the frame carries ink that is
 * not the dominant background colour, and how many distinct colours appear.
 * A slide that lost its content collapses both numbers; a slide that lost only
 * its decoration moves coverage but keeps colour count.
 */
function inkStats(png) {
  const { width: w, height: h, data } = png;
  const hist = new Map();
  for (let i = 0; i < w * h; i += 1) {
    const p = i * 4;
    const k = ((data[p] >> 3) << 10) | ((data[p + 1] >> 3) << 5) | (data[p + 2] >> 3);
    hist.set(k, (hist.get(k) ?? 0) + 1);
  }
  let bg = 0;
  let bgCount = 0;
  for (const [k, n] of hist) if (n > bgCount) ((bgCount = n), (bg = k));
  const total = w * h;
  return {
    coverage: 1 - bgCount / total,
    colors: hist.size,
    bgFraction: bgCount / total,
  };
}

/** Fraction of the frame that is pure white / near-white (LibreOffice blanks). */
function whiteFraction(png) {
  const { width: w, height: h, data } = png;
  let n = 0;
  for (let i = 0; i < w * h; i += 1) {
    const p = i * 4;
    if (data[p] > 246 && data[p + 1] > 246 && data[p + 2] > 246) n += 1;
  }
  return n / (w * h);
}

/**
 * VERDICT RULES — structural, deliberately not pixel-perfectionist.
 *
 *   BROKEN    the export failed, produced no renderable slide, rendered
 *             essentially blank, or lost nearly all of the build's ink.
 *   DEGRADED  content is present but a whole class of it is thinner than the
 *             build render (decoration/fill/text objects visibly missing), or
 *             the exporter emitted no text objects at all for a module that
 *             clearly carries copy.
 *   OK        object classes survived and coverage is comparable.
 */
function verdictFor({ error, build, lo, textBoxes, score }) {
  if (error) return { verdict: "BROKEN", defect: error };
  const b = inkStats(build);
  const l = inkStats(lo);
  const loWhite = whiteFraction(lo);
  const ratio = b.coverage > 0 ? l.coverage / b.coverage : 1;

  if (loWhite > 0.97)
    return { verdict: "BROKEN", defect: "LibreOffice render is blank white — no slide content survived the export" };
  if (l.colors < 12)
    return {
      verdict: "BROKEN",
      defect: `export renders as a flat plate (${l.colors} distinct colours) — shapes, text and icons did not land`,
    };
  if (ratio < 0.35)
    return {
      verdict: "BROKEN",
      defect: `export keeps only ${(ratio * 100).toFixed(0)}% of the build render's ink — most objects dropped`,
    };
  if (textBoxes === 0)
    return {
      verdict: "DEGRADED",
      defect: "exporter emitted zero text objects — copy is baked into imagery instead of being editable",
    };
  if (ratio < 0.7)
    return {
      verdict: "DEGRADED",
      defect: `export ink is ${(ratio * 100).toFixed(0)}% of the build render — decoration or fills are thinner than on screen`,
    };
  if (ratio > 1.45)
    return {
      verdict: "DEGRADED",
      defect: `export ink is ${(ratio * 100).toFixed(0)}% of the build render — fills spread wider than on screen (blend/transparency not honoured)`,
    };
  if (typeof score === "number" && score < 0.75)
    return {
      verdict: "DEGRADED",
      defect: `object classes present but layout diverges (frame match ${score.toFixed(2)}) — check placement and wrapping`,
    };
  return {
    verdict: "OK",
    defect: `objects survived · ${textBoxes} text box(es) · ink ratio ${ratio.toFixed(2)}`,
  };
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

async function toWebp(pngPath, width = 620, quality = 55) {
  // Inline PNG would blow past the per-file repo limit for 60 cells, so downscale
  // to WebP with ffmpeg (already on PATH) and fall back to raw PNG if that fails.
  const out = `${pngPath}.webp`;
  try {
    await new Promise((resolve, reject) => {
      const ps = spawn(
        "ffmpeg",
        ["-y", "-loglevel", "error", "-i", pngPath, "-vf", `scale=${width}:-1`, "-quality", String(quality), out],
        { stdio: "ignore" },
      );
      ps.on("error", reject);
      ps.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exit ${code}`))));
    });
    const buf = await readFile(out);
    return `data:image/webp;base64,${buf.toString("base64")}`;
  } catch {
    const buf = await readFile(pngPath);
    return `data:image/png;base64,${buf.toString("base64")}`;
  }
}


const HARNESS_RE = /reading 'pixel'|__tpExportVerify|Execution context was destroyed|navigation|Target (page|closed)|detached/i;
const CELLS_PER_PAGE = 8; // proactive recycle: a fresh page every N cells beats waiting for HMR to kill us

async function openHarness(ctx, existing) {
  if (existing) {
    try {
      await existing.close();
    } catch {
      /* already gone */
    }
  }
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/dev/export-verify`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction("!!window.__tpExportVerify", null, { timeout: 120_000 });
  return page;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await assertTooling();
  const browser = await launchChromium();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });
  let page = await openHarness(ctx, null);

  const all = await page.evaluate(() => window.__tpExportVerify.variants);
  let variants = ONLY.length ? all.filter((v) => ONLY.includes(v)) : all.filter((v) => FAMILY_RE.test(v));
  if (SAMPLE > 0 && SAMPLE < variants.length) {
    const step = variants.length / SAMPLE;
    variants = [...new Set(Array.from({ length: SAMPLE }, (_, i) => variants[Math.floor(i * step)]))];
  }

  console.log(`export-gallery: ${variants.length} variant(s), mode ${MODE}, fidelity = shipping default`);

  const tmpRoot = await mkdtemp(path.join(os.tmpdir(), "export-gallery-"));
  const rows = [];

  for (let i = 0; i < variants.length; i += 1) {
    const id = variants[i];

    // Proactive recycle — a long-lived page eventually loses the global to an HMR remount.
    if (i > 0 && i % CELLS_PER_PAGE === 0) page = await openHarness(ctx, page);

    let cap = null;
    let harnessError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const alive = await page
          .evaluate(() => !!window.__tpExportVerify?.pixel)
          .catch(() => false);
        if (!alive) throw new Error("__tpExportVerify global is not present on the page");
        // 4th tuple slot = fidelity; "editable" is the current shipping default.
        [cap] = await page.evaluate(
          (j) => window.__tpExportVerify.pixel([j]),
          [id, null, MODE, "editable"],
        );
        harnessError = null;
        break;
      } catch (err) {
        const msg = String(err);
        if (!HARNESS_RE.test(msg) || attempt === 3) {
          harnessError = msg.slice(0, 200);
          break;
        }
        harnessError = msg.slice(0, 200);
        await sleep(600 * (attempt + 1));
        page = await openHarness(ctx, page).catch(() => page);
      }
    }

    if (harnessError) {
      const harness = HARNESS_RE.test(harnessError);
      rows.push({
        id,
        verdict: harness ? "UNTESTED" : "BROKEN",
        defect: harness
          ? `HARNESS failure, not an export defect — capture harness was unavailable after 3 retries (${harnessError})`
          : `capture threw: ${harnessError}`,
        build: null,
        lo: null,
      });
      console.log(`  ${i + 1}/${variants.length} ${id} · ${harness ? "UNTESTED (harness)" : "BROKEN"}`);
      continue;
    }
    if (!cap?.pptx || !cap?.build) {
      rows.push({
        id,
        verdict: "BROKEN",
        defect: cap?.error ?? "export produced no bytes and no build raster",
        build: cap?.build ? `data:image/png;base64,${cap.build}` : null,
        lo: null,
      });
      console.log(`  ${i + 1}/${variants.length} ${id} · BROKEN (${cap?.error ?? "no capture"})`);
      continue;
    }


    const workDir = path.join(tmpRoot, id.replace(/[^A-Za-z0-9-]/g, "_"));
    await mkdir(workDir, { recursive: true });
    const pptxPath = path.join(workDir, `${id}.pptx`);
    await writeFile(pptxPath, Buffer.from(cap.pptx, "base64"));
    const buildPath = path.join(workDir, "build.png");
    await writeFile(buildPath, Buffer.from(cap.build, "base64"));

    let loPath = null;
    let error = null;
    try {
      loPath = await renderPptxToPng(pptxPath, workDir);
    } catch (err) {
      error = `pptx → png failed: ${String(err).slice(0, 160)}`;
    }

    let score = null;
    let judged = { verdict: "BROKEN", defect: error ?? "no render" };
    let buildPng = null;
    let loPng = null;
    if (loPath) {
      buildPng = PNG.sync.read(await readFile(buildPath));
      loPng = PNG.sync.read(await readFile(loPath));
      if (buildPng.width === loPng.width && buildPng.height === loPng.height) {
        const mismatched = pixelmatch(buildPng.data, loPng.data, null, W, H, {
          threshold: PIXELMATCH_THRESHOLD,
          includeAA: false,
        });
        score = Number((1 - mismatched / (W * H)).toFixed(4));
      }
      judged = verdictFor({ build: buildPng, lo: loPng, textBoxes: (cap.textRects ?? []).length, score });
    }

    rows.push({
      id,
      verdict: judged.verdict,
      defect: judged.defect,
      score,
      textBoxes: (cap.textRects ?? []).length,
      build: await toWebp(buildPath),
      lo: loPath ? await toWebp(loPath) : null,

    });
    console.log(
      `  ${i + 1}/${variants.length} ${id} · ${judged.verdict} · ${judged.defect.slice(0, 110)}`,
    );
  }

  await browser.close();
  await rm(tmpRoot, { recursive: true, force: true });

  const counts = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] ?? 0) + 1), a), {});
  const flagged = rows.filter((r) => r.verdict !== "OK");
  const summary = [
    `EXPORT QA CONTACT SHEET — ${new Date().toISOString()}`,
    `mode: ${MODE} · fidelity: editable (shipping default) · renderer: LibreOffice ${"→"} pdftoppm`,
    `${rows.length} variants · OK ${counts.OK ?? 0} · DEGRADED ${counts.DEGRADED ?? 0} · BROKEN ${counts.BROKEN ?? 0} · UNTESTED ${counts.UNTESTED ?? 0}`,
    "",
    ...(flagged.length
      ? flagged.map((r) => `${r.verdict.padEnd(8)} ${r.id.padEnd(30)} ${r.defect}`)
      : ["No BROKEN or DEGRADED variants in this run."]),
  ].join("\n");

  const cards = rows
    .map(
      (r) => `<article class="row" data-verdict="${r.verdict}">
  <header>
    <h2>${esc(r.id)}</h2>
    <span class="badge ${r.verdict.toLowerCase()}">${r.verdict}</span>
    ${typeof r.score === "number" ? `<span class="meta">frame match ${r.score.toFixed(3)}</span>` : ""}
    ${typeof r.textBoxes === "number" ? `<span class="meta">${r.textBoxes} text box(es)</span>` : ""}
  </header>
  <p class="defect">${esc(r.defect)}</p>
  <div class="pair">
    <figure>${r.build ? `<img loading="lazy" alt="Build render of ${esc(r.id)}" src="${r.build}">` : `<div class="missing">no build render</div>`}<figcaption>Build render (on screen)</figcaption></figure>
    <figure>${r.lo ? `<img loading="lazy" alt="PPTX export of ${esc(r.id)} rendered by LibreOffice" src="${r.lo}">` : `<div class="missing">no PPTX render</div>`}<figcaption>PPTX export (LibreOffice)</figcaption></figure>
  </div>
</article>`,
    )
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Export QA contact sheet · diagram, process, chart &amp; stat modules</title>
<meta name="description" content="Side-by-side QA contact sheet comparing on-screen module builds with their PowerPoint exports for every diagram, process, chart, graph and stat variant.">
<style>
  :root { color-scheme: light; --ink:#03002C; --line:#E0E8F5; --blue:#003FC7; }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px; background:#F7F9FD; color:var(--ink);
         font:15px/1.5 ui-sans-serif,system-ui,"Geist Sans",sans-serif; }
  h1 { font-size:26px; letter-spacing:-0.02em; margin:0 0 4px; }
  .note { color:#666; max-width:70ch; margin:0 0 20px; }
  pre.summary { background:#fff; border:1px solid var(--line); border-radius:10px;
                padding:16px; overflow:auto; font:12px/1.55 ui-monospace,monospace; }
  .filters { display:flex; gap:8px; margin:20px 0; flex-wrap:wrap; }
  .filters button { border:1px solid var(--line); background:#fff; color:var(--ink);
                    padding:7px 14px; border-radius:999px; font-size:13px; cursor:pointer; }
  .filters button[aria-pressed="true"] { background:var(--blue); border-color:var(--blue); color:#fff; }
  .row { background:#fff; border:1px solid var(--line); border-radius:12px; padding:16px; margin-bottom:18px; }
  .row header { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .row h2 { font-size:15px; margin:0; font-family:ui-monospace,monospace; }
  .badge { font-size:11px; font-weight:700; padding:3px 9px; border-radius:999px; letter-spacing:.04em; }
  .badge.ok { background:#A6FA87; color:#053a00; }
  .badge.degraded { background:#FFEB66; color:#3a2f00; }
  .badge.broken { background:#E53D2E; color:#fff; }
  .badge.untested { background:#666; color:#fff; }
  .meta { font-size:11px; color:#666; }
  .defect { margin:8px 0 12px; font-size:13px; color:#333; }
  .pair { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
  figure { margin:0; }
  figure img { width:100%; display:block; border:1px solid var(--line); border-radius:8px; background:#fff; }
  figcaption { font-size:11px; color:#666; margin-top:6px; }
  .missing { display:grid; place-items:center; aspect-ratio:16/9; border:1px dashed var(--line);
             border-radius:8px; color:#999; font-size:12px; }
  @media (max-width:900px) { .pair { grid-template-columns:1fr; } }
</style>
</head>
<body>
<h1>Export QA contact sheet</h1>
<p class="note">Left: the on-screen build render. Right: the same module exported through the real
export path at the shipping default fidelity, then rendered by LibreOffice. LibreOffice is not
PowerPoint — the right column answers whether objects survived and landed, not pixel exactness.
Verdicts come from structural signals (ink coverage, colour count, text-object count).</p>
<pre class="summary" id="summary">${esc(summary)}</pre>
<div class="filters" role="group" aria-label="Filter rows by verdict">
  <button type="button" data-filter="ALL" aria-pressed="true">All (${rows.length})</button>
  <button type="button" data-filter="BROKEN" aria-pressed="false">Broken (${counts.BROKEN ?? 0})</button>
  <button type="button" data-filter="DEGRADED" aria-pressed="false">Degraded (${counts.DEGRADED ?? 0})</button>
  <button type="button" data-filter="UNTESTED" aria-pressed="false">Untested (${counts.UNTESTED ?? 0})</button>
</div>
<main id="rows">
${cards}
</main>
<script>
  const buttons = [...document.querySelectorAll(".filters button")];
  buttons.forEach((b) => b.addEventListener("click", () => {
    buttons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
    const f = b.dataset.filter;
    document.querySelectorAll(".row").forEach((r) => {
      r.hidden = f !== "ALL" && r.dataset.verdict !== f;
    });
  }));
</script>
</body>
</html>`;

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, html);
  console.log(`\n${summary}\n`);
  console.log(`Wrote ${path.relative(process.cwd(), OUT)} (${(html.length / 1e6).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
