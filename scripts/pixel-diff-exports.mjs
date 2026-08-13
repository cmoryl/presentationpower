#!/usr/bin/env node
/**
 * PPTX PIXEL-DIFF REGRESSION GATE (advisory)
 * ==========================================
 *
 * READ THIS FIRST — HONEST FRAMING
 * --------------------------------
 * LibreOffice is NOT a PowerPoint renderer. It has its own text layout engine,
 * its own gradient/blend/transparency handling and its own font substitution
 * rules. A score produced here therefore says exactly one thing:
 *
 *     "LibreOffice's render of this export still matches the build-side raster
 *      about as well as it did the last time we recorded it."
 *
 * That is a DRIFT DETECTOR. It is not ground truth for PowerPoint fidelity, and
 * an absolute score of 0.93 does not mean the slide is 93% correct in
 * PowerPoint. Nothing in this file, its output or its CI job may be named or
 * described in a way that implies otherwise.
 *
 * TWO SCORES PER CELL
 * -------------------
 *   score        Whole frame, text included. Unchanged in meaning and baseline.
 *                Because LibreOffice's advance widths and tracking differ from
 *                Chromium's, glyph edges mismatch on every run — so this score is
 *                a good TEXT-SHIFT detector but a poor surface detector: fill,
 *                gradient, shadow and blend changes in big flat areas barely move
 *                it next to the text ghosting.
 *   surfaceScore Same comparison with every exported text box excluded (mask taken
 *                from the export's own object tree, dilated). This is the score
 *                that sees SURFACE PARITY regressions. Reported with the masked
 *                area fraction, and null when masking leaves too little frame.
 *

 * WHY A SEPARATE SCRIPT (rather than folding into verify-exports.mjs)
 * ------------------------------------------------------------------
 * verify-exports.mjs is a hard-blocking, DOM-only gate: every cell costs ~1s
 * and it fails the build. This gate spawns two subprocesses per cell
 * (soffice + pdftoppm, several seconds each), writes image artifacts, and is
 * deliberately ADVISORY until a real distribution has been observed. Folding it
 * in would make a blocking gate hostage to LibreOffice availability and version
 * drift, and would triple the cost of the sweep everyone already depends on.
 * The two share the SAME harness page and the SAME rasterizer, which is what
 * actually matters for consistency.
 *
 * USAGE
 *   node scripts/pixel-diff-exports.mjs --sample 3            # local smoke
 *   node scripts/pixel-diff-exports.mjs --sample 8 --update   # calibrate
 *   node scripts/pixel-diff-exports.mjs --ci                  # gate on drift
 *
 * FLAGS
 *   --url <base>        harness origin (default http://localhost:8080)
 *   --sample N          modules per look (default 3)
 *   --looks N           number of alternate looks to include (default 0 = house only)
 *   --modes light,dark  modes to sweep (default light)
 *   --variant ID        restrict to specific module id(s), repeatable
 *   --update            record/refresh the baseline
 *   --ci                fail (exit 1) on drift beyond --tolerance
 *   --tolerance 0.02    allowed score drop from baseline before it is drift
 *   --out <dir>         artifact dir (default artifacts/pixel-diff)
 */
import { chromium } from "playwright";
import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const run = promisify(execFile);

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n, fb) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fb;
};
const values = (n) => argv.reduce((a, v, i) => (v === `--${n}` && argv[i + 1] ? [...a, argv[i + 1]] : a), []);

const BASE_URL = value("url", process.env.VERIFY_URL ?? "http://localhost:8080");
const SAMPLE = Number(value("sample", 3));
const LOOKS = Number(value("looks", 0));
const MODES = value("modes", "light").split(",").filter(Boolean);
const ONLY = values("variant");
const UPDATE = flag("update");
const CI = flag("ci");
const TOLERANCE = Number(value("tolerance", 0.02));
const OUT_DIR = path.resolve(value("out", "artifacts/pixel-diff"));
const BASELINE = path.resolve(
  value("baseline", "tests/snapshots/export-pixel-diff.baseline.json"),
);

/**
 * Per-pixel perceptual tolerance for pixelmatch.
 *
 * Chosen over SSIM for two reasons: (1) pixelmatch compares in YIQ space with
 * explicit antialiasing detection, which is exactly the noise floor we have here
 * — LibreOffice's rasterizer hints text and edges differently from Chromium, and
 * a naive RGB delta drowns in it; (2) it emits a per-pixel diff image for free,
 * and that image is the artifact a human actually needs to triage a failure.
 * 0.22 was picked empirically: high enough to absorb AA/hinting, low enough that
 * a dropped fill or a shifted text block still lights up.
 */
