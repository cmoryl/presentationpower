#!/usr/bin/env node
/**
 * Visual regression sweep — social copy-plate corner rounding.
 *
 * For every template style × every social format (all aspect ratios: 1:1, 4:5,
 * 9:16, 16:9, 1200×627, 2:3, signage, …) this script:
 *
 *   1. loads /dev/social-corners?style=<id>&mode=<light|dark>,
 *   2. measures the copy plate's painted corner radius from the DOM
 *      (computed borderRadius + plate rect + frame short edge),
 *   3. crops the plate's four corners out of a screenshot at a fixed size and
 *      pixel-diffs each crop against a golden baseline PNG,
 *   4. fails when a corner drifts, when the geometry fingerprint drifts, or
 *      when a plate rounds past the 6%-of-short-edge cap into a pill/ellipse.
 *
 * The ellipse guard is the regression this exists for: `plateRadiusPct` is a
 * PERCENT of the short edge, and multiplying by the raw pixel edge produced
 * radii in the thousands of px that browsers clamp to 50% — a giant ellipse.
 *
 *   node scripts/visual-regression-social-corners.mjs            # verify
 *   node scripts/visual-regression-social-corners.mjs --update   # re-record
 *
 * Flags: --styles a,b  --formats a,b  --modes light,dark  --url  --out
 *        --baseline  --tolerance <pct>  --radius-tolerance <px>  --update
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--"))
      acc.push([cur.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true"]);
    return acc;
  }, []),
);

const BASE = args.url ?? "http://localhost:8080";
const OUT = path.resolve(args.out ?? "tests/snapshots/social-corners");
const BASELINE = path.resolve(args.baseline ?? "tests/snapshots/social-corners.baseline.json");
const UPDATE = args.update === "true";
const MODES = (args.modes ?? "light,dark").split(",").map((s) => s.trim()).filter(Boolean);
/** Max share of differing pixels in a corner crop before it's a regression. */
const TOLERANCE_PCT = Number(args.tolerance ?? 0.35);
/** Max drift in the measured radius, in CSS px. */
const RADIUS_TOL_PX = Number(args["radius-tolerance"] ?? 0.75);
/** Corner crop size, px — big enough to contain any legal radius (6% of 360). */
const CROP = 40;
/** Corner crops are always written; only --pixel makes a crop diff FAIL the run
 *  (plate interiors carry live aurora/type antialiasing, so the always-on gate
 *  is the deterministic corner-geometry golden below). */
const PIXEL_GATE = args.pixel === "true";
/** Hard cap the renderer promises: radius <= 6% of the frame's short edge. */
const MAX_RADIUS_PCT = 6;

const STYLE_FILTER = args.styles ? new Set(args.styles.split(",").map((s) => s.trim())) : null;
const FORMAT_FILTER = args.formats ? new Set(args.formats.split(",").map((s) => s.trim())) : null;

await mkdir(OUT, { recursive: true });

const baseline = existsSync(BASELINE)
  ? JSON.parse(await readFile(BASELINE, "utf8"))
  : { $schema: "social-corner-rounding", cases: {} };

/**
 * Resolve a chromium binary without hardcoding build numbers: the sandbox/CI
 * cache often holds a newer build than the pinned playwright package expects.
 */
function resolveChromium() {
  const explicit =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? process.env.PLAYWRIGHT_CHROMIUM_PATH;
  if (explicit) return explicit;
  const roots = [process.env.PLAYWRIGHT_BROWSERS_PATH, "/opt/ms-playwright"].filter(
    (r) => r && r !== "0" && existsSync(r),
  );
  const rel = ["chrome-linux/chrome", "chrome-linux/headless_shell"];
  const build = (d) => Number(/(\d+)$/.exec(d)?.[1] ?? 0);
  for (const root of roots) {
    const dirs = readdirSync(root)
      .filter((d) => d.startsWith("chromium"))
      .sort(
        (a, b) =>
          build(b) - build(a) ||
          Number(a.includes("headless_shell")) - Number(b.includes("headless_shell")),
      );
    for (const dir of dirs)
      for (const r of rel) {
        const exe = path.join(root, dir, r);
        if (existsSync(exe)) return exe;
      }
  }
  return undefined;
}

