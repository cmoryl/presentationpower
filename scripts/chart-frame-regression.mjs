#!/usr/bin/env node
/**
 * Automated visual-diff + frame-integrity checks for chart / stat modules
 * across viewport sizes AND slide aspect ratios.
 *
 * Why: chart modules (rings, gauges, orbit labels, axis bars) are the modules
 * most likely to clip text or break their frame when the stage geometry or the
 * viewport width changes. This harness renders each chart variant on the dev
 * contact sheet at every (viewport × aspect ratio × mode) combination and:
 *
 *   1. FRAME CHECK   — every text run and chart node must stay inside the
 *                      authored stage box (no bleed past the slide edge).
 *   2. CLIP CHECK    — no element may be truncated by its own box
 *                      (scrollWidth/scrollHeight overflowing clientWidth/Height).
 *   3. OVERLAP CHECK — sibling text runs inside a chart may not collide.
 *   4. VISUAL DIFF   — a PNG per case is written and pixel-diffed against the
 *                      committed baseline snapshot; drift above --tolerance
 *                      (default 0.35% of pixels) fails the run.
 *
 * Usage:
 *   node scripts/chart-frame-regression.mjs                       # sampled run
 *   node scripts/chart-frame-regression.mjs --all --ci            # full gate
 *   node scripts/chart-frame-regression.mjs --all --update        # re-baseline
 *
 * Flags:
 *   --all                  every chart/stat variant (default: --sample 6)
 *   --sample N             first N chart variants
 *   --ids A,B              explicit variant ids
 *   --modes light,dark     brand modes (default: light,dark)
 *   --ratios 16:9,4:3,1:1  stage aspect ratios
 *   --viewports 1280,1600,960
 *   --tolerance 0.35       max % of changed pixels before a visual diff fails
 *   --update               write/refresh baseline PNGs instead of failing
 *   --out DIR              snapshot dir (default tests/snapshots/chart-frames)
 *   --ci                   non-zero exit on any finding (default true)
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--"))
      acc.push([
        cur.slice(2),
        arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true",
      ]);
    return acc;
  }, []),
);

const BASE_URL = args.url ?? "http://localhost:8080";
const OUT = path.resolve(args.out ?? "tests/snapshots/chart-frames");
const BASE_DIR = path.join(OUT, "baseline");
const CUR_DIR = path.join(OUT, "current");
const DIFF_DIR = path.join(OUT, "diff");
const UPDATE = args.update === "true";
const CI = args.ci !== "false";
const TOLERANCE = Number(args.tolerance ?? 0.35); // percent of pixels
const MODES = (args.modes ?? "light,dark").split(",").map((s) => s.trim());
const RATIOS = (args.ratios ?? "16:9,4:3,1:1").split(",").map((s) => s.trim());
const VIEWPORTS = (args.viewports ?? "1280,1600,960")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Boolean);

/** Chart/stat families whose modules draw data geometry + labels together. */
const CHART_PREFIXES = ["MV-GRAPH-", "MV-STAT-", "MV-DATA-", "MV-CHART-"];

async function chartVariantIds() {
  if (args.ids) return args.ids.split(",").map((s) => s.trim()).filter(Boolean);
  const src = await readFile(path.resolve("src/lib/taxonomy.ts"), "utf8");
  const ids = [...src.matchAll(/id:\s*"(MV-[A-Z0-9-]+)"/g)].map((m) => m[1]);
  const chart = [...new Set(ids)].filter((id) =>
    CHART_PREFIXES.some((p) => id.startsWith(p)),
  );
  if (args.all === "true") return chart;
  return chart.slice(0, Number(args.sample ?? 6));
}