const PIXELMATCH_THRESHOLD = 0.22;
const W = 960;
const H = 540;

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

/** soffice + pdftoppm must both exist; without them the gate is meaningless. */
async function assertTooling() {
  for (const [bin, args] of [
    ["soffice", ["--version"]],
    ["pdftoppm", ["-v"]],
  ]) {
    try {
      await run(bin, args, { timeout: 120_000 });
    } catch (err) {
      throw new Error(
        `${bin} is not available (${String(err).slice(0, 120)}). Install libreoffice + poppler-utils.`,
      );
    }
  }
}

/**
 * pptx -> pdf -> png at the comparison size. LibreOffice needs an isolated
 * user profile per invocation or concurrent/repeat runs deadlock on the profile
 * lock, so each cell gets its own -env:UserInstallation.
 */
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
  // -scale-to-x/-y normalizes the LibreOffice side to exactly the same raster
  // dimensions as the build side, so no resampling happens at compare time.
  await run(
    "pdftoppm",
    ["-png", "-r", "96", "-f", "1", "-l", "1", "-scale-to-x", String(W), "-scale-to-y", String(H), pdf, path.join(workDir, "lo")],
    { timeout: 120_000 },
  );
  const png = (await readdir(workDir)).find((f) => f.startsWith("lo") && f.endsWith(".png"));
  if (!png) throw new Error("pdftoppm produced no PNG");
  return path.join(workDir, png);
}

function keyOf(c) {
  return `${c.variantId}@${c.packId ?? "base"}@${c.mode}`;
}

/**
 * TEXT MASK — HOW AND WHY (preferred route, not the heuristic fallback)
 * --------------------------------------------------------------------
 * The whole-frame `score` is dominated by text ghosting: LibreOffice uses its
 * own advance widths, tracking and hinting, so every glyph edge mismatches even
 * when the export is byte-perfect. That makes the whole-frame score very
 * sensitive to text shifts and comparatively BLIND to fill, gradient, shadow and
 * blend changes across large flat areas — exactly the surface-parity class of
 * change the gate exists to protect.
 *
 * So we compute a SECOND score with text excluded. The mask is derived from data
 * we already have: the harness reads the exported package's own object tree
 * (buildLayerReport, same code as the layering audit) and hands back the
 * normalized bounding box of every text object it emitted. Those boxes are
 * dilated by MASK_DILATE_PX to swallow AA fringes, descenders and LibreOffice's
 * slightly wider line boxes, then excluded from the comparison.
 *
 * This is exact rather than approximate — it tracks the exporter automatically
 * and can never mistake a hard-edged surface detail (a chart rule, an icon, a
 * card border) for glyphs, which a high-frequency heuristic would.
 */
const MASK_DILATE_PX = 4;
/**
 * If masking leaves less than this fraction of the frame, `surfaceScore` is
 * noise on a sliver and is reported as null with a reason instead of a
 * misleading number.
 */
const MIN_UNMASKED_FRACTION = 0.35;

function surfaceScore(build, lo, textRects) {
  const { width: w, height: h } = lo;
  const total = w * h;
  const masked = new Uint8Array(total);
  let maskedCount = 0;
  for (const r of textRects) {
    const x0 = Math.max(0, Math.floor(r.x * w) - MASK_DILATE_PX);
    const y0 = Math.max(0, Math.floor(r.y * h) - MASK_DILATE_PX);
    const x1 = Math.min(w, Math.ceil((r.x + r.w) * w) + MASK_DILATE_PX);
    const y1 = Math.min(h, Math.ceil((r.y + r.h) * h) + MASK_DILATE_PX);
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        const i = y * w + x;
        if (!masked[i]) {
          masked[i] = 1;
          maskedCount += 1;
        }
      }
    }
  }
  const maskedFraction = maskedCount / total;
  const unmaskedPixels = total - maskedCount;
  if (!textRects.length) {
    return {
      score: null,
      mismatched: null,
      unmaskedPixels,
      maskedFraction,
      reason: "no text boxes reported by the export audit — mask could not be derived",
      diffPng: null,
    };
  }
  if (unmaskedPixels / total < MIN_UNMASKED_FRACTION) {
    return {
      score: null,
      mismatched: null,
      unmaskedPixels,
      maskedFraction,
      reason: `only ${(100 - maskedFraction * 100).toFixed(1)}% of the frame survives masking (floor ${
        MIN_UNMASKED_FRACTION * 100
      }%)`,
      diffPng: null,
    };
  }

  // Neutralize masked pixels on BOTH sides so pixelmatch cannot count them, then
  // divide by the unmasked area only — otherwise the excluded region would
  // silently inflate the score toward 1.
  const a = Buffer.from(build.data);
  const b = Buffer.from(lo.data);
  for (let i = 0; i < total; i += 1) {
    if (!masked[i]) continue;
    const p = i * 4;
    a[p] = 0;
    a[p + 1] = 0;
    a[p + 2] = 0;
    a[p + 3] = 255;
    b[p] = 0;
    b[p + 1] = 0;
    b[p + 2] = 0;
    b[p + 3] = 255;
  }
  const diffPng = new PNG({ width: w, height: h });
  const mismatched = pixelmatch(a, b, diffPng.data, w, h, {
    threshold: PIXELMATCH_THRESHOLD,
    includeAA: false,
    alpha: 0.3,
  });
  return {
    score: Number((1 - mismatched / unmaskedPixels).toFixed(4)),
    mismatched,
    unmaskedPixels,
    maskedFraction,
    reason: null,
    diffPng,
  };
}

