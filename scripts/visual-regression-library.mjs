#!/usr/bin/env node
/**
 * Automated visual regression + stat-overlap check for the module library.
 *
 * Loads http://localhost:8080/library, iterates every [data-variant-card],
 * inspects each preview stage for [data-stat-figure] elements that overlap
 * a sibling grid track, and captures per-card PNG screenshots plus a JSON
 * report so future stat/layout regressions are caught in CI.
 *
 *   node scripts/visual-regression-library.mjs [--mode light|dark|ab] [--out DIR] [--baseline PATH]
 *
 * Exit code is non-zero when any card reports an overlap the baseline does
 * not already whitelist, so this can be dropped into a CI job.
 */
import { chromium } from "playwright";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true"]);
    return acc;
  }, []),
);

const MODE = args.mode ?? "ab";
const OUT = path.resolve(args.out ?? "tests/snapshots/library");
const BASELINE = path.resolve(args.baseline ?? "tests/snapshots/library.baseline.json");
const URL = args.url ?? "http://localhost:8080/library";
const TOLERANCE_PX = Number(args.tolerance ?? 2);

await mkdir(OUT, { recursive: true });

const baseline = existsSync(BASELINE)
  ? JSON.parse(await readFile(BASELINE, "utf8"))
  : { allowedOverlaps: [] };

const launchOpts = { headless: true };
if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
  launchOpts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
}
const browser = await chromium.launch(launchOpts);
const context = await browser.newContext({ viewport: { width: 1440, height: 1800 }, deviceScaleFactor: 1 });
const page = await context.newPage();

console.log(`→ Loading ${URL}`);
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60_000 });

// Force mode toolbar state if requested.
if (MODE === "ab") {
  const ab = page.getByRole("button", { name: /A\/B/i }).first();
  if (await ab.count()) await ab.click().catch(() => {});
} else {
  const btn = page.getByRole("button", { name: new RegExp(`^${MODE}$`, "i") }).first();
  if (await btn.count()) await btn.click().catch(() => {});
}

// Give WCAG/type auto-fix passes and lazy renders time to settle.
await page.waitForSelector("[data-variant-card]", { timeout: 30_000 });
await page.waitForTimeout(1500);

const cardIds = await page.$$eval("[data-variant-card]", (els) =>
  els.map((el, i) => el.getAttribute("data-variant-id") ?? `card-${i}`),
);
console.log(`→ ${cardIds.length} cards found · mode=${MODE}`);

const overlaps = [];
const captured = [];

for (let i = 0; i < cardIds.length; i++) {
  const variantId = cardIds[i];
  const selector = `[data-variant-card][data-variant-id="${variantId.replace(/"/g, '\\"')}"]`;
  const card = await page.$(selector);
  if (!card) continue;

  // Scroll into view so layout stabilizes and container-query sizes settle.
  await card.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(120);

  // Per-card overlap probe: for each stat figure, walk up until we find a
  // grid or flex parent inside the stage, then check whether the stat's
  // bounding rect intersects any sibling's bounding rect.
  const findings = await card.evaluate((root, tol) => {
    const stage = root; // whole card; stat figures live inside preview stages
    const stats = Array.from(stage.querySelectorAll("[data-stat-figure]"));
    const out = [];
    for (const s of stats) {
      const sr = s.getBoundingClientRect();
      if (sr.width === 0 || sr.height === 0) continue;
      // Walk up to find a grid/flex parent within the stage.
      let parent = s.parentElement;
      let hops = 0;
      while (parent && hops < 6) {
        const cs = getComputedStyle(parent);
        if (cs.display === "grid" || cs.display === "flex") break;
        parent = parent.parentElement;
        hops++;
      }
      if (!parent) continue;
      const siblings = Array.from(parent.children).filter((c) => c !== s && !s.contains(c) && !c.contains(s));
      for (const sib of siblings) {
        const sbr = sib.getBoundingClientRect();
        if (sbr.width === 0 || sbr.height === 0) continue;
        const overlapX = Math.min(sr.right, sbr.right) - Math.max(sr.left, sbr.left);
        const overlapY = Math.min(sr.bottom, sbr.bottom) - Math.max(sr.top, sbr.top);
        if (overlapX > tol && overlapY > tol) {
          out.push({
            statSize: s.getAttribute("data-stat-figure"),
            statText: (s.textContent || "").trim().slice(0, 80),
            siblingText: (sib.textContent || "").trim().slice(0, 80),
            overlapPx: { x: Math.round(overlapX), y: Math.round(overlapY) },
          });
        }
      }
    }
    return out;
  }, TOLERANCE_PX);

  const shotPath = path.join(OUT, `${variantId}.png`);
  await card.screenshot({ path: shotPath }).catch(() => {});
  captured.push({ variantId, shot: path.relative(process.cwd(), shotPath), overlapCount: findings.length });

  if (findings.length > 0) overlaps.push({ variantId, findings });
}

await browser.close();

const report = {
  url: URL,
  mode: MODE,
  tolerancePx: TOLERANCE_PX,
  ranAt: new Date().toISOString(),
  totalCards: cardIds.length,
  overlappingCards: overlaps.length,
  overlaps,
  captured,
};
const reportPath = path.join(OUT, "report.json");
await writeFile(reportPath, JSON.stringify(report, null, 2));

// Reconcile against baseline whitelist.
const allowed = new Set(baseline.allowedOverlaps ?? []);
const unexpected = overlaps.filter((o) => !allowed.has(o.variantId));

console.log(`\n▸ Snapshots  → ${path.relative(process.cwd(), OUT)}`);
console.log(`▸ Report     → ${path.relative(process.cwd(), reportPath)}`);
console.log(`▸ Overlaps   → ${overlaps.length} (baseline allows ${allowed.size})`);

if (unexpected.length) {
  console.error(`\n✖ ${unexpected.length} unexpected stat/content overlap(s):`);
  for (const o of unexpected) {
    console.error(`   · ${o.variantId}`);
    for (const f of o.findings.slice(0, 2)) {
      console.error(`       stat "${f.statText}" ↔ "${f.siblingText}" (${f.overlapPx.x}×${f.overlapPx.y}px)`);
    }
  }
  process.exit(1);
}

console.log("\n✓ No unexpected overlaps.");