/** Frame / clip / overlap integrity audit, evaluated against one sheet page. */
function auditSheetPage(page) {
  const stage = page.querySelector("[data-slide-stage]");
  if (!stage) return { error: "no stage", findings: [] };
  const S = stage.getBoundingClientRect();
  const EPS = 1.5;
  const findings = [];
  const label = (el) => {
    const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 42);
    return t || el.tagName.toLowerCase();
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.05)
      return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  // Leaf text runs: elements that own text and have no text-bearing descendant.
  const leaves = [...stage.querySelectorAll("*")].filter((el) => {
    const txt = (el.textContent || "").trim();
    if (!txt) return false;
    if ([...el.querySelectorAll("*")].some((c) => (c.textContent || "").trim())) return false;
    return visible(el);
  });

  // 1. frame — no text run may leave the authored stage box.
  for (const el of leaves) {
    const r = el.getBoundingClientRect();
    if (
      r.left < S.left - EPS ||
      r.right > S.right + EPS ||
      r.top < S.top - EPS ||
      r.bottom > S.bottom + EPS
    )
      findings.push({ kind: "frame", text: label(el) });
  }

  // 2. clip — element materially truncated by its own box. Sub-pixel rounding
  //    on scaled/tabular numerals routinely reports 1–2px of phantom scroll,
  //    so a finding needs both an absolute and a proportional overrun.
  for (const el of leaves) {
    const cs = getComputedStyle(el);
    const clips =
      cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible";
    if (!clips) continue;
    const overW = el.scrollWidth - el.clientWidth;
    const overH = el.scrollHeight - el.clientHeight;
    const bad =
      (overW > 3 && overW / Math.max(1, el.clientWidth) > 0.04) ||
      (overH > 3 && overH / Math.max(1, el.clientHeight) > 0.06);
    if (bad) findings.push({ kind: "clip", text: label(el) });
  }

  // 3. overlap — two text runs sharing pixels.
  const boxes = leaves.map((el) => ({ el, r: el.getBoundingClientRect() }));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      // Unit glyphs (%, M, K) and layered display numerals are authored to sit
      // inside the figure's ink box — only material collisions are findings.
      const ta = label(a.el);
      const tb = label(b.el);
      if (ta.length < 2 || tb.length < 2) continue;
      const ox = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
      const oy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
      if (ox <= 3 || oy <= 3) continue;
      const area = ox * oy;
      const smaller = Math.max(
        1,
        Math.min(a.r.width * a.r.height, b.r.width * b.r.height),
      );
      if (area / smaller > 0.35)
        findings.push({ kind: "overlap", text: `${ta} ↔ ${tb}` });
    }
  }
  return { findings };
}

function pctDiff(a, b) {
  if (a.width !== b.width || a.height !== b.height) return { pct: 100, diff: null };
  const diff = new PNG({ width: a.width, height: a.height });
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d =
      Math.abs(a.data[i] - b.data[i]) +
      Math.abs(a.data[i + 1] - b.data[i + 1]) +
      Math.abs(a.data[i + 2] - b.data[i + 2]);
    const hit = d > 24;
    if (hit) changed++;
    diff.data[i] = hit ? 255 : a.data[i];
    diff.data[i + 1] = hit ? 0 : a.data[i + 1];
    diff.data[i + 2] = hit ? 0 : a.data[i + 2];
    diff.data[i + 3] = 255;
  }
  return { pct: (changed / (a.width * a.height)) * 100, diff };
}