function quantiles(scores) {

  const s = [...scores].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))];
  return {
    n: s.length,
    min: s[0] ?? null,
    median: at(0.5) ?? null,
    p90: at(0.9) ?? null,
    max: s[s.length - 1] ?? null,
  };
}

async function main() {
  await assertTooling();
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await launchChromium();
  const page = await boot(browser);
  const matrix = await page.evaluate(() => ({
    v: window.__tpExportVerify.variants,
    p: window.__tpExportVerify.packs.filter(Boolean),
  }));

  let variants = matrix.v;
  if (ONLY.length) variants = variants.filter((v) => ONLY.includes(v));
  else if (SAMPLE < variants.length) {
    const step = variants.length / SAMPLE;
    variants = [...new Set(Array.from({ length: SAMPLE }, (_, i) => variants[Math.floor(i * step)]))];
  }
  const looks = [null, ...matrix.p.slice(0, LOOKS)];

  const jobs = [];
  for (const look of looks) for (const mode of MODES) for (const v of variants) jobs.push([v, look, mode]);

  console.log(
    `pixel-diff (ADVISORY regression gate — LibreOffice is not a PowerPoint renderer):\n` +
      `  ${variants.length} module(s) × ${looks.length} look(s) × ${MODES.length} mode(s) = ${jobs.length} cell(s)`,
  );

  const rows = [];
  const tmpRoot = await mkdtempSafe();
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i];
    const label = `${job[0]}@${job[1] ?? "base"}@${job[2]}`;
    let cap;
    try {
      [cap] = await page.evaluate((j) => window.__tpExportVerify.pixel([j]), job);
    } catch (err) {
      rows.push({ variantId: job[0], packId: job[1], mode: job[2], score: null, error: `capture threw: ${String(err).slice(0, 160)}` });
      continue;
    }
    if (!cap?.pptx || !cap?.build) {
      rows.push({ ...(cap ?? { variantId: job[0], packId: job[1], mode: job[2] }), score: null, error: cap?.error ?? "no capture" });
      console.log(`  ${i + 1}/${jobs.length} ${label} · SKIP (${cap?.error ?? "no capture"})`);
      continue;
    }

    const workDir = path.join(tmpRoot, label.replace(/[^a-z0-9@.-]/gi, "_"));
    await mkdir(workDir, { recursive: true });
    try {
      const pptxPath = path.join(workDir, "cell.pptx");
      await writeFile(pptxPath, Buffer.from(cap.pptx, "base64"));
      const loPng = await renderPptxToPng(pptxPath, workDir);

      const lo = PNG.sync.read(await readFile(loPng));
      const build = PNG.sync.read(Buffer.from(cap.build, "base64"));
      if (lo.width !== build.width || lo.height !== build.height) {
        throw new Error(`dimension mismatch lo=${lo.width}x${lo.height} build=${build.width}x${build.height}`);
      }
      const diff = new PNG({ width: lo.width, height: lo.height });
      const mismatched = pixelmatch(build.data, lo.data, diff.data, lo.width, lo.height, {
        threshold: PIXELMATCH_THRESHOLD,
        includeAA: false,
        alpha: 0.3,
      });
      const total = lo.width * lo.height;
      const score = Number((1 - mismatched / total).toFixed(4));

      // SECOND, INDEPENDENT SCORE: text-masked "surface" score.
      const surf = surfaceScore(build, lo, cap.textRects ?? []);

      const diffPath = path.join(OUT_DIR, `${label.replace(/[^a-z0-9@.-]/gi, "_")}.diff.png`);
      await writeFile(diffPath, PNG.sync.write(diff));
      if (surf.diffPng) {
        await writeFile(
          path.join(OUT_DIR, `${label.replace(/[^a-z0-9@.-]/gi, "_")}.surface.diff.png`),
          PNG.sync.write(surf.diffPng),
        );
      }
      rows.push({
        variantId: cap.variantId,
        packId: cap.packId,
        mode: cap.mode,
        score,
        mismatched,
        pixels: total,
        surfaceScore: surf.score,
        surfaceMismatched: surf.mismatched,
        surfacePixels: surf.unmaskedPixels,
        maskedFraction: surf.maskedFraction,
        surfaceReason: surf.reason,
        textBoxes: (cap.textRects ?? []).length,
        diff: path.relative(process.cwd(), diffPath),
      });
      console.log(
        `  ${i + 1}/${jobs.length} ${label} · score ${score} · surface ${
          surf.score === null ? `null (${surf.reason})` : surf.score
        } · masked ${(surf.maskedFraction * 100).toFixed(1)}% of frame (${(cap.textRects ?? []).length} text box(es))`,
      );

    } catch (err) {
      rows.push({ variantId: cap.variantId, packId: cap.packId, mode: cap.mode, score: null, error: String(err).slice(0, 200) });
      console.log(`  ${i + 1}/${jobs.length} ${label} · ERROR ${String(err).slice(0, 140)}`);
    }
  }
  await browser.close();
  await rm(tmpRoot, { recursive: true, force: true });

  const scored = rows.filter((r) => typeof r.score === "number");
  const dist = quantiles(scored.map((r) => r.score));
  const surfaceScored = rows.filter((r) => typeof r.surfaceScore === "number");
  const surfaceDist = quantiles(surfaceScored.map((r) => r.surfaceScore));

  // TWO SCORES, TWO JOBS:
  //   score        — whole frame. Sensitive to text layout, so it catches text
  //                  regressions but text ghosting dominates its absolute value.
  //   surfaceScore — text regions excluded. Insensitive to LibreOffice's glyph
  //                  metrics, so it is the score that actually sees fill,
  //                  gradient, shadow and blend regressions in flat areas.
  console.log("\nWorst-first ranking · score = WHOLE FRAME (text included; text-shift sensitive):");
  for (const r of [...scored].sort((a, b) => a.score - b.score)) {
    console.log(`  ${r.score.toFixed(4)}  ${keyOf(r)}  (${r.mismatched} px)`);
  }
  for (const r of rows.filter((r) => r.score === null)) {
    console.log(`  ------  ${keyOf(r)}  UNSCORED: ${r.error}`);
  }
  console.log(
    `Distribution (whole frame): n=${dist.n} min=${dist.min} median=${dist.median} p90=${dist.p90} max=${dist.max}`,
  );

  console.log(
    "\nWorst-first ranking · surfaceScore = TEXT-MASKED (fill/gradient/shadow/blend parity):",
  );
  for (const r of [...surfaceScored].sort((a, b) => a.surfaceScore - b.surfaceScore)) {
    console.log(
      `  ${r.surfaceScore.toFixed(4)}  ${keyOf(r)}  (${r.surfaceMismatched} px of ${
        r.surfacePixels
      } unmasked · masked ${(r.maskedFraction * 100).toFixed(1)}%)`,
    );
  }
  for (const r of rows.filter((r) => r.score !== null && r.surfaceScore === null)) {
    console.log(`  ------  ${keyOf(r)}  UNSCORED: ${r.surfaceReason}`);
  }
  console.log(
    `Distribution (text-masked): n=${surfaceDist.n} min=${surfaceDist.min} median=${surfaceDist.median} p90=${surfaceDist.p90} max=${surfaceDist.max}`,
  );

  // ---------------------------------------------------------------------------
  // Baseline + drift. No absolute pass/fail threshold exists by design: a module
  // that has always scored 0.94 under LibreOffice is not a regression, while one
  // that fell from 0.99 to 0.94 is. Both scores get their own baseline entry and
  // their own drift check under the same tolerance mechanism.
  // ---------------------------------------------------------------------------
  const prev = existsSync(BASELINE) ? JSON.parse(await readFile(BASELINE, "utf8")) : null;
  const prevCells = prev?.cells ?? {};

  const drift = [];
  const fresh = [];
  for (const r of scored) {
    const b = prevCells[keyOf(r)];
    if (!b) {
      fresh.push(keyOf(r));
      continue;
    }
    if (r.score < b.score - TOLERANCE) {
      drift.push({ key: keyOf(r), metric: "score", from: b.score, to: r.score, diff: r.diff });
    }
    if (
      typeof b.surfaceScore === "number" &&
      typeof r.surfaceScore === "number" &&
      r.surfaceScore < b.surfaceScore - TOLERANCE
    ) {
      drift.push({
        key: keyOf(r),
        metric: "surfaceScore",
        from: b.surfaceScore,
        to: r.surfaceScore,
        diff: r.diff,
      });
    }
  }

  if (fresh.length) {
    console.log(
      `\n${fresh.length} cell(s) have no baseline yet — CALIBRATION, recorded not gated:\n  ${fresh.join("\n  ")}`,
    );
  }

  if (drift.length) {
    console.log(`\nDRIFT from baseline (${drift.length} entry/entries):`);
    for (const d of drift) {
      console.log(
        `  ✗ ${d.key} [${d.metric}]: ${d.from} → ${d.to} (Δ ${(d.to - d.from).toFixed(4)}) · ${d.diff}`,
      );
    }
  } else {
    console.log("\nNo drift beyond tolerance against the recorded baseline (either metric).");
  }


  if (UPDATE) {
    // DOWNGRADE PROTECTION (same rule as the export-verify manifest guard):
    // a narrow run merges into the recorded baseline and may never shrink it,
    // otherwise a 3-cell smoke run would silently erase a wide calibration.
    const cells = { ...prevCells };
    for (const r of scored) {
      // ADDITIVE: existing recorded `score` values keep their meaning; the
      // text-masked metric is written alongside them. A surfaceScore that came
      // back null (masking left too little frame) never overwrites a previously
      // recorded good one.
      const before = prevCells[keyOf(r)] ?? {};
      cells[keyOf(r)] = {
        ...before,
        score: r.score,
        mismatched: r.mismatched,
        pixels: r.pixels,
        ...(typeof r.surfaceScore === "number"
          ? {
              surfaceScore: r.surfaceScore,
              surfaceMismatched: r.surfaceMismatched,
              surfacePixels: r.surfacePixels,
              maskedFraction: Number(r.maskedFraction.toFixed(4)),
            }
          : {}),
        recordedAt: new Date().toISOString(),
      };
    }
    if (Object.keys(cells).length < Object.keys(prevCells).length) {
      console.log("Baseline left untouched: refusing to reduce recorded coverage.");
    } else {
      await mkdir(path.dirname(BASELINE), { recursive: true });
      await writeFile(
        BASELINE,
        `${JSON.stringify(
          {
            // Kept verbose on purpose: whoever reads this file next must not
            // mistake it for a PowerPoint fidelity record.
            note:
              "Advisory LibreOffice-vs-build raster scores. LibreOffice is not a PowerPoint renderer; " +
              "these numbers detect drift from a recorded render, they do not measure PowerPoint fidelity.",
            metrics: {
              score:
                "Whole-frame pixelmatch agreement. Text included, so it is dominated by LibreOffice glyph metrics and is the text-shift detector.",
              surfaceScore:
                "Same comparison with every exported text box (from the export object tree) dilated and excluded. This is the fill/gradient/shadow/blend parity detector.",
              maskedFraction:
                "Fraction of the frame removed by the text mask. surfaceScore is null when the unmasked remainder falls below the floor.",
            },
            renderer: "libreoffice+pdftoppm@96dpi",
            comparison: `pixelmatch threshold=${PIXELMATCH_THRESHOLD} includeAA=false ${W}x${H}`,
            textMask: `export-object-tree text boxes dilated ${MASK_DILATE_PX}px; min unmasked fraction ${MIN_UNMASKED_FRACTION}`,
            updatedAt: new Date().toISOString(),
            distribution: dist,
            surfaceDistribution: surfaceDist,
            cells,
          },

          null,
          2,
        )}\n`,
      );
      console.log(
        `Baseline written: ${path.relative(process.cwd(), BASELINE)} (${Object.keys(cells).length} cells)`,
      );
    }
  }

  await writeFile(
    path.join(OUT_DIR, "summary.json"),
    `${JSON.stringify(
      {
        ranAt: new Date().toISOString(),
        distribution: dist,
        surfaceDistribution: surfaceDist,
        rows,
        drift,
      },
      null,
      2,
    )}\n`,
  );


  if (CI && drift.length) {
    console.error(
      "\nADVISORY GATE: pixel drift detected. This job is non-blocking — inspect the uploaded diff PNGs before treating it as a real regression.",
    );
    process.exit(1);
  }
}

async function mkdtempSafe() {
  const { mkdtemp } = await import("node:fs/promises");
  return mkdtemp(path.join(os.tmpdir(), "pixel-diff-"));
}

main().catch((err) => {
  console.error("pixel-diff sweep crashed:", err);
  process.exit(1);
});