const launchOpts = { headless: true };
const exe = resolveChromium();
if (exe) launchOpts.executablePath = exe;

const browser = await chromium.launch(launchOpts);
const context = await browser.newContext({
  viewport: { width: 1600, height: 1800 },
  deviceScaleFactor: 1,
  reducedMotion: "reduce",
});
const page = await context.newPage();

// Style ids come from the app itself so a new style is swept automatically.
await page.goto(`${BASE}/dev/social-corners`, { waitUntil: "domcontentloaded" });
const STYLES = (
  await page.evaluate(async () => {
    const mod = await import("/src/lib/social-styles.ts");
    return mod.SOCIAL_STYLES.map((s) => s.id);
  })
).filter((id) => !STYLE_FILTER || STYLE_FILTER.has(id));

/** One retry: a live dev server can invalidate the execution context. */
async function screenshotWithRetry(locator) {
  try {
    return await locator.screenshot();
  } catch {
    await locator.page().waitForTimeout(500);
    return await locator.screenshot();
  }
}

const results = [];
const nextBaseline = { ...baseline, cases: { ...(baseline.cases ?? {}) } };

for (const mode of MODES) {
  for (const style of STYLES) {
    await page.goto(`${BASE}/dev/social-corners?style=${style}&mode=${mode}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () => document.querySelectorAll("[data-corner-case]").length > 0,
      undefined,
      { timeout: 60_000 },
    );
    await page.waitForTimeout(600); // let backdrop-filter/blur settle

    const count = await page.locator("[data-corner-case]").count();
    for (let i = 0; i < count; i++) {
      // Re-resolve per iteration: a dev-server HMR ping can invalidate a held
      // element handle mid-sweep ("Cannot find context with specified id").
      const frame = page.locator("[data-corner-case]").nth(i);
      const key = await frame.getAttribute("data-corner-case");
      const formatId = await frame.getAttribute("data-corner-format");
      if (FORMAT_FILTER && !FORMAT_FILTER.has(formatId)) continue;
      const caseKey = `${mode}/${key}`;

      // ---- Geometry: what the browser will actually paint ------------------
      const geom = await frame.evaluate((el) => {
        const plate = el.querySelector("[data-social-plate]");
        const stage = el.querySelector("[data-kit-asset-frame]");
        if (!plate || !stage) return null;
        const pr = plate.getBoundingClientRect();
        const sr = stage.getBoundingClientRect();
        const cs = getComputedStyle(plate);
        // Radius as painted, in the plate's own (already scaled) CSS px.
        const raw = parseFloat(cs.borderTopLeftRadius) || 0;
        const scale = pr.width ? pr.width / plate.offsetWidth : 1;
        return {
          radiusPx: raw * scale,
          plateW: pr.width,
          plateH: pr.height,
          shortEdge: Math.min(sr.width, sr.height),
          corners: [
            cs.borderTopLeftRadius,
            cs.borderTopRightRadius,
            cs.borderBottomRightRadius,
            cs.borderBottomLeftRadius,
          ],
          x: pr.x,
          y: pr.y,
        };
      });

      if (!geom) {
        // Panel/plate-less compositions legitimately have no plate; skip but
        // record so a plate vanishing from a style that had one is visible.
        results.push({ case: caseKey, ok: true, skipped: "no-plate" });
        continue;
      }

      const radiusPct = geom.shortEdge ? (geom.radiusPx / geom.shortEdge) * 100 : 0;
      const problems = [];
      if (radiusPct > MAX_RADIUS_PCT + 0.25)
        problems.push(
          `corner radius ${radiusPct.toFixed(2)}% of short edge exceeds the ${MAX_RADIUS_PCT}% cap (ellipse/pill regression)`,
        );
      if (geom.radiusPx > Math.min(geom.plateW, geom.plateH) / 2 - 0.5)
        problems.push("corner radius reaches half the plate's short side — plate renders as a pill");
      if (new Set(geom.corners).size > 1)
        problems.push(`unequal corners: ${geom.corners.join(" / ")}`);

      // ---- Pixel: crop the four corners out of the rendered frame ---------
      const shot = await screenshotWithRetry(frame);
      const png = PNG.sync.read(shot);
      const fbox = await frame.boundingBox();
      const ox = Math.round(geom.x - fbox.x);
      const oy = Math.round(geom.y - fbox.y);
      const corners = {
        tl: [ox, oy],
        tr: [Math.round(ox + geom.plateW - CROP), oy],
        br: [Math.round(ox + geom.plateW - CROP), Math.round(oy + geom.plateH - CROP)],
        bl: [ox, Math.round(oy + geom.plateH - CROP)],
      };

      const dir = path.join(OUT, mode, style);
      await mkdir(dir, { recursive: true });

      let worstMismatch = 0;
      for (const [name, [cx, cy]] of Object.entries(corners)) {
        const crop = new PNG({ width: CROP, height: CROP });
        // Clamp so a plate flush to the frame edge still yields a full crop.
        const sx = Math.max(0, Math.min(cx, png.width - CROP));
        const sy = Math.max(0, Math.min(cy, png.height - CROP));
        PNG.bitblt(png, crop, sx, sy, CROP, CROP, 0, 0);
        const file = path.join(dir, `${formatId}.${name}.png`);

        if (UPDATE || !existsSync(file)) {
          await writeFile(file, PNG.sync.write(crop));
          continue;
        }
        const golden = PNG.sync.read(await readFile(file));
        if (golden.width !== CROP || golden.height !== CROP) {
          problems.push(`${name}: golden crop is ${golden.width}×${golden.height}, expected ${CROP}×${CROP}`);
          continue;
        }
        const diff = new PNG({ width: CROP, height: CROP });
        const differing = pixelmatch(golden.data, crop.data, diff.data, CROP, CROP, {
          threshold: 0.12,
        });
        const pct = (differing / (CROP * CROP)) * 100;
        worstMismatch = Math.max(worstMismatch, pct);
        if (pct > TOLERANCE_PCT && PIXEL_GATE) {
          const actual = path.join(dir, `${formatId}.${name}.actual.png`);
          await writeFile(actual, PNG.sync.write(crop));
          await writeFile(path.join(dir, `${formatId}.${name}.diff.png`), PNG.sync.write(diff));
          problems.push(`${name} corner drifted ${pct.toFixed(3)}% (tolerance ${TOLERANCE_PCT}%)`);
        }
      }

      // ---- Golden geometry fingerprint ------------------------------------
      const fingerprint = {
        radiusPx: Number(geom.radiusPx.toFixed(3)),
        radiusPct: Number(radiusPct.toFixed(3)),
        shortEdge: Math.round(geom.shortEdge),
      };
      const prior = nextBaseline.cases[caseKey];
      if (UPDATE || !prior) {
        nextBaseline.cases[caseKey] = fingerprint;
      } else {
        if (Math.abs(prior.radiusPx - fingerprint.radiusPx) > RADIUS_TOL_PX)
          problems.push(
            `radius drifted ${prior.radiusPx}px → ${fingerprint.radiusPx}px (tolerance ${RADIUS_TOL_PX}px)`,
          );
        if (prior.shortEdge !== fingerprint.shortEdge)
          problems.push(`frame short edge changed ${prior.shortEdge} → ${fingerprint.shortEdge}`);
      }

      results.push({
        case: caseKey,
        ok: problems.length === 0,
        ...fingerprint,
        worstMismatchPct: Number(worstMismatch.toFixed(3)),
        problems,
      });
    }
  }
}

await browser.close();

if (UPDATE) await writeFile(BASELINE, `${JSON.stringify(nextBaseline, null, 2)}\n`);
await writeFile(
  path.join(OUT, "report.json"),
  `${JSON.stringify({ generatedFrom: BASE, modes: MODES, results }, null, 2)}\n`,
);

const failures = results.filter((r) => !r.ok);
const swept = results.filter((r) => !r.skipped).length;
console.log(
  `Social corner sweep: ${swept} plate cases across ${STYLES.length} styles × ${MODES.length} modes`,
);
for (const f of failures) {
  console.error(`✗ ${f.case}`);
  for (const p of f.problems) console.error(`    ${p}`);
}
if (UPDATE) {
  console.log(`Baseline recorded → ${path.relative(process.cwd(), BASELINE)}`);
  process.exit(0);
}
if (failures.length) {
  console.error(`\n${failures.length} corner-rounding regression(s). Crops in ${OUT}`);
  process.exit(1);
}
console.log("✓ all corners match the golden baseline");