async function main() {
  const ids = await chartVariantIds();
  if (!ids.length) {
    console.error("No chart variants matched.");
    process.exit(2);
  }
  for (const d of [BASE_DIR, CUR_DIR, DIFF_DIR]) await mkdir(d, { recursive: true });

  const browser = await chromium.launch(headlessOpts());
  const failures = [];
  const drift = [];
  let cases = 0;

  for (const vw of VIEWPORTS) {
    for (const ratio of RATIOS) {
      const context = await browser.newContext({
        viewport: { width: vw, height: 1800 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      for (const id of ids) {
        const url = `${BASE_URL}/dev/module-sheet?ids=${encodeURIComponent(id)}&w=${vw}&ar=${encodeURIComponent(ratio)}`;
        // Dev-server HMR can abort an in-flight navigation; retry briefly.
        let navOk = false;
        for (let attempt = 0; attempt < 3 && !navOk; attempt++) {
          try {
            await page.goto(url, { waitUntil: "domcontentloaded" });
            navOk = true;
          } catch {
            await page.waitForTimeout(750);
          }
        }
        if (!navOk) {
          failures.push({ id, vw, ratio, mode: "-", kind: "render", text: "navigation aborted" });
          continue;
        }
        const pages = page.locator("[data-sheet-page]");
        try {
          await pages.first().waitFor({ state: "visible", timeout: 15000 });
          await page.waitForFunction(
            () => document.querySelectorAll('[data-sheet-ready="1"]').length > 0,
            null,
            { timeout: 15000 },
          );
        } catch {
          failures.push({ id, vw, ratio, mode: "-", kind: "render", text: "never became ready" });
          continue;
        }
        const n = await pages.count();
        for (let i = 0; i < n; i++) {
          const el = pages.nth(i);
          const mode = await el.getAttribute("data-sheet-mode");
          if (!MODES.includes(mode ?? "")) continue;
          cases++;
          const slug = `${id}__${mode}__${ratio.replace(":", "x")}__w${vw}`;

          const res = await el.evaluate(
            (node, src) => new Function(`return (${src})`)()(node),
            auditSheetPage.toString(),
          );
          for (const f of res.findings ?? [])
            failures.push({ id, vw, ratio, mode, ...f });
          if (res.error) failures.push({ id, vw, ratio, mode, kind: "audit", text: res.error });

          const shot = await el.screenshot();
          const curPath = path.join(CUR_DIR, `${slug}.png`);
          await writeFile(curPath, shot);
          const basePath = path.join(BASE_DIR, `${slug}.png`);
          if (UPDATE || !existsSync(basePath)) {
            await writeFile(basePath, shot);
            continue;
          }
          const { pct, diff } = pctDiff(
            PNG.sync.read(await readFile(basePath)),
            PNG.sync.read(shot),
          );
          if (pct > TOLERANCE) {
            drift.push({ slug, pct: pct.toFixed(2) });
            if (diff) await writeFile(path.join(DIFF_DIR, `${slug}.png`), PNG.sync.write(diff));
          }
        }
      }
      await context.close();
    }
  }
  await browser.close();

  console.log(
    `\nchart-frame-regression · ${ids.length} variants × ${VIEWPORTS.length} viewports × ${RATIOS.length} ratios × ${MODES.length} modes = ${cases} cases`,
  );
  const byKind = failures.reduce((m, f) => ((m[f.kind] = (m[f.kind] ?? 0) + 1), m), {});
  console.log("frame integrity:", failures.length ? byKind : "clean");
  for (const f of failures.slice(0, 40))
    console.log(`  ✗ [${f.kind}] ${f.id} ${f.mode} ${f.ratio} @${f.vw} — ${f.text}`);
  if (failures.length > 40) console.log(`  … ${failures.length - 40} more`);

  console.log(
    UPDATE
      ? `visual diff: baseline written to ${path.relative(process.cwd(), BASE_DIR)}`
      : `visual diff: ${drift.length ? `${drift.length} over ${TOLERANCE}%` : "within tolerance"}`,
  );
  for (const d of drift.slice(0, 40)) console.log(`  ✗ ${d.slug} — ${d.pct}% changed`);

  const baselineCount = (await readdir(BASE_DIR)).filter((f) => f.endsWith(".png")).length;
  console.log(`baseline snapshots: ${baselineCount}`);

  if (CI && !UPDATE && (failures.length || drift.length)) process.exit(1);
}

function headlessOpts() {
  const opts = {
    headless: true,
    args: ["--force-color-profile=srgb", "--font-render-hinting=none"],
  };
  // Sandboxes pin a browser build that may not match the npm package version.
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)
    opts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  return opts;
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
